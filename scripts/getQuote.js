const { ethers, waffle } = require("hardhat");
const ethersProvider = waffle.provider;

const routerAbi = require('./IUniswapV2Router02.json');
const factoryAbi = require('./IUniswapV2Factory.json');
const pairContractAbi = require('./IUniswapV2Pair.json');

const EXCHANGE_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
const CHAIN_ID = "80001"

var USDC_TOKEN = "0xa905b2d5de9d7bf6a4f9901c865f2c4d42749377"
var USDT_TOKEN = "0x9e283834de72aa40746e03cb56b40fd40bec2d28"
var TAXI_TOKEN = "0x41a6DFeBE1a08be12e9B11c3aeFf6DF50Fa03446"
var TAXI_UTIL = "0x550a13d20C1D7aa9b0833667AA5C33eA67420AE9"

var deployer, sender, taxicoinToken, usdtToken, taxicoinUtils;

const getReserves = async (tokenAddressIn, tokenAddressOut) => {
	let reserve0, reserve1;

	const routerContract = new ethers.Contract(EXCHANGE_ROUTER, routerAbi, ethersProvider);
	const factoryAddress = await routerContract.factory();
    // console.log(factoryAddress);

	const factoryContract = new ethers.Contract(factoryAddress, factoryAbi, ethersProvider);
	const pairAddress = await factoryContract.getPair(tokenAddressIn, tokenAddressOut);
    // console.log(pairAddress);

	const pairContract = new ethers.Contract(pairAddress, pairContractAbi, ethersProvider);
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

	const routerContract = new ethers.Contract(EXCHANGE_ROUTER, routerAbi, ethersProvider);
	const amountOut = await routerContract.quote(amountIn, reserve0, reserve1);
	return amountOut;
};

async function main() {
    deployer = new ethers.Wallet('0xbb329027eca43bd8dc4a0a6023a9fb3edba66a5b8daa78b80568416b075d42f8', ethersProvider);
    sender = new ethers.Wallet('0x371a3842cd3d24ca7e2e20003956d9f2ff2c872b671a162d878597517bdbd5c7', ethersProvider);

    // const UChildERC20 = await ethers.getContractFactory('UChildERC20');
    // usdtToken = await UChildERC20.attach(USDT_TOKEN);

    // const Taxicoin = await ethers.getContractFactory("TestToken");
    // taxicoinToken = await Taxicoin.attach(TAXI_TOKEN);

    // const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
    // taxicoinUtils = await TaxicoinUtils.attach(TAXI_UTIL);

    let amountOut = await getOutputForLiquidity(TAXI_TOKEN, USDT_TOKEN, '1000000000000000');
    console.log(amountOut);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
