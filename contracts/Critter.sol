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

import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import './Validateable.sol';
import './Squeakable.sol';
import './interfaces/ICritter.sol';

using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

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
contract Critter is UUPSUpgradeable, Validateable, Squeakable, ICritter {
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
        // 3rd party
        __AccessControl_init();
        __ERC721A_init('Critter', 'CRTTR');
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Storage
        __Storeable_init(dividendThreshold, maxLevel, viralityThreshold);

        // Logic
        __Bankable_init();
        __Squeakable_init();
        __Validateable_init();
        __Viral_init();

        // grant all roles to contract owner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /**
     * @dev See {IAccountable-createAccount}.
     */
    function createAccount(string calldata username) external {
        // validate account
        if (users[msg.sender].status != Status.Unknown)
            revert AlreadyRegistered();

        // validate username
        bytes memory rawUsername = bytes(username);
        Validation.username(addresses[username], rawUsername);

        // create an active User for the account
        users[msg.sender] = User(msg.sender, Status.Active, 1, username);

        // set username <-> address mapping
        addresses[username] = msg.sender;

        // bypassing the admin-check on grantRole so each user can mint squeaks
        _grantRole(MINTER_ROLE, msg.sender);

        emit AccountCreated(msg.sender, bytes32(rawUsername));
    }

    /**
     * @dev See {IAccountable-isBlocked}.
     */
    function isBlocked(
        address userOne,
        address userTwo
    ) external view returns (bool) {
        return blocked[userOne].contains(userTwo);
    }

    /**
     * @dev See {IAccountable-isFollowing}.
     */
    function isFollowing(
        address userOne,
        address userTwo
    ) external view returns (bool) {
        return followers[userTwo].contains(userOne);
    }

    /**
     * @dev See {IAccountable-updateRelationship}.
     */
    function updateRelationship(
        address account,
        Relation action
    ) external hasActiveAccount {
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
     * @dev See {IAccountable-updateStatus}.
     */
    function updateStatus(
        address account,
        Status status
    ) external onlyRole(MODERATOR_ROLE) {
        // validate status
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
     * @dev See {IAccountable-updateUsername}.
     */
    function updateUsername(
        string calldata newUsername
    ) external hasActiveAccount {
        // validate new username
        Validation.username(addresses[newUsername], bytes(newUsername));

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
    ) external onlyRole(OPERATOR_ROLE) {
        config[configuration] = amount;
    }

    /* solhint-disable no-empty-blocks */
    /**
     * @dev Reverts when caller isn't authorized to upgrade the contract.
     */
    function _authorizeUpgrade(
        address
    ) internal view override onlyRole(UPGRADER_ROLE) {}

    /* solhint-enable no-empty-blocks */

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
}
