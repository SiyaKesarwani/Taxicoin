//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {SafeMathUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";
import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";
import {IERC20Permit} from "./interfaces/IERC20Permit.sol";
import {IERC20Child} from "./interfaces/IERC20Child.sol";

import "./EIP712MetaTransaction.sol";

import "hardhat/console.sol";

contract TaxicoinUtils is OwnableUpgradeable, EIP712MetaTransaction {
    IUniswapV2Router02 public router02;
    IUniswapV2Factory public factory;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // Mapping used to check if Permit is supported
    mapping(address => bool) public isPermitSupported;

    // Mapping to store liquidity details
    // NOTE: In case of multiple liquidity pairs, it should be a mapping like
    // Address of LP Pair => User Address => Amount
    mapping(address => uint256) public lpTokenBalances;

    // Mapping to store ride details
    mapping(address => uint256) public maxRideAmount;
    mapping(address => uint256) public rideDeadline;
    mapping(address => address) public ridePaymentToken;

    // Admin wallet address that receives earnings from ride
    address public adminWallet;

    // Approved operators that can complete ride
    mapping(address => bool) public approvedOperators;

    // Events
    event MetaApproval(address indexed owner, address indexed spender, uint amount);
    event MetaTransfer(address indexed from, address indexed to, uint256 value);
    event LiquidityAdded(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    // Events for Rides
    event RideStarted(address indexed user, address indexed paymentToken, uint256 maxAmount, uint256 deadline);
    event RideCompleted(
        address indexed user,
        address indexed paymentToken,
        uint256 actualAmount,
        uint256 completedTimestamp
    );
    event PaymentToDriver(
        address indexed user,
        address indexed driver,
        address indexed paymentToken,
        uint256 actualAmount,
        uint256 completedTimestamp
    );
    event RideEdited(address indexed user, address indexed paymentToken, uint256 actualAmount, uint256 completedTimestamp);
    event RideCancelled(address indexed user);

    // Admin events
    event AdminUpdated(address indexed admin);
    event OperatorAdded(address indexed operatorAddress);
    event OperatorRemoved(address indexed operatorAddress);

    struct Lock {
        address owner;
        uint256 amount;
        uint256 timestamp;
    }

    enum Slab {
        A,
        B,
        C,
        D
    }

    uint256 public lockInPeriod;
    mapping(address => Lock) public userToLock;
    mapping(address => Slab) public userToSlab;

    event TokensLocked(Lock lock, Slab slab);
    event TokensUnlocked(Lock lock, Slab slab);
    event EmergencyUnlocked(Lock lock, Slab slab);

    uint256 public totalLockedTokens;

    // Events for liquidity
    event LiquidityRemoved(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    function initialize(
        address _router,
        uint256 _chainId,
        uint256 _lockInPeriod
    ) public initializer {
        __Ownable_init();
        __EIP712MetaTransaction__init("TaxicoinUtils", "1", _chainId);
        __ReentrancyGuard_init();
        router02 = IUniswapV2Router02(_router);
        factory = IUniswapV2Factory(router02.factory());
        adminWallet = msg.sender;
        approvedOperators[msg.sender] = true;
        lockInPeriod = _lockInPeriod;
    }

    /// @dev Update router address
    /// @param _router Updated router address
    function setRouter(address _router) external nonReentrant onlyOwner {
        require(_router != address(0), "Invalid address");
        router02 = IUniswapV2Router02(_router);
        factory = IUniswapV2Factory(router02.factory());
    }

    /// @dev Set/Unset if the token address supports permit
    /// @param _tokenAddress Address of the token
    /// @param status true or false if it supports permit
    function updatePermitEnabled(address _tokenAddress, bool status) public nonReentrant {
        require(isPermitSupported[_tokenAddress] != status, "Already updated");
        isPermitSupported[_tokenAddress] = status;
    }

    /// @dev Set admin address
    /// @param _admin Address of admin
    function setAdminWallet(address _admin) external onlyOwner nonReentrant {
        require(_admin != address(0), "Invalid address");
        adminWallet = _admin;
        emit AdminUpdated(_admin);
    }

    /// @dev Add an operator for the contract
    /// @param _operatorAddress Address of operator to add
    function addOperator(address _operatorAddress) external onlyOwner nonReentrant {
        require(_operatorAddress != address(0), "Invalid address");
        require(!approvedOperators[_operatorAddress], "Already approved");
        approvedOperators[_operatorAddress] = true;
        emit OperatorAdded(_operatorAddress);
    }

    /// @dev Remove an operator for the contract
    /// @param _operatorAddress Address of operator to remove
    function removeOperator(address _operatorAddress) external onlyOwner nonReentrant {
        require(_operatorAddress != address(0), "Invalid address");
        require(approvedOperators[_operatorAddress], "Operator not approved");
        approvedOperators[_operatorAddress] = false;
        emit OperatorRemoved(_operatorAddress);
    }

    /// @dev Approve meta transaction for a ERC20Permit type token or execute a meta transaction for a ERC20Child type token
    /// @param sender Address of sender
    /// @param tokenAddress Address of token
    /// @param amount amount to be transferred (in case of ERC20Permit)
    /// @param deadline Deadline for the transaction
    /// @param sigV V value of signature
    /// @param sigR R value of signature
    /// @param sigS S value of signature
    /// @param fnSignature Function signature (in case of ERC20Child)
    // Note: The function only supports tokens that are Permit enabled or inherit from the Matic ChildERC20 Interface
    // If token supports Permit, it should be updated first using updatePermitEnabled function
    function approveMeta(
        address sender,
        address tokenAddress,
        uint amount,
        uint deadline,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes memory fnSignature
    ) public nonReentrant {
        if (isPermitSupported[tokenAddress]) {
            IERC20Permit(tokenAddress).permit(sender, address(this), amount, deadline, sigV, sigR, sigS);
        } else {
            IERC20Child(tokenAddress).executeMetaTransaction(sender, fnSignature, sigR, sigS, sigV);
        }
        emit MetaApproval(sender, address(this), amount);
    }

    /// @dev Perform meta transfer for ERC20Permit type token
    /// @param tokenAddress Address of token
    /// @param receiver Address of receiver
    /// @param amount Amount to transfer
    // Note: This contract must have prior allowance for this function to work
    function transferMeta(
        address tokenAddress,
        address receiver,
        uint amount
    ) public nonReentrant {
        require(amount > 0, "Invalid amount");
        address msgSender = _getCurrentContextAddress();
        IERC20Upgradeable(tokenAddress).safeTransferFrom(msgSender, receiver, amount);
        emit MetaTransfer(msgSender, receiver, amount);
    }

    /// @dev Function to swap one token for another
    /// @param _amountIn Amount put in
    /// @param _amountOutMin Minimum amount out expected
    /// @param _path Array path from one token to another for swapping
    function executeSwap(
        uint _amountIn,
        uint _amountOutMin,
        address[] memory _path
    ) public nonReentrant {
        require(_amountIn > 0, "Invalid amount");
        address msgSender = _getCurrentContextAddress();
        IERC20Upgradeable tokenIn = IERC20Upgradeable(_path[0]);
        tokenIn.safeTransferFrom(msgSender, address(this), _amountIn);

        // Approve router to spend tokens for swap
        tokenIn.safeApprove(address(router02), 0);
        tokenIn.safeApprove(address(router02), _amountIn);

        router02.swapExactTokensForTokens(_amountIn, _amountOutMin, _path, msgSender, block.timestamp);
    }

    /// @dev Function to add liquidity to exchange
    /// @param tokenA Address of token A
    /// @param tokenB Address of token B
    /// @param amountA Amount of token A
    /// @param amountB Amount of token B
    /// @param amountAMin Minimum amount of token A to provide
    /// @param amountBMin Minimum amount of token B to provide
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountA,
        uint amountB,
        uint amountAMin,
        uint amountBMin
    ) public nonReentrant {
        require(amountA > 0 && amountB > 0, "Invalid amount");

        address msgSender = _getCurrentContextAddress();
        IERC20Upgradeable token0 = IERC20Upgradeable(tokenA);
        IERC20Upgradeable token1 = IERC20Upgradeable(tokenB);

        // Transfer both the tokens to contract
        token0.safeTransferFrom(msgSender, address(this), amountA);
        token1.safeTransferFrom(msgSender, address(this), amountB);

        // Approve Uniswap Router to transfer tokens, approval should be 0 before another approval
        token0.safeApprove(address(router02), 0);
        token1.safeApprove(address(router02), 0);

        token0.safeApprove(address(router02), amountA);
        token1.safeApprove(address(router02), amountB);

        (uint amount0, uint amount1, uint256 liquidity) = router02.addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            amountAMin,
            amountBMin,
            address(this),
            block.timestamp
        );
        lpTokenBalances[msgSender] = SafeMathUpgradeable.add(lpTokenBalances[msgSender], liquidity);
        emit LiquidityAdded(tokenA, tokenB, amount0, amount1, liquidity);
    }

    /// @dev Function to remove liquidity from exchange
    /// @param tokenA Address of token A
    /// @param tokenB Address of token B
    /// @param amountLP Amount of LP tokens to provide
    /// @param amountAMin Min token A amount expected
    /// @param amountBMin Min token B amount expected
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountLP,
        uint amountAMin,
        uint amountBMin
    ) public nonReentrant {
        require(amountLP > 0, "Invalid amount");

        address msgSender = _getCurrentContextAddress();

        IERC20Upgradeable lpPairToken = IERC20Upgradeable(factory.getPair(tokenA, tokenB));
        require(lpTokenBalances[msgSender] >= amountLP, "Insufficient LP balance");
        lpTokenBalances[msgSender] = SafeMathUpgradeable.sub(lpTokenBalances[msgSender], amountLP);

        lpPairToken.safeApprove(address(router02), 0);
        lpPairToken.safeApprove(address(router02), amountLP);

        (uint amountA, uint amountB) = router02.removeLiquidity(
            tokenA,
            tokenB,
            amountLP,
            amountAMin,
            amountBMin,
            address(this),
            block.timestamp
        );

        IERC20Upgradeable(tokenA).safeTransfer(msgSender, amountA);
        IERC20Upgradeable(tokenB).safeTransfer(msgSender, amountB);
        emit LiquidityRemoved(tokenA, tokenB, amountA, amountB, amountLP);
    }

    /// @dev Starts a new ride for user address. If it is a meta tx, the user address is retrieved using signatures else msg.sender is the user
    /// @param _tokenAddress Address of token
    /// @param _maxRideAmount Maximum ride amount allowed
    /// @param _rideDeadline Ride deadline
    function startRide(
        address _tokenAddress,
        uint256 _maxRideAmount,
        uint256 _rideDeadline
    ) public nonReentrant {
        address msgSender = _getCurrentContextAddress();
        require(approvedOperators[tx.origin], "Invalid operator");

        require(maxRideAmount[msgSender] == 0, "Previous ride pending!");
        require(rideDeadline[msgSender] == 0, "Previous ride pending!");
        require(ridePaymentToken[msgSender] == address(0), "Previous ride pending!");

        require(_rideDeadline > block.timestamp, "Invalid timestamp");

        IERC20Upgradeable paymentToken = IERC20Upgradeable(_tokenAddress);
        require(paymentToken.balanceOf(msgSender) >= _maxRideAmount, "Insufficient balance");
        require(paymentToken.allowance(msgSender, address(this)) >= _maxRideAmount, "Insufficient allowance");

        // Store user ride details
        maxRideAmount[msgSender] = _maxRideAmount;
        rideDeadline[msgSender] = _rideDeadline;
        ridePaymentToken[msgSender] = _tokenAddress;

        emit RideStarted(msgSender, _tokenAddress, _maxRideAmount, _rideDeadline);
    }

    /// @dev Ends a ride for user address and pays ride amount to admin wallet
    /// @param _user Address of user
    /// @param actualRideAmount Actual ride amount
    function completeRide(address _user, uint256 actualRideAmount) public nonReentrant {
        IERC20Upgradeable paymentToken = IERC20Upgradeable(ridePaymentToken[_user]);
        _completeRide(_user, actualRideAmount, paymentToken);

        // Transfer the ride amount to admin wallet
        paymentToken.safeTransferFrom(_user, adminWallet, actualRideAmount);

        emit RideCompleted(_user, address(paymentToken), actualRideAmount, block.timestamp);
    }

    /// @dev Ends a ride for user address and pays ride amount directly to the driver
    /// @param _user Address of user
    /// @param actualRideAmount Actual ride amount
    /// @param driverWallet Address of driver
    function completeRideAndPayToDriver(
        address _user, 
        uint256 actualRideAmount,
        address driverWallet
    ) public nonReentrant {
        IERC20Upgradeable paymentToken = IERC20Upgradeable(ridePaymentToken[_user]);
        _completeRide(_user, actualRideAmount, paymentToken);

        // Transfer the ride amount to driver wallet
        paymentToken.safeTransferFrom(_user, driverWallet, actualRideAmount);

        emit RideCompleted(_user, address(paymentToken), actualRideAmount, block.timestamp);
        emit PaymentToDriver(_user, driverWallet, address(paymentToken), actualRideAmount, block.timestamp);
    }

    function _completeRide(
        address _user, 
        uint256 actualRideAmount, 
        IERC20Upgradeable paymentToken
    ) private {
        require(approvedOperators[msg.sender], "Invalid operator");

        // Check if there is a pending ride
        uint256 maxAmount = maxRideAmount[_user];
        require(maxAmount != 0, "No pending ride");

        require(address(paymentToken) != address(0), "Invalid ride ");

        // Check ride expiry
        require(rideDeadline[_user] >= block.timestamp, "Ride expired");

        // Check if amount is valid
        require(actualRideAmount <= maxAmount, "Actual amount cannot be greater than max amount");

        // Reset values for ride
        maxRideAmount[_user] = 0;
        rideDeadline[_user] = 0;
        ridePaymentToken[_user] = address(0);
    }

    /// @dev Update ride detail parameters, prior ride must exist for this function to work. 
    ///      If it is a meta tx, the user address is retrieved using signatures else msg.sender is the user
    /// @param _tokenAddress Address of token
    /// @param _maxRideAmount Maximum ride amount allowed
    /// @param _rideDeadline Ride deadline
    function editRide(
        address _tokenAddress,
        uint256 _maxRideAmount,
        uint256 _rideDeadline
    ) public nonReentrant {
        address msgSender = _getCurrentContextAddress();
        require(approvedOperators[tx.origin], "Invalid operator");

        require(maxRideAmount[msgSender] != 0, "Existing ride not found!");
        require(rideDeadline[msgSender] != 0, "Existing ride not found!");
        require(ridePaymentToken[msgSender] != address(0), "Existing ride not found!");

        require(_rideDeadline > block.timestamp, "Invalid timestamp");

        IERC20Upgradeable paymentToken = IERC20Upgradeable(_tokenAddress);
        require(paymentToken.balanceOf(msgSender) >= _maxRideAmount, "Insufficient balance");
        require(paymentToken.allowance(msgSender, address(this)) >= _maxRideAmount, "Insufficient allowance");

        // Store user ride details
        maxRideAmount[msgSender] = _maxRideAmount;
        rideDeadline[msgSender] = _rideDeadline;
        ridePaymentToken[msgSender] = _tokenAddress;

        emit RideEdited(msgSender, _tokenAddress, _maxRideAmount, _rideDeadline);
    }

    /// @dev Cancel/Reset rides
    /// @param _user User address
    function cancelRide(address _user) public nonReentrant {
        require(approvedOperators[msg.sender], "Invalid operator");

        // Reset values for ride
        maxRideAmount[_user] = 0;
        rideDeadline[_user] = 0;
        ridePaymentToken[_user] = address(0);

        emit RideCancelled(_user);
    }

    /// @dev Set lockin period for token locking
    // Note: only owner can modify
    function setLockInPeriod(uint256 _lockInPeriod) external onlyOwner {
        lockInPeriod = _lockInPeriod;
    }

    /// @dev Function to lock tokens
    /// @param _tokenAddress Address of token to be locked
    /// @param _owner Owner of token
    /// @param _amount Amount to be locked
    function lockTokens(
        address _tokenAddress,
        address _owner,
        uint256 _amount,
        Slab slab
    ) public nonReentrant {
        require(approvedOperators[msg.sender], "Invalid operator");
        require(_amount > 0, "Amount cannot be zero");
        uint256 timestamp = block.timestamp;

        IERC20Upgradeable(_tokenAddress).safeTransferFrom(_owner, address(this), _amount);

        Lock memory userLock = userToLock[_owner];
        if (userLock.owner == address(0)) {
            userLock.owner = _owner;
        }
        userLock.amount = SafeMathUpgradeable.add(userLock.amount, _amount);
        userLock.timestamp = timestamp;
        userToLock[_owner] = userLock;

        userToSlab[_owner] = slab;
        totalLockedTokens = SafeMathUpgradeable.add(totalLockedTokens, _amount);

        emit TokensLocked(userLock, slab);
    }

    /// @dev Function to unlock tokens
    /// @param _tokenAddress Address of token to be unlocked
    /// @param _owner Owner of token
    /// @param slab New slab value of owner
    function unlockTokens(
        address _tokenAddress,
        address _owner,
        Slab slab
    ) public nonReentrant {
        require(approvedOperators[msg.sender], "Invalid operator");
        uint256 timestamp = block.timestamp;

        Lock memory userLock = userToLock[_owner];

        require(userLock.owner != address(0), "Lock does not exist");
        require(userLock.amount != 0, "Lock amount is zero");
        require((userLock.timestamp + lockInPeriod) <= timestamp, "Unavailable to unlock");
        uint256 amount = userLock.amount;

        userLock.amount = 0;
        userLock.timestamp = timestamp;
        userToLock[_owner] = userLock;

        userToSlab[_owner] = slab;
        totalLockedTokens = SafeMathUpgradeable.sub(totalLockedTokens, amount);
        IERC20Upgradeable(_tokenAddress).safeTransfer(_owner, amount);

        emit TokensUnlocked(userLock, slab);
    }

    /// @dev Function to emergency unlock tokens i.e. before lockin period
    /// @param _tokenAddress Address of token to be unlocked
    /// @param _owner Owner of token
    /// @param slab New slab value of owner
    function emergencyUnlockTokens(
        address _tokenAddress,
        address _owner,
        Slab slab
    ) public nonReentrant {
        require(approvedOperators[msg.sender], "Invalid operator");
        uint256 timestamp = block.timestamp;

        Lock memory userLock = userToLock[_owner];

        require(userLock.owner != address(0), "Lock does not exist");
        require(userLock.amount != 0, "Lock amount is zero");
        uint256 amount = userLock.amount;

        userLock.amount = 0;
        userLock.timestamp = timestamp;
        userToLock[_owner] = userLock;

        userToSlab[_owner] = slab;
        totalLockedTokens = SafeMathUpgradeable.sub(totalLockedTokens, amount);

        IERC20Upgradeable(_tokenAddress).safeTransfer(_owner, amount);

        emit EmergencyUnlocked(userLock, slab);
    }
}
