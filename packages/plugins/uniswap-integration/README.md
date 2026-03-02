# uniswap-integration

Direct Uniswap V3 protocol integration for reading on-chain data and executing swaps.

## Overview

This plugin provides low-level access to Uniswap V3 contracts for:

- Fetching swap quotes via QuoterV2
- Reading pool data (price, tick, liquidity)
- Getting token prices from V3 pools
- Calculating liquidity position amounts
- Simulating swaps with price impact analysis

## Supported Chains

- Ethereum Mainnet (chainId: 1)
- Arbitrum One (chainId: 42161)

## Scripts

```bash
# Get a swap quote
npx tsx scripts/quote-swap.ts 1 USDC WETH 1000 3000 0.5

# Get pool data
npx tsx scripts/get-pool-data.ts 1 USDC WETH 3000

# Get token price
npx tsx scripts/get-token-price.ts 1 WETH

# Simulate a swap
npx tsx scripts/simulate-swap.ts 1 USDC WETH 1000 0.5 3000

# Quote liquidity position
npx tsx scripts/quote-liquidity.ts 1 USDC WETH 3000 -887220 887220 1000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | `https://ethereum.publicnode.com` |
| `ARBITRUM_RPC_URL` | Arbitrum RPC endpoint | `https://arbitrum.publicnode.com` |
| `UNISWAP_EXEC_PRIVATE_KEY` | Private key for transaction signing | - |
| `UNISWAP_EXEC_ACCOUNT` | Account address for dry-run mode | - |

## Skills

- `skills/integration` - Core integration skill

## References

- `references/pool-config.md` - Pool mechanics and tick math
- `references/token-address-book.md` - Token addresses by chain
