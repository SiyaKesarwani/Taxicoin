const { ethers, upgrades } = require('hardhat');

const { getTransactionData } = require("./permit.js")

const {
    EXCHANGE_ROUTER,
    EXCHANGE_FACTORY,
    USDC_TOKEN,
    USDCe_TOKEN,
    USDT_TOKEN,
    DAI_TOKEN,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    CHAIN_ID,
    LOCKIN_PERIOD,
    OPERATOR
} = require(`./deployment/${hre.network.name}_config.json`);

const TXC_TOKEN = "0x1c90235fbf6e3ca5d2c6f733b717ced061f74f6d"
const TXC_UTILS = "0x084677b19fd4FD98be5C4e835F8d7555B40c6030"

var routerContract, factoryContract;

const getReserves = async (tokenAddressIn, tokenAddressOut) => {
  let reserve0, reserve1;

  const pairAddress = await factoryContract.getPair(tokenAddressIn, tokenAddressOut);
  console.log(pairAddress);
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
  console.log(reserves)
  let reserve0 = reserves[0];
  let reserve1 = reserves[1];
  if (reserve0 == 0 || reserve1 == 0) {
    return amountIn;
  }

  const amountOut = await routerContract.quote(amountIn, reserve0, reserve1);
  return amountOut;
};

