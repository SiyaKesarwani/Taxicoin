const { ethers, upgrades } = require("hardhat");

const router02 = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
const taxiCoin = "0x5cBDF75640f69cE57A2E7AE6289F23B946C50f61"
const token_USDC = "0x885d19AB5844607dC90D17Fe815626436bab7F37"
const lpPairToken = "0xb7bad78c85a912d99af91fc8a6b6fdfdf32ae5f6"

async function main() {

  const Wrapper = await ethers.getContractFactory("Wrapper");
  const wrapper = await upgrades.deployProxy(Wrapper, [router02, taxiCoin, token_USDC, lpPairToken]);

  await wrapper.deployed();

  console.log("Wrapper deployed to:", wrapper.address);
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });