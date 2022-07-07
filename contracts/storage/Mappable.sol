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

import './Storeable.sol';

/**
 * @title Mappable
 * @dev A contract that only handles critter data mappings.
 * @notice Mappings do not fill storage slots in a linear fashion, but instead
 *      they store data in a location based on a hash of its key/value. This is
 *      a "good enough" collision avoidance gaurantee, and thus this contract
 *      can be appended to with newer mappings in later versions.
 */
contract Mappable is Storeable {
    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Mappable_init(
        uint256 platformFee,
        uint256 platformTakeRate,
        uint256 poolPayoutThreshold,
        uint256 scoutMaxLevel,
        uint256 scoutViralityBonus,
        uint256 viralityThreshold
    ) internal onlyInitializing {
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
