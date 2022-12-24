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

/**
 * @dev Set of statuses of a critter account.
 */
enum Status {
    Unknown,
    Active,
    Suspended,
    Banned
}

/**
 * @dev Set of Configuration keys for the contract.
 */
enum Configuration {
    DeleteRate,
    PlatformTakeRate,
    PoolPayoutThreshold,
    MaxLevel,
    ViralityBonus,
    ViralityThreshold
}

/**
 * @dev Set of interactions for a squeak.
 */
enum Interaction {
    Dislike,
    Like,
    Resqueak,
    UndoDislike,
    UndoLike,
    UndoResqueak
}

/**
 * @dev Set of relation actions a user can take upon another user.
 */
enum Relation {
    Block,
    Follow,
    Unblock,
    Unfollow
}
