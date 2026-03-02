---
name: uniswap-planner
description: This skill should be used when the user asks to "swap on uniswap", "trade tokens on uniswap", "add liquidity to uniswap", "provide liquidity on uniswap", "remove liquidity from uniswap", "create LP position", "uniswap V3 position", or mentions Uniswap V3 operations including swaps, adding/removing liquidity on Ethereum or Arbitrum.
license: MIT
metadata:
  author: Uniswap AI Contributors
  version: 1.0.0
---

# Uniswap V3 Planner

Plan and generate strategies for Uniswap V3 swaps and liquidity operations on Ethereum and Arbitrum.

## Overview

Plan Uniswap V3 operations by:

1. Gathering operation intent (action, tokens, amount, chain, fee tier)
2. Validating tokens against whitelist
3. Checking fee tier compatibility for the token pair
4. Simulating price impact and slippage
5. Generating optimal strategy or deep link for execution

Supported actions:

- **Swap**: Exchange one token for another
- **Add Liquidity**: Provide liquidity in a price range
- **Remove Liquidity**: Withdraw an LP position
- **Collect Fees**: Collect accumulated trading fees

Supported chains:

- **Ethereum Mainnet** (chainId: 1)
- **Arbitrum One** (chainId: 42161)

## Fee Tier Selection Guide

| Pair Type | Recommended Fee | Reason |
|-----------|-----------------|--------|
| Stablecoin-stablecoin (USDC/USDT) | 100 (0.01%) | Minimal price deviation |
| Correlated (USDC/DAI) | 500 (0.05%) | Low volatility |
| Blue-chip pairs (WETH/USDC) | 500 or 3000 | Check liquidity depth |
| Standard pairs | 3000 (0.3%) | Most common |
| Exotic/volatile | 10000 (1%) | Compensates for IL risk |

## Whitelist Assets

### Ethereum (chainId: 1)

| Symbol | Address | Decimals |
|--------|---------|----------|
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | 18 |
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` | 8 |
| DAI | `0x6B175474E89094C44Da98b954EedeAC495271d0F` | 18 |

### Arbitrum (chainId: 42161)

| Symbol | Address | Decimals |
|--------|---------|----------|
| WETH | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` | 18 |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 |
| USDT | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 |
| WBTC | `0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f` | 8 |
| DAI | `0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1` | 18 |

## Deep Link Format

```
https://app.uniswap.org/#/swap?inputCurrency={tokenIn}&outputCurrency={tokenOut}&exactAmount={amount}&exactField=input&chain={chainName}
```

**Chain mapping:**

- Ethereum: `mainnet`
- Arbitrum: `arbitrum`

## Position Simulation

When users want to preview a swap:

```bash
npx tsx packages/plugins/uniswap-planner/scripts/simulate-swap.ts <chainId> <tokenIn> <tokenOut> <amountIn> [slippage%] [fee]
```

## Liquidity Strategy Scripts

```bash
# Plan a swap strategy
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts <chainId> <tokenIn> <tokenOut> <amount> [goal]

# Plan add liquidity
npx tsx packages/plugins/uniswap-planner/scripts/plan-add-liquidity.ts <chainId> <token0> <token1> <fee> <amount0> [strategy]

# Plan remove liquidity
npx tsx packages/plugins/uniswap-planner/scripts/plan-remove-liquidity.ts <chainId> <positionId>
```

## External Resources

- Uniswap V3 Documentation: https://docs.uniswap.org/
- Uniswap App: https://app.uniswap.org
