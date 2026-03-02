# viem Clients and Transports

## Public Client

Used for reading chain state (no private key needed):

```typescript
import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum } from 'viem/chains';

const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL ?? 'https://ethereum.publicnode.com'),
});

const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.ARBITRUM_RPC_URL ?? 'https://arbitrum.publicnode.com'),
});
```

## Wallet Client

Used for sending transactions:

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL),
  account,
});
```

## Free Public RPC Endpoints

| Chain | Provider | URL |
|-------|----------|-----|
| Ethereum | PublicNode | `https://ethereum.publicnode.com` |
| Ethereum | Cloudflare | `https://cloudflare-eth.com` |
| Arbitrum | PublicNode | `https://arbitrum.publicnode.com` |
| Arbitrum | Ankr | `https://rpc.ankr.com/arbitrum` |

## Private RPC (MEV Protection)

| Provider | URL | Use Case |
|----------|-----|----------|
| Flashbots Protect | `https://rpc.flashbots.net` | MEV protection for Ethereum |
| MEV Blocker | `https://rpc.mevblocker.io` | MEV protection |
| Infura | `https://mainnet.infura.io/v3/{key}` | Reliable, paid |
| Alchemy | `https://eth-mainnet.g.alchemy.com/v2/{key}` | Reliable, paid |

## Transport Options

```typescript
// HTTP (default, fast)
import { http } from 'viem';
const transport = http(rpcUrl);

// WebSocket (for subscriptions)
import { webSocket } from 'viem';
const transport = webSocket(wsUrl);

// Fallback (try multiple RPCs)
import { fallback, http } from 'viem';
const transport = fallback([
  http('https://ethereum.publicnode.com'),
  http('https://cloudflare-eth.com'),
]);
```
