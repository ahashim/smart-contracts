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
pragma solidity 0.8.9;

// critter contracts
import './Validateable.sol';

/**
 * @title Scoutable
 * @dev A contract to handle scout logic.
 */
contract Scoutable is Validateable {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Scoutable_init() internal view onlyInitializing {}

    /**
     * @dev Gets the pool amount & number of shares.
     * @param tokenId ID of the viral squeak.
     * @return Amount of funds in the scout pool.
     * @return Shares in the scout pool.
     */
    function getScoutPool(uint256 tokenId)
        external
        view
        returns (uint256, uint256)
    {
        ScoutPool storage pool = scoutPools[tokenId];

        return (pool.amount, pool.shares);
    }

    /**
     * @dev Gets a list of scouts for a viral squeak.
     * @param tokenId ID of the viral squeak.
     * @return a list of account addresses representing scouts.
     */
    function getScouts(uint256 tokenId)
        external
        view
        returns (address[] memory)
    {
        ScoutPool storage pool = scoutPools[tokenId];
        uint256 memberCount = pool.members.length();

        // initialize scouts array based on the # of pool members
        address[] memory scouts = new address[](memberCount);

        // populate the array with member addresses from the pool
        for (uint256 index = 0; index < memberCount; index++) {
            (scouts[index], ) = pool.members.at(index);
        }

        return scouts;
    }

    /**
     * @dev Updates the scout level for an account, and adds them to the scout
     *      pool of a viral squeak.
     * @param tokenId ID of the viral squeak.
     * @param user User to add to scouts list.
     * @param pool Storage pointer to ScoutPool for the viral squeak.
     */
    function _addScout(
        uint256 tokenId,
        User storage user,
        ScoutPool storage pool
    ) internal {
        // upgrade the users scout level
        _increaseScoutLevel(user, 1);

        // add them to the pool & increase its share count by users scout level
        pool.members.set(user.account, user.scoutLevel);
        pool.shares += user.scoutLevel;

        // add the ID of the viral squeak to their list of scout finds
        scoutFinds[user.account].add(tokenId);
    }

    /**
     * @dev Increases a scouts level until they hit the maximum.
     * @param user User to modify.
     * @param amount Number of levels to increase by.
     */
    function _increaseScoutLevel(User storage user, uint256 amount) internal {
        if (user.scoutLevel < scoutMaxLevel) {
            uint256 newLevel;

            // determine new level (can be unchecked due to scoutMaxLevel limit)
            unchecked {
                newLevel = user.scoutLevel + amount;
            }

            user.scoutLevel = newLevel < scoutMaxLevel
                ? newLevel
                : scoutMaxLevel;
        }
    }
}
