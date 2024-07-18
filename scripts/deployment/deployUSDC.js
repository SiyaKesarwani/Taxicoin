const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

async function main() {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    const USDCe = await ethers.getContractFactory('USDCTestToken');
    const usdce = await USDCe.attach("0x9238425a5273396802C7B1452452C8d40294F94A");
    // usdcToken = await upgrades.deployProxy(USDCe, ["USD Coin (PoS)", "USDC"],
    //     { gasLimit: '10000000' });
    // await usdcToken.deployed();
    // usdcTokenImp = await upgrades.erc1967.getImplementationAddress(usdce.address);
    // console.log("USDC.e:      ", usdcToken.address);
    // console.log("USDC.e Imp:   ", usdcTokenImp);

    console.log("Deployment Successful!")
    // await usdce.mint("0x10E1C73B82DaCCb2B7c77a1035B0a92C07371019", 10000000000);
    console.log(await usdce.balanceOf(deployer.address))

    // await hre.run("verify:verify", {address: taxicoinTokenImp});
    // await hre.run("verify:verify", {address: taxicoinUtilsImp});

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
