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
import '@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol';

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
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    AccessControlEnumerableUpgradeable,
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
    /* solhint-disable func-name-mixedcase, no-empty-blocks */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /* solhint-enable func-name-mixedcase, no-empty-blocks */

    /**
     * @dev Upgradeable "constructor" function to initialize sub-contracts.
     * @param name Contract name (Critter).
     * @param symbol Contract symbol (CRTTR).
     * @param baseURI Prefix for all token URI's (https://critter.fyi/token).
     * @param platformCharge Fee amount in wei to charge per interaction.
     * @param platformFeePercent Fee in percent of interaction amount to add to
     * the treasury.
     */
    function initialize(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 platformCharge,
        uint256 platformFeePercent
    ) public initializer {
        // Open Zeppelin contracts
        __ERC721_init(name, symbol);
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // Critter contracts
        __Typeable_init();
        __Immutable_init();
        __Mappable_init();
        __Storeable_init(baseURI, platformCharge, platformFeePercent);
        __Accountable_init();
        __Bankable_init();
        __Squeakable_init();
    }

    /**
     * @dev Check if squeak exists at `tokenId`.
     */
    modifier squeakExists(uint256 tokenId) {
        require(
            _exists(tokenId),
            'Critter: cannot calculate fee for nonexistent token'
        );
        _;
    }

    /**
     * @dev See {IERC165Upgradeable-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(
            ERC721Upgradeable,
            ERC721EnumerableUpgradeable,
            IERC165Upgradeable,
            AccessControlEnumerableUpgradeable
        )
        returns (bool)
    {
        return
            interfaceId == type(ICritter).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721MetadataUpgradeable-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
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
        payable
        override(ICritter)
        whenNotPaused
        isValidUsername(username)
    {
        // ensure address is not registered
        require(
            bytes(usernames[msg.sender]).length == 0,
            'Critter: account already exists'
        );

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
        // validate & save content to storage, then generate token ID & URI
        (uint256 tokenId, string memory tokenUri) = _createSqueak(content);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenUri);
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
    {
        require(
            _isApprovedOrOwner(msg.sender, tokenId),
            'Critter: not approved to delete squeak'
        );

        uint256 currentBlockDeleteFee = getDeleteFee(tokenId, 0);

        require(
            msg.value >= currentBlockDeleteFee,
            'Critter: not enough funds to perform action'
        );

        // recieve payment
        _deposit(msg.value);

        // burn the token
        _burn(tokenId);

        // delete the squeak from storage
        _deleteSqueak(tokenId);
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
     * @dev See {ICritter-likeSqueak}.
     */
    function likeSqueak(uint256 tokenId)
        public
        payable
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
        hasEnoughFunds(msg.value, PLATFORM_CHARGE)
        squeakExists(tokenId)
        nonReentrant
    {
        _likeSqueak(tokenId);
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
        override(ERC721Upgradeable)
        returns (string memory)
    {
        return baseTokenURI;
    }

    /**
     * @dev Burns `tokenId`. See {ERC721Upgradeable-_burn}.
     *
     * @notice Requirements:
     *  - The caller must own `tokenId` or be an approved operator.
     */
    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning. Calling conditions:
     *  - When `from` and `to` are both non-zero, ``from``'s `tokenId` will
     *  be transferred to `to`.
     *  - When `from` is zero, `tokenId` will be minted for `to`.
     *  - When `to` is zero, ``from``'s `tokenId` will be burned.
     *  - `from` and `to` are never both zero.
     * @param from Address of the account that is relinquishing ownership of the
     * token.
     * @param to Address of the account that is gaining ownership of the token.
     * @param tokenId ID of the token to transfer.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId);
        _transferSqueakOwnership(to, tokenId);
    }
}
