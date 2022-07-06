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
     * @dev Emitted after an interaction.
     * @param tokenId ID of the squeak.
     * @param sender Account that resqueaked.
     * @param interaction Value from the Interaction enum.
     */
    event SqueakInteraction(
        uint256 tokenId,
        address sender,
        Interaction interaction
    );

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
        hasActiveAccount
        onlyRole(MINTER_ROLE)
    {
        bytes memory rawContent = bytes(content);

        // validate existence
        if (rawContent.length == 0) revert InvalidLength();

        // validate length
        if (rawContent.length > 256) revert InvalidLength();

        uint256 tokenId = _nextTokenId();

        // create & save the squeak to storage
        squeaks[tokenId] = Squeak(
            block.number,
            msg.sender,
            msg.sender,
            rawContent
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
        hasActiveAccount
        squeakExists(tokenId)
        nonReentrant
    {
        address owner = ownerOf(tokenId);

        // validate squeak ownership
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender))
            revert NotApprovedOrOwner();

        // validate delete fee
        if (msg.value < getDeleteFee(tokenId, 0)) revert InsufficientFunds();

        // receive payment
        _deposit(msg.value);

        // burn the token
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
            }

            // delete the pool
            delete pools[tokenId];

            // remove squeak from set of viral squeaks
            viralSqueaks.remove(tokenId);
        }

        emit SqueakInteraction(tokenId, msg.sender, Interaction.Delete);
    }

    /**
     * @dev Gets a count of each Sentiment item for a squeak.
     * @param tokenId ID of the squeak.
     * @return SentimentCounts
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
     * @dev Interacts with a squeak.
     * @param tokenId ID of the squeak.
     * @param interaction A value from the Interaction enum.
     */
    function interact(uint256 tokenId, Interaction interaction)
        external
        payable
        whenNotPaused
        hasActiveAccount
        squeakExists(tokenId)
        nonReentrant
    {
        Sentiment storage sentiment = sentiments[tokenId];

        // determine interaction & update state
        if (interaction == Interaction.Dislike) _dislikeSqueak(sentiment);
        else if (interaction == Interaction.Like) _likeSqueak(sentiment);
        else if (interaction == Interaction.Resqueak) _resqueak(sentiment);
        else if (interaction == Interaction.UndoDislike)
            _undoDislikeSqueak(sentiment);
        else if (interaction == Interaction.UndoLike)
            _undoLikeSqueak(sentiment);
        else if (interaction == Interaction.UndoResqueak)
            _undoResqueak(sentiment);
        else revert InvalidInteraction();

        emit SqueakInteraction(tokenId, msg.sender, interaction);

        // check squeak virality
        if (
            !viralSqueaks.contains(tokenId) &&
            getViralityScore(tokenId) >= viralityThreshold
        ) {
            _markViral(tokenId, sentiment);
        }

        _makePayment(tokenId, interaction);
    }

    /**
     * @dev Dislikes a squeak.
     * @param sentiment Pointer to Sentiment values for the squeak.
     */
    function _dislikeSqueak(Sentiment storage sentiment)
        private
        coversFee(Interaction.Dislike)
    {
        // ensure the user has not already disliked the squeak
        if (sentiment.dislikes.contains(msg.sender))
            revert AlreadyInteracted();

        // remove previous like
        if (sentiment.likes.contains(msg.sender))
            sentiment.likes.remove(msg.sender);

        sentiment.dislikes.add(msg.sender);
    }

    /**
     * @dev Likes a squeak.
     * @param sentiment Pointer to Sentiment values for the squeak.
     */
    function _likeSqueak(Sentiment storage sentiment)
        private
        coversFee(Interaction.Like)
    {
        // ensure the user has not already liked the squeak
        if (sentiment.likes.contains(msg.sender)) revert AlreadyInteracted();

        if (sentiment.dislikes.contains(msg.sender))
            // remove previous dislike
            sentiment.dislikes.remove(msg.sender);

        sentiment.likes.add(msg.sender);
    }

    /**
     * @dev Resqueaks a squeak.
     * @param sentiment Pointer to Sentiment values for the squeak.
     */
    function _resqueak(Sentiment storage sentiment)
        private
        coversFee(Interaction.Resqueak)
    {
        // ensure the user has not already resqueaked the squeak
        if (sentiment.resqueaks.contains(msg.sender))
            revert AlreadyInteracted();

        sentiment.resqueaks.add(msg.sender);
    }

    /**
     * @dev Undislikes a squeak.
     * @param sentiment Pointer to Sentiment values for the squeak.
     */
    function _undoDislikeSqueak(Sentiment storage sentiment)
        private
        coversFee(Interaction.UndoDislike)
    {
        // ensure the user has disliked the squeak
        if (!sentiment.dislikes.contains(msg.sender))
            revert NotInteractedYet();

        // remove them from dislikes
        sentiment.dislikes.remove(msg.sender);
    }

    /**
     * @dev Unlikes a squeak.
     * @param sentiment Pointer to Sentiment values for the squeak.
     */
    function _undoLikeSqueak(Sentiment storage sentiment)
        private
        coversFee(Interaction.UndoLike)
    {
        // ensure the user has liked the squeak
        if (!sentiment.likes.contains(msg.sender)) revert NotInteractedYet();

        // remove them from the likers
        sentiment.likes.remove(msg.sender);
    }

    /**
     * @dev Undoes a resqueak.
     * @param sentiment Pointer to Sentiment values for the squeak.
     */
    function _undoResqueak(Sentiment storage sentiment)
        private
        coversFee(Interaction.UndoResqueak)
    {
        // ensure the user has resqueaked the squeak
        if (!sentiment.resqueaks.contains(msg.sender))
            revert NotInteractedYet();

        // remove them from the resqueaks
        sentiment.resqueaks.remove(msg.sender);
    }
}
