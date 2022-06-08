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
import 'erc721a-upgradeable/contracts/ERC721AUpgradeable.sol';
import './Bankable.sol';
import './storage/Storeable.sol';

// data structures
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';

// libraries
import 'abdk-libraries-solidity/ABDKMath64x64.sol';

// error codes
error AlreadyDisliked(address account, uint256 tokenId);
error AlreadyLiked(address account, uint256 tokenId);
error AlreadyResqueaked(address account, uint256 tokenId);
error NotResqueakedYet(address account, uint256 tokenId);
error NotDislikedYet(address account, uint256 tokenId);
error NotLikedYet(address account, uint256 tokenId);
error SqueakIsEmpty(string content);
error SqueakIsTooLong(string content);
error SqueakDoesNotExist(uint256 tokenId);

/**
 * @title Squeakable
 * @dev A contract dealing with actions performed on a Squeak.
 */
contract Squeakable is ERC721AUpgradeable, Storeable, Bankable {
    using ABDKMath64x64 for *;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

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
     * @dev Emitted when the `sender` address undoes a resqueak of `tokenID`.
     * @param sender Address of the account that undid the resqueak.
     * @param tokenId Numerical ID of the undone resqueak.
     */
    event SqueakUnresqueaked(address indexed sender, uint256 tokenId);

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
     * @dev See {ISqueakable-getDislikeCount}.
     */
    function getDislikeCount(uint256 tokenId) public view returns (uint256) {
        return dislikes[tokenId].length();
    }

    /**
     * @dev See {ISqueakable-getLikeCount}.
     */
    function getLikeCount(uint256 tokenId) public view returns (uint256) {
        return likes[tokenId].length();
    }

    /**
     * @dev See {ISqueakable-getDislikeCount}.
     */
    function getResqueakCount(uint256 tokenId) public view returns (uint256) {
        return resqueaks[tokenId].length();
    }

    /**
     * @dev See {ISqueakable-getViralityScore}.
     */
    function getViralityScore(uint256 tokenId)
        public
        view
        squeakExists(tokenId)
        returns (uint64)
    {
        uint256 blockDelta = block.number - squeaks[tokenId].blockNumber;
        uint256 dislikes = getDislikeCount(tokenId);
        uint256 likes = getLikeCount(tokenId);
        uint256 resqueaks = getResqueakCount(tokenId);

        // minimum virality consideration
        return
            likes > 0 && resqueaks > 0
                ? _getViralityScore(blockDelta, dislikes, likes, resqueaks)
                : 0;
    }

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
        // validate existence
        if (bytes(content).length == 0) {
            revert SqueakIsEmpty({content: content});
        }
        // validate length
        if (bytes(content).length > 256) {
            revert SqueakIsTooLong({content: content});
        }

        // create & save the squeak to storage
        squeaks[_nextTokenId()] = Squeak(
            block.number,
            msg.sender,
            msg.sender,
            content
        );

        emit SqueakCreated(msg.sender, _nextTokenId(), block.number, content);

        return _nextTokenId();
    }

    /**
     * @dev Deletes a squeak at `tokenId` from storage. Emits a {SqueakDeleted}
     * event.
     * @param tokenId Numerical ID of the squeak to delete.
     */
    function _deleteSqueak(uint256 tokenId) internal {
        // delete squeak
        delete squeaks[tokenId];

        // delete associated sentiment
        delete likes[tokenId];
        delete dislikes[tokenId];
        delete resqueaks[tokenId];

        if (viralSqueaks.contains(tokenId)) {
            // remove from viralSqueaks set
            viralSqueaks.remove(tokenId);

            // delete associated scout info
            delete scouts[tokenId];
            delete scoutPools[tokenId];

            // pay all scouts any remaining funds
            if (scoutPools[tokenId].amount > 0) {
                _makeScoutPayments(tokenId, _getPoolUnit(tokenId));
            }
        }

        // recieve payment
        _deposit(msg.value);

        emit SqueakDeleted(msg.sender, tokenId);
    }

    /**
     * @dev Dislikes a squeak at `tokenId` by depositing the platformFee
     * into the treasury. Emits a {SqueakDisliked} event.
     * @param tokenId Numerical ID of the squeak to dislike.
     */
    function _dislikeSqueak(uint256 tokenId) internal {
        // ensure account has not already disliked the squeak
        if (dislikes[tokenId].contains(msg.sender)) {
            revert AlreadyDisliked({account: msg.sender, tokenId: tokenId});
        }

        // first remove them from likers set if they're in there
        if (likes[tokenId].contains(msg.sender)) {
            likes[tokenId].remove(msg.sender);
        }

        // then add them to the likers set
        dislikes[tokenId].add(msg.sender);

        // deposit fee into the treasury
        _deposit(msg.value);

        emit SqueakDisliked(msg.sender, tokenId);
    }

    /**
     * @dev Gets the rate of virality percent at the current block for a
     * particular squeak.
     * @param blockDelta Number of blocks elapse since the squeak was authored.
     * @param dislikes Number of dislikes of a particular squeak.
     * @param likes Number of likes of a particular squeak.
     * @param resqueaks Number of resqueaks of a particular squeak.
     * @return A value between 0-100 representing the virality of the squeak.
     */
    function _getViralityScore(
        uint256 blockDelta,
        uint256 dislikes,
        uint256 likes,
        uint256 resqueaks
    ) internal pure returns (uint64) {
        // ensure no division by zero when taking the ratio of likes:dislikes
        if (dislikes == 0) dislikes = 1;

        // convert values to signed int128 for 64.64 fixed point calculations
        int128 signedLikes = likes.fromUInt();
        int128 signedDislikes = dislikes.fromUInt();
        int128 signedResqueaks = resqueaks.fromUInt();
        int128 signedBlockDelta = blockDelta.fromUInt();

        // calculate each virality component
        int128 ratio = signedLikes.div(signedDislikes).sqrt();
        int128 total = signedLikes.add(signedDislikes).ln();
        int128 amplifier = signedResqueaks.ln().div(signedResqueaks);

        // multiply all components to get the order
        int128 order = ratio.mul(total).mul(amplifier);

        // determine coefficient based on the order
        int128 coefficient = order != 0
            ? 1.fromUInt().div(order)
            : 0.fromUInt();

        // calculate final virality score
        int128 numerator = 1000.fromUInt();
        int128 denominator = signedBlockDelta.add(coefficient).add(
            10.fromUInt()
        );
        int128 score = numerator.div(denominator);

        // convert back to uint64
        return score.toUInt();
    }

    /**
     * @dev transfers platformFee from msg.sender to `tokenId` squeak owner.
     * Also adds fee to treasury from platformFee.Emits a {SqueakLiked} event.
     * @param tokenId ID of the squeak to "like".
     */
    function _likeSqueak(uint256 tokenId) internal {
        // ensure account has not already liked the squeak
        if (likes[tokenId].contains(msg.sender)) {
            revert AlreadyLiked({account: msg.sender, tokenId: tokenId});
        }

        // first remove them from dislikers set if they're in there
        if (dislikes[tokenId].contains(msg.sender)) {
            dislikes[tokenId].remove(msg.sender);
        }

        // then add them to the likers set
        likes[tokenId].add(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.Like);

        emit SqueakLiked(msg.sender, tokenId);
    }

    /**
     * @dev transfers platformFee from msg.sender to `tokenId` squeak owner.
     * Also adds fee to treasury from platformFee. Emits a {Resqueaked}
     * event.
     * @param tokenId ID of the squeak to "resqueak".
     */
    function _resqueak(uint256 tokenId) internal {
        // revert if the account has already resqueaked it
        if (resqueaks[tokenId].contains(msg.sender)) {
            revert AlreadyResqueaked({account: msg.sender, tokenId: tokenId});
        }

        // add them to the resqueakers
        resqueaks[tokenId].add(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.Resqueak);

        emit Resqueaked(msg.sender, tokenId);
    }

    /**
     * @dev Removes the sender from the dislikes set of the squeak at `tokenId`,
     * and deposits the platformFee into the treasury.
     * @param tokenId ID of the squeak to undo the dislike of.
     */
    function _undoDislikeSqueak(uint256 tokenId) internal {
        // ensure sender has already disliked the squeak
        if (!dislikes[tokenId].contains(msg.sender)) {
            revert NotDislikedYet({account: msg.sender, tokenId: tokenId});
        }

        // remove the caller from the dislikers set of the squeak
        dislikes[tokenId].remove(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.UndoDislike);

        emit SqueakUndisliked(msg.sender, tokenId);
    }

    /**
     * @dev Removes the sender from the likes set of the squeak at `tokenId`,
     * and deposits the platformFee into the treasury.
     * @param tokenId ID of the squeak to undo the like of.
     */
    function _undoLikeSqueak(uint256 tokenId) internal {
        // ensure sender has already liked the squeak
        if (!likes[tokenId].contains(msg.sender)) {
            revert NotLikedYet({account: msg.sender, tokenId: tokenId});
        }

        // remove the caller from the likers set of the squeak
        likes[tokenId].remove(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.UndoLike);

        emit SqueakUnliked(msg.sender, tokenId);
    }

    /**
     * @dev Deposits the platformFee into the treasury.
     * @param tokenId ID of the squeak to undo the reqsqueak of.
     */
    function _undoResqueak(uint256 tokenId) internal {
        // revert if the account hasn't already resqueaked it
        if (!resqueaks[tokenId].contains(msg.sender)) {
            revert NotResqueakedYet({account: msg.sender, tokenId: tokenId});
        }

        resqueaks[tokenId].remove(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.UndoResqueak);

        emit SqueakUnresqueaked(msg.sender, tokenId);
    }

    /**
     * @dev Updates the scout level for an account and adds them to the scouts
     * list for a particular token.
     * @param _address Account to add to scouts list for tokenId.
     * @param tokenId ID of the squeak to add the user to the scouts list of.
     */
    function _addScout(address _address, uint256 tokenId) private {
        // upgrade their scout level
        users[_address].scoutLevel++;

        // add them to the scouts list for the squeak
        scouts[tokenId].add(_address);
    }

    /**
     * @dev Checks if a squeak is viral. If it is not, and the current virlality
     * score brings it past the threshold, it marks it as such.
     * @param tokenId ID of the squeak to check virality of.
     */
    function _checkVirality(uint256 tokenId) private {
        if (
            !viralSqueaks.contains(tokenId) &&
            getViralityScore(tokenId) >= viralityThreshold
        ) {
            _markViral(tokenId);
        }
    }

    /**
     * @dev Adds a squeak to the list of viral squeaks, and all of its positive
     * interactors to a list of scouts while upgrading their scout levels. This
     * called when the squeaks virality crosses the threshold.
     * @param tokenId ID of the squeak to add the list of viral squeaks.
     */
    function _markViral(uint256 tokenId) private {
        // add squeak to list of viral squeaks
        viralSqueaks.add(tokenId);

        // give the user who pushed the squeak into virality a bonus upgrade of
        // their scout level
        users[msg.sender].scoutLevel += 4;

        // initialize a scout pool in memory
        ScoutPool memory pool;

        // get the upper bound of the larger set of positive interactions
        uint256 likesCount = likes[tokenId].length();
        uint256 resqueaksCount = resqueaks[tokenId].length();
        uint256 upperBound = likesCount > resqueaksCount
            ? likesCount
            : resqueaksCount;

        // iterate over both sets & add all unique addresses to the scouts list
        // TODO: move this unbounded loop off-chain
        for (uint256 index = 0; index < upperBound; index++) {
            // add all likers to the list of scouts list
            if (index < likesCount) {
                _addScout(likes[tokenId].at(index), tokenId);
                pool.levelTotal += users[likes[tokenId].at(index)].scoutLevel;
            }

            // add all resqueakers to the list of scouts who aren't likers
            if (
                index < resqueaksCount &&
                !scouts[tokenId].contains(resqueaks[tokenId].at(index))
            ) {
                _addScout(resqueaks[tokenId].at(index), tokenId);
                pool.levelTotal += users[resqueaks[tokenId].at(index)]
                    .scoutLevel;
            }
        }

        // save scout pool to storage
        scoutPools[tokenId] = pool;
    }
}
