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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./BinToken.sol";

contract BinaryStaking {
    IERC20 public binToken;

    uint internal constant PRECISION_CONSTANT = 1e27;
    address payable owner;
    struct StakingAccount {
        uint stakedBin; 
        uint valueWhenLastReleased; //Global accumulated value of new_rewards/total_staked when user last got rewards
    }

    mapping(address => StakingAccount) public stakingBalance;
    uint public accumulatedRewards; //(per staked token) 

    event Staked(address indexed user, uint amount);
    event Unstaked(address indexed user, uint amount);
    event Release(address indexed user, uint amount);
    event Reward(uint amount);

    constructor(address token) {
        owner = payable(msg.sender);
        binToken = BinToken(token);
    }

    function receiveFunds() public payable {
        uint value = msg.value;
        if (binToken.balanceOf(address(this)) != 0) {
            accumulatedRewards = accumulatedRewards + (value*PRECISION_CONSTANT) / binToken.balanceOf(address(this));
        }
        else {
            owner.transfer(value);
        }
        emit Reward(value);
    }

    function stake(uint amount) external{
        require(amount > 0, "Amount should be greater than 0");
        release();
        require(binToken.transferFrom(msg.sender, address(this), amount));
        stakingBalance[msg.sender].stakedBin = stakingBalance[msg.sender].stakedBin + amount;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint amount) external {
        require(amount > 0, "Amount should be greater than 0");
        require(amount <= stakingBalance[msg.sender].stakedBin, "Cannot unstake more than balance");

        release();
        stakingBalance[msg.sender].stakedBin = stakingBalance[msg.sender].stakedBin - amount;

        binToken.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function release () public {
        if (accumulatedRewards == 0){
            return;
        }
        uint amount = ownedDividends(msg.sender);
        stakingBalance[msg.sender].valueWhenLastReleased = accumulatedRewards;                                                        
        
        if (amount > 0) {
            payable(msg.sender).transfer(amount);
            emit Release(msg.sender, amount);
        }
    }

    function ownedDividends(address user) public view returns(uint) {
        StakingAccount memory balance = stakingBalance[user];
        return  (balance.stakedBin * (accumulatedRewards - balance.valueWhenLastReleased)) / PRECISION_CONSTANT ;
    }


}

