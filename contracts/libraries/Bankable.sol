// SPDX-License-Identifier: Apache-2.0
/*

   Copyright 2022 Critter

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/
pragma solidity 0.8.17;

// enums
import '../Enums.sol';

// error codes
error InsufficientFunds();

/**
 * @title Bankable
 * @dev A library that handles Critter payments logic.
 */
library Bankable {
    /**
     * @dev Calculates amount it costs to delete a squeak.
     * @param blockCreated When the squeak was created.
     * @param blocksValid The number of future blocks that the delete will
     *      potentially occur in. Required to give a mostly correct price
     *      estimate assuming the transaction will get mined within that range.
     *      6 blocks is connsidered a good default.
     * @param rate Amount per block elapsed it costs to delete.
     */
    function getDeleteFee(
        uint256 blockCreated,
        uint256 blocksValid,
        uint256 rate
    ) public view returns (uint256) {
        return ((block.number + blocksValid) - blockCreated) * rate;
    }

    /**
     * @dev Calculates amount to refund when deleting a squeak.
     * @param blockCreated When the squeak was created.
     * @param blocksValid The number of future blocks that the delete will
     *      potentially occur in. Required to give a mostly correct price
     *      estimate assuming the transaction will get mined within that range.
     *      6 blocks is connsidered a good default.
     * @param rate Amount per block elapsed it costs to delete.
     */
    function getDeleteFeeAndRefundAmount(
        uint256 blockCreated,
        uint256 blocksValid,
        uint256 rate
    ) public view returns (uint256, uint256) {
        // calculate fee
        uint256 fee = getDeleteFee(blockCreated, blocksValid, rate);

        if (msg.value < fee) revert InsufficientFunds();
        return (fee, msg.value - fee);
    }

    /**
     * @dev Validates that an interaction has enough to cover the fee.
     */
    function validateInteractionFee(uint256 interactionFee) public view {
        if (msg.value < interactionFee) revert InsufficientFunds();
    }
}
