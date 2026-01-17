---
sidebar_position: 2
title: RGB Asset Channels
description: Managing Lightning channels with RGB assets - opening, funding, balancing, and closing asset channels
---

# RGB Asset Channels

RGB asset channels extend standard Lightning channels to support RGB token balances alongside Bitcoin. This guide covers creating, managing, and closing channels that carry RGB assets.

## Channel Structure

### Dual Balance Tracking

RGB channels maintain separate balances for Bitcoin and each RGB asset:

```typescript
interface RgbChannel {
  channelId: string;
  peer: string;

  // Bitcoin balances (sats)
  bitcoin: {
    local: bigint;
    remote: bigint;
    capacity: bigint;
  };

  // RGB asset balances
  assets: Array<{
    contractId: string;
    ticker: string;
    local: bigint;
    remote: bigint;
    capacity: bigint;
  }>;

  state: 'opening' | 'active' | 'closing' | 'closed';
}
```

*Channel data structure to be expanded*

### Commitment Transactions

Each channel state includes RGB commitments:

```
Bitcoin Commitment TX:
Input:  Funding UTXO (2-of-2 multisig)
Output: Alice balance + RGB commitments
        Bob balance + RGB commitments
        (HTLCs if any)

RGB State:
Contract: rgb:2wHxKf...
Alice:    800 tokens
Bob:      200 tokens
```

*Commitment structure to be expanded*

## Opening Asset Channels

### Prerequisites

```bash
# Verify RGB asset ownership
rgb-wallet balance --contract-id rgb:2wHxKf...

# Check peer supports RGB
lnp-cli getnodeinfo 03abc... | grep rgb_enabled
```

*Prerequisites to be expanded*

### Funding with RGB Assets

```bash
# Open channel with RGB assets
lnp-cli openchannel \
  --peer 03abc...def \
  --bitcoin-amount 1000000 \
  --push-bitcoin 0 \
  --rgb-asset rgb:2wHxKf... \
  --rgb-amount 5000 \
  --rgb-push 0
```

Parameters:
- `bitcoin-amount`: Bitcoin channel capacity (sats)
- `push-bitcoin`: Initial Bitcoin to push to peer
- `rgb-asset`: RGB contract ID
- `rgb-amount`: Total RGB capacity
- `rgb-push`: Initial RGB to push to peer

*Channel opening to be expanded*

### Using RGB.js Lightning

```typescript
import { RgbLightning } from '@rgbjs/lightning';

const ln = new RgbLightning(config);

// Open RGB channel
const channel = await ln.openChannel({
  peer: '03abc...def',

  // Bitcoin funding
  bitcoinCapacity: 1000000n,
  bitcoinPush: 0n,

  // RGB funding
  rgbAssets: [
    {
      contractId: 'rgb:2wHxKf...',
      capacity: 5000n,
      push: 0n,
      fundingUtxo: myRgbUtxo
    }
  ],

  // Options
  feeRate: 5,
  privateChannel: false,
  minConfs: 3
});

console.log('Channel ID:', channel.id);
console.log('Funding TxID:', channel.fundingTxid);
```

*SDK implementation to be expanded*

### Multi-Asset Channels

Fund channel with multiple RGB assets:

```typescript
const multiAssetChannel = await ln.openChannel({
  peer: peerId,
  bitcoinCapacity: 2000000n,

  rgbAssets: [
    {
      contractId: 'rgb:tokenA...',
      capacity: 1000n
    },
    {
      contractId: 'rgb:tokenB...',
      capacity: 5000n
    },
    {
      contractId: 'rgb:nft...',
      capacity: 1n  // Single NFT
    }
  ]
});
```

*Multi-asset support to be expanded*

## Channel Lifecycle

### Funding Phase

```
1. Negotiate channel parameters
   ├─ Bitcoin capacity
   ├─ RGB assets and amounts
   └─ Fee rate

2. Create funding transaction
   ├─ Bitcoin UTXO → multisig
   └─ RGB assets → channel seal

3. Sign and broadcast
   └─ Wait for confirmations

4. Exchange commitment transactions
   └─ Channel becomes active
```

*Funding process to be expanded*

### Active Phase

Channel is ready for payments:

```bash
# Check channel status
lnp-cli listchannels --rgb

# View RGB balances
lnp-cli rgbbalance
```

```json
{
  "channel_id": "abc123...",
  "peer": "03def...",
  "state": "active",
  "bitcoin": {
    "local": 1000000,
    "remote": 0
  },
  "rgb_assets": [
    {
      "contract_id": "rgb:2wHxKf...",
      "ticker": "RGB",
      "local": 5000,
      "remote": 0
    }
  ]
}
```

*Active channel management to be expanded*

### Closing Phase

Cooperative or force close:

*To be expanded*

## Channel Updates

### RGB Payment Updates

Each RGB payment updates channel state:

```typescript
// Before payment
Channel State #42:
  Alice: 500,000 sats + 5000 RGB
  Bob:   500,000 sats + 0 RGB

// After 1000 RGB payment Alice → Bob
Channel State #43:
  Alice: 499,900 sats + 4000 RGB
  Bob:   500,100 sats + 1000 RGB

  (100 sats routing fee deducted from Alice)
```

*State update mechanics to be expanded*

### Commitment Protocol

```typescript
interface ChannelUpdate {
  commitmentNumber: number;

  // Bitcoin state update
  bitcoinUpdate: {
    aliceBalance: bigint;
    bobBalance: bigint;
  };

  // RGB state updates
  rgbUpdates: Array<{
    contractId: string;
    aliceBalance: bigint;
    bobBalance: bigint;
    stateProof: RgbProof;
  }>;

  // Signatures
  aliceSignature: Signature;
  bobSignature: Signature;
}
```

