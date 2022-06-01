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

/**
 * @dev Interface for `Critter` contract.
 */
interface ICritter is IERC165Upgradeable, IERC721Upgradeable {
    /**
     * @dev Create a Critter account. Emits an {AccountCreated} event.
     * @param username The username to register for the account
     *
     * @notice Requirements:
     *  - The caller must not have an account
     *  - Username must be valid (see {isValidUsername} modifier)
     */
    function createAccount(string memory username) external;

    /**
     * @dev Create a squeak. Emits a {SqueakCreated} event.
     * @param content Text content of the squeak.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The caller must have the `MINTER_ROLE`.
     *  - Squeak must be between 0 & 256 bytes.
     */
    function createSqueak(string memory content) external;

    /**
     * @dev Deletes squeak at `tokenId`. Emits both {SqueakDeleted} & {Transfer}
     * events.
     * @param tokenId ID of the token (squeak) to be deleted.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The caller must own `tokenId` or be an approved operator.
     *  - The transaction has enough funds to cover the delete fee.
     */
    function deleteSqueak(uint256 tokenId) external payable;

    /**
     * @dev Dislikes squeak at `tokenId`. Emits a {SqueakDisliked} event.
     * @param tokenId ID of the token (squeak) to dislike.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The transaction has enough funds to cover the platformFee.
     *  - The tokenId must exist.
     */
    function dislikeSqueak(uint256 tokenId) external payable;

    /**
     * @dev Returns the fee amount in wei to delete a squeak at `tokenId`.
     * @param tokenId ID of the squeak to delete.
     * @param blockConfirmationThreshold The amount of blocks to pad the fee
     * calculation with in order to correctly estimate a price for the block in
     * which the actual delete transaction occurs.
     *
     * @notice Requirements:
     *  - The token must exist.
     */
    function getDeleteFee(uint256 tokenId, uint256 blockConfirmationThreshold)
        external
        view
        returns (uint256);

    /**
     * @dev Returns the number of likes for `tokenId`.
     * @param tokenId ID of the squeak to get the like count of.
     * @notice Requirements:
     *  - The token must exist.
     */
    function getLikeCount(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Returns the number of dislikes for `tokenId`.
     * @param tokenId ID of the squeak to get the dislike count of.
     * @notice Requirements:
     *  - The token must exist.
     */
    function getDislikeCount(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Returns the number of resqueaks for `tokenId`.
     * @param tokenId ID of the squeak to get the resqueak count of.
     * @notice Requirements:
     *  - The token must exist.
     */
    function getResqueakCount(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Returns the virality score for `tokenId`.
     * @param tokenId ID of the squeak to get the virality score of.
     * @return A value between 0-100 representing the virality of the squeak.
     * @notice Requirements:
     *  - The token must exist.
     */
    function getViralityScore(uint256 tokenId) external view returns (uint64);

    /**
     * @dev Likes a squeak at `tokenId`, and pays platformFee to squeak
     * owner. It emits a {SqueakLiked} event.
     * @param tokenId ID of the squeak to like.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The transaction has enough funds to cover the platformFee.
     *  - The squeak at `tokenId` must exist.
     */
    function likeSqueak(uint256 tokenId) external payable;

    /**
     * @dev Reposts a squeak at `tokenId`, and pays platformFee to squeak
     * owner. It emits a {Resqueaked} event.
     * @param tokenId ID of the token (squeak) to resqueak.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The transaction has enough funds to cover the platformFee.
     *  - The squeak at `tokenId` must exist.
     */
    function resqueak(uint256 tokenId) external payable;

    /**
     * @dev Update an accounts critter username. Emits a {UsernameUpdated}
     * event.
     * @param username A new username for the account.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The caller must have the `MINTER_ROLE`.
     *  - Username must be valid (see {isValidUsername} modifier).
     *
     */
    function updateUsername(string memory username) external;

    /**
     * @dev Undoes the disliking of a squeak at `tokenId`.
     * @param tokenId ID of the squeak which was disliked.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The transaction has enough funds to cover the platformFee.
     *  - The squeak at `tokenId` must exist.
     *  - The caller must have disliked the squeak at `tokenId`.
     */
    function undoDislikeSqueak(uint256 tokenId) external payable;

    /**
     * @dev Undoes the liking of a squeak at `tokenId`.
     * @param tokenId ID of the squeak which was liked.
     *
     * @notice Requirements:
     *  - The caller must already have an account.
     *  - The transaction has enough funds to cover the platformFee.
     *  - The squeak at `tokenId` must exist.
     *  - The caller must have liked the squeak at `tokenId`.
     */
    function undoLikeSqueak(uint256 tokenId) external payable;

    /**
     * @dev Undoes a resqueak of `tokenId`.
     * @param tokenId ID of the squeak which was resqueaked.
     *
     * @notice Requirements:
     *  - The caller must have resqueaked the squeak at `tokenId`.
     *  - The transaction has enough funds to cover the platformFee.
     *  - The caller must already have an account.
     *  - The squeak at `tokenId` must exist.
     */
    function undoResqueak(uint256 tokenId) external payable;

    /**
     * @dev Pauses all token transfers. See {ERC721PausableUpgradeable} and
     * {PausableUpgradeable-_pause}.
     *
     * @notice Requirements:
     *  - The caller must have the `PAUSER_ROLE`.
     */
    function pause() external;

    /**
     * @dev Unpauses all token transfers. See {ERC721PausableUpgradeable} and
     * {PausableUpgradeable-_unpause}.
     *
     * @notice Requirements:
     *  - The caller must have the `PAUSER_ROLE`.
     */
    function unpause() external;

    /**
     * @dev Withdraws funds in `amount` from the treasury, and transfers to the
     * `to` address.
     * @param to Address of account to withdraw to.
     * @param amount Amount in wei to withdraw.
     *
     * @notice Requirements:
     *  - The caller must have the `TREASURER_ROLE`.
     *  - Treasury value must be greater than or equal to `amount`.
     */
    function withdraw(address to, uint256 amount) external payable;
}
