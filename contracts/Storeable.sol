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

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './interfaces/IStoreable.sol';

/**
 * @title Storeable
 * @dev A contract to handle critter storage variables.
 * @notice This is upgradeable by means of appending new variables below the
 *      existing ones in future contract versions. This will maintain storage
 *      mappings in the EVM as new features are added. More info on EVM storage
 *      collisions & upgradeability: https://tinyurl.com/d424mcpx
 */
contract Storeable is Initializable, IStoreable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Storeable_init(
        uint256 poolPayoutThreshold,
        uint256 maxLevel,
        uint256 viralityThreshold
    ) internal onlyInitializing {
        // base platform fee in wei
        uint256 platformFee = 80000000000000;

        // set contract base url
        baseTokenURI = 'https://critter.fyi/token/';

        // set contract config values
        config[Configuration.DeleteRate] = platformFee;
        config[Configuration.PlatformTakeRate] = 10; // percent of platform fee
        config[Configuration.MaxLevel] = maxLevel;
        config[Configuration.PoolPayoutThreshold] = poolPayoutThreshold;
        config[Configuration.ViralityBonus] = 3; // levels
        config[Configuration.ViralityThreshold] = viralityThreshold;

        // set default interaction fees
        fees[Interaction.Dislike] = platformFee;
        fees[Interaction.Like] = platformFee;
        fees[Interaction.Resqueak] = platformFee;
        fees[Interaction.UndoDislike] = platformFee;
        fees[Interaction.UndoLike] = platformFee;
        fees[Interaction.UndoResqueak] = platformFee;
    }

    /**
     * @dev MINTER_ROLE has priviledges to mint tokens.
     */
    bytes32 internal constant MINTER_ROLE = keccak256('MINTER_ROLE');

    /**
     * @dev MODERATOR_ROLE has priviledges to update a users account status.
     */
    bytes32 internal constant MODERATOR_ROLE = keccak256('MODERATOR_ROLE');

    /**
     * @dev OPERATOR_ROLE has priviledges to update the contract configuration
     * values.
     */
    bytes32 internal constant OPERATOR_ROLE = keccak256('OPERATOR_ROLE');

    /**
     * @dev TREASURER_ROLE has priviledges to withdraw funds and update fees.
     */
    bytes32 internal constant TREASURER_ROLE = keccak256('TREASURER_ROLE');

    /**
     * @dev UPGRADER_ROLE has priviledges to upgrade the contract.
     */
    bytes32 internal constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');

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
     * @dev Mapping of address <=> AddressSet of blocked addresses for an user.
     */
    mapping(address => EnumerableSetUpgradeable.AddressSet) internal blocked;

    /**
     * @dev Mapping of address <=> AddressSet of followers for an user.
     */
    mapping(address => EnumerableSetUpgradeable.AddressSet) internal followers;

    /**
     * @dev Mapping of tokenId <=> Pool.
     */
    mapping(uint256 => Pool) internal pools;

    /**
     * @dev Mapping of tokenId <=> (address <=> shares).
     */
    mapping(uint256 => EnumerableMapUpgradeable.AddressToUintMap)
        internal poolPasses;

    /**
     * @dev Mapping of tokenId <=> Sentiment.
     */
    mapping(uint256 => Sentiment) internal sentiments;

    /**
     * @dev Set of squeak ID's that have gone viral.
     */
    EnumerableSetUpgradeable.UintSet internal viralSqueaks;
}
