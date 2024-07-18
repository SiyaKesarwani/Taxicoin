const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

const { getEIPTypedDataForSigningUSDCe } = require("../scripts/permit.js");
const {
    USDCe_TOKEN,
    DAI_TOKEN,
} = require(`../scripts/deployment/${hre.network.name}_config.json`); // Put all the addresses in hardhat_config.json
                                                                      // for FORKNET testing

const DRIVER = "0x44Fe72D93D3D976CAaC4ee3a61ec40ca39AB6Ba8"

describe("Mediator", function () {
  let mediator;
  before("Initialization", async function () {
    const Mediator = await ethers.getContractFactory("Mediator");
    mediator = await upgrades.deployProxy(Mediator, [USDCe_TOKEN]);
    await mediator.deployed();
  });

  it("Should return the paymentToken address", async function () {

    expect(await mediator.validTokens(USDCe_TOKEN)).to.be.true;

    await mediator.setPaymentFeeToken(DAI_TOKEN, true);
    expect(await mediator.validTokens(DAI_TOKEN)).to.be.true
  });

  it("Should start ride using signature and transfer tokens", async function () {
    const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, ethers.provider)
    const TestToken = await ethers.getContractFactory('USDCTestToken');
    const token = await TestToken.attach(USDCe_TOKEN);
    const nonce = await token.nonces(deployer.address);
    const maxAmount = ethers.utils.parseEther("100");
    await token.connect(deployer).mint(deployer.address, maxAmount);
    const deadline = Date.now() + 18000;

    const typedData = getEIPTypedDataForSigningUSDCe(deployer.address, mediator.address, maxAmount.toString(), nonce, deadline);

    // sign tx as a msg (EIP-712)
    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    let split = ethers.utils.splitSignature(sign);

    await (await mediator.updatePermitEnabled(token.address, true)).wait();
    await mediator.startRidePermit(deployer.address, DRIVER, token.address, maxAmount, deadline, split.v, split.r, split.s, { gasLimit: 1000000 });

    expect(await token.balanceOf(mediator.address)).to.be.eq(ethers.utils.parseEther("100"))
  })
});
