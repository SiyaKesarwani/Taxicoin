const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const {
    EXCHANGE_ROUTER,
    USDC_TOKEN,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    CHAIN_ID,
    LOCKIN_PERIOD,
    OPERATOR
} = require(`./${hre.network.name}_config.json`);

async function main() {
    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    const taxicoinUtils = await TaxicoinUtils.attach('0x9220bCe562b773cbc72236B89336205ed86336Fc');

    await (await taxicoinUtils.updatePermitEnabled('0x733f580CD9008e3e9d398CeF268C69ca112651c0', true)).wait();
    await (await taxicoinUtils.updatePermitEnabled(USDC_TOKEN, true)).wait()
    await (await taxicoinUtils.addOperator(OPERATOR)).wait();
    
    console.log("Deployment Successful!")


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
