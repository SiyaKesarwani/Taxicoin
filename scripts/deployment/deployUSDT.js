const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();
    const USDT = await ethers.getContractFactory('UChildERC20');
    // usdtToken = await USDT.deploy();
    // await usdtToken.deployed();
    // console.log("USDT:      ", usdtToken.address);
    const usdtToken = await USDT.attach("0xb81A7f2Da9318c0930e47F119D41609eC4F8f974");

    // tx = await usdtToken.initialize(
    //     "Tether USD",
    //     "USDT",
    //     6,
    //     deployer.address
    // )
    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    const taxicoinUtils = await TaxicoinUtils.attach("0x084677b19fd4fd98be5c4e835f8d7555b40c6030");

    // mint USDT
    var amountInBytes = ethers.utils.hexZeroPad(ethers.utils.hexlify(ethers.BigNumber.from('100000000000000000000')), 32)
    console.log(amountInBytes);
    // tx = await usdtToken.deposit(deployer.address, amountInBytes);
    tx = await usdtToken.approve(taxicoinUtils.address, ethers.BigNumber.from('100000000000000000000'))

    console.log("Done!", tx);

    // await hre.run("verify:verify", {address: taxicoinTokenImp});
    // await hre.run("verify:verify", {address: taxicoinUtilsImp});

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
