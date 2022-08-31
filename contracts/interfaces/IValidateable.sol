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

// error codes
error AlreadyBlocked();
error AlreadyFollowing();
error AlreadyInteracted();
error Blocked();
error InsufficientFunds();
error InvalidAccount();
error InvalidAccountStatus();
error InvalidAmount();
error InvalidInteraction();
error InvalidLength();
error InvalidRelationship();
error NotApprovedOrOwner();
error NotFollowing();
error NotInScoutPool();
error NotInteractedYet();
error SqueakDoesNotExist();
error TransferFailed();
error Unavailable();

/**
 * @dev Interface for Validateable.
 */
interface IValidateable {
    /**
     * @dev See {IERC721AUpgradeable-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        external
        view
        returns (bool);
}