async function main() {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    sender = accounts[1];

    const Factory = await ethers.getContractFactory('SushiswapFactory');
    // const factory = await Factory.deploy(deployer.address);
    // await factory.deployed();
    // console.log("Deployed Sushiswap Factory : ", factory.address);
    factoryContract = await Factory.attach(EXCHANGE_FACTORY);
    
    const Router = await ethers.getContractFactory('SushiswapRouter');
    // const router = await Router.deploy(factory.address, "0x0000000000000000000000000000000000000000");
    // await router.deployed();
    // console.log("Deployed Sushiswap Router : ", router.address);
    routerContract = await Router.attach(EXCHANGE_ROUTER);

    
    // console.log("Deployment Successful!")

    const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    const taxicoinUtils = await TaxicoinUtils.attach(TXC_UTILS);
    // const taxicoinUtils = await upgrades.deployProxy(TaxicoinUtils, 
    //     [
    //         router.address,
    //         CHAIN_ID,
    //         LOCKIN_PERIOD
    //     ]
    // );
    // await taxicoinUtils.deployed();
    // taxicoinUtilsImp = await upgrades.erc1967.getImplementationAddress(taxicoinUtils.address);
    // console.log("TaxicoinUtils:      ",taxicoinUtils.address);
    // console.log("taxicoinUtilsImp:   ", taxicoinUtilsImp);

    // First set the mock router address
    // let res = await taxicoinUtils.setRouter(EXCHANGE_ROUTER);
    // let res = await taxicoinUtils.router02();

    // const Factory = await ethers.getContractFactory('SushiswapFactory');
    // const factory = await Factory.attach(EXCHANGE_FACTORY);
    // console.log(await factory.feeToSetter());
    // let res = await factory.createPair(USDC_TOKEN, USDT_TOKEN);

    const USDCe = await ethers.getContractFactory('USDCTestToken');
    // usdcToken = await upgrades.deployProxy(USDCe, ["USD Coin (PoS)", "USDC"],
    //     { gasLimit: '10000000' });
    // await usdcToken.deployed();
    // usdcTokenImp = await upgrades.erc1967.getImplementationAddress(usdcToken.address);
    // console.log("USDC.e:      ", usdcToken.address);
    // console.log("USDC.e Imp:   ", usdcTokenImp);

    // console.log("Deployment Successful!")
    const usdceToken = await USDCe.attach(USDCe_TOKEN);
    const usdcToken = await USDCe.attach(USDC_TOKEN);

    const USDT = await ethers.getContractFactory('UChildERC20');
    // usdtToken = await USDT.deploy();
    // await usdtToken.deployed();
    // console.log("USDT:      ", usdtToken.address);
    // await usdtToken.initialize(
    //     "Tether USD",
    //     "USDT",
    //     6,
    //     deployer.address
    // )
    const usdtToken = await USDT.attach(USDT_TOKEN);
    const dai = await USDT.attach(DAI_TOKEN);

    const Taxicoin = await ethers.getContractFactory('Taxicoin');
    // taxicoinToken = await upgrades.deployProxy(Taxicoin, [TOKEN_NAME, TOKEN_SYMBOL]);
    // await taxicoinToken.deployed();
    // taxicoinTokenImp = await upgrades.erc1967.getImplementationAddress(taxicoinToken.address);
    // console.log("Taxicoin:      ",taxicoinToken.address);
    // console.log("TaxicoinImp:   ", taxicoinTokenImp);
    const taxicoinToken = await Taxicoin.attach(TXC_TOKEN);


    // await usdcToken.mint(deployer.address, 10000);
    // await usdtToken.deposit(deployer.address, ethers.utils.hexZeroPad(ethers.utils.hexlify(10000000000), 32));


    // let res = await taxicoinToken.approve(taxicoinUtils.address, ethers.BigNumber.from("40000000000000000000"));
    // console.log(res)
    // res = await usdtToken.approve(taxicoinUtils.address, 2406264687500);
    // console.log(res)
    // let res = await usdcToken.approve(taxicoinUtils.address, 90000000);
    // console.log(res)
    // res = await usdceToken.approve(taxicoinUtils.address, 10000000);
    // console.log(res)
    // res = await dai.approve(taxicoinUtils.address, ethers.BigNumber.from("40000000000000000000"));
    // // console.log(res)

    // console.log("USDC bal ",ethers.utils.formatEther(await usdcToken.balanceOf(deployer.address)));
    // console.log("USDCe bal ",ethers.utils.formatEther(await usdceToken.balanceOf(deployer.address)));

    // let res = await taxicoinUtils.setRouter(EXCHANGE_ROUTER);

    // console.log("Router Address: ", await taxicoinUtils.router02());

    let amountIn = 1000000;
    let amountOut = await getOutputForLiquidity(USDT_TOKEN, USDC_TOKEN, amountIn);
    console.log(ethers.utils.formatUnits(amountOut, 6))

    // res = await taxicoinUtils.addLiquidity(USDT_TOKEN, USDC_TOKEN, 2406264687500, 10000000, '100', '100', {gasLimit : '10000000'});
    // console.log(res);

    // res = await taxicoinUtils.addLiquidity(USDC_TOKEN, DAI_TOKEN, '10000000', ethers.BigNumber.from("10000000000000000000"), '100', '100', {gasLimit : '10000000'});
    // console.log(res);

    // res = await taxicoinUtils.addLiquidity(USDCe_TOKEN, DAI_TOKEN, '10000000', ethers.BigNumber.from("10000000000000000000"), '100', '100', {gasLimit : '10000000'});
    // console.log(res);

    // res = await taxicoinUtils.addLiquidity(USDT_TOKEN, DAI_TOKEN, '10000000', ethers.BigNumber.from("10000000000000000000"), '100', '100', {gasLimit : '10000000'});
    // console.log(res);

    // let res = await taxicoinUtils.removeLiquidity(USDC_TOKEN, USDT_TOKEN, '10000000', '1', '1');

    // res = await taxicoinUtils.executeSwap('90000000', '800', [USDC_TOKEN, USDT_TOKEN]);

    // let fnSign = await taxicoinUtils.populateTransaction.addLiquidity(USDC_TOKEN, USDCe_TOKEN, '1000000', '1000000', '1000', '1000');

    // let fnSign = await taxicoinUtils.populateTransaction.removeLiquidity(USDC_TOKEN, USDT_TOKEN, '100', '100', '100');

    // let fnSign = await taxicoinUtils.populateTransaction.executeSwap('1000000', '10000', [USDCe_TOKEN, USDC_TOKEN]);
    // console.log(fnSign);

    // const deadline = Date.now() + 18000;

    // const typedData = await getTransactionData('22333003', deadline, deployer.address, fnSign.data);

    // var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
    // split = ethers.utils.splitSignature(sign);

    // res = await taxicoinUtils.connect(sender).executeTransaction(
    //     '22333003',
    //     deadline,
    //     deployer.address,
    //     fnSign.data,
    //     split.v,
    //     split.r,
    //     split.s, 
    //     {gasLimit: '10000000'}
    // );
    console.log(res);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
