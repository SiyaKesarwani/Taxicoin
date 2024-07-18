const { ethers, upgrades } = require('hardhat');

const { getTransactionData } = require("./permit.js")

const {
    EXCHANGE_ROUTER,
    USDC_TOKEN,
    USDCe_TOKEN,
    USDT_TOKEN,
    DAI_TOKEN,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    CHAIN_ID,
    LOCKIN_PERIOD,
    OPERATOR
} = require(`./deployment/${hre.network.name}_config.json`);

const TXC_TOKEN = "0x1c90235fbf6e3ca5d2c6f733b717ced061f74f6d"
const TXC_UTILS = "0x084677b19fd4FD98be5C4e835F8d7555B40c6030"


async function main() {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    sender = accounts[1];

    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    const taxicoinUtils = await TaxicoinUtils.attach(TXC_UTILS);

    // const TestToken = await ethers.getContractFactory('Taxicoin');
    // const token = await TestToken.attach(TXC_TOKEN);
  
    const TestToken = await ethers.getContractFactory('USDCTestToken');
    const token = await TestToken.attach(USDC_TOKEN);
//    await(await token.approve(taxicoinUtils.address, 1000)).wait();
  
    // const TestToken = await ethers.getContractFactory('USDCTestToken');
    // const token = await TestToken.attach(USDCe_TOKEN);
  
    // const TestToken = await ethers.getContractFactory('UChildERC20');
    // const token = await TestToken.attach(USDT_TOKEN);
  
    // const TestToken = await ethers.getContractFactory('UChildERC20');
    // const token = await TestToken.attach(DAI_TOKEN);

    // let res = await taxicoinUtils.connect(sender).lockTokens(token.address, deployer.address, '1000', '2');
    
    // let res = await taxicoinUtils.setLockInPeriod(60);

    let res = await taxicoinUtils.connect(sender).unlockTokens(token.address, deployer.address, '2');

    console.log(res);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


    /*

    1. amount from fun sign
    2. 

    1. function to lock and unlock tokens in contract
    2. emergency withdrawal
    3. get euro price

    HOLIDAY KA BTANA HAI MAIL

    */