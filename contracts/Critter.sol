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

// interfaces
import './interfaces/ICritter.sol';

// Open Zeppelin contracts
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import 'erc721a-upgradeable/contracts/ERC721AUpgradeable.sol';
import 'erc721a-upgradeable/contracts/extensions/ERC721APausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';

// Critter contracts
import './Accountable.sol';
import './Bankable.sol';
import './Squeakable.sol';
import './storage/Immutable.sol';
import './storage/Mappable.sol';
import './storage/Storeable.sol';
import './storage/Typeable.sol';

/**
 * @title Critter: a microblogging platform where each post is an ERC721 token.
 * @author Ahmed Hashim <ahashim@users.noreply.github.com>
 *
 * @dev Core concepts:
 *
 *  - Every address is a unique username.
 *  - Every post, called a "Squeak" is an NFT.
 *  - Actions, such as "favorite" & "resqueak", cost a fee.
 *  - Fees are paid out to the owner of said squeak (not necessarily the
 *    original author).
 *  - Squeaks can be bought & sold via a bidding price discovery mechanism.
 *  - Once an author sells their squeak, the ownership is transferred to a
 *    new user.
 *  - Only owners can delete squeaks.
 *  - Deleting a squeak costs a fee of `blocks elapsed x deletion fee`.
 */
