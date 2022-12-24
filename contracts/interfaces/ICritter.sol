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

import './IStoreable.sol';

/**
 * @dev Interface for the main Critter contract.
 */
interface ICritter is IStoreable {
    /**
     * @dev Emitted after creating an account.
     * @param account Address of the account.
     * @param username Username of the account.
     */
    event AccountCreated(address indexed account, bytes32 indexed username);

    /**
     * @dev Emitted after updating a relationship.
     * @param sender Address of the sender.
     * @param relative Address of the account to update relationship with.
     * @param action A value from the Relations enum.
     */
    event RelationshipUpdated(
        address sender,
        address relative,
        Relation action
    );

    /**
     * @dev Emitted after updating an account status.
     * @param account Address of the account.
     * @param status A value from the Status enum.
     */
    event StatusUpdated(address account, Status status);

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
     * @dev Emitted after deleting a squeak.
     * @param tokenId ID of the squeak.
     * @param deletedBy Account that deleted the squeak.
     */
    event SqueakDeleted(uint256 tokenId, address deletedBy);

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
     * @dev Emitted after updating an accounts username.
     * @param account Address of the account.
     * @param newUsername Updated username.
     */
    event UsernameUpdated(address account, string newUsername);

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
    function getSentimentCounts(
        uint256 tokenId
    ) external view returns (SentimentCounts memory);

    /**
     * @dev Interacts with a squeak.
     * @param tokenId ID of the squeak.
     * @param interaction An {Interaction} value.
     */
    function interact(
        uint256 tokenId,
        Interaction interaction
    ) external payable;

    /**
     * @dev Upgradeable "constructor" function to initialize sub-contracts.
     * @param dividendThreshold Minimum amount required to pay out pool
     *      dividends.
     * @param maxLevel The maximum level a user can reach.
     * @param viralThreshold Minimum score that a squeak must have to achieve
     *      virality.
     */
    function initialize(
        uint256 dividendThreshold,
        uint256 maxLevel,
        uint256 viralThreshold
    ) external;

    /**
     * @dev Checks whether user one has blocked user two.
     * @param userOne Address of user one.
     * @param userTwo Address of user two.
     */
    function isBlocked(
        address userOne,
        address userTwo
    ) external view returns (bool);

    /**
     * @dev Checks whether user one is following user two.
     * @param userOne Address of user one.
     * @param userTwo Address of user two.
     */
    function isFollowing(
        address userOne,
        address userTwo
    ) external view returns (bool);

    /**
     * @dev Updates the relationship between the sender and another account.
     * @param account Address of the account to update relationship with.
     * @param action A value from the Relations enum.
     */
    function updateRelationship(address account, Relation action) external;

    /**
     * @dev Creates a Critter account.
     * @param username Username for the account.
     */
    function createAccount(string calldata username) external;

    /**
     * @dev Updates an accounts status.
     * @param account Address of the account.
     * @param status A value from the Status enum.
     * @notice can only be called by MODERATOR_ROLE.
     */
    function updateStatus(address account, Status status) external;

    /**
     * @dev Updates an accounts username.
     * @param newUsername The new username.
     */
    function updateUsername(string calldata newUsername) external;

    /**
     * @dev Updates the value of a {Configuration} item.
     * @notice Only callable by ADMIN_ROLE.
     */
    function updateConfiguration(
        Configuration configuration,
        uint256 amount
    ) external;
}
