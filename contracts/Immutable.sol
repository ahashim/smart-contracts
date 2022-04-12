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

// contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @dev A contract holding all of the Critter constant state variables.
 */
contract Immutable is Initializable {
    /**
     * @dev Initializer function
     */
    function __Immutable_init() internal view onlyInitializing {}

    /**
     * @dev MINTER_ROLE has priviledges to mint tokens.
     */
    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

    /**
     * @dev PAUSER_ROLE has priviledges to pause the contract.
     */
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

    /**
     * @dev UPGRADER_ROLE has priviledges to upgrade the contract.
     */
    bytes32 public constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');
}
