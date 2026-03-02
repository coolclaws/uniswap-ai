---
name: uniswap-risk-assessor
description: This skill should be used when the user asks about "price impact", "slippage risk", "impermanent loss", "IL calculation", "uniswap risk", "liquidity position risk", "out of range position", "fee earnings vs IL", or wants to assess the risk of their Uniswap V3 swap or LP position. Calculates price impact, slippage tolerance, impermanent loss for LP positions, and provides risk level assessments.
license: MIT
metadata:
  author: Uniswap AI Contributors
  version: 1.1.0
---

# Uniswap V3 Risk Assessor

Assess risk metrics for Uniswap V3 swaps and liquidity positions.

> **Runtime Compatibility:** This skill uses interactive prompts. If `AskUserQuestion` is not available, collect parameters through natural language conversation.

## Overview

Calculate and interpret risk metrics for Uniswap V3 operations:

1. **Price Impact** - Effect of swap on pool price
2. **Slippage Risk** - Actual vs expected output
3. **Impermanent Loss (IL)** - Value loss for LP vs holding
4. **Position Status** - In-range vs out-of-range assessment
5. **Fee APR vs IL** - Whether fee income offsets impermanent loss

## Trigger Phrases

- "price impact"
- "slippage risk"
- "impermanent loss"
- "IL calculation"
- "uniswap risk"
- "liquidity position risk"
- "out of range position"
- "fee earnings vs IL"

## Risk Metrics

### Price Impact

Price impact is the effect a swap has on the pool price:

```
priceImpact = |priceAfter - priceBefore| / priceBefore × 100
```

| Price Impact | Risk Level | Recommendation |
|-------------|------------|----------------|
| < 0.1% | Minimal | Safe to proceed |
| 0.1% - 0.5% | Low | Normal for most swaps |
| 0.5% - 2% | Moderate | Consider splitting swap |
| 2% - 5% | High | Split swap or wait for more liquidity |
| > 5% | Severe | High likelihood of MEV sandwich attack |

### Slippage Tolerance

Recommended slippage settings by pair type:

| Pair Type | Recommended Slippage |
|-----------|---------------------|
| Stablecoin-Stablecoin | 0.05% - 0.1% |
| Blue-chip pairs (WETH/USDC) | 0.5% |
| Standard pairs | 0.5% - 1% |
| Volatile/exotic pairs | 1% - 3% |

### Impermanent Loss Calculation

```typescript
function calculateIL(priceRatio: number): number {
  // priceRatio = currentPrice / entryPrice
  const sqrtRatio = Math.sqrt(priceRatio);
  const ilFactor = (2 * sqrtRatio / (1 + priceRatio)) - 1;
  return ilFactor * 100; // as percentage
}
```

| Price Change | IL (V2/Full Range) |
|-------------|-------------------|
| +25% | -0.6% |
| +50% | -2.0% |
| +100% (2x) | -5.7% |
| +200% (3x) | -13.4% |
| +300% (4x) | -20.0% |
| -25% | -0.6% |
| -50% | -5.7% |

For **concentrated liquidity** (Uniswap V3), IL is amplified within the position range and capped when price leaves the range.

## Risk Assessment Interface

```typescript
interface SwapRiskAssessment {
  priceImpact: string;          // e.g. "0.42%"
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'severe';
  recommendation: string;
  slippageTolerance: string;    // recommended setting
  mevRisk: boolean;             // true if high sandwich attack risk
}

interface LiquidityRiskAssessment {
  currentPrice: string;
  entryPrice: string;
  priceLower: string;
  priceUpper: string;
  inRange: boolean;
  impermanentLoss: string;      // estimated IL percentage
  feesEarned: string;           // estimated fee APR
  netReturn: string;            // fees - IL estimate
  riskLevel: 'low' | 'moderate' | 'high';
}
```

## Workflow

### Swap Risk Assessment

1. Get wallet address and swap parameters (tokenIn, tokenOut, amount, chainId)
2. Run `simulate-swap.ts` to get price impact
3. Evaluate risk level based on price impact thresholds
4. Recommend appropriate slippage tolerance
5. Warn if MEV risk is elevated (price impact > 2%)

### LP Position Risk Assessment

1. Get token pair, fee tier, price range, and entry price
2. Calculate current impermanent loss vs entry price
3. Estimate fee APR based on pool volume
4. Compare fee earnings vs IL to determine profitability
5. Assess out-of-range risk based on price volatility

## Impermanent Loss for Concentrated Positions

For Uniswap V3 concentrated liquidity, IL is only active when the price is within range:

- **Price in range**: IL accumulates (amplified vs V2 due to concentration)
- **Price out of range**: Position becomes 100% one token, IL stops
- **Higher concentration** = higher potential fees AND higher IL exposure

## References

- `references/impermanent-loss.md` - IL calculation details
- `references/risk-thresholds.md` - Risk parameter thresholds
