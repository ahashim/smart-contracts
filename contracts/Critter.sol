// SPDX-License-Identifier: Apache-2.0
/*

   Copyright 2022 Critter

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
import 'erc721a-upgradeable/contracts/ERC721AUpgradeable.sol';

// interface
import './ICritter.sol';

// libraries
import './libraries/Accountable.sol';
import './libraries/Bankable.sol';
import './libraries/Relatable.sol';
import './libraries/Squeakable.sol';
import './libraries/ViralityScore.sol';

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
    ERC721AUpgradeable,
    ICritter
{
    /**
     * @dev MINTER_ROLE has priviledges to mint tokens.
     */
    bytes32 private constant MINTER_ROLE = keccak256('MINTER_ROLE');

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
     * @dev UPGRADER_ROLE has priviledges to upgrade the contract.
     */
    bytes32 private constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');

    /**
     * @dev Token URL prefix used by squeaks.
     */
    string public baseTokenURI;

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
     * @dev Mapping of tokenId <=> Squeak.
     */
    mapping(uint256 => Squeak) public squeaks;

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
    ) public initializerERC721A initializer {
        // base platform fee in wei
        uint256 platformFee = 80000000000000;

        // init 3rd party contracts
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __ERC721A_init('Critter', 'CRTTR');

        // set base token url
        baseTokenURI = 'https://critter.fyi/token/';

        // set default config values
        config[Configuration.DeleteRate] = platformFee;
        config[Configuration.PlatformTakeRate] = 10; // percent of platform fee
        config[Configuration.MaxLevel] = maxLevel;
        config[Configuration.PoolPayoutThreshold] = dividendThreshold;
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
        _grantRole(MINTER_ROLE, msg.sender);
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

        // grant them the ability to mint NFT's
        _grantRole(MINTER_ROLE, msg.sender);

        emit AccountCreated(msg.sender, bytes32(rawUsername));
    }

    /**
     * @dev See {ICritter-createSqueak}.
     */
    function createSqueak(string calldata content) external {
        // validation
        Accountable.hasActiveAccount(users[msg.sender].status);
        _checkRole(MINTER_ROLE);
        bytes memory rawContent = bytes(content);
        Squeakable.validateSqueak(rawContent);

        // create a Squeak
        uint256 tokenId = _nextTokenId();
        squeaks[tokenId] = Squeak(
            block.number,
            msg.sender,
            msg.sender,
            rawContent
        );

        // mint the NFT
        _mint(msg.sender, 1);

        emit SqueakCreated(msg.sender, bytes32(rawContent), tokenId);
    }

    /**
     * @dev See {ICritter-deleteSqueak}.
     */
    function deleteSqueak(uint256 tokenId) external payable nonReentrant {
        // validation
        Accountable.hasActiveAccount(users[msg.sender].status);
        if (!_exists(tokenId)) revert SqueakDoesNotExist();
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender))
            revert NotApprovedOrOwner();

        // validate delete fee & calculate refund
        (uint256 deleteFee, uint256 remainder) = Bankable
            .getDeleteFeeAndRefundAmount(
                squeaks[tokenId].blockNumber,
                0,
                config[Configuration.DeleteRate]
            );

        // receive payment
        _deposit(deleteFee);

        // refund any excess
        if (remainder > 0) _transferFunds(msg.sender, remainder);

        // burn the NFT
        _burn(tokenId);

        // delete the squeak + sentiment
        delete squeaks[tokenId];
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
        if (!_exists(tokenId)) revert SqueakDoesNotExist();

        return
            Bankable.getDeleteFee(
                squeaks[tokenId].blockNumber,
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
        // validation
        if (!_exists(tokenId)) revert SqueakDoesNotExist();

        Sentiment storage sentiment = sentiments[tokenId];

        uint256 blockDelta = block.number - squeaks[tokenId].blockNumber;
        uint256 dislikes = sentiment.dislikes.length();
        uint256 likes = sentiment.likes.length();
        uint256 resqueaks = sentiment.resqueaks.length();
        uint64 score = 0;

        // squeak requires 1 like & 1 resqueak to be considered for virality
        if (likes > 0 && resqueaks > 0) {
            score = ViralityScore.calculate(
                blockDelta,
                dislikes,
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
        // validation
        Accountable.hasActiveAccount(users[msg.sender].status);
        if (!_exists(tokenId)) revert SqueakDoesNotExist();
        uint256 interactionFee = fees[interaction];
        Bankable.validateInteractionFee(interactionFee);
        address author = squeaks[tokenId].author;
        Relatable.checkIfBlocked(
            author,
            blocked[author].contains(msg.sender),
            blocked[msg.sender].contains(author)
        );

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

        // check virality
        uint64 score = getViralityScore(tokenId);
        if (
            !viralSqueaks.contains(tokenId) &&
            score >= config[Configuration.ViralityThreshold]
        ) {
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
                    !poolPasses[tokenId].contains(sentiment.resqueaks.at(i))
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

        // make payment
        User storage owner = users[ownerOf(tokenId)];
        if (
            // the squeak owner is banned
            owner.status == Status.Banned ||
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
                Pool storage pool = pools[tokenId];

                // split payment between pool members & the squeak owner
                uint256 poolFunds = payment / 2;

                // add funds to the pool
                unchecked {
                    // dividend payouts will reset pool poolFunds to zero
                    pool.amount += poolFunds;
                }

                emit FundsAddedToPool(tokenId, poolFunds);

                // determine if we need to payout
                uint256 sharePrice = pool.amount / pool.shares;
                if (sharePrice >= config[Configuration.PoolPayoutThreshold])
                    _makePoolDividends(tokenId, pool, sharePrice);

                // any dust from odd division goes to the owner
                payment -= poolFunds;
            }

            // transfer remaining funds to the squeak owner
            _transferFunds(owner.account, payment);
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
        if (!_exists(tokenId)) revert SqueakDoesNotExist();

        return viralSqueaks.contains(tokenId);
    }

    /**
     * @dev See {ICritter-leavePool}.
     */
    function leavePool(uint256 tokenId) external {
        // validate that a pool exists for the squeak
        if (!viralSqueaks.contains(tokenId)) revert PoolDoesNotExist();

        EnumerableMapUpgradeable.AddressToUintMap storage passes = poolPasses[
            tokenId
        ];

        // validate that the account is in the pool
        if (!passes.contains(msg.sender)) revert NotInPool();

        Pool storage pool = pools[tokenId];

        // remove the member & their shares from the pool
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
     * @dev See {IERC721AUpgradeable-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(AccessControlUpgradeable, ERC721AUpgradeable, ICritter)
        returns (bool)
    {
        return
            ERC721AUpgradeable.supportsInterface(interfaceId) ||
            super.supportsInterface(interfaceId);
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

        // sender cannot update a relationship to themselves
        if (account == msg.sender) revert InvalidRelationship();

        // ensure the account is active
        if (users[account].status != Status.Active)
            revert InvalidAccountStatus();

        // get the accounts blacklist
        EnumerableSetUpgradeable.AddressSet storage accountBlacklist = blocked[
            account
        ];

        // get the senders blacklist
        EnumerableSetUpgradeable.AddressSet storage senderBlacklist = blocked[
            msg.sender
        ];

        // get the accounts followers
        EnumerableSetUpgradeable.AddressSet
            storage accountFollowers = followers[account];

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
        if (status == Status.Unknown) revert InvalidAccountStatus();

        // ensure the account exists
        User storage user = users[account];
        if (user.status == Status.Unknown) revert InvalidAccount();

        // ensure new status is not the same as the current status
        if (user.status == status) revert InvalidAccountStatus();

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
     * @dev Hook that is called after a set of serially-ordered token ids have
     *      been transferred. This includes minting. And also called after one
     *      token has been burned. Calling conditions:
     *      - When `from` and `to` are both non-zero, `from`'s `tokenId` has
     *        been transferred to `to`.
     *      - When `from` is zero, `tokenId` has been minted for `to`.
     *      - When `to` is zero, `tokenId` has been burned by `from`.
     *      - `from` and `to` are never both zero.
     * @param from Address of the account that is relinquishing ownership of the
     *      token.
     * @param to Address of the account that is gaining ownership of the token.
     * @param startTokenId The first token id to be transferred.
     * @param quantity The amount to be transferred.
     */
    function _afterTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal override(ERC721AUpgradeable) {
        super._afterTokenTransfers(from, to, startTokenId, quantity);
        squeaks[startTokenId].owner = to;
    }

    /**
     * @dev Reverts when caller isn't authorized to upgrade the contract.
     */
    function _authorizeUpgrade(address) internal view override {
        // user validation
        _checkRole(UPGRADER_ROLE);
    }

    /**
     * @dev See {IERC721AUpgradeable-_baseURI}.
     */
    function _baseURI()
        internal
        view
        override(ERC721AUpgradeable)
        returns (string memory)
    {
        return baseTokenURI;
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
        for (uint256 i = 0; i < passes.length(); i++) {
            // calculate the member payout based on the number of shares & price
            (address user, uint256 shares) = passes.at(i);
            uint256 payout = sharePrice * shares;

            // subtract funds from the pool & pay out to the user
            pool.amount -= payout;
            _transferFunds(user, payout);
        }

        emit PoolPayout(tokenId);
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
