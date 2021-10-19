const { expect } = require("chai");
const {
    BN,           // Big Number support
    } = require('@openzeppelin/test-helpers');
const {deployMockContract} = require('@ethereum-waffle/mock-contract');
const { deployments, ethers } = require("hardhat");
const AGGREGATOR = require('../artifacts/@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol/AggregatorV3Interface.json')

describe("BinaryBets Bet management", function () {
    let owner;
    let account1;
    let account2;
    let account3;

    let BinaryBet
    let BinaryStaking
    let BinToken
    let aggregatorAddress


      beforeEach(async function () {
        [owner, account1, account2, account3, ...addrs] = await ethers.getSigners();
        provider = ethers.provider;

        mockAggregator = await deployMockContract(owner, AGGREGATOR.abi);
        aggregatorAddress = mockAggregator.address

        BinaryBet = await ethers.getContractFactory("BinaryBet");
        BinaryStaking = await ethers.getContractFactory("BinaryStaking");
        BinToken = await ethers.getContractFactory("BinToken");

        token = await BinToken.deploy();
        stk = await BinaryStaking.deploy(token.address);
        bet = await BinaryBet.deploy(30, 1, aggregatorAddress, stk.address, token.address, 332);
        await mockAggregator.mock.latestRoundData.returns(100, 100,100,100,100);
  });

    async function mine(blocks) {
        for (i = 0; i <= blocks; i++) {
            await network.provider.send("evm_mine");
        }
    }

    it("Should get the correct bet result", async function () {
        // function betResult(uint referencePrice, uint settlementPrice) public pure returns(BetResult)
        let result = await bet.betResult(100, 110);
        expect(result).to.equal(1);

        result = await bet.betResult(100, 100);
        expect(result).to.equal(2);

        result = await bet.betResult(115, 710);
        expect(result).to.equal(1);

        result = await bet.betResult(155, 10);
        expect(result).to.equal(0);

        result = await bet.betResult(100, 85);
        expect(result).to.equal(0);

        result = await bet.betResult(10, 10);
        expect(result).to.equal(2);

        result = await bet.betResult(115, 110);
        expect(result).to.equal(0);

        result = await bet.betResult(175, 310);
        expect(result).to.equal(1);
    });

    function share (value, total, share) {
        return value.mul(share).div(total)
    }

    function payoff(upStake, downStake, poolUp, poolDown, betResult) {
        let US = new BN(upStake)
        let DS = new BN(downStake)
        let PU = new BN(poolUp)
        let PD = new BN(poolDown)
        let PT = PU.add(PD)
        let result = 0
        if (betResult === 1 & poolUp != 0) {result = share(PT, PU, US)}
        else if (betResult === 0 & poolDown !=0) {result = share(PT, PD, DS)}
        else if (betResult == 2) {return US.add(DS)}
        return result

    }

    it("Should get the correct bet payoff", async function () {
        let US = ["78000000000000000000", "23000000000000000000", "8000000000000000000", "81000000000000000000", "7000000000000000000", "96000000000000000000", "81000000000000000000", "62000000000000000000", "60000000000000000000", "5000000000000000000", "10000000000000000000", "45000000000000000000", "72000000000000000000", "63000000000000000000", "4000000000000000000", "89000000000000000000", "4000000000000000000", "57000000000000000000", "13000000000000000000", "91000000000000000000", "31000000000000000000", "16000000000000000000", "1000000000000000000", "10000000000000000000", "47000000000000000000", "45000000000000000000", "53000000000000000000", "80000000000000000000", "39000000000000000000", "91000000000000000000", "70000000000000000000", "0000000000000000000", "0000000000000000000", "0000000000000000000", "0000000000000000000"]
        let DS = ["5000000000000000000", "29000000000000000000", "2000000000000000000", "12000000000000000000", "1000000000000000000", "36000000000000000000", "45000000000000000000", "96000000000000000000", "48000000000000000000", "33000000000000000000", "77000000000000000000", "59000000000000000000", "86000000000000000000", "38000000000000000000", "21000000000000000000", "5000000000000000000", "86000000000000000000", "63000000000000000000", "100000000000000000000", "68000000000000000000", "15000000000000000000", "25000000000000000000", "73000000000000000000", "33000000000000000000", "3000000000000000000", "46000000000000000000", "10000000000000000000", "0000000000000000000", "0000000000000000000", "0000000000000000000", "0000000000000000000", "0000000000000000000", "74000000000000000000", "61000000000000000000", "8000000000000000000","4000000000000000000"]
        let PU = ["1708000000000000000000", "1116000000000000000000", "1319000000000000000000", "1912000000000000000000", "1667000000000000000000", "1175000000000000000000", "1646000000000000000000", "1831000000000000000000", "1721000000000000000000", "1280000000000000000000", "1965000000000000000000", "1199000000000000000000", "1300000000000000000000", "1556000000000000000000", "1299000000000000000000", "1853000000000000000000", "1164000000000000000000", "1806000000000000000000", "1741000000000000000000", "1972000000000000000000", "1684000000000000000000", "1046000000000000000000", "1142000000000000000000", "1837000000000000000000", "1567000000000000000000", "1123000000000000000000", "1516000000000000000000", "1929000000000000000000", "1558000000000000000000", "1904000000000000000000", "1646000000000000000000", "1844000000000000000000", "1578000000000000000000", "1554000000000000000000", "139000000000000000000","5000000000000000000"]
        let PD = ["1931000000000000000000", "1912000000000000000000", "1035000000000000000000", "1725000000000000000000", "1306000000000000000000", "1230000000000000000000", "1650000000000000000000", "1907000000000000000000", "1697000000000000000000", "1029000000000000000000", "1596000000000000000000", "1854000000000000000000", "1952000000000000000000", "1582000000000000000000", "1026000000000000000000", "1904000000000000000000", "1620000000000000000000", "1114000000000000000000", "1245000000000000000000", "1092000000000000000000", "1531000000000000000000", "1645000000000000000000", "1960000000000000000000", "1996000000000000000000", "1359000000000000000000", "1437000000000000000000", "1781000000000000000000", "1416000000000000000000", "1670000000000000000000", "1562000000000000000000", "1454000000000000000000", "1448000000000000000000", "1968000000000000000000", "1078000000000000000000", "133000000000000000000","4000000000000000000"]
        let side = [0, 2, 1, 2, 2, 1, 2, 0, 2, 1, 1, 2, 2, 2, 0, 2, 1, 1, 2, 0, 2, 1, 1, 0, 0, 2, 0, 1, 2, 1, 0, 0, 2, 0, 1]

        for (let i = 0; i < US.length; i++) {
            let us = US[i]
            let ds = DS[i]
            let pd = PD[i]
            let pu = PU[i]
            let s = side[i]

            let value = payoff(us, ds, pu, pd, s).toString()
            let result = await bet.settleBet(us, ds, pu, pd, s)
            result = result[0]
            //console.log(value, result.toString(), "\n")
            //expect(result.toString()).to.equal(value.toString());
            expect(result - value).to.be.below(1);

            result = await bet.settleBet(0, 100, 0, 200, 1)
            expect(result[0]).to.equal(0)
            expect(result[1]).to.equal(100)

            result = await bet.settleBet(1221, 0, 2323232, 0, 0)
            expect(result[0]).to.equal(0)
            expect(result[1]).to.equal(1221)
        }

    });
    

    it("Should bet with sent funds", async function () {
        await bet.connect(account1).placeBet(0, {value: 100});
    });

    it("Should revert zero value bet", async function () {
        await expect(
            bet.connect(account1).placeBet(0, {value: 0})
      ).to.be.revertedWith("Only strictly positive values");
    });

    it("Should accumulate fees", async function () {
        await bet.connect(account1).placeBet(0, {value: 100})
        let fee = await bet.accumulatedFees()
        expect(fee).to.equal(1);

        await bet.connect(account2).placeBet(0, {value: 200})
        fee = await bet.accumulatedFees()
        expect(fee).to.equal(3);
        
        await bet.connect(account3).placeBet(0, {value: 500})
        fee = await bet.accumulatedFees()
        expect(fee).to.equal(8);

    });

    it("Should update pool", async function () {
        bet = await BinaryBet.deploy(30, 0, aggregatorAddress, stk.address, token.address, 332);
        await bet.connect(account1).placeBet(0, {value: 100})
        let pool = await bet.getPoolValues(1)
        expect(pool[0]).to.equal(100);
        expect(pool[1]).to.equal(0);

        await bet.connect(account2).placeBet(0, {value: 200})
        pool = await bet.getPoolValues(1)
        expect(pool[0]).to.equal(300);
        expect(pool[1]).to.equal(0);
        
        await bet.connect(account3).placeBet(1, {value: 500})
        pool = await bet.getPoolValues(1)
        expect(pool[0]).to.equal(300);
        expect(pool[1]).to.equal(500);
    });

    it("Should update stake", async function () {
        bet = await BinaryBet.deploy(30, 0, aggregatorAddress, stk.address, token.address, 332);
        await bet.connect(account1).placeBet(0, {value: 100})
        let stake = await bet.getUserStake(1, account1.address)
        expect(stake[0]).to.equal(100);
        expect(stake[1]).to.equal(0);

        await bet.connect(account2).placeBet(0, {value: 200})
        stake = await bet.getUserStake(1, account2.address)
        expect(stake[0]).to.equal(200);
        expect(stake[1]).to.equal(0);
        
        await bet.connect(account3).placeBet(1, {value: 500})
        stake = await bet.getUserStake(1, account3.address)
        expect(stake[0]).to.equal(0);
        expect(stake[1]).to.equal(500);
    });


    it("Should transfer fees to staking", async function () {
        let value = ethers.utils.parseEther("100")
        await token.connect(owner).approve(stk.address, value)
        await stk.connect(owner).stake(value)

        bet = await BinaryBet.deploy(10, 2, aggregatorAddress, stk.address, token.address, 332);
        await bet.connect(account3).placeBet(0, {value: 200})
        
        let fees = await bet.accumulatedFees()
        expect(fees.toString()).to.equal('4')

        await mine(300)
        await bet.updateBalance(account3.getAddress())
        fees = await bet.accumulatedFees()
        expect(fees.toString()).to.equal('0')

        let stakingBalance = await provider.getBalance(stk.address);
        expect(stakingBalance.toString()).to.equal('4')
    });

    it("Should reward KITTY", async function () {
        let tokenValue = ethers.utils.parseEther("1000")
        let reward = await bet.REWARD_PER_WINDOW()
        await token.connect(owner).transfer(bet.address, tokenValue)

        await bet.connect(account1).placeBet(0, {value: 100})

        await mine(300)
        await bet.updateBalance(account1.getAddress())

        let kittyBalance = await token.balanceOf(account1.getAddress());
        expect(kittyBalance.toString()).to.equal(reward)
    });

    it("Should reward KITTY with partial amount", async function () {
        let tokenValue = ethers.utils.parseEther("150")
        await token.connect(owner).transfer(bet.address, tokenValue)

        await bet.connect(account1).placeBet(0, {value: 100})

        await mine(300)
        await bet.updateBalance(account1.getAddress())

        let kittyBalance = await token.balanceOf(account1.getAddress());
        expect(kittyBalance.toString()).to.equal(tokenValue)
    });

    it("Should reward KITTY with zero", async function () {
        await bet.connect(account1).placeBet(0, {value: 100})

        await mine(300)
        await bet.updateBalance(account1.getAddress())

        let kittyBalance = await token.balanceOf(account1.getAddress());
        expect(kittyBalance.toString()).to.equal('0')
    });

    it("Should return correct window status", async function () {
        let initial = 100
        let final = 150
        let current = 1
        let window = 1
        
        state = await bet.windowStatus(window, current, initial, final)
        expect(state).to.equal(0)

        initial = 100
        final = 150
        current = 11
        window = 10
        
        state = await bet.windowStatus(window, current, initial, final)
        expect(state).to.equal(0)

        initial = 100
        final = 150
        current = 12
        window = 10
        
        state = await bet.windowStatus(window, current, initial, 0)
        expect(state).to.equal(1)

        initial = 100
        final = 150
        current = 13
        window = 10
        
        state = await bet.windowStatus(window, current, initial, 0)
        expect(state).to.equal(2)

        initial = 100
        final = 150
        current = 12
        window = 10
        
        state = await bet.windowStatus(window, current, 0, final)
        expect(state).to.equal(2)

        initial = 100
        final = 150
        current = 12
        window = 10
        
        state = await bet.windowStatus(window, current, initial, final)
        expect(state).to.equal(3)

        initial = 100
        final = 150
        current = 67
        window = 14
        
        state = await bet.windowStatus(window, current, initial, final)
        expect(state).to.equal(3)
    });


});

