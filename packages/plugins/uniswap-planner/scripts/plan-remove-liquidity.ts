#!/usr/bin/env ts-node
/**
 * Uniswap V3 Remove Liquidity Planner
 *
 * Plans a remove liquidity operation for an existing position.
 *
 * Usage:
 *   npx tsx scripts/plan-remove-liquidity.ts <chainId> <positionId> [percentToRemove]
 *
 * Examples:
 *   npx tsx scripts/plan-remove-liquidity.ts 1 12345 100
 *   npx tsx scripts/plan-remove-liquidity.ts 42161 6789 50
 */

import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';

const NONFUNGIBLE_POSITION_MANAGER: Record<number, `0x${string}`> = {
  1: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  42161: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
};

const NPM_ABI = [
  {
    name: 'positions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const;

function getRpcUrl(chainId: number): string {
  const envVar = chainId === 1 ? 'ETHEREUM_RPC_URL' : 'ARBITRUM_RPC_URL';
  const defaultRpc = chainId === 1 ? 'https://ethereum.publicnode.com' : 'https://arbitrum.publicnode.com';
  return process.env[envVar] || defaultRpc;
}

export async function planRemoveLiquidity(
  chainId: number,
  positionId: number,
  percentToRemove: number = 100
) {
  const client = createPublicClient({
    chain: chainId === 1 ? mainnet : arbitrum,
    transport: http(getRpcUrl(chainId)),
  });

  const npmAddress = NONFUNGIBLE_POSITION_MANAGER[chainId];

  const position = (await client.readContract({
    address: npmAddress,
    abi: NPM_ABI,
    functionName: 'positions',
    args: [BigInt(positionId)],
  })) as readonly [bigint, string, string, string, number, number, number, bigint, bigint, bigint, bigint, bigint];

  const [, , token0Addr, token1Addr, fee, tickLower, tickUpper, liquidity, , , tokensOwed0, tokensOwed1] = position;

  const [symbol0, symbol1] = await Promise.all([
    client.readContract({ address: token0Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }),
    client.readContract({ address: token1Addr as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }),
  ]);

  const liquidityToRemove = (liquidity * BigInt(percentToRemove)) / 100n;

  return {
    positionId,
    chainId,
    token0: { address: token0Addr, symbol: symbol0 as string },
    token1: { address: token1Addr, symbol: symbol1 as string },
    fee,
    feeTierLabel: `${fee / 10000}%`,
    tickLower,
    tickUpper,
    currentLiquidity: liquidity.toString(),
    liquidityToRemove: liquidityToRemove.toString(),
    percentToRemove,
    accruedFees: {
      token0: tokensOwed0.toString(),
      token1: tokensOwed1.toString(),
    },
    steps: [
      `1. Call decreaseLiquidity() on NonfungiblePositionManager with:`,
      `   - tokenId: ${positionId}`,
      `   - liquidity: ${liquidityToRemove.toString()}`,
      `   - amount0Min: 0 (set appropriate slippage)`,
      `   - amount1Min: 0 (set appropriate slippage)`,
      `   - deadline: <current_timestamp + 1200>`,
      `2. Call collect() to withdraw tokens and fees:`,
      `   - tokenId: ${positionId}`,
      `   - recipient: <your_address>`,
      `   - amount0Max: 340282366920938463463374607431768211455 (max uint128)`,
      `   - amount1Max: 340282366920938463463374607431768211455 (max uint128)`,
      percentToRemove === 100 ? `3. Call burn() to destroy the NFT position token` : '',
    ].filter(Boolean),
    safetyChecks: [
      'Ensure you own the position NFT',
      'Set appropriate slippage for amount0Min and amount1Min',
      'Collect all fees before burning the position',
      'Set deadline appropriately (recommended: 20 minutes)',
    ],
  };
}

async function main() {
  const [chainIdStr, positionIdStr, percentStr] = process.argv.slice(2);

  if (!chainIdStr || !positionIdStr) {
    console.error(
      'Usage: npx tsx scripts/plan-remove-liquidity.ts <chainId> <positionId> [percentToRemove]'
    );
    process.exit(1);
  }

  const chainId = parseInt(chainIdStr, 10);
  const positionId = parseInt(positionIdStr, 10);
  const percent = percentStr ? parseInt(percentStr, 10) : 100;

  if (![1, 42161].includes(chainId)) {
    console.error('Unsupported chainId. Use 1 (Ethereum) or 42161 (Arbitrum)');
    process.exit(1);
  }

  const plan = await planRemoveLiquidity(chainId, positionId, percent);
  console.log(JSON.stringify(plan, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
