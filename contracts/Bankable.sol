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

// contracts
import './Validateable.sol';

// error codes
error TransferFailed(address to, uint256 amount);
error InvalidWithdrawlAmount(uint256 amount);

/**
 * @title Bankable
 * @dev A contract to handle interaction payments, scouts + pools, and
 *      transacting with the treasury.
 */
contract Bankable is Validateable {
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
     */
    function getDeleteFee(uint256 tokenId, uint256 confirmationThreshold)
        public
        view
        squeakExists(tokenId)
        returns (uint256)
    {
        return
            ((block.number + confirmationThreshold) -
                squeaks[tokenId].blockNumber) * platformFee;
    }

    /**
     * @dev Transfers out funds from the treasury.
     * @param to Address of the account where the funds will go.
     * @param amount Amount to withdraw in wei.
     */
    function withdraw(address to, uint256 amount)
        external
        payable
        onlyRole(TREASURER_ROLE)
    {
        // validate the amount
        if (amount > treasury) {
            revert InvalidWithdrawlAmount({amount: amount});
        }

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
        treasury += amount;

        emit FundsDeposited(amount);
    }

    /**
     * @dev Gets the price of a single "unit" of funds in a squeaks scout pool.
     *      The unit gets multiplied by every scouts level, and distributed
     *      among scouts in the pool.
     * @param tokenId ID of the viral squeak.
     * @return amount of each pool unit in wei.
     */
    function _getPoolSharePrice(uint256 tokenId)
        internal
        view
        returns (uint256)
    {
        ScoutPool storage pool = scoutPools[tokenId];

        return pool.amount / pool.shares;
    }

    /**
     * @dev Makes a payment for a squeak based on its interaction polarity &
     *      virality.
     * @param tokenId ID of the squeak.
     * @param interaction A value from the Interaction enum.
     */
    function _makePayment(uint256 tokenId, Interaction interaction) internal {
        if (
            // positive interaction
            interaction == Interaction.Like ||
            interaction == Interaction.Resqueak ||
            interaction == Interaction.UndoDislike
        ) {
            // calculate amounts to deposit & transfer
            uint256 interactionFee = (msg.value * platformTakeRate) / 100;
            uint256 remainder = msg.value - interactionFee;

            // deposit fee into treasury
            _deposit(interactionFee);

            if (viralSqueaks.contains(tokenId)) {
                // split remainder between scouts & the squeak owner
                uint256 half = remainder / 2;
                _addScoutFunds(tokenId, half);

                // ensure any dust from odd division goes to the owner
                remainder -= half;
            }

            // transfer remaining funds to the squeak owner
            _transferFunds(squeaks[tokenId].owner, remainder);
        } else if (
            // negative interaction
            interaction == Interaction.Dislike ||
            interaction == Interaction.UndoLike ||
            interaction == Interaction.UndoResqueak
        ) {
            // treasury takes all
            _deposit(msg.value);
        }
    }

    /**
     * @dev Pays out scout pool funds to its members.
     * @param tokenId ID of viral squeak that has scouts.
     * @param sharePrice Base amount to multiply scout level by in wei.
     */
    function _makeScoutPayments(uint256 tokenId, uint256 sharePrice) internal {
        // read pool details into memory for cheaper operations
        ScoutPool memory pool = scoutPools[tokenId];
        uint256 memberCount = scouts[tokenId].length();

        // TODO: move this unbounded loop off-chain
        for (uint256 index = 0; index < memberCount; index++) {
            // calculate payout based on the users scout level & pool unit
            address scout = scouts[tokenId].at(index);
            uint256 payout = users[scout].scoutLevel * sharePrice;

            // subtract from pool funds
            pool.amount -= payout;

            // if there is any dust remaining on the last iteration
            if (index == memberCount - 1 && pool.amount > 0) {
                // deposit it into the treasury, and reset the pool amount
                _deposit(pool.amount);
                pool.amount = 0;
            }

            // pay out to the scout
            _transferFunds(scout, payout);
        }

        // save updated pool details back to storage
        scoutPools[tokenId] = pool;

        emit ScoutPoolPayout(tokenId);
    }

    /**
     * @dev Add funds to the scout pool of a viral squeak. It may possibly pay
     *      out to its members.
     * @param tokenId ID of the squeak.
     * @param amount Amount to add in wei.
     */
    function _addScoutFunds(uint256 tokenId, uint256 amount) private {
        // add funds to the pool
        scoutPools[tokenId].amount += amount;

        emit FundsAddedToScoutPool(tokenId, amount);

        // determine if we need to payout
        uint256 sharePrice = _getPoolSharePrice(tokenId);

        if (sharePrice >= poolThreshold) {
            _makeScoutPayments(tokenId, sharePrice);
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
            revert TransferFailed({to: to, amount: amount});
        }

        emit FundsTransferred(to, amount);
    }
}
