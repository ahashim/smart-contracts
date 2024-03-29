// SPDX-License-Identifier: Apache-2.0
/*

   Copyright 2023 Critter

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/
pragma solidity 0.8.17;

// 3rd party contracts
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';

// contracts
import './Squeakable.sol';

// interface
import './interfaces/ICritter.sol';

// libraries
import './libraries/Accountable.sol';
import './libraries/Bankable.sol';
import './libraries/Viral.sol';

// types
using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

/**
 * @title Critter: a microblogging platform where each post is an ERC721 token.
 * @author Ahmed Hashim <ahashim@users.noreply.github.com>
 * @dev Core concepts:
 *      - Every address is a user.
 *      - Users can follow one another.
 *      - Every post, called a "Squeak", is an NFT.
 *      - Squeaks can be bought & sold via a bidding price discovery mechanism.
 *      - Interactions on squeaks, such as liking, disliking, or resqueaking
 *        cost a fee.
 *      - Fees are paid out to the owner of the squeak (not necessarily the
 *        original author).
 *      - Once an author sells their squeak, the ownership is transferred to a
 *        new user.
 *      - Only the owner of a squeak is able to delete it (burn the token).
 *      - Deleting a squeak costs a fee of `time elapsed x fixed delete fee`.
 *      - Every squeak has a "virality" score that is calculated on-chain.
 *      - When a squeak goes "viral", future profits from that point on are
 *        split among the owner and its positive interactors (i.e., those who
 *        propelled it to virality via likes & resqueaks).
 */
