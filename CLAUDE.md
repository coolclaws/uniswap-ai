# CLAUDE.md - Uniswap AI Project Guidelines

## Overview

This is the **uniswap-ai** monorepo providing Uniswap V3-specific AI tools (skills, plugins, agents) for developers and AI agents integrating the Uniswap V3 protocol ecosystem.

## Core Requirements

### Nx Usage

- **REQUIREMENT**: Use Nx for ALL packages and tooling in this monorepo
- Every package must be an Nx project with proper configuration
- Use Nx generators, executors, and workspace features wherever possible
- Leverage Nx's dependency graph and caching capabilities

### Package Structure

- All packages must be properly configured Nx libraries or applications
- Use Nx's project.json for configuration
- Follow Nx best practices for monorepo organization

### Development Workflow

- Use Nx commands for all operations (build, test, lint, etc.)
- Maintain proper inter-package dependencies through Nx
- Ensure all packages are part of the Nx workspace graph

### Code Quality Enforcement

After making any code changes, Claude Code MUST:

1. **Format the code**: Run `npx nx format:write --uncommitted` to format all uncommitted files
2. **Lint the code**: Run `npx nx affected --target=lint --base=HEAD~1` to check for linting errors
3. **Typecheck the code**: Run `npx nx affected --target=typecheck --base=HEAD~1` to typecheck affected projects
4. **Lint markdown files**: Run `npm exec markdownlint-cli2 -- --fix "**/*.md"`

## Package Scopes

| Type    | Scope         | npm | Marketplace                   |
|---------|---------------|-----|-------------------------------|
| Plugins | `@uniswap-ai` | No  | Yes (Claude Code Marketplace) |

## Repository Structure

```text
uniswap-ai/
├── .github/
│   ├── workflows/           # CI/CD workflows
│   └── actions/             # Reusable composite actions
├── .claude-plugin/
│   └── marketplace.json     # Claude Code marketplace config
├── .claude/
│   └── rules/               # Agent rules (agnostic design)
├── packages/
│   └── plugins/             # Claude Code plugins
│       ├── uniswap-integration/       # Direct protocol integration
│       ├── uniswap-planner/           # Position planning
│       ├── uniswap-risk-assessor/     # Risk analysis
│       ├── uniswap-security-foundations/  # Security guidance
│       └── uniswap-viem-integration/  # EVM blockchain integration
├── skills/                  # Standalone installable skills
├── scripts/                 # Build/validation scripts
├── nx.json
├── package.json
├── tsconfig.base.json
├── CLAUDE.md                # This file
├── AGENTS.md -> CLAUDE.md   # Symlink for agent-agnostic access
├── LICENSE                  # MIT
└── README.md
```

### Plugin Architecture

Plugins are stored in `./packages/plugins/<plugin-name>/`:

- Each plugin is a self-contained Nx package with `package.json`, `project.json`, and `.claude-plugin/plugin.json`
- The `.claude-plugin/marketplace.json` references plugins via relative paths

### Plugin Versioning

All plugins follow semantic versioning (semver):

- **Patch (1.0.X)**: Bug fixes, minor documentation updates
- **Minor (1.X.0)**: New skills, agents, or commands (backward compatible)
- **Major (X.0.0)**: Breaking changes, significant restructuring

## Agent-Agnostic Design

All AI tools in this repo should be usable by ANY LLM coding agent, not just Claude Code:

1. **Documentation**: Use AGENTS.md (symlink to CLAUDE.md) as standard
2. **Prompts**: Write prompts that work across models (avoid Claude-specific features unless necessary)
3. **Skills**: Structure skills as markdown that any agent can interpret
4. **No vendor lock-in**: Prefer standards over proprietary features

## npm Version Requirement

**CRITICAL: This project requires npm >=11.7.0**

```bash
npm install -g npm@latest
npm --version  # Should output: 11.7.0 or higher
```

## Nx Guidelines

- When running tasks, always prefer running through `nx` (i.e., `nx run`, `nx run-many`, `nx affected`)

## Skills

Skills are discoverable via the [skills.sh CLI](https://skills.sh) (`npx skills add coolclaws/uniswap-ai`).

### Adding New Skills

1. Create the skill directory in `packages/plugins/<plugin-name>/skills/<skill-name>/`
2. Add a `SKILL.md` file with required frontmatter (`name`, `description`, `license`, `metadata.author`)
3. Add the skill to the plugin's `plugin.json` `skills` array

### Publishing

Merging to main = publishing to skills.sh. The CLI fetches directly from the repo's default branch. No separate publish step is required.

## Contract Addresses

### Ethereum Mainnet (chainId: 1)

| Contract | Address |
|----------|---------|
| UniswapV3Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |
| SwapRouter02 | `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45` |
| QuoterV2 | `0x61fFE014bA17989E743c5F6cB21bF9697530B21e` |
| NonfungiblePositionManager | `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` |

### Arbitrum One (chainId: 42161)

| Contract | Address |
|----------|---------|
| UniswapV3Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |
| SwapRouter02 | `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45` |
| QuoterV2 | `0x61fFE014bA17989E743c5F6cB21bF9697530B21e` |
| NonfungiblePositionManager | `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` |
