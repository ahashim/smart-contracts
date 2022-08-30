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

import './storage/IStoreable.sol';

/**
 * @dev Interface for Relatable.
 */
interface IRelatable is IStoreable {
    /**
     * @dev Emitted after updating a relationship.
     * @param sender Address of the sender.
     * @param relative Address of the account to update relationship with.
     * @param action A value from the Relations enum.
     */
    event RelationshipUpdated(
        address sender,
        address relative,
        Relations action
    );

    /**
     * @dev Updates the relationship between the sender and another account.
     * @param account Address of the account to update relationship with.
     * @param action A value from the Relations enum.
     */
    function updateRelationship(address account, Relations action) external;
}
