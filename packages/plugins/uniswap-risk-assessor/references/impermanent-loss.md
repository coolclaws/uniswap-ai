# Impermanent Loss Reference

## What is Impermanent Loss?

Impermanent Loss (IL) occurs when the price ratio of tokens in a liquidity pool changes after you deposit. It represents the difference in value between holding tokens vs providing liquidity.

## Formula

```
IL = 2√(price_ratio) / (1 + price_ratio) - 1
```

Where `price_ratio = current_price / entry_price`

## IL Table

| Price Ratio | IL % |
|-------------|------|
| 0.25x (down 75%) | -20.0% |
| 0.50x (down 50%) | -5.7% |
| 0.75x (down 25%) | -0.6% |
| 1.00x (unchanged) | 0.0% |
| 1.25x (up 25%) | -0.6% |
| 1.50x (up 50%) | -2.0% |
| 2.00x (up 100%) | -5.7% |
| 3.00x (up 200%) | -13.4% |
| 4.00x (up 300%) | -20.0% |
| 5.00x (up 400%) | -25.5% |

## IL in Uniswap V3 Concentrated Positions

Concentrated liquidity amplifies both fees and IL:

- A position with 10x concentration experiences ~√10 ≈ 3.16x more fee income
- But also ~3.16x more IL when price moves within range
- When price exits the range, IL freezes (no more active IL accrual)

## When IL is Realized

IL becomes "permanent" (realized) when you:

1. Remove liquidity and the price has changed
2. Price exits the range and you remove liquidity

IL is only "impermanent" while you hold the position and price may return.

## Mitigating IL

1. **Choose correlated pairs** (USDC/DAI) — minimal IL due to stable ratio
2. **Use wider ranges** — reduces concentration, reduces IL per tick
3. **Focus on high-fee pools** — higher fee income can offset IL
4. **Monitor actively** — rebalance when price approaches range boundaries
5. **Calculate break-even** — ensure estimated fee APR > estimated IL rate
