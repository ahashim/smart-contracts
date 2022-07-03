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

// 3rd party contracts
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol';

// critter contracts
import './Enumerable.sol';

/**
 * @title Typeable
 * @dev A contract that handles critter data structures.
 */
contract Typeable is Enumerable {
    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Typeable_init() internal view onlyInitializing {}

    /**
     * @dev ScoutPool tracks fund information for scouts of a viral squeak.
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
        string content;
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

    /**
     * @dev UserInteraction tracks the set of tokens that a user has interacted
     *      with, grouped by interaction type.
     * @param disliked Set of token ID's they disliked.
     * @param liked Set of token ID's they liked.
     * @param resqueaked Set of token ID's they resqueaked.
     * @param scouted Set of token ID's the user scouted by interacting with,
     *      which then went on to go viral.
     */
    struct UserInteraction {
        EnumerableSetUpgradeable.UintSet disliked;
        EnumerableSetUpgradeable.UintSet liked;
        EnumerableSetUpgradeable.UintSet resqueaked;
        EnumerableSetUpgradeable.UintSet scouted;
    }
}
