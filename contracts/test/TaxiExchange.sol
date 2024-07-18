//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../EIP712MetaTransaction.sol";
import {IUniswapV2Router02} from "../interfaces/IUniswapV2Router02.sol";
import {IERC20Permit} from "../interfaces/IERC20Permit.sol";
import {IERC20Child} from "../interfaces/IERC20Child.sol";

contract TaxiExchange is OwnableUpgradeable, EIP712MetaTransaction {
    IUniswapV2Router02 public router02;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // Mapping used to check if Permit is supported
    mapping(address => bool) public isPermitSupported;

    // Events
    event metaApproval(address indexed owner, address indexed spender, uint amount);

    function __TaxiExchange_Init(address _router, uint _chainId) public initializer {
        __Ownable_init();
        __EIP712MetaTransaction__init("TaxiExchange", "1", _chainId);
        __ReentrancyGuard_init();
        router02 = IUniswapV2Router02(_router);
    }

    /// @dev Update router address
    /// @param _router Updated router address
    function setRouter(address _router) external nonReentrant onlyOwner {
        require(_router != address(0), "Invalid address");
        router02 = IUniswapV2Router02(_router);
    }

    function approveMeta(
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
        emit metaApproval(sender, receiver, amount);
    }

    function executeSwap(
        uint _amountIn,
        uint _amountOutMin,
        address[] memory _path
    ) public {
        address msgSender = _getCurrentContextAddress();
        IERC20Upgradeable tokenIn = IERC20Upgradeable(_path[0]);
        tokenIn.safeTransferFrom(msgSender, address(this), _amountIn);

        // Approve router to spend tokens for swap
        tokenIn.safeApprove(address(router02), 0);
        tokenIn.safeApprove(address(router02), _amountIn);

        router02.swapExactTokensForTokens(_amountIn, _amountOutMin, _path, msgSender, block.timestamp);
    }

    // function executeSwapMeta(
    //     uint _amountIn,
    //     uint _amountOutMin,
    //     address[] memory _path,
    //     uint deadline,
    //     uint8 sigV,
    //     bytes32 sigR,
    //     bytes32 sigS,
    //     bytes memory fnSignature
    // ) public {
    //     address msgSender = _getCurrentContextAddress();
    //     IERC20Upgradeable tokenIn = IERC20Upgradeable(_path[0]);
    //     tokenIn.safeTransferFrom(msgSender, address(this), _amountIn);

    //     if (isPermitSupported[_path[0]]) {
    //         IERC20Permit(_path[0]).permit(msgSender, address(this), _amountIn, deadline, sigV, sigR, sigS);
    //     } else {
    //         IERC20Child(_path[0]).executeMetaTransaction(msgSender, fnSignature, sigR, sigS, sigV);
    //     }
    //     tokenIn.safeTransferFrom(msgSender, address(this), _amountIn);

    //     // Approve router to spend tokens for swap
    //     tokenIn.safeApprove(address(router02), 0);
    //     tokenIn.safeApprove(address(router02), _amountIn);

    //     router02.swapExactTokensForTokens(_amountIn, _amountOutMin, _path, msgSender, block.timestamp);
    // }

    function addTokens(
        address tokenA,
        address tokenB,
        uint amountA,
        uint amountB,
        uint amountAMin,
        uint amountBMin
    ) public nonReentrant {
        IERC20Upgradeable token0 = IERC20Upgradeable(tokenA);
        IERC20Upgradeable token1 = IERC20Upgradeable(tokenB);

        // Transfer both the tokens to contract
        token0.safeTransferFrom(msg.sender, address(this), amountA);
        token1.safeTransferFrom(msg.sender, address(this), amountB);

        // Approve Uniswap Router to transfer tokens
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

        (amount0, amount1, liquidity);
    }
}
