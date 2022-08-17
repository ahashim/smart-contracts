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

import './Immutable.sol';
import '../interfaces/storage/IStoreable.sol';

/**
 * @title Storeable
 * @dev A contract to handle critter storage variables.
 * @notice This is upgradeable by means of appending new variables below the
 *      existing ones in future contract versions. This will maintain storage
 *      mappings in the EVM as new features are added. More info on EVM storage
 *      collisions & upgradeability: https://tinyurl.com/d424mcpx
 */
contract Storeable is Immutable, IStoreable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Storeable_init(
        string calldata baseURI,
        uint256 platformFee,
        uint256 platformTakeRate,
        uint256 poolPayoutThreshold,
        uint256 scoutMaxLevel,
        uint256 scoutViralityBonus,
        uint256 viralityThreshold
    ) internal onlyInitializing {
        baseTokenURI = baseURI;

        // set contract config values
        config[Configuration.PlatformTakeRate] = platformTakeRate;
        config[Configuration.ScoutMaxLevel] = scoutMaxLevel;
        config[Configuration.PoolPayoutThreshold] = poolPayoutThreshold;
        config[Configuration.ScoutViralityBonus] = scoutViralityBonus;
        config[Configuration.ViralityThreshold] = viralityThreshold;

        // set default interaction fees
        fees[Interaction.Delete] = platformFee;
        fees[Interaction.Dislike] = platformFee;
        fees[Interaction.Like] = platformFee;
        fees[Interaction.Resqueak] = platformFee;
        fees[Interaction.UndoDislike] = platformFee;
        fees[Interaction.UndoLike] = platformFee;
        fees[Interaction.UndoResqueak] = platformFee;
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
     * @dev Set of squeak ID's that have gone viral.
     */
    EnumerableSetUpgradeable.UintSet internal viralSqueaks;

    /**
     * @dev Mapping of username <=> account address.
     */
    mapping(string => address) public addresses;

    /**
     * @dev Mapping of a contract Configuration key <=> its amount value.
     */
    mapping(Configuration => uint256) public config;

    /**
     * @dev Mapping of Interaction <=> fee amounts.
     */
    mapping(Interaction => uint256) public fees;

    /**
     * @dev Mapping of tokenId <=> Squeak.
     */
    mapping(uint256 => Squeak) public squeaks;

    /**
     * @dev Mapping of account address <=> User.
     */
    mapping(address => User) public users;

    /**
     * @dev Mapping of tokenId <=> ScoutPool.
     */
    mapping(uint256 => ScoutPool) internal pools;

    /**
     * @dev Mapping of tokenId <=> Sentiment.
     */
    mapping(uint256 => Sentiment) internal sentiments;
}
