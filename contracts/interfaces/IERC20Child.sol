// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IERC20Child {
    function executeMetaTransaction(
        address userAddress,
        bytes memory functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external returns (bytes memory);
}
