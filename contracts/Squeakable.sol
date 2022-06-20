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

// 3rd-party contracts
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import 'erc721a-upgradeable/contracts/ERC721AUpgradeable.sol';

// critter contracts
import './Bankable.sol';
import './Viral.sol';

// error codes
error AlreadyDisliked();
error AlreadyLiked();
error AlreadyResqueaked();
error InvalidInteractionType();
error NotApprovedOrOwner();
error NotDislikedYet();
error NotLikedYet();
error NotResqueakedYet();
error SqueakIsEmpty();
error SqueakIsTooLong();

/**
 * @title Squeakable
 * @dev A contract to handle actions performed on a Squeak.
 */
contract Squeakable is
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    Bankable,
    Viral
{
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Emitted after resqueaking.
     * @param sender Account that resqueaked.
     * @param tokenId ID of the squeak.
     */
    event Resqueaked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted after creating a squeak.
     * @param author Account that created the squeak.
     * @param tokenId ID of the squeak.
     * @param blockNumber Block in which the squeak was created.
     * @param content Content of the squeak.
     */
    event SqueakCreated(
        address indexed author,
        uint256 tokenId,
        uint256 blockNumber,
        string content
    );

    /**
     * @dev Emitted after deleting a squeak.
     * @param sender Account that deleted the squeak.
     * @param tokenId ID of the squeak.
     */
    event SqueakDeleted(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted after disliking a squeak.
     * @param sender Account that disliked the squeak.
     * @param tokenId ID of the squeak.
     */
    event SqueakDisliked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted after liking a squeak.
     * @param sender Account that liked the squeak.
     * @param tokenId ID of the squeak.
     */
    event SqueakLiked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted after undisliking a squeak.
     * @param sender Account that undisliked the squeak.
     * @param tokenId ID of the squeak.
     */
    event SqueakUndisliked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted after unliking a squeak.
     * @param sender Account that unliked the squeak.
     * @param tokenId ID of the squeak.
     */
    event SqueakUnliked(address indexed sender, uint256 tokenId);

    /**
     * @dev Emitted after unresqueaking.
     * @param sender Account that unresqueaked.
     * @param tokenId ID of the squeak.
     */
    event Unresqueaked(address indexed sender, uint256 tokenId);

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Squeakable_init() internal view onlyInitializing {}

    /**
     * @dev Creates a squeak.
     * @param content Text content of the squeak.
     * @notice Content must be between 0 and 256 bytes in length.
     */
    function createSqueak(string calldata content)
        external
        whenNotPaused
        hasAccount
        onlyRole(MINTER_ROLE)
    {
        bytes calldata rawContent = bytes(content);

        // validate existence
        if (rawContent.length == 0) {
            revert SqueakIsEmpty();
        }
        // validate length
        if (rawContent.length > 256) {
            revert SqueakIsTooLong();
        }

        uint256 tokenId = _nextTokenId();

        // create & save the squeak to storage
        squeaks[tokenId] = Squeak(
            block.number,
            msg.sender,
            msg.sender,
            content
        );

        _mint(msg.sender, 1);

        emit SqueakCreated(msg.sender, tokenId, block.number, content);
    }

    /**
     * @dev Deletes a squeak & its associated information.
     * @param tokenId ID of the squeak.
     */
    function deleteSqueak(uint256 tokenId)
        external
        payable
        whenNotPaused
        hasAccount
        squeakExists(tokenId)
        nonReentrant
    {
        address owner = ownerOf(tokenId);

        // ensure the caller has priviledges to delete
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender)) {
            revert NotApprovedOrOwner();
        }

        // validate delete fee
        uint256 currentBlockDeleteFee = getDeleteFee(tokenId, 0);

        if (msg.value < currentBlockDeleteFee) revert InsufficientFunds();

        // recieve payment
        _deposit(msg.value);

        // burn the token
        _burn(tokenId);

        // delete squeak
        delete squeaks[tokenId];

        // delete interactions
        delete likes[tokenId];
        delete dislikes[tokenId];
        delete resqueaks[tokenId];

        // handle virality
        if (viralSqueaks.contains(tokenId)) {
            if (scoutPools[tokenId].amount > 0) {
                // pay out the remaining pool funds to its members
                _makeScoutPayments(tokenId, _getPoolSharePrice(tokenId));
            }

            // delete associated scout pool & its members
            delete scouts[tokenId];
            delete scoutPools[tokenId];

            // remove from viralSqueaks set
            viralSqueaks.remove(tokenId);
        }

        emit SqueakDeleted(msg.sender, tokenId);
    }

    /**
     * @dev Gets the number of an {Interaction} that occurred for a squeak.
     * @param tokenId ID of the squeak.
     * @param interaction A value from the Interaction enum.
     */
    function getInteractionCount(uint256 tokenId, Interaction interaction)
        external
        view
        returns (uint256)
    {
        if (interaction == Interaction.Dislike)
            return dislikes[tokenId].length();
        else if (interaction == Interaction.Like)
            return likes[tokenId].length();
        else if (interaction == Interaction.Resqueak)
            return resqueaks[tokenId].length();
        else revert InvalidInteractionType();
    }

    /**
     * @dev Interacts with a squeak.
     * @param tokenId ID of the squeak.
     * @param interaction A value from the Interaction enum.
     */
    function interact(uint256 tokenId, Interaction interaction)
        external
        payable
        whenNotPaused
        hasAccount
        hasEnoughFunds
        squeakExists(tokenId)
        nonReentrant
    {
        // determine interaction & update state
        if (interaction == Interaction.Dislike) _dislikeSqueak(tokenId);
        else if (interaction == Interaction.Like) _likeSqueak(tokenId);
        else if (interaction == Interaction.Resqueak) _resqueak(tokenId);
        else if (interaction == Interaction.UndoDislike)
            _undoDislikeSqueak(tokenId);
        else if (interaction == Interaction.UndoLike) _undoLikeSqueak(tokenId);
        else if (interaction == Interaction.UndoResqueak)
            _undoResqueak(tokenId);
        else revert InvalidInteractionType();

        // check squeak virality
        if (
            !viralSqueaks.contains(tokenId) &&
            getViralityScore(tokenId) >= viralityThreshold
        ) {
            _markViral(tokenId);
        }

        _makePayment(tokenId, interaction);
    }

    /**
     * @dev Dislikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function _dislikeSqueak(uint256 tokenId) private {
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];

        // ensure account has not already disliked the squeak
        if (dislikers.contains(msg.sender)) {
            revert AlreadyDisliked();
        }

        // first remove them from likers set if they're in there
        if (likers.contains(msg.sender)) {
            likers.remove(msg.sender);
        }

        // then add them to the dislikers set
        dislikers.add(msg.sender);

        emit SqueakDisliked(msg.sender, tokenId);
    }

    /**
     * @dev Likes a squeak.
     * @param tokenId ID of the squeak.
     */
    function _likeSqueak(uint256 tokenId) private {
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];

        // ensure account has not already liked the squeak
        if (likers.contains(msg.sender)) {
            revert AlreadyLiked();
        }

        // first remove them from dislikers set if they're in there
        if (dislikers.contains(msg.sender)) {
            dislikers.remove(msg.sender);
        }

        // then add them to the likers set
        likers.add(msg.sender);

        emit SqueakLiked(msg.sender, tokenId);
    }

    /**
     * @dev Resqueaks a squeak.
     * @param tokenId ID of the squeak.
     */
    function _resqueak(uint256 tokenId) private {
        EnumerableSetUpgradeable.AddressSet storage resqueakers = resqueaks[
            tokenId
        ];

        // revert if the account has already resqueaked it
        if (resqueakers.contains(msg.sender)) {
            revert AlreadyResqueaked();
        }

        // add them to the resqueakers
        resqueakers.add(msg.sender);

        emit Resqueaked(msg.sender, tokenId);
    }

    /**
     * @dev Undislikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function _undoDislikeSqueak(uint256 tokenId) private {
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];

        // ensure the user has disliked the squeak
        if (!dislikers.contains(msg.sender)) {
            revert NotDislikedYet();
        }

        // remove them from dislikers
        dislikers.remove(msg.sender);

        emit SqueakUndisliked(msg.sender, tokenId);
    }

    /**
     * @dev Unlikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function _undoLikeSqueak(uint256 tokenId) private {
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];

        // ensure the user has liked the squeak
        if (!likers.contains(msg.sender)) {
            revert NotLikedYet();
        }

        // remove them from the likers
        likers.remove(msg.sender);

        emit SqueakUnliked(msg.sender, tokenId);
    }

    /**
     * @dev Undoes a resqueak.
     * @param tokenId ID of the squeak.
     */
    function _undoResqueak(uint256 tokenId) private {
        EnumerableSetUpgradeable.AddressSet storage resqueakers = resqueaks[
            tokenId
        ];

        // ensure the user has resqueaked the squeak
        if (!resqueakers.contains(msg.sender)) {
            revert NotResqueakedYet();
        }

        // remove them from the resqueakers
        resqueakers.remove(msg.sender);

        emit Unresqueaked(msg.sender, tokenId);
    }
}
