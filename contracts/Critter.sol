// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol';
import '@openzeppelin/contracts/access/AccessControlEnumerable.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

/**
 * @dev {ERC721} token, including:
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
    AccessControlEnumerable,
    ERC721Enumerable,
    ERC721Burnable,
    ERC721Pausable
{
    using Counters for Counters.Counter;

    // Types
    struct Squeak {
        address account;
        string content;
    }

    // Using a counter to keep track of ID's instead
    // of {balanceOf} due to potential token burning
    Counters.Counter private _tokenIdTracker;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

    // https://critter.fyi/token/
    string private _baseTokenURI;

    // Mappings
    mapping(uint256 => Squeak) public squeaks;
    mapping(string => address) public addresses; // usernames <=> addresses mappings enables the
    mapping(address => string) public usernames; // ability to look up either value in O(1) time.

    // Events
    event AccountCreated(address indexed sender, string username);
    event SqueakCreated(
        address indexed sender,
        uint256 tokenId,
        string content
    );
    event SqueakDeleted(address indexed sender, uint256 tokenId);
    event UsernameUpdated(
        address indexed sender,
        string oldUsername,
        string newUsername
    );

    // Modifiers
    modifier hasAccount(address _address) {
        require(
            bytes(usernames[_address]).length > 0,
            'Critter: address does not have an account'
        );
        _;
    }

    modifier noAccount(address _address) {
        require(
            bytes(usernames[_msgSender()]).length == 0,
            'Critter: account already exists'
        );
        _;
    }

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
        _baseTokenURI = baseTokenURI;

        // Contract owner is the default admin
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());

        // Set initial token ID to 1
        _tokenIdTracker.increment();
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlEnumerable, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Get a username from an address.
     */
    function getUsername(address _address)
        public
        view
        returns (string memory username)
    {
        return usernames[_address];
    }

    /**
     * @dev Get an address from a username.
     */
    function getAddress(string memory username) public view returns (address) {
        return addresses[username];
    }

    /**
     * @dev Get a squeak from it tokenID.
     */
    function getSqueak(uint256 tokenID) public view returns (Squeak memory) {
        return squeaks[tokenID];
    }

    /**
     * @dev Create a critter account.
     *
     * Requirements:
     *
     * - The caller must not have an account.
     * - Username must be valid (see {isValidUsername} for requirements).
     *
     * Emits {AccountCreated} event.
     */
    function createAccount(string memory username)
        public
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
     * @dev Update your critter username.
     *
     * Requirements:
     *
     * - The caller must already have an account.
     * - The caller must have the `MINTER_ROLE`.
     * - Username must be valid ({isValidUsername}).
     *
     * Emits {UsernameUpdated} event.
     */
    function updateUsername(string memory newUsername)
        public
        hasAccount(_msgSender())
        isValidUsername(newUsername)
        returns (bool)
    {
        // clear current username from the addresses mapping
        string memory oldUsername = getUsername(_msgSender());
        delete addresses[oldUsername];

        // set new usernames & address mappings
        addresses[newUsername] = _msgSender();
        usernames[_msgSender()] = newUsername;

        // log the change
        emit UsernameUpdated(_msgSender(), oldUsername, newUsername);

        return true;
    }

    /**
     * @dev Create a squeak.
     *
     * Requirements:
     *
     * - The caller must already have an account.
     * - The caller must have the `MINTER_ROLE`.
     * - Squeak must be between 0 & 256 bytes.
     */
    function createSqueak(string memory content)
        public
        hasAccount(_msgSender())
        returns (bool)
    {
        // check invariants
        require(bytes(content).length > 0, 'Critter: squeak cannot be empty');
        require(bytes(content).length <= 256, 'Critter: squeak is too long');

        // get token ID
        uint256 tokenID = _tokenIdTracker.current();

        // build squeak & save it to storage
        Squeak storage squeak = squeaks[tokenID];
        squeak.account = _msgSender();
        squeak.content = content;

        // mint our token
        mint(_msgSender());

        // log the token ID & content
        emit SqueakCreated(_msgSender(), tokenID, squeak.content);

        return true;
    }

    /**
     * @dev Burns squeak at `tokenId`. See {ERC721-_burn}.
     *
     * Requirements:
     *
     * - The caller must own `tokenId` or be an approved operator.
     *
     * Emits {Transfer} and {SqueakDeleted} events.
     */
    function deleteSqueak(uint256 tokenId)
        public
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
     * @dev Creates a new token for `to`. Its token ID will be automatically
     * assigned (and available on the emitted {IERC721-Transfer} event), and the token
     * URI autogenerated based on the base URI passed at construction.
     *
     * See {ERC721-_mint}.
     *
     * Requirements:
     *
     * - The caller must have the `MINTER_ROLE`.
     */
    function mint(address to) public {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            'Critter: must have minter role to mint'
        );

        _mint(to, _tokenIdTracker.current());
        _tokenIdTracker.increment();
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC721Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - The caller must have the `PAUSER_ROLE`.
     */
    function pause() public {
        require(
            hasRole(PAUSER_ROLE, _msgSender()),
            'Critter: must have pauser role to pause'
        );
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC721Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - The caller must have the `PAUSER_ROLE`.
     */
    function unpause() public {
        require(
            hasRole(PAUSER_ROLE, _msgSender()),
            'Critter: must have pauser role to unpause'
        );
        _unpause();
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
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
    ) internal override(ERC721, ERC721Enumerable, ERC721Pausable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