contract Critter is
    Initializable,
    ERC721APausableUpgradeable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ICritter,
    Typeable,
    Immutable,
    Mappable,
    Storeable,
    Accountable,
    Bankable,
    Squeakable
{
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /* solhint-disable func-name-mixedcase, no-empty-blocks */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /* solhint-enable func-name-mixedcase, no-empty-blocks */

    /**
     * @dev Upgradeable "constructor" function to initialize sub-contracts.
     * @param name Contract name (Critter).
     * @param symbol Contract symbol (CRTTR).
     * @param baseURI Prefix for all token URI's (https://critter.fyi/token).
     * @param fee Fee amount in wei to charge per interaction.
     * @param feePercent Fee in percent of `fee` deposited into treasury.
     * the treasury.
     */
    function initialize(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 fee,
        uint256 feePercent
    ) public initializer {
        __ERC721A_init(name, symbol);
        __ERC721APausable_init();
        __ReentrancyGuard_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // Critter contracts
        __Typeable_init();
        __Immutable_init();
        __Mappable_init();
        __Storeable_init(baseURI, fee, feePercent);
        __Accountable_init();
        __Bankable_init();
        __Squeakable_init();
    }

    /**
     * @dev See {IERC165Upgradeable-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(
            AccessControlUpgradeable,
            ERC721AUpgradeable,
            IERC165Upgradeable
        )
        returns (bool)
    {
        return
            interfaceId == type(ICritter).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721A-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721AUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev See {ICritter-pause}.
     */
    function pause() public override(ICritter) onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev See {ICritter-unpause}.
     */
    function unpause() public override(ICritter) onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev See {ICritter-createAccount}.
     */
    function createAccount(string memory username)
        public
        override(ICritter)
        whenNotPaused
        isValidUsername(username)
    {
        _createAccount(username);
    }

    /**
     * @dev See {ICritter-createSqueak}.
     */
    function createSqueak(string memory content)
        public
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        onlyRole(MINTER_ROLE)
    {
        _createSqueak(content);
        _mint(msg.sender, 1, '', true);
    }

    /**
     * @dev See {ICritter-deleteSqueak}.
     */
    function deleteSqueak(uint256 tokenId)
        public
        payable
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        squeakExists(tokenId)
        nonReentrant
    {
        address owner = ownerOf(tokenId);

        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender)) {
            revert NotApprovedOrOwner({sender: msg.sender});
        }

        uint256 currentBlockDeleteFee = getDeleteFee(tokenId, 0);

        if (msg.value < currentBlockDeleteFee) {
            revert InsufficientFunds({
                available: msg.value,
                required: currentBlockDeleteFee
            });
        }

        // burn the squeak
        _burn(tokenId);
    }

    /**
     * @dev See {ICritter-dislikeSqueak}.
     */
    function dislikeSqueak(uint256 tokenId)
        public
        payable
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        squeakExists(tokenId)
        hasEnoughFunds(msg.value, platformFee)
        nonReentrant
    {
        _dislikeSqueak(tokenId);
    }

    /**
     * @dev See {ICritter-getDeleteFee}.
     */
    function getDeleteFee(uint256 tokenId, uint256 blockConfirmationThreshold)
        public
        view
        override(ICritter)
        squeakExists(tokenId)
        returns (uint256)
    {
        return _getDeleteFee(tokenId, blockConfirmationThreshold);
    }

    /**
     * @dev See {ICritter-getLikeCount}.
     */
    function getLikeCount(uint256 tokenId)
        external
        view
        override(ICritter)
        returns (uint256)
    {
        EnumerableSetUpgradeable.AddressSet storage likers = likes[tokenId];

        return likers.length();
    }

    /**
     * @dev See {ICritter-getDislikeCount}.
     */
    function getDislikeCount(uint256 tokenId)
        external
        view
        override(ICritter)
        returns (uint256)
    {
        EnumerableSetUpgradeable.AddressSet storage dislikers = dislikes[
            tokenId
        ];

        return dislikers.length();
    }

    /**
     * @dev See {ICritter-likeSqueak}.
     */
    function likeSqueak(uint256 tokenId)
        public
        payable
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        hasEnoughFunds(msg.value, platformFee)
        squeakExists(tokenId)
        nonReentrant
    {
        _likeSqueak(tokenId);
    }

    /**
     * @dev See {ICritter-resqueak}.
     */
    function resqueak(uint256 tokenId)
        public
        payable
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        hasEnoughFunds(msg.value, platformFee)
        squeakExists(tokenId)
        nonReentrant
    {
        _resqueak(tokenId);
    }

    /**
     * @dev See {ICritter-updateUsername}.
     */
    function updateUsername(string memory username)
        public
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        isValidUsername(username)
    {
        _updateUsername(username);
    }

    /**
     * @dev See {ICritter-undoDislikeSqueak}.
     */
    function undoDislikeSqueak(uint256 tokenId)
        public
        payable
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        hasEnoughFunds(msg.value, platformFee)
        squeakExists(tokenId)
        nonReentrant
    {
        _undoDislikeSqueak(tokenId);
    }

    /**
     * @dev See {ICritter-undoLikeSqueak}.
     */
    function undoLikeSqueak(uint256 tokenId)
        public
        payable
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        hasEnoughFunds(msg.value, platformFee)
        squeakExists(tokenId)
        nonReentrant
    {
        _undoLikeSqueak(tokenId);
    }

    /* solhint-disable no-empty-blocks */
    /**
     * @dev Function that should revert when `msg.sender` is not authorized to
     * upgrade the contract.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        view
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /* solhint-enable no-empty-blocks */

    /**
     * @dev See {IERC721Upgradeable-_baseURI}.
     */
    function _baseURI()
        internal
        view
        override(ERC721AUpgradeable)
        returns (string memory)
    {
        return baseTokenURI;
    }

    /**
     * @dev Burns `tokenId`. See {ERC721AUpgradeable-_burn}.
     *
     * @notice Requirements:
     *  - The caller must own `tokenId` or be an approved operator.
     */
    function _burn(uint256 tokenId) internal override(ERC721AUpgradeable) {
        super._burn(tokenId);

        // delete the squeak from storage
        _deleteSqueak(tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning. Calling conditions:
     *  - When `from` and `to` are both non-zero, ``from``'s `tokenId` will
     *  be transferred to `to`.
     *  - When `from` is zero, `tokenId` will be minted for `to`.
     *  - When `to` is zero, ``from``'s `tokenId` will be burned.
     *  - `from` and `to` are never both zero.
     *
     * @param from Address of the account that is relinquishing ownership of the
     * token.
     * @param to Address of the account that is gaining ownership of the token.
     * @param startTokenId The first token id to be transferred.
     * @param quantity The amount to be transferred.
     */
    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal override(ERC721AUpgradeable, ERC721APausableUpgradeable) {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
    }

    /**
     * @dev Hook that is called after a set of serially-ordered token ids have
     * been transferred. This includes minting. And also called after one token
     * has been burned. Calling conditions:
     *  - When `from` and `to` are both non-zero, `from`'s `tokenId` has been
     *  transferred to `to`.
     *  - When `from` is zero, `tokenId` has been minted for `to`.
     *  - When `to` is zero, `tokenId` has been burned by `from`.
     *  - `from` and `to` are never both zero.
     * @param from Address of the account that is relinquishing ownership of the
     * token.
     * @param to Address of the account that is gaining ownership of the token.
     * @param startTokenId The first token id to be transferred.
     * @param quantity The amount to be transferred.
     */
    function _afterTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal override(ERC721AUpgradeable) {
        super._afterTokenTransfers(from, to, startTokenId, quantity);
        _transferSqueakOwnership(to, startTokenId);
    }
}
