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

// contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';
import './Typeable.sol';

/**
 * @title Mappable
 * @dev A contract that only holds data mappings. Mappings do not fill storage
 * slots in a linear fashion, rather a hash of the key/value inserted. This
 * makes "good enough" collision avoidance gaurantee, and thus can be appended
 * to with newer mappings in increasing contract versions.
 * @notice This contract inherits from `Typeable` in order to use custom Critter
 * data-structures such as a `Squeak`.
 */
contract Mappable is Initializable, Typeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Initializer function
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Mappable_init() internal view onlyInitializing {}

    /**
     * @dev Mapping of usernames => account addresses.
     */
    mapping(string => address) public addresses;

    /**
     * @dev Mapping of tokenId's => Squeaks.
     */
    mapping(uint256 => Squeak) public squeaks;

    /**
     * @dev Mapping of account addresses => usernames.
     */
    mapping(address => string) public usernames;

    /**
     * @dev Mapping of tokenId's => AddressSet of accounts which disliked the
     * squeak.
     */
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) internal dislikes;

    /**
     * @dev Mapping of tokenId's => AddressSet of accounts which liked the
     * squeak.
     */
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) internal likes;

    /**
     * @dev Mapping of tokenId's => AddressSet of accounts which resqueaked the
     * squeak.
     */
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) internal resqueaks;
}