*Update protocol to be expanded*

## Balancing Channels

### Rebalancing RGB Assets

Move liquidity between channels:

```bash
# Circular rebalance
lnp-cli rebalance \
  --contract-id rgb:2wHxKf... \
  --amount 1000 \
  --from-channel abc123 \
  --to-channel def456
```

*Rebalancing strategies to be expanded*

### Liquidity Management

```typescript
// Check if can send payment
const canSend = await ln.checkOutboundLiquidity({
  contractId: 'rgb:...',
  amount: 1000n
});

if (!canSend) {
  // Rebalance or open new channel
  await ln.rebalanceChannel({
    channelId: channelId,
    contractId: contractId,
    targetLocal: 2000n
  });
}
```

*Liquidity management to be expanded*

### Submarine Swaps

Exchange on-chain RGB for in-channel balance:

*To be expanded*

## Channel Monitoring

### Balance Tracking

```typescript
// Monitor channel balances
ln.on('channel_update', (update) => {
  console.log('Channel updated:', update.channelId);

  update.rgbAssets.forEach(asset => {
    console.log(`${asset.ticker}:`);
    console.log(`  Local: ${asset.localBalance}`);
    console.log(`  Remote: ${asset.remoteBalance}`);
    console.log(`  Can send: ${asset.localBalance - reserve}`);
    console.log(`  Can receive: ${asset.remoteBalance - reserve}`);
  });
});
```

*Monitoring tools to be expanded*

### Channel State Backups

```bash
# Backup channel state
lnp-cli backupchannels \
  --output channels-backup.json \
  --include-rgb

# Restore channels
lnp-cli restorechannels \
  --input channels-backup.json
```

*Backup procedures to be expanded*

### Watchtowers

Protect against fraud:

```typescript
const watchtower = await ln.registerWatchtower({
  endpoint: 'https://watchtower.rgb.tech',
  contracts: ['rgb:2wHxKf...'],
  channels: [channelId1, channelId2]
});

// Watchtower monitors for old state broadcasts
```

*Watchtower integration to be expanded*

## Closing Channels

### Cooperative Close

Both parties agree to close:

```bash
# Close channel cooperatively
lnp-cli closechannel abc123 --rgb-settlement
```

Final settlement:
```
Bitcoin UTXO → Alice: 499,900 sats
RGB Seal → Alice: 4000 tokens

Bitcoin UTXO → Bob: 500,100 sats
RGB Seal → Bob: 1000 tokens
```

*Cooperative close to be expanded*

### Force Close

Unilateral channel closure:

```bash
# Force close channel
lnp-cli closechannel abc123 --force --rgb-settlement
```

Process:
1. Broadcast latest commitment transaction
2. Wait for timelock expiry
3. Claim funds with RGB state proofs
4. Settle RGB assets on-chain

*Force close to be expanded*

### Settlement Process

```typescript
const settlement = await ln.closeChannel({
  channelId: channelId,
  cooperative: true
});

// Bitcoin settlement
console.log('BTC TX:', settlement.bitcoinTx);

// RGB settlements
settlement.rgbSettlements.forEach(s => {
  console.log(`${s.ticker} settled:`);
  console.log(`  TX: ${s.txid}`);
  console.log(`  Amount: ${s.amount}`);
  console.log(`  Seal: ${s.seal}`);
});
```

*Settlement details to be expanded*

## Advanced Features

### Dual-Funded Channels

Both parties contribute assets:

```typescript
const dualFunded = await ln.openDualFundedChannel({
  peer: peerId,

  local: {
    bitcoinAmount: 1000000n,
    rgbAssets: [
      { contractId: 'rgb:...', amount: 2000n }
    ]
  },

  remote: {
    bitcoinAmount: 1000000n,
    rgbAssets: [
      { contractId: 'rgb:...', amount: 3000n }
    ]
  }
});
```

*Dual-funding to be expanded*

### Splicing

Add/remove funds without closing:

```bash
# Splice funds into channel
lnp-cli splicein \
  --channel abc123 \
  --bitcoin-amount 500000 \
  --rgb-asset rgb:2wHxKf... \
  --rgb-amount 1000
```

*Splicing to be expanded*

### Channel Factories

Efficiently create multiple channels:

*To be expanded*

## Security Best Practices

### Channel Limits

```yaml
channel_config:
  max_bitcoin_capacity: 16777215  # ~0.168 BTC
  max_rgb_capacity:
    rgb:2wHxKf...: 10000

  reserve:
    bitcoin: 1000  # sats
    rgb_percentage: 1  # 1% of capacity

  max_htlc_count: 483
  max_htlc_value:
    bitcoin: 1000000
    rgb_percentage: 10
```

*Security limits to be expanded*

### Fraud Prevention

Monitor for old state broadcasts:

*To be expanded*

### Backup Strategies

```typescript
// Automatic backup on each update
ln.on('channel_update', async (update) => {
  await backupManager.save({
    channelId: update.channelId,
    state: update.state,
    rgbProofs: update.rgbProofs,
    commitment: update.commitment
  });
});
```

*Backup best practices to be expanded*

## Troubleshooting

### Common Issues

**Channel stuck opening**
```
Error: Funding transaction not confirming
Solution: Check fee rate, potentially CPFP/RBF
```

**RGB balance mismatch**
```
Error: RGB state validation failed
Solution: Restore from backup, verify consignments
```

*Troubleshooting guide to be expanded*

## Related Documentation

- [RGB Lightning Overview](./overview.md)
- [Routing RGB Payments](./routing.md)
- [RGB20 Transfers](../rgb20/transferring-assets.md)
- [State Transitions](../contracts/state-transitions.md)
- [Consignments](../../technical-reference/consignments.md)
