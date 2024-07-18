//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IERC20Permit} from "../interfaces/IERC20Permit.sol";
import {IERC20Child} from "../interfaces/IERC20Child.sol";

/// Mediator contract
/// This contract will be used by:
/// Users to start ride and make payments for ride
/// Taxi Drivers to complete ride and release payment for ride
/// All functions must happen in a decentralized way using signatures

contract Mediator is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for ERC20Upgradeable;

    function initialize(address _paymentToken) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        validTokens[_paymentToken] = true;
    }

    struct RideDetails {
        address user;
        address driver;
        address paymentToken;
        uint256 maxAmount;
    }

    RideDetails[] public rides;
    uint256 public totalRides;
    // mapping(address => mapping(address => uint256)) public rideDetails;
    mapping(address => bool) public validTokens;

    // Mapping used to check if Permit is supported
    mapping(address => bool) public isPermitSupported;

    // Events
    event RideStarted(address indexed user, address indexed driver, uint256 maxAmount);
    event RideCompleted(address indexed user, address indexed driver, uint256 actualAmount);
    event PaymentTokenUpdated(address indexed tokenAddress, bool tokenStatus);

    function setPaymentFeeToken(address tokenAddress, bool tokenStatus) external nonReentrant onlyOwner {
        require(tokenAddress != address(0), "Invalid address");
        validTokens[tokenAddress] = tokenStatus;
        emit PaymentTokenUpdated(tokenAddress, tokenStatus);
    }

    function updatePermitEnabled(address _tokenAddress, bool status) public {
        isPermitSupported[_tokenAddress] = status;
    }

    function executeTokenTransfer(
        address sender,
        address receiver,
        address tokenAddress,
        uint amount,
        uint deadline,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes memory fnSignature
    ) public {
        if (isPermitSupported[tokenAddress]) {
            IERC20Permit(tokenAddress).permit(sender, address(this), amount, deadline, sigV, sigR, sigS);
        } else {
            IERC20Child(tokenAddress).executeMetaTransaction(sender, fnSignature, sigR, sigS, sigV);
        }
        ERC20Upgradeable(tokenAddress).safeTransferFrom(sender, receiver, amount);
    }

    // function transferTokens(address receiver, uint amount) public {
    //     address msgSender = _getContextAddress();
    //     ERC20Upgradeable(tokenAddress).safeTransferFrom(msgSender, address(this), amount);
    //     ERC20Upgradeable(tokenAddress).safeTransferFrom(msgSender, address(this), amount);
    // }

    function startRidePermit(
        address user,
        address driver,
        address tokenAddress,
        uint256 maxAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        require(user != address(0) && driver != address(0), "Invalid address");
        require(validTokens[tokenAddress], "Invalid payment token");

        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);

        require(paymentToken.balanceOf(user) >= maxAmount, "Insufficient balance for payment");
        require(deadline > block.timestamp, "Ride expired");

        // Approve using Permit function
        IERC20Permit(address(paymentToken)).permit(user, address(this), maxAmount, deadline, v, r, s);

        // Transfer payment to Mediator until ride is complete
        require(paymentToken.transferFrom(user, address(this), maxAmount));

        // Store user ride details
        rides.push(RideDetails({user: user, driver: driver, paymentToken: tokenAddress, maxAmount: maxAmount}));

        emit RideStarted(user, driver, maxAmount);
    }

    function startRide(
        address user,
        address driver,
        address tokenAddress,
        uint256 maxAmount,
        uint256 deadline
    ) public {
        require(user != address(0) && driver != address(0), "Invalid address");
        require(validTokens[tokenAddress], "Invalid payment token");

        ERC20Upgradeable paymentToken = ERC20Upgradeable(tokenAddress);

        require(paymentToken.allowance(msg.sender, address(this)) >= maxAmount, "Insufficient allowance");
        require(deadline > block.timestamp, "Ride expired");

        // Transfer payment to Mediator until ride is complete
        require(paymentToken.transferFrom(msg.sender, address(this), maxAmount), "Insufficient balance");

        // Store user ride details
        rides.push(RideDetails({user: user, driver: driver, paymentToken: tokenAddress, maxAmount: maxAmount}));

        emit RideStarted(user, driver, maxAmount);
    }

    // function completeRide(
    //     address user,
    //     address driver,
    //     uint256 actualAmount
    // ) public {
    //     // Check if there is a pending ride
    //     uint256 rideAmount = rideDetails[user][driver];
    //     require(rideAmount != 0, "Invalid ride");

    //     require(user != address(0) && driver != address(0));

    //     rideDetails[user][driver] = 0;

    //     uint256 userRefund = rideAmount - actualAmount;
    //     if (userRefund > 0) {
    //         require(paymentToken.transferFrom(address(this), user, userRefund));
    //     }
    //     require(paymentToken.transferFrom(address(this), driver, actualAmount));

    //     emit RideCompleted(user, driver, actualAmount);
    // }
}
