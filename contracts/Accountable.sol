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

// Contracts
import '@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import './storage/Storeable.sol';

/**
 * @dev A contract dealing with Critter account management.
 */
contract Accountable is
    Initializable,
    AccessControlEnumerableUpgradeable,
    Storeable
{
    /**
     * @dev Emitted when the `sender` address creates a Critter account with a
     *      `username`.
     */
    event AccountCreated(address indexed sender, string username);

    /**
     * @dev Emitted when the `sender` address updates their account and changes
     *      an `oldUsername` to a `newUsername`.
     */
    event UsernameUpdated(
        address indexed sender,
        string oldUsername,
        string newUsername
    );

    /**
     * @dev Ensures that `_address` has a Critter account.
     */
    modifier hasAccount(address _address) {
        require(
            bytes(usernames[_address]).length > 0,
            'Critter: address does not have an account'
        );
        _;
    }

    /**
     * @dev Ensures that `_address` does not have a Critter account.
     */
    modifier noAccount(address _address) {
        require(
            bytes(usernames[msg.sender]).length == 0,
            'Critter: account already exists'
        );
        _;
    }

    /**
     * @dev Ensures that `username` satisfies the following requirements:
     *
     *      - Greater than 0 bytes (cannot be empty).
     *      - Less than 32 bytes (upper bound for storage slot optimization).
     *      - Is not already in use.
     */
    modifier isValidUsername(string memory username) {
        require(
            bytes(username).length > 0,
            'Critter: username cannot be empty'
        );
        require(bytes(username).length <= 32, 'Critter: username is too long');
        require(addresses[username] == address(0), 'Critter: username taken');
        _;
    }

    /**
     * @dev Initializer function
     */
    function __Accountable_init() internal onlyInitializing {
        // grant all roles to contract owner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /**
     * @dev See {IAccounts-createAccount}.
     */
    function _createAccount(string memory username) internal {
        // set our address & username mappings
        addresses[username] = msg.sender;
        usernames[msg.sender] = username;

        // bypassing the admin-check to grant roles in order to automatically
        // initialize users when they create an account.
        _grantRole(MINTER_ROLE, msg.sender);

        // log account creation
        emit AccountCreated(msg.sender, username);
    }

    /**
     * @dev See {IAccounts-updateUsername}.
     */
    function _updateUsername(string memory newUsername) internal {
        // clear current username from the addresses mapping
        string memory oldUsername = usernames[msg.sender];
        delete addresses[oldUsername];

        // set new usernames & address mappings
        addresses[newUsername] = msg.sender;
        usernames[msg.sender] = newUsername;

        // log the change
        emit UsernameUpdated(msg.sender, oldUsername, newUsername);
    }
}