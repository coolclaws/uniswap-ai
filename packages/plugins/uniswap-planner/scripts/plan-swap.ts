#!/usr/bin/env ts-node
/**
 * Uniswap V3 Swap Planner
 *
 * Plans the optimal swap strategy including fee tier selection.
 *
 * Usage:
 *   npx tsx scripts/plan-swap.ts <chainId> <tokenIn> <tokenOut> <amount> [goal]
 *
 * Goals: conservative | balanced | aggressive
 *
 * Examples:
 *   npx tsx scripts/plan-swap.ts 1 USDC WETH 1000 balanced
 *   npx tsx scripts/plan-swap.ts 42161 WETH USDC 1 conservative
 */

import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';

type SwapGoal = 'conservative' | 'balanced' | 'aggressive';

const QUOTER_V2_ADDRESS: Record<number, `0x${string}`> = {
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
};

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

const QUOTER_V2_ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

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

function getRpcUrl(chainId: number): string {
  const envVar = chainId === 1 ? 'ETHEREUM_RPC_URL' : 'ARBITRUM_RPC_URL';
  const defaultRpc = chainId === 1 ? 'https://ethereum.publicnode.com' : 'https://arbitrum.publicnode.com';
  return process.env[envVar] || defaultRpc;
}

function getGoalSlippage(goal: SwapGoal): number {
  switch (goal) {
    case 'conservative': return 0.1;
    case 'balanced': return 0.5;
    case 'aggressive': return 1.0;
  }
}

function getDeepLink(chainId: number, tokenIn: string, tokenOut: string, amount: string): string {
  const chain = chainId === 1 ? 'mainnet' : 'arbitrum';
  const tokens = TOKENS[chainId];
  const tokenInAddr = tokens[tokenIn.toUpperCase()]?.address ?? tokenIn;
  const tokenOutAddr = tokens[tokenOut.toUpperCase()]?.address ?? tokenOut;
  return `https://app.uniswap.org/#/swap?inputCurrency=${tokenInAddr}&outputCurrency=${tokenOutAddr}&exactAmount=${amount}&exactField=input&chain=${chain}`;
}

export async function planSwap(params: {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  goal: SwapGoal;
}) {
  const { chainId, tokenIn, tokenOut, amount, goal } = params;
  const tokens = TOKENS[chainId];

  const tokenInInfo = tokens[tokenIn.toUpperCase()];
  const tokenOutInfo = tokens[tokenOut.toUpperCase()];

  if (!tokenInInfo) throw new Error(`Unknown tokenIn: ${tokenIn}`);
  if (!tokenOutInfo) throw new Error(`Unknown tokenOut: ${tokenOut}`);

  const client = createPublicClient({
    chain: chainId === 1 ? mainnet : arbitrum,
    transport: http(getRpcUrl(chainId)),
  });

  const slippage = getGoalSlippage(goal);
  const feesToTry = [500, 3000, 10000];

  // Try available pools
  const quotes: Array<{ fee: number; amountOut: string; gasEstimate: string }> = [];

  for (const fee of feesToTry) {
    const poolAddress = (await client.readContract({
      address: FACTORY_ADDRESS[chainId],
      abi: FACTORY_ABI,
      functionName: 'getPool',
      args: [tokenInInfo.address, tokenOutInfo.address, fee],
    })) as `0x${string}`;

    if (poolAddress === '0x0000000000000000000000000000000000000000') continue;

    try {
      const amountInWei = parseUnits(amount, tokenInInfo.decimals);
      const result = (await client.simulateContract({
        address: QUOTER_V2_ADDRESS[chainId],
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: tokenInInfo.address,
            tokenOut: tokenOutInfo.address,
            amountIn: amountInWei,
            fee,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })) as { result: readonly [bigint, bigint, number, bigint] };

      quotes.push({
        fee,
        amountOut: formatUnits(result.result[0], tokenOutInfo.decimals),
        gasEstimate: result.result[3].toString(),
      });
    } catch {
      // Pool exists but quote failed
    }
  }

  if (quotes.length === 0) {
    throw new Error(`No available pools found for ${tokenIn}/${tokenOut} on chain ${chainId}`);
  }

  // Sort by amountOut (highest first = best rate)
  quotes.sort((a, b) => Number(b.amountOut) - Number(a.amountOut));
  const best = quotes[0];

  const amountOutNum = Number(best.amountOut);
  const amountOutMin = amountOutNum * (1 - slippage / 100);

  return {
    goal,
    chainId,
    tokenIn: tokenIn.toUpperCase(),
    tokenOut: tokenOut.toUpperCase(),
    amountIn: amount,
    recommendedFeeTier: best.fee,
    recommendedFeeTierLabel: `${best.fee / 10000}%`,
    expectedAmountOut: best.amountOut,
    minimumAmountOut: amountOutMin.toFixed(6),
    slippageTolerance: `${slippage}%`,
    gasEstimate: best.gasEstimate,
    allQuotes: quotes,
    deepLink: getDeepLink(chainId, tokenIn, tokenOut, amount),
    safetyChecks: [
      `Verify pool has sufficient liquidity for ${amount} ${tokenIn}`,
      `Set slippage to ${slippage}% or adjust for market conditions`,
      'Approve ${tokenIn} spend on SwapRouter02 before executing',
      'Set transaction deadline (recommended: 20 minutes)',
    ],
  };
}

async function main() {
  const [chainIdStr, tokenIn, tokenOut, amount, goalStr] = process.argv.slice(2);

  if (!chainIdStr || !tokenIn || !tokenOut || !amount) {
    console.error(
      'Usage: npx tsx scripts/plan-swap.ts <chainId> <tokenIn> <tokenOut> <amount> [goal]'
    );
    console.error('Goals: conservative | balanced | aggressive');
    process.exit(1);
  }

  const chainId = parseInt(chainIdStr, 10);
  const goal = (goalStr || 'balanced') as SwapGoal;

  if (![1, 42161].includes(chainId)) {
    console.error('Unsupported chainId. Use 1 (Ethereum) or 42161 (Arbitrum)');
    process.exit(1);
  }

  if (!['conservative', 'balanced', 'aggressive'].includes(goal)) {
    console.error('Goal must be conservative, balanced, or aggressive');
    process.exit(1);
  }

  const plan = await planSwap({ chainId, tokenIn, tokenOut, amount, goal });
  console.log(JSON.stringify(plan, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
