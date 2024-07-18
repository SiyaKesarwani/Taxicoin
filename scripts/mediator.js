const { ethers, upgrades } = require("hardhat");

const paymentToken_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const paymentToken_DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"

async function main() {

  const Mediator = await ethers.getContractFactory("Mediator");
  const mediator = await upgrades.deployProxy(Mediator, [paymentToken_USDC]);

  await mediator.deployed();

  console.log("Greeter deployed to:", mediator.address);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });