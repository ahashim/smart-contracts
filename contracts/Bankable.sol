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
import './storage/Storeable.sol';

/**
 * @dev A contract to interact with the Critter treasury.
 */
contract Bankable is Initializable, Storeable {
    /**
     * @dev Initializer function
     */
    function __Bankable_init() internal view onlyInitializing {}

    /**
     * @dev deposit `value` amount of ether into the treasury for `_address`
     * account.
     */
    function _deposit(address _address, uint256 value) internal {
        require(value > 0, 'Critter: invalid amount');

        _credit(_address, value);
    }

    function _credit(address _address, uint256 value) private {
        // disable bounds check to save gas
        unchecked {
            treasury[_address] += value;
        }
    }
}
