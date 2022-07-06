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
import './Validateable.sol';

/**
 * @title Bankable
 * @dev A contract to handle interaction payments, scouts + pools, and
 *      transacting with the treasury.
 */
contract Bankable is Validateable {
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Emitted when funds are deposited into the treasury.
     * @param amount Amount of the funds in wei.
     */
    event FundsDeposited(uint256 amount);

    /**
     * @dev Emitted when funds are transferred to an account.
     * @param to Address of the account.
     * @param amount Amount of the funds in wei.
     */
    event FundsTransferred(address indexed to, uint256 amount);

    /**
     * @dev Emitted when funds are withdrawn from the treasury.
     * @param to Address of the account.
     * @param amount Amount of the funds in wei.
     */
    event FundsWithdrawn(address indexed to, uint256 amount);

    /**
     * @dev Emitted when the fee value for an interaction is updated.
     * @param interaction A value from the Interaction enum.
     * @param amount Amount of the new fee in wei.
     */
    event InteractionFeeUpdated(Interaction interaction, uint256 amount);

    /**
     * @dev Emitted when fees for a viral squeak are added to its scout pool.
     * @param tokenId ID of the viral squeak.
     * @param amount Amount of the funds in wei.
     */
    event FundsAddedToScoutPool(uint256 tokenId, uint256 amount);

    /**
     * @dev Emitted when funds in a scout pool are paid out its members.
     * @param tokenId ID of the viral squeak.
     */
    event ScoutPoolPayout(uint256 tokenId);

    /**
     * @dev Upgradeable constructor
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Bankable_init() internal view onlyInitializing {}

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
    function getDeleteFee(uint256 tokenId, uint256 confirmationThreshold)
        public
        view
        squeakExists(tokenId)
        returns (uint256)
    {
        return
            ((block.number + confirmationThreshold) -
                squeaks[tokenId].blockNumber) *
            getInteractionFee(Interaction.Delete);
    }

    /**
     * @dev Gets the price of a specific interaction.
     * @param interaction A value from the Interaction enum.
     * @return Price of the interaction in wei.
     */
    function getInteractionFee(Interaction interaction)
        public
        view
        returns (uint256)
    {
        return fees[interaction];
    }

    /**
     * @dev Updates an interaction fee.
     * @param interaction A value from the Interaction enum.
     * @param amount Value of the updated fee in wei.
     * @notice Only callable by TREASURER_ROLE.
     */
    function updateInteractionFee(Interaction interaction, uint256 amount)
        external
        onlyRole(TREASURER_ROLE)
    {
        fees[interaction] = amount;

        emit InteractionFeeUpdated(interaction, amount);
    }

    /**
     * @dev Transfers out funds from the treasury.
     * @param to Address of the account where the funds will go.
     * @param amount Amount to withdraw in wei.
     * @notice Only callable by TREASURER_ROLE.
     */
    function withdraw(address to, uint256 amount)
        external
        payable
        onlyRole(TREASURER_ROLE)
    {
        // validate the amount
        if (amount > treasury) revert InvalidAmount();

        // transfer out from the treasury
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
     * @dev Gets the price of a single "unit" of funds in a squeaks scout pool.
     *      The unit gets multiplied by every scouts level, and distributed
     *      among scouts in the pool.
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
     * @dev Makes a payment for a squeak based on its interaction polarity &
     *      virality.
     * @param tokenId ID of the squeak.
     * @param interaction A value from the Interaction enum.
     */
    function _makePayment(uint256 tokenId, Interaction interaction) internal {
        User storage owner = users[ownerOf(tokenId)];

        if (
            // squeak owner is banned
            owner.status == AccountStatus.Banned ||
            // negative interaction
            interaction == Interaction.Dislike ||
            interaction == Interaction.UndoLike ||
            interaction == Interaction.UndoResqueak
        ) {
            // treasury takes all
            _deposit(msg.value);
        } else if (
            // positive interaction
            interaction == Interaction.Like ||
            interaction == Interaction.Resqueak ||
            interaction == Interaction.UndoDislike
        ) {
            // calculate amounts to deposit & transfer
            uint256 interactionTake = (msg.value * platformTakeRate) / 100;
            uint256 remainder = msg.value - interactionTake;

            // deposit fee into treasury
            _deposit(interactionTake);

            if (viralSqueaks.contains(tokenId)) {
                // split remainder between scouts & the squeak owner
                uint256 half = remainder / 2;
                _addScoutFunds(tokenId, half);

                // any dust from odd division goes to the owner
                remainder -= half;
            }

            // transfer remaining funds to the squeak owner
            _transferFunds(owner.account, remainder);
        }
    }

    /**
     * @dev Pays out scout pool funds to its members.
     * @param tokenId ID of viral squeak.
     * @param pool ScoutPool of the viral squeak (converted to memory).
     */
    function _makeScoutPayments(uint256 tokenId, ScoutPool storage pool)
        internal
    {
        // determine share price
        uint256 memberCount = pool.members.length();
        uint256 price = _getPoolSharePrice(pool);

        // TODO: move this unbounded loop off-chain
        for (uint256 i = 0; i < memberCount; i++) {
            // calculate scout payout based on the number of shares & price
            (address scout, uint256 shares) = pool.members.at(i);
            uint256 payout = price * shares;

            // subtract from pool funds
            pool.amount -= payout;

            // if there is any dust remaining on the last iteration
            if (i == memberCount - 1 && pool.amount > 0) {
                // deposit it into the treasury, and reset the pool amount
                _deposit(pool.amount);
                pool.amount = 0;
            }

            // pay out to the scout
            _transferFunds(scout, payout);
        }

        emit ScoutPoolPayout(tokenId);
    }

    /**
     * @dev Add funds to the scout pool of a viral squeak. It may possibly pay
     *      out to its members.
     * @param tokenId ID of the squeak.
     * @param amount Amount to add in wei.
     */
    function _addScoutFunds(uint256 tokenId, uint256 amount) private {
        ScoutPool storage pool = pools[tokenId];

        // add funds to the pool (unchecked because pool payouts will ensure
        // they get reset to zero)
        unchecked {
            pool.amount += amount;
        }

        emit FundsAddedToScoutPool(tokenId, amount);

        // determine if we need to payout
        if (_getPoolSharePrice(pool) >= poolPayoutThreshold) {
            _makeScoutPayments(tokenId, pool);
        }
    }

    /**
     * @dev Sends funds to an account.
     * @param to Address of the account.
     * @param amount Amount to transfer in wei.
     */
    function _transferFunds(address to, uint256 amount) private {
        // solhint-disable-next-line avoid-low-level-calls
        (bool sent, ) = to.call{value: amount}('');

        if (!sent) {
            revert TransferFailed();
        }

        emit FundsTransferred(to, amount);
    }
}
