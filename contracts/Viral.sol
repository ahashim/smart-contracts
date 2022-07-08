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

import 'abdk-libraries-solidity/ABDKMath64x64.sol';
import './Scoutable.sol';
import './interfaces/IViral.sol';

/**
 * @title Squeakable
 * @dev A contract to handle virality for squeaks.
 */
contract Viral is Scoutable, IViral {
    using ABDKMath64x64 for *;
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Viral_init() internal view onlyInitializing {}

    /**
     * @dev Gets the virality score of a squeak.
     * @param tokenId ID of the squeak.
     * @return A value between 0-100 representing the virality of the squeak.
     * @notice The token must exist.
     */
    function getViralityScore(uint256 tokenId)
        public
        view
        squeakExists(tokenId)
        returns (uint64)
    {
        // get squeak sentiment values
        Sentiment storage sentiment = sentiments[tokenId];

        uint256 blockDelta = block.number - squeaks[tokenId].blockNumber;
        uint256 dislikes = sentiment.dislikes.length();
        uint256 likes = sentiment.likes.length();
        uint256 resqueaks = sentiment.resqueaks.length();

        // squeak needs to have at least 1 like and 1 resqueak to be considered
        return
            likes > 0 && resqueaks > 0
                ? _calculateVirality(blockDelta, dislikes, likes, resqueaks)
                : 0;
    }

    /**
     * @dev Looks up if a squeak is viral or not.
     * @param tokenId ID of the squeak.
     * @return boolean statings if the squeak is viral.
     * @notice The token must exist.
     */
    function isViral(uint256 tokenId)
        external
        view
        squeakExists(tokenId)
        returns (bool)
    {
        return viralSqueaks.contains(tokenId);
    }

    /**
     * @dev Adds a squeak to the list of viral squeaks, and all of its positive
     *      interactors to a scout pool while upgrading their scout levels.
     * @param tokenId ID of the squeak.
     * @param sentiment Pointer to Sentiment values for the squeak.
     */
    function _markViral(uint256 tokenId, Sentiment storage sentiment)
        internal
    {
        ScoutPool storage pool = pools[tokenId];

        // add squeak to the list of viral squeaks
        viralSqueaks.add(tokenId);

        // give the user who propelled the squeak into virality a bonus upgrade
        // to their scout level.
        _increaseScoutLevel(
            users[msg.sender],
            config[Configuration.ScoutViralityBonus]
        );

        // iterate over both sets & add all unique addresses to the scouts list
        uint256 likesCount = sentiment.likes.length();
        uint256 resqueaksCount = sentiment.resqueaks.length();
        uint256 upperBound = likesCount > resqueaksCount
            ? likesCount
            : resqueaksCount;

        // TODO: move this unbounded loop offchain
        for (uint256 i = 0; i < upperBound; i++) {
            if (i < likesCount)
                // add all likers
                _addScout(users[sentiment.likes.at(i)], pool);

            if (
                i < resqueaksCount &&
                !pool.members.contains(sentiment.resqueaks.at(i))
            )
                // add all resqueakers who aren't likers
                _addScout(users[sentiment.resqueaks.at(i)], pool);
        }
    }

    /**
     * @dev Gets the virality score of a squeak.
     * @param blockDelta Number of blocks elapsed since the squeak was created.
     * @param dislikes Number of dislikes.
     * @param likes Number of likes.
     * @param resqueaks Number of resqueaks.
     * @return A value between 0-100 representing the virality of the squeak.
     */
    function _calculateVirality(
        uint256 blockDelta,
        uint256 dislikes,
        uint256 likes,
        uint256 resqueaks
    ) private pure returns (uint64) {
        // ensure no division by zero when taking the ratio of likes:dislikes
        if (dislikes == 0) dislikes = 1;

        // convert values to signed int128 for 64.64 fixed point calculations
        int128 signedLikes = likes.fromUInt();
        int128 signedDislikes = dislikes.fromUInt();
        int128 signedResqueaks = resqueaks.fromUInt();
        int128 signedBlockDelta = blockDelta.fromUInt();

        // calculate each virality component
        int128 ratio = signedLikes.div(signedDislikes).sqrt();
        int128 total = signedLikes.add(signedDislikes).ln();
        int128 amplifier = signedResqueaks.ln().div(signedResqueaks);

        // multiply all components to get the order
        int128 order = ratio.mul(total).mul(amplifier);

        // determine coefficient based on the order
        int128 coefficient = order != 0
            ? 1.fromUInt().div(order)
            : 0.fromUInt();

        // calculate final virality score
        int128 numerator = 1000.fromUInt();
        int128 denominator = signedBlockDelta.add(coefficient).add(
            10.fromUInt()
        );
        int128 score = numerator.div(denominator);

        // convert back to uint64
        return score.toUInt();
    }
}
