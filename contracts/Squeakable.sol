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
     * @dev See {ISqueakable-burn}.
     */
    function burn(uint256 tokenId) external {
        // validation
        _checkRole(BURNER_ROLE);

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
        // validation
        _checkRole(MINTER_ROLE);

        // save squeak
        uint256 tokenId = _nextTokenId();
        squeaks[tokenId] = Squeak(block.number, author, author, content);

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

        // update squeak ownership
        squeaks[startTokenId].owner = to;
    }

    /**
     * @dev Reverts when caller isn't authorized to upgrade the contract.
     */
    function _authorizeUpgrade(address) internal view override {
        // validation
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
