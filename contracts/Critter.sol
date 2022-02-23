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
    mapping(string => address) public addresses;
    mapping(address => string) public usernames;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721PresetMinterPauserAutoId(name, symbol, baseTokenURI) {}

    function getUser(address _address) public view returns (string memory username) {
        return usernames[_address];
    }

    function getSqueak(uint256 id) public view returns (Squeak memory) {
        return squeaks[id];
    }

    function createAccount(string memory username) public returns (bool success) {
        require(
            bytes(usernames[msg.sender]).length == 0,
            "address already registered"
        );
        require(bytes(username).length > 0, "username cannot be empty");
        require(bytes(username).length <= 32, "username is too long");

        addresses[username] = msg.sender;
        usernames[msg.sender] = username;
        _grantRole(MINTER_ROLE, msg.sender);

        return true;
    }

    // function postSqueak(string memory content) public {
    //     require(bytes(content).length > 0, "squeak cannot be empty");
    //     require(bytes(content).length <= 256, "squeak is too long");
    //
    //     // create a new squeak
    //     Squeak memory squeak;
    //     squeak.account = msg.sender;
    //     squeak.content = content;
    //
    //     // add it to the mapping
    //     squeaks[_tokenIdTracker.current()] = squeak;
    // }
}
