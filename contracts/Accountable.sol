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

import './Relatable.sol';
import './interfaces/IAccountable.sol';

/**
 * @title Accountable
 * @dev A contract to handle account management.
 */
contract Accountable is Relatable, IAccountable {
    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Accountable_init() internal onlyInitializing {
        // grant all roles to contract owner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
        _grantRole(TREASURER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /**
     * @dev See {IAccountable-createAccount}.
     */
    function createAccount(string calldata username)
        external
        isValidUsername(username)
    {
        // ensure account does not already exist
        if (users[msg.sender].status != Status.NonExistent)
            revert InvalidAccount();

        // create an active User for the account
        users[msg.sender] = User(
            msg.sender,
            Status.Active,
            1,
            username
        );

        // set username <-> address mapping
        addresses[username] = msg.sender;

        // bypassing the admin-check on grantRole so each user can mint squeaks
        _grantRole(MINTER_ROLE, msg.sender);

        emit AccountCreated(msg.sender, username);
    }

    /**
     * @dev See {IAccountable-updateStatus}.
     */
    function updateStatus(address account, Status status)
        external
        onlyRole(MODERATOR_ROLE)
    {
        // cannot set a status to non-existent
        if (status == Status.NonExistent) revert InvalidStatus();

        User storage user = users[account];

        // ensure the account exists
        if (user.status == Status.NonExistent) revert InvalidAccount();

        // ensure new status is not the same as the current status
        if (user.status == status) revert InvalidStatus();

        // save the updated status
        user.status = status;

        emit StatusUpdated(account, status);
    }

    /**
     * @dev See {IAccountable-updateUsername}.
     */
    function updateUsername(string calldata newUsername)
        external
        hasActiveAccount
        isValidUsername(newUsername)
    {
        User storage user = users[msg.sender];

        // clear the current username
        delete addresses[user.username];

        // set the new username
        addresses[newUsername] = msg.sender;
        user.username = newUsername;

        emit AccountUsernameUpdated(msg.sender, newUsername);
    }
}
