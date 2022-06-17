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
import 'hardhat/console.sol';

// critter contracts
import './Validateable.sol';

/**
 * @title Scoutable
 * @dev A contract to handle scout logic.
 */
contract Scoutable is Validateable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Scoutable_init() internal view onlyInitializing {}

    /**
     * @dev Gets the details of a scout pool.
     * @param tokenId ID of the viral squeak.
     * @return a ScoutPool.
     */
    function getScoutPool(uint256 tokenId)
        external
        view
        returns (ScoutPool memory)
    {
        return scoutPools[tokenId];
    }

    /**
     * @dev Gets a list of scouts for a viral squeak.
     * @param tokenId ID of the viral squeak.
     * @return a list of account addresses representing scouts.
     */
    function getScouts(uint256 tokenId)
        external
        view
        returns (address[] memory)
    {
        return scouts[tokenId].values();
    }

    /**
     * @dev Updates the scout level for an account, and adds them to the scout
     *      pool of a viral squeak.
     * @param account Account to add to scouts list for tokenId.
     * @param tokenId ID of the viral squeak.
     */
    function _addScout(address account, uint256 tokenId) internal {
        // upgrade their scout level
        _increaseScoutLevel(account, 1);

        // add them to the scout pool for the squeak
        scouts[tokenId].add(account);
    }

    /**
     * @dev Increases a scouts level until they hit the maximum.
     * @param account Address of the account to modify.
     * @param amount Number of levels to increase by.
     */
    function _increaseScoutLevel(address account, uint256 amount) internal {
        User storage user = users[account];
        uint256 newLevel = user.scoutLevel + amount;

        if (newLevel < scoutMaxLevel) {
            user.scoutLevel = newLevel;
        } else if (user.scoutLevel < scoutMaxLevel) {
            user.scoutLevel = scoutMaxLevel;
        }
    }
}
