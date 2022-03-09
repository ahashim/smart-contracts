// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

// Libraries
import '@openzeppelin/contracts/access/AccessControlEnumerable.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

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
    AccessControlEnumerable,
    ERC721Enumerable,
    ERC721Burnable,
    ERC721Pausable,
    ICritter
{
    // Using a counter to keep track of ID's instead
    // of {balanceOf} due to potential token burning
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    // ROLES
    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

    // https://critter.fyi/token/
    string private _baseTokenURI;

    // MAPPINGS
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

    // MODIFIERS
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

    // FUNCTIONS
    /**
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
        override(AccessControlEnumerable, IERC165, ERC721, ERC721Enumerable)
        returns (bool)
    {
        return
            interfaceId == type(ICritter).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev See {ICritter-getUsername}.
     */
    function getUsername(address _address)
        public
        view
        returns (string memory username)
    {
        return usernames[_address];
    }

    /**
     * @dev See {ICritter-getAddress}.
     */
    function getAddress(string memory username) public view returns (address) {
        return addresses[username];
    }

    /**
     * @dev See {ICritter-getSqueak}.
     */
    function getSqueak(uint256 tokenID) public view returns (Squeak memory) {
        return squeaks[tokenID];
    }

    /**
     * @dev See {ICritter-createAccount}.
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
     * @dev See {ICritter-updateUsername}.
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
     * @dev See {ICritter-createSqueak}.
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
     * @dev See {ICritter-deleteSqueak}.
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
     * @dev See {ICritter-mint}.
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
     * @dev See {ICritter-pause}.
     */
    function pause() public {
        require(
            hasRole(PAUSER_ROLE, _msgSender()),
            'Critter: must have pauser role to pause'
        );
        _pause();
    }

    /**
     * @dev See {ICritter-unpause}.
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
