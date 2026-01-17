---
sidebar_position: 3
title: RGB Lightning Routing
description: Understanding how RGB asset payments are routed through Lightning Network channels
---

# RGB Lightning Routing

RGB Lightning routing extends standard Lightning pathfinding to support multi-hop RGB asset payments. This guide covers route discovery, payment routing, and liquidity management for RGB assets.

## Routing Fundamentals

### How Lightning Routing Works

Lightning payments hop through intermediate nodes:

```
Alice → Bob → Carol → David

Alice wants to pay David 100 RGB tokens:
1. Alice → Bob:   -100 RGB (+ small BTC fee)
2. Bob → Carol:   -100 RGB (+ small BTC fee)
3. Carol → David: -100 RGB (+ small BTC fee)
```

*Routing basics to be expanded*

### RGB Routing Challenges

RGB routing requires additional considerations:

- **Asset-Specific Liquidity**: Channels need specific RGB assets
- **Multi-Asset Paths**: Route may need multiple assets
- **Proof Propagation**: RGB proofs must accompany payments
- **Validation Overhead**: Each hop validates RGB state
- **Network Discovery**: Finding RGB-capable routes

*Challenges to be expanded*

## Route Discovery

### Finding RGB-Capable Routes

```bash
# Query routes for RGB payment
lnp-cli queryroutes \
  --destination 03def... \
  --contract-id rgb:2wHxKf... \
  --amount 1000 \
  --max-hops 6
```

Output:
```json
{
  "routes": [
    {
      "hops": [
        {
          "node": "03abc...",
          "channel": "123",
          "rgb_capable": true,
          "rgb_liquidity": {
            "rgb:2wHxKf...": 5000
          },
          "fee_base": 1,
          "fee_rate": 0.0001
        },
        {
          "node": "03def...",
          "channel": "456",
          "rgb_capable": true
        }
      ],
      "total_fees": 2,
      "total_delay": 288
    }
  ]
}
```

*Route discovery to be expanded*

### Using RGB.js

```typescript
import { RgbLightning } from '@rgbjs/lightning';

const ln = new RgbLightning(config);

// Find routes
const routes = await ln.findRoutes({
  destination: destinationNode,
  contractId: 'rgb:2wHxKf...',
  amount: 1000n,

  constraints: {
    maxHops: 6,
    maxFee: 10n,  // Max routing fee in sats
    maxDelay: 1008,  // Max CLTV delta (blocks)
    minRgbLiquidity: 1000n
  }
});

// Select best route
const bestRoute = routes[0];
console.log('Route:', bestRoute.hops.map(h => h.nodeId));
console.log('Total fee:', bestRoute.totalFee);
```

*SDK route finding to be expanded*

## Payment Routing

### Onion Routing

RGB payments use onion-routed packets:

```typescript
interface RgbOnionPacket {
  // Standard Lightning HTLC
  paymentHash: Hash;
  amount: bigint;  // Bitcoin fee
  cltvExpiry: number;

  // RGB-specific data
  rgbPayload: {
    contractId: string;
    amount: bigint;
    stateProof: RgbProof;

    // Encrypted for each hop
    nextHop: EncryptedHopData;
  };
}
```

*Onion routing to be expanded*

### Multi-Hop RGB Transfer

```typescript
// Alice initiates payment to David
const payment = await ln.sendPayment({
  destination: davidNode,
  contractId: 'rgb:...',
  amount: 100n,
  invoice: invoice
});

// Payment flow:
// 1. Alice locks 100 RGB + fees to Bob
// 2. Bob locks 100 RGB + fees to Carol
// 3. Carol locks 100 RGB + fees to David
// 4. David reveals preimage
// 5. Settlements propagate back
```

Hop details:
```
Alice → Bob:
  RGB: -100
  BTC: -1 (fee to Bob)
  Lock: hash(preimage)

Bob → Carol:
  RGB: -100
  BTC: -1 (fee to Carol)
  Lock: hash(preimage)

Carol → David:
  RGB: -100
  BTC: -1 (fee to David)
  Lock: hash(preimage)

David unlocks with preimage
```

*Multi-hop mechanics to be expanded*

### HTLCs for RGB Assets

Hash Time-Locked Contracts for RGB:

