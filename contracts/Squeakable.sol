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

import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import './Viral.sol';
import './interfaces/ISqueakable.sol';

/**
 * @title Squeakable
 * @dev A contract to handle actions performed on a Squeak.
 */
contract Squeakable is ReentrancyGuardUpgradeable, Viral, ISqueakable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Squeakable_init() internal view onlyInitializing {}

    /**
     * @dev See {ISqueakable-createSqueak}.
     */
    function createSqueak(string calldata content)
        external
        hasActiveAccount
        onlyRole(MINTER_ROLE)
    {
        // convert to bytes for storage
        bytes memory rawContent = bytes(content);

        // validate existence & length of the raw content
        if (rawContent.length == 0) revert InvalidLength();
        else if (rawContent.length > 256) revert InvalidLength();

        uint256 tokenId = _nextTokenId();

        // save the squeak details to storage
        squeaks[tokenId] = Squeak(
            block.number,
            msg.sender,
            msg.sender,
            rawContent
        );

        // mint the NFT
        _mint(msg.sender, 1);

        emit SqueakCreated(msg.sender, tokenId, block.number, content);
    }

    /**
     * @dev See {ISqueakable-deleteSqueak}.
     */
    function deleteSqueak(uint256 tokenId)
        external
        payable
        hasActiveAccount
        squeakExists(tokenId)
        nonReentrant
    {
        address owner = ownerOf(tokenId);

        // validate squeak ownership
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender))
            revert NotApprovedOrOwner();

        // get the delete fee in this block
        uint256 deleteFee = _getDeleteFee(tokenId, 0);

        // validate the fee & calculate the remainder to refund
        if (msg.value < deleteFee) revert InsufficientFunds();
        uint256 remainder = msg.value - deleteFee;

        // receive payment
        _deposit(deleteFee);

        // burn the NFT
        _burn(tokenId);

        // delete the squeak + sentiment
        delete squeaks[tokenId];
        delete sentiments[tokenId];

        if (viralSqueaks.contains(tokenId)) {
            // delete associated virality
            ScoutPool storage pool = pools[tokenId];

            if (pool.amount > 0) {
                // pay out any remaining pool funds
                _makeScoutPayments(tokenId, pool);

                // deposit remaining dust into treasury
                _deposit(pool.amount);

                // drain the pool
                pool.amount = 0;
            }

            // delete the pool
            delete pools[tokenId];

            // remove the squeak from the viral squeaks list
            viralSqueaks.remove(tokenId);
        }

        // refund any excess funds
        if (remainder > 0) _transferFunds(msg.sender, remainder);

        emit SqueakInteraction(tokenId, msg.sender, Interaction.Delete);
    }

    /**
     * @dev See {ISqueakable-getSentimentCounts}.
     */
    function getSentimentCounts(uint256 tokenId)
        external
        view
        returns (SentimentCounts memory)
    {
        Sentiment storage sentiment = sentiments[tokenId];

        return
            SentimentCounts(
                sentiment.dislikes.length(),
                sentiment.likes.length(),
                sentiment.resqueaks.length()
            );
    }

    /**
     * @dev See {ISqueakable-interact}.
     */
    function interact(uint256 tokenId, Interaction interaction)
        external
        payable
        hasActiveAccount
        squeakExists(tokenId)
        nonReentrant
    {
        // validate required fee amount
        if (msg.value < fees[interaction]) revert InsufficientFunds();

        address author = squeaks[tokenId].author;

        // validate author & sender have not blocked each other
        if (
            msg.sender != author &&
            (blocked[author].contains(msg.sender) ||
                blocked[msg.sender].contains(author))
        ) revert Blocked();

        Sentiment storage sentiment = sentiments[tokenId];

        // determine interaction & update sentiment
        if (interaction == Interaction.Dislike) _dislikeSqueak(sentiment);
        else if (interaction == Interaction.Like) _likeSqueak(sentiment);
        else if (interaction == Interaction.Resqueak) _resqueak(sentiment);
        else if (interaction == Interaction.UndoDislike)
            _undoDislikeSqueak(sentiment);
        else if (interaction == Interaction.UndoLike)
            _undoLikeSqueak(sentiment);
        else if (interaction == Interaction.UndoResqueak)
            _undoResqueak(sentiment);

        emit SqueakInteraction(tokenId, msg.sender, interaction);

        // check virality
        if (
            !viralSqueaks.contains(tokenId) &&
            getViralityScore(tokenId) >=
            config[Configuration.ViralityThreshold]
        ) {
            _markViral(tokenId, sentiment);
        }

        _makePayment(tokenId, interaction);
    }

    /**
     * @dev Dislikes a squeak.
     * @param sentiment Pointer to the {Sentiment} of the squeak.
     */
    function _dislikeSqueak(Sentiment storage sentiment) private {
        // ensure the user has not already disliked the squeak
        if (sentiment.dislikes.contains(msg.sender))
            revert AlreadyInteracted();

        if (sentiment.likes.contains(msg.sender))
            // remove the previous like
            sentiment.likes.remove(msg.sender);

        sentiment.dislikes.add(msg.sender);
    }

    /**
     * @dev Likes a squeak.
     * @param sentiment Pointer to the {Sentiment} of the squeak.
     */
    function _likeSqueak(Sentiment storage sentiment) private {
        // ensure the user has not already liked the squeak
        if (sentiment.likes.contains(msg.sender)) revert AlreadyInteracted();

        if (sentiment.dislikes.contains(msg.sender))
            // remove the previous dislike
            sentiment.dislikes.remove(msg.sender);

        sentiment.likes.add(msg.sender);
    }

    /**
     * @dev Resqueaks a squeak.
     * @param sentiment Pointer to the {Sentiment} of the squeak.
     */
    function _resqueak(Sentiment storage sentiment) private {
        // ensure the user has not already resqueaked the squeak
        if (sentiment.resqueaks.contains(msg.sender))
            revert AlreadyInteracted();

        sentiment.resqueaks.add(msg.sender);
    }

    /**
     * @dev Undislikes a squeak.
     * @param sentiment Pointer to the {Sentiment} of the squeak.
     */
    function _undoDislikeSqueak(Sentiment storage sentiment) private {
        // ensure the user has disliked the squeak
        if (!sentiment.dislikes.contains(msg.sender))
            revert NotInteractedYet();

        // remove their dislike
        sentiment.dislikes.remove(msg.sender);
    }

    /**
     * @dev Unlikes a squeak.
     * @param sentiment Pointer to the {Sentiment} of the squeak.
     */
    function _undoLikeSqueak(Sentiment storage sentiment) private {
        // ensure the user has liked the squeak
        if (!sentiment.likes.contains(msg.sender)) revert NotInteractedYet();

        // remove their like
        sentiment.likes.remove(msg.sender);
    }

    /**
     * @dev Undoes a resqueak.
     * @param sentiment Pointer to the {Sentiment} of the squeak.
     */
    function _undoResqueak(Sentiment storage sentiment) private {
        // ensure the user has resqueaked the squeak
        if (!sentiment.resqueaks.contains(msg.sender))
            revert NotInteractedYet();

        // remove their resqueak
        sentiment.resqueaks.remove(msg.sender);
    }
}
