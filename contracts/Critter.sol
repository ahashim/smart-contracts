// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.9;

import "hardhat/console.sol";

contract Critter {
  // keeps track of Squeak id's
  uint nonce;

  struct Squeak {
    address account;
    string content;
  }

  // list of all Squeaks
  mapping(uint => Squeak) public squeaks;

  function getNonce() public view returns (uint) {
    return nonce;
  }

  function getSqueak(uint id) public view returns (Squeak memory) {
    return squeaks[id];
  }

  function postSqueak(string memory _content) public {
    // update nonce
    nonce++;

    // create a new squeak
    Squeak memory squeak;
    squeak.account = msg.sender;
    squeak.content = _content;

    // add it to the mapping
    squeaks[nonce] = squeak;
  }
}
