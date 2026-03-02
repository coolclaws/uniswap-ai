# uniswap-planner

Position planning and strategy optimization for Uniswap V3 swaps and liquidity.

## Overview

This plugin helps plan Uniswap V3 operations by:

- Selecting optimal fee tiers based on pool liquidity
- Recommending price ranges for liquidity positions
- Generating step-by-step execution plans
- Producing deep links to the Uniswap app

## Scripts

```bash
# Plan a swap with goal-based strategy
npx tsx scripts/plan-swap.ts <chainId> <tokenIn> <tokenOut> <amount> [goal]

# Plan adding liquidity with range recommendation
npx tsx scripts/plan-add-liquidity.ts <chainId> <token0> <token1> <fee> <amount0> [strategy]

# Plan removing a liquidity position
npx tsx scripts/plan-remove-liquidity.ts <chainId> <positionId> [percentToRemove]

# Get swap quote
npx tsx scripts/quote-swap.ts <chainId> <tokenIn> <tokenOut> <amountIn> [fee] [slippage%]

# Simulate swap
npx tsx scripts/simulate-swap.ts <chainId> <tokenIn> <tokenOut> <amountIn> [slippage%] [fee]
```

## Goals and Strategies

### Swap Goals

| Goal | Slippage | Use Case |
|------|----------|----------|
| `conservative` | 0.1% | Low-volatility, small amounts |
| `balanced` | 0.5% | Standard usage |
| `aggressive` | 1.0% | Fast execution, volatile conditions |

### Liquidity Strategies

| Strategy | Range | Capital Efficiency |
|----------|-------|-------------------|
| `narrow` | ±10 ticks | Very high (requires frequent rebalancing) |
| `mid` | ±50 ticks | High (moderate management needed) |
| `wide` | ±200 ticks | Moderate (more passive) |
| `full` | Entire range | Low (Uniswap V2 equivalent) |
