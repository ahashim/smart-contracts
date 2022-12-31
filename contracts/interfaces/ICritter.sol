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

// errors
import '../Errors.sol';

// enums
import '../Enums.sol';

// libraries
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol';

/**
 * @dev Interface for the main Critter contract.
 */
interface ICritter {
    /**
     * @dev Pool tracks fund information for members of a viral squeak pool.
     * @param amount Total pool funds in wei.
     * @param shares Total number of shares.
     * @param blockNumber When the pool was created.
     * @param score Virality score of the associatd squeak.
     */
    struct Pool {
        uint256 amount;
        uint256 shares;
        uint256 blockNumber;
        uint64 score;
    }

    /**
     * @dev PoolInfo keeps a succint overview of a Pool.
     * @param amount Total pool funds in wei.
     * @param shares Total number of shares.
     * @param passCount Count of the pool passes belonging to the pool.
     * @param blockNumber When the pool was created.
     * @param score Virality score of the associatd squeak.
     */
    struct PoolInfo {
        uint256 amount;
        uint256 shares;
        uint256 passCount;
        uint256 blockNumber;
        uint64 score;
    }

    /**
     * @dev PoolPassInfo a pass that belongs to a Pool for a viral squeak.
     * @param account Address of the user.
     * @param shares Total number of shares.
     */
    struct PoolPassInfo {
        address account;
        uint256 shares;
    }

    /**
     * @dev Sentiment tracks the set of likers, dislikers, and resqueakers
     *      for a particular squeak.
     * @param dislikes AddressSet of dislikers.
     * @param likes AddressSet of likers.
     * @param resqueaks AddressSet of resqueakers.
     */
    struct Sentiment {
        EnumerableSetUpgradeable.AddressSet dislikes;
        EnumerableSetUpgradeable.AddressSet likes;
        EnumerableSetUpgradeable.AddressSet resqueaks;
    }

    /**
     * @dev SentimentCounts is used to return the number of likes,
     *      dislikes, and resqueaks for a particular token.
     * @param dislikes Number of dislikers.
     * @param likes Number of likers.
     * @param resqueaks Number of resqueakers.
     */
    struct SentimentCounts {
        uint256 dislikes;
        uint256 likes;
        uint256 resqueaks;
    }

    /**
     * @dev Squeak is the primary Critter message.
     * @param blockNumber Block in which the squeak was created.
     * @param author Address of the original author of the squeak.
     * @param owner Address of the current owner of the squeak.
     * @param content Message content of the squeak.
     */
    struct Squeak {
        uint256 blockNumber;
        address author;
        address owner;
        bytes content;
    }

    /**
     * @dev User is a registered Critter account.
     * @param account Address of the account.
     * @param status A value from the Status enum.
     * @param level The level a user has achieved based on their squeak and
     *        interaction history.
     * @param username The accounts username.
     */
    struct User {
        address account;
        Status status;
        uint256 level;
        string username;
    }

    /**
     * @dev Emitted after creating an account.
     * @param account Address of the account.
     * @param username Username of the account.
     */
    event AccountCreated(address indexed account, bytes32 indexed username);

    /**
     * @dev Emitted when the fee for a viral squeak is added to its pool.
     * @param tokenId ID of the viral squeak.
     * @param amount Amount of the funds in wei.
     */
    event FundsAddedToPool(uint256 tokenId, uint256 amount);

    /**
     * @dev Emitted when funds are deposited into the treasury.
     * @param amount Amount of the funds in wei.
     */
    event FundsDeposited(uint256 amount);

    /**
     * @dev Emitted when funds are transferred to an account.
     * @param to Address of the account.
     * @param amount Amount of the funds in wei.
     */
    event FundsTransferred(address indexed to, uint256 amount);

    /**
     * @dev Emitted when funds are withdrawn from the treasury to an account.
     * @param to Address of the account.
     * @param amount Amount of the funds in wei.
     */
    event FundsWithdrawn(address indexed to, uint256 amount);

    /**
     * @dev Emitted when the fee for an interaction is updated.
     * @param interaction A value from the Interaction enum.
     * @param amount Amount of the new fee in wei.
     */
    event InteractionFeeUpdated(Interaction interaction, uint256 amount);

    /**
     * @dev Emitted when funds in a pool are paid out to its members.
     * @param tokenId ID of the viral squeak.
     */
    event Dividend(uint256 tokenId);

    /**
     * @dev Emitted when funds in a pool are paid out to its members.
     * @param tokenId ID of the viral squeak.
     * @param account Address of the user it belongs to.
     * @param shares Amount of pool shares belonging to the user.
     */
    event PoolPassCreated(uint256 tokenId, address account, uint256 shares);

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
     * @param content Content of the squeak.
     * @param tokenId ID of the squeak.
     */
    event SqueakCreated(
        address indexed author,
        bytes32 indexed content,
        uint256 tokenId
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
     * @dev Creates a Critter account.
     * @param username Username for the account.
     */
    function createAccount(string calldata username) external;

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
     * @dev Gets the price of deleting a squeak.
     * @param tokenId ID of the squeak to delete.
     * @return Price of deleting the squeak in wei.
     * @notice The token must exist.
     */
    function getDeleteFee(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Gets the pool amount & number of shares.
     * @param tokenId ID of the viral squeak.
     * @return A {PoolInfo}.
     */
    function getPoolInfo(
        uint256 tokenId
    ) external view returns (PoolInfo memory);

    /**
     * @dev Gets a list of pool passes for a viral squeak.
     * @param tokenId ID of the viral squeak.
     * @return Array of {PoolPass}'s.
     */
    function getPoolPasses(
        uint256 tokenId
    ) external view returns (PoolPassInfo[] memory);

    /**
     * @dev Gets a count of each Sentiment item for a squeak.
     * @param tokenId ID of the squeak.
     * @return {SentimentCounts}
     */
    function getSentimentCounts(
        uint256 tokenId
    ) external view returns (SentimentCounts memory);

    /**
     * @dev Gets the virality score of a squeak.
     * @param tokenId ID of the squeak.
     * @return A value between 0-100 representing the virality of the squeak.
     * @notice The token must exist.
     */
    function getViralityScore(uint256 tokenId) external view returns (uint64);

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
     * @dev Upgradeable "constructor" function.
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
     * @dev Gets the virality status of a squeak.
     * @param tokenId ID of the squeak.
     * @return A boolean representing the virality status.
     * @notice The token must exist.
     */
    function isViral(uint256 tokenId) external view returns (bool);

    /**
     * @dev Removes the sender from a pool they belong to.
     * @param tokenId ID of the viral squeak associated with the pool.
     * @notice Sender must be a member of the pool.
     */
    function leavePool(uint256 tokenId) external;

    /**
     * @dev See {IERC721AUpgradeable-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) external view returns (bool);

    /**
     * @dev Updates an interaction fee.
     * @param interaction A value from the Interaction enum.
     * @param amount Value of the updated fee in wei.
     * @notice Only callable by TREASURER_ROLE.
     */
    function updateInteractionFee(
        Interaction interaction,
        uint256 amount
    ) external;

    /**
     * @dev Updates the relationship between the sender and another account.
     * @param account Address of the account to update relationship with.
     * @param action A value from the Relations enum.
     */
    function updateRelationship(address account, Relation action) external;

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

    /**
     * @dev Transfers out funds from the treasury.
     * @param to Address of the account where the funds will go.
     * @param amount Amount to withdraw in wei.
     * @notice Only callable by TREASURER_ROLE.
     */
    function withdraw(address to, uint256 amount) external payable;
}
