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

// Contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import './Immutable.sol';
import './Mappable.sol';
import './Typeable.sol';

/**
 * @title Storeable
 * @dev A contract holding all Critter storage variables. This is upgradeable
 * by means of appending new variables below the existing ones in future
 * versions. This will maintain storage mappings in the EVM as new features are
 * added.
 * @notice EVM storage collisions & upgradeability: https://tinyurl.com/d424mcpx
 */
contract Storeable is Initializable, Typeable, Immutable, Mappable {
    /**
     * @dev Initializer function
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Storeable_init(
        string memory baseURI,
        uint256 registrationFee,
        uint256 squeakDeletionFee
    ) internal onlyInitializing {
        // set base token URI
        baseTokenURI = baseURI;

        // set fees
        feeRegistration = registrationFee;
        feeDeletion = squeakDeletionFee;
    }

    /**
     * @dev A counter keeps track of token ID's.
     * @notice Cannot simply increment {ERC721-balanceOf} value due to the
     * ability to burn tokens.
     */
    CountersUpgradeable.Counter public tokenIdCounter;

    /**
     * @dev Global token URL prefix used when autogenerating token URI's.
     */
    string public baseTokenURI;

    /**
     * @dev Fee amount in wei to create an account.
     */
    uint256 public feeRegistration;

    /**
     * @dev Fee amount in wei per block to delete a squeak.
     * @notice This gets multiplied by blocks elapsed since the squeak was
     * authored to calculate the full fee amount.
     */
    uint256 public feeDeletion;
}
