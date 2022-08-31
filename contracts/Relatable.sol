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
    function __Relatable_init() internal onlyInitializing {}

    /**
     * @dev See {IRelatable-follow}.
     */
    function updateRelationship(address account, Relations action)
        external
        hasActiveAccount
    {
        // ensure the account is active
        if (users[account].status != AccountStatus.Active)
            revert InvalidAccountStatus();

        // get relationship pointers
        Relationship storage sender = relationships[msg.sender];
        Relationship storage relative = relationships[account];

        if (action == Relations.Follow) {
            // ensure the relationship doesn't already exist
            if (sender.following.contains(account)) revert AlreadyFollowing();

            // create relationships between the accounts
            sender.following.add(account);
            relative.followers.add(msg.sender);
        } else if (action == Relations.Unfollow) {
            // ensure accounts are related
            if (!sender.following.contains(account)) revert NotFollowing();

            // delete relationships between the accounts
            sender.following.remove(account);
            relative.followers.remove(msg.sender);
        }

        emit RelationshipUpdated(msg.sender, account, action);
    }
}
