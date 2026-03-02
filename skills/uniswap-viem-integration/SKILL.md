---
name: uniswap-viem-integration
description: Foundational EVM integration for Uniswap V3-related scripts using viem. Use when user asks to read balances, read/write contracts, send transactions, simulate contract calls, or set up typed viem clients for Ethereum and Arbitrum with Uniswap V3 contracts.
license: MIT
metadata:
  author: Uniswap AI Contributors
  version: 1.1.0
---

# Uniswap viem Integration

Provide reusable viem patterns for Uniswap V3 skill scripts and custom integrations.

## Scope

- Public client and wallet client setup
- Chain-specific RPC selection (Ethereum / Arbitrum)
- Reading ERC20 balances, decimals, and allowances
- Simulating and sending contract transactions
- Using `simulateContract` for QuoterV2 (view simulation)
- Waiting for receipts and formatting execution output

## Quick Start

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';

// Public client for reading
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL ?? 'https://ethereum.publicnode.com'),
});

// Wallet client for writing
import { privateKeyToAccount } from 'viem/accounts';
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL),
  account,
});
```

## Reading Contracts

```typescript
// Read ERC20 balance
const balance = await publicClient.readContract({
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress],
});

// Read pool slot0 (price and tick)
const slot0 = await publicClient.readContract({
  address: poolAddress,
  abi: poolAbi,
  functionName: 'slot0',
});
```

## Simulating Non-View Calls (QuoterV2)

QuoterV2 `quoteExactInputSingle` is `nonpayable` but used read-only via simulation:

```typescript
const result = await publicClient.simulateContract({
  address: QUOTER_V2_ADDRESS,
  abi: quoterV2Abi,
  functionName: 'quoteExactInputSingle',
  args: [{
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
    amountIn: parseUnits('1000', 6),
    fee: 3000,
    sqrtPriceLimitX96: 0n,
  }],
});
const amountOut = result.result[0]; // bigint
```

## Writing Contracts

```typescript
// Write and wait for receipt
const txHash = await walletClient.writeContract({
  address: SWAP_ROUTER_02,
  abi: swapRouter02Abi,
  functionName: 'exactInputSingle',
  args: [{ tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum, sqrtPriceLimitX96: 0n }],
  account,
});

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
console.log('Status:', receipt.status); // 'success' | 'reverted'
```

## Chain Configuration

```typescript
import { mainnet, arbitrum } from 'viem/chains';

function getChain(chainId: number) {
  if (chainId === 1) return mainnet;
  if (chainId === 42161) return arbitrum;
  throw new Error(`Unsupported chainId: ${chainId}`);
}
```

## References

- `references/clients-and-transports.md`
- `references/contract-read-write.md`
