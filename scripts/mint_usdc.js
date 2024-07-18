/*
ganache-cli --fork https://eth-mainnet.alchemyapi.io/v2/RLEq7z8U3n2SE4ONPvDBdK_QkrhJTxMD@12022355 --unlock 0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8 -h 0.0.0.0 -p 8546 -m used siren tir warfare belt brass penalty explain fiscal second quit basket
*/

const ethers = require('ethers');
const Web3 = require('web3');
const abi = [{"inputs":[{"internalType":"uint256","name":"chainId_","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"src","type":"address"},{"indexed":true,"internalType":"address","name":"guy","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":true,"inputs":[{"indexed":true,"internalType":"bytes4","name":"sig","type":"bytes4"},{"indexed":true,"internalType":"address","name":"usr","type":"address"},{"indexed":true,"internalType":"bytes32","name":"arg1","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"arg2","type":"bytes32"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"}],"name":"LogNote","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"src","type":"address"},{"indexed":true,"internalType":"address","name":"dst","type":"address"},{"indexed":false,"internalType":"uint256","name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"burn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"guy","type":"address"}],"name":"deny","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"mint","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"src","type":"address"},{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"move","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"holder","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"bool","name":"allowed","type":"bool"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"pull","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"usr","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"push","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"guy","type":"address"}],"name":"rely","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"src","type":"address"},{"internalType":"address","name":"dst","type":"address"},{"internalType":"uint256","name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"wards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]

// const web3 = new Web3(new Web3.providers.HttpProvider());
// bash-4.2$ ganache-cli --fork https://eth-mainnet.alchemyapi.io/v2/RLEq7z8U3n2SE4ONPvDBdK_QkrhJTxMD@12022355 --unlock 0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8 -b 15 -h 0.0.0.0 -p 6661 -m used siren tir warfare belt brass penalty explain fiscal second quit basket

const web3 = new Web3('http://127.0.0.1:8546');
// const unlockedAccount = '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8';
const unlockedAccount = '0x06959153B974D0D5fDfd87D561db6d8d4FA0bb0B';

// const testAccount = '0x221911811467118aCE3Bbb89a13fBab56A8fe00b'
const testAccount = '0xc75Fab47cc54Ed5887143fa7184b2013026aB5F8'

let daiContract = new web3.eth.Contract(abi, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
// let daiContract = new web3.eth.Contract(abi, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');


async function getDaiBalance() {
    let balance = await daiContract.methods['balanceOf'](unlockedAccount).call();
    console.log('DAI balance before:   ', balance);
    return balance;
}

async function transferDAI() {

    let balance = await getDaiBalance();
    let tx = await daiContract.methods['transfer'](testAccount, (ethers.BigNumber.from(balance).div(ethers.BigNumber.from('15'))).toString()).send({ from: unlockedAccount, gasLimit: 5000000 });
    console.log(tx);

    let transactionReceipt = null
    while (transactionReceipt == null) { // Waiting expectedBlockTime until the transaction is mined
        transactionReceipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
    }

    const sendEtherTx = await web3.eth.sendTransaction({ from: unlockedAccount, to: testAccount, value: "100000000000000000000"})
    console.log(sendEtherTx);
    return tx;
}


module.exports.main = async () => {
    let balance = await getDaiBalance();
    // console.log("DAI balance USDC mint main : ", balance)
    // let tx1 = await transferEth();
    // console.log(tx1);
    let tx2 = await transferDAI();
}