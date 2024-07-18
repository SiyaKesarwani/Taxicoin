const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const {
    EXCHANGE_ROUTER,
    USDC_TOKEN,
    USDCe_TOKEN,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    CHAIN_ID,
    LOCKIN_PERIOD,
    OPERATOR
} = require(`./${hre.network.name}_config.json`);

async function main() {
    const [deployer] = await ethers.getSigners();
    const Taxicoin = await ethers.getContractFactory('Taxicoin');
    var taxicoinToken = await upgrades.deployProxy(Taxicoin, [TOKEN_NAME, TOKEN_SYMBOL]);
    await taxicoinToken.deployed();
    var taxicoinTokenImp = await upgrades.erc1967.getImplementationAddress(taxicoinToken.address);
    console.log("Taxicoin:      ",taxicoinToken.address);
    console.log("TaxicoinImp:   ", taxicoinTokenImp);
    // const taxicoinToken = await Taxicoin.attach("0x1c90235FBf6E3Ca5D2C6f733B717ced061F74F6D");
    // const taxicoinTokenImp = await upgrades.erc1967.getImplementationAddress(taxicoinToken.address);
    // await taxicoinToken.mint(deployer.address, ethers.BigNumber.from("100000000000000000000"));
    // console.log(ethers.utils.formatUnits(await taxicoinToken.balanceOf("0x15539b1dd3d5698185add601f13c1a8c2d308f0f")))

    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    const taxicoinUtils = await upgrades.deployProxy(TaxicoinUtils, 
        [
            EXCHANGE_ROUTER,
            CHAIN_ID,
            LOCKIN_PERIOD
        ]
    );
    await taxicoinUtils.deployed();
    var taxicoinUtilsImp = await upgrades.erc1967.getImplementationAddress(taxicoinUtils.address);
    console.log("TaxicoinUtils:      ",taxicoinUtils.address);
    console.log("taxicoinUtilsImp:   ", taxicoinUtilsImp);
    // const taxicoinUtils = await TaxicoinUtils.attach("0x084677b19fd4fd98be5c4e835f8d7555b40c6030");
    // const taxicoinUtilsImp = await upgrades.erc1967.getImplementationAddress(taxicoinUtils.address);
    // console.log("Balance :", await taxicoinToken.balanceOf(deployer.address));
    // await taxicoinToken.approve(taxicoinUtils.address, ethers.BigNumber.from('100000000000000000000'));

    // await (await taxicoinUtils.updatePermitEnabled(taxicoinToken.address, true)).wait();
    // await (await taxicoinUtils.updatePermitEnabled(USDC_TOKEN, true)).wait()
    // await (await taxicoinUtils.updatePermitEnabled(USDCe_TOKEN, true)).wait()
    // await (await taxicoinUtils.addOperator(OPERATOR, {gasLimit : '10000000'})).wait();
    
    console.log("Deployment Successful!")

    // await hre.run("verify:verify", {address: taxicoinTokenImp});
    await hre.run("verify:verify", {address: "0x9238425a5273396802C7B1452452C8d40294F94A"});

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
