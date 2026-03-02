#!/usr/bin/env node
/**
 * Uniswap V3 MCP Server
 *
 * Exposes 6 tools for interacting with Uniswap V3 on Ethereum and Arbitrum:
 *   - get_pool_data
 *   - quote_swap
 *   - get_token_price
 *   - simulate_swap
 *   - plan_swap
 *   - assess_risk
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';

// ─── Constants ────────────────────────────────────────────────────────────────

const FACTORY_ADDRESS: Record<number, `0x${string}`> = {
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  42161: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
};

const QUOTER_V2_ADDRESS: Record<number, `0x${string}`> = {
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
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

const PRICE_DISCOVERY_FEES = [500, 3000, 10000];

// ─── ABIs ─────────────────────────────────────────────────────────────────────

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
  {
    name: 'liquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint128' }],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'fee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint24' }],
  },
] as const;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRpcUrl(chainId: number): string {
  const envVar = chainId === 1 ? 'ETHEREUM_RPC_URL' : 'ARBITRUM_RPC_URL';
  const defaultRpc = chainId === 1 ? 'https://ethereum.publicnode.com' : 'https://arbitrum.publicnode.com';
  return process.env[envVar] ?? defaultRpc;
}

function getClient(chainId: number) {
  return createPublicClient({
    chain: chainId === 1 ? mainnet : arbitrum,
    transport: http(getRpcUrl(chainId)),
  });
}

function getChainName(chainId: number): string {
  return chainId === 1 ? 'mainnet' : 'arbitrum';
}

function getTokens(chainId: number) {
  const tokens = TOKENS[chainId];
  if (!tokens) throw new Error(`Unsupported chainId: ${chainId}. Use 1 (Ethereum) or 42161 (Arbitrum).`);
  return tokens;
}

function resolveToken(chainId: number, symbol: string) {
  const tokens = getTokens(chainId);
  const info = tokens[symbol.toUpperCase()];
  if (!info) {
    throw new Error(
      `Unknown token: ${symbol}. Supported on chain ${chainId}: ${Object.keys(tokens).join(', ')}`
    );
  }
  return { symbol: symbol.toUpperCase(), ...info };
}

function getPriceImpactLevel(priceImpact: number): string {
  if (priceImpact < 0.1) return 'minimal';
  if (priceImpact < 0.5) return 'low';
  if (priceImpact < 2.0) return 'moderate';
  if (priceImpact < 5.0) return 'high';
  return 'severe';
}

function getRiskLevel(priceImpact: number, slippageTolerance: number): 'low' | 'medium' | 'high' {
  if (priceImpact > 3 || slippageTolerance > 2) return 'high';
  if (priceImpact > 1 || slippageTolerance > 1) return 'medium';
  return 'low';
}

function buildDeepLink(
  chainId: number,
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: string
): string {
  const chain = getChainName(chainId);
  return (
    `https://app.uniswap.org/#/swap` +
    `?inputCurrency=${tokenInAddress}` +
    `&outputCurrency=${tokenOutAddress}` +
    `&exactAmount=${amountIn}` +
    `&exactField=input` +
    `&chain=${chain}`
  );
}

// ─── Core functions ───────────────────────────────────────────────────────────

async function fetchPoolData(chainId: number, token0Symbol: string, token1Symbol: string, fee: number) {
  const client = getClient(chainId);
  const token0 = resolveToken(chainId, token0Symbol);
  const token1 = resolveToken(chainId, token1Symbol);

  const poolAddress = (await client.readContract({
    address: FACTORY_ADDRESS[chainId],
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [token0.address, token1.address, fee],
  })) as `0x${string}`;

  if (poolAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`No pool found for ${token0Symbol}/${token1Symbol} at fee tier ${fee}`);
  }

  const [slot0, liquidity, poolToken0, poolToken1, poolFee] = await Promise.all([
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'slot0' }),
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'liquidity' }),
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'token0' }),
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'token1' }),
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'fee' }),
  ]);

  const slot0Result = slot0 as readonly [bigint, number, number, number, number, number, boolean];
  const sqrtPriceX96 = slot0Result[0];
  const tick = slot0Result[1];

  const tokens = getTokens(chainId);
  const findToken = (addr: string) =>
    Object.entries(tokens).find(([, t]) => t.address.toLowerCase() === (addr as string).toLowerCase());

  const t0 = findToken(poolToken0 as string);
  const t1 = findToken(poolToken1 as string);
  const dec0 = t0?.[1].decimals ?? 18;
  const dec1 = t1?.[1].decimals ?? 18;

  const price = (Number(sqrtPriceX96) / 2 ** 96) ** 2 * 10 ** (dec0 - dec1);

  return {
    poolAddress,
    token0: { address: poolToken0, symbol: t0?.[0] ?? 'UNKNOWN', decimals: dec0 },
    token1: { address: poolToken1, symbol: t1?.[0] ?? 'UNKNOWN', decimals: dec1 },
    fee: Number(poolFee),
    feeTierLabel: `${Number(poolFee) / 10000}%`,
    sqrtPriceX96: sqrtPriceX96.toString(),
    tick,
    liquidity: (liquidity as bigint).toString(),
    token0Price: price.toFixed(8),
    token1Price: (1 / price).toFixed(8),
    chainId,
    chain: getChainName(chainId),
  };
}

async function fetchQuote(
  chainId: number,
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: string,
  fee: number = 3000,
  slippagePercent: number = 0.5
) {
  const client = getClient(chainId);
  const tokenIn = resolveToken(chainId, tokenInSymbol);
  const tokenOut = resolveToken(chainId, tokenOutSymbol);

  const amountInWei = parseUnits(amountIn, tokenIn.decimals);

  const result = (await client.simulateContract({
    address: QUOTER_V2_ADDRESS[chainId],
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInWei,
        fee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })) as { result: readonly [bigint, bigint, number, bigint] };

  const [amountOutWei, , , gasEstimate] = result.result;

  const slippageBps = Math.round(slippagePercent * 100);
  const amountOutMinWei = (amountOutWei * BigInt(10000 - slippageBps)) / 10000n;

  const amountOut = formatUnits(amountOutWei, tokenOut.decimals);
  const amountOutMin = formatUnits(amountOutMinWei, tokenOut.decimals);

  return {
    tokenIn: tokenIn.symbol,
    tokenOut: tokenOut.symbol,
    amountIn,
    amountOut,
    amountOutMin,
    fee,
    feeTierLabel: `${fee / 10000}%`,
    slippagePercent,
    gasEstimate: gasEstimate.toString(),
    priceRatio: (Number(amountOut) / Number(amountIn)).toFixed(8),
    route: [`${tokenIn.symbol} → ${tokenOut.symbol}`],
    chainId,
    chain: getChainName(chainId),
  };
}

async function fetchTokenPrice(chainId: number, tokenSymbol: string) {
  const normalized = tokenSymbol.toUpperCase();
  const tokens = getTokens(chainId);

  if (['USDC', 'USDT', 'DAI'].includes(normalized)) {
    return {
      token: normalized,
      priceUSD: '1.0000',
      priceETH: null,
      source: 'stablecoin',
      chainId,
      chain: getChainName(chainId),
    };
  }

  const tokenInfo = tokens[normalized];
  if (!tokenInfo) throw new Error(`Unknown token: ${tokenSymbol}`);

  const quoteTokenInfo = tokens['USDC'];
  if (!quoteTokenInfo) throw new Error('USDC not available on this chain');

  const client = getClient(chainId);

  let bestPool: { address: `0x${string}`; fee: number; liquidity: bigint } | null = null;

  for (const fee of PRICE_DISCOVERY_FEES) {
    const poolAddress = (await client.readContract({
      address: FACTORY_ADDRESS[chainId],
      abi: FACTORY_ABI,
      functionName: 'getPool',
      args: [tokenInfo.address, quoteTokenInfo.address, fee],
    })) as `0x${string}`;

    if (poolAddress === '0x0000000000000000000000000000000000000000') continue;

    const liquidity = (await client.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: 'liquidity',
    })) as bigint;

    if (!bestPool || liquidity > bestPool.liquidity) {
      bestPool = { address: poolAddress, fee, liquidity };
    }
  }

  if (!bestPool) throw new Error(`No ${normalized}/USDC pool found on chain ${chainId}`);

  const [slot0, token0Addr] = await Promise.all([
    client.readContract({ address: bestPool.address, abi: POOL_ABI, functionName: 'slot0' }),
    client.readContract({ address: bestPool.address, abi: POOL_ABI, functionName: 'token0' }),
  ]);

  const slot0Result = slot0 as readonly [bigint, number, number, number, number, number, boolean];
  const sqrtPriceX96 = slot0Result[0];

  const isToken0 = (token0Addr as string).toLowerCase() === tokenInfo.address.toLowerCase();
  const dec0 = isToken0 ? tokenInfo.decimals : quoteTokenInfo.decimals;
  const dec1 = isToken0 ? quoteTokenInfo.decimals : tokenInfo.decimals;

  const rawPrice = (Number(sqrtPriceX96) / 2 ** 96) ** 2 * 10 ** (dec0 - dec1);
  const priceUSD = isToken0 ? rawPrice : 1 / rawPrice;

  // Also get ETH price if this isn't WETH
  let priceETH: string | null = null;
  if (normalized !== 'WETH') {
    const wethInfo = tokens['WETH'];
    if (wethInfo) {
      try {
        const wethPrice = await fetchTokenPrice(chainId, 'WETH');
        const wethPriceUSD = parseFloat(wethPrice.priceUSD);
        if (wethPriceUSD > 0) {
          priceETH = (priceUSD / wethPriceUSD).toFixed(8);
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    token: normalized,
    priceUSD: priceUSD.toFixed(4),
    priceETH,
    source: `${normalized}/USDC pool (fee: ${bestPool.fee / 10000}%)`,
    poolAddress: bestPool.address,
    feeTier: bestPool.fee,
    chainId,
    chain: getChainName(chainId),
  };
}

async function fetchSimulation(
  chainId: number,
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: string,
  slippagePercent: number = 0.5,
  fee: number = 3000
) {
  const client = getClient(chainId);
  const tokenIn = resolveToken(chainId, tokenInSymbol);
  const tokenOut = resolveToken(chainId, tokenOutSymbol);

  const amountInWei = parseUnits(amountIn, tokenIn.decimals);

  const poolAddress = (await client.readContract({
    address: FACTORY_ADDRESS[chainId],
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenIn.address, tokenOut.address, fee],
  })) as `0x${string}`;

  if (poolAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`No pool found for ${tokenInSymbol}/${tokenOutSymbol} at fee ${fee}`);
  }

  const slot0Before = (await client.readContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'slot0',
  })) as readonly [bigint, number, number, number, number, number, boolean];

  const sqrtPriceBefore = slot0Before[0];
  const tickBefore = slot0Before[1];

  const quoteResult = (await client.simulateContract({
    address: QUOTER_V2_ADDRESS[chainId],
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInWei,
        fee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  })) as { result: readonly [bigint, bigint, number, bigint] };

  const [amountOutWei, sqrtPriceAfter, ticksCrossed, gasEstimate] = quoteResult.result;

  const slippageBps = Math.round(slippagePercent * 100);
  const amountOutMinWei = (amountOutWei * BigInt(10000 - slippageBps)) / 10000n;

  const expectedAmountOut = formatUnits(amountOutWei, tokenOut.decimals);
  const minimumAmountOut = formatUnits(amountOutMinWei, tokenOut.decimals);

  const priceBefore = (Number(sqrtPriceBefore) / 2 ** 96) ** 2;
  const priceAfter = (Number(sqrtPriceAfter) / 2 ** 96) ** 2;
  const priceImpact = Math.abs((priceAfter - priceBefore) / priceBefore) * 100;

  const deepLink = buildDeepLink(chainId, tokenIn.address, tokenOut.address, amountIn);

  return {
    tokenIn: tokenIn.symbol,
    tokenOut: tokenOut.symbol,
    amountIn,
    expectedAmountOut,
    minimumAmountOut,
    fee,
    feeTierLabel: `${fee / 10000}%`,
    slippageTolerance: slippagePercent,
    priceImpact: priceImpact.toFixed(4),
    priceImpactLevel: getPriceImpactLevel(priceImpact),
    tickBefore,
    ticksCrossed,
    gasEstimate: gasEstimate.toString(),
    deepLink,
    warnings:
      priceImpact > 5
        ? ['⚠️ High price impact. Consider splitting the swap or using a different route.']
        : [],
    chainId,
    chain: getChainName(chainId),
  };
}

async function fetchPlan(
  chainId: number,
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: string,
  slippagePercent: number = 0.5
) {
  // Try fee tiers and pick best quote
  const feeTiers = [500, 3000, 10000];
  const tokenIn = resolveToken(chainId, tokenInSymbol);
  const tokenOut = resolveToken(chainId, tokenOutSymbol);
  const client = getClient(chainId);

  let bestFee = 3000;
  let bestAmountOut = 0n;

  for (const fee of feeTiers) {
    try {
      const poolAddress = (await client.readContract({
        address: FACTORY_ADDRESS[chainId],
        abi: FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenIn.address, tokenOut.address, fee],
      })) as `0x${string}`;

      if (poolAddress === '0x0000000000000000000000000000000000000000') continue;

      const amountInWei = parseUnits(amountIn, tokenIn.decimals);
      const result = (await client.simulateContract({
        address: QUOTER_V2_ADDRESS[chainId],
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: tokenIn.address,
            tokenOut: tokenOut.address,
            amountIn: amountInWei,
            fee,
            sqrtPriceLimitX96: 0n,
          },
        ],
      })) as { result: readonly [bigint, bigint, number, bigint] };

      const [amountOutWei] = result.result;
      if (amountOutWei > bestAmountOut) {
        bestAmountOut = amountOutWei;
        bestFee = fee;
      }
    } catch {
      // Pool might not exist for this fee tier
    }
  }

  const simulation = await fetchSimulation(chainId, tokenInSymbol, tokenOutSymbol, amountIn, slippagePercent, bestFee);
  const priceImpact = parseFloat(simulation.priceImpact);
  const riskLevel = getRiskLevel(priceImpact, slippagePercent);

  const steps = [
    `1. Verify you have at least ${amountIn} ${tokenIn.symbol} in your wallet`,
    `2. Approve the Uniswap V3 SwapRouter to spend your ${tokenIn.symbol}`,
    `3. Execute exactInputSingle swap on the ${tokenIn.symbol}/${tokenOut.symbol} pool (fee: ${bestFee / 10000}%)`,
    `4. Expect to receive ~${simulation.expectedAmountOut} ${tokenOut.symbol}`,
    `5. Minimum received (${slippagePercent}% slippage): ${simulation.minimumAmountOut} ${tokenOut.symbol}`,
  ];

  if (priceImpact > 1) {
    steps.push(`⚠️ Price impact is ${priceImpact.toFixed(2)}% — consider splitting into smaller swaps`);
  }

  return {
    swap: {
      tokenIn: tokenIn.symbol,
      tokenOut: tokenOut.symbol,
      amountIn,
      expectedAmountOut: simulation.expectedAmountOut,
      minimumAmountOut: simulation.minimumAmountOut,
      fee: bestFee,
      feeTierLabel: `${bestFee / 10000}%`,
    },
    steps,
    deepLink: simulation.deepLink,
    estimatedGas: simulation.gasEstimate,
    risk: {
      level: riskLevel,
      priceImpact: simulation.priceImpact,
      priceImpactLevel: simulation.priceImpactLevel,
      slippageTolerance: slippagePercent,
    },
    warnings: simulation.warnings,
    chainId,
    chain: getChainName(chainId),
  };
}

async function fetchRiskAssessment(
  chainId: number,
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: string,
  slippageTolerance: number = 0.5
) {
  const simulation = await fetchSimulation(
    chainId,
    tokenInSymbol,
    tokenOutSymbol,
    amountIn,
    slippageTolerance
  );

  const priceImpact = parseFloat(simulation.priceImpact);
  const riskLevel = getRiskLevel(priceImpact, slippageTolerance);

  const recommendations: string[] = [];

  if (priceImpact > 5) {
    recommendations.push('🔴 Severe price impact. Split into multiple smaller swaps.');
    recommendations.push('🔴 Consider using a DEX aggregator for better routing.');
  } else if (priceImpact > 2) {
    recommendations.push('🟡 High price impact. Consider reducing swap size or splitting.');
  } else if (priceImpact > 0.5) {
    recommendations.push('🟡 Moderate price impact. Acceptable for most users.');
  } else {
    recommendations.push('🟢 Low price impact. Safe to proceed.');
  }

  if (slippageTolerance > 1) {
    recommendations.push(`🟡 Slippage tolerance of ${slippageTolerance}% is above typical 0.5%. Consider reducing.`);
  }

  if (slippageTolerance > 3) {
    recommendations.push('🔴 High slippage tolerance increases sandwich attack risk. Use MEV protection.');
  }

  recommendations.push(`Estimated gas: ${simulation.gasEstimate} units`);

  return {
    riskLevel,
    priceImpact: simulation.priceImpact,
    priceImpactLevel: simulation.priceImpactLevel,
    slippageRisk: slippageTolerance > 1 ? 'elevated' : 'normal',
    slippageTolerance,
    expectedAmountOut: simulation.expectedAmountOut,
    minimumAmountOut: simulation.minimumAmountOut,
    recommendations,
    warnings: simulation.warnings,
    chainId,
    chain: getChainName(chainId),
  };
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: 'get_pool_data',
    description: 'Get Uniswap V3 pool data including liquidity, sqrtPriceX96, tick, and token prices.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'number',
          description: 'Chain ID: 1 for Ethereum mainnet, 42161 for Arbitrum',
          enum: [1, 42161],
        },
        token0: {
          type: 'string',
          description: 'First token symbol (e.g. USDC, WETH, WBTC, DAI, USDT)',
        },
        token1: {
          type: 'string',
          description: 'Second token symbol (e.g. USDC, WETH, WBTC, DAI, USDT)',
        },
        fee: {
          type: 'number',
          description: 'Fee tier: 100 (0.01%), 500 (0.05%), 3000 (0.3%), or 10000 (1%)',
          enum: [100, 500, 3000, 10000],
        },
      },
      required: ['chainId', 'token0', 'token1', 'fee'],
    },
  },
  {
    name: 'quote_swap',
    description: 'Get a swap quote for a token pair using Uniswap V3 QuoterV2.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'number',
          description: 'Chain ID: 1 for Ethereum mainnet, 42161 for Arbitrum',
          enum: [1, 42161],
        },
        tokenIn: {
          type: 'string',
          description: 'Input token symbol (e.g. USDC, WETH)',
        },
        tokenOut: {
          type: 'string',
          description: 'Output token symbol (e.g. WETH, USDC)',
        },
        amountIn: {
          type: 'string',
          description: 'Human-readable amount of tokenIn (e.g. "1000" for 1000 USDC)',
        },
        fee: {
          type: 'number',
          description: 'Fee tier (optional, default 3000)',
          enum: [100, 500, 3000, 10000],
        },
      },
      required: ['chainId', 'tokenIn', 'tokenOut', 'amountIn'],
    },
  },
  {
    name: 'get_token_price',
    description: 'Get the current price of a token in USD using Uniswap V3 pools.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'number',
          description: 'Chain ID: 1 for Ethereum mainnet, 42161 for Arbitrum',
          enum: [1, 42161],
        },
        token: {
          type: 'string',
          description: 'Token symbol (e.g. WETH, WBTC, USDC)',
        },
      },
      required: ['chainId', 'token'],
    },
  },
  {
    name: 'simulate_swap',
    description:
      'Simulate a Uniswap V3 swap with slippage calculation. Returns expected output, minimum output, price impact, and a deep link to execute on app.uniswap.org.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'number',
          description: 'Chain ID: 1 for Ethereum mainnet, 42161 for Arbitrum',
          enum: [1, 42161],
        },
        tokenIn: {
          type: 'string',
          description: 'Input token symbol',
        },
        tokenOut: {
          type: 'string',
          description: 'Output token symbol',
        },
        amountIn: {
          type: 'string',
          description: 'Human-readable input amount',
        },
        slippageTolerance: {
          type: 'number',
          description: 'Slippage tolerance in percent (e.g. 0.5 for 0.5%). Default: 0.5',
        },
        fee: {
          type: 'number',
          description: 'Fee tier (optional, default 3000)',
          enum: [100, 500, 3000, 10000],
        },
      },
      required: ['chainId', 'tokenIn', 'tokenOut', 'amountIn'],
    },
  },
  {
    name: 'plan_swap',
    description:
      'Get a complete swap plan with step-by-step instructions, best fee tier selection, risk summary, and a deep link to execute.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'number',
          description: 'Chain ID: 1 for Ethereum mainnet, 42161 for Arbitrum',
          enum: [1, 42161],
        },
        tokenIn: {
          type: 'string',
          description: 'Input token symbol',
        },
        tokenOut: {
          type: 'string',
          description: 'Output token symbol',
        },
        amountIn: {
          type: 'string',
          description: 'Human-readable input amount',
        },
        slippageTolerance: {
          type: 'number',
          description: 'Slippage tolerance in percent (optional, default 0.5)',
        },
      },
      required: ['chainId', 'tokenIn', 'tokenOut', 'amountIn'],
    },
  },
  {
    name: 'assess_risk',
    description:
      'Assess the risk of a Uniswap V3 swap. Returns risk level (low/medium/high), price impact analysis, slippage risk, and recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'number',
          description: 'Chain ID: 1 for Ethereum mainnet, 42161 for Arbitrum',
          enum: [1, 42161],
        },
        tokenIn: {
          type: 'string',
          description: 'Input token symbol',
        },
        tokenOut: {
          type: 'string',
          description: 'Output token symbol',
        },
        amountIn: {
          type: 'string',
          description: 'Human-readable input amount',
        },
        slippageTolerance: {
          type: 'number',
          description: 'Slippage tolerance in percent (e.g. 0.5)',
        },
      },
      required: ['chainId', 'tokenIn', 'tokenOut', 'amountIn', 'slippageTolerance'],
    },
  },
];

// ─── Server setup ─────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: 'uniswap-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case 'get_pool_data': {
        const { chainId, token0, token1, fee } = args as {
          chainId: number;
          token0: string;
          token1: string;
          fee: number;
        };
        result = await fetchPoolData(chainId, token0, token1, fee);
        break;
      }

      case 'quote_swap': {
        const { chainId, tokenIn, tokenOut, amountIn, fee } = args as {
          chainId: number;
          tokenIn: string;
          tokenOut: string;
          amountIn: string;
          fee?: number;
        };
        result = await fetchQuote(chainId, tokenIn, tokenOut, amountIn, fee ?? 3000);
        break;
      }

      case 'get_token_price': {
        const { chainId, token } = args as { chainId: number; token: string };
        result = await fetchTokenPrice(chainId, token);
        break;
      }

      case 'simulate_swap': {
        const { chainId, tokenIn, tokenOut, amountIn, slippageTolerance, fee } = args as {
          chainId: number;
          tokenIn: string;
          tokenOut: string;
          amountIn: string;
          slippageTolerance?: number;
          fee?: number;
        };
        result = await fetchSimulation(
          chainId,
          tokenIn,
          tokenOut,
          amountIn,
          slippageTolerance ?? 0.5,
          fee ?? 3000
        );
        break;
      }

      case 'plan_swap': {
        const { chainId, tokenIn, tokenOut, amountIn, slippageTolerance } = args as {
          chainId: number;
          tokenIn: string;
          tokenOut: string;
          amountIn: string;
          slippageTolerance?: number;
        };
        result = await fetchPlan(chainId, tokenIn, tokenOut, amountIn, slippageTolerance ?? 0.5);
        break;
      }

      case 'assess_risk': {
        const { chainId, tokenIn, tokenOut, amountIn, slippageTolerance } = args as {
          chainId: number;
          tokenIn: string;
          tokenOut: string;
          amountIn: string;
          slippageTolerance: number;
        };
        result = await fetchRiskAssessment(chainId, tokenIn, tokenOut, amountIn, slippageTolerance);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Uniswap MCP server running on stdio\n');
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
