# Common Uniswap V3 Integration Failures

## 1. Missing Deadline

**Symptom**: Transaction stays pending for hours/days, eventually executes at a bad price.

**Cause**: `deadline` set to `0` or far future timestamp.

**Fix**:

```typescript
const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
```

## 2. Zero Minimum Output

**Symptom**: Sandwich attacked — received far less than expected.

**Cause**: `amountOutMinimum: 0n` or `sqrtPriceLimitX96: 0n` without proper slippage.

**Fix**:

```typescript
const slippageBps = 50n; // 0.5%
const amountOutMinimum = (quotedAmountOut * (10000n - slippageBps)) / 10000n;
```

## 3. Wrong Token Decimals

**Symptom**: Swap amount is 1000x too large or too small.

**Cause**: Hardcoded decimals wrong for the token.

**Fix**: Always read decimals from contract:

```typescript
const decimals = await client.readContract({ abi: erc20Abi, functionName: 'decimals' });
```

## 4. Tick Not Aligned to Spacing

**Symptom**: Transaction reverts with `TLU` or `TLM` error.

**Cause**: tickLower or tickUpper not aligned to pool's tickSpacing.

**Fix**:

```typescript
function nearestUsableTick(tick: number, tickSpacing: number): number {
  return Math.round(tick / tickSpacing) * tickSpacing;
}
```

## 5. Pool Not Found

**Symptom**: Transaction reverts or quote returns 0.

**Cause**: Pool doesn't exist at the specified fee tier.

**Fix**: Check pool existence before quoting:

```typescript
const poolAddress = await factory.getPool(tokenA, tokenB, fee);
if (poolAddress === '0x000...000') throw new Error('Pool does not exist');
```

## 6. Insufficient Allowance

**Symptom**: Transaction reverts with ERC20 allowance error.

**Cause**: Forgot to approve tokens before swap.

**Fix**: Always approve before swapping:

```typescript
await approve(SWAP_ROUTER_02, amountIn);
```

## 7. Stale Quote

**Symptom**: Slippage error on execution despite seeming acceptable quote.

**Cause**: Price moved between quote and execution.

**Fix**: Re-quote immediately before execution, set tight deadline.

## 8. Burning Position Without Collecting Fees

**Symptom**: Fees lost permanently.

**Cause**: Calling `burn()` before `collect()`.

**Fix**: Always call `collect()` before `burn()`.
