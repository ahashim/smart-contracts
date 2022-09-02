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

import './IStoreable.sol';

/**
 * @dev Interface for Squeakable.
 */
interface ISqueakable is IStoreable {
    /**
     * @dev Emitted after creating a squeak.
     * @param author Account that created the squeak.
     * @param tokenId ID of the squeak.
     * @param blockNumber Block in which the squeak was created.
     * @param content Content of the squeak.
     */
    event SqueakCreated(
        address indexed author,
        uint256 tokenId,
        uint256 blockNumber,
        string content
    );

    /**
     * @dev Emitted after an interaction.
     * @param tokenId ID of the squeak.
     * @param sender Account that resqueaked.
     * @param interaction An {Interaction} value.
     */
    event SqueakInteraction(
        uint256 tokenId,
        address sender,
        Interaction interaction
    );

    /**
     * @dev Creates a squeak.
     * @param content Text content of the squeak.
     * @notice Content must be between 0 and 256 bytes in length.
     */
    function createSqueak(string calldata content) external;

    /**
     * @dev Deletes a squeak & its associated information.
     * @param tokenId ID of the squeak.
     * @notice Caller must own the squeak or be an approved account to delete.
     */
    function deleteSqueak(uint256 tokenId) external payable;

    /**
     * @dev Gets a count of each Sentiment item for a squeak.
     * @param tokenId ID of the squeak.
     * @return {SentimentCounts}
     */
    function getSentimentCounts(uint256 tokenId)
        external
        view
        returns (SentimentCounts memory);

    /**
     * @dev Interacts with a squeak.
     * @param tokenId ID of the squeak.
     * @param interaction An {Interaction} value.
     */
    function interact(uint256 tokenId, Interaction interaction)
        external
        payable;
}
