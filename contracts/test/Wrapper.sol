//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IUniswapV2Router02} from "../interfaces/IUniswapV2Router02.sol";
import {IUniswapV2Pair} from "../interfaces/IUniswapV2Pair.sol";

import "hardhat/console.sol";

contract Wrapper is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    IUniswapV2Router02 public uniswapV2Router02;
    ERC20Upgradeable public taxiCoin;
    ERC20Upgradeable public usdcToken;
    ERC20Upgradeable public lpPairToken;

    mapping(address => uint256) public txcDeposited;
    mapping(address => uint256) public usdcDeposited;
    mapping(address => uint256) public lpTokens;

    function initialize(
        address _router02,
        address _taxiCoin,
        address _usdcToken,
        address _lpPairToken
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        uniswapV2Router02 = IUniswapV2Router02(_router02);
        taxiCoin = ERC20Upgradeable(_taxiCoin);
        usdcToken = ERC20Upgradeable(_usdcToken);
        lpPairToken = ERC20Upgradeable(_lpPairToken);
    }

    function addTokens(uint256 amountTXC, uint256 amountUSDC, uint256 amountAMin, uint256 amountBMin) public nonReentrant {
        // Transfer both the tokens to contract
        require(taxiCoin.transferFrom(msg.sender, address(this), amountTXC), "TXC Transfer failed");
        require(usdcToken.transferFrom(msg.sender, address(this), amountUSDC), "USDC Transfer failed");

        // Approve Uniswap Router to transfer tokens
        require(taxiCoin.approve(address(uniswapV2Router02), amountTXC));
        require(usdcToken.approve(address(uniswapV2Router02), amountUSDC));

        (uint256 txcSent, uint256 usdcSent, uint256 liquidity) = uniswapV2Router02.addLiquidity(
            address(taxiCoin),
            address(usdcToken),
            amountTXC,
            amountUSDC,
            amountAMin,
            amountBMin,
            address(this),
            block.timestamp
        );

        txcDeposited[msg.sender] = txcSent;
        usdcDeposited[msg.sender] = usdcSent;
        lpTokens[msg.sender] = liquidity;
    }

    function removeTokens() public nonReentrant {
        
        require(lpPairToken.approve(address(uniswapV2Router02), lpTokens[msg.sender]));
        
        (uint amountTXC, uint amountUSDC) = uniswapV2Router02.removeLiquidity(
            address(taxiCoin),
            address(usdcToken),
            lpTokens[msg.sender],
            1,
            1,
            address(this),
            block.timestamp
        );
        uint256 depositValue = 2 * usdcDeposited[msg.sender];

        lpTokens[msg.sender] = 0;
        usdcDeposited[msg.sender] = 0;
        txcDeposited[msg.sender] = 0;

        // Get reserve values for both tokens, values are returned in sorted order
        uint256 reserveUSDC;
        uint256 reserveTXC;
        if (IUniswapV2Pair(address(lpPairToken)).token0() == address(taxiCoin)) {
            (reserveTXC, reserveUSDC, ) = IUniswapV2Pair(address(lpPairToken)).getReserves();
        } else {
            (reserveUSDC, reserveTXC, ) = IUniswapV2Pair(address(lpPairToken)).getReserves();
        }

        // uint256 currentValue = uniswapV2Router02.getAmountOut(amountTXC, reserveIn, reserveOut);
        uint256 txcValue = uniswapV2Router02.quote(amountTXC, reserveTXC, reserveUSDC);
        uint256 feesEarned = (txcValue + amountUSDC) - depositValue;

        if (feesEarned > 0) {
            usdcToken.transfer(msg.sender, (amountUSDC - feesEarned));
        } else {
            usdcToken.transfer(msg.sender, amountUSDC);
        }

        taxiCoin.transfer(msg.sender, amountTXC);

    }

    /***
    // @dev Partial withdrawal works by withdrawing the entire liquidity first, transferring the amount of tokens requested,
    // and depositing the remaining tokens again treating it as a fresh deposit. 
    // This process is used for charging the trading fees on LP. In case no fees is accrued/Impermanent Loss, no fees is charged
    **/
    function removePartial(uint256 withdrawAmountTXC, uint256 withdrawAmountUSDC) public nonReentrant {
        
        // require(lpTokens[msg.sender] >= amountLP);
        require(lpPairToken.approve(address(uniswapV2Router02), lpTokens[msg.sender]));
        
        (uint amountTXC, uint amountUSDC) = uniswapV2Router02.removeLiquidity(
            address(taxiCoin),
            address(usdcToken),
            lpTokens[msg.sender],
            0,
            0,
            address(this),
            block.timestamp
        );
        lpTokens[msg.sender] = 0;

        uint256 depositValue = 2 * usdcDeposited[msg.sender];

        // Get reserve values for both tokens, values are returned in sorted order
        uint256 reserveUSDC;
        uint256 reserveTXC;
        if (IUniswapV2Pair(address(lpPairToken)).token0() == address(taxiCoin)) {
            (reserveTXC, reserveUSDC, ) = IUniswapV2Pair(address(lpPairToken)).getReserves();
        } else {
            (reserveUSDC, reserveTXC, ) = IUniswapV2Pair(address(lpPairToken)).getReserves();
        }

        uint256 txcValueInUSDC = uniswapV2Router02.quote(amountTXC, reserveTXC, reserveUSDC);
        uint256 feesEarned = (txcValueInUSDC + amountUSDC) - depositValue;

        uint256 txcAmountToDeposit = amountTXC - withdrawAmountTXC;
        uint256 usdcAmountToDeposit;

        usdcDeposited[msg.sender] = 0;
        txcDeposited[msg.sender] = 0;

        if (feesEarned > 0) {
            usdcToken.transfer(msg.sender, (withdrawAmountUSDC - feesEarned));
            usdcAmountToDeposit = amountUSDC - feesEarned - withdrawAmountUSDC;
        } else {
            usdcToken.transfer(msg.sender, withdrawAmountUSDC);
            usdcAmountToDeposit = amountUSDC - withdrawAmountUSDC;
        }
        taxiCoin.transfer(msg.sender, withdrawAmountTXC);

        // Logic to add remaining tokens to LP, same logic as addTokens(usdc,txc) but instead of transferring deposit tokens
        // from msg.sender, deposit tokens are transferred from this contract 
        require(taxiCoin.approve(address(uniswapV2Router02), txcAmountToDeposit));
        require(usdcToken.approve(address(uniswapV2Router02), usdcAmountToDeposit));

        uint256 amountAMin = (amountTXC * 950) / 1000;
        uint256 amountBMin = (amountUSDC * 950) / 1000;

        (uint256 txcSent, uint256 usdcSent, uint256 liquidity) = uniswapV2Router02.addLiquidity(
            address(taxiCoin),
            address(usdcToken),
            txcAmountToDeposit,
            usdcAmountToDeposit,
            amountAMin,
            amountBMin,
            address(this),
            block.timestamp
        );

        txcDeposited[msg.sender] = txcSent;
        usdcDeposited[msg.sender] = usdcSent;
        lpTokens[msg.sender] = liquidity;

    }
}
