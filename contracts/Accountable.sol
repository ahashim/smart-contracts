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
import './Bankable.sol';
import './Validateable.sol';

/**
 * @title Accountable
 * @dev A contract to handle account management.
 */
contract Accountable is PausableUpgradeable, Validateable, Bankable  {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Emitted after creating an account.
     * @param account Address of the account.
     * @param username Username of the account.
     */
    event AccountCreated(address indexed account, string username);

    /**
     * @dev Emitted after updating an account status.
     * @param account Address of the account.
     * @param status A value fromt the AccountStatus enum.
     */
    event AccountStatusUpdated(address indexed account, AccountStatus status);

    /**
     * @dev Emitted after updating an accounts username.
     * @param account Address of the account.
     * @param newUsername Next username.
     */
    event UsernameUpdated(address indexed account, string newUsername);

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Accountable_init() internal onlyInitializing {
        // grant all roles to contract owner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
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
        if (users[msg.sender].status != AccountStatus.NonExistent) {
            revert AccountAlreadyExists();
        }

        // create a User for the address
        users[msg.sender] = User(
            msg.sender,
            AccountStatus.Active,
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
     * @dev Updates an accounts status.
     * @param account Address of the account to update.
     * @param status A value from the AccountStatus enum.
     * @notice can only be called by MODERATOR_ROLE.
     */
    function updateAccountStatus(address account, AccountStatus status)
        external
        onlyRole(MODERATOR_ROLE)
    {
        // cannot set an account to non-existent
        if (status == AccountStatus.NonExistent) revert InvalidAccountStatus();

        User storage user = users[account];

        // ensure the account exists
        if (user.status == AccountStatus.NonExistent)
            revert NonExistentAccount();

        // ensure new status is not the same as the current status
        if (user.status == status) revert InvalidAccountStatus();

        // save updated status to storage
        user.status = status;

        // if banning a user,
        if (status == AccountStatus.Banned) {
            EnumerableSetUpgradeable.UintSet storage finds = scoutFinds[
                account
            ];

            // eject them from any viral squeaks they're a part of
            if (finds.length() > 0) {
                for (uint256 index = 0; index < finds.length(); index++) {
                    // get the scout pool
                    uint256 tokenId = finds.at(index);
                    ScoutPool storage pool = scoutPools[tokenId];

                    // remove the user & their shares from the pool
                    pool.shares -= pool.members.get(account);
                    pool.members.remove(account);

                    // if the pool is empty
                    if (pool.members.length() == 0) {
                        if (pool.amount > 0) _deposit(pool.amount);

                        // delete the pool
                        delete scoutPools[tokenId];

                        // remove the token from viral squeaks
                        viralSqueaks.remove(tokenId);
                    }
                }
            }

            // delete the users finds
            delete scoutFinds[account];
        }

        emit AccountStatusUpdated(account, status);
    }

    /**
     * @dev Updates an accounts username.
     * @param newUsername The text of the new username.
     */
    function updateUsername(string calldata newUsername)
        external
        whenNotPaused
        hasActiveAccount
        isValidUsername(newUsername)
    {
        // clear the current username
        User storage user = users[msg.sender];
        delete addresses[user.username];

        // set the new username
        addresses[newUsername] = msg.sender;
        user.username = newUsername;

        emit UsernameUpdated(msg.sender, newUsername);
    }
}
