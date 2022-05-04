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

// contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';
import 'erc721a-upgradeable/contracts/ERC721AUpgradeable.sol';
import './Bankable.sol';
import './storage/Storeable.sol';

/**
 * @title Squeakable
 * @dev A contract dealing with actions performed on a Squeak.
 */
contract Squeakable is Initializable, ERC721AUpgradeable, Storeable, Bankable {
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
     * @dev Emitted when the `sender` address undislikes a squeak of `tokenID`.
     * @param sender Address of the account that undisliked the squeak.
     * @param tokenId Numerical ID of the undisliked squeak.
     */
    event SqueakUndisliked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted when the `sender` address unlikes a squeak of `tokenID`.
     * @param sender Address of the account that unliked the squeak.
     * @param tokenId Numerical ID of the unliked squeak.
     */
    event SqueakUnliked(address indexed sender, uint256 tokenId);

    /**
     * @dev Raised on the following invalid interactions:
     *  - DOUBLE_DISLIKE
     *  - DOUBLE_LIKE
     *  - UNDO_LIKE
     *  - UNDO_DISLIKE
     * @param account Address of account.
     * @param tokenId ID of the squeak.
     * @param interaction string code of the invalid interaction.
     */
    error InteractionInvalid(
        address account,
        uint256 tokenId,
        string interaction
    );

    /**
     * @dev Raised when the content of a squeak fails validation:
     *  - is less than 0 bytes.
     *  - is over 256 bytes.
     * @param content String of the content of the squeak.
     */
    error SqueakContentInvalidLength(string content);

    /**
     * @dev Raised when squeak at `tokenId` does not exist.
     * @param tokenId Address of account
     */
    error SqueakDoesNotExist(uint256 tokenId);

    /**
     * @dev Ensure squeak exists at `tokenId`.
     * @param tokenId Numerical ID of the squeak
     */
    modifier squeakExists(uint256 tokenId) {
        if (!_exists(tokenId)) {
            revert SqueakDoesNotExist({tokenId: tokenId});
        }
        _;
    }

    /**
     * @dev Initializer function
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Squeakable_init() internal view onlyInitializing {}

    /**
     * @dev Creates a squeak consisting of `content` and saves it to storage.
     * Emits a {SqueakCreated} event.
     * @param content Text content of the squeak.
     * @return tokenId Numerical ID of the newly created squeak.
     * its URI (in conjunction with {_baseURI} prefix).
     * @notice Requirements:
     *  - Squeak `content` must be between 0 and 256 bytes in length.
     */
    function _createSqueak(string memory content) internal returns (uint256) {
        // check invariants
        if (bytes(content).length == 0 || bytes(content).length > 256) {
            revert SqueakContentInvalidLength({content: content});
        }

        // get current tokenID
        uint256 tokenId = _currentIndex;

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

        return (tokenId);
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
     * @param tokenId Numerical ID of the squeak to dislike.
     */
    function _dislikeSqueak(uint256 tokenId) internal {
        // get liker/disklers of the squeak
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];

        // ensure account has not already disliked the squeak
        if (dislikers.contains(msg.sender)) {
            revert InteractionInvalid({
                account: msg.sender,
                tokenId: tokenId,
                interaction: 'DOUBLE_DISLIKE'
            });
        }

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
     * Also adds fee to treasury from platformFee.Emits a {SqueakLiked} event.
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
        if (likers.contains(msg.sender)) {
            revert InteractionInvalid({
                account: msg.sender,
                tokenId: tokenId,
                interaction: 'DOUBLE_LIKE'
            });
        }

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
     * @dev Removes the sender from the dislikes set of the squeak at `tokenId`,
     * and deposits the platformFee into the treasury.
     * @param tokenId ID of the squeak to undo the dislike of.
     */
    function _undoDislikeSqueak(uint256 tokenId) internal {
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];

        // ensure sender has already disliked the squeak
        if (!dislikers.contains(msg.sender)) {
            revert InteractionInvalid({
                account: msg.sender,
                tokenId: tokenId,
                interaction: 'UNDO_DISLIKE'
            });
        }

        // remove the caller from the dislikers set of the squeak
        dislikers.remove(msg.sender);

        // deposit fee into the treasury
        _deposit(msg.value);

        emit SqueakUndisliked(msg.sender, tokenId);
    }

    /**
     * @dev Removes the sender from the likes set of the squeak at `tokenId`,
     * and deposits the platformFee into the treasury.
     * @param tokenId ID of the squeak to undo the like of.
     */
    function _undoLikeSqueak(uint256 tokenId) internal {
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];

        // ensure sender has already liked the squeak
        if (!likers.contains(msg.sender)) {
            revert InteractionInvalid({
                account: msg.sender,
                tokenId: tokenId,
                interaction: 'UNDO_LIKE'
            });
        }

        // remove the caller from the likers set of the squeak
        likers.remove(msg.sender);

        // deposit fee into the treasury
        _deposit(msg.value);

        emit SqueakUnliked(msg.sender, tokenId);
    }
}
