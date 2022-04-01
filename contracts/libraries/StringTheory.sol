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

/**
 * @dev A library of convenience functions for string manipulation.
 */
library StringTheory {
    /**
     * @dev Converts `bytes32` data to a `string` representation of its
     *      hexadecimal value. Can be conveniently used with keccak256 hash
     *      function.
     *
     *      Source: https://stackoverflow.com/a/69266989
     */
    function toHexString(bytes32 data) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    toHex16(bytes16(data)),
                    toHex16(bytes16(data << 128))
                )
            );
    }

    /**
     * @dev Efficiently Converts a `bytes16` to `bytes32` representation using
     *       bit-shifts.
     */
    function toHex16(bytes16 data) internal pure returns (bytes32 result) {
        result =
            (bytes32(data) &
                0xFFFFFFFFFFFFFFFF000000000000000000000000000000000000000000000000) |
            ((bytes32(data) &
                0x0000000000000000FFFFFFFFFFFFFFFF00000000000000000000000000000000) >>
                64);
        result =
            (result &
                0xFFFFFFFF000000000000000000000000FFFFFFFF000000000000000000000000) |
            ((result &
                0x00000000FFFFFFFF000000000000000000000000FFFFFFFF0000000000000000) >>
                32);
        result =
            (result &
                0xFFFF000000000000FFFF000000000000FFFF000000000000FFFF000000000000) |
            ((result &
                0x0000FFFF000000000000FFFF000000000000FFFF000000000000FFFF00000000) >>
                16);
        result =
            (result &
                0xFF000000FF000000FF000000FF000000FF000000FF000000FF000000FF000000) |
            ((result &
                0x00FF000000FF000000FF000000FF000000FF000000FF000000FF000000FF0000) >>
                8);
        result =
            ((result &
                0xF000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000) >>
                4) |
            ((result &
                0x0F000F000F000F000F000F000F000F000F000F000F000F000F000F000F000F00) >>
                8);
        result = bytes32(
            0x3030303030303030303030303030303030303030303030303030303030303030 +
                uint256(result) +
                (((uint256(result) +
                    0x0606060606060606060606060606060606060606060606060606060606060606) >>
                    4) &
                    0x0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F) *
                7
        );
    }

    /**
     * @dev Converts all the values of a string to their corresponding lower
     *      case value.
     *
     *      Source: https://gist.github.com/whitehorse21/69a6287c3560e730eabfe05efc17ae22
     *
     * @param _base When being used for a data type this is the extended object
     *              otherwise this is the string base to convert to lower case.
     * @return string
     *
     */
    function lower(string memory _base) internal pure returns (string memory) {
        bytes memory _baseBytes = bytes(_base);

        for (uint256 i = 0; i < _baseBytes.length; i++) {
            // if the ASCII character is in the lowercase byte range
            if (_baseBytes[i] >= 0x41 && _baseBytes[i] <= 0x5A) {
                // swap it for its uppercase equivalent
                _baseBytes[i] = bytes1(uint8(_baseBytes[i]) + 32);
            }
        }

        return string(_baseBytes);
    }
}
