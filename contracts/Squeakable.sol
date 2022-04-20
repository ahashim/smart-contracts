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

// libraries
import './libraries/StringTheory.sol';

// contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import './storage/Storeable.sol';

/**
 * @title Squeakable
 * @dev A contract dealing with actions performed on a Squeak.
 */
contract Squeakable is Initializable, Storeable {
    // used for ID generation by tokenIdCounter
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /**
     * @dev Emitted when the `sender` address creates a squeak with `content`
     * and is assigned a `tokenID`.
     * @param sender Address of the account that created the squeak.
     * @param tokenId Numerical ID of the newly minted squeak.
     * @param content Text content of the newly minted squeak.
     */
    event SqueakCreated(
        address indexed sender,
        uint256 tokenId,
        uint256 blockNumber,
        string content
    );

    /**
     * @dev Emitted when the `sender` address deletes a squeak of `tokenID`.
     * @param sender Address of the account that deleted the squeak.
     * @param tokenId Numerical ID of the deleted squeak.
     */
    event SqueakDeleted(address indexed sender, uint256 tokenId);

    /**
     * @dev Initializer function
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Squeakable_init() internal onlyInitializing {
        // set initial token ID to 1
        tokenIdCounter.increment();
    }

    /**
     * @dev Creates a squeak consisting of `content` and saves it to storage.
     * Emits a {SqueakCreated} event.
     * @param content Text content of the squeak.
     * @return tokenId Numerical ID of the newly created squeak.
     * @return tokenUri Text hash of the newly created token ID to be used for
     * its URI (in conjunction with {_baseURI} prefix).
     * @notice Requirements:
     *  - Squeak `content` must be between 0 and 256 bytes in length.
     */
    function _createSqueak(string memory content)
        internal
        returns (uint256, string memory)
    {
        // check invariants
        require(bytes(content).length > 0, 'Critter: squeak cannot be empty');
        require(bytes(content).length <= 256, 'Critter: squeak is too long');

        // get current tokenID & update counter
        uint256 tokenId = tokenIdCounter.current();
        tokenIdCounter.increment();

        // generate the URI of the squeak based on its token ID
        string memory tokenUri = _generateUri(tokenId);

        // build squeak & save it to storage
        Squeak storage squeak = squeaks[tokenId];
        squeak.account = msg.sender;
        squeak.blockNumber = block.number;
        squeak.content = content;

        // log the token ID & content
        emit SqueakCreated(
            msg.sender,
            tokenId,
            squeak.blockNumber,
            squeak.content
        );

        return (tokenId, tokenUri);
    }

    /**
     * @dev Deletes a squeak at `tokenId` from storage. Emits a {SqueakDeleted}
     * event.
     * @param tokenId Numerical ID of the squeak to delete.
     */
    function _deleteSqueak(uint256 tokenId) internal {
        // delete squeak from storage
        delete squeaks[tokenId];

        // log deleted token ID
        emit SqueakDeleted(msg.sender, tokenId);
    }

    /**
     * @dev Generate a token URI based on a hash of the chain ID & token ID. it
     * uses library functions from {StringTheory} under the hood.
     * @param tokenId Numerical token ID to generate a URI for.
     * @notice This is not a pure function due to the usage of `block.chainid`.
     */
    function _generateUri(uint256 tokenId)
        private
        view
        returns (string memory)
    {
        // get the hash of the token based on its chain ID & token ID
        bytes32 hashedUri = keccak256(abi.encode(block.chainid, tokenId));

        return StringTheory.lower(StringTheory.toHexString(hashedUri));
    }
}
