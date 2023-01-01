// SPDX-License-Identifier: Apache-2.0
/*

   Copyright 2023 Critter

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

import 'abdk-libraries-solidity/ABDKMath64x64.sol';

using ABDKMath64x64 for uint256;
using ABDKMath64x64 for int128;

/**
 * @title ViralityScore
 * @dev A library to calculate the virality score of a squeak.
 */
library Viral {
    /**
     * @dev See {IViralityScore-calculate}.
     */
    function score(
        uint256 blockDelta,
        uint256 dislikes,
        uint256 likes,
        uint256 resqueaks
    ) public pure returns (uint64) {
        // ensure no division by zero when taking the ratio of likes to
        // dislikes
        if (dislikes == 0) dislikes = 1;

        // convert values to signed int128 for 64.64 fixed point
        // calculations
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
            ? uint256(1).fromUInt().div(order)
            : uint256(0).fromUInt();

        // calculate final virality score
        int128 numerator = uint256(1000).fromUInt();
        int128 denominator = signedBlockDelta.add(coefficient).add(
            uint256(10).fromUInt()
        );

        // convert back to uint64
        return numerator.div(denominator).toUInt();
    }
}
