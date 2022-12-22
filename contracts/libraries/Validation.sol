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

// errors
error UsernameEmpty();
error UsernameInvalid();
error UsernameTooLong();
error UsernameTooShort();
error UsernameUnavailable();

/**
 * @title Validation
 * @dev A library to validate Critter data structures.
 */
library Validation {
    /**
     * @dev Validates a username.
     * @param account Ethereum address of the Critter account.
     * @param input The username string.
     */
    function username(address account, string calldata input) public pure {
        bytes memory rawInput = bytes(input);

        if (rawInput.length == 0) revert UsernameEmpty();
        if (account != address(0)) revert UsernameUnavailable();
        if (rawInput.length < 3) revert UsernameTooShort();
        if (rawInput.length > 32) revert UsernameTooLong();
        if (!_matchUsernameRegex(rawInput)) revert UsernameInvalid();
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
}
