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

/**
 * @dev Interface for the Squeakable.
 */
interface ISqueakable {
    /**
     * @dev Squeak is the primary Critter message.
     * @param blockNumber Block in which the squeak was created.
     * @param author Address of the original author of the squeak.
     * @param content Message content of the squeak.
     */
    struct Squeak {
        uint256 blockNumber;
        address author;
        bytes content;
    }

    /**
     * @dev Burns an NFT and deletes a squeak from storage.
     * @param tokenId ID of the squeak.
     * @param sender Account that initiated the call from the main contract.
     * @notice This can only be called by {BURNER_ROLE}.
     */
    function burn(uint256 tokenId, address sender) external;

    /**
     * @dev Checks whether a squeak exists.
     * @param tokenId ID of the squeak.
     */
    function exists(uint256 tokenId) external returns (bool);

    /**
     * @dev Gets the block number at the time a squeak was created.
     * @param tokenId ID of the squeak.
     */
    function getBlockCreated(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Gets the content of a squeak.
     * @param tokenId ID of the squeak.
     */
    function getContent(uint256 tokenId) external view returns (bytes memory);

    /**
     * @dev Gets the author of a squeak.
     * @param tokenId ID of the squeak.
     */
    function getAuthor(uint256 tokenId) external view returns (address);

    /**
     * @dev Saves the squeak contents to storage & mints an NFT.
     * @param author Account that created the squeak.
     * @param content Bytes of the content text.
     * @notice Content must be between 0 and 256 bytes in length, and this can
     *         only be called by {MINTER_ROLE}.
     */
    function mint(
        address author,
        bytes calldata content
    ) external returns (uint256);

    /**
     * @dev Upgradeable "constructor" function.
     * @param critterContract Address of the main Critter contract.
     */
    function initialize(address critterContract) external;

    /**
     * @dev See {IERC721AUpgradeable-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) external view returns (bool);
}
