# uniswap-ai

Uniswap V3 AI tools (skills, plugins) for developers and AI agents integrating the Uniswap V3 protocol on Ethereum and Arbitrum.

## Skills & Plugins

| Name | Description |
|------|-------------|
| `uniswap-integration` | Direct Uniswap V3 protocol integration — read pool data, get quotes, simulate swaps |
| `uniswap-planner` | Position planning and strategy generation for swaps and liquidity |
| `uniswap-risk-assessor` | Risk analysis: slippage, price impact, impermanent loss |
| `uniswap-security-foundations` | Security guidance, MEV protection, and audit checklists |
| `uniswap-viem-integration` | EVM integration using viem for Ethereum and Arbitrum |

## Installation

### Claude Code — Plugin Marketplace

```bash
# Add the marketplace
/plugin marketplace add coolclaws/uniswap-ai

# Install individual plugins
/plugin install uniswap-integration
/plugin install uniswap-planner
/plugin install uniswap-risk-assessor
/plugin install uniswap-security-foundations
/plugin install uniswap-viem-integration
```

### Via npx skills (Universal — works with any agent)

```bash
# Install all skills
npx skills add coolclaws/uniswap-ai

# Install specific skills
npx skills add coolclaws/uniswap-ai --skill uniswap-integration
npx skills add coolclaws/uniswap-ai --skill uniswap-planner
npx skills add coolclaws/uniswap-ai --skill uniswap-risk-assessor
npx skills add coolclaws/uniswap-ai --skill uniswap-security-foundations
npx skills add coolclaws/uniswap-ai --skill uniswap-viem-integration
```

## Usage in Claude

Once installed, Claude will automatically use the appropriate skill based on your intent:

- **"Get a swap quote for 1000 USDC to WETH on Ethereum"** → `uniswap-integration`
- **"Plan a swap strategy for USDC → WETH with 0.5% slippage"** → `uniswap-planner`
- **"What's the risk of swapping 50,000 USDC in the USDC/WETH pool?"** → `uniswap-risk-assessor`
- **"Review security checklist before executing this swap"** → `uniswap-security-foundations`
- **"Set up a viem client for Uniswap on Arbitrum"** → `uniswap-viem-integration`

## Supported Chains

- **Ethereum Mainnet** (chainId: 1)
- **Arbitrum One** (chainId: 42161)

## Scripts (Direct CLI Usage)

All scripts can be run directly with `npx tsx`:

```bash
# Get a swap quote (chainId, tokenIn, tokenOut, amountIn)
npx tsx packages/plugins/uniswap-integration/scripts/quote-swap.ts 1 USDC WETH 1000

# Get pool data (chainId, token0, token1, fee)
npx tsx packages/plugins/uniswap-integration/scripts/get-pool-data.ts 1 USDC WETH 3000

# Get token price
npx tsx packages/plugins/uniswap-integration/scripts/get-token-price.ts 1 WETH

# Simulate a swap with slippage (chainId, tokenIn, tokenOut, amountIn, slippage%)
npx tsx packages/plugins/uniswap-integration/scripts/simulate-swap.ts 1 USDC WETH 1000 0.5

# Plan a swap
npx tsx packages/plugins/uniswap-planner/scripts/plan-swap.ts 1 USDC WETH 1000
```

## Signing & Key Management

Execution scripts support three signer backends. Choose based on your security requirements.

### Option 1: Private Key (Development only)

> ⚠️ Never use raw private keys in production.

```bash
export UNISWAP_EXEC_PRIVATE_KEY=0x...
npx tsx scripts/simulate-swap.ts --chainId 1 --tokenIn USDC --tokenOut WETH --amountIn 1000
```

Or pass inline:
```bash
npx tsx scripts/simulate-swap.ts --chainId 1 --tokenIn USDC --tokenOut WETH --amountIn 1000 --privateKey 0x...
```

### Option 2: Turnkey (Production recommended)

[Turnkey](https://turnkey.com) stores private keys in TEE (Trusted Execution Environments) — even Turnkey cannot access your keys.

```bash
export UNISWAP_SIGNER_TYPE=turnkey
export TURNKEY_API_PUBLIC_KEY=...
export TURNKEY_API_PRIVATE_KEY=...
export TURNKEY_ORGANIZATION_ID=...
export TURNKEY_WALLET_ADDRESS=0x...   # on-chain address managed by Turnkey

npm install @turnkey/sdk-server @turnkey/viem
npx tsx scripts/simulate-swap.ts --chainId 1 --tokenIn USDC --tokenOut WETH --amountIn 1000
```

Get your Turnkey credentials at https://app.turnkey.com

### Option 3: AWS KMS (Enterprise)

AWS KMS uses hardware security modules (HSMs) where the private key never leaves AWS infrastructure.

```bash
export UNISWAP_SIGNER_TYPE=kms
export AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789:key/your-key-id
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...

npm install @aws-sdk/client-kms
npx tsx scripts/simulate-swap.ts --chainId 1 --tokenIn USDC --tokenOut WETH --amountIn 1000
```

> KMS key must be of type `ECC_SECG_P256K1` (secp256k1 — Ethereum compatible).

### Signer comparison

| | Private Key | Turnkey | AWS KMS |
|--|-------------|---------|---------|
| Security | ⚠️ Low | ✅ High (TEE) | ✅ High (HSM) |
| Key custody | You hold it | Non-custodial TEE | AWS HSM |
| Setup | Instant | Minutes | Hours |
| Cost | Free | Usage-based | AWS pricing |
| Best for | Local dev | Production apps | Enterprise |
| Audit | — | Trail of Bits, Zellic | SOC 2, FedRAMP |

### Other environment variables

```bash
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY   # optional, has public fallback
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY   # optional, has public fallback
UNISWAP_EXEC_ACCOUNT=0x...   # read-only address for dry-run (no signing needed)
```

---

## MCP Server

For developers who want to use uniswap-ai as an MCP server with Claude Desktop, Cursor, or any MCP-compatible client. The server runs **locally on your machine** — no deployment needed.

### Setup (Claude Desktop)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uniswap": {
      "command": "npx",
      "args": ["-y", "@uniswap-ai/mcp"],
      "env": {
        "ETHEREUM_RPC_URL": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
        "ARBITRUM_RPC_URL": "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY"
      }
    }
  }
}
```

### Setup (Cursor / other MCP clients)

```json
{
  "mcpServers": {
    "uniswap": {
      "command": "npx",
      "args": ["-y", "@uniswap-ai/mcp"]
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `get_pool_data` | Get Uniswap V3 pool data (liquidity, price, tick) |
| `quote_swap` | Get a swap quote for any token pair |
| `get_token_price` | Get current token price in USD |
| `simulate_swap` | Simulate a swap with slippage and get deep link |
| `plan_swap` | Full swap plan with risk assessment and execution link |
| `assess_risk` | Assess risk for a swap (price impact, slippage) |

### Example Usage in Claude

Once configured, you can ask Claude:
- "What's the current WETH price on Ethereum?"
- "Get me a quote for swapping 1000 USDC to WETH"
- "Plan a swap of 5000 USDC to WBTC on Arbitrum with 1% slippage"
- "Is it safe to swap 100,000 USDC for WETH right now?"

### Publishing to npm

When you're ready to publish `@uniswap-ai/mcp`:

1. Add your npm token to GitHub repo secrets: `Settings → Secrets → New → NPM_TOKEN`
2. Tag and push:
```bash
git tag mcp-v0.1.0
git push origin mcp-v0.1.0
```
GitHub Actions will automatically build and publish to npm.

---

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Lint all packages
npm run lint

# Format code
npm run format
```

## License

MIT
