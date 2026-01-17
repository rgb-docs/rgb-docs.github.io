---
sidebar_position: 3
title: Secondary Issuance
description: Implement controlled secondary issuance for RGB20 tokens including inflation schedules and token burning
---

# Secondary Issuance

RGB20 tokens support sophisticated secondary issuance mechanisms allowing controlled token supply management. This guide covers inflation schedules, token burning, and governance-controlled issuance.

## Overview

Secondary issuance enables token creators to mint additional tokens after genesis according to predefined rules. RGB20 v0.12 provides flexible inflation control mechanisms built into the schema.

### Issuance Models

- **Fixed Cap**: No secondary issuance allowed (like Bitcoin)
- **Capped Inflation**: Limited additional issuance up to a maximum
- **Scheduled Issuance**: Time-based release schedules
- **Governance Issuance**: Minting controlled by external conditions
- **Uncapped**: Unlimited issuance (use with caution)

*Detailed models to be expanded*

## Configuring Secondary Issuance

### At Genesis

Define issuance rules when creating the token:

```bash
# Create token with secondary issuance
rgb create-token \
  --name "Inflatable Token" \
  --ticker INFL \
  --precision 8 \
  --initial-supply 1000000 \
  --max-supply 10000000 \
  --issuance-schedule linear \
  --issuance-rate 100000 \
  --issuance-interval 2016  # blocks
```

*Genesis configuration to be expanded*

### Schema Fields

```yaml
secondary_issuance:
  enabled: true
  max_supply: 10000000
  issuance_rights: "utxo_based"  # or "signature_based"
  inflation_schedule:
    type: "linear"  # or "exponential", "stepped", "none"
    rate: 100000
    interval: 2016  # Bitcoin blocks
```

*Schema structure to be expanded*

## Issuance Rights Management

### UTXO-Based Rights

Issuance rights tied to a specific UTXO (single-use-seal):

```bash
# Issue additional tokens using rights UTXO
rgb-wallet issue-secondary \
  --asset-id <asset-id> \
  --amount 100000 \
  --rights-utxo <utxo> \
  --new-rights-utxo <new-utxo>
```

*UTXO-based issuance to be expanded*

### Signature-Based Rights

Issuance controlled by specific public keys:

```typescript
import { RgbContract, IssuanceRights } from '@rgbjs/core';

const rights = IssuanceRights.fromPublicKey(issuerPubkey);
const issuance = await contract.issueSecondary({
  amount: 100000n,
  rights: rights,
  signature: await signer.sign(issuanceCommitment)
});
```

*Signature-based issuance to be expanded*

### Multi-Signature Issuance

Require multiple parties to approve issuance:

*To be expanded*

## Inflation Schedules

### Linear Inflation

Constant amount issued per time period:

```
Block 0:     1,000,000 tokens
Block 2016:  1,100,000 tokens
Block 4032:  1,200,000 tokens
...
```

*Linear schedule implementation to be expanded*

### Exponential Decay

Decreasing issuance rate over time (Bitcoin-like):

```
Year 1: 1,000,000 tokens issued
Year 2:   500,000 tokens issued
Year 3:   250,000 tokens issued
...
```

*Exponential schedule to be expanded*

### Stepped Schedule

Discrete issuance events:

```yaml
steps:
  - block_height: 100000
    amount: 500000
  - block_height: 200000
    amount: 300000
  - block_height: 300000
    amount: 200000
```

*Stepped schedule to be expanded*

### Custom Schedules

Implement arbitrary issuance logic:

*To be expanded*

## Executing Secondary Issuance

### Via CLI

```bash
# Check issuance rights
rgb-wallet rights --asset-id <asset-id>

# Execute issuance
rgb-wallet issue \
  --asset-id <asset-id> \
  --amount 100000 \
  --rights-seal <seal> \
  --recipient <blinded-utxo>
```

*CLI workflow to be expanded*

### Via RGB.js SDK

```typescript
import { RgbWallet, SecondaryIssuance } from '@rgbjs/core';

const wallet = new RgbWallet(config);

// Check if issuance is available
const rights = await wallet.getIssuanceRights(assetId);
if (!rights.canIssue()) {
  throw new Error('No issuance rights or limit reached');
}

// Create issuance transaction
const issuance = await wallet.createSecondaryIssuance({
  assetId: assetId,
  amount: 100000n,
  rightsSeal: rights.currentSeal,
  newRightsSeal: await wallet.createBlindedUTXO(),
  recipient: recipientInvoice
});

await issuance.sign();
await issuance.broadcast();
```

*SDK implementation to be expanded*

## Token Burning

### Provable Burns

Permanently remove tokens from circulation:

```bash
# Burn tokens
rgb-wallet burn \
  --asset-id <asset-id> \
  --amount 50000 \
  --proof-output burn-proof.rgb
```

*Burning mechanism to be expanded*

### Burn-and-Mint

Replace old tokens with new tokens:

*To be expanded*

### Supply Tracking

Monitor total supply including burns:

```typescript
const supply = await contract.getTotalSupply();
console.log(`Issued: ${supply.issued}`);
console.log(`Burned: ${supply.burned}`);
console.log(`Circulating: ${supply.circulating}`);
```

*Supply tracking to be expanded*

## Governance Integration

### External Oracles

Trigger issuance based on external conditions:

*To be expanded*

### DAO-Controlled Issuance

Multi-signature schemes for decentralized control:

*To be expanded*

### Proof-of-Reserves

Backing secondary issuance with verifiable reserves:

*To be expanded*

## Security Considerations

### Issuance Limits

Prevent uncontrolled inflation:

- Set maximum supply cap
- Implement rate limiting
- Use time-locks
- Require multi-party approval

*Security measures to be expanded*

### Rights Revocation

Permanently disable future issuance:

```bash
# Burn issuance rights
rgb-wallet revoke-rights --asset-id <asset-id>
```

*Revocation process to be expanded*

### Audit Trail

All issuance events are permanently recorded:

*To be expanded*

## Migration Strategies

### Upgrading Issuance Rules

Moving from one issuance model to another:

*To be expanded*

### Token Swaps

Replacing old contracts with new issuance rules:

*To be expanded*

## Use Cases

### Stablecoin Collateral Management

Issue tokens when collateral is deposited:

*To be expanded*

### Reward Distributions

Scheduled rewards for network participants:

*To be expanded*

### Treasury Management

Controlled token releases from project treasury:

*To be expanded*

## Best Practices

1. **Set Conservative Limits**: Always define maximum supply cap
2. **Transparency**: Publish issuance schedule publicly
3. **Decentralize Control**: Use multi-sig for issuance rights
4. **Audit Regularly**: Monitor total supply and issuance events
5. **Emergency Stops**: Plan for halting issuance if needed

*Best practices to be expanded*

## Related Documentation

- [Creating RGB20 Tokens](./issuing-assets.md)
- [Transferring Assets](./transferring-assets.md)
- [RGB20 Schema](../contracts/schemas.md)
- [Genesis Contracts](../contracts/genesis.md)
- [State Transitions](../contracts/state-transitions.md)
- [Single-Use-Seals](../../core-concepts/single-use-seals.md)
