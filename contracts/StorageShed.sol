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

import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';

/**
 * @dev StorageShed is where all storage variables for Critter are held.
 */
contract StorageShed {
    /// ---------------- CONSTANTS ---------------- ///

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

    /// ---------------- STRUCTS ---------------- ///

    /**
     * @dev Squeak consists of an account address & a content string (256 bytes
     *      limit).
     */
    struct Squeak {
        address account;
        // uint blockNumber;
        string content;
    }

    /// ---------------- STATE VARIABLES ---------------- ///

    /**
     * @dev Used to autogenerate token URI's when minting.
     */
    string public _baseTokenURI;

    /**
     * @dev A counter keeps track of token ID's instead of {balanceOf} due to
     *      token burning.
     */
    CountersUpgradeable.Counter public _tokenIdCounter;

    /// ----------------  MAPPINGS ---------------- ///

    /**
     * @dev Mapping of tokenId's to Squeaks.
     */
    mapping(uint256 => Squeak) public squeaks;

    /**
     * @dev Mapping of usernames => account addresses.
     */
    mapping(string => address) public addresses;

    /**
     * @dev Mapping of account addresses => usernames.
     */
    mapping(address => string) public usernames;
}
