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

import './Bankable.sol';
import './interfaces/IPoolable.sol';

/**
 * @title Poolable
 * @dev A contract to handle pool logic.
 */
contract Poolable is Bankable, IPoolable {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Poolable_init() internal view onlyInitializing {}

    /**
     * @dev See {IPoolable-leavePool}.
     */
    function leavePool(uint256 tokenId) external {
        // validate that a pool exists for the squeak
        if (!viralSqueaks.contains(tokenId)) revert PoolDoesNotExist();

        Pool storage pool = pools[tokenId];

        // validate that the account is in the pool
        if (!pool.passes.contains(msg.sender)) revert NotInPool();

        // remove the member & their shares from the pool
        pool.shares -= pool.passes.get(msg.sender);
        pool.passes.remove(msg.sender);

        if (pool.passes.length() == 0) {
            // drain the funds
            if (pool.amount > 0) _deposit(pool.amount);

            // delete the pool
            delete pools[tokenId];

            // remove the squeak from the viral squeaks list
            viralSqueaks.remove(tokenId);
        }
    }

    /**
     * @dev See {IPoolable-getPoolInfo}.
     */
    function getPoolInfo(
        uint256 tokenId
    ) external view returns (PoolInfo memory) {
        Pool storage pool = pools[tokenId];

        return PoolInfo(pool.amount, pool.shares, pool.passes.length());
    }

    /**
     * @dev See {IPoolable-getPoolPasses}.
     */
    function getPoolPasses(
        uint256 tokenId
    ) external view returns (PoolPass[] memory) {
        Pool storage pool = pools[tokenId];
        uint256 passCount = pool.passes.length();

        // initialize array based on the number of pool members
        PoolPass[] memory passes = new PoolPass[](passCount);

        // populate the array with member addresses from the pool
        for (uint256 i = 0; i < passCount; i++) {
            (address account, uint256 shares) = pool.passes.at(i);
            passes[i] = PoolPass(account, shares);
        }

        return passes;
    }

    /**
     * @dev Increases the level for a user, and adds them to the pool for the
     *      viral squeak.
     * @param user User to add to the pool.
     * @param pool pointer to a {Pool}.
     */
    function _createPoolPass(User storage user, Pool storage pool) internal {
        // upgrade the users level
        _increaseLevel(user, 1);

        // add them to the pool & increase its share count
        pool.passes.set(user.account, user.level);
        pool.shares += user.level;
    }

    /**
     * @dev Increases a users level until they hit the maximum.
     * @param user {User} to modify.
     * @param amount Number of levels to increase by.
     */
    function _increaseLevel(User storage user, uint256 amount) internal {
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
}
