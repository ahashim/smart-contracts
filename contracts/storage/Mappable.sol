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
pragma solidity 0.8.9;

// critter contracts
import './Typeable.sol';

// data-structures
import '@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol';

/**
 * @title Mappable
 * @dev A contract that only handles critter data mappings.
 * @notice Mappings do not fill storage slots in a linear fashion, but instead
 *      they store data in a location based on a hash of its key/value. This is
 *      a "good enough" collision avoidance gaurantee, and thus this contract
 *      can be appended to with newer mappings in later versions.
 */
contract Mappable is Initializable, Typeable {
    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase
    function __Mappable_init(uint256 platformFee) internal onlyInitializing {
        // set default interaction fees
        interactionFees[Interaction.Delete] = platformFee;
        interactionFees[Interaction.Dislike] = platformFee;
        interactionFees[Interaction.Like] = platformFee;
        interactionFees[Interaction.Resqueak] = platformFee;
        interactionFees[Interaction.UndoDislike] = platformFee;
        interactionFees[Interaction.UndoLike] = platformFee;
        interactionFees[Interaction.UndoResqueak] = platformFee;
    }

    /**
     * @dev Mapping of username <=> account address.
     */
    mapping(string => address) public addresses;

    /**
     * @dev Mapping of Interaction <=> fee amounts.
     */
    mapping(Interaction => uint256) public interactionFees;

    /**
     * @dev Mapping of tokenId <=> Squeak.
     */
    mapping(uint256 => Squeak) public squeaks;

    /**
     * @dev Mapping of account address <=> User.
     */
    mapping(address => User) public users;

    /**
     * @dev Mapping of tokenId <=> AddressSet of dislikers.
     */
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) internal dislikes;

    /**
     * @dev Mapping of tokenId <=> AddressSet of likers.
     */
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) internal likes;

    /**
     * @dev Mapping of tokenId <=> AddressSet of resqueakers.
     */
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) internal resqueaks;

    /**
     * @dev Mapping of scout <=> set of viral squeaks they are a part of.
     */
    mapping(address => EnumerableSetUpgradeable.UintSet) internal scoutFinds;

    /**
     * @dev Mapping of tokenId <=> ScoutPool.
     */
    mapping(uint256 => ScoutPool) internal scoutPools;
}
