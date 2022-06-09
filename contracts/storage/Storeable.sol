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

// Contracts
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';
import './Immutable.sol';
import './Mappable.sol';
import './Typeable.sol';

/**
 * @title Storeable
 * @dev A contract to handle Critter storage variables.
 * @notice This is upgradeable by means of appending new variables below the
 *      existing ones in future contract versions. This will maintain storage
 *      mappings in the EVM as new features are added. More info on EVM storage
 *      collisions & upgradeability: https://tinyurl.com/d424mcpx
 */
contract Storeable is Typeable, Immutable, Mappable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Set of interactions
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
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Storeable_init(
        string calldata baseURI,
        uint256 fee,
        uint256 takeRate,
        uint256 poolThresh,
        uint8 viralityThresh
    ) internal onlyInitializing {
        baseTokenURI = baseURI;
        platformFee = fee;
        platformTakeRate = takeRate;
        poolThreshold = poolThresh;
        viralityThreshold = viralityThresh;
    }

    /**
     * @dev Token URL prefix used by squeaks.
     */
    string public baseTokenURI;

    /**
     * @dev Contract funds.
     * @notice Can only be withdrawn by TREASURER_ROLE.
     */
    uint256 public treasury;

    /**
     * @dev Fee amount in wei used for interactions on Critter.
     */
    uint256 public platformFee;

    /**
     * @dev A percentage to take from each interaction.
     */
    uint256 public platformTakeRate;

    /**
     * @dev Minimum amount required in wei for a scout pool to pay its members.
     */
    uint256 public poolThreshold;

    /**
     * @dev Minimum score that a squeak must have for it to be considered viral.
     */
    uint8 public viralityThreshold;

    /**
     * @dev Set of squeak ID's that have gone viral.
     */
    EnumerableSetUpgradeable.UintSet internal viralSqueaks;
}
