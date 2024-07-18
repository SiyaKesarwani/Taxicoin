const { ethers } = require('hardhat');
const hre = require('hardhat');

async function main() {
    const [deployer] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory('SushiswapFactory');
    const factory = await Factory.deploy(deployer.address);
    await factory.deployed();
    console.log("Deployed Sushiswap Factory : ", factory.address);
    
    const Router = await ethers.getContractFactory('SushiswapRouter');
    const router = await Router.deploy(factory.address, "0x0000000000000000000000000000000000000000");
    await router.deployed();
    console.log("Deployed Sushiswap Router : ", router.address);

    
    console.log("Deployment Successful!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
