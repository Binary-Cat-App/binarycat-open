const { expect } = require("chai");
const {deployMockContract} = require('@ethereum-waffle/mock-contract');
const { deployments, ethers } = require("hardhat");
const AGGREGATOR = require('../artifacts/@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol/AggregatorV3Interface.json')

describe("BinaryBets Pool Creation", function () {

    beforeEach(async function () {
        [owner, account1, account2, account3, ...addrs] = await ethers.getSigners();

        mockAggregator = await deployMockContract(owner, AGGREGATOR.abi);

        let aggregatorAddress = mockAggregator.address

        BinaryBet = await ethers.getContractFactory("BinaryBet");
        BinaryStaking = await ethers.getContractFactory("BinaryStaking");
        BinToken = await ethers.getContractFactory("BinToken");

        token = await BinToken.deploy();
        stk = await BinaryStaking.deploy(token.address);
        bet = await BinaryBet.deploy(30, 1, aggregatorAddress, stk.address, token.address, 332);
    });

    it("Should update the pool", async function () {
        let result = await bet.updatePool(100,150, 0, 10)
        expect(result[0]).to.equal(110);
        expect(result[1]).to.equal(150);

        result = await bet.updatePool(200,80, 0, 30)
        expect(result[0]).to.equal(230);
        expect(result[1]).to.equal(80);

        result = await bet.updatePool(200,80, 1, 30)
        expect(result[0]).to.equal(200);
        expect(result[1]).to.equal(110);

        result = await bet.updatePool(10,0, 1, 150)
        expect(result[0]).to.equal(10);
        expect(result[1]).to.equal(150);
    });

});
