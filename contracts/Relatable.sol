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
pragma solidity 0.8.16;

import './Validateable.sol';
import './interfaces/IRelatable.sol';

/**
 * @title Relatable
 * @dev A contract to handle relationships between followers.
 */
contract Relatable is Validateable, IRelatable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Relatable_init() internal view onlyInitializing {}

    /**
     * @dev See {IRelatable-isBlocked}.
     */
    function isBlocked(address userOne, address userTwo)
        external
        view
        returns (bool)
    {
        return blocked[userOne].contains(userTwo);
    }

    /**
     * @dev See {IRelatable-isFollowing}.
     */
    function isFollowing(address userOne, address userTwo)
        external
        view
        returns (bool)
    {
        return followers[userTwo].contains(userOne);
    }

    /**
     * @dev See {IRelatable-updateRelationship}.
     */
    function updateRelationship(address account, Relation action)
        external
        hasActiveAccount
    {
        // sender cannot update a relationship to themselves
        if (account == msg.sender) revert InvalidRelationship();

        // ensure the account is active
        if (users[account].status != AccountStatus.Active)
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
}
