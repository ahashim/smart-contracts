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

/**
 * @dev Bankable
 * @dev A contract to handle user payments & interact with the treasury.
 */
contract Bankable is Initializable, Storeable {
    /**
     * @dev Emitted when funds of `amount` are deposited into the treasury.
     * @param amount Amount in wei of funds that were deposited.
     */
    event FeeDeposited(uint256 amount);

    /**
     * @dev Emitted when funds of `amount` are transferred to the `to` address.
     * @param to Address of the account that funds were transferred to.
     * @param amount Amount in wei of funds that were transferred.
     */
    event FundsTransferred(address indexed to, uint256 amount);

    /**
     * @dev Ensures that `_address` has a Critter account.
     * @param amount Amount in wei sent by the user.
     * @param fee The required fee the `amount` is compared to.
     */
    modifier hasEnoughFunds(uint256 amount, uint256 fee) {
        require(amount >= fee, 'Critter: not enough funds to perform action');
        _;
    }

    /**
     * @dev Initializer function
     */
    // solhint-disable-next-line func-name-mixedcase, no-empty-blocks
    function __Bankable_init() internal view onlyInitializing {}

    /**
     * @dev Calculates the interaction amount based on PLATFORM_CHARGE and
     * PLATFORM_FEE_PERCENT. It then deposits transaction fee from `amount` into
     * the treasury, and forwards the remaining funds to the address at `to`.
     * @param to Address of the user to transfer remaining funds to.
     * @param amount Amount in wei of funds to split.
     */
    function _basicFeeSplitAndTransfer(address to, uint256 amount) internal {
        // calculate amounts to deposit & transfer
        (uint256 fee, uint256 transferAmount) = _getInteractionAmounts(amount);

        // deposit fee into treasury
        _deposit(fee);

        // transfer remaining funds to user
        _transferFunds(to, transferAmount);
    }

    /**
     * @dev deposit `value` amount of wei into the treasury.
     * @param amount The amount of wei to deposit.
     */
    function _deposit(uint256 amount) internal {
        treasury += amount;
        emit FeeDeposited(amount);
    }

    /**
     * @dev Returns the fee amount in wei to delete a squeak at `tokenId`.
     * @param tokenId ID of the squeak to delete.
     * @param blockConfirmationThreshold The amount of blocks to pad the fee
     * calculation with in order to correctly estimate a price for the block in
     * which the actual delete transaction occurs.
     * @notice This gets multiplied by `PLATFORM_CHARGE` * squeak.blockNumber
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

        return (latestBlockThreshold - squeak.blockNumber) * PLATFORM_CHARGE;
    }

    /**
     * @dev Calculate both the fee to add to treasury based on a percentage
     * of the `amount` sent for the interaction, as well as the amount to
     * transfer to the user based as a remaining percentage of `amount` without
     * using floating point math (thanks Obama!)
     * @param amount Amount in wei to base calculations off.
     * @return fee Amount to deposit into treasury.
     * @return transferAmount Amount to transfer to the user.
     */
    function _getInteractionAmounts(uint256 amount)
        internal
        view
        returns (uint256, uint256)
    {
        uint256 fee = (amount * PLATFORM_FEE_PERCENT) / 100;
        uint256 transferAmount = amount - fee;

        return (fee, transferAmount);
    }

    /**
     * @dev Transfers msg.value amount of wei into `to`'s account.
     * @param to Address of the account to transfer eth into
     * @param amount Amount in wei of eth to transfer
     */
    function _transferFunds(address to, uint256 amount) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool sent, ) = to.call{value: amount}('');
        require(sent, 'Critter: failed to transfer funds');

        emit FundsTransferred(to, amount);
    }
}
