// Copyright 2021 Binary Cat Ltd.

// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use
// this file except in compliance with the License. You may obtain a copy of the
// License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed
// under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
// CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
//import "@openzeppelin/contracts/math/SafeMath.sol";

contract BinToken is ERC20{
    //using SafeMath for uint256;

    string public constant NAME = "KITTY";
    string public constant SYMBOL = "KITTY";
    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 100000000 * (10 ** uint256(DECIMALS));


    mapping (address => mapping(address => uint)) allowed;

    constructor()
        ERC20(NAME, SYMBOL) 
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
