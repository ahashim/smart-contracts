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

// 3rd-party contract
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import 'erc721a-upgradeable/contracts/ERC721AUpgradeable.sol';

// critter contracts
import './storage/Storeable.sol';

// error codes
error AccountAlreadyExists();
error AlreadyDisliked();
error AlreadyLiked();
error AlreadyResqueaked();
error InactiveAccount();
error InsufficientFunds();
error InvalidAccountStatus();
error InvalidInteractionType();
error InvalidWithdrawlAmount();
error NonExistentAccount();
error NotApprovedOrOwner();
error NotDislikedYet();
error NotIncludedInScoutPool();
error NotLikedYet();
error NotResqueakedYet();
error SqueakDoesNotExist();
error SqueakIsEmpty();
error SqueakIsTooLong();
error TransferFailed();
error UsernameEmpty();
error UsernameTooLong();
error UsernameUnavailable();

/**
 * @title Validateble
 * @dev A contract to handle modifiers which validate contract functions.
 * @notice This contract needs to override {supportsInterface} due to its
 *      inheritance from both AccessControlUpgradeable & ERC721AUpgradeable.
 */
contract Validateable is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ERC721AUpgradeable,
    Storeable
{
    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Validateable_init() internal view onlyInitializing {}

    /**
     * @dev Ensures the sender has a Critter account.
     */
    modifier hasActiveAccount() {
        User storage account = users[msg.sender];

        // validate existence
        if (account.status == AccountStatus.NonExistent) {
            revert NonExistentAccount();
        }
        // validate active status
        if (account.status != AccountStatus.Active) {
            revert InactiveAccount();
        }
        _;
    }

    /**
     * @dev Ensures that the sender has enough to cover the interaction fee.
     */
    modifier coversFee(Interaction interaction) {
        if (msg.value < interactionFees[interaction]) {
            revert InsufficientFunds();
        }
        _;
    }

    /**
     * @dev Ensures a username isn't empty or too long, and is available.
     * @param username Text of the username.
     */
    modifier isValidUsername(string calldata username) {
        // validate existence
        if (bytes(username).length == 0) {
            revert UsernameEmpty();
        }
        // validate length
        if (bytes(username).length > 32) {
            revert UsernameTooLong();
        }
        // validate availability
        if (addresses[username] != address(0)) {
            revert UsernameUnavailable();
        }
        _;
    }

    /**
     * @dev Ensure squeak exists.
     * @param tokenId ID of the squeak.
     */
    modifier squeakExists(uint256 tokenId) {
        if (!_exists(tokenId)) {
            revert SqueakDoesNotExist();
        }
        _;
    }

    /**
     * @dev See {IERC721AUpgradeable-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, ERC721AUpgradeable)
        returns (bool)
    {
        return
            ERC721AUpgradeable.supportsInterface(interfaceId) ||
            super.supportsInterface(interfaceId);
    }
}
