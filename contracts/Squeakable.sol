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
import '@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';
import './Bankable.sol';
import './storage/Storeable.sol';

/**
 * @title Squeakable
 * @dev A contract dealing with actions performed on a Squeak.
 */
contract Squeakable is Initializable, ERC721Upgradeable, Storeable, Bankable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Emitted when the `sender` address reposts a squeak at `tokenID`.
     * @param sender Address of the account that reposted the squeak.
     * @param tokenId Numerical ID of the reposted queak.
     */
    event Resqueaked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted when the `sender` address creates a squeak with `content`
     * and is assigned a `tokenID`.
     * @param author Address of the account that created the squeak.
     * @param tokenId Numerical ID of the newly minted squeak.
     * @param blockNumber Number of the block in which the squeak was authored.
     * @param content Text content of the newly minted squeak.
     */
    event SqueakCreated(
        address indexed author,
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
     * @dev Emitted when the `sender` address dislikes a squeak of `tokenID`.
     * @param sender Address of the account that disliked the squeak.
     * @param tokenId Numerical ID of the disliked squeak.
     */
    event SqueakDisliked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted when the `sender` address likes a squeak of `tokenID`.
     * @param sender Address of the account that liked the squeak.
     * @param tokenId Numerical ID of the liked squeak.
     */
    event SqueakLiked(address indexed sender, uint256 tokenId);

    /**
     * @dev Ensure squeak exists at `tokenId`.
     * @param tokenId Numerical ID of the squeak
     */
    modifier squeakExists(uint256 tokenId) {
        require(
            _exists(tokenId),
            'Critter: cannot perform action on a nonexistent token'
        );
        _;
    }

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
        squeak.blockNumber = block.number;
        squeak.author = msg.sender;
        squeak.owner = msg.sender;
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
        // delete squeak & associated sentiment from storage
        delete squeaks[tokenId];
        delete likes[tokenId];
        delete dislikes[tokenId];

        // recieve payment
        _deposit(msg.value);

        // log squeak deleted
        emit SqueakDeleted(msg.sender, tokenId);
    }

    /**
     * @dev Dislikes a squeak at `tokenId` by depositing the platformFee
     * into the treasury. Emits a {SqueakDisliked} event.
     * event.
     * @param tokenId Numerical ID of the squeak to dislike.
     */
    function _dislikeSqueak(uint256 tokenId) internal {
        // get liker/disklers of the squeak
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];

        // ensure account has not already disliked the squeak
        require(
            !dislikers.contains(msg.sender),
            'Critter: cannot dislike a squeak twice'
        );

        // first remove them from likers set if they're in there
        if (likers.contains(msg.sender)) {
            likers.remove(msg.sender);
        }

        // then add them to the likers set
        dislikers.add(msg.sender);

        // deposit fee into the treasury
        _deposit(msg.value);

        // log disliked squeak
        emit SqueakDisliked(msg.sender, tokenId);
    }

    /**
     * @dev transfers platformFee from msg.sender to `tokenId` squeak owner.
     * Also adds fee to treasury from platformFee.
     * @param tokenId ID of the squeak to "like".
     */
    function _likeSqueak(uint256 tokenId) internal {
        // get squeak details
        Squeak memory squeak = squeaks[tokenId];
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];

        // ensure account has not already liked the squeak
        require(
            !likers.contains(msg.sender),
            'Critter: cannot like a squeak twice'
        );

        // first remove them from dislikers set if they're in there
        if (dislikers.contains(msg.sender)) {
            dislikers.remove(msg.sender);
        }

        // then add them to the likers set
        likers.add(msg.sender);

        // split & transfer fees to treasury & squeak owner
        _feeSplitAndTransfer(squeak.owner, msg.value);

        // log liked squeak
        emit SqueakLiked(msg.sender, tokenId);
    }

    /**
     * @dev transfers platformFee from msg.sender to `tokenId` squeak owner.
     * Also adds fee to treasury from platformFee. Emits a {Resqueaked}
     * event.
     * @param tokenId ID of the squeak to "resqueak".
     */
    function _resqueak(uint256 tokenId) internal {
        // look up squeak
        Squeak memory squeak = squeaks[tokenId];

        // split & transfer fees to treasury & squeak owner
        _feeSplitAndTransfer(squeak.owner, msg.value);

        // log liked squeak
        emit Resqueaked(msg.sender, tokenId);
    }

    /**
     * @dev Reassigns the owner of the squeak at `tokenId` to the `to` address.
     * @param to Address of the new owner of the squeak.
     * @param tokenId ID of the squeak to transfer ownership of.
     */
    function _transferSqueakOwnership(address to, uint256 tokenId) internal {
        Squeak storage squeak = squeaks[tokenId];
        squeak.owner = to;
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
