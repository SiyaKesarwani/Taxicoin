const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

async function main() {
    const chainId = network.config.chainId;
    const [deployer] = await ethers.getSigners();
    const DAI = await ethers.getContractFactory('UChildERC20');
    // daiToken = await DAI.deploy();
    // await daiToken.deployed();
    // console.log("DAI:      ", daiToken.address);
    const daiToken = await DAI.attach("0x3a9B6ad450ec03421bd31B797b8003E104aF683D");

    // tx = await daiToken.initialize(
    //     "Dai Stablecoin",
    //     "DAI",
    //     18,
    //     deployer.address,
    //     { gasLimit: '10000000' }
    // )

    // // mint DAI
    var amountInBytes = ethers.utils.hexZeroPad(ethers.utils.hexlify(ethers.BigNumber.from('100000000000000000000')), 32)
    console.log(amountInBytes);
    tx = await daiToken.deposit("0xbd6be1a1da7dc6e39fc8bf165a8efe423ba9eef1", amountInBytes);

    console.log("Done!", tx);

    // await hre.run("verify:verify", {address: daiToken.address});
    // await hre.run("verify:verify", {address: taxicoinUtilsImp});
    // * only verify on testnets or mainnets.
    // if (chainId != 31337) {
    //     await verify(daiToken.address, []);
    //   }

}

const verify = async (contractAddress, args) => {
  console.log("Verifying contract...");
  try {
      await run("verify:verify", {
          address: contractAddress,
          constructorArguments: args,
      });
  } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
          console.log("Already verified!");
      } else {
          console.log(e);
      }
  }
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
