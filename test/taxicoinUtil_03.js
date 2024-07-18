const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

const {
  EXCHANGE_FACTORY,
  EXCHANGE_ROUTER,
  USDT_TOKEN
} = require(`../scripts/deployment/${hre.network.name}_config.json`);

const { 
  getEIPTypedDataForSigning,
  getERCChildData,
  getTransactionData

 } = require("../scripts/permit.js");

var TAXI_TOKEN = "0x1c90235fbf6e3ca5d2c6f733b717ced061f74f6d" 
var TAXI_UTIL = "0x084677b19fd4FD98be5C4e835F8d7555B40c6030"

var user, deployer, sender, taxicoinToken, usdtToken, taxicoinUtils, routerContract, factoryContract;
var salt = 0;

const getSalt = () => {
  salt++;
  return salt;
}

const getDeadline = () => {
  var deadline = Date.now() + 180000;
  return deadline;
}

const getReserves = async (tokenAddressIn, tokenAddressOut) => {
  let reserve0, reserve1;

  const pairAddress = await factoryContract.getPair(tokenAddressIn, tokenAddressOut);
  // console.log(pairAddress);
  if (pairAddress == "0x0000000000000000000000000000000000000000") {
    return [0, 0];
  }

  const lpPair = await ethers.getContractFactory('UniswapV2Pair');
  const pairContract = await lpPair.attach(pairAddress);

  let token0 = await pairContract.token0();

  const result = await pairContract.getReserves();
  if (token0 == tokenAddressIn) {
    reserve0 = result[0];
    reserve1 = result[1];
  } else {
    reserve0 = result[1];
    reserve1 = result[0];
  }
  return [reserve0, reserve1];
};

const getOutputForLiquidity = async (tokenAddressIn, tokenAddressOut, amountIn) => {
  let reserves = await getReserves(tokenAddressIn, tokenAddressOut);
  let reserve0 = reserves[0];
  let reserve1 = reserves[1];
  // console.log(reserves);
  if (reserve0 == 0 || reserve1 == 0) {
    return amountIn;
  }

  const amountOut = await routerContract.quote(amountIn, reserve0, reserve1);
  return amountOut;
};

const getInvestment = async (walletAddress, tokenAddress0, tokenAddress1) => {
  const userLpBalance = await taxicoinUtils.lpTokenBalances(walletAddress);
  // console.log('userLpBalance', userLpBalance);

  if (!userLpBalance.gt(0)) {
    return [0, 0];
  }

  let reserve0, reserve1;

  const pairAddress = await factoryContract.getPair(tokenAddress0, tokenAddress1);

  const lpPair = await ethers.getContractFactory('UniswapV2Pair');
  const pairContract = await lpPair.attach(pairAddress);

  let token0 = await pairContract.token0();

  const result = await pairContract.getReserves();
  if (token0 == tokenAddress0) {
    reserve0 = result[0];
    reserve1 = result[1];
  } else {
    reserve0 = result[1];
    reserve1 = result[0];
  }

  const totalLpSupply = await pairContract.totalSupply();
  // console.log('totalLpSupply', totalLpSupply);

  const amount0Actual = userLpBalance.mul(reserve0).div(totalLpSupply);
  const amount1Actual = userLpBalance.mul(reserve1).div(totalLpSupply);

  // console.log('amountActual0', amount0Actual);
  // console.log('amountActual1', amount1Actual);
  return [amount0Actual, amount1Actual];
};

