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

// Interfaces
import '@openzeppelin/contracts-upgradeable/access/IAccessControlEnumerableUpgradeable.sol';

/**
 * @dev Interface for `Accounts` contract.
 */
interface IAccounts is IAccessControlEnumerableUpgradeable {
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
     * @dev Create a Critter account.
     *
     *      Requirements:
     *
     *      - The caller must not have an account.
     *      - Username must be valid (see {isValidUsername} modifier).
     *
     *      Emits {AccountCreated} event.
     */
    function createAccount(string memory username) external returns (bool);

    /**
     * @dev Update an accounts critter username.
     *
     *      Requirements:
     *
     *      - The caller must already have an account.
     *      - The caller must have the `MINTER_ROLE`.
     *      - Username must be valid (see {isValidUsername} modifier).
     *
     *      Emits {UsernameUpdated} event.
     */
    function updateUsername(string memory newUsername) external returns (bool);
}