```typescript
interface RgbHTLC {
  // Standard HTLC fields
  paymentHash: Hash;
  amount: bigint;
  cltvExpiry: number;

  // RGB fields
  rgbContract: string;
  rgbAmount: bigint;
  rgbStateCommitment: Hash;

  // Settlement paths
  success: {
    preimage: Hash;
    rgbProof: RgbProof;
  };
  timeout: {
    refundHeight: number;
  };
}
```

*HTLC structure to be expanded*

## Liquidity Management

### Channel Liquidity

Each channel has directional liquidity:

```
Channel A ← → B:
  Bitcoin:
    A → B: 600,000 sats (can send)
    B → A: 400,000 sats (can send)

  RGB Token:
    A → B: 3000 tokens (can send)
    B → A: 2000 tokens (can send)
```

*Liquidity basics to be expanded*

### Monitoring Liquidity

```bash
# Check RGB liquidity
lnp-cli getrgbliquidity \
  --contract-id rgb:2wHxKf...
```

```typescript
const liquidity = await ln.getRgbLiquidity('rgb:...');

console.log('Outbound:', liquidity.outbound);
console.log('Inbound:', liquidity.inbound);
console.log('Total:', liquidity.total);

liquidity.channels.forEach(ch => {
  console.log(`Channel ${ch.id}:`);
  console.log(`  Can send: ${ch.localBalance}`);
  console.log(`  Can receive: ${ch.remoteBalance}`);
});
```

*Liquidity monitoring to be expanded*

### Rebalancing Strategies

**Circular Rebalancing**
```typescript
// Move liquidity in circle
await ln.circularRebalance({
  contractId: 'rgb:...',
  amount: 500n,
  path: [channelA, channelB, channelC, channelA]
});
```

**Submarine Swap Rebalancing**
```typescript
// Swap on-chain for Lightning balance
await ln.submarineSwap({
  contractId: 'rgb:...',
  onchainAmount: 1000n,
  lightningChannel: channelId,
  direction: 'onchain_to_lightning'
});
```

*Rebalancing techniques to be expanded*

## Routing Fees

### Fee Structure

```typescript
interface RoutingFees {
  // Bitcoin fees (for routing)
  bitcoinBaseFee: bigint;     // Base fee in sats
  bitcoinFeeRate: number;     // Proportional fee (ppm)

  // RGB fees (optional)
  rgbBaseFee?: bigint;        // Base fee in asset
  rgbFeeRate?: number;        // Proportional fee (ppm)
}
```

Example:
```
Routing 1000 RGB tokens through node:
  Bitcoin fees: 1 sat base + (1000 sats * 0.0001) = 1.1 sats
  RGB fees: 0 tokens base + (1000 * 0.001) = 1 token
  Total cost: 1.1 sats + 1 RGB token
```

*Fee calculation to be expanded*

### Setting Routing Fees

```bash
# Set fees for RGB routing
lnp-cli setrgbfees \
  --contract-id rgb:2wHxKf... \
  --base-fee 0 \
  --fee-rate 1000  # 0.1% (1000 ppm)
```

```typescript
await ln.setChannelFees({
  channelId: channelId,
  contractId: 'rgb:...',
  baseFee: 0n,
  feeRate: 1000  // parts per million
});
```

*Fee configuration to be expanded*

## Advanced Routing

### Multi-Path Payments

Split large payments across multiple routes:

```typescript
const mpp = await ln.sendMultiPathPayment({
  destination: dest,
  contractId: 'rgb:...',
  totalAmount: 5000n,

  // Split into multiple parts
  maxParts: 4,
  minPartSize: 100n
});

// Payment split:
// Path 1: 2000 tokens
// Path 2: 1500 tokens
// Path 3: 1000 tokens
// Path 4:  500 tokens
```

*Multi-path routing to be expanded*

### Atomic Multi-Asset Payments

Pay with multiple assets simultaneously:

```typescript
const multiAsset = await ln.sendMultiAssetPayment({
  destination: dest,
  assets: [
    { contractId: 'rgb:tokenA...', amount: 100n },
    { contractId: 'rgb:tokenB...', amount: 200n }
  ],
  // All succeed or all fail
  atomic: true
});
```

*Multi-asset payments to be expanded*

### Trampoline Routing

Delegate routing to trampoline nodes:

```typescript
// Lightweight client doesn't compute full route
const trampoline = await ln.sendTrampolinePayment({
  trampolineNode: 'trampoline.rgb.tech',
  destination: dest,
  contractId: 'rgb:...',
  amount: 1000n
});

// Trampoline node handles routing
```

*Trampoline routing to be expanded*

