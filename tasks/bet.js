
task("bet:update_price", "Updates the price for the window", async function (
  _,
  hre,
) {
        const { deployments, ethers } = hre;
        const [signer] = await ethers.getSigners();
        let BinaryBet = await deployments.get("BinaryBet");
        let windowNumber = await hre.run("current_window")

        let bet = await ethers.getContractAt(
            BinaryBet.abi,
            BinaryBet.address
        );

        let price = await bet.windowPrice(windowNumber)
        if (price == 0) {
            await bet.connect(signer).updatePrice()
            let newPrice = await bet.windowPrice(windowNumber)
            console.log('price updated: ', newPrice.toString())
        }
        else {
            console.log('already updated')
        }
});

task("bet:place", "Place bet")
  .addPositionalParam("side", "down|up")
  .addPositionalParam("bet", "Value to bet in Matic")
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        const [signer] = await ethers.getSigners();
        let BinaryBet = await deployments.get("BinaryBet");

        let bet = await ethers.getContractAt(
            BinaryBet.abi,
            BinaryBet.address
        );
      let betValue = ethers.utils.parseEther(taskArgs.bet)
      sideEncoded = taskArgs.side == "up"? "1":"0" 
      await bet.connect(signer).placeBet(sideEncoded, {value: betValue})
      console.log("Betted %s Matic in %s", taskArgs.bet, taskArgs.side)
});

task("bet:window", "Prints current betting window", async function (
  _,
  hre,
) {
        let windowNumber = await hre.run("current_window")
        console.log('Current window number:', windowNumber.toString())
});

subtask("current_window", "Gets current betting window", async function (
  _,
  hre,
) {
        const { deployments, ethers } = hre;
        let BinaryBet = await deployments.get("BinaryBet");
        let bet = await ethers.getContractAt(
            BinaryBet.abi,
            BinaryBet.address
        );

        let duration = await bet.windowDuration()
        let firstBlock = await bet.firstBlock()
        let firstWindow = await bet.firstWindow()
        let offset = await bet.windowOffset()
        let block = ethers.provider.getBlockNumber()
        let windowNumber = await bet.getWindowNumber(block, duration, firstBlock, offset, firstWindow);
        return windowNumber
});


task("bet:pool", "Get window pool size")
  .addOptionalParam(
    "window", 
    "Betting window"
  )
  .setAction(async (taskArgs) => {
        const { deployments, ethers } = hre;
        let BinaryBet = await deployments.get("BinaryBet");

        let window = taskArgs.window
        if (typeof window == 'undefined') {
            window = await hre.run("current_window"); 
        }

        let bet = await ethers.getContractAt(
            BinaryBet.abi,
            BinaryBet.address
        );
        pool = await bet.getPoolValues(window)
        console.log("Pool down: %s Matic", ethers.utils.formatEther(pool[0]))
        console.log("Pool up: %s Matic", ethers.utils.formatEther(pool[1]))
        return pool;
  });


module.exports = {};


