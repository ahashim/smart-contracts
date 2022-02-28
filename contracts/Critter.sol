// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract Critter is ERC721PresetMinterPauserAutoId {
    struct Squeak {
        address account;
        string content;
    }

    mapping(uint256 => Squeak) public squeaks;
    mapping(string => address) public addresses; // usernames to addresses
    mapping(address => string) public usernames; // addresses to usernames

    modifier isRegistered(address _address) {
        require(bytes(usernames[_address]).length > 0, "no username found");
        _;
    }

    modifier isNotRegistered(address _address) {
        require(
            bytes(usernames[msg.sender]).length == 0,
            "address already registered"
        );
        _;
    }

    modifier isValidUsername(string memory username) {
        require(bytes(username).length > 0, "username cannot be empty");
        require(bytes(username).length <= 32, "username is too long");
        require(addresses[username] == address(0), "username taken");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721PresetMinterPauserAutoId(name, symbol, baseTokenURI) {}

    function getUser(address _address)
        public
        view
        returns (string memory username)
    {
        return usernames[_address];
    }

    function getSqueak(uint256 id) public view returns (Squeak memory) {
        return squeaks[id];
    }

    function createAccount(string memory username)
        public
        isNotRegistered(msg.sender)
        isValidUsername(username)
    {
        addresses[username] = msg.sender;
        usernames[msg.sender] = username;

        // bypassing the admin-check to grant roles in order to dynamically add users
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function updateUsername(string memory newUsername)
        public
        isRegistered(msg.sender)
        isValidUsername(newUsername)
    {
        // clear current username from the addresses mapping
        delete addresses[usernames[msg.sender]];

        // set new usernames & address mappings
        addresses[newUsername] = msg.sender;
        usernames[msg.sender] = newUsername;
    }
    }
}
