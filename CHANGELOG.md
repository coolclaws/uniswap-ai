# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-03

### Added
- **Signer backends** (`lib/signers.ts`): Support for three signing methods:
  - `privateKey` — raw private key via env var (development only)
  - `turnkey` — TEE-backed signing via [Turnkey](https://turnkey.com) (production recommended)
  - `kms` — AWS KMS HSM signing (enterprise)
- **Pre-flight check script** (`scripts/check-signer.ts`): Validates signer configuration before execution. Shows clear setup instructions with exact commands if misconfigured.
- **MCP Server** (`packages/mcp/uniswap-mcp`): Full Model Context Protocol server with 6 tools:
  - `get_pool_data`, `quote_swap`, `get_token_price`, `simulate_swap`, `plan_swap`, `assess_risk`
- **GitHub Actions workflows**:
  - `ci.yml` — lint and build on every push/PR
  - `publish-mcp.yml` — auto-publish `@uniswap-ai/mcp` to npm on tag push

### Changed
- `SKILL.md` files updated with **Pre-flight Check** section — AI agents must run `check-signer.ts` before any execution script
- `README.md` — reorganized: Skills first, MCP in advanced section; added full **Signing & Key Management** guide with comparison table
- `lib/clients.ts` — now re-exports signer utilities for single import point

### How to update
```bash
npx skills add coolclaws/uniswap-ai
```

---

## [1.0.0] - 2026-03-03

### Added
- Initial release
- 5 plugins: `uniswap-integration`, `uniswap-planner`, `uniswap-risk-assessor`, `uniswap-security-foundations`, `uniswap-viem-integration`
- 5 standalone skills mirroring all plugins
- Real viem contract calls for Ethereum mainnet and Arbitrum One
- Scripts: `quote-swap`, `quote-liquidity`, `get-pool-data`, `get-token-price`, `simulate-swap`, `plan-swap`, `plan-add-liquidity`, `plan-remove-liquidity`
- Claude Code Marketplace integration (`marketplace.json`, `plugin.json`)
- Support for `npx skills add coolclaws/uniswap-ai`
