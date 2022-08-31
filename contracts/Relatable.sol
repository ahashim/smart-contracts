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
        // one cannot update the relationship to themselves
        if (account == msg.sender) revert InvalidRelationship();

        // ensure the account is active
        if (users[account].status != AccountStatus.Active)
            revert InvalidAccountStatus();

        // get followers of the requested account
        EnumerableSetUpgradeable.AddressSet storage userFollowers = followers[
            account
        ];

        if (action == Relation.Follow) {
            // ensure the relationship doesn't already exist
            if (userFollowers.contains(msg.sender)) revert AlreadyFollowing();

            // create relationships between the accounts
            userFollowers.add(msg.sender);
        } else if (action == Relation.Unfollow) {
            // ensure accounts are related
            if (!userFollowers.contains(msg.sender)) revert NotFollowing();

            // delete relationships between the accounts
            userFollowers.remove(msg.sender);
        }

        emit RelationshipUpdated(msg.sender, account, action);
    }
}
