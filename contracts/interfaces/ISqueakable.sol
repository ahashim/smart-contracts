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

import './storage/IStoreable.sol';

/**
 * @dev Interface for Squeakable.
 */
interface ISqueakable is IStoreable {
    /**
     * @dev Creates a squeak.
     * @param content Text content of the squeak.
     * @notice Content must be between 0 and 256 bytes in length.
     */
    function createSqueak(string calldata content) external;

    /**
     * @dev Deletes a squeak & its associated information.
     * @param tokenId ID of the squeak.
     */
    function deleteSqueak(uint256 tokenId) external payable;

    /**
     * @dev Gets a count of each Sentiment item for a squeak.
     * @param tokenId ID of the squeak.
     * @return SentimentCounts
     */
    function getSentimentCounts(uint256 tokenId)
        external
        view
        returns (SentimentCounts memory);

    /**
     * @dev Interacts with a squeak.
     * @param tokenId ID of the squeak.
     * @param interaction A value from the Interaction enum.
     */
    function interact(uint256 tokenId, Interaction interaction)
        external
        payable;
}
