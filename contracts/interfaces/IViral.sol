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

/**
 * @dev Interface for Viral.
 */
interface IViral {
    /**
     * @dev Gets the virality score of a squeak.
     * @param tokenId ID of the squeak.
     * @return A value between 0-100 representing the virality of the squeak.
     * @notice The token must exist.
     */
    function getViralityScore(uint256 tokenId) external view returns (uint64);

    /**
     * @dev Looks up if a squeak is viral or not.
     * @param tokenId ID of the squeak.
     * @return boolean statings if the squeak is viral.
     * @notice The token must exist.
     */
    function isViral(uint256 tokenId) external view returns (bool);
}
