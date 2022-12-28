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
pragma solidity 0.8.17;

// enums
import '../Enums.sol';

// errors
import '../Errors.sol';

// libraries
import {Slice, toSlice} from '@dk1a/solidity-stringutils/src/Slice.sol';

// types
using {toSlice} for bytes;

/**
 * @title Accountable
 * @dev A library that handles Critter account logic.
 */
library Accountable {
    // restricted username strings
    bytes public constant BYTES_ADMIN = bytes('admin');
    bytes public constant BYTES_CRITTER = bytes('critter');

    /**
     * @dev Ensures that a Critter account status is active.
     * @param status A value from the Status enum.
     */
    function hasActiveAccount(Status status) public pure {
        if (status == Status.Unknown) revert InvalidAccount();
        if (status != Status.Active) revert InvalidAccountStatus();
    }

    /**
     * @dev Validates a username.
     * @param account Ethereum address of the Critter account.
     * @param username The username bytes.
     */
    function validateUsername(
        address account,
        bytes calldata username
    ) public pure {
        if (username.length == 0) revert UsernameEmpty();
        if (account != address(0)) revert UsernameUnavailable();
        if (username.length < 3) revert UsernameTooShort();
        if (username.length > 32) revert UsernameTooLong();
        if (
            !_matchUsernameRegex(username) ||
            _containsRestrictedWords(username)
        ) revert UsernameInvalid();
    }

    /**
     * @dev Tests a username against the regular expression: /[a-z_0-9]/
     * @param input The username string.
     */
    function _matchUsernameRegex(
        bytes memory input
    ) private pure returns (bool) {
        bool isValid = true;

        for (uint i = 0; i < input.length; i++) {
            uint8 c = uint8(input[i]);

            if (
                (c >= 48 && c <= 57) || // 0-9
                c == 95 || // _
                (c >= 97 && c <= 122) // a-z
            ) {
                continue;
            } else {
                isValid = false;
                break;
            }
        }

        return isValid;
    }

    /**
     * @dev Checks if the username contains the string "critter" or "admin"
     * @param input The username string.
     */
    function _containsRestrictedWords(
        bytes memory input
    ) private pure returns (bool) {
        Slice s = input.toSlice();

        return (s.contains(BYTES_CRITTER.toSlice()) ||
            s.contains(BYTES_ADMIN.toSlice()));
    }
}
