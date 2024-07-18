const { ethers, upgrades } = require('hardhat');

const EXCHANGE_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
const CHAIN_ID = "80001"
const USDC_TOKEN = "0xa905b2d5de9d7bf6a4f9901c865f2c4d42749377"
const USDT_TOKEN = "0x9e283834de72aa40746e03cb56b40fd40bec2d28"


async function main() {
    // const TestToken = await ethers.getContractFactory('TestToken');
    // const taxicoinToken = await upgrades.deployProxy(TestToken, ["Taxicoin", "TXC"])
    // await taxicoinToken.deployed();

    // console.log("Taxicoin token deployed at: ", taxicoinToken.address);

    // const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    // const taxicoinUtils = await upgrades.deployProxy(TaxicoinUtils, [EXCHANGE_ROUTER, CHAIN_ID])
    // await taxicoinUtils.deployed();
    // console.log("TaxicoinUtils deployed at: ", taxicoinUtils.address);

    // await taxicoinUtils.updatePermitEnabled(USDC_TOKEN, true);
    // await taxicoinUtils.updatePermitEnabled(USDT_TOKEN, false);
    // await taxicoinUtils.updatePermitEnabled(taxicoinToken.address, true);

    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    sender = accounts[1];

    const TestToken = await ethers.getContractFactory('TestToken');
    const taxicoinToken = await TestToken.attach('0x86B4DEf47C67D0aA79628143e9c9d82cD870097f');

    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    const taxicoinUtils = await TaxicoinUtils.attach('0x4C59e2509d6Cd14e65E8214a9daF0C4e178A87Dd');

    let res = await taxicoinToken.allowance(deployer.address, taxicoinUtils.address);
    console.log(res.toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
