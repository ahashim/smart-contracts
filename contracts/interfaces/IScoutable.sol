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

import './storage/IStoreable.sol';

/**
 * @dev Interface for Scoutable.
 */
interface IScoutable is IStoreable {
    /**
     * @dev Ejects the sender from a scout pool they are a part of.
     * @param tokenId ID of the viral squeak.
     * @notice Sender must be a member of the pool.
     */
    function ejectFromPool(uint256 tokenId) external;

    /**
     * @dev Gets the pool amount & number of shares.
     * @param tokenId ID of the viral squeak.
     * @return ScoutPoolInfo
     */
    function getPoolInfo(uint256 tokenId)
        external
        view
        returns (ScoutPoolInfo memory);

    /**
     * @dev Gets a list of scouts for a viral squeak.
     * @param tokenId ID of the viral squeak.
     * @return A list of Scouts.
     */
    function getScouts(uint256 tokenId) external view returns (Scout[] memory);
}
