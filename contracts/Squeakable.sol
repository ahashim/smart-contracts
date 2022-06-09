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
 * @dev A contract to handle actions performed on a Squeak.
 */
contract Squeakable is ERC721AUpgradeable, Storeable, Bankable {
    using ABDKMath64x64 for *;
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
    event SqueakUnresqueaked(address indexed sender, uint256 tokenId);

    /**
     * @dev Ensure squeak exists.
     * @param tokenId ID of the squeak.
     */
    modifier squeakExists(uint256 tokenId) {
        if (!_exists(tokenId)) {
            revert SqueakDoesNotExist({tokenId: tokenId});
        }
        _;
    }

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Squeakable_init() internal view onlyInitializing {}

    /**
     * @dev Gets the number of dislikes for a squeak.
     * @param tokenId ID of the squeak.
     * @notice The token must exist.
     */
    function getDislikeCount(uint256 tokenId) public view returns (uint256) {
        return dislikes[tokenId].length();
    }

    /**
     * @dev Gets the number of likes for a squeak.
     * @param tokenId ID of the squeak.
     * @notice The token must exist.
     */
    function getLikeCount(uint256 tokenId) public view returns (uint256) {
        return likes[tokenId].length();
    }

    /**
     * @dev Gets the number of resqueaks for a squeak.
     * @param tokenId ID of the squeak.
     * @notice The token must exist.
     */
    function getResqueakCount(uint256 tokenId) public view returns (uint256) {
        return resqueaks[tokenId].length();
    }

    /**
     * @dev Gets the virality score of a squeak.
     * @param tokenId ID of the squeak.
     * @return A value between 0-100 representing the virality of the squeak.
     * @notice The token must exist.
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

        // squeak needs to have at least 1 like and 1 resqueak to be considered
        return
            likes > 0 && resqueaks > 0
                ? _getViralityScore(blockDelta, dislikes, likes, resqueaks)
                : 0;
    }

    /**
     * @dev Creates a squeak.
     * @param content Text content of the squeak.
     * @return ID of the squeak.
     * @notice Content must be between 0 and 256 bytes in length.
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

        uint256 tokenId = _nextTokenId();

        // create & save the squeak to storage
        squeaks[tokenId] = Squeak(
            block.number,
            msg.sender,
            msg.sender,
            content
        );

        emit SqueakCreated(msg.sender, tokenId, block.number, content);

        return _nextTokenId();
    }

    /**
     * @dev Deletes a squeak & its associated information.
     * @param tokenId ID of the squeak.
     */
    function _deleteSqueak(uint256 tokenId) internal {
        // delete squeak
        delete squeaks[tokenId];

        // delete associated sentiment
        delete likes[tokenId];
        delete dislikes[tokenId];
        delete resqueaks[tokenId];

        if (viralSqueaks.contains(tokenId)) {
            // pay all scouts any remaining funds
            if (scoutPools[tokenId].amount > 0) {
                _makeScoutPayments(tokenId, _getPoolUnit(tokenId));
            }

            // delete associated scout info
            delete scouts[tokenId];
            delete scoutPools[tokenId];

            // remove from viralSqueaks set
            viralSqueaks.remove(tokenId);
        }

        // recieve payment
        _deposit(msg.value);

        emit SqueakDeleted(msg.sender, tokenId);
    }

    /**
     * @dev Dislikes a squeak.
     * @param tokenId ID of the squeak.
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

        // then add them to the dislikers set
        dislikes[tokenId].add(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.Dislike);

        emit SqueakDisliked(msg.sender, tokenId);
    }

    /**
     * @dev Gets the virality score of a squeak.
     * @param blockDelta Number of blocks elapsed since the squeak was created.
     * @param dislikes Number of dislikes.
     * @param likes Number of likes.
     * @param resqueaks Number of resqueaks.
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
     * @dev Likes a squeak.
     * @param tokenId ID of the squeak.
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
     * @dev Resqueaks a squeak.
     * @param tokenId ID of the squeak.
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
     * @dev Undislikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function _undoDislikeSqueak(uint256 tokenId) internal {
        // ensure the user has disliked the squeak
        if (!dislikes[tokenId].contains(msg.sender)) {
            revert NotDislikedYet({account: msg.sender, tokenId: tokenId});
        }

        // remove them from dislikers
        dislikes[tokenId].remove(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.UndoDislike);

        emit SqueakUndisliked(msg.sender, tokenId);
    }

    /**
     * @dev Unlikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function _undoLikeSqueak(uint256 tokenId) internal {
        // ensure the user has liked the squeak
        if (!likes[tokenId].contains(msg.sender)) {
            revert NotLikedYet({account: msg.sender, tokenId: tokenId});
        }

        // remove them from the likers
        likes[tokenId].remove(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.UndoLike);

        emit SqueakUnliked(msg.sender, tokenId);
    }

    /**
     * @dev Undoes a resqueak.
     * @param tokenId ID of the squeak.
     */
    function _undoResqueak(uint256 tokenId) internal {
        // ensure the user has resqueaked the squeak
        if (!resqueaks[tokenId].contains(msg.sender)) {
            revert NotResqueakedYet({account: msg.sender, tokenId: tokenId});
        }

        // remove them from the resqueakers
        resqueaks[tokenId].remove(msg.sender);

        _checkVirality(tokenId);
        _makePayment(tokenId, Interaction.UndoResqueak);

        emit SqueakUnresqueaked(msg.sender, tokenId);
    }

    /**
     * @dev Updates the scout level for an account, and adds them to the scout
     *      pool of a viral squeak.
     * @param account Account to add to scouts list for tokenId.
     * @param tokenId ID of the viral squeak.
     */
    function _addScout(address account, uint256 tokenId) private {
        // upgrade their scout level
        users[account].scoutLevel++;

        // add them to the scout pool for the squeak
        scouts[tokenId].add(account);
    }

    /**
     * @dev Checks if a squeak is viral. If it is not, and the current virlality
     *      score brings it past the threshold, it marks it as such.
     * @param tokenId ID of the squeak.
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
     *      interactors to a scout pool while upgrading their scout levels.
     * @param tokenId ID of the squeak.
     */
    function _markViral(uint256 tokenId) private {
        // add squeak to the list of viral squeaks
        viralSqueaks.add(tokenId);

        // give the user who pushed the squeak into virality & the squeak owner
        // a bonus upgrade to their scout level.
        users[msg.sender].scoutLevel += 4;
        users[squeaks[tokenId].owner].scoutLevel += 4;

        // initialize a scout pool
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

        // save the pool to storage
        scoutPools[tokenId] = pool;
    }
}
