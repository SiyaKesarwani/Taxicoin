const { ethers, upgrades, waffle, network } = require('hardhat');
const sigUtil = require('eth-sig-util');

const { getEIPTypedDataForSigningUSDCe, 
        getERCChildData, 
        getEIPTypedDataForSigningUSDC,
        getERCChildDataDAI,
      } = require("./permit.js")

const {
    EXCHANGE_ROUTER,
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

async function main() {
  const TaxicoinUtils = await ethers.getContractFactory('TaxicoinUtils');
  const taxicoinUtils = await TaxicoinUtils.attach(TXC_UTILS);

  const accounts = await ethers.getSigners();
  deployer = accounts[0];
  sender = accounts[1];

  // const TestToken = await ethers.getContractFactory('Taxicoin');
  // const token = await TestToken.attach(TXC_TOKEN);

  // const TestToken = await ethers.getContractFactory('USDCTestToken');
  // const token = await TestToken.attach(USDC_TOKEN);

  const TestToken = await ethers.getContractFactory('USDCTestToken');
  const token = await TestToken.attach(USDCe_TOKEN);

  // const TestToken = await ethers.getContractFactory('UChildERC20');
  // const token = await TestToken.attach(USDT_TOKEN);

  // const TestToken = await ethers.getContractFactory('UChildERC20');
  // const token = await TestToken.attach(DAI_TOKEN);

  // let txn = await taxicoinUtils.updatePermitEnabled(USDC_TOKEN, true, {gasLimit: '55000'});
  // console.log(txn);
  // let txn2 = await taxicoinUtils.updatePermitEnabled(USDCe_TOKEN, true, {gasLimit: '55000'});
  // console.log(txn2);  
  // let txn3 = await taxicoinUtils.updatePermitEnabled(token.address, true);
  // console.log(txn3);

  let nonce = await token.nonces(deployer.address);
  nonce = await nonce.toString();

  // let nonce = await token.getNonce(deployer.address);
  // nonce = await nonce.toString();

  console.log(nonce)


  // generate calldata
  // let fnSign = await token.populateTransaction.transferFrom(deployer.address, taxicoinUtils.address, "10");
  console.log("Permit supported ? ", await taxicoinUtils.isPermitSupported(USDC_TOKEN));
  console.log("Balance ", ethers.utils.formatUnits(await token.balanceOf(deployer.address), 6))
  console.log("Approved amount ", ethers.utils.formatUnits(await token.allowance(deployer.address, TXC_UTILS), 6))
  // let fnSign = await token.connect(deployer).populateTransaction.approve(taxicoinUtils.address, "10000");
  // console.log(fnSign.data);


  const deadline = Date.now() + 18000;
  const typedData = await getEIPTypedDataForSigningUSDC(
    deployer.address, 
    taxicoinUtils.address, 
    '10000', 
    parseInt(nonce), 
    deadline
  );
  // const typedData = await getERCChildData(
  //   nonce, 
  //   deployer.address, 
  //   fnSign.data
  // );
  console.log(typedData);

  // sign tx as a msg (EIP-712)
  // let sig = await sigUtil.signTypedData(Buffer.from('3c5f5bb4201ec8e71e37971e7b9adae88d5d90029fa81c89d46afc350b2f2187', 'hex'), { data: typedData });
  // let split = await ethers.utils.splitSignature(sig);
  // console.log(split)

  // // console.log();
  var sign = await deployer._signTypedData(typedData.domain, typedData.types, typedData.message);
  console.log(sign)
  split = ethers.utils.splitSignature(sign);
  console.log(split)

  // let txn1 = await taxicoinUtils.connect(sender).approveMeta(
  //   deployer.address,
  //   token.address,
  //   '10000',
  //   deadline,
  //   split.v,
  //   split.r,
  //   split.s,
  //   "0x",
  //   { gasLimit: '10000000' }
  // );
  // console.log(txn1);

  // let txn1 = await taxicoinUtils.connect(sender).approveMeta(
  //   deployer.address,
  //   token.address,
  //   '10000',
  //   deadline,
  //   split.v,
  //   split.r,
  //   split.s,
  //   fnSign.data,
  //   { gasLimit: '10000000' }
  // );
  // console.log(txn1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
