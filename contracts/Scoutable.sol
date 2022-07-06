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

import './Bankable.sol';
import './interfaces/IScoutable.sol';

/**
 * @title Scoutable
 * @dev A contract to handle scout logic.
 */
contract Scoutable is Bankable, IScoutable {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Scoutable_init() internal view onlyInitializing {}

    /**
     * @dev Ejects the user from a scout pool they are a part of.
     * @param tokenId ID of the viral squeak.
     */
    function ejectFromPool(uint256 tokenId) external whenNotPaused {
        ScoutPool storage pool = pools[tokenId];

        // validate the account is in the pool
        if (!pool.members.contains(msg.sender)) revert NotInScoutPool();

        // remove the user & their shares from the pool
        pool.shares -= pool.members.get(msg.sender);
        pool.members.remove(msg.sender);

        if (pool.members.length() == 0) {
            // drain the funds
            if (pool.amount > 0) _deposit(pool.amount);

            // delete the pool
            delete pools[tokenId];

            // remove the token from viral squeaks
            viralSqueaks.remove(tokenId);
        }
    }

    /**
     * @dev Gets the pool amount & number of shares.
     * @param tokenId ID of the viral squeak.
     * @return ScoutPoolInfo
     */
    function getPoolInfo(uint256 tokenId)
        external
        view
        returns (ScoutPoolInfo memory)
    {
        ScoutPool storage pool = pools[tokenId];

        return ScoutPoolInfo(pool.amount, pool.shares, pool.members.length());
    }

    /**
     * @dev Gets a list of scouts for a viral squeak.
     * @param tokenId ID of the viral squeak.
     * @return A list of Scouts.
     */
    function getScouts(uint256 tokenId)
        external
        view
        returns (Scout[] memory)
    {
        ScoutPool storage pool = pools[tokenId];
        uint256 memberCount = pool.members.length();

        // initialize scouts array based on the # of pool members
        Scout[] memory scouts = new Scout[](memberCount);

        // populate the array with member addresses from the pool
        for (uint256 i = 0; i < memberCount; i++) {
            (address account, uint256 shares) = pool.members.at(i);
            scouts[i] = Scout(account, shares);
        }

        return scouts;
    }

    /**
     * @dev Updates the scout level for an account, and adds them to the scout
     *      pool of a viral squeak.
     * @param user User to add to scouts list.
     * @param pool Storage pointer to ScoutPool.
     */
    function _addScout(User storage user, ScoutPool storage pool) internal {
        // upgrade the users scout level
        _increaseScoutLevel(user, 1);

        // add them to the pool & increase its share count by users scout level
        pool.members.set(user.account, user.scoutLevel);
        pool.shares += user.scoutLevel;
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
