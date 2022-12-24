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

import './Bankable.sol';
import './interfaces/IViral.sol';
import './libraries/ViralityScore.sol';

/**
 * @title Viral
 * @dev A contract to handle virality for squeaks.
 */
contract Viral is Bankable, IViral {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Viral_init() internal view onlyInitializing {}

    /**
     * @dev See {IPoolable-getPoolInfo}.
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
     * @dev See {IPoolable-getPoolPasses}.
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
     * @dev See {IViral-getViralityScore}.
     */
    function getViralityScore(
        uint256 tokenId
    ) public view squeakExists(tokenId) returns (uint64) {
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
     * @dev See {IViral-isViral}.
     */
    function isViral(
        uint256 tokenId
    ) external view squeakExists(tokenId) returns (bool) {
        return viralSqueaks.contains(tokenId);
    }

    /**
     * @dev See {IPoolable-leavePool}.
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
    ) internal returns (uint256) {
        // upgrade the users level
        _increaseLevel(user, 1);

        // add them to the pool & increase its share count
        poolPasses[tokenId].set(user.account, user.level);
        poolShareCount += user.level;

        return poolShareCount;
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

    /**
     * @dev Adds a squeak to the list of viral squeaks, and all of its positive
     *      interactors to a pool while upgrading their levels.
     * @param tokenId ID of the squeak.
     * @param sentiment Pointer to the {Sentiment} of the squeak.
     * @param viralityScore Virality score of the squeak.
     */
    function _markViral(
        uint256 tokenId,
        Sentiment storage sentiment,
        uint64 viralityScore
    ) internal {
        // add squeak to the list of viral squeaks
        viralSqueaks.add(tokenId);

        // give the user who propelled the squeak into virality a bonus level.
        _increaseLevel(users[msg.sender], config[Configuration.ViralityBonus]);

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
            viralityScore
        );
    }
}
