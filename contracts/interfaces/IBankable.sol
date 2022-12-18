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

import './IStoreable.sol';

/**
 * @dev Interface for Bankable.
 */
interface IBankable is IStoreable {
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
     * @dev Emitted when funds are withdrawn from the treasury to an account.
     * @param to Address of the account.
     * @param amount Amount of the funds in wei.
     */
    event FundsWithdrawn(address indexed to, uint256 amount);

    /**
     * @dev Emitted when the fee for an interaction is updated.
     * @param interaction A value from the Interaction enum.
     * @param amount Amount of the new fee in wei.
     */
    event InteractionFeeUpdated(Interaction interaction, uint256 amount);

    /**
     * @dev Emitted when the fee for a viral squeak is added to its pool.
     * @param tokenId ID of the viral squeak.
     * @param amount Amount of the funds in wei.
     */
    event FundsAddedToPool(uint256 tokenId, uint256 amount);

    /**
     * @dev Emitted when funds in a pool are paid out to its members.
     * @param tokenId ID of the viral squeak.
     */
    event PoolPayout(uint256 tokenId);

    /**
     * @dev Gets the price of deleting a squeak.
     * @param tokenId ID of the squeak to delete.
     * @return Price of deleting the squeak in wei.
     * @notice The token must exist.
     */
    function getDeleteFee(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Updates an interaction fee.
     * @param interaction A value from the Interaction enum.
     * @param amount Value of the updated fee in wei.
     * @notice Only callable by TREASURER_ROLE.
     */
    function updateInteractionFee(
        Interaction interaction,
        uint256 amount
    ) external;

    /**
     * @dev Transfers out funds from the treasury.
     * @param to Address of the account where the funds will go.
     * @param amount Amount to withdraw in wei.
     * @notice Only callable by TREASURER_ROLE.
     */
    function withdraw(address to, uint256 amount) external payable;
}
