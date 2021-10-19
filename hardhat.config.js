require("@nomiclabs/hardhat-waffle");
require('hardhat-deploy');
require("@nomiclabs/hardhat-ethers")
require("solidity-coverage");
require("hardhat-gas-reporter");
require('./tasks')

const fs = require('fs');
const mnemonic = fs.readFileSync(".mnemonic").toString().trim();

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
    solidity: {
        compilers: [
            {
               version: "0.8.0",
                settings: {
                    optimizer: {
                    enabled: true,
                    runs: 1000,
                    },    
                },
            },
            {
                version: "0.8.8",
                settings: {
                    optimizer: {
                    enabled: true,
                    runs: 1000,
                    },    
                },
            }
        ]
    },
  namedAccounts: {
    deployer: 0,
  },

  networks: {
      hardhat: {
          gasPrice: 0,
          initialBaseFeePerGas: 0,
      },
      matic_testnet: {
          url: "https://matic-mumbai.chainstacklabs.com",
          chainId: 80001,
          accounts: mnemonic ? { mnemonic } : undefined,
          gasPrice: 3000000000,
      },
      avax_fuji: {
          url: 'https://api.avax-test.network/ext/bc/C/rpc',
          gasPrice: 225000000000,
          chainId: 43113,
          accounts: mnemonic ? { mnemonic } : undefined,
      },
      avax_mainnet: {
          url: 'https://api.avax.network/ext/bc/C/rpc',
          gasPrice: 225000000000,
          chainId: 43114,
          accounts: mnemonic ? { mnemonic } : undefined,
      }
  },

};


