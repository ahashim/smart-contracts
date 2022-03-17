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

// Libraries
import '@openzeppelin/contracts/access/AccessControlEnumerable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import './libraries/CritterStrings.sol';

// Interfaces
import './interfaces/ICritter.sol';

/**
 * @dev Critter: an {ERC721} token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a minter role that allows for token minting (creation)
 *  - a pauser role that allows to stop all token transfers
 *  - token ID and URI autogeneration
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles - head to its documentation for details.
 *
 * The account that deploys the contract will be granted the minter and pauser
 * roles, as well as the default admin role, which will let it grant both minter
 * and pauser roles to other accounts.
 */
contract Critter is
    Context,
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    Pausable,
    AccessControlEnumerable,
    ERC721Burnable,
    ICritter
{
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

    // Using a counter to keep track of ID's instead
    // of {balanceOf} due to potential token burning
    Counters.Counter private _tokenIdCounter;

    string private _baseTokenURI;

    /**
     * @dev Mapping of tokenId's to Squeaks.
     * See {ICritter-Squeak} for more info.
     */
    mapping(uint256 => Squeak) public squeaks;

    /**
     * @dev Mapping of usernames => account addresses.
     */
    mapping(string => address) public addresses;

    /**
     * @dev Mapping of account addresses => usernames.
     */
    mapping(address => string) public usernames;

    /**
     * @dev ensures that `_address` has a Critter account.
     */
    modifier hasAccount(address _address) {
        require(
            bytes(usernames[_address]).length > 0,
            'Critter: address does not have an account'
        );
        _;
    }

    /**
     * @dev ensures that `_address` does not have a Critter account.
     */
    modifier noAccount(address _address) {
        require(
            bytes(usernames[_msgSender()]).length == 0,
            'Critter: account already exists'
        );
        _;
    }

    /**
     * @dev ensures that `username` satisfies the following requirements:
     *
     * - Greater than 0 bytes (cannot be empty).
     * - Less than 32 bytes (upper bound for storage slot optimization).
     * - Is not already in use.
     */
    modifier isValidUsername(string memory username) {
        require(
            bytes(username).length > 0,
            'Critter: username cannot be empty'
        );
        require(bytes(username).length <= 32, 'Critter: username is too long');
        require(addresses[username] == address(0), 'Critter: username taken');
        _;
    }

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract.
     *
     * Token URIs will be autogenerated based on `baseURI` and their token IDs.
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        // Set base token URI
        _baseTokenURI = baseTokenURI;

        // Contract owner is the default admin
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());

        // Set initial token ID to 1
        _tokenIdCounter.increment();
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlEnumerable, IERC165, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return
            interfaceId == type(ICritter).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {ICritter-createAccount}.
     */
    function createAccount(string memory username)
        public
        override(ICritter)
        noAccount(_msgSender())
        isValidUsername(username)
        returns (bool)
    {
        // set our address & username mappings
        addresses[username] = _msgSender();
        usernames[_msgSender()] = username;

        // bypassing the admin-check to grant roles in order to
        // automatically initialize users when they create an account.
        _grantRole(MINTER_ROLE, _msgSender());

        // log account creation
        emit AccountCreated(_msgSender(), username);

        return true;
    }

    /**
     * @dev See {ICritter-updateUsername}.
     */
    function updateUsername(string memory newUsername)
        public
        override(ICritter)
        hasAccount(_msgSender())
        isValidUsername(newUsername)
        returns (bool)
    {
        // clear current username from the addresses mapping
        string memory oldUsername = this.usernames(_msgSender());
        delete addresses[oldUsername];

        // set new usernames & address mappings
        addresses[newUsername] = _msgSender();
        usernames[_msgSender()] = newUsername;

        // log the change
        emit UsernameUpdated(_msgSender(), oldUsername, newUsername);

        return true;
    }

    /**
     * @dev See {ICritter-createSqueak}.
     */
    function createSqueak(string memory content)
        public
        override(ICritter)
        hasAccount(_msgSender())
        returns (bool)
    {
        // check invariants
        require(bytes(content).length > 0, 'Critter: squeak cannot be empty');
        require(bytes(content).length <= 256, 'Critter: squeak is too long');

        // get current tokenID & update counter
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // build squeak & save it to storage
        Squeak storage squeak = squeaks[tokenId];
        squeak.account = _msgSender();
        squeak.content = content;

        // mint our token
        safeMint(_msgSender(), tokenId);

        // log the token ID & content
        emit SqueakCreated(_msgSender(), tokenId, squeak.content);

        return true;
    }

    /**
     * @dev See {ICritter-deleteSqueak}.
     */
    function deleteSqueak(uint256 tokenId)
        public
        override(ICritter)
        hasAccount(_msgSender())
        returns (bool)
    {
        // burn ERC721 token
        burn(tokenId);

        // delete squeak from storage
        delete squeaks[tokenId];

        // log deleted token ID
        emit SqueakDeleted(_msgSender(), tokenId);

        return true;
    }

    /**
     * @dev See {IERC721-_baseURI}.
     */
    function _baseURI()
        internal
        view
        override(ERC721)
        returns (string memory)
    {
        return _baseTokenURI;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev See {ICritter-safeMint}.
     */
    function safeMint(address to, uint256 tokenId)
        public
        override(ICritter)
        onlyRole(MINTER_ROLE)
    {
        string memory URI = _generateURI(tokenId);

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, URI);
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
     * @dev Burns `tokenId`. See {ERC721-_burn}.
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     */
    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` and `to` are never both zero.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev Generate token URI based on chain & token ID.
     */
    function _generateURI(uint256 tokenId) view internal returns (string memory) {
        //
        bytes32 hashedURI = keccak256(abi.encode(block.chainid, tokenId));
        string memory URI = CritterStrings.lower(CritterStrings.toHexString(hashedURI));

        return URI;
    }
}
