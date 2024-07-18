const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const sigUtil = require('eth-sig-util');
const { getEIPTypedDataForSigning } = require("./permit.js")
const mintUSDC = require('./mint_usdc')


// const ALCHEMY_API = "https://polygon-mumbai.g.alchemy.com/v2/Zxko7nfdXWZus4wHi4o_r17SbhUbmZqs"
const ALCHEMY_API = "https://polygon-mainnet.g.alchemy.com/v2/BwmBe120LvkUStknhoKQTffQuxjyJRwb"

const mediatorAbi = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        }
      ],
      "name": "PaymentTokenUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "driver",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "actualAmount",
          "type": "uint256"
        }
      ],
      "name": "RideCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "driver",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "maxAmount",
          "type": "uint256"
        }
      ],
      "name": "RideStarted",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "driver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "actualAmount",
          "type": "uint256"
        }
      ],
      "name": "completeRide",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "paymentToken_",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paymentToken",
      "outputs": [
        {
          "internalType": "contract ERC20Upgradeable",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "rideDetails",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress_",
          "type": "address"
        }
      ],
      "name": "setPaymentFeeToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "driver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "maxAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "v",
          "type": "uint8"
        },
        {
          "internalType": "bytes32",
          "name": "r",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "s",
          "type": "bytes32"
        }
      ],
      "name": "startRide",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
]

const permitAbi = [
    {
      "inputs": [],
      "name": "DOMAIN_SEPARATOR",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "nonces",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "deadline",
          "type": "uint256"
        },
        {
          "internalType": "uint8",
          "name": "v",
          "type": "uint8"
        },
        {
          "internalType": "bytes32",
          "name": "r",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "s",
          "type": "bytes32"
        }
      ],
      "name": "permit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]

const mediatorAddress = "0x1465ae9d8dc0b44a46918874c4d90d5ea6f6caed"

const DRIVER = "0x14e01052120d71c8ad1b223cE237011C29E4110C"
const USER = "0xc75Fab47cc54Ed5887143fa7184b2013026aB5F8"
const USER_PKEY = "371a3842cd3d24ca7e2e20003956d9f2ff2c872b671a162d878597517bdbd5c7"

const testAccount = '0xc75Fab47cc54Ed5887143fa7184b2013026aB5F8'

const paymentToken_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"    //USDC Mock Matic
// const paymentToken_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"


const main = async function () {

    // let provider = ethers.getDefaultProvider(ALCHEMY_API);
    let provider = ethers.getDefaultProvider("http://127.0.0.1:8546");

    await mintUSDC.main();
    let wallet = new ethers.Wallet(USER_PKEY, provider);
    let mediator = new ethers.Contract(mediatorAddress, mediatorAbi, wallet);

    let usdcContract = new ethers.Contract(paymentToken_USDC, permitAbi, wallet);
    let nonce = await usdcContract.nonces(USER).toString();

    const maxAmount = ethers.utils.parseEther("100");
    const deadline = Date.now() + 18000;

    const typedData = getEIPTypedDataForSigning(USER, mediator.address, maxAmount.toString(), parseInt(nonce), deadline);

    // sign tx as a msg (EIP-712)
    let sig = sigUtil.signTypedData(Buffer.from(USER_PKEY, 'hex'), { data: typedData });
    let split = ethers.utils.splitSignature(sig);

    let tx = await mediator.startRide(USER, DRIVER, maxAmount, deadline, split.v, split.r, split.s, { from: testAccount, gasLimit: 1000000 });

    console.log("Ride started: ", tx)
    await tx.wait();

};

main()
