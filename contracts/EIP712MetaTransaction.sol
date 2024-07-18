//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "hardhat/console.sol";

abstract contract EIP712MetaTransaction is Initializable, ReentrancyGuardUpgradeable {

    address public currentContextAddress;
    bytes32 public DOMAIN_SEPARATOR;

    /// @dev Mapping used to store hash of all executed transactions to prevent replay attacks
    mapping(bytes32 => bool) public transactionsExecuted;

    /// @dev Structure for EIP712 Domain
    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    /// @dev Structure to store the meta transaction details
    struct Transaction {
        uint256 salt;
        uint256 expirationTimeSeconds;
        address signerAddress;
        bytes transactionData;
    }

    bytes32 public constant EIP712DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public constant TRANSACTION_TYPEHASH =
        keccak256("Transaction(uint256 salt,uint256 expirationTimeSeconds,address signerAddress,bytes transactionData)");

    event SetContextAddress(address);
    event TransactionSuccess(bytes32 transactionHash);
    event TransactionFailure(bytes32 transactionHash, bytes returnData);

    /// @dev Initializer function for Upgradeable contract
    /// @param _name Name of the contract
    /// @param _version Contract version
    /// @param _chainId Chain ID for the deployed contract
    function __EIP712MetaTransaction__init(
        string memory _name,
        string memory _version,
        uint256 _chainId
    ) public initializer {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(_name)),
                keccak256(bytes(_version)),
                _chainId,
                address(this)
            )
        );
    }

    /// @dev Hashes the transaction data structure
    /// @param transaction Transaction data structure
    /// @return txHash Transaction hash bytes data
    function hashTransaction(Transaction memory transaction) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TRANSACTION_TYPEHASH,
                    transaction.salt,
                    transaction.expirationTimeSeconds,
                    transaction.signerAddress,
                    keccak256(transaction.transactionData)
                )
            );
    }

    /// @dev Verifies the user signature for transaction
    /// @param transaction Transaction data structure
    /// @param v Version/Type of signature bytes
    /// @param r Part r of Signature bytes
    /// @param s Part s of Signature bytes
    /// @return result True if the signature is verified
    function verifyTransaction(
        Transaction memory transaction,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public view returns (bool) {
        bytes32 transactionHash = hashTransaction(transaction);
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, transactionHash));

        address recoveredAddress = ecrecover(digest, v, r, s);
        return recoveredAddress == transaction.signerAddress;
    }

    /// @dev Execute meta transaction using signatures
    /// @param salt Unique number to prevent replay attacks
    /// @param expiry Timestamp till the transaction is valid
    /// @param signerAddress Address that signed the transaction data
    /// @param transactionData Transaction data bytes
    /// @param v Version/Type of signature bytes
    /// @param r Part r of Signature bytes
    /// @param s Part s of Signature bytes
    /// @return returnData The return data after transaction execution
    function executeTransaction(
        uint256 salt,
        uint256 expiry,
        address signerAddress,
        bytes memory transactionData,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bytes memory) {
        address signer = signerAddress;

        Transaction memory transaction = Transaction({
            salt: salt,
            expirationTimeSeconds: expiry,
            signerAddress: signer,
            transactionData: transactionData
        });

        //Check if the same transaction was executed before
        bytes32 transactionHash = hashTransaction(transaction);
        require(!transactionsExecuted[transactionHash], "Duplicate Transaction. Already executed");
        transactionsExecuted[transactionHash] = true;

        //Transaction expiration check
        require(expiry > block.timestamp, "Transaction expired");

        //Check if invalid context
        require(currentContextAddress == address(0), "Invalid transaction context");

        //Verify transaction signature
        require(verifyTransaction(transaction, v, r, s), "Signature verification failed");

        //Set the current signer context for transaction call if signerAddress != msg.sender
        _setCurrentContextAddressIfRequired(signer, signer);

        (bool isSuccess, bytes memory returnData) = address(this).call(transaction.transactionData);

        if (isSuccess) {
            emit TransactionSuccess(transactionHash);
        } else {
            emit TransactionFailure(transactionHash, returnData);
        }

        //Reset the context address
        _setCurrentContextAddressIfRequired(signer, address(0));
        return returnData;
    }

    /// @dev Sets the current context address based on the type of transaction
    /// @param signerAddress The current signer of transaction
    /// @param contextAddress The address in context for the transaction
    function _setCurrentContextAddressIfRequired(address signerAddress, address contextAddress) internal {
        if (signerAddress != msg.sender) {
            currentContextAddress = contextAddress;
            emit SetContextAddress(signerAddress);
        }
    }

    /// @dev Returns the current context address based on the type of transaction
    /// @return userAddress The current context user address
    function _getCurrentContextAddress() internal view returns (address) {
        address currentContextAddress_ = currentContextAddress;
        address contextAddress = currentContextAddress_ == address(0) ? msg.sender : currentContextAddress_;
        return contextAddress;
    }
}
