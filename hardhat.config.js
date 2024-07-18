require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require('solidity-coverage');
require("@nomiclabs/hardhat-etherscan");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: process.env.FORK_URL,
        // blockNumber: 8981189
      },
      chainId: 137,
      accounts: {
          mnemonic: "test test test test test test test test test test test junk",
          count: 20
      }
      // chains: {
      //   80002: {
      //     hardforkHistory: {
      //       london: 8981189
      //     }
      //   }
      // }
    },
    amoy: {
      url: process.env.AMOY_TESTNET_URL,
      chainId: 80002,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`,`0x${process.env.OPERATOR_PRIVATE_KEY}`],
      gasPrice: 30000000000,
    },
    polygon: {
      url: process.env.POLYGON_MAINNET_URL,
      chainId: 137,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`,`0x${process.env.OPERATOR_PRIVATE_KEY}`],
      timeout: 1000000
    }
  },
  etherscan: {
    apiKey: {
      amoy: process.env.POLYGON_API_KEY
    },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: 'https://api-amoy.polygonscan.com/api',
          browserURL: "https://amoy.polygonscan.com/"
        }
      }
    ]
},
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ],
  },
  mocha: {
    timeout: 200000
  }
};
