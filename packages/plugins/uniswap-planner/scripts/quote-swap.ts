#!/usr/bin/env ts-node
/**
 * Uniswap V3 Swap Quote (Planner)
 */

async function main() {
  const [chainIdStr, tokenIn, tokenOut, amountIn, feeStr, slippageStr] = process.argv.slice(2);

  if (!chainIdStr || !tokenIn || !tokenOut || !amountIn) {
    console.error(
      'Usage: npx tsx packages/plugins/uniswap-planner/scripts/quote-swap.ts <chainId> <tokenIn> <tokenOut> <amountIn> [fee] [slippage%]'
    );
    process.exit(1);
  }

  const { quoteSwap } = await import('../../uniswap-integration/scripts/quote-swap.js');
  const chainId = parseInt(chainIdStr, 10);
  const fee = feeStr ? parseInt(feeStr, 10) : 3000;
  const slippage = slippageStr ? parseFloat(slippageStr) : 0.5;

  const result = await quoteSwap(chainId, tokenIn, tokenOut, amountIn, fee, slippage);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
