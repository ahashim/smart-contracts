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
pragma solidity ^0.8.4;

// critter contracts
import './Validateable.sol';

// data structures
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';

// libraries
import 'abdk-libraries-solidity/ABDKMath64x64.sol';

/**
 * @title Squeakable
 * @dev A contract to handle virality for squeaks.
 */
contract Viral is Validateable {
    using ABDKMath64x64 for *;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

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
        uint256 blockDelta = block.number - squeaks[tokenId].blockNumber;
        uint256 dislikes = dislikes[tokenId].length();
        uint256 likes = likes[tokenId].length();
        uint256 resqueaks = resqueaks[tokenId].length();

        // squeak needs to have at least 1 like and 1 resqueak to be considered
        return
            likes > 0 && resqueaks > 0
                ? _calculateVirality(blockDelta, dislikes, likes, resqueaks)
                : 0;
    }

    /**
     * @dev Adds a squeak to the list of viral squeaks, and all of its positive
     *      interactors to a scout pool while upgrading their scout levels.
     * @param tokenId ID of the squeak.
     */
    function _markViral(uint256 tokenId) internal {
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];
        EnumerableSetUpgradeable.AddressSet storage resqueakers = resqueaks[
            tokenId
        ];
        ScoutPool memory pool;

        // add squeak to the list of viral squeaks
        viralSqueaks.add(tokenId);

        // give the user who pushed the squeak into virality a bonus upgrade to
        // their scout level.
        users[msg.sender].scoutLevel += 4;

        // get the upper bound of the larger set of positive interactions
        uint256 likesCount = likers.length();
        uint256 resqueaksCount = resqueakers.length();
        uint256 upperBound = likesCount > resqueaksCount
            ? likesCount
            : resqueaksCount;

        // iterate over both sets & add all unique addresses to the scouts list
        // TODO: move this unbounded loop off-chain
        for (uint256 index = 0; index < upperBound; index++) {
            // add all likers to the list of scouts list
            if (index < likesCount) {
                _addScout(likers.at(index), tokenId);
                pool.levelTotal += users[likers.at(index)].scoutLevel;
            }

            // add all resqueakers to the list of scouts who aren't likers
            if (
                index < resqueaksCount &&
                !scouts[tokenId].contains(resqueakers.at(index))
            ) {
                _addScout(resqueakers.at(index), tokenId);
                pool.levelTotal += users[resqueakers.at(index)].scoutLevel;
            }
        }

        // save the pool to storage
        scoutPools[tokenId] = pool;
    }

    /**
     * @dev Updates the scout level for an account, and adds them to the scout
     *      pool of a viral squeak.
     * @param account Account to add to scouts list for tokenId.
     * @param tokenId ID of the viral squeak.
     */
    function _addScout(address account, uint256 tokenId) private {
        // upgrade their scout level
        users[account].scoutLevel++;

        // add them to the scout pool for the squeak
        scouts[tokenId].add(account);
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
