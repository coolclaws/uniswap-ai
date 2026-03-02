# @uniswap-ai/mcp

MCP (Model Context Protocol) server for Uniswap V3. Exposes 6 tools for reading pool data, getting swap quotes, simulating swaps, and assessing risk — all on Ethereum Mainnet and Arbitrum One.

## Tools

| Tool | Description |
|------|-------------|
| `get_pool_data` | Get Uniswap V3 pool data (liquidity, price, tick) |
| `quote_swap` | Get a swap quote for any token pair |
| `get_token_price` | Get current token price in USD |
| `simulate_swap` | Simulate a swap with slippage and get a deep link |
| `plan_swap` | Full swap plan with risk assessment and execution link |
| `assess_risk` | Assess risk for a swap (price impact, slippage) |

## Setup (Claude Desktop)

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

## Supported Tokens

- WETH, USDC, USDT, WBTC, DAI on both Ethereum (chainId: 1) and Arbitrum (chainId: 42161)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | Public node |
| `ARBITRUM_RPC_URL` | Arbitrum RPC endpoint | Public node |

## Development

```bash
npm install
npm run dev    # Run with tsx
npm run build  # Compile TypeScript
npm start      # Run compiled output
```
