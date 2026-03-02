# uniswap-ai

Uniswap V3 AI tools (skills, plugins, agents) for developers and AI agents integrating the Uniswap V3 protocol.

## Overview

This monorepo provides a complete suite of AI-ready tools for working with Uniswap V3 on Ethereum and Arbitrum. It includes Claude Code plugins, standalone skills, and TypeScript scripts for interacting with Uniswap V3 contracts.

## Plugins

| Plugin | Description |
|--------|-------------|
| `uniswap-integration` | Direct Uniswap V3 protocol integration for quotes and pool data |
| `uniswap-planner` | Position planning and swap/liquidity strategy generation |
| `uniswap-risk-assessor` | Risk analysis including slippage, price impact, and impermanent loss |
| `uniswap-security-foundations` | Security guidance and audit checklists |
| `uniswap-viem-integration` | EVM blockchain integration using viem |

## Quick Start

```bash
npm install
```

## Scripts

All scripts can be run with:

```bash
npx tsx packages/plugins/<plugin>/scripts/<script>.ts <args>
```

### Examples

```bash
# Get a swap quote
npx tsx packages/plugins/uniswap-integration/scripts/quote-swap.ts 1 USDC WETH 1000

# Get pool data
npx tsx packages/plugins/uniswap-integration/scripts/get-pool-data.ts 1 USDC WETH 3000

# Get token price
npx tsx packages/plugins/uniswap-integration/scripts/get-token-price.ts 1 WETH

# Simulate a swap
npx tsx packages/plugins/uniswap-integration/scripts/simulate-swap.ts 1 USDC WETH 1000 0.5

# Plan a swap
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 1 USDC WETH 1000
```

## Supported Chains

- **Ethereum Mainnet** (chainId: 1)
- **Arbitrum One** (chainId: 42161)

## License

MIT
