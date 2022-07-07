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

import './storage/IStoreable.sol';

/**
 * @dev Interface for Accountable.
 */
interface IAccountable is IStoreable {
    /**
     * @dev Creates a Critter account.
     * @param username Username for the account.
     */
    function createAccount(string calldata username) external;

    /**
     * @dev Gets the address for an account.
     * @param username Username of the account.
     * @return The accounts address.
     */
    function getAddress(string calldata username)
        external
        view
        returns (address);

    /**
     * @dev Updates an accounts status.
     * @param account Address of the account to update.
     * @param status A value from the AccountStatus enum.
     * @notice can only be called by MODERATOR_ROLE.
     */
    function updateAccountStatus(address account, AccountStatus status)
        external;

    /**
     * @dev Updates an accounts username.
     * @param newUsername The text of the new username.
     */
    function updateUsername(string calldata newUsername) external;
}
