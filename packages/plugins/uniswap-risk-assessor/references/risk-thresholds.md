# Risk Thresholds Reference

## Price Impact Thresholds

| Impact | Level | Action |
|--------|-------|--------|
| < 0.1% | Minimal | Proceed normally |
| 0.1% - 0.5% | Low | Standard operation |
| 0.5% - 2% | Moderate | Consider slippage and MEV |
| 2% - 5% | High | Split swap into smaller parts |
| > 5% | Severe | High MEV risk, split aggressively |

## Slippage Tolerance Recommendations

| Scenario | Slippage |
|----------|----------|
| Stablecoin pairs | 0.05% - 0.1% |
| WETH/USDC, major pairs | 0.5% |
| Standard ERC20 pairs | 0.5% - 1% |
| Low-liquidity/volatile | 1% - 3% |
| Emergency (high congestion) | 3% - 5% |

## Pool Liquidity Health

| Total Value Locked | Depth | Large Swap Capacity |
|-------------------|-------|---------------------|
| > $100M | Deep | Millions without major impact |
| $10M - $100M | Moderate | Up to $500K comfortably |
| $1M - $10M | Shallow | Up to $50K comfortably |
| < $1M | Very shallow | Use with caution for > $10K |

## LP Position Risk Levels

| Scenario | Risk Level |
|----------|------------|
| In-range, symmetric range | Low |
| In-range, narrow range | Moderate (high IL risk) |
| Near range boundary | High (may exit range soon) |
| Out of range | High (earning no fees, IL frozen) |
| Price far from entry | High (significant IL if removed) |

## MEV Risk

- Price impact > 2%: Moderate sandwich attack risk
- Price impact > 5%: High sandwich attack risk
- Mitigation: Use private RPC (Flashbots Protect, MEV Blocker)
- Mitigation: Set tight slippage with lower deadline

## Fee APR vs IL Break-Even

To be profitable as an LP, fee APR must exceed IL rate:

```
required_fee_apr > (estimated_IL_per_year)
```

Approximate IL rates by position type:

| Position Type | Est. IL/Year (for 2x price move) |
|---------------|----------------------------------|
| Full range (V2) | ~5-10% |
| Wide range (±200 ticks) | ~10-20% |
| Mid range (±50 ticks) | ~20-50% |
| Narrow range (±10 ticks) | ~50-200%+ |
