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

// Interfaces
import '@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/interfaces/IERC721EnumerableUpgradeable.sol';

/**
 * @dev Interface for `Critter` contract.
 */
interface ICritter is
    IERC165Upgradeable,
    IERC721Upgradeable,
    IERC721EnumerableUpgradeable
{
    /**
     * @dev Emitted when the `sender` address creates a squeak with `content`
     *      and is assigned a `tokenID`.
     */
    event SqueakCreated(
        address indexed sender,
        uint256 tokenId,
        string content
    );

    /**
     * @dev Emitted when the `sender` address deletes a squeak of `tokenID`.
     */
    event SqueakDeleted(address indexed sender, uint256 tokenId);

    /**
     * @dev Create a squeak.
     *
     *      Requirements:
     *
     *      - The caller must already have an account.
     *      - The caller must have the `MINTER_ROLE`.
     *      - Squeak must be between 0 & 256 bytes.
     *
     *      Emits {SqueakCreated} event.
     */
    function createSqueak(string memory content) external returns (bool);

    /**
     * @dev Deletes squeak at `tokenId`.
     *
     *      Requirements:
     *
     *      - The caller must already have an account.
     *      - The caller must own `tokenId` or be an approved operator.
     *
     *      Emits {SqueakDeleted} & {Transfer} events.
     */
    function deleteSqueak(uint256 tokenId) external returns (bool);

    /**
     * @dev Creates a new `tokenId` and transfers it to `to`.
     *      Token URI generated & assigned automatically.
     *
     *      Requirements:
     *
     *      - `tokenId` must not exist.
     *      - If `to` refers to a smart contract, it must implement
     *      {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     *      Emits a {Transfer} event.
     */
    function safeMint(address to, uint256 tokenId) external;

    /**
     * @dev Pauses all token transfers.
     *
     *      See {ERC721PausableUpgradeable} and {PausableUpgradeable-_pause}.
     *
     *      Requirements:
     *
     *      - The caller must have the `PAUSER_ROLE`.
     */
    function pause() external;

    /**
     * @dev Unpauses all token transfers.
     *
     *      See {ERC721PausableUpgradeable} and {PausableUpgradeable-_pause}.
     *
     *      Requirements:
     *
     *      - The caller must have the `PAUSER_ROLE`.
     */
    function unpause() external;
}
