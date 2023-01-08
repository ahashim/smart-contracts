// SPDX-License-Identifier: Apache-2.0
/*

   Copyright 2023 Critter

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
pragma solidity 0.8.17;

// 3rd party contracts
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import 'erc721a-upgradeable/contracts/ERC721AUpgradeable.sol';

// errors
import './Errors.sol';

// interface
import './interfaces/ISqueakable.sol';

/**
 * @title Squeakable
 * @author Ahmed Hashim <ahashim@users.noreply.github.com>
 * @dev An upgradeable contract to allow for minting and burning ERC721 tokens
 *      via the main Critter contract.
 */
contract Squeakable is
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ERC721AUpgradeable,
    ISqueakable
{
    /**
     * @dev Token URL prefix used by squeaks.
     */
    string public baseTokenURI;

    /**
     * @dev BURNER_ROLE has priviledges to burn tokens.
     */
    bytes32 private constant BURNER_ROLE = keccak256('BURNER_ROLE');

    /**
     * @dev MINTER_ROLE has priviledges to mint tokens.
     */
    bytes32 private constant MINTER_ROLE = keccak256('MINTER_ROLE');

    /**
     * @dev UPGRADER_ROLE has priviledges to upgrade the contract.
     */
    bytes32 private constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');

    /**
     * @dev Mapping of tokenId <=> Squeak.
     */
    mapping(uint256 => Squeak) public squeaks;

    /* solhint-disable func-name-mixedcase, no-empty-blocks */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /* solhint-enable func-name-mixedcase, no-empty-blocks */

    /**
     * @dev See {ISqueakable-initialize}.
     */
    function initialize(
        address critterContract
    ) public initializerERC721A initializer {
        // init 3rd party contracts
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ERC721A_init('Critter', 'CRTTR');

        // set base token url
        baseTokenURI = 'https://critter.fyi/token/';

        // admin roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        // contract roles
        _grantRole(MINTER_ROLE, critterContract);
        _grantRole(BURNER_ROLE, critterContract);
    }

    /**
     * @dev See {ISqueakable-exists}.
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    /**
     * @dev See {ISqueakable-getBlockCreated}.
     */
    function getBlockCreated(uint256 tokenId) external view returns (uint256) {
        // validate token
        if (!_exists(tokenId)) revert SqueakDoesNotExist();

        return squeaks[tokenId].blockNumber;
    }

    /**
     * @dev See {ISqueakable-getContent}.
     */
    function getContent(uint256 tokenId) external view returns (bytes memory) {
        // validate token
        if (!_exists(tokenId)) revert SqueakDoesNotExist();

        return squeaks[tokenId].content;
    }

    /**
     * @dev See {ISqueakable-getAuthor}.
     */
    function getAuthor(uint256 tokenId) external view returns (address) {
        // validate token
        if (!_exists(tokenId)) revert SqueakDoesNotExist();

        return squeaks[tokenId].author;
    }

    /**
     * @dev See {ISqueakable-burn}.
     */
    function burn(uint256 tokenId, address sender) external {
        // validate contract call
        _checkRole(BURNER_ROLE);

        // validate token
        if (!_exists(tokenId)) revert SqueakDoesNotExist();

        // validate sender permissions
        address owner = ownerOf(tokenId);
        if (sender != owner && !isApprovedForAll(owner, sender))
            revert NotApprovedOrOwner();

        // delete the squeak
        delete squeaks[tokenId];

        // burn the NFT
        _burn(tokenId);
    }

    /**
     * @dev See {ISqueakable-mint}.
     */
    function mint(
        address author,
        bytes calldata content
    ) external returns (uint256) {
        // validate contract call
        _checkRole(MINTER_ROLE);

        // content validation
        if (content.length == 0) revert SqueakEmpty();
        if (content.length > 256) revert SqueakTooLong();

        // save squeak
        uint256 tokenId = _nextTokenId();
        squeaks[tokenId] = Squeak(block.number, author, content);

        // mint NFT
        _mint(author, 1);

        return tokenId;
    }

    /**
     * @dev See {IERC721AUpgradeable-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(AccessControlUpgradeable, ERC721AUpgradeable, ISqueakable)
        returns (bool)
    {
        return
            ERC721AUpgradeable.supportsInterface(interfaceId) ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Reverts when caller isn't authorized to upgrade the contract.
     */
    function _authorizeUpgrade(address) internal view override {
        // validate contract call
        _checkRole(UPGRADER_ROLE);
    }

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
}
