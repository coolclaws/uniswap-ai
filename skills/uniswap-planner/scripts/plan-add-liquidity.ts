#!/usr/bin/env ts-node
/**
 * Uniswap V3 Add Liquidity Planner
 *
 * Plans an add liquidity operation with range recommendations.
 *
 * Usage:
 *   npx tsx scripts/plan-add-liquidity.ts <chainId> <token0> <token1> <fee> <amount0> [strategy]
 *
 * Strategies: narrow | mid | wide | full
 *
 * Examples:
 *   npx tsx scripts/plan-add-liquidity.ts 1 USDC WETH 3000 1000 mid
 *   npx tsx scripts/plan-add-liquidity.ts 42161 WETH USDC 500 1 wide
 */

import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';

type LiquidityStrategy = 'narrow' | 'mid' | 'wide' | 'full';

const FACTORY_ADDRESS: Record<number, `0x${string}`> = {
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  42161: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
};

const TOKENS: Record<number, Record<string, { address: `0x${string}`; decimals: number }>> = {
  1: {
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  },
  42161: {
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    WBTC: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
  },
};

const FACTORY_ABI = [
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const POOL_ABI = [
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
] as const;

function getRpcUrl(chainId: number): string {
  const envVar = chainId === 1 ? 'ETHEREUM_RPC_URL' : 'ARBITRUM_RPC_URL';
  const defaultRpc = chainId === 1 ? 'https://ethereum.publicnode.com' : 'https://arbitrum.publicnode.com';
  return process.env[envVar] || defaultRpc;
}

function getTickSpacing(fee: number): number {
  const spacings: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };
  return spacings[fee] ?? 60;
}

function nearestUsableTick(tick: number, tickSpacing: number): number {
  return Math.round(tick / tickSpacing) * tickSpacing;
}

function getStrategyRange(strategy: LiquidityStrategy, currentTick: number, tickSpacing: number) {
  switch (strategy) {
    case 'narrow':
      return {
        tickLower: nearestUsableTick(currentTick - tickSpacing * 10, tickSpacing),
        tickUpper: nearestUsableTick(currentTick + tickSpacing * 10, tickSpacing),
        description: 'Narrow range: ±~10 ticks. High capital efficiency but requires frequent rebalancing.',
      };
    case 'mid':
      return {
        tickLower: nearestUsableTick(currentTick - tickSpacing * 50, tickSpacing),
        tickUpper: nearestUsableTick(currentTick + tickSpacing * 50, tickSpacing),
        description: 'Mid range: ±~50 ticks. Good balance of efficiency and durability.',
      };
    case 'wide':
      return {
        tickLower: nearestUsableTick(currentTick - tickSpacing * 200, tickSpacing),
        tickUpper: nearestUsableTick(currentTick + tickSpacing * 200, tickSpacing),
        description: 'Wide range: ±~200 ticks. Lower capital efficiency but more passive.',
      };
    case 'full':
      return {
        tickLower: nearestUsableTick(-887272, tickSpacing),
        tickUpper: nearestUsableTick(887272, tickSpacing),
        description: 'Full range: entire price spectrum. Equivalent to Uniswap V2 LPing.',
      };
  }
}

export async function planAddLiquidity(params: {
  chainId: number;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  amount0: string;
  strategy: LiquidityStrategy;
}) {
  const { chainId, token0Symbol, token1Symbol, fee, amount0, strategy } = params;
  const tokens = TOKENS[chainId];

  const token0Info = tokens[token0Symbol.toUpperCase()];
  const token1Info = tokens[token1Symbol.toUpperCase()];

  if (!token0Info) throw new Error(`Unknown token0: ${token0Symbol}`);
  if (!token1Info) throw new Error(`Unknown token1: ${token1Symbol}`);

  const client = createPublicClient({
    chain: chainId === 1 ? mainnet : arbitrum,
    transport: http(getRpcUrl(chainId)),
  });

  const factoryAddress = FACTORY_ADDRESS[chainId];
  const poolAddress = (await client.readContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [token0Info.address, token1Info.address, fee],
  })) as `0x${string}`;

  if (poolAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`No pool found for ${token0Symbol}/${token1Symbol} at fee ${fee}`);
  }

  const slot0 = (await client.readContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'slot0',
  })) as readonly [bigint, number, number, number, number, number, boolean];

  const currentSqrtPriceX96 = slot0[0];
  const currentTick = slot0[1];
  const tickSpacing = getTickSpacing(fee);

  const range = getStrategyRange(strategy, currentTick, tickSpacing);

  const currentPrice = (Number(currentSqrtPriceX96) / 2 ** 96) ** 2 * 10 ** (token0Info.decimals - token1Info.decimals);
  const priceLower = Math.pow(1.0001, range.tickLower) * 10 ** (token0Info.decimals - token1Info.decimals);
  const priceUpper = Math.pow(1.0001, range.tickUpper) * 10 ** (token0Info.decimals - token1Info.decimals);

  return {
    strategy,
    chainId,
    token0: token0Symbol.toUpperCase(),
    token1: token1Symbol.toUpperCase(),
    fee,
    feeTierLabel: `${fee / 10000}%`,
    poolAddress,
    amount0Input: amount0,
    currentTick,
    currentPrice: currentPrice.toFixed(8),
    range: {
      tickLower: range.tickLower,
      tickUpper: range.tickUpper,
      priceLower: priceLower.toFixed(8),
      priceUpper: priceUpper.toFixed(8),
      description: range.description,
    },
    steps: [
      `1. Approve ${token0Symbol} spend on NonfungiblePositionManager`,
      `2. Approve ${token1Symbol} spend on NonfungiblePositionManager`,
      `3. Call mint() on NonfungiblePositionManager with:`,
      `   - token0: ${token0Info.address}`,
      `   - token1: ${token1Info.address}`,
      `   - fee: ${fee}`,
      `   - tickLower: ${range.tickLower}`,
      `   - tickUpper: ${range.tickUpper}`,
      `   - amount0Desired: ${parseUnits(amount0, token0Info.decimals).toString()}`,
      `   - deadline: <current_timestamp + 1200>`,
    ],
    deepLink: `https://app.uniswap.org/#/add/${token0Info.address}/${token1Info.address}/${fee}`,
    safetyChecks: [
      'Verify tick range is valid (tickLower < tickUpper)',
      'Ensure both token approvals are set before minting',
      'Set deadline appropriately (recommended: 20 minutes)',
      'Monitor position health and rebalance as needed',
    ],
  };
}

async function main() {
  const [chainIdStr, token0, token1, feeStr, amount0, strategyStr] = process.argv.slice(2);

  if (!chainIdStr || !token0 || !token1 || !feeStr || !amount0) {
    console.error(
      'Usage: npx tsx scripts/plan-add-liquidity.ts <chainId> <token0> <token1> <fee> <amount0> [strategy]'
    );
    console.error('Strategies: narrow | mid | wide | full');
    process.exit(1);
  }

  const chainId = parseInt(chainIdStr, 10);
  const fee = parseInt(feeStr, 10);
  const strategy = (strategyStr || 'mid') as LiquidityStrategy;

  if (![1, 42161].includes(chainId)) {
    console.error('Unsupported chainId. Use 1 (Ethereum) or 42161 (Arbitrum)');
    process.exit(1);
  }

  const plan = await planAddLiquidity({ chainId, token0Symbol: token0, token1Symbol: token1, fee, amount0, strategy });
  console.log(JSON.stringify(plan, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
