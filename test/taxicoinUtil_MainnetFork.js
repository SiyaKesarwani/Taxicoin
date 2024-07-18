const { expect, assert } = require("chai");
const { ethers, network  } = require("hardhat");
const usdceABI = require('../scripts/IUSDCe.json');
require("dotenv").config();

var CHAIN_ID = network.config.chainId;

// All these are Polygon mainnet deployed addresses used in Forknet testing
var USDT_CONTRACT = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f" 
var USDC_CONTRACT = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
var USDCe_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
var EXCHANGE_FACTORY = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
var EXCHANGE_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
var LOCKIN_PERIOD = 1000;
var salt = 0;

var user, deployer, sender, usdtToken, usdcToken, usdceToken, taxicoinUtils, routerContract, factoryContract, lpToken;

const getEIPTypedDataForSigningUSDC = (owner, spender, maxAmount, nonce, deadline) => {
    const Permit = [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
    ];

    const EIP712Domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ];

    const domain = {
        name: "USD Coin",
        version: "2",
        chainId: parseInt(CHAIN_ID),
        verifyingContract: USDC_CONTRACT
    };

    const message = {
        owner: owner,
        spender: spender,
        value: maxAmount,
        nonce: nonce,
        deadline: parseInt(deadline)
    };

    const typedData = {
        types: {
            // EIP712Domain,
            Permit
        },
        domain,
        primaryType: "Permit",
        message
    };

    return typedData;
};

const getEIPTypedDataForSigningUSDCe = (owner, spender, maxAmount, nonce, deadline) => {

    const Permit = [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
    ];

    const EIP712Domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ];

    const domain = {
        name: "USD Coin (PoS)",
        version: "1",
        verifyingContract: USDCe_CONTRACT,
        salt: ethers.utils.hexZeroPad(parseInt(CHAIN_ID), 32)
    };

    const message = {
        owner: owner,
        spender: spender,
        value: maxAmount,
        nonce: nonce,
        deadline: parseInt(deadline)
    };

    const typedData = {
        types: {
            // EIP712Domain,
            Permit
        },
        domain,
        primaryType: "Permit",
        message
    };

    return typedData;
};

const getERCChildData = (nonce, from, functionSignature) => {

    const MetaTransaction = [
        { name: "nonce", type: "uint256" },
        { name: "from", type: "address" },
        { name: "functionSignature", type: "bytes" }
    ];

    const EIP712Domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "verifyingContract", type: "address" },
        { name: "salt", type: "bytes32" },
    ];

    const domain = {
        name: "(PoS) Tether USD",
        version: "1",
        verifyingContract: USDT_CONTRACT,
        salt: ethers.utils.hexZeroPad(parseInt(CHAIN_ID), 32)
    };

    const message = {
        nonce: nonce,
        from: from,
        functionSignature: functionSignature
    };

    const typedData = {
        types: {
            // EIP712Domain,
            MetaTransaction
        },
        domain,
        primaryType: "MetaTransaction",
        message
    };

    return typedData;
};

