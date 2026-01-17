---
sidebar_position: 3
title: Quick Start
description: Build your first RGB asset in 5 minutes
---

# Quick Start

This quick start guide will walk you through creating your first RGB fungible asset (RGB20 token) in just a few minutes.

:::info Documentation Version
This documentation targets **RGB v0.12.0 (stable release)**. If you're using pre-release versions like `v0.12.0-rc.3`, command syntax and APIs may differ. For RC versions, refer to the [version compatibility notes](#version-compatibility-notes) at the bottom of this page.
:::

## Prerequisites

- RGB CLI installed ([Installation Guide](/getting-started/installation))
- Access to Bitcoin testnet
- Basic command line knowledge

## Step 1: Initialize RGB Wallet

First, create a new RGB wallet:

```bash
# Create new wallet
rgb wallet create my-wallet --network testnet

# Generate a new Bitcoin address
rgb address new
```

This creates a local wallet database and generates Bitcoin addresses for RGB operations.

## Step 2: Fund Your Wallet

You'll need some testnet Bitcoin for transaction fees:

```bash
# Get your Bitcoin address
rgb address list

# Fund it using a testnet faucet
# Visit: https://testnet-faucet.com
```

## Step 3: Create an RGB20 Token

Now create your first fungible token:

```bash
# Issue a new RGB20 token
rgb issue \
  --schema RGB20 \
  --name "My Token" \
  --ticker MYT \
  --precision 8 \
  --supply 1000000 \
  --output my-token.rgb
```

This creates:
- Token name: "My Token"
- Ticker: MYT
- Decimal precision: 8
- Initial supply: 1,000,000 MYT

## Step 4: Inspect the Contract

View your newly created contract:

```bash
# Display contract details
rgb contract show my-token.rgb

# Get contract ID
rgb contract id my-token.rgb
```

## Step 5: Transfer Tokens

To transfer tokens to another party:

```bash
# Recipient generates an invoice
rgb invoice create \
  --contract <CONTRACT_ID> \
  --amount 100 \
  --output invoice.txt

# Sender creates transfer
rgb transfer \
  --invoice invoice.txt \
  --output consignment.rgb

# Send consignment file to recipient
# Recipient accepts the transfer
rgb accept consignment.rgb
```

## Step 6: Verify Your Balance

Check your token balances:

```bash
# List all assets
rgb balance

# Show specific contract balance
rgb balance --contract <CONTRACT_ID>
```

## Understanding What Happened

### Client-Side Validation

Your token was created entirely **off-chain**. The Bitcoin blockchain only contains cryptographic commitments, not the token data itself.

### Consignments

The `consignment.rgb` file contains all validation data needed for the recipient to verify ownership. This is RGB's client-side validation in action.

### Bitcoin UTXO Binding

Each transfer spends a Bitcoin UTXO (binding old state) and creates new UTXOs for the recipient (binding new state), leveraging Bitcoin's existing double-spend prevention.

## Next Steps with JavaScript

Create the same token using rgbjs:

```typescript
import { RGB, RGB20 } from 'rgbjs';

// Initialize RGB
const rgb = new RGB({
  network: 'testnet',
  electrumUrl: 'ssl://electrum.blockstream.info:60002'
});

// Issue RGB20 token
const contract = await RGB20.issue({
  name: 'My Token',
  ticker: 'MYT',
  precision: 8,
  supply: 1000000n,
});

console.log('Contract ID:', contract.contractId);
```

## Common Workflows

### Creating an NFT (RGB21)

```bash
rgb issue \
  --schema RGB21 \
  --name "My NFT Collection" \
  --supply 100 \
  --output my-nft.rgb
```

### Batch Transfers

```bash
# Create payment script for multiple beneficiaries
rgb payment-script create \
  --beneficiary alice.invoice \
  --beneficiary bob.invoice \
  --output batch-payment.script

# Execute batch payment
rgb transfer --script batch-payment.script
```

### Lightning Integration

```bash
# Open RGB-enabled Lightning channel
rgb lightning open-channel \
  --contract <CONTRACT_ID> \
  --peer <NODE_ID> \
  --amount 1000
```

## Troubleshooting

### "Insufficient funds" error

Ensure your Bitcoin address has testnet BTC for fees:
```bash
rgb address list
# Fund the address shown
```

### "Contract validation failed"

Check that the consignment file is complete:
```bash
rgb validate consignment.rgb --verbose
```

### "Electrum connection failed"

Try an alternative server:
```bash
export RGB_ELECTRUM_URL=ssl://electrum.blockstream.info:60002
```

## Learning Resources

Now that you've created your first RGB asset, explore:

- [**Core Concepts**](/core-concepts/overview) - Understand how RGB works
- [**RGB20 Guide**](/guides/rgb20/creating-tokens) - Advanced fungible assets
- [**RGB21 Guide**](/guides/rgb21/creating-nfts) - Create NFTs
- [**Smart Contracts**](/guides/contracts/schemas) - Build custom contracts

## Example Projects

Check out these complete examples:

- [RGB20 Stablecoin](https://github.com/RGB-WG/rgb-examples/tree/main/stablecoin)
- [RGB21 NFT Collection](https://github.com/RGB-WG/rgb-examples/tree/main/nft)
- [Lightning Asset Wallet](https://github.com/RGB-WG/rgb-examples/tree/main/lightning)

## Get Help

- [FAQ](/technical-reference/faq) - Common questions
- [Troubleshooting](/technical-reference/troubleshooting) - Debug issues
- [Telegram](https://t.me/rgbtelegram) - Community support

## Version Compatibility Notes

:::warning Working with Pre-Release Versions
If you're using RGB from development branches (e.g., `v0.12.0-rc.1`, `v0.12.0-rc.2`, `v0.12.0-rc.3`), be aware that:

1. **Command syntax may differ** - CLI commands in release candidates may use different flags or parameters
2. **APIs may be unstable** - Function signatures and module structures can change between RC versions
3. **Breaking changes are possible** - Pre-release versions don't guarantee backward compatibility

**Recommended Actions:**
- **For Learning**: Use the stable v0.12.0 release (or later) that matches this documentation
- **For Development**: If using an RC version, consult the specific branch documentation:
  ```bash
  # Clone the RGB repository at the specific version
  git clone --branch v0.12.0-rc.3 https://github.com/RGB-WG/rgb
  
  # Check the README and examples in that branch
  cd rgb && cat README.md
  ```
- **For Production**: Always use stable releases with the forward compatibility guarantee

**Version Identification:**
```bash
# Check your RGB CLI version
rgb --version

# For cargo installations, check the exact version
cargo install --list | grep rgb
```

If you encounter command mismatches, verify you're using a stable v0.12.x release that matches this documentation, or refer to the documentation in the specific branch you're working with.
:::
