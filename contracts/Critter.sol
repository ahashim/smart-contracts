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

// 3rd party contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';

// Critter contracts
import './Accountable.sol';
import './Squeakable.sol';

/**
 * @title Critter: a microblogging platform where each post is an ERC721 token.
 * @author Ahmed Hashim <ahashim@users.noreply.github.com>
 * @dev Core concepts:
 *      - Every address is a unique username.
 *      - Every post, called a "Squeak" is an NFT.
 *      - Actions, such as "favorite" & "resqueak", cost a fee.
 *      - Fees are paid out to the owner of said squeak (not necessarily the
 *        original author).
 *      - Squeaks can be bought & sold via a bidding price discovery mechanism.
 *      - Once an author sells their squeak, the ownership is transferred to a
 *        new user.
 *      - Only owners can delete squeaks.
 *      - Deleting a squeak costs a fee of `blocks elapsed x deletion fee`.
 *      - Every squeak has a "virality" coefficient that is tracked on-chain.
 *      - When a squeak goes "viral", future profits from that point on are
 *        split among the owner and those who helped it go viral (likers &
 *        resqueakers).
 */

contract Critter is
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    Accountable,
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
     * @param fee Fee amount in wei to charge per interaction.
     * @param takeRate Percentage of `fee` deposited into the treasury.
     * @param poolThresh Minimum amount of wei required to pay out a scout pool.
     * @param viralityThresh Minimum score that a squeak must have for virality.
     */
    function initialize(
        string calldata name,
        string calldata symbol,
        string calldata baseURI,
        uint256 fee,
        uint256 takeRate,
        uint256 poolThresh,
        uint8 viralityThresh
    ) public initializerERC721A initializer {
        // 3rd party
        __ERC721A_init(name, symbol);
        __Pausable_init();
        __ReentrancyGuard_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // Storage
        __Typeable_init();
        __Immutable_init();
        __Mappable_init();
        __Storeable_init(baseURI, fee, takeRate, poolThresh, viralityThresh);

        // Logic
        __Accountable_init();
        __Bankable_init();
        __Squeakable_init();
    }

    /**
     * @dev See {IERC721AUpgradeable-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, ERC721AUpgradeable)
        returns (bool)
    {
        return
            ERC721AUpgradeable.supportsInterface(interfaceId) ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {IERC721AUpgradeable-tokenURI}.
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
     * @dev Pauses the contract.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the contract.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Creates a Critter account.
     * @param username Username for the account.
     */
    function createAccount(string calldata username)
        external
        whenNotPaused
        isValidUsername(username)
    {
        _createAccount(username);
    }

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
        _createSqueak(content);
        _mint(msg.sender, 1);
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

        _burn(tokenId);
    }

    /**
     * @dev Dislikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function dislikeSqueak(uint256 tokenId)
        external
        payable
        whenNotPaused
        hasAccount
        squeakExists(tokenId)
        hasEnoughFunds
        nonReentrant
    {
        _dislikeSqueak(tokenId);
    }

    /**
     * @dev Gets the price of deleting a squeak based on its age.
     * @param tokenId ID of the squeak to delete.
     * @param confirmationThreshold The number of future blocks that the delete
     *      will potentially occur in. Required to give a mostly correct
     *      price estimate assuming the transaction will get mined within that
     *      range. 6 blocks is connsidered a good default.
     * @return Price of deleting the squeak in wei.
     */
    function getDeleteFee(uint256 tokenId, uint256 confirmationThreshold)
        public
        view
        squeakExists(tokenId)
        returns (uint256)
    {
        return _getDeleteFee(tokenId, confirmationThreshold);
    }

    /**
     * @dev Likes a squeak.
     * @param tokenId ID of the squeak.
     */
    function likeSqueak(uint256 tokenId)
        external
        payable
        whenNotPaused
        hasAccount
        hasEnoughFunds
        squeakExists(tokenId)
        nonReentrant
    {
        _likeSqueak(tokenId);
    }

    /**
     * @dev Resqueaks a squeak.
     * @param tokenId ID of the squeak.
     */
    function resqueak(uint256 tokenId)
        external
        payable
        whenNotPaused
        hasAccount
        hasEnoughFunds
        squeakExists(tokenId)
        nonReentrant
    {
        _resqueak(tokenId);
    }

    /**
     * @dev Updates an accounts username.
     * @param newUsername The text of the new username.
     */
    function updateUsername(string calldata newUsername)
        external
        whenNotPaused
        hasAccount
        isValidUsername(newUsername)
    {
        _updateUsername(newUsername);
    }

    /**
     * @dev Undislikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function undoDislikeSqueak(uint256 tokenId)
        external
        payable
        whenNotPaused
        hasAccount
        hasEnoughFunds
        squeakExists(tokenId)
        nonReentrant
    {
        _undoDislikeSqueak(tokenId);
    }

    /**
     * @dev Unlikes a squeak.
     * @param tokenId ID of the squeak.
     */
    function undoLikeSqueak(uint256 tokenId)
        external
        payable
        whenNotPaused
        hasAccount
        hasEnoughFunds
        squeakExists(tokenId)
        nonReentrant
    {
        _undoLikeSqueak(tokenId);
    }

    /**
     * @dev Undoes a resqueak.
     * @param tokenId ID of the squeak.
     */
    function undoResqueak(uint256 tokenId)
        external
        payable
        whenNotPaused
        hasAccount
        hasEnoughFunds
        squeakExists(tokenId)
        nonReentrant
    {
        _undoResqueak(tokenId);
    }

    /**
     * @dev Transfers out funds from the treasury.
     * @param to Address of the account where the funds will go.
     * @param amount Amount to withdraw in wei.
     */
    function withdraw(address to, uint256 amount)
        external
        payable
        onlyRole(TREASURER_ROLE)
    {
        _withdraw(to, amount);
    }

    /* solhint-disable no-empty-blocks */
    /**
     * @dev Reverts when `msg.sender` is not authorized to upgrade the contract.
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
     * @dev See {IERC721AUpgradeable-_baseURI}.
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
     * @dev Burns `tokenId`. See {IERC721AUpgradeable-_burn}.
     * @notice The caller must own `tokenId` or be an approved operator.
     */
    function _burn(uint256 tokenId) internal override(ERC721AUpgradeable) {
        super._burn(tokenId);

        // delete the squeak from storage
        _deleteSqueak(tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     *      and burning. Calling conditions:
     *      - When `from` and `to` are both non-zero, ``from``'s `tokenId` will
     *      be transferred to `to`.
     *      - When `from` is zero, `tokenId` will be minted for `to`.
     *      - When `to` is zero, ``from``'s `tokenId` will be burned.
     *      - `from` and `to` are never both zero.
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
    ) internal override(ERC721AUpgradeable) {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
    }

    /**
     * @dev Hook that is called after a set of serially-ordered token ids have
     *      been transferred. This includes minting. And also called after one
     *      token has been burned. Calling conditions:
     *      - When `from` and `to` are both non-zero, `from`'s `tokenId` has
     *        been transferred to `to`.
     *      - When `from` is zero, `tokenId` has been minted for `to`.
     *      - When `to` is zero, `tokenId` has been burned by `from`.
     *      - `from` and `to` are never both zero.
     * @param from Address of the account that is relinquishing ownership of the
     *      token.
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
        squeaks[startTokenId].owner = to;
    }
}
