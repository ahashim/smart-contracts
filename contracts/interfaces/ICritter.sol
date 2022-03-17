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

import '@openzeppelin/contracts/access/IAccessControlEnumerable.sol';
import '@openzeppelin/contracts/interfaces/IERC165.sol';
import '@openzeppelin/contracts/interfaces/IERC721.sol';
import '@openzeppelin/contracts/interfaces/IERC721Enumerable.sol';

/**
 * @dev Interface for Critter contract.
 */
interface ICritter is
    IAccessControlEnumerable,
    IERC165,
    IERC721,
    IERC721Enumerable
{
    /**
     * @dev Squeak consists of an account address & a content string (limit: 256 bytes).
     */
    struct Squeak {
        address account;
        string content;
    }

    /**
     * @dev Emitted when the `sender` address creates a Critter account with a `username`.
     */
    event AccountCreated(address indexed sender, string username);

    /**
     * @dev Emitted when the `sender` address creates a squeak with `content` and is assigned a `tokenID`.
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
     * @dev Emitted when the `sender` address updates their account and changes an `oldUsername` to a `newUsername`.
     */
    event UsernameUpdated(
        address indexed sender,
        string oldUsername,
        string newUsername
    );

    /**
     * @dev Create a Critter account.
     *
     * Requirements:
     *
     * - The caller must not have an account.
     * - Username must be valid (see {isValidUsername} modifier).
     *
     * Emits {AccountCreated} event.
     */
    function createAccount(string memory username) external returns (bool);

    /**
     * @dev Update your critter username.
     *
     * Requirements:
     *
     * - The caller must already have an account.
     * - The caller must have the `MINTER_ROLE`.
     * - Username must be valid (see {isValidUsername} modifier).
     *
     *
     * Emits {UsernameUpdated} event.
     */
    function updateUsername(string memory newUsername) external returns (bool);

    /**
     * @dev Create a squeak.
     *
     * Requirements:
     *
     * - The caller must already have an account.
     * - The caller must have the `MINTER_ROLE`.
     * - Squeak must be between 0 & 256 bytes.
     */
    function createSqueak(string memory content) external returns (bool);

    /**
     * @dev Deletes squeak at `tokenId`.
     *
     * Requirements:
     *
     * - The caller must already have an account.
     * - The caller must own `tokenId` or be an approved operator.
     *
     * Emits {SqueakDeleted} & {Transfer} events.
     */
    function deleteSqueak(uint256 tokenId) external returns (bool);

    /**
     * @dev Creates a new `tokenId` and transfers it to `to`.
     * Token URI generated & assigned automatically.
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeMint(address to, uint256 tokenId) external;

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC721Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - The caller must have the `PAUSER_ROLE`.
     */
    function pause() external;

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC721Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - The caller must have the `PAUSER_ROLE`.
     */
    function unpause() external;
}
