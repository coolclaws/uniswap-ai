#!/usr/bin/env ts-node
/**
 * Uniswap V3 Swap Simulator (Planner)
 *
 * Re-exports from uniswap-integration for planner use.
 */

export { simulateSwap } from '../../uniswap-integration/scripts/simulate-swap.js';

async function main() {
  const [chainIdStr, tokenIn, tokenOut, amountIn, slippageStr, feeStr] = process.argv.slice(2);

  if (!chainIdStr || !tokenIn || !tokenOut || !amountIn) {
    console.error(
      'Usage: npx tsx packages/plugins/uniswap-planner/scripts/simulate-swap.ts <chainId> <tokenIn> <tokenOut> <amountIn> [slippage%] [fee]'
    );
    process.exit(1);
  }

  const { simulateSwap } = await import('../../uniswap-integration/scripts/simulate-swap.js');
  const chainId = parseInt(chainIdStr, 10);
  const slippage = slippageStr ? parseFloat(slippageStr) : 0.5;
  const fee = feeStr ? parseInt(feeStr, 10) : 3000;

  const result = await simulateSwap(chainId, tokenIn, tokenOut, amountIn, slippage, fee);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
