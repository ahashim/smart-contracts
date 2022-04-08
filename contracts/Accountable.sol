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
import './Validatable.sol';

/**
 * @dev A contract dealing with Critter account management.
 */
contract Accountable is
    Initializable,
    AccessControlEnumerableUpgradeable,
    Validatable
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
    function _createAccount(string memory username)
        internal
        noAccount(msg.sender)
        isValidUsername(username)
    {
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
    function _updateUsername(string memory newUsername)
        internal
        hasAccount(msg.sender)
        isValidUsername(newUsername)
    {
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
