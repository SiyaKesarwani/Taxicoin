const ethers = require('ethers');

const CHAIN_ID = "80002"
const USDC_CONTRACT = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"
const USDCe_CONTRACT = "0x9238425a5273396802C7B1452452C8d40294F94A"
const USDT_CONTRACT = "0xb81A7f2Da9318c0930e47F119D41609eC4F8f974" // USDT child coin
const DAI_CONTRACT = "0x3a9B6ad450ec03421bd31B797b8003E104aF683D" // DAI child coin
const Taxicoin_CONTRACT = "0x1c90235fbf6e3ca5d2c6f733b717ced061f74f6d" // TXC
const Taxi_CONTRACT = "0x084677b19fd4FD98be5C4e835F8d7555B40c6030" // utils

const getEIPTypedDataForSigning = (owner, spender, maxAmount, nonce, deadline) => {

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
        name: "TESTCOIN",
        version: "1",
        chainId: parseInt(CHAIN_ID),
        verifyingContract: Taxicoin_CONTRACT
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
        name: "USDC",
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
        chainId: parseInt(CHAIN_ID),
        verifyingContract: USDCe_CONTRACT
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
        name: "Tether USD",
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

const getERCChildDataDAI = (nonce, from, functionSignature) => {

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
        name: "Dai Stablecoin",
        version: "1",
        verifyingContract: DAI_CONTRACT,
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
        verifyingContract: Taxi_CONTRACT
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

module.exports = {
    getEIPTypedDataForSigning,
    getEIPTypedDataForSigningUSDC,
    getEIPTypedDataForSigningUSDCe,
    getERCChildData,
    getTransactionData,
    getERCChildDataDAI
}