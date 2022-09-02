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

import './IStoreable.sol';

/**
 * @dev Interface for the main Critter contract.
 */
interface ICritter is IStoreable {
    /**
     * @dev Upgradeable "constructor" function to initialize sub-contracts.
     * @param name Contract name.
     * @param symbol Contract symbol.
     * @param baseURI Prefix for all token URI's.
     * @param platformFee Default amount in wei to charge per interaction.
     * @param takeRate Percentage of the interactio fee deposited into the
     *      treasury.
     * @param poolThreshold Minimum amount required to pay out a scout pool.
     * @param viralThreshold Minimum score that a squeak must have to achieve
     *      virality.
     * @param scoutBonus Number of levels a scout increases when they propel a
     *      squeak to virality.
     * @param maxLevel The maximum scout level a user can reach.
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
     * @dev Updates the value of a {Configuration} item.
     * @notice Only callable by ADMIN_ROLE.
     */
    function updateConfiguration(Configuration configuration, uint256 amount)
        external;
}
