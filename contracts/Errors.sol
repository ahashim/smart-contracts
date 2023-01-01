// SPDX-License-Identifier: Apache-2.0
/*

   Copyright 2023 Critter

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

// Accounts
error AlreadyRegistered();
error InvalidAccount();
error InvalidAccountStatus();
error UsernameEmpty();
error UsernameInvalid();
error UsernameTooLong();
error UsernameTooShort();
error UsernameUnavailable();

// Interactions
error AlreadyInteracted();
error InvalidInteraction();
error NotInteractedYet();

// Relationships
error AlreadyBlocked();
error AlreadyFollowing();
error Blocked();
error InvalidRelationship();
error NotBlocked();
error NotFollowing();

// Payments
error InsufficientFunds();
error InvalidAmount();

// Pools
error NotInPool();
error PoolDoesNotExist();

// Squeaks
error NotApprovedOrOwner();
error SqueakEmpty();
error SqueakDoesNotExist();
error SqueakTooLong();
