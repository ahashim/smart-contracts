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
     * @param dividendThreshold Minimum amount required to pay out pool
     *      dividends.
     * @param maxLevel The maximum level a user can reach.
     * @param viralThreshold Minimum score that a squeak must have to achieve
     *      virality.
     */
    function initialize(
        uint256 dividendThreshold,
        uint256 maxLevel,
        uint256 viralThreshold
    ) external;

    /**
     * @dev Updates the value of a {Configuration} item.
     * @notice Only callable by ADMIN_ROLE.
     */
    function updateConfiguration(
        Configuration configuration,
        uint256 amount
    ) external;
}
