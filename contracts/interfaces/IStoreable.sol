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

import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol';

/**
 * @dev Set of statuses of a critter account.
 */
enum Status {
    Unknown,
    Active,
    Suspended,
    Banned
}

/**
 * @dev Set of Configuration keys for the contract.
 */
enum Configuration {
    DeleteRate,
    PlatformTakeRate,
    PoolPayoutThreshold,
    MaxLevel,
    ViralityBonus,
    ViralityThreshold
}

/**
 * @dev Set of interactions for a squeak.
 */
enum Interaction {
    Dislike,
    Like,
    Resqueak,
    UndoDislike,
    UndoLike,
    UndoResqueak
}

/**
 * @dev Set of relation actions a user can take upon another user.
 */
enum Relation {
    Block,
    Follow,
    Unblock,
    Unfollow
}

/**
 * @dev Interface for Storeable.
 * @notice This is where all the Critter data structures & enums are defined.
 */
interface IStoreable {
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
}
