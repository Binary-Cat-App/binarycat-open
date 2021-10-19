task("mine:basic", "Mine KITTY tokens by betting in both sides each window")
  .addParam("bet", "Value to bet in each side")
  .addParam("timeout", "time in miliseconds between checks")
  .addOptionalParam(
    "onlyfirst", 
    "If true, only bets if the price for the window has no price yet ",
    false,
    types.boolean
  )
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        let BinaryBet = await deployments.get("BinaryBet");

        let bet = await ethers.getContractAt(
            BinaryBet.abi,
            BinaryBet.address
        );

      while (true) {
        await new Promise(r => setTimeout(r, taskArgs.timeout));
        let windowNumber = await hre.run("current_window")
        let price = await bet.windowPrice(windowNumber)

        if (price.toString() != "0" && taskArgs.onlyfirst) {
            console.log("Price already updated and --onlyFirst flag activated")
            continue;
        }

        let betValue = ethers.utils.parseEther(taskArgs.bet)

        let stake = await hre.run('user:bets')
        let stakeDown = stake[0]
        let stakeUp = stake[1]

        if (betValue.gt(stakeUp)) {
            await hre.run("bet:place", {side: 'up', bet:  ethers.utils.formatEther(betValue.sub(stakeUp))} )
        }

        if (betValue.gt(stakeDown)) {
            await hre.run("bet:place", {side: 'down', bet: ethers.utils.formatEther(betValue.sub(stakeDown))} )
        }

      }
  });
