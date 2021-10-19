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
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BinToken.sol";
import "./BinaryStaking.sol";

contract BinaryBet is Ownable {
    //Structs and enums
    enum BetSide {
        down,
        up
    }
    enum BetResult {
        down,
        up,
        tie
    }
    enum WindowStatus {
        notFinalized,
        waitingPrice,
        failedUpdate,
        finalized
    }

    struct Pool {
        uint64 downValue;
        uint64 upValue;
    }

    //Betting parameters
    AggregatorV3Interface internal priceFeed;
    uint256 public immutable REWARD_PER_WINDOW;
    uint256 public fee;
    uint256 public windowDuration; //in blocks
    uint256 public firstBlock;
    BinaryStaking staking;
    address payable stakingAddress;

    BinToken token;

    //Window management
    mapping(uint256 => Pool) public pools; //windowNumber => Pool
    mapping(uint256 => uint256) public windowPrice; //first price collection at the window.
    uint256 public firstWindow = 1; //Any bet before first block of betting is directed to the first window.
    uint256 public windowOffset; //used make window continuous and monotonically increasing when window duration and first block changes.
    uint256 public accumulatedFees;

    //User variables
    mapping(address => mapping(uint256 => Pool)) public userStake;
    mapping(address => uint256[]) public userBets;
    mapping(address => mapping(uint256 => bool)) public userBetted;

    //EVENTS
    event NewBet(
        address indexed user,
        uint256 indexed windowNumber,
        uint256 value,
        uint8 side
    );
    event BetSettled(
        uint256 indexed windowNumber,
        address indexed user,
        uint256 gain
    );
    event PriceUpdated(uint256 indexed windowNumber, uint256 price);

    constructor(
        uint256 _windowDuration,
        uint256 _fee,
        address aggregator,
        address stakingContract,
        address tokenContract,
        uint256 reward
    ) {
        require(_fee <= 100, "Fee should be less than 100");
        priceFeed = AggregatorV3Interface(aggregator);
        firstBlock = block.number;
        windowDuration = _windowDuration;

        fee = _fee;
        firstWindow = 1;

        stakingAddress = payable(stakingContract);
        staking = BinaryStaking(stakingAddress);
        token = BinToken(tokenContract);

        REWARD_PER_WINDOW = reward * 1e18;
    }

    //=============GOVERNANCE FUNCTIONS=============================================
    function changeWindowSize(uint256 windowSize) public onlyOwner {
        require(windowSize > 0, "window size should positive");
        uint256 currentWindow = getWindowNumber(
            block.number,
            windowDuration,
            firstBlock,
            windowOffset,
            firstWindow
        );
        firstBlock = getWindowStartingBlock(
            currentWindow + 1,
            windowDuration,
            firstBlock,
            windowOffset
        );
        windowOffset = currentWindow;
        firstWindow = currentWindow;
        windowDuration = windowSize;
    }

    //==============================================================================
    function placeBet(uint8 side) external payable {
        require(msg.value > 0, "Only strictly positive values");
        updatePrice();
        updateBalance(msg.sender);

        uint256 betFee = computeFee(msg.value, fee);
        accumulatedFees = accumulatedFees + betFee;
        uint64 value = uint64(msg.value - betFee);

        uint256 windowNumber = getWindowNumber(
            block.number,
            windowDuration,
            firstBlock,
            windowOffset,
            firstWindow
        );
        if (!userBetted[msg.sender][windowNumber]) {
            //only adds the bet to the list if it is the first time the user bets at the window
            userBets[msg.sender].push(windowNumber);
            userBetted[msg.sender][windowNumber] = true;
        }

        //Update the pool for the window.
        Pool memory oldPool = pools[windowNumber];
        (uint64 newDown, uint64 newUp) = updatePool(
            oldPool.downValue,
            oldPool.upValue,
            side,
            value
        );
        pools[windowNumber] = Pool(newDown, newUp);

        //Update the user stake for the window.
        Pool memory oldStake = userStake[msg.sender][windowNumber];
        (newDown, newUp) = updatePool(
            oldStake.downValue,
            oldStake.upValue,
            side,
            value
        );
        userStake[msg.sender][windowNumber] = Pool(newDown, newUp);

        emit NewBet(msg.sender, windowNumber, value, side);
    }

    function updateBalance(address user) public {
        uint256[] storage userWindowsList = userBets[user];
        if (userWindowsList.length == 0) {
            //No bets to settle
            return;
        }

        uint256 totalGain = 0;
        for (uint256 i = userWindowsList.length; i > 0; i--) {
            //Maximum number of itens in list is 2, when the user bets on 2 subsequent windows and the first window is not yet settled.

            uint256 window = userWindowsList[i - 1];
            uint256 currentWindow = getWindowNumber(
                block.number,
                windowDuration,
                firstBlock,
                windowOffset,
                firstWindow
            );
            (
                uint256 referencePrice,
                uint256 settlementPrice
            ) = getWindowBetPrices(window);

            WindowStatus status = windowStatus(
                window,
                currentWindow,
                referencePrice,
                settlementPrice
            );
            if (
                status == WindowStatus.notFinalized ||
                status == WindowStatus.waitingPrice
            ) {
                continue;
            }

            uint8 result;
            if (status == WindowStatus.finalized) {
                result = betResult(referencePrice, settlementPrice);
            } else if (status == WindowStatus.failedUpdate) {
                result = 2;
            }

            //Remove window from list of unsettled bets.
            userWindowsList[i - 1] = userWindowsList[
                userWindowsList.length - 1
            ];
            userWindowsList.pop();

            Pool memory stake = userStake[user][window];
            Pool memory pool = pools[window];
            (uint256 windowGain, uint256 fees) = settleBet(
                stake.upValue,
                stake.downValue,
                pool.upValue,
                pool.downValue,
                result
            );

            totalGain = totalGain + windowGain;
            accumulatedFees = accumulatedFees + fees;

            //KITTY token rewards
            uint256 reward = calculateTokenReward(
                stake.upValue,
                stake.downValue,
                pool.upValue,
                pool.downValue
            );
            transferRewards(user, reward);
            transferFees();
            emit BetSettled(window, user, windowGain);
        }

        if (totalGain >= 0) {
            payable(user).transfer(totalGain);
        }
    }

    function windowStatus(
        uint256 window,
        uint256 currentWindow,
        uint256 initialPrice,
        uint256 finalPrice
    ) public pure returns (WindowStatus status) {
        if (currentWindow < window + 2) {
            //window not yet settled
            return WindowStatus.notFinalized;
        } else if (currentWindow < window + 3 && finalPrice == 0) {
            //price not updated but update still possible.
            return WindowStatus.waitingPrice;
        } else if (initialPrice == 0 || finalPrice == 0) {
            return WindowStatus.failedUpdate;
        } else {
            return WindowStatus.finalized;
        }
    }

    function transferRewards(address user, uint256 amount) internal {
        if (token.balanceOf(address(this)) >= amount) {
            token.transfer(user, amount);
        } else {
            token.transfer(user, token.balanceOf(address(this)));
        }
    }

    function transferFees() internal {
        if (accumulatedFees > 0) {
            staking.receiveFunds{value: accumulatedFees}();
            accumulatedFees = 0;
        }
    }

    function settleBet(
        uint256 upStake,
        uint256 downStake,
        uint256 poolUp,
        uint256 poolDown,
        uint8 res
    ) public pure returns (uint256 gain, uint256 fees) {
        BetResult result = BetResult(res);
        uint256 poolTotal = poolUp + poolDown;
        if (result == BetResult.up && poolUp != 0) {
            //(upStake/poolUp)*poolTotal
            gain = sharePool(poolTotal, upStake, poolUp);
        } else if (result == BetResult.down && poolDown != 0) {
            //(downStake/poolDown)*poolTotal
            gain = sharePool(poolTotal, downStake, poolDown);
        } else if (result == BetResult.tie) {
            gain = upStake + downStake;
        } else {
            //If the winning pool is empty, all stake goes to the fees.
            gain = 0;
            fees = upStake + downStake;
        }
    }

    function betResult(uint256 referencePrice, uint256 settlementPrice)
        public
        pure
        returns (uint8)
    {
        if (settlementPrice < referencePrice) {
            return 0;
        } else if (settlementPrice > referencePrice) {
            return 1;
        }
        return 2;
    }

    function sharePool(
        uint256 value,
        uint256 shares,
        uint256 totalShares
    ) internal pure returns (uint256) {
        return (shares * value) / totalShares;
    }

    function calculateTokenReward(
        uint256 upStake,
        uint256 downStake,
        uint256 poolUp,
        uint256 poolDown
    ) public view returns (uint256) {
        return
            sharePool(
                REWARD_PER_WINDOW,
                upStake + downStake,
                poolUp + poolDown
            );
    }

    function updatePool(
        uint64 downValue,
        uint64 upValue,
        uint8 side,
        uint64 value
    ) public pure returns (uint64, uint64) {
        BetSide betSide = BetSide(side);
        if (betSide == BetSide.down) {
            return (downValue + value, upValue);
        } else {
            return (downValue, upValue + value);
        }
    }

    function getWindowNumber(
        uint256 currentBlock,
        uint256 _windowDuration,
        uint256 _firstBlock,
        uint256 _windowOffset,
        uint256 _firstWindow
    ) public pure returns (uint256 windowNumber) {
        if (currentBlock < _firstBlock) {
            windowNumber = _firstWindow;
        } else {
            //n = floor((block - first_block)/window_size  + 1)
            windowNumber =
                ((currentBlock - _firstBlock) / _windowDuration) +
                _windowOffset +
                1; //integer division => floor
        }
    }

    function getWindowStartingBlock(
        uint256 windowNumber,
        uint256 _windowDuration,
        uint256 _firstBlock,
        uint256 _windowOffset
    ) public pure returns (uint256 startingBlock) {
        //firstBlock + (n-1 - (offset + 1))*window_size
        startingBlock =
            _firstBlock +
            (windowNumber - 1 - _windowOffset) *
            _windowDuration;
    }

    function computeFee(uint256 value, uint256 _fee)
        public
        pure
        returns (uint256 betFee)
    {
        betFee = (value * _fee) / 100;
    }

    function updatePrice() public {
        uint256 window = getWindowNumber(
            block.number,
            windowDuration,
            firstBlock,
            windowOffset,
            firstWindow
        );
        if (windowPrice[window] == 0) {
            windowPrice[window] = priceOracle();
            emit PriceUpdated(window, windowPrice[window]);
        }
    }

    function priceOracle() internal view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return uint256(price);
    }

    //Getters
    function getPoolValues(uint256 windowNumber)
        public
        view
        returns (uint256, uint256)
    {
        Pool memory pool = pools[windowNumber];
        return (pool.downValue, pool.upValue);
    }

    function getUserStake(uint256 windowNumber, address user)
        public
        view
        returns (uint256, uint256)
    {
        Pool memory stake = userStake[user][windowNumber];
        return (stake.downValue, stake.upValue);
    }

    function getWindowBetPrices(uint256 window)
        public
        view
        returns (uint256, uint256)
    {
        return (windowPrice[window + 1], windowPrice[window + 2]);
    }

    function getUserBetList(address user, uint256 index)
        public
        view
        returns (uint256)
    {
        return userBets[user][index];
    }

    function betListLen(address user) public view returns (uint256) {
        return userBets[user].length;
    }
}
