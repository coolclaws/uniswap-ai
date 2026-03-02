# viem Contract Read/Write Patterns

## Reading Contracts

### Single Read

```typescript
const balance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress],
});
```

### Parallel Reads

```typescript
const [balance, allowance, decimals] = await Promise.all([
  publicClient.readContract({ address, abi, functionName: 'balanceOf', args: [user] }),
  publicClient.readContract({ address, abi, functionName: 'allowance', args: [user, spender] }),
  publicClient.readContract({ address, abi, functionName: 'decimals' }),
]);
```

## Simulating Non-View Calls

QuoterV2 requires simulation (not view):

```typescript
const { result } = await publicClient.simulateContract({
  address: QUOTER_V2_ADDRESS,
  abi: quoterV2Abi,
  functionName: 'quoteExactInputSingle',
  args: [params],
});
const [amountOut, sqrtPriceAfter, ticksCrossed, gasEstimate] = result;
```

## Writing Contracts

### Write and Wait

```typescript
const txHash = await walletClient.writeContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: 'functionName',
  args: [...],
  account,
});

const receipt = await publicClient.waitForTransactionReceipt({
  hash: txHash,
  timeout: 120_000, // 2 minutes
});

if (receipt.status === 'reverted') {
  throw new Error('Transaction reverted');
}
```

### Simulating Before Writing

Always simulate writes to catch errors before spending gas:

```typescript
// Simulate first
const { request } = await publicClient.simulateContract({
  address: SWAP_ROUTER_02,
  abi: swapRouter02Abi,
  functionName: 'exactInputSingle',
  args: [swapParams],
  account,
});

// Execute if simulation passes
const txHash = await walletClient.writeContract(request);
```

## ERC20 Approve Pattern

```typescript
// Check allowance first
const allowance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [account.address, SWAP_ROUTER_02],
});

// Only approve if needed
if (allowance < amountIn) {
  const approveTx = await walletClient.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [SWAP_ROUTER_02, amountIn],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
}
```

## Type Safety with `as const`

Use `as const` on ABIs for full TypeScript inference:

```typescript
const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
```
