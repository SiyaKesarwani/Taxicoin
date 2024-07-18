const { expect, use, assert } = require('chai');
const { solidity } = require("ethereum-waffle");
const { ethers, upgrades } = require('hardhat');
require("dotenv").config();

use(solidity)

const {
  EXCHANGE_ROUTER,
  USDCe_TOKEN
} = require(`../scripts/deployment/${hre.network.name}_config.json`);

const token_TXC = '0x1c90235fbf6e3ca5d2c6f733b717ced061f74f6d';
const lpPairToken = '0x442A544e4D53d6aAdad55F3c0F13A314e304b6Ec'; // TXC-USDCe Pair

async function getEquivalentUSDC(amountTXC) {
  let reserveUSDC, reserveTXC;
  const lpPair = await ethers.getContractFactory('UniswapV2Pair');
  const pairContract = await lpPair.attach(lpPairToken);
  const router = await ethers.getContractFactory('SushiswapRouter');
  const routerContract = await router.attach(EXCHANGE_ROUTER);

  let token0 = await pairContract.token0();
  const result = await pairContract.getReserves();
  if (token0 == token_TXC) {
    reserveTXC = result[0];
    reserveUSDC = result[1];
  } else {
    reserveTXC = result[1];
    reserveUSDC = result[0];
  }

  const amountUSDC = await routerContract.quote(amountTXC, reserveTXC, reserveUSDC);
  // console.log("Function parameters : ", amountTXC.toString(), reserveTXC.toString(), reserveUSDC.toString())
  // console.log("Corresponding USDC amount: ", amountUSDC.toString())
  return amountUSDC;
}

describe('Wrapper', function () {
  let wrapper;
  let depositor;
  let txcContract;
  let usdcContract;
  before('Initialization', async function () {
    const Wrapper = await ethers.getContractFactory('Wrapper');
    wrapper = await upgrades.deployProxy(Wrapper, [EXCHANGE_ROUTER, token_TXC, USDCe_TOKEN, lpPairToken]);
    await wrapper.deployed();
    // console.log('Wrapper deployed to:', wrapper.address);

    // Depositor: 0x323c618BC6c6ab7cf08e537Bf9c4577ef6D89759
    depositor = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, ethers.provider)

    const txc = await ethers.getContractFactory('Taxicoin');
    txcContract = await txc.attach(token_TXC);
  
    const usdce = await ethers.getContractFactory('USDCTestToken');
    usdcContract = await usdce.attach(USDCe_TOKEN);
  });

  it('should return the correct state data', async function () {
    // console.log('Owner account: ', await wrapper.owner());

    expect((await wrapper.uniswapV2Router02()).toLowerCase()).to.eql(EXCHANGE_ROUTER.toLowerCase());
    expect((await wrapper.taxiCoin()).toLowerCase()).to.eql(token_TXC.toLowerCase());
    expect((await wrapper.usdcToken()).toLowerCase()).to.eql(USDCe_TOKEN.toLowerCase());
    expect((await wrapper.lpPairToken()).toLowerCase()).to.eql(lpPairToken.toLowerCase());
  });

  it('adds liquidity using the wrapper contract', async function () {
    const amountTXC = ethers.utils.parseUnits('100', 'ether');
    const amountUSDC = await getEquivalentUSDC(amountTXC);
    const lpPair = await ethers.getContractFactory('UniswapV2Pair');
    const lpTokenContract = await lpPair.attach(lpPairToken);
    const initialLpBalance = Number(ethers.utils.formatUnits(await lpTokenContract.balanceOf(wrapper.address), "ether"))
    // console.log("Initial Lp balance: ", initialLpBalance.toString())

    await txcContract.connect(depositor).mint(depositor.address, amountTXC, { gasLimit: 100000 });
    await usdcContract.connect(depositor).mint(depositor.address, amountUSDC, { gasLimit: 100000 });

    await txcContract.connect(depositor).approve(wrapper.address, amountTXC, { gasLimit: 100000 })
    await usdcContract.connect(depositor).approve(wrapper.address, amountUSDC, { gasLimit: 100000 })

    await wrapper.connect(depositor).addTokens(amountTXC, amountUSDC, 0, 0, { gasLimit: 6000000 });

    const updatedLpBalance = Number(ethers.utils.formatUnits(await lpTokenContract.balanceOf(wrapper.address), "ether"))
    // console.log("Updated Lp balance: ", updatedLpBalance.toString())

    expect(updatedLpBalance).to.be.gt(initialLpBalance)
    expect(updatedLpBalance).to.gt(initialLpBalance)
  });

  it('removes entire liquidity using the wrapper contract', async function () {
    const lpPair = await ethers.getContractFactory('UniswapV2Pair');
    const lpTokenContract = await lpPair.attach(lpPairToken);
    const initialLpBalance = Number(await lpTokenContract.balanceOf(wrapper.address))
    // console.log("Initial balance LP in Wrapper:", initialLpBalance);

    const initialTxcBalance = Number(await txcContract.balanceOf(depositor.address))
    // console.log("Initial balance TXC :", initialTxcBalance);
    const initialUsdcBalance = Number(await usdcContract.balanceOf(depositor.address))
    // console.log("Initial balance USDC :", initialUsdcBalance);
    const initialLpBalanceUser = Number(await lpTokenContract.balanceOf(depositor.address))
    // console.log("Initial balance LP in USER :", initialLpBalanceUser);

    await wrapper.connect(depositor).removeTokens({ gasLimit: 6000000 });

    const updatedTxcBalance = Number(await txcContract.balanceOf(depositor.address))
    const updatedUsdcBalance = Number(await usdcContract.balanceOf(depositor.address))
    const updatedLpBalance = Number(await lpTokenContract.balanceOf(wrapper.address))

    expect(updatedLpBalance).to.lessThan(initialLpBalance)
    expect(updatedTxcBalance).to.greaterThan(initialTxcBalance)
    expect(updatedUsdcBalance).to.greaterThan(initialUsdcBalance)
  });
});
