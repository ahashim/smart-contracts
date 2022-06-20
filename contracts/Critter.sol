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

// 3rd party contracts
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

// critter contracts
import './Accountable.sol';
import './Squeakable.sol';

/**
 * @title Critter: a microblogging platform where each post is an ERC721 token.
 * @author Ahmed Hashim <ahashim@users.noreply.github.com>
 * @dev Core concepts:
 *      - Every address is a unique username.
 *      - Every post, called a "Squeak" is an NFT.
 *      - Actions, such as "favorite" & "resqueak", cost a fee.
 *      - Fees are paid out to the owner of said squeak (not necessarily the
 *        original author).
 *      - Squeaks can be bought & sold via a bidding price discovery mechanism.
 *      - Once an author sells their squeak, the ownership is transferred to a
 *        new user.
 *      - Only owners can delete squeaks.
 *      - Deleting a squeak costs a fee of `blocks elapsed x deletion fee`.
 *      - Every squeak has a "virality" coefficient that is tracked on-chain.
 *      - When a squeak goes "viral", future profits from that point on are
 *        split among the owner and those who helped it go viral (likers &
 *        resqueakers).
 */

contract Critter is UUPSUpgradeable, Accountable, Squeakable {
    /* solhint-disable func-name-mixedcase, no-empty-blocks */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /* solhint-enable func-name-mixedcase, no-empty-blocks */

    /**
     * @dev Upgradeable "constructor" function to initialize sub-contracts.
     * @param name Contract name (Critter).
     * @param symbol Contract symbol (CRTTR).
     * @param baseURI Prefix for all token URI's (https://critter.fyi/token).
     * @param fee Fee amount in wei to charge per interaction.
     * @param takeRate Percentage of `fee` deposited into the treasury.
     * @param poolThresh Minimum amount of wei required to pay out a scout pool.
     * @param viralityThresh Minimum score that a squeak must have for virality.
     * @param scoutBonus Number of levels a scout jumps when they cause a squeak to go viral.
     * @param maxLevel Upper limit on scout level.
     */
    function initialize(
        string calldata name,
        string calldata symbol,
        string calldata baseURI,
        uint256 fee,
        uint256 takeRate,
        uint256 poolThresh,
        uint8 viralityThresh,
        uint8 scoutBonus,
        uint8 maxLevel
    ) public initializerERC721A initializer {
        // 3rd party
        __AccessControl_init();
        __ERC721A_init(name, symbol);
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Storage
        __Immutable_init();
        __Mappable_init();
        __Typeable_init();
        __Storeable_init(
            baseURI,
            fee,
            takeRate,
            poolThresh,
            viralityThresh,
            scoutBonus,
            maxLevel
        );

        // Logic
        __Accountable_init();
        __Bankable_init();
        __Squeakable_init();
        __Scoutable_init();
        __Validateable_init();
        __Viral_init();
    }

    /**
     * @dev Pauses the contract.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the contract.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /* solhint-disable no-empty-blocks */
    /**
     * @dev Reverts when caller isn't authorized to upgrade the contract.
     */
    function _authorizeUpgrade(address)
        internal
        view
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /* solhint-enable no-empty-blocks */

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
        squeaks[startTokenId].owner = to;
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     *      and burning. Calling conditions:
     *      - When `from` and `to` are both non-zero, ``from``'s `tokenId` will
     *      be transferred to `to`.
     *      - When `from` is zero, `tokenId` will be minted for `to`.
     *      - When `to` is zero, ``from``'s `tokenId` will be burned.
     *      - `from` and `to` are never both zero.
     * @param from Address of the account that is relinquishing ownership of the
     * token.
     * @param to Address of the account that is gaining ownership of the token.
     * @param startTokenId The first token id to be transferred.
     * @param quantity The amount to be transferred.
     */
    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal override(ERC721AUpgradeable) {
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
    }
}
