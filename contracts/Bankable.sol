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
import './storage/Storeable.sol';

// error codes
error InsufficientFunds(uint256 available, uint256 required);
error TransferFailed(address to, uint256 amount);
error InvalidWithdrawlAmount(uint256 amount);

/**
 * @dev Bankable
 * @dev A contract to handle user payments & interact with the treasury.
 */
contract Bankable is Initializable, Storeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Emitted when funds of `amount` are deposited into the treasury.
     * @param amount Amount in wei of funds that were deposited.
     */
    event FundsDeposited(uint256 amount);

    /**
     * @dev Emitted when funds of `amount` are transferred to the `to` address.
     * @param to Address of the account that funds were transferred to.
     * @param amount Amount in wei of funds that were transferred.
     */
    event FundsTransferred(address indexed to, uint256 amount);

    /**
     * @dev Emitted when funds of `amount` are withdrawn from the treasury and
     * sent to the `to` address.
     * @param to Address of the account that funds were transferred to.
     * @param amount Amount in wei of funds that were transferred.
     */
    event FundsWithdrawn(address indexed to, uint256 amount);

    /**
     * @dev Emitted when funds of `amount` for viral squeak at `tokenId` are to
     * the scoutPool mapping.
     * @param tokenId ID of the viral squeak.
     * @param amount Amount in wei of funds that were added.
     */
    event FundsAddedToScoutPool(uint256 tokenId, uint256 amount);

    /**
     * @dev Ensures that msg.sender has enough funds for the interaction fee.
     */
    modifier hasEnoughFunds() {
        if (msg.value < platformFee) {
            revert InsufficientFunds({
                available: msg.value,
                required: platformFee
            });
        }
        _;
    }

    /**
     * @dev Initializer function
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Bankable_init() internal view onlyInitializing {}

    /**
     * @dev deposit `value` amount of wei into the treasury.
     * @param amount The amount of wei to deposit.
     */
    function _deposit(uint256 amount) internal {
        treasury += amount;
        emit FundsDeposited(amount);
    }

    /**
     * @dev Returns the fee amount in wei to delete a squeak at `tokenId`.
     * @param tokenId ID of the squeak to delete.
     * @param blockConfirmationThreshold The amount of blocks to pad the fee
     * calculation with in order to correctly estimate a price for the block in
     * which the actual delete transaction occurs.
     * @notice This gets multiplied by `platformFee` * squeak.blockNumber
     * to calculate the full fee amount.
     */
    function _getDeleteFee(uint256 tokenId, uint256 blockConfirmationThreshold)
        internal
        view
        returns (uint256)
    {
        Squeak memory squeak = squeaks[tokenId];
        uint256 latestBlockThreshold = block.number +
            blockConfirmationThreshold;

        return (latestBlockThreshold - squeak.blockNumber) * platformFee;
    }

    /**
     * @dev Returns the unit price of a viral squeaks pool to split amongst its
     * scouts.
     * @param tokenId ID of the viral squeak to determine unit price.
     * @return amount of each pool unit in wei.
     */
    function _getPoolUnit(uint256 tokenId) internal view returns (uint256) {
        return scoutPools[tokenId].amount / scoutPools[tokenId].levelTotal;
    }

    /**
     * @dev Makes a payment for the squeak at `tokenId` depending on its
     * virality + interaction.
     * @param tokenId ID of the squeak to pay out for.
     * @param interaction Value from the Interaction enum.
     */
    function _makePayment(uint256 tokenId, Interaction interaction) internal {
        if (
            // positive interactions
            interaction == Interaction.Like ||
            interaction == Interaction.Resqueak ||
            interaction == Interaction.UndoDislike
        ) {
            // calculate amounts to deposit & transfer
            (uint256 fee, uint256 remainder) = _getInteractionAmounts(
                msg.value
            );

            // deposit fee into treasury
            _deposit(fee);

            if (viralSqueaks.contains(tokenId)) {
                // split remainder amongst scouts & the squeak owner
                uint256 scoutFunds = remainder / 2;

                _addScoutFunds(tokenId, scoutFunds);
                _transferFunds(squeaks[tokenId].owner, remainder - scoutFunds);
            } else {
                // transfer remaining funds to the squeak owner
                _transferFunds(squeaks[tokenId].owner, remainder);
            }
        } else if (
            // negative interactions
            interaction == Interaction.Dislike ||
            interaction == Interaction.UndoLike ||
            interaction == Interaction.UndoResqueak
        ) {
            // treasury takes all
            _deposit(msg.value);
        }
    }

    /**
     * @dev Pays `amount` of wei to each scout of `tokenId` multiplied by their
     * scout level.
     * @param tokenId ID of viral squeak that has scouts.
     * @param poolUnit Base amount in wei to multiply scout level by.
     */
    function _makeScoutPayments(uint256 tokenId, uint256 poolUnit) internal {
        // read pool details into memory for cheaper operations
        ScoutPool memory pool = scoutPools[tokenId];

        // TODO: move this unbounded loop off-chain
        for (uint256 index = 0; index < scouts[tokenId].length(); index++) {
            // calculate payout based on the users scout level & pool unit
            uint256 payout = users[scouts[tokenId].at(index)].scoutLevel *
                poolUnit;

            // remove the amount from the pool
            pool.amount -= payout;

            // pay out to scout
            _transferFunds(scouts[tokenId].at(index), payout);
        }

        // save updated pool details back to storage
        scoutPools[tokenId] = pool;
    }

    /**
     * @dev Withdraws funds in `amount` from the treasury, and transfers to the
     * `to` address.
     * @param to Address of account to withdraw to.
     * @param amount Amount in wei to withdraw.
     */
    function _withdraw(address to, uint256 amount) internal {
        // ensure amount is correct
        if (amount > treasury) {
            revert InvalidWithdrawlAmount({amount: amount});
        }

        // subtract from treasury and transfer out
        treasury -= amount;
        _transferFunds(to, amount);

        emit FundsWithdrawn(to, amount);
    }

    /**
     * @dev Transfers msg.value amount of wei into `to`'s account.
     * @param tokenId ID of the squeak to add funds for.
     * @param _amount Amount in wei of eth to transfer.
     */
    function _addScoutFunds(uint256 tokenId, uint256 _amount) private {
        // add funds to the pool
        scoutPools[tokenId].amount += _amount;

        // determine if we need to payout
        uint256 poolUnit = _getPoolUnit(tokenId);

        if (poolUnit >= poolThreshold) {
            // pay scouts
            _makeScoutPayments(tokenId, poolUnit);
        }

        emit FundsAddedToScoutPool(tokenId, _amount);
    }

    /**
     * @dev Calculate both the fee to add to treasury based on a percentage
     * of the `amount` sent for the interaction, as well as the amount to
     * transfer to the user based as a remaining percentage of `amount`.
     * @param amount Amount in wei to base calculations off.
     * @return fee Amount to deposit into treasury.
     * @return transferAmount Amount to transfer to the user.
     */
    function _getInteractionAmounts(uint256 amount)
        private
        view
        returns (uint256, uint256)
    {
        uint256 fee = (amount * platformTakeRate) / 100;
        uint256 remainder = amount - fee;

        return (fee, remainder);
    }

    /**
     * @dev Transfers msg.value amount of wei into `to`'s account.
     * @param to Address of the account to transfer eth into.
     * @param amount Amount in wei of eth to transfer.
     */
    function _transferFunds(address to, uint256 amount) private {
        // solhint-disable-next-line avoid-low-level-calls
        (bool sent, ) = to.call{value: amount}('');

        if (!sent) {
            revert TransferFailed({to: to, amount: amount});
        }

        emit FundsTransferred(to, amount);
    }
}
