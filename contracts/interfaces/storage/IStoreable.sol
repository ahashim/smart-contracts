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
enum AccountStatus {
    NonExistent,
    Active,
    Suspended,
    Banned
}

/**
 * @dev Set of Configuration keys for the contract.
 */
enum Configuration {
    PlatformTakeRate,
    PoolPayoutThreshold,
    ScoutMaxLevel,
    ScoutViralityBonus,
    ViralityThreshold
}

/**
 * @dev Set of interactions for a squeak.
 */
enum Interaction {
    Delete,
    Dislike,
    Like,
    Resqueak,
    UndoDislike,
    UndoLike,
    UndoResqueak
}

/**
 * @dev Set of interactions for a squeak.
 */
enum Relations {
    Block, // TODO: implement blocking accounts
    Follow,
    Unfollow
}

/**
 * @dev Interface for Storeable.
 * @notice This is where all the Critter data structures & enums are defined.
 */
interface IStoreable {
    /**
     * @dev Relationship tracks follower & following addresses for a user.
     * @param following Addresses of accounts the user is following.
     * @param followers Addresses of accounts that are following the user.
     */
    struct Relationship {
        EnumerableSetUpgradeable.AddressSet following;
        EnumerableSetUpgradeable.AddressSet followers;
    }

    /**
     * @dev RelationshipCounts is used to return the number of relationships a
     *      user has.
     * @param followers Number of followers for the user.
     * @param following Number of accounts the user is following.
     */
    struct RelationshipCounts {
        uint256 followers;
        uint256 following;
    }

    /**
     * @dev Scout a user that belongs to a ScoutPool for a viral squeak.
     * @param account Address of the user.
     * @param shares Total number of shares.
     */
    struct Scout {
        address account;
        uint256 shares;
    }

    /**
     * @dev ScoutPool tracks detailed fund & member information for scouts of
     *      a viral squeak.
     * @param amount Total pool funds in wei.
     * @param shares Total number of shares.
     * @param members Enumerable map of addresses <=> share amount.
     */
    struct ScoutPool {
        uint256 amount;
        uint256 shares;
        EnumerableMapUpgradeable.AddressToUintMap members;
    }

    /**
     * @dev ScoutPoolInfo keeps a succint overview of a ScoutPool.
     * @param amount Total pool funds in wei.
     * @param shares Total number of shares.
     * @param memberCount Count of the members in the share.
     */
    struct ScoutPoolInfo {
        uint256 amount;
        uint256 shares;
        uint256 memberCount;
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
     * @param status A value from the AccountStatus enum.
     * @param scoutLevel Level of "scout" the user has achieved based on their
     *       squeak and interaction history.
     * @param username The accounts username.
     */
    struct User {
        address account;
        AccountStatus status;
        uint256 scoutLevel;
        string username;
    }
}
