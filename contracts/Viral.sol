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

import './Poolable.sol';
import './interfaces/IViral.sol';
import './libraries/ViralityScore.sol';

/**
 * @title Viral
 * @dev A contract to handle virality for squeaks.
 */
contract Viral is Poolable, IViral {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Viral_init() internal view onlyInitializing {}

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
