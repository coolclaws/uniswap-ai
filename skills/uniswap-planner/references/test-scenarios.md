# Uniswap V3 Planner Test Scenarios

## Swap Scenarios

### Scenario 1: Small USDC to WETH Swap

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 1 USDC WETH 1000 conservative
```

Expected: Conservative plan with 0.1% slippage, recommends lowest-fee available pool.

### Scenario 2: Large WETH to USDC Swap

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 1 WETH USDC 10 aggressive
```

Expected: Aggressive plan with 1% slippage, may warn about price impact for large amounts.

### Scenario 3: Arbitrum USDC to WETH

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 42161 USDC WETH 5000 balanced
```

## Liquidity Scenarios

### Scenario 4: Add Liquidity - Mid Range

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-add-liquidity.ts 1 USDC WETH 3000 1000 mid
```

Expected: Mid-range ticks centered around current price, moderate capital efficiency.

### Scenario 5: Add Liquidity - Full Range (V2 Style)

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-add-liquidity.ts 1 DAI USDC 500 10000 full
```

Expected: Full tick range, similar to V2, suitable for stablecoin pairs.

### Scenario 6: Remove Partial Liquidity

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-remove-liquidity.ts 1 12345 50
```

Expected: Plan to remove 50% of position liquidity.

## Error Cases

### Unsupported Chain

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 137 USDC WETH 1000
```

Expected: Error "Unsupported chainId. Use 1 (Ethereum) or 42161 (Arbitrum)"

### Unknown Token

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 1 UNKNOWN WETH 1000
```

Expected: Error "Unknown tokenIn: UNKNOWN"

### Non-existent Pool

```bash
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 1 USDT DAI 100
```

Expected: Error about no pool found at that fee tier.
