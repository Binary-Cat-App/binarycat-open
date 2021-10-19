task("kitty:balance", "Prints balance")
  .addOptionalParam(
    "user", 
    "Address of the user"
  )
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        const [signer] = await ethers.getSigners();
        let BinToken = await deployments.get("BinToken");

        let user = taskArgs.user
        if (typeof user == 'undefined') {
            user = await signer.getAddress(); 
        }

        let token = await ethers.getContractAt(
            BinToken.abi,
            BinToken.address
        );
        let balance = await token.balanceOf(user)
        console.log("user %s", user)
        console.log("User balance: %s KITTY", ethers.utils.formatEther(balance))
  });

task("kitty:stake", "Stake KITTY tokens")
  .addPositionalParam(
    "amount", 
    "Amount to stake"
  )
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        const [signer] = await ethers.getSigners();

        let BinToken = await deployments.get("BinToken");
        let token = await ethers.getContractAt(
            BinToken.abi,
            BinToken.address
        );

        let BinStake = await deployments.get("BinaryStaking");
        let staking = await ethers.getContractAt(
            BinStake.abi,
            BinStake.address
        );
        let amount = ethers.utils.parseEther(taskArgs.amount)
        let allowance = await token.allowance(signer.getAddress(), staking.address)
        if (amount > allowance) {
            await token.connect(signer).approve(staking.address, amount)
        }
        await staking.connect(signer).stake(amount)
  });

task("kitty:unstake", "Unstake KITTY tokens")
  .addPositionalParam(
    "amount", 
    "Amount to unstake"
  )
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        const [signer] = await ethers.getSigners();

        let BinStake = await deployments.get("BinaryStaking");
        let staking = await ethers.getContractAt(
            BinStake.abi,
            BinStake.address
        );

        let amount = ethers.utils.parseEther(taskArgs.amount)
        await staking.connect(signer).unstake(amount)
  });

task("kitty:dividends", "Prints owned dividends")
  .addOptionalParam(
    "user", 
    "Address of the user"
  )
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        let BinStaking = await deployments.get("BinaryStaking");

        let user = taskArgs.user
        if (typeof user == 'undefined') {
            const [signer] = await ethers.getSigners();
            user = await signer.getAddress(); 
        }

        let staking = await ethers.getContractAt(
            BinStaking.abi,
            BinStaking.address
        );
        let dividends = await staking.ownedDividends(user)

        console.log("user %s", user)
        console.log("Owned dividends: %s MATIC", ethers.utils.formatEther(dividends))
  });

task("kitty:staked", "Prints user staked KITTY")
  .addOptionalParam(
    "user", 
    "Address of the user"
  )
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        let BinStaking = await deployments.get("BinaryStaking");

        let user = taskArgs.user
        if (typeof user == 'undefined') {
            const [signer] = await ethers.getSigners();
            user = await signer.getAddress(); 
        }

        let staking = await ethers.getContractAt(
            BinStaking.abi,
            BinStaking.address
        );
        let account = await staking.stakingBalance(user)

        console.log("user %s", user)
        console.log("Staked: %s KITTY", ethers.utils.formatEther(account.stakedBin))

  });
task("kitty:release", "Release ownned dividends")
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        const [signer] = await ethers.getSigners();

        let BinStake = await deployments.get("BinaryStaking");
        let staking = await ethers.getContractAt(
            BinStake.abi,
            BinStake.address
        );
        await staking.connect(signer).release()
  });