const getTransactionData = (salt, expiry, signer, data) => {

    const Transaction = [
        { name: "salt", type: "uint256" },
        { name: "expirationTimeSeconds", type: "uint256" },
        { name: "signerAddress", type: "address" },
        { name: "transactionData", type: "bytes" }
    ];

    const EIP712Domain = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ];

    const domain = {
        name: "TaxicoinUtils",
        version: "1",
        chainId: CHAIN_ID,
        verifyingContract: taxicoinUtils.address
    };

    const message = {
        salt: salt,
        expirationTimeSeconds: expiry,
        signerAddress: signer,
        transactionData: data
    };

    const typedData = {
        types: {
            // EIP712Domain,
            Transaction
        },
        domain,
        primaryType: "Transaction",
        message
    };

    return typedData;
};

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

    accounts = await ethers.getSigners();
    deployer = accounts[0];
    sender = accounts[1];
    user = accounts[2];

    const UChildERC20 = await ethers.getContractFactory('UChildERC20');
    usdtToken = UChildERC20.attach(USDT_CONTRACT);

    usdceToken = new ethers.Contract(USDCe_CONTRACT, usdceABI, deployer);

    const USDC = await ethers.getContractFactory('USDCTestToken');
    usdcToken = USDC.attach(USDC_CONTRACT);

    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    taxicoinUtils = await upgrades.deployProxy(TaxicoinUtils, 
        [
            EXCHANGE_ROUTER,
            CHAIN_ID,
            LOCKIN_PERIOD
        ]
    );
    await taxicoinUtils.deployed();
    console.log("TaxicoinUtils:      ",taxicoinUtils.address);

    await taxicoinUtils.connect(deployer).updatePermitEnabled(USDC_CONTRACT, true, { gasLimit: 10000000 });
    await taxicoinUtils.connect(deployer).updatePermitEnabled(USDCe_CONTRACT, true, { gasLimit: 10000000 });

    await taxicoinUtils.connect(deployer).addOperator(sender.address);

    var holder = "0xF977814e90dA44bFA03b6295A0616a897441aceC" // USDC and USDT top holder
    var usdceHolder = "0x9c2bd617b77961ee2c5e3038dFb0c822cb75d82a"
    await network.provider.send("hardhat_impersonateAccount", [holder])
    await network.provider.send("hardhat_impersonateAccount", [usdceHolder])
    const impersonatedSigner1 = await ethers.getSigner(holder)
    const impersonatedSigner2 = await ethers.getSigner(usdceHolder)
    await usdtToken.connect(impersonatedSigner1).transfer(user.address, "100000000000")
    await usdcToken.connect(impersonatedSigner1).transfer(user.address, "100000000000")
    await usdceToken.connect(impersonatedSigner2).transfer(user.address, "100000000000")

    // approve
    await usdtToken.connect(user).approve(taxicoinUtils.address, "1000000000", { gasLimit: 100000 })
    await usdcToken.connect(user).approve(taxicoinUtils.address, "1000000000", { gasLimit: 100000 })
    await usdceToken.connect(user).approve(taxicoinUtils.address, "1000000000", { gasLimit: 100000 })
  });

  it('should not add already permitted token', async function () {
    expect(await taxicoinUtils.isPermitSupported(USDC_CONTRACT)).to.be.true;
    expect(await taxicoinUtils.isPermitSupported(USDCe_CONTRACT)).to.be.true;
    expect(await taxicoinUtils.isPermitSupported(USDT_CONTRACT)).to.be.false;
    await expect(taxicoinUtils.connect(deployer).updatePermitEnabled(
      USDC_CONTRACT, true, 
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Already updated');
  });

  it('should permit usdc token', async function () {
    let nonce = await usdcToken.nonces(deployer.address);
    nonce = await nonce.toString();

    const deadline = getDeadline();
    const typedData = await getEIPTypedDataForSigningUSDC(deployer.address, taxicoinUtils.address, '115792089237316195423570985008687907853269984665640564039457584007913129639935', parseInt(nonce), deadline);

    var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(deployer).approveMeta(
      deployer.address,
      USDC_CONTRACT,
      '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      deadline,
      split.v,
      split.r,
      split.s,
      '0x',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "MetaApproval");
  });

  it('should permit usdce token', async function () {
    let nonce = await usdceToken.nonces(user.address);
    nonce = await nonce.toString();

    const deadline = getDeadline();
    const typedData = getEIPTypedDataForSigningUSDCe(user.address, taxicoinUtils.address, '100', parseInt(nonce), deadline);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).approveMeta(
      user.address,
      USDCe_CONTRACT,
      '100',
      deadline,
      split.v,
      split.r,
      split.s,
      '0x',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "MetaApproval");
  });

  it('should permit child type token', async function () {
    let nonce = await usdtToken.getNonce(user.address);
    nonce = await nonce.toString();

    let fnSign = await usdtToken.populateTransaction.approve(taxicoinUtils.address, "115792089237316195423570985008687907853269984665640564039457584007913129639935");

    const deadline = getDeadline();
    const typedData = getERCChildData(nonce, user.address, fnSign.data);

    var sign = await user._signTypedData(typedData.domain, typedData.types, typedData.message);
    split = ethers.utils.splitSignature(sign);

    await expect(taxicoinUtils.connect(sender).approveMeta(
      user.address,
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

    let fnSign = await taxicoinUtils.populateTransaction.transferMeta(USDC_CONTRACT, sender.address, '100');
    const typedData = getTransactionData(salt, deadline, user.address, fnSign.data);

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
      .to.emit(taxicoinUtils, "MetaTransfer");
  });

  it('transfer meta amount > 0 check', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.transferMeta(USDC_CONTRACT, sender.address, '0');
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
    
    // add operator again for further tests
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

  it('should add liquidity USDC-USDT', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let amountIn = 1000000;
    let amountOut = 1000000;

    let fnSign = await taxicoinUtils.populateTransaction.addLiquidity(USDC_CONTRACT, USDT_CONTRACT, amountIn, amountOut, '0', '0');
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
      .to.emit(taxicoinUtils, "TransactionSuccess")
      .to.emit(taxicoinUtils, "LiquidityAdded")
  });

  it('should add liquidity USDCe-USDT', async function () {
    await usdtToken.connect(user).approve(taxicoinUtils.address, "1000000000", { gasLimit: 100000 })
    await usdceToken.connect(user).approve(taxicoinUtils.address, "1000000000", { gasLimit: 100000 })

    const deadline = getDeadline();
    const salt = getSalt();

    let amountIn = 1000000;
    let amountOut = 1000000;

    let fnSign = await taxicoinUtils.populateTransaction.addLiquidity(USDCe_CONTRACT, USDT_CONTRACT, amountIn, amountOut, '0', '0');
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
      .to.emit(taxicoinUtils, "TransactionSuccess")
      .to.emit(taxicoinUtils, "LiquidityAdded")
  });

  it('should add liquidity USDCe-USDC', async function () {
    await usdcToken.connect(user).approve(taxicoinUtils.address, "1000000000", { gasLimit: 100000 })
    await usdceToken.connect(user).approve(taxicoinUtils.address, "1000000000", { gasLimit: 100000 })

    const deadline = getDeadline();
    const salt = getSalt();

    let amountIn = 1000000;
    let amountOut = 1000000;

    let fnSign = await taxicoinUtils.populateTransaction.addLiquidity(USDCe_CONTRACT, USDC_CONTRACT, amountIn, amountOut, '0', '0');
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
      .to.emit(taxicoinUtils, "TransactionSuccess")
      .to.emit(taxicoinUtils, "LiquidityAdded")
  });

  it('add liquidity require statement checks', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let amountIn = 1000000;
    let amountOut = await getOutputForLiquidity(USDC_CONTRACT, USDT_CONTRACT, amountIn);

    let fnSign = await taxicoinUtils.populateTransaction.addLiquidity(USDC_CONTRACT, USDT_CONTRACT, '0', amountOut, amountIn, amountOut);
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
    let lpToken = ethers.BigNumber.from("10000");;
    let amountAMin = 0;
    let amountBMin = 0;

    let fnSign = await taxicoinUtils.populateTransaction.removeLiquidity(USDC_CONTRACT, USDT_CONTRACT, lpToken, amountAMin, amountBMin);

    const deadline = getDeadline();
    const salt = getSalt();

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
      .to.emit(taxicoinUtils, "TransactionSuccess");
  });

  it('remove liquidity require statement checks', async function () {
    let amountAMin = 500;
    let amountBMin = 500;

    let fnSign = await taxicoinUtils.populateTransaction.removeLiquidity(USDC_CONTRACT, USDT_CONTRACT, '0', amountAMin, amountBMin);

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

    fnSign = await taxicoinUtils.populateTransaction.removeLiquidity(USDC_CONTRACT, USDT_CONTRACT, '1000000000000000000000000000', amountAMin, amountBMin);

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

  it('should swap tokens USDT->USDC', async function () {
    await usdtToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })

    let fnSign = await taxicoinUtils.populateTransaction.executeSwap('100', '8', [USDT_CONTRACT, USDC_CONTRACT]);

    const deadline = getDeadline();
    const salt = getSalt();

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
      .to.emit(taxicoinUtils, "TransactionSuccess");
  });

  it('should swap tokens USDT->USDCe', async function () {
    await usdtToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })

    let fnSign = await taxicoinUtils.populateTransaction.executeSwap('100', '8', [USDT_CONTRACT, USDCe_CONTRACT]);

    const deadline = getDeadline();
    const salt = getSalt();

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
      .to.emit(taxicoinUtils, "TransactionSuccess");
  });

  it('should swap tokens USDC->USDCe', async function () {
    await usdcToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })

    let fnSign = await taxicoinUtils.populateTransaction.executeSwap('100', '8', [USDC_CONTRACT, USDCe_CONTRACT]);

    const deadline = getDeadline();
    const salt = getSalt();

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
      .to.emit(taxicoinUtils, "TransactionSuccess");
  });

  it('swap tokens amount in check', async function () {
    let fnSign = await taxicoinUtils.populateTransaction.executeSwap('0', '80', [USDT_CONTRACT, USDC_CONTRACT]);

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

  it('should start ride in USDC', async function () {
    await usdcToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.startRide(USDC_CONTRACT, '100', deadline);
    const typedData = getTransactionData(salt, deadline, user.address, fnSign.data);

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

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(USDC_CONTRACT, '100', deadline);
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

  it('should edit ride and change token to USDCe', async function () {
    await usdceToken.connect(user).approve(taxicoinUtils.address, 80, { gasLimit: 100000 })
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.editRide(USDCe_CONTRACT, '80', deadline);
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

  it('should cancel ride', async function () {
    await expect(taxicoinUtils.connect(sender).cancelRide(
      user.address,
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideCancelled");
  });

  it('should start ride in USDT', async function () {
    await usdtToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.startRide(USDT_CONTRACT, '100', deadline);
    const typedData = getTransactionData(salt, deadline, user.address, fnSign.data);

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

  it('should not edit ride with invalid deadline', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.editRide(USDC_CONTRACT, '80', '100000' /*deadline*/);
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

  it('should not cancel ride with invalid operator', async function () {
    await expect(taxicoinUtils.connect(user).cancelRide(
      user.address,
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

    let fnSign = await taxicoinUtils.populateTransaction.startRide(USDC_CONTRACT, '100', '100000' /*deadline*/);
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

  it('should not edit ride if it does not exist', async function () {
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.populateTransaction.editRide(USDC_CONTRACT, '80', deadline - 500);
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

  it('should not complete ride without starting a ride', async function () {
    await expect(taxicoinUtils.connect(sender).completeRide(
      user.address, '100',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('No pending ride');
  });

  it('should complete ride', async function () {
    await usdceToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(USDCe_CONTRACT, 100, deadline);
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
    await usdcToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(USDC_CONTRACT, 100, deadline);
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

    await expect(taxicoinUtils.connect(user).completeRide(
      user.address, '100',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');

    await expect(taxicoinUtils.connect(sender).completeRide(
      user.address, '100',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "RideCompleted");
  });

  it('should not complete ride with actual amount > max amount', async function () {
    await usdcToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(USDC_CONTRACT, 100, deadline);
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
    await usdcToken.connect(user).approve(taxicoinUtils.address, 100, { gasLimit: 100000 })
    const deadline = getDeadline();
    const salt = getSalt();

    let fnSign = await taxicoinUtils.connect(user).populateTransaction.startRide(USDC_CONTRACT, 100, deadline);
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
    await usdcToken.connect(user).approve(taxicoinUtils.address, 1000, { gasLimit: 100000 })
    await expect(taxicoinUtils.connect(sender).lockTokens(USDC_CONTRACT, user.address, '1000', '2',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TokensLocked");
  });

  it('should not lock tokens with amount zero', async function () {
    await expect(taxicoinUtils.connect(sender).lockTokens(USDC_CONTRACT, user.address, '0', '2',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Amount cannot be zero');
  });

  it('only operator should lock tokens', async function () {
    await expect(taxicoinUtils.connect(user).lockTokens(USDC_CONTRACT, user.address, '1000', '2',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');
  });

  it('only operator should unlock tokens', async function () {
    await expect(taxicoinUtils.connect(user).unlockTokens(USDC_CONTRACT, user.address, '1',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');
  });

  it('should unlock tokens', async function () {
    await ethers.provider.send('evm_increaseTime', [1000]);
    await ethers.provider.send('evm_mine');
    await expect(taxicoinUtils.connect(sender).unlockTokens(USDC_CONTRACT, user.address, '2',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "TokensUnlocked");
  });

  it('only operator should emergency unlock tokens', async function () {
    await expect(taxicoinUtils.connect(user).emergencyUnlockTokens(USDC_CONTRACT, user.address, '1',
      { gasLimit: 10000000 }))
      .to.be.revertedWith('Invalid operator');
  });

  it('should emergency unlock tokens', async function () {
    await usdtToken.connect(user).approve(taxicoinUtils.address, 1000, { gasLimit: 100000 })
    let txn = await taxicoinUtils.connect(sender).lockTokens(USDT_CONTRACT, user.address, '1000', '2',
      { gasLimit: 10000000 });
    txn.wait();

    await expect(taxicoinUtils.connect(sender).emergencyUnlockTokens(USDT_CONTRACT, user.address, '2',
      { gasLimit: 10000000 }))
      .to.emit(taxicoinUtils, "EmergencyUnlocked");
  });

});