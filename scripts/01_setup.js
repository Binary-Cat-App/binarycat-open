const hre = require('hardhat');
const {deployments, getNamedAccounts, ethers} = hre;
/*
 Execute setup operations after deployment:
 1) Set the staking contract address at the bet contract so it can receive fees.
 2) Set the token contract address at the bet contract so betting can transfer token rewards.
 3) Transfer 50% of the initial token supply to be available for betting rewards.
 */

async function main() {
    const {deployer} = await getNamedAccounts();
    const [signer] = await ethers.getSigners();

    deployedContracts = await deployments.all()
    BinaryBet = deployedContracts['BinaryBet']
    BinToken = deployedContracts['BinToken']

    const bet = await hre.ethers.getContractAt(BinaryBet.abi, BinaryBet.address);
    const token = await hre.ethers.getContractAt(BinToken.abi, BinToken.address);

    //Transfer tokens for bet rewards
    const initialSupply = await token.INITIAL_SUPPLY()
    const transferAmount =  BigInt(initialSupply.div(2)).toString() 
    await token.transfer(bet.address, transferAmount, {from: deployer})

}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
