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

// error codes
error Blocked();

/**
 * @title Relatable
 * @dev A library that handles Critter relationship logic.
 */
library Relatable {
    /**
     * @dev Checks if the sender is not the squeak author, and whether the
     *      interactors of the squeak have blocked one another.
     */
    function checkIfBlocked(
        address author,
        bool senderIsBlocked,
        bool authorIsBlocked
    ) public view {
        if (msg.sender != author && (senderIsBlocked || authorIsBlocked))
            revert Blocked();
    }
}
