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

import './storage/IStoreable.sol';

/**
 * @dev Interface for the main Critter contract.
 */
interface ICritter is IStoreable {
    /**
     * @dev Upgradeable "constructor" function to initialize sub-contracts.
     * @param name Contract name (Critter).
     * @param symbol Contract symbol (CRTTR).
     * @param baseURI Prefix for all token URI's (https://critter.fyi/token).
     * @param platformFee Default amount in wei to charge per interaction.
     * @param takeRate Percentage of `fee` deposited into the treasury.
     * @param poolThreshold Minimum amount of wei required to pay out a scout pool.
     * @param viralThreshold Minimum score that a squeak must have for virality.
     * @param scoutBonus Number of levels a scout jumps when they cause a squeak to go viral.
     * @param maxLevel Upper limit on scout level.
     */
    function initialize(
        string calldata name,
        string calldata symbol,
        string calldata baseURI,
        uint256 platformFee,
        uint256 takeRate,
        uint256 poolThreshold,
        uint256 viralThreshold,
        uint256 scoutBonus,
        uint256 maxLevel
    ) external;

    /**
     * @dev Gets a contract Configuration value.
     * @return Configuration value amount.
     */
    function getConfiguration(Configuration configuration)
        external
        returns (uint256);

    /**
     * @dev Pauses the contract.
     */
    function pause() external;

    /**
     * @dev Unpauses the contract.
     */
    function unpause() external;

    /**
     * @dev Unpauses the contract.
     */
    function updateConfiguration(Configuration configuration, uint256 amount)
        external;
}
