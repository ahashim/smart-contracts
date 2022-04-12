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

// Libraries
import './libraries/StringTheory.sol';

// Contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import './storage/Storeable.sol';

/**
 * @dev A contract dealing with actions performed on a Squeak.
 */
contract Squeakable is Initializable, Storeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /**
     * @dev Emitted when the `sender` address creates a squeak with `content`
     *      and is assigned a `tokenID`.
     */
    event SqueakCreated(
        address indexed sender,
        uint256 tokenId,
        string content
    );

    /**
     * @dev Emitted when the `sender` address deletes a squeak of `tokenID`.
     */
    event SqueakDeleted(address indexed sender, uint256 tokenId);

    /**
     * @dev Initializer function
     */
    function __Squeakable_init() internal onlyInitializing {
        // set initial token ID to 1
        tokenIdCounter.increment();
    }

    /**
     * @dev See {ISqueak-createSqueak}.
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
        squeak.content = content;

        // log the token ID & content
        emit SqueakCreated(msg.sender, tokenId, squeak.content);

        return (tokenId, tokenUri);
    }

    /**
     * @dev See {ISqueak-deleteSqueak}.
     */
    function _deleteSqueak(uint256 tokenId) internal {
        // delete squeak from storage
        delete squeaks[tokenId];

        // log deleted token ID
        emit SqueakDeleted(msg.sender, tokenId);
    }

    /**
     * @dev Generate token URI based on chain & token ID.
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
