---
name: uniswap-security-foundations
description: Security baseline for Uniswap V3 integration and execution scripts. Use when user asks for Uniswap security review, pre-swap checks, MEV protection, allowance minimization, deadline enforcement, reentrancy prevention, or execution hardening for Uniswap V3 swaps and liquidity operations.
license: MIT
metadata:
  author: Uniswap AI Contributors
  version: 1.1.0
---

# Uniswap V3 Security Foundations

Security-first checklist for Uniswap V3 script development and operations.

## Threat Areas

- **Over-approval risk**: Unlimited ERC20 approvals to SwapRouter expose wallet funds.
- **MEV/Sandwich attacks**: High price impact swaps are profitable to sandwich.
- **Stale quotes**: QuoterV2 results may be outdated by execution time.
- **Deadline omission**: No deadline allows miners to hold transactions for favorable conditions.
- **Tick manipulation**: Incorrect tick math can create unexpected liquidity positions.
- **Token sorting**: Uniswap V3 requires token0 < token1 by address.
- **Slippage bypass**: Setting amountOutMinimum = 0 loses MEV protection.
- **Reentrancy**: Untested callback paths in custom integrations.

## Required Pre-Execution Checks

### For Swaps

1. Validate chain/token/amount format.
2. Verify pool exists at the selected fee tier.
3. Read pool liquidity — reject if pool is empty.
4. Calculate price impact — warn if > 2%, reject if > 10%.
5. Set non-zero `amountOutMinimum` based on slippage tolerance.
6. Set `deadline` = `block.timestamp + 1200` (20 minutes max).
7. Approve exact amount only (not unlimited) unless using permit2.
8. Check token balance ≥ amountIn before sending transaction.

### For Liquidity Operations

1. Sort tokens: token0 address < token1 address.
2. Verify tick alignment with pool tick spacing.
3. Ensure tickLower < tickUpper.
4. Set `amount0Min` and `amount1Min` (not zero) for slippage protection.
5. Verify position ownership before decreaseLiquidity/collect/burn.
6. Collect accrued fees before burning a position.

## Approval Best Practices

```typescript
// ❌ Bad: Unlimited approval
await approve(SWAP_ROUTER_02, MaxUint256);

// ✅ Good: Exact amount approval
await approve(SWAP_ROUTER_02, amountIn);

// ✅ Better: Use Permit2 for flexible, expiring approvals
// Permit2: 0x000000000022D473030F116dDEE9F6B43aC78BA3
```

## MEV Protection

1. Use private RPC for high-value swaps:
   - Flashbots Protect: `https://rpc.flashbots.net`
   - MEV Blocker: `https://rpc.mevblocker.io`
2. Set tight slippage (reduces MEV profit margin).
3. Keep transaction deadlines short (< 30 minutes).
4. Split large swaps into smaller transactions.

## Common Security Failures

See `references/common-failures.md` for documented vulnerability patterns.

## Audit Checklist

See `references/audit-checklist.md` for complete pre-deployment checklist.

## References

- `references/audit-checklist.md`
- `references/common-failures.md`
