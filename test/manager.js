const { expect } = require("chai");
const {
    expectRevert,
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
        Manager = await ethers.getContractFactory("Manager");

        token = await BinToken.deploy();
        stk = await BinaryStaking.deploy(token.address);
        bet1 = await BinaryBet.deploy(30, 2, aggregatorAddress, stk.address, token.address, 332);
        bet2 = await BinaryBet.deploy(30, 2, aggregatorAddress, stk.address, token.address, 332);
        bet3 = await BinaryBet.deploy(30, 2, aggregatorAddress, stk.address, token.address, 332);
        manager = await Manager.deploy();

        await mockAggregator.mock.latestRoundData.returns(100, 100,100,100,100);
  });

    async function mine(blocks) {
        for (i = 0; i <= blocks; i++) {
            await network.provider.send("evm_mine");
        }
    }


    it("Should add new asset", async function () {
        let id = "eth";
        await manager.addAsset(id, bet1.address)
        let existsId = await manager.assetExists(id)
        let existsAddress = await manager.usedAddress(bet1.address)
        expect(existsId).to.equal(true)
        expect(existsAddress).to.equal(true)

        let count = await manager.assetCount()
        expect(count).to.equal(1)
        let contract = await manager.assetContracts(0)
        expect(contract).to.equal(bet1.address)

        id = "bnb";
        await manager.addAsset(id, bet2.address)
        existsId = await manager.assetExists(id)
        existsAddress = await manager.usedAddress(bet1.address)
        expect(existsId).to.equal(true)
        expect(existsAddress).to.equal(true)

        count = await manager.assetCount()
        expect(count).to.equal(2)
        contract = await manager.assetContracts(1)
        expect(contract).to.equal(bet2.address)

        id = "btc";
        await manager.addAsset(id, bet3.address)
        existsId = await manager.assetExists(id)
        existsAddress = await manager.usedAddress(bet2.address)
        expect(existsId).to.equal(true)
        expect(existsAddress).to.equal(true)

        count = await manager.assetCount()
        expect(count).to.equal(3)
        contract = await manager.assetContracts(2)
        expect(contract).to.equal(bet3.address)

        
    });

    it("Should not allow asset id reuse", async function () {
        let id = "eth";
        await manager.addAsset(id, bet1.address)
        await expect(
            manager.addAsset(id, bet2.address)
      ).to.be.revertedWith("Asset already exists");

    });

    it("Should not allow asset address reuse", async function () {
        let id = "eth";
        await manager.addAsset(id, bet1.address)
        id = 'btc'
        await expect(
            manager.addAsset(id, bet1.address)
      ).to.be.revertedWith("Address already used");

    });


    it("Should update all assets", async function () {
        let value = ethers.utils.parseEther("100")
        await token.connect(owner).approve(stk.address, value)
        await stk.connect(owner).stake(value)

        await manager.addAsset('eth', bet1.address)
        await manager.addAsset('bnb', bet2.address)
        await manager.addAsset('btc', bet3.address)

        let balance = await provider.getBalance(account3.getAddress());
        await bet1.connect(account3).placeBet(0, {value: 200})
        await bet2.connect(account3).placeBet(0, {value: 200})
        await bet3.connect(account3).placeBet(0, {value: 200})

        let balance1 = await provider.getBalance(account3.getAddress());
        let delta = balance.sub(balance1) 
        expect(delta.toString()).to.equal('600')

        let fees = await bet1.accumulatedFees()
        expect(fees.toString()).to.equal('4')
        fees = await bet2.accumulatedFees()
        expect(fees.toString()).to.equal('4')
        fees = await bet3.accumulatedFees()
        expect(fees.toString()).to.equal('4')

        await mine(300)
        await manager.connect(account3).claim()
        fees = await bet1.accumulatedFees()
        expect(fees.toString()).to.equal('0')
        fees = await bet2.accumulatedFees()
        expect(fees.toString()).to.equal('0')
        fees = await bet3.accumulatedFees()
        expect(fees.toString()).to.equal('0')

        let balance2 = await provider.getBalance(account3.getAddress());
        delta = balance2.sub(balance1) 
        expect(delta).to.equal('588')
    });

    it("Should update all prices", async function () {
        await manager.addAsset('eth', bet1.address)
        await manager.addAsset('bnb', bet2.address)
        await manager.addAsset('btc', bet3.address)

        let price = await bet1.windowPrice(1)
        expect(price).to.equal(0)
        price = await bet2.windowPrice(1)
        expect(price).to.equal(0)
        price = await bet3.windowPrice(1)
        expect(price).to.equal(0)

        await manager.connect(account3).updatePrice()

        price = await bet1.windowPrice(1)
        expect(price).to.equal(100)
        price = await bet2.windowPrice(1)
        expect(price).to.equal(100)
        price = await bet3.windowPrice(1)
        expect(price).to.equal(100)

    });

});
