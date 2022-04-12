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
 * @dev A contract holding all of the custom Critter data structure types.
 */
contract Typeable is Initializable {
    /**
     * @dev Initializer function
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Typeable_init() internal view onlyInitializing {}

    /**
     * @dev Squeak consists of an account address & a content string (256 bytes
     *      limit).
     */
    struct Squeak {
        address account;
        // uint blockNumber;
        string content;
    }
}
