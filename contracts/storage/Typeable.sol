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

// contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title Typeable
 * @dev A contract that only handles custom data structures (types) & enums.
 */
contract Typeable is Initializable {
    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Typeable_init() internal view onlyInitializing {}

    /**
     * @dev Set of interactions
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
     * @dev ScoutPool tracks fund information for scouts of a viral squeak.
     * @param amount Total pool funds in wei.
     * @param shares Sum of the number of levels of each scout in the pool.
     */
    struct ScoutPool {
        uint256 amount;
        uint256 shares;
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
     * @dev User is a registered Critter account.
     * @param account Address of the account.
     * @param scoutLevel Level of "scout" the user has achieved based on their
            squeak and interaction history.
     * @param username The accounts username.
     */
    struct User {
        address account;
        uint256 scoutLevel;
        string username;
    }
}
