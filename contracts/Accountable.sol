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

// 3rd-party contracts
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';

// critter contracts
import './Validateable.sol';

// error codes
error AccountAlreadyExists(address account);

/**
 * @title Accountable
 * @dev A contract to handle account management.
 */
contract Accountable is PausableUpgradeable, Validateable {
    /**
     * @dev Emitted after creating an account.
     * @param account Address of the account.
     * @param username Username of the account.
     */
    event AccountCreated(address indexed account, string username);

    /**
     * @dev Emitted after updating an accounts username.
     * @param account Address of the account.
     * @param oldUsername Previous username.
     * @param newUsername Next username.
     */
    event UsernameUpdated(
        address indexed account,
        string oldUsername,
        string newUsername
    );

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Accountable_init() internal onlyInitializing {
        // grant all roles to contract owner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /**
     * @dev Creates a Critter account.
     * @param username Username for the account.
     */
    function createAccount(string calldata username)
        external
        whenNotPaused
        isValidUsername(username)
    {
        // ensure address has not already created an account
        if (bytes(users[msg.sender].username).length > 0) {
            revert AccountAlreadyExists({account: msg.sender});
        }

        // create a User for the address
        users[msg.sender] = User(msg.sender, 1, username);

        // set username <-> address mapping
        addresses[username] = msg.sender;

        // bypassing the admin-check on grantRole so each user can mint squeaks
        _grantRole(MINTER_ROLE, msg.sender);

        emit AccountCreated(msg.sender, username);
    }

    /**
     * @dev Updates an accounts username.
     * @param newUsername The text of the new username.
     */
    function updateUsername(string calldata newUsername)
        external
        whenNotPaused
        hasAccount
        isValidUsername(newUsername)
    {
        // clear the current username
        User storage user = users[msg.sender];
        string memory oldUsername = user.username;
        delete addresses[oldUsername];

        // set the new username
        user.username = newUsername;
        addresses[newUsername] = msg.sender;

        emit UsernameUpdated(msg.sender, oldUsername, newUsername);
    }
}