describe("Utils", function () {
  before("should initialize", async function () {
    const router = await ethers.getContractFactory('SushiswapRouter');
    routerContract = await router.attach(EXCHANGE_ROUTER);
    const factory = await ethers.getContractFactory('SushiswapFactory');
    factoryContract = await factory.attach(EXCHANGE_FACTORY);

    deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, ethers.provider)
    sender = new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY, ethers.provider)
    user = new ethers.Wallet(process.env.USER_PRIVATE_KEY, ethers.provider)

    const UChildERC20 = await ethers.getContractFactory('UChildERC20');
    usdtToken = await UChildERC20.attach(USDT_TOKEN);

    const Taxicoin = await ethers.getContractFactory('Taxicoin');
    taxicoinToken = await Taxicoin.attach(TAXI_TOKEN);

    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    taxicoinUtils = await TaxicoinUtils.attach(TAXI_UTIL);

    // await taxicoinUtils.connect(deployer).updatePermitEnabled(TAXI_TOKEN, true, { gasLimit: 10000000 });

    // await taxicoinUtils.connect(deployer).addOperator(sender.address);

    await taxicoinToken.connect(deployer).approve(taxicoinUtils.address, ethers.BigNumber.from("10000000000000000000"), { gasLimit: 100000 })

    // mint all the tokens in user's account
    await taxicoinToken.connect(deployer).mint(user.address, ethers.BigNumber.from("100000000000000000000000000000"));
    await usdtToken.connect(deployer).deposit(user.address, ethers.utils.hexZeroPad(ethers.utils.hexlify(100000000000000), 32));
    // approve
    await taxicoinToken.connect(user).approve(taxicoinUtils.address, ethers.BigNumber.from("10000000000000000000"), { gasLimit: 100000 })
    await usdtToken.connect(user).approve(taxicoinUtils.address, ethers.BigNumber.from("100000000000000"), { gasLimit: 100000 })
  });

  it('should not add already permitted token', async function () {
    expect(await taxicoinUtils.isPermitSupported(TAXI_TOKEN)).to.be.true;
    await expect(taxicoinUtils.connect(deployer).updatePermitEnabled(
      TAXI_TOKEN, true, 
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Already updated');
  });

  it('should permit taxi token', async function () {
    let nonce = await taxicoinToken.nonces(deployer.address);
    nonce = await nonce.toString();

    const deadline = getDeadline();
    const typedData = await getEIPTypedDataForSigning(deployer.address, taxicoinUtils.address, '115792089237316195423570985008687907853269984665640564039457584007913129639935', parseInt(nonce), deadline);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(deployer).approveMeta(
      deployer.address,
      TAXI_TOKEN,
      '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      deadline,
      split.v,
      split.r,
      split.s,
      '0x',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "MetaApproval");
  });

  it('should permit child type token', async function () {
    let nonce = await usdtToken.getNonce(deployer.address);
    nonce = await nonce.toString();

    let fnSign = await usdtToken.populateTransaction.approve(taxicoinUtils.address, "115792089237316195423570985008687907853269984665640564039457584007913129639935");

    const deadline = getDeadline();
    const typedData = await getERCChildData(nonce, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(deployer).approveMeta(
      deployer.address,
      usdtToken.address,
      '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      deadline,
      split.v,
      split.r,
      split.s,
      fnSign.data,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "MetaApproval");
  });

  it('should transfer permitted token', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.transferMeta(TAXI_TOKEN, sender.address, '100');
    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "MetaTransfer");
  });

  it('transfer meta amount > 0 check', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.transferMeta(TAXI_TOKEN, sender.address, '0');
    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
  });

  it('should set router', async function () {
    await taxicoinUtils.connect(deployer).setRouter(
      EXCHANGE_ROUTER,
      { gasLimit: 10000000 });

    assert.equal(await taxicoinUtils.router02(), EXCHANGE_ROUTER);
  });

  it('only owner should set router', async function () {
    await expect(taxicoinUtils.connect(sender).setRouter(
      EXCHANGE_ROUTER,
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should not set router to zero address', async function () {
    await expect(taxicoinUtils.connect(deployer).setRouter(
      "0x0000000000000000000000000000000000000000",
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid address');
  });

  it('should set lockIn period', async function () {
    await taxicoinUtils.connect(deployer).setLockInPeriod(
      86400,
      { gasLimit: 10000000 });

    assert.equal(await taxicoinUtils.lockInPeriod(), 86400);
    
    await taxicoinUtils.connect(deployer).setLockInPeriod(
      0,
      { gasLimit: 10000000 });
  });

  it('only owner should set lockIn period', async function () {
    await expect(taxicoinUtils.connect(sender).setLockInPeriod(
      864000,
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should set admin wallet', async function () {
    await expect(taxicoinUtils.connect(deployer).setAdminWallet(
      deployer.address,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "AdminUpdated");
  });

  it('should not set admin wallet to zero', async function () {
    await expect(taxicoinUtils.connect(deployer).setAdminWallet(
      '0x0000000000000000000000000000000000000000',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid address');
  });

  it('only owner should set admin wallet', async function () {
    await expect(taxicoinUtils.connect(sender).setAdminWallet(
      deployer.address,
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should add operator', async function () {
    await expect(taxicoinUtils.connect(deployer).addOperator(
      "0xe5ba98010c85e1386F5C06b9E947DFFF92553796",
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "OperatorAdded");
  });

  it('should not add zero address as operator', async function () {
    await expect(taxicoinUtils.connect(deployer).addOperator(
      '0x0000000000000000000000000000000000000000',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid address');
  });

  it('only owner should set operator', async function () {
    await expect(taxicoinUtils.connect(sender).addOperator(
      sender.address,
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('should not add operator again', async function () {
    await expect(taxicoinUtils.connect(deployer).addOperator(
      sender.address,
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Already approved');
  });

  it('should remove operator', async function () {
    await expect(taxicoinUtils.connect(deployer).removeOperator(
      sender.address,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "OperatorRemoved");
    
    // add it again for further tests
    await taxicoinUtils.connect(deployer).addOperator(
      sender.address,
      { gasLimit: 10000000 })
  });

  it('only owner should remove operator', async function () {
    await expect(taxicoinUtils.connect(sender).removeOperator(
      sender.address,
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Ownable: caller is not the owner');
  });


  it('remove operator zero address check', async function () {
    await expect(taxicoinUtils.connect(deployer).removeOperator(
      '0x0000000000000000000000000000000000000000',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid address');
  });

  it('cannot remove non operator check', async function () {
    await expect(taxicoinUtils.connect(deployer).removeOperator(
      '0x550a13d20C1D7aa9b0833667AA5C33eA67420AE9',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Operator not approved');
  });

  it('should add liquidity', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let amountIn = ethers.BigNumber.from("10000000000000000000");
    let amountOut = 1000000;

    let fnSign = await taxicoinUtils.populateTransaction.addLiquidity(TAXI_TOKEN, USDT_TOKEN, amountIn, amountOut, '0', '0');
    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionSuccess");
  });

  it('add liquidity require statement checks', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let amountIn = 1000000;
    let amountOut = await getOutputForLiquidity(TAXI_TOKEN, USDT_TOKEN, amountIn);
    // console.log(amountOut);

    let fnSign = await taxicoinUtils.populateTransaction.addLiquidity(TAXI_TOKEN, USDT_TOKEN, '0', amountOut, amountIn, amountOut);
    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
  });

  it('should remove liquidity', async function () {
    let lpToken = ethers.BigNumber.from("10000000000");;
    let amountAMin = 500;
    let amountBMin = 500;

    let fnSign = await taxicoinUtils.populateTransaction.removeLiquidity(TAXI_TOKEN, USDT_TOKEN, lpToken, amountAMin, amountBMin);

    const deadline = getDeadline();
    const salt = getSalt();

    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionSuccess");
  });

  it('remove liquidity require statement checks', async function () {
    let amountAMin = 500;
    let amountBMin = 500;

    let fnSign = await taxicoinUtils.populateTransaction.removeLiquidity(TAXI_TOKEN, USDT_TOKEN, '0', amountAMin, amountBMin);

    let deadline = getDeadline();
    let salt = getSalt();

    let typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");

     fnSign = await taxicoinUtils.populateTransaction.removeLiquidity(TAXI_TOKEN, USDT_TOKEN, '1000000000000000000000000000', amountAMin, amountBMin);

    deadline = getDeadline();
    salt = getSalt();

    typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
  });

  it('should swap tokens', async function () {
    await usdtToken.connect(deployer).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })

    let fnSign = await taxicoinUtils.populateTransaction.executeSwap('100', '80', [USDT_TOKEN, TAXI_TOKEN]);

    const deadline = getDeadline();
    const salt = getSalt();

    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionSuccess");
  });

  it('swap tokens amount in check', async function () {
    let fnSign = await taxicoinUtils.populateTransaction.executeSwap('0', '80', [USDT_TOKEN, TAXI_TOKEN]);

    const deadline = getDeadline();
    const salt = getSalt();

    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
    });

  it('should start ride', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(TAXI_TOKEN, ethers.BigNumber.from("10000000000000000000"), deadline);
    const typedData = await getTransactionData(salt, deadline, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      user.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideStarted");
  });

  it('should not start ride if previous ride is pending', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(TAXI_TOKEN, '100', deadline);
    const typedData = await getTransactionData(salt, deadline, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      user.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
  });

  it('should edit ride', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.editRide(TAXI_TOKEN, '80', deadline - 500);
    const typedData = await getTransactionData(salt, deadline, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      user.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideEdited");
  });

  it('should not edit ride with invalid deadline', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.editRide(TAXI_TOKEN, '80', '100000' /*deadline*/);
    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
  });

  it('should not cancel ride with invalid operator', async function () {
    await expect(taxicoinUtils.connect(deployer).cancelRide(
      deployer.address,
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');
  });

  it('should cancel ride', async function () {
    await expect(taxicoinUtils.connect(sender).cancelRide(
      user.address,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideCancelled");
  });

  it('should not start ride with invalid deadline', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.startRide(TAXI_TOKEN, '100', '100000' /*deadline*/);
    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
  });

  it('should not edit ride if it does not exist', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.editRide(TAXI_TOKEN, '80', deadline - 500);
    const typedData = await getTransactionData(salt, deadline, deployer.address, fnSign.data);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      deployer.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TransactionFailure");
  });

  it('should not complete ride without starting a ride', async function () {
    await expect(taxicoinUtils.connect(sender).completeRide(
      deployer.address, '100',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid ride');
  });

  it('should complete ride', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(TAXI_TOKEN, 100, deadline);
    const typedData = await getTransactionData(salt, deadline, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    let res1 = await taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      user.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }
    );
    await res1.wait();

    await expect(taxicoinUtils.connect(sender).completeRide(
      user.address, '100',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideCompleted");
  });

  it('should not complete ride with invalid operator', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(TAXI_TOKEN, 100, deadline);
    const typedData = await getTransactionData(salt, deadline, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    let res1 = await taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      user.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }
    );
    await res1.wait();

    await expect(taxicoinUtils.connect(deployer).completeRide(
      user.address, '100',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');

    await expect(taxicoinUtils.connect(sender).completeRide(
      user.address, '100',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideCompleted");
  });

  it('should not complete ride with actual amount > max amount', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(TAXI_TOKEN, 100, deadline);
    const typedData = await getTransactionData(salt, deadline, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    let res1 = await taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      user.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }
    );
    await res1.wait();

    await expect(taxicoinUtils.connect(sender).completeRide(
      user.address, '200',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Actual amount cannot be greater than max amount');

    await expect(taxicoinUtils.connect(sender).completeRide(
      user.address, '100',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideCompleted");
  });

  it('should complete ride and pay to driver', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(TAXI_TOKEN, 100, deadline);
    const typedData = await getTransactionData(salt, deadline, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    let res1 = await taxicoinUtils.connect(sender).executeTransaction(
      salt,
      deadline,
      user.address,
      fnSign.data,
      split.v,
      split.r,
      split.s,
      { gasLimit: 10000000 }
    );
    await res1.wait();

    await expect(taxicoinUtils.connect(sender).completeRideAndPayToDriver(
      user.address, '100', deployer.address,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideCompleted")
      .and.to.emit(taxicoinUtils, "PaymentToDriver");
  });

  it('should lock tokens', async function () {
    await expect(taxicoinUtils.connect(sender).lockTokens(TAXI_TOKEN, deployer.address, '1000', '2',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TokensLocked");
  });

  it('should not lock tokens with amount zero', async function () {
    await expect(taxicoinUtils.connect(sender).lockTokens(TAXI_TOKEN, deployer.address, '0', '2',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Amount cannot be zero');
  });

  it('only operator should lock tokens', async function () {
    await expect(taxicoinUtils.connect(deployer).lockTokens(TAXI_TOKEN, deployer.address, '1000', '2',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');
  });

  it('only operator should unlock tokens', async function () {
    await expect(taxicoinUtils.connect(deployer).unlockTokens(TAXI_TOKEN, deployer.address, '1',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');
  });

  it('should unlock tokens', async function () {
    await expect(taxicoinUtils.connect(sender).unlockTokens(TAXI_TOKEN, deployer.address, '1',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TokensUnlocked");
  });

  it('only operator should emergency unlock tokens', async function () {
    let txn = await taxicoinUtils.connect(sender).lockTokens(TAXI_TOKEN, deployer.address, '1000', '2',
      { gasLimit: 10000000 });
    txn.wait();

    await expect(taxicoinUtils.connect(deployer).emergencyUnlockTokens(TAXI_TOKEN, deployer.address, '1',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');
    
    await expect(taxicoinUtils.connect(sender).emergencyUnlockTokens(TAXI_TOKEN, deployer.address, '1',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "EmergencyUnlocked");
  });

  it('should emergency unlock tokens', async function () {
    let txn = await taxicoinUtils.connect(sender).lockTokens(TAXI_TOKEN, user.address, '1000', '2',
      { gasLimit: 10000000 });
    txn.wait();

    await expect(taxicoinUtils.connect(sender).emergencyUnlockTokens(TAXI_TOKEN, user.address, '1',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "EmergencyUnlocked");
  });

});