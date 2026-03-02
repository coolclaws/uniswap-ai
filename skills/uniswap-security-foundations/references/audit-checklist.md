# Uniswap V3 Integration Audit Checklist

## Pre-Deployment Checklist

### Contract Addresses

- [ ] All contract addresses are verified on Etherscan/Arbiscan
- [ ] Using correct SwapRouter02 (not deprecated SwapRouter01)
- [ ] QuoterV2 address verified (not QuoterV1)
- [ ] Factory address correct for the target chain

### Token Handling

- [ ] Token decimals are read from contract (not hardcoded)
- [ ] `parseUnits` / `formatUnits` used with correct decimals
- [ ] token0 < token1 by address for pool creation
- [ ] WETH wrapping handled for ETH swaps

### Swap Security

- [ ] `amountOutMinimum` is non-zero
- [ ] `deadline` is set and not too far in future (< 30 min)
- [ ] Slippage tolerance is reasonable for the pair
- [ ] Price impact checked before execution
- [ ] Token approval set before swap (not unlimited)

### Liquidity Security

- [ ] `tickLower` < `tickUpper` verified
- [ ] Ticks align with pool tick spacing
- [ ] `amount0Min` and `amount1Min` are non-zero
- [ ] Position NFT ownership verified before operations
- [ ] Fees collected before position burn

### RPC & Client

- [ ] Fallback RPC configured (not single point of failure)
- [ ] Network errors handled gracefully
- [ ] Quote staleness checked (re-quote if > 15 seconds old)

### Private Key Handling

- [ ] Private key loaded from env variable (never hardcoded)
- [ ] No private keys in logs or error messages
- [ ] `.env` file in `.gitignore`

### Transaction Execution

- [ ] Gas estimation used before sending
- [ ] Transaction receipt checked for success/failure status
- [ ] Reverted transactions caught and reported with reason
- [ ] Event logs parsed for confirmation

## Known Vulnerable Patterns

1. `amountOutMinimum: 0n` — never do this
2. `deadline: 0n` — never do this  
3. `approve(spender, MaxUint256)` — avoid unlimited approvals
4. Not checking pool existence before quote
5. Using stale quote prices without re-validation