## Route Optimization

### Pathfinding Algorithms

```typescript
interface RouteOptimization {
  // Minimize total fees
  minimizeFees: boolean;

  // Minimize hops
  minimizeHops: boolean;

  // Prefer high-reliability routes
  preferReliable: boolean;

  // Balance privacy vs efficiency
  privacyLevel: 'low' | 'medium' | 'high';
}

const routes = await ln.findOptimalRoute({
  destination: dest,
  contractId: 'rgb:...',
  amount: 1000n,
  optimization: {
    minimizeFees: true,
    preferReliable: true,
    privacyLevel: 'high'
  }
});
```

*Optimization strategies to be expanded*

### Route Hints

Invoice includes routing hints:

```typescript
const invoice = await ln.createInvoice({
  contractId: 'rgb:...',
  amount: 1000n,

  // Include route hints
  routeHints: [
    {
      hops: [
        {
          nodeId: 'intermediary_node',
          channelId: 'channel_to_me',
          fees: { base: 1n, rate: 100 }
        }
      ]
    }
  ]
});
```

*Route hints to be expanded*

## Network Topology

### RGB Lightning Graph

```bash
# View RGB network topology
lnp-cli describegraph --rgb-only
```

```typescript
const graph = await ln.getNetworkGraph({
  filterRgbOnly: true,
  contracts: ['rgb:2wHxKf...']
});

console.log('RGB-capable nodes:', graph.nodes.length);
console.log('RGB channels:', graph.channels.length);

// Find well-connected nodes
const hubs = graph.nodes
  .filter(n => n.rgbChannels.length > 10)
  .sort((a, b) => b.totalRgbCapacity - a.totalRgbCapacity);
```

*Network analysis to be expanded*

### Liquidity Providers

Nodes specializing in RGB liquidity:

*To be expanded*

## Privacy Considerations

### Onion Routing Privacy

Each hop only knows previous and next:

```
Alice knows:
  - Next hop: Bob
  - Final destination: David (from invoice)

Bob knows:
  - Previous hop: Alice
  - Next hop: Carol
  - Does NOT know: Final destination

Carol knows:
  - Previous hop: Bob
  - Next hop: David
  - Does NOT know: Sender identity
```

*Privacy guarantees to be expanded*

### Amount Privacy

```typescript
// Add noise to routes
const payment = await ln.sendPayment({
  destination: dest,
  amount: 1000n,

  privacy: {
    shadowRoute: true,      // Add dummy hops
    amountPadding: 50n,     // Send extra, refund later
    timingObfuscation: true // Random delays
  }
});
```

*Privacy enhancements to be expanded*

## Monitoring and Analytics

### Route Success Rates

```typescript
const stats = await ln.getRoutingStats({
  contractId: 'rgb:...',
  period: '7d'
});

console.log('Successful routes:', stats.successful);
console.log('Failed routes:', stats.failed);
console.log('Average fee:', stats.averageFee);
console.log('Average hops:', stats.averageHops);
```

*Analytics to be expanded*

### Routing Events

```typescript
ln.on('route_found', (route) => {
  console.log('Found route:', route.hops.length, 'hops');
});

ln.on('payment_sent', (payment) => {
  console.log('Payment sent:', payment.amount);
});

ln.on('payment_failed', (error) => {
  console.error('Payment failed:', error.reason);
});
```

*Event monitoring to be expanded*

## Troubleshooting

### Route Not Found

```
Error: No route found for RGB asset
Possible causes:
  - Insufficient liquidity
  - No RGB-capable path exists
  - Amount too large for single route

Solutions:
  - Try multi-path payment
  - Reduce amount
  - Open more RGB channels
  - Wait for liquidity rebalancing
```

*Troubleshooting guide to be expanded*

### Payment Failures

```typescript
try {
  await ln.sendPayment(params);
} catch (error) {
  if (error instanceof NoRouteError) {
    // Try multi-path or smaller amount
  } else if (error instanceof InsufficientLiquidityError) {
    // Rebalance or open new channel
  } else if (error instanceof ValidationError) {
    // RGB proof issue
  }
}
```

*Error handling to be expanded*

## Related Documentation

- [RGB Lightning Overview](./overview.md)
- [Asset Channels](./asset-channels.md)
- [RGB20 Transfers](../rgb20/transferring-assets.md)
- [Invoices](../../technical-reference/invoices.md)
- [Lightning Network](../../core-concepts/lightning.md)
