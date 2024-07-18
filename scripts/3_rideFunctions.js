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
    operator = accounts[1];

    // const TestToken = await ethers.getContractFactory('Taxicoin');
    // const token = await TestToken.attach(TXC_TOKEN);

    const TestToken = await ethers.getContractFactory('USDCTestToken');
    const token = await TestToken.attach(USDC_TOKEN);

    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    const taxicoinUtils = await TaxicoinUtils.attach(TXC_UTILS);

    // deployer is transferring some tokens to his account
    // await token.mint(deployer.address, 1000);
    // await token.approve(taxicoinUtils.address, 100);

    const deadline = Date.now() + 18000;

    // // Cancel ride first
    // let lastRide = await taxicoinUtils.connect(operator).cancelRide(deployer.address);
    // console.log("Previous ride cancelled", lastRide);

    // Start new ride
    // let fnSign = await taxicoinUtils.populateTransaction.startRide(token.address, '100', deadline);
    // console.log("Start ride signature: \n", fnSign);

    // Edit existing ride
    // let fnSign = await taxicoinUtils.populateTransaction.editRide(token.address, '80', deadline - 500);
    // console.log("Edit ride signature: \n", fnSign);
    
    // const typedData = await getTransactionData('0', deadline, deployer.address, fnSign.data);
    // var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    // split = ethers.utils.splitSignature(sign);
    // let res = await taxicoinUtils.connect(operator).executeTransaction(
    //     '0',
    //     deadline,
    //     deployer.address,
    //     fnSign.data,
    //     split.v,
    //     split.r,

    //     split.s,
    //     { gasLimit: 10000000 }
    // );
    // console.log(res);

    // // Complete last ride
    // let lastRide = await taxicoinUtils.connect(deployer).completeRide(deployer.address, 100, { gasLimit: 10000000 });
    // console.log("Last ride completed", lastRide);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });