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

import './Validateable.sol';
import './interfaces/IAccountable.sol';
import './libraries/Validation.sol';

/**
 * @title Accountable
 * @dev A contract to handle account management.
 */
contract Accountable is Validateable, IAccountable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Accountable_init() internal onlyInitializing {
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
}
