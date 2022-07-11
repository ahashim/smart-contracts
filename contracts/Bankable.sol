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

import './Validateable.sol';
import './interfaces/IBankable.sol';

/**
 * @title Bankable
 * @dev A contract to handle payments for squeak interactions, scout pools, and
 *      the treasury.
 */
contract Bankable is Validateable, IBankable {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    /**
     * @dev Upgradeable constructor.
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Bankable_init() internal view onlyInitializing {}

    /**
     * @dev See {IBankable-getDeleteFee}.
     */
    function getDeleteFee(uint256 tokenId)
        external
        view
        squeakExists(tokenId)
        returns (uint256)
    {
        // defaulting confirmation threshold to 6
        return _getDeleteFee(tokenId, 6);
    }

    /**
     * @dev See {IBankable-updateInteractionFee}.
     */
    function updateInteractionFee(Interaction interaction, uint256 amount)
        external
        onlyRole(TREASURER_ROLE)
    {
        fees[interaction] = amount;

        emit InteractionFeeUpdated(interaction, amount);
    }

    /**
     * @dev See {IBankable-withdraw}.
     */
    function withdraw(address to, uint256 amount)
        external
        payable
        onlyRole(TREASURER_ROLE)
    {
        // validate the amount
        if (amount > treasury) revert InvalidAmount();

        // transfer it out of the treasury
        treasury -= amount;
        _transferFunds(to, amount);

        emit FundsWithdrawn(to, amount);
    }

    /**
     * @dev Deposits funds into the treasury.
     * @param amount Amount of the funds in wei.
     */
    function _deposit(uint256 amount) internal {
        unchecked {
            treasury += amount;
        }

        emit FundsDeposited(amount);
    }

    /**
     * @dev Gets the price of deleting a squeak based on its age.
     * @param tokenId ID of the squeak to delete.
     * @param confirmationThreshold The number of future blocks that the delete
     *      will potentially occur in. Required to give a mostly correct
     *      price estimate assuming the transaction will get mined within that
     *      range. 6 blocks is connsidered a good default.
     * @return Price of deleting the squeak in wei.
     * @notice The token must exist.
     */
    function _getDeleteFee(uint256 tokenId, uint256 confirmationThreshold)
        internal
        view
        returns (uint256)
    {
        return
            ((block.number + confirmationThreshold) -
                squeaks[tokenId].blockNumber) * fees[Interaction.Delete];
    }

    /**
     * @dev Gets the price of a single share of funds in a squeaks scout pool.
     * @param pool ScoutPool of the viral squeak.
     * @return amount of each pool unit in wei.
     */
    function _getPoolSharePrice(ScoutPool storage pool)
        internal
        view
        returns (uint256)
    {
        return pool.amount / pool.shares;
    }

    /**
     * @dev Makes a payment for an interaction from the sender to the squeaks
     *      owner or the treasury (based on interaction polarity).
     * @param tokenId ID of the squeak.
     * @param interaction A value from the Interaction enum.
     */
    function _makePayment(uint256 tokenId, Interaction interaction) internal {
        uint256 interactionFee = fees[interaction];
        User storage owner = users[ownerOf(tokenId)];

        if (
            // the squeak owner is banned
            owner.status == AccountStatus.Banned ||
            // negative interaction
            interaction == Interaction.Dislike ||
            interaction == Interaction.UndoLike ||
            interaction == Interaction.UndoResqueak
        ) {
            // treasury takes all
            _deposit(interactionFee);
        } else if (
            // positive interaction
            interaction == Interaction.Like ||
            interaction == Interaction.Resqueak ||
            interaction == Interaction.UndoDislike
        ) {
            // calculate amounts to deposit & transfer
            uint256 interactionTake = (interactionFee *
                config[Configuration.PlatformTakeRate]) / 100;
            uint256 remainder = interactionFee - interactionTake;

            // deposit fee into treasury
            _deposit(interactionTake);

            if (viralSqueaks.contains(tokenId)) {
                // split remainder between scouts & the squeak owner
                uint256 half = remainder / 2;
                _addFundsToScoutPool(tokenId, half);

                // any dust from odd division goes to the owner
                remainder -= half;
            }

            // transfer remaining funds to the squeak owner
            _transferFunds(owner.account, remainder);
        }

        // refund any funds excess of the interaction fee
        if (msg.value > interactionFee)
            _transferFunds(msg.sender, msg.value - interactionFee);
    }

    /**
     * @dev Pays out scout pool funds to its members.
     * @param tokenId ID of viral squeak.
     * @param pool ScoutPool of the viral squeak.
     */
    function _makeScoutPayments(uint256 tokenId, ScoutPool storage pool)
        internal
    {
        uint256 sharePrice = _getPoolSharePrice(pool);
        _makeScoutPayments(tokenId, pool, sharePrice);
    }

    /**
     * @dev Pays out scout pool funds to its members.
     * @param tokenId ID of viral squeak.
     * @param pool Pointer to the ScoutPool of the viral squeak.
     * @param sharePrice Price of each share at the time of payment.
     */
    function _makeScoutPayments(
        uint256 tokenId,
        ScoutPool storage pool,
        uint256 sharePrice
    ) internal {
        // get number of scouts in the pool
        uint256 memberCount = pool.members.length();

        // TODO: move this unbounded loop off-chain
        for (uint256 i = 0; i < memberCount; i++) {
            // calculate the scouts payout based on the number of shares & price
            (address scout, uint256 shares) = pool.members.at(i);
            uint256 payout = sharePrice * shares;

            // subtract funds from the pool & pay out to the scout
            pool.amount -= payout;
            _transferFunds(scout, payout);
        }

        emit ScoutPoolPayout(tokenId);
    }

    /**
     * @dev Transfers funds to an account.
     * @param to Address of the account.
     * @param amount Amount to transfer in wei.
     */
    function _transferFunds(address to, uint256 amount) internal {
        payable(to).transfer(amount);

        emit FundsTransferred(to, amount);
    }

    /**
     * @dev Add funds to the scout pool of a viral squeak, and pay out to its
     *      members once it hits the threshold.
     * @param tokenId ID of the squeak.
     * @param amount Amount to add in wei.
     */
    function _addFundsToScoutPool(uint256 tokenId, uint256 amount) private {
        ScoutPool storage pool = pools[tokenId];

        // add funds to the pool (unchecked because pool payouts will ensure
        // they get reset to zero)
        unchecked {
            pool.amount += amount;
        }

        emit FundsAddedToScoutPool(tokenId, amount);

        // determine if we need to payout
        uint256 sharePrice = _getPoolSharePrice(pool);
        if (sharePrice >= config[Configuration.PoolPayoutThreshold])
            _makeScoutPayments(tokenId, pool, sharePrice);
    }
}
