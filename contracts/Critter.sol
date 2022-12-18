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
pragma solidity 0.8.17;

import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import './Accountable.sol';
import './Squeakable.sol';
import './interfaces/ICritter.sol';

/**
 * @title Critter: a microblogging platform where each post is an ERC721 token.
 * @author Ahmed Hashim <ahashim@users.noreply.github.com>
 * @dev Core concepts:
 *      - Every address is a user.
 *      - Users can follow one another.
 *      - Every post, called a "Squeak", is an NFT.
 *      - Squeaks can be bought & sold via a bidding price discovery mechanism.
 *      - Interactions on squeaks, such as liking, disliking, or resqueaking
 *        cost a fee.
 *      - Fees are paid out to the owner of the squeak (not necessarily the
 *        original author).
 *      - Once an author sells their squeak, the ownership is transferred to a
 *        new user.
 *      - Only the owner of a squeak is able to delete it (burn the token).
 *      - Deleting a squeak costs a fee of `time elapsed x fixed delete fee`.
 *      - Every squeak has a "virality" score that is calculated on-chain.
 *      - When a squeak goes "viral", future profits from that point on are
 *        split among the owner and its positive interactors (i.e., those who
 *        propelled it to virality via likes & resqueaks).
 */
contract Critter is UUPSUpgradeable, Accountable, Squeakable, ICritter {
    /* solhint-disable func-name-mixedcase, no-empty-blocks */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /* solhint-enable func-name-mixedcase, no-empty-blocks */

    /**
     * @dev See {ICritter-initialize}.
     */
    function initialize(
        uint256 dividendThreshold,
        uint256 maxLevel,
        uint256 viralityThreshold
    ) public initializerERC721A initializer {
        // 3rd party
        __AccessControl_init();
        __ERC721A_init('Critter', 'CRTTR');
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Storage
        __Storeable_init(dividendThreshold, maxLevel, viralityThreshold);

        // Logic
        __Accountable_init();
        __Bankable_init();
        __Relatable_init();
        __Squeakable_init();
        __Poolable_init();
        __Validateable_init();
        __Viral_init();
    }

    /**
     * @dev See {ICritter-updateConfiguration}.
     */
    function updateConfiguration(
        Configuration configuration,
        uint256 amount
    ) external onlyRole(OPERATOR_ROLE) {
        config[configuration] = amount;
    }

    /* solhint-disable no-empty-blocks */
    /**
     * @dev Reverts when caller isn't authorized to upgrade the contract.
     */
    function _authorizeUpgrade(
        address
    ) internal view override onlyRole(UPGRADER_ROLE) {}

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
}
