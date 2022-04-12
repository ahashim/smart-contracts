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

// Interfaces
import './interfaces/ICritter.sol';

// Open Zeppelin Contracts
import '@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol';

// Critter Contracts
import './Accountable.sol';
import './Immutable.sol';
import './Mappable.sol';
import './Squeakable.sol';
import './Storeable.sol';
import './Structable.sol';

/**
 * @dev Critter: a microblogging platform where each post is
 *      an {ERC721} token. Functionality includes:
 *
 *      - ability for holders to burn (destroy) their tokens
 *      - a minter role that allows for token minting (creation)
 *      - a pauser role that allows to stop all token transfers
 *      - an upgader role that allows an address to upgrade the contract
 *      - token ID and URI autogeneration
 *
 *      This contract uses {AccessControlEnumerable} to lock permissioned
 *      functions using the different roles - head to its documentation for
 *      details.
 */
contract Critter is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    PausableUpgradeable,
    AccessControlEnumerableUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable,
    Structable,
    Immutable,
    Mappable,
    Storeable,
    Accountable,
    Squeakable,
    ICritter
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` `UPGRADER_ROLE`, and
     *      `PAUSER_ROLE` to the account that deploys the contract.
     *
     *      Token URIs will be autogenerated based on `baseTokenURI` and their
     *      token IDs.
     */
    function initialize(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) public initializer {
        // base Open Zeppelin contracts
        __ERC721_init(name, symbol);
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();

        // base Critter contracts
        __Structable_init();
        __Immutable_init();
        __Mappable_init();
        __Storeable_init(baseTokenURI);
        __Accountable_init();
        __Squeakable_init();
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
        override(ICritter)
        whenNotPaused
        noAccount(msg.sender)
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
        override(ICritter)
        whenNotPaused
        hasAccount(msg.sender)
    {
        // validate sender owns the token & burn it
        burn(tokenId);

        // delete from storage
        _deleteSqueak(tokenId);
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
     * @dev Function that should revert when `msg.sender` is not authorized to
     *      upgrade the contract.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        view
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /**
     * @dev See {IERC721Upgradeable-_baseURI}.
     */
    function _baseURI()
        internal
        view
        override(ERC721Upgradeable)
        returns (string memory)
    {
        return _baseTokenURI;
    }

    /**
     * @dev Burns `tokenId`. See {ERC721Upgradeable-_burn}.
     *
     *      Requirements:
     *
     *      - The caller must own `tokenId` or be an approved operator.
     */
    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     *      and burning.
     *
     *      Calling conditions:
     *
     *      - When `from` and `to` are both non-zero, ``from``'s `tokenId` will
     *      be transferred to `to`.
     *      - When `from` is zero, `tokenId` will be minted for `to`.
     *      - When `to` is zero, ``from``'s `tokenId` will be burned.
     *      - `from` and `to` are never both zero.
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
    }
}