contract Critter is
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    ICritter
{
    /**
     * @dev MODERATOR_ROLE has priviledges to update a users account status.
     */
    bytes32 private constant MODERATOR_ROLE = keccak256('MODERATOR_ROLE');

    /**
     * @dev OPERATOR_ROLE has priviledges to update the contract configuration
     * values.
     */
    bytes32 private constant OPERATOR_ROLE = keccak256('OPERATOR_ROLE');

    /**
     * @dev TREASURER_ROLE has priviledges to withdraw funds and update fees.
     */
    bytes32 private constant TREASURER_ROLE = keccak256('TREASURER_ROLE');

    /**
     * @dev UPGRADER_ROLE has priviledges to upgrade the contract, and connect
     *      to other contracts.
     */
    bytes32 private constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');

    /**
     * @dev Contract funds.
     * @notice Can only be withdrawn by TREASURER_ROLE.
     */
    uint256 public treasury;

    /**
     * @dev Mapping of username <=> account address.
     */
    mapping(string => address) public addresses;

    /**
     * @dev Mapping of a contract Configuration key <=> its amount value.
     */
    mapping(Configuration => uint256) public config;

    /**
     * @dev Mapping of Interaction <=> fee amounts.
     */
    mapping(Interaction => uint256) public fees;

    /**
     * @dev Mapping of account address <=> User.
     */
    mapping(address => User) public users;

    /**
     * @dev Mapping of address <=> AddressSet of blocked addresses for an user.
     */
    mapping(address => EnumerableSetUpgradeable.AddressSet) private blocked;

    /**
     * @dev Mapping of address <=> AddressSet of followers for an user.
     */
    mapping(address => EnumerableSetUpgradeable.AddressSet) private followers;

    /**
     * @dev Mapping of tokenId <=> Pool.
     */
    mapping(uint256 => Pool) private pools;

    /**
     * @dev Mapping of tokenId <=> (address <=> shares).
     */
    mapping(uint256 => EnumerableMapUpgradeable.AddressToUintMap)
        private poolPasses;

    /**
     * @dev Mapping of tokenId <=> Sentiment.
     */
    mapping(uint256 => Sentiment) private sentiments;

    /**
     * @dev Instance of the Squeakable contract
     */
    Squeakable private squeakable;

    /**
     * @dev Set of squeak ID's that have gone viral.
     */
    EnumerableSetUpgradeable.UintSet private viralSqueaks;

    /* solhint-disable func-name-mixedcase, no-empty-blocks */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /* solhint-enable func-name-mixedcase, no-empty-blocks */

    /**
     * @dev See {ICritter-initialize}.
     */
    function initialize(
        uint256 dividendThreshold,
        uint256 maxLevel,
        uint256 viralityThreshold
    ) public initializer {
        // base platform fee in wei
        uint256 platformFee = 80000000000000;

        // init 3rd party contracts
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        // set default config values
        config[Configuration.DeleteRate] = platformFee;
        config[Configuration.PlatformTakeRate] = 10; // percent of platform fee
        config[Configuration.MaxLevel] = maxLevel;
        config[Configuration.DividendThreshold] = dividendThreshold;
        config[Configuration.ViralityBonus] = 3; // levels
        config[Configuration.ViralityThreshold] = viralityThreshold;

        // set default interaction fees
        fees[Interaction.Dislike] = platformFee;
        fees[Interaction.Like] = platformFee;
        fees[Interaction.Resqueak] = platformFee;
        fees[Interaction.UndoDislike] = platformFee;
        fees[Interaction.UndoLike] = platformFee;
        fees[Interaction.UndoResqueak] = platformFee;

        // grant all roles to contract owner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /**
     * @dev See {ICritter-createAccount}.
     */
    function createAccount(string calldata username) external {
        // validation
        if (users[msg.sender].status != Status.Unknown)
            revert AlreadyRegistered();
        bytes memory rawUsername = bytes(username);
        Accountable.validateUsername(addresses[username], rawUsername);

        // create an active User
        users[msg.sender] = User(msg.sender, Status.Active, 1, username);
        addresses[username] = msg.sender;

        emit AccountCreated(msg.sender, bytes32(rawUsername));
    }

    /**
     * @dev See {ICritter-createSqueak}.
     */
    function createSqueak(string calldata content) external nonReentrant {
        // user validation
        Accountable.hasActiveAccount(users[msg.sender].status);

        // mint squeak content as an NFT
        bytes memory rawContent = bytes(content);
        uint256 tokenId = squeakable.mint(msg.sender, rawContent);

        emit SqueakCreated(msg.sender, bytes32(rawContent), tokenId);
    }

    /**
     * @dev See {ICritter-deleteSqueak}.
     */
    function deleteSqueak(uint256 tokenId) external payable nonReentrant {
        // validate account
        Accountable.hasActiveAccount(users[msg.sender].status);

        // validate delete fee & calculate refund
        (uint256 deleteFee, uint256 refund) = Bankable
            .getDeleteFeeAndRefundAmount(
                squeakable.getBlockCreated(tokenId),
                0,
                config[Configuration.DeleteRate]
            );

        // receive payment
        _deposit(deleteFee);

        // refund any excess
        if (refund > 0) _transferFunds(msg.sender, refund);

        // burn the NFT
        squeakable.burn(tokenId, msg.sender);

        // delete the sentiment
        delete sentiments[tokenId];

        if (viralSqueaks.contains(tokenId)) {
            // pay out any remaining pool funds
            Pool storage pool = pools[tokenId];
            if (pool.amount > 0) {
                _makePoolDividends(tokenId, pool, (pool.amount / pool.shares));

                // deposit remaining dust into treasury
                _deposit(pool.amount);
            }

            // delete the pool & passes
            delete pools[tokenId];
            delete poolPasses[tokenId];

            // remove the squeak from the viral squeaks list
            viralSqueaks.remove(tokenId);
        }

        emit SqueakDeleted(tokenId, msg.sender);
    }

    /**
     * @dev See {ICritter-getDeleteFee}.
     */
    function getDeleteFee(uint256 tokenId) external view returns (uint256) {
        if (!squeakable.exists(tokenId)) revert SqueakDoesNotExist();

        return
            Bankable.getDeleteFee(
                squeakable.getBlockCreated(tokenId),
                6, // default {blocksValid} amount
                config[Configuration.DeleteRate]
            );
    }

    /**
     * @dev See {ICritter-getPoolInfo}.
     */
    function getPoolInfo(
        uint256 tokenId
    ) external view returns (PoolInfo memory) {
        Pool storage pool = pools[tokenId];

        return
            PoolInfo(
                pool.amount,
                pool.shares,
                poolPasses[tokenId].length(),
                pool.blockNumber,
                pool.score
            );
    }

    /**
     * @dev See {ICritter-getPoolPasses}.
     */
    function getPoolPasses(
        uint256 tokenId
    ) external view returns (PoolPassInfo[] memory) {
        EnumerableMapUpgradeable.AddressToUintMap storage passes = poolPasses[
            tokenId
        ];
        uint256 passCount = passes.length();

        // initialize array based on the number of pool passes
        PoolPassInfo[] memory poolPassInfo = new PoolPassInfo[](passCount);

        // populate the array with member addresses from the pool
        for (uint256 i = 0; i < passCount; i++) {
            (address account, uint256 shares) = passes.at(i);
            poolPassInfo[i] = PoolPassInfo(account, shares);
        }

        return poolPassInfo;
    }

    /**
     * @dev See {ICritter-getSentimentCounts}.
     */
    function getSentimentCounts(
        uint256 tokenId
    ) external view returns (SentimentCounts memory) {
        Sentiment storage sentiment = sentiments[tokenId];

        return
            SentimentCounts(
                sentiment.dislikes.length(),
                sentiment.likes.length(),
                sentiment.resqueaks.length()
            );
    }

    /**
     * @dev See {ICritter-getViralityScore}.
     */
    function getViralityScore(uint256 tokenId) public view returns (uint64) {
        // a squeak requires 1 like & 1 resqueak to be considered for virality
        Sentiment storage sentiment = sentiments[tokenId];
        uint256 likes = sentiment.likes.length();
        uint256 resqueaks = sentiment.resqueaks.length();
        uint64 score = 0;

        if (likes > 0 && resqueaks > 0) {
            score = Viral.score(
                block.number - squeakable.getBlockCreated(tokenId),
                sentiment.dislikes.length(),
                likes,
                resqueaks
            );
        }

        return score;
    }

    /**
     * @dev See {ICritter-interact}.
     */
    function interact(
        uint256 tokenId,
        Interaction interaction
    ) external payable nonReentrant {
        // user validation
        Accountable.hasActiveAccount(users[msg.sender].status);
        if (!squeakable.exists(tokenId)) revert SqueakDoesNotExist();
        uint256 interactionFee = fees[interaction];
        if (msg.value < interactionFee) revert InsufficientFunds();
        address author = squeakable.getAuthor(tokenId);
        if (
            msg.sender != author &&
            (blocked[author].contains(msg.sender) ||
                blocked[msg.sender].contains(author))
        ) revert Blocked();

        // determine interaction & update sentiment
        Sentiment storage sentiment = sentiments[tokenId];
        if (interaction == Interaction.Dislike) {
            // ensure the user has not already disliked the squeak
            if (sentiment.dislikes.contains(msg.sender))
                revert AlreadyInteracted();

            if (sentiment.likes.contains(msg.sender))
                // remove the previous like
                sentiment.likes.remove(msg.sender);

            sentiment.dislikes.add(msg.sender);
        } else if (interaction == Interaction.Like) {
            // ensure the user has not already liked the squeak
            if (sentiment.likes.contains(msg.sender))
                revert AlreadyInteracted();

            if (sentiment.dislikes.contains(msg.sender))
                // remove the previous dislike
                sentiment.dislikes.remove(msg.sender);

            sentiment.likes.add(msg.sender);
        } else if (interaction == Interaction.Resqueak) {
            // ensure the user has not already resqueaked the squeak
            if (sentiment.resqueaks.contains(msg.sender))
                revert AlreadyInteracted();

            sentiment.resqueaks.add(msg.sender);
        } else if (interaction == Interaction.UndoDislike) {
            // ensure the user has disliked the squeak
            if (!sentiment.dislikes.contains(msg.sender))
                revert NotInteractedYet();

            // remove their dislike
            sentiment.dislikes.remove(msg.sender);
        } else if (interaction == Interaction.UndoLike) {
            // ensure the user has liked the squeak
            if (!sentiment.likes.contains(msg.sender))
                revert NotInteractedYet();

            // remove their like
            sentiment.likes.remove(msg.sender);
        } else if (interaction == Interaction.UndoResqueak) {
            // ensure the user has resqueaked the squeak
            if (!sentiment.resqueaks.contains(msg.sender))
                revert NotInteractedYet();

            // remove their resqueak
            sentiment.resqueaks.remove(msg.sender);
        }

        emit SqueakInteraction(tokenId, msg.sender, interaction);

        if (!viralSqueaks.contains(tokenId)) {
            // check virality
            uint64 score = getViralityScore(tokenId);
            if (score >= config[Configuration.ViralityThreshold]) {
                // add squeak to the list of viral squeaks
                viralSqueaks.add(tokenId);

                // give the user who propelled the squeak into virality a bonus level.
                _increaseLevel(
                    users[msg.sender],
                    config[Configuration.ViralityBonus]
                );

                // iterate over both sets & add all unique addresses to the pool
                uint256 likesCount = sentiment.likes.length();
                uint256 resqueaksCount = sentiment.resqueaks.length();
                uint256 upperBound = likesCount > resqueaksCount
                    ? likesCount
                    : resqueaksCount;

                // initialize pool details
                uint256 shareCount = 0;

                // TODO: move this unbounded loop off-chain
                for (uint256 i = 0; i < upperBound; i++) {
                    if (i < likesCount)
                        // add all likers
                        shareCount = _createPoolPass(
                            users[sentiment.likes.at(i)],
                            shareCount,
                            tokenId
                        );

                    if (
                        i < resqueaksCount &&
                        !poolPasses[tokenId].contains(
                            sentiment.resqueaks.at(i)
                        )
                    )
                        // add all resqueakers who aren't likers
                        shareCount = _createPoolPass(
                            users[sentiment.resqueaks.at(i)],
                            shareCount,
                            tokenId
                        );
                }

                // save pool to storage
                pools[tokenId] = Pool(
                    0, // amount
                    shareCount,
                    block.number,
                    score
                );
            }
        }

        // make payment
        address ownerAddress = squeakable.ownerOf(tokenId);
        if (
            // the squeak owner is banned
            users[ownerAddress].status == Status.Banned ||
            // negative interaction
            interaction == Interaction.Dislike ||
            interaction == Interaction.UndoLike ||
            interaction == Interaction.UndoResqueak
        ) {
            // treasury takes all
            _deposit(interactionFee);
        } else if (
            // positive interaction
            interaction == Interaction.Like ||
            interaction == Interaction.Resqueak ||
            interaction == Interaction.UndoDislike
        ) {
            // calculate amounts to deposit & transfer
            (uint256 interactionTake, uint256 payment) = Bankable
                .getInteractionTakeAndPaymentAmount(
                    interactionFee,
                    config[Configuration.PlatformTakeRate]
                );

            // deposit fee into treasury
            _deposit(interactionTake);

            if (viralSqueaks.contains(tokenId)) {
                // split payment between pool members & the squeak owner
                Pool storage pool = pools[tokenId];
                uint256 poolFunds = payment / 2;
                unchecked {
                    payment -= poolFunds;
                    pool.amount += poolFunds;
                }

                emit FundsAddedToPool(tokenId, poolFunds);

                // determine if dividends need to be paid out
                uint256 sharePrice = pool.amount / pool.shares;
                if (sharePrice >= config[Configuration.DividendThreshold])
                    _makePoolDividends(tokenId, pool, sharePrice);
            }

            // transfer remaining funds to the squeak owner
            _transferFunds(ownerAddress, payment);
        }

        // refund any funds excess of the interaction fee
        if (msg.value > interactionFee)
            _transferFunds(msg.sender, msg.value - interactionFee);
    }

    /**
     * @dev See {ICritter-isBlocked}.
     */
    function isBlocked(
        address userOne,
        address userTwo
    ) external view returns (bool) {
        return blocked[userOne].contains(userTwo);
    }

    /**
     * @dev See {ICritter-isFollowing}.
     */
    function isFollowing(
        address userOne,
        address userTwo
    ) external view returns (bool) {
        return followers[userTwo].contains(userOne);
    }

    /**
     * @dev See {ICritter-isViral}.
     */
    function isViral(uint256 tokenId) external view returns (bool) {
        return viralSqueaks.contains(tokenId);
    }

    /**
     * @dev See {ICritter-linkContracts}.
     */
    function linkContracts(address addressSqueakable) external {
        // validation
        _checkRole(UPGRADER_ROLE);

        squeakable = Squeakable(addressSqueakable);

        emit LinkedContracts();
    }

    /**
     * @dev See {ICritter-leavePool}.
     */
    function leavePool(uint256 tokenId) external {
        // valiation
        if (!viralSqueaks.contains(tokenId)) revert PoolDoesNotExist();
        EnumerableMapUpgradeable.AddressToUintMap storage passes = poolPasses[
            tokenId
        ];
        if (!passes.contains(msg.sender)) revert NotInPool();

        // remove the member & their shares from the pool
        Pool storage pool = pools[tokenId];
        pool.shares -= passes.get(msg.sender);
        passes.remove(msg.sender);

        if (passes.length() == 0) {
            // drain the funds
            if (pool.amount > 0) _deposit(pool.amount);

            // delete the pool
            delete pools[tokenId];
            delete poolPasses[tokenId];

            // remove the squeak from the viral squeaks list
            viralSqueaks.remove(tokenId);
        }
    }

    /**
     * @dev See {ICritter-updateInteractionFee}.
     */
    function updateInteractionFee(
        Interaction interaction,
        uint256 amount
    ) external {
        // user validation
        _checkRole(TREASURER_ROLE);

        // update fee
        fees[interaction] = amount;

        emit InteractionFeeUpdated(interaction, amount);
    }

    /**
     * @dev See {ICritter-updateRelationship}.
     */
    function updateRelationship(address account, Relation action) external {
        // validation
        Accountable.hasActiveAccount(users[msg.sender].status);
        if (account == msg.sender) revert InvalidRelationship();
        if (users[account].status != Status.Active)
            revert InvalidAccountStatus();

        // blacklists + followers
        EnumerableSetUpgradeable.AddressSet storage accountBlacklist = blocked[
            account
        ];
        EnumerableSetUpgradeable.AddressSet storage senderBlacklist = blocked[
            msg.sender
        ];
        EnumerableSetUpgradeable.AddressSet
            storage accountFollowers = followers[account];

        // update relationship
        if (action == Relation.Follow) {
            // sender cannot follow if account has blocked the sender
            if (accountBlacklist.contains(msg.sender)) revert Blocked();

            // ensure the relationship doesn't already exist
            if (accountFollowers.contains(msg.sender))
                revert AlreadyFollowing();

            // add the sender to the accounts followers
            accountFollowers.add(msg.sender);
        } else if (action == Relation.Unfollow) {
            // ensure account is being followed
            if (!accountFollowers.contains(msg.sender)) revert NotFollowing();

            // remove the sender from the accounts followers
            accountFollowers.remove(msg.sender);
        } else if (action == Relation.Block) {
            // ensure the account hasn't already been blocked
            if (senderBlacklist.contains(account)) revert AlreadyBlocked();

            // get the senders followers
            EnumerableSetUpgradeable.AddressSet
                storage senderFollowers = followers[msg.sender];

            // break relationship between sender & account
            if (accountFollowers.contains(msg.sender))
                accountFollowers.remove(msg.sender);
            if (senderFollowers.contains(account))
                senderFollowers.remove(account);

            // add the account to the senders blocked list
            senderBlacklist.add(account);
        } else if (action == Relation.Unblock) {
            // ensure the sender has blocked the account
            if (!senderBlacklist.contains(account)) revert NotBlocked();

            // unblock the account
            senderBlacklist.remove(account);
        }

        emit RelationshipUpdated(msg.sender, account, action);
    }

    /**
     * @dev See {ICritter-updateStatus}.
     */
    function updateStatus(address account, Status status) external {
        // validation
        _checkRole(MODERATOR_ROLE);
        User storage user = users[account];
        if (user.status == Status.Unknown) revert InvalidAccount();
        if (status == Status.Unknown || user.status == status)
            revert InvalidAccountStatus();

        // save the updated status
        user.status = status;

        emit StatusUpdated(account, status);
    }

    /**
     * @dev See {ICritter-updateUsername}.
     */
    function updateUsername(string calldata newUsername) external {
        // validation
        Accountable.hasActiveAccount(users[msg.sender].status);
        Accountable.validateUsername(
            addresses[newUsername],
            bytes(newUsername)
        );

        // clear the current username
        User storage user = users[msg.sender];
        delete addresses[user.username];

        // set the new username
        addresses[newUsername] = msg.sender;
        user.username = newUsername;

        emit UsernameUpdated(msg.sender, newUsername);
    }

    /**
     * @dev See {ICritter-updateConfiguration}.
     */
    function updateConfiguration(
        Configuration configuration,
        uint256 amount
    ) external {
        // validation
        _checkRole(OPERATOR_ROLE);

        // update config
        config[configuration] = amount;
    }

    /**
     * @dev See {ICritter-withdraw}.
     */
    function withdraw(address to, uint256 amount) external payable {
        // validation
        _checkRole(TREASURER_ROLE);
        if (amount > treasury) revert InvalidAmount();

        // transfer it out of the treasury
        treasury -= amount;
        _transferFunds(to, amount);

        emit FundsWithdrawn(to, amount);
    }

    /**
     * @dev Reverts when caller isn't authorized to upgrade the contract.
     */
    function _authorizeUpgrade(address) internal view override {
        // user validation
        _checkRole(UPGRADER_ROLE);
    }

    /**
     * @dev Increases the level for a user, and adds them to the pool for the
     *      viral squeak.
     * @param user User to add to the pool.
     * @param poolShareCount Total number of shares of the pool.
     * @param tokenId ID of the viral squeak.
     */
    function _createPoolPass(
        User storage user,
        uint256 poolShareCount,
        uint256 tokenId
    ) private returns (uint256) {
        // upgrade the users level
        _increaseLevel(user, 1);

        // add them to the pool & increase its share count
        poolPasses[tokenId].set(user.account, user.level);
        poolShareCount += user.level;

        emit PoolPassCreated(tokenId, user.account, user.level);

        return poolShareCount;
    }

    /**
     * @dev Deposits funds into the treasury.
     * @param amount Amount of the funds in wei.
     */
    function _deposit(uint256 amount) private {
        unchecked {
            treasury += amount;
        }

        emit FundsDeposited(amount);
    }

    /**
     * @dev Increases a users level until they hit the maximum.
     * @param user {User} to modify.
     * @param amount Number of levels to increase by.
     */
    function _increaseLevel(User storage user, uint256 amount) private {
        uint256 maxLevel = config[Configuration.MaxLevel];

        if (user.level < maxLevel) {
            uint256 newLevel;

            // determine the new level (unchecked due to maxLevel limit)
            unchecked {
                newLevel = user.level + amount;
            }

            // increase the users level
            user.level = newLevel < maxLevel ? newLevel : maxLevel;
        }
    }

    /**
     * @dev Pays out pool funds to its members.
     * @param tokenId ID of viral squeak.
     * @param pool Pointer to the Pool of the viral squeak.
     * @param sharePrice Price of each share at the time of payment.
     */
    function _makePoolDividends(
        uint256 tokenId,
        Pool storage pool,
        uint256 sharePrice
    ) private {
        EnumerableMapUpgradeable.AddressToUintMap storage passes = poolPasses[
            tokenId
        ];

        // TODO: move this unbounded loop off-chain
        uint256 passCount = passes.length();
        for (uint256 i = 0; i < passCount; i++) {
            // calculate the member payout based on the number of shares & price
            (address user, uint256 shares) = passes.at(i);
            uint256 payout = sharePrice * shares;

            // subtract funds from the pool & pay out to the user
            pool.amount -= payout;
            _transferFunds(user, payout);
        }

        emit Dividend(tokenId);
    }

    /**
     * @dev Transfers funds to an account.
     * @param to Address of the account.
     * @param amount Amount to transfer in wei.
     */
    function _transferFunds(address to, uint256 amount) private {
        payable(to).transfer(amount);

        emit FundsTransferred(to, amount);
    }
}
