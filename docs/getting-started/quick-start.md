---
sidebar_position: 3
title: Quick Start
description: Build your first RGB asset in 5 minutes
---

# Quick Start

:::info Version
This guide targets **RGB v0.12.0-rc.3** (current production version). Commands may differ in other versions.
:::

This quick start guide will walk you through creating your first RGB fungible asset (RGB20 token) in just a few minutes.

## Prerequisites

- RGB CLI installed ([Installation Guide](/getting-started/installation))
- Access to Bitcoin testnet
- Basic command line knowledge

## Step 1: Initialize RGB Data Directory

First, initialize the RGB data directory:

```bash
# Initialize data directory
rgb init

# Verify initialization
rgb wallets
```

This creates the data directory structure required for RGB operations.

## Step 2: Create and Fund Wallet

Create a new wallet with a descriptor:

```bash
# Create a new wallet with taproot support
rgb create --tapret-key-only my-wallet "tr([fingerprint/84h/1h/0h]xpub...)"

# Get a funding address
rgb fund --wallet my-wallet

# Fund the address using a testnet faucet
# Visit: https://testnet-faucet.com
```

## Step 3: Create an RGB20 Token

Now create your first fungible token. First, create a parameters file:

```yaml
# token-params.yaml
issuer: "ssi:anonymous"
ticker: "MYT"
name: "My Token"
precision: 8
supply: 1000000
allocations:
  - method: TapretFirst
    seal: "<UTXO_OUTPOINT>"
    amount: 1000000
```

Then issue the contract:

```bash
# Issue a new RGB20 token
rgb issue --wallet my-wallet token-params.yaml
```

The contract will be imported into your wallet's contract store automatically.

## Step 4: Inspect the Contract

View your newly created contract:

```bash
# List all contracts
rgb contracts

# Display detailed contract state
rgb state --wallet my-wallet <CONTRACT_ID>

# Export contract to a file
rgb backup <CONTRACT_ID> my-token.rgb
```

## Step 5: Transfer Tokens

To transfer tokens to another party:

```bash
# Recipient generates an invoice
rgb invoice --wallet recipient-wallet \
  <CONTRACT_ID> \
  100

# The recipient shares the invoice with the sender
# Sender pays the invoice, creating a PSBT and consignment
rgb pay --wallet my-wallet \
  <INVOICE_STRING> \
  transfer.consignment \
  transfer.psbt

# Sender signs the PSBT (using their Bitcoin wallet)
# Then completes the operation
rgb complete --wallet my-wallet \
  transfer.bundle \
  signed.psbt

# Send consignment file to recipient
# Recipient accepts the transfer
rgb accept --wallet recipient-wallet transfer.consignment
```

## Step 6: Verify Your Balance

Check your token balances:

```bash
# View all contract states owned by your wallet
rgb state --wallet my-wallet --owned

# Show specific contract balance
rgb state --wallet my-wallet <CONTRACT_ID>
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

Create a params file for RGB21 and issue:

```bash
# nft-params.yaml
rgb issue --wallet my-wallet nft-params.yaml
```

### Batch Transfers with Payment Scripts

```bash
# Create payment script for multiple beneficiaries
rgb script --wallet my-wallet \
  <INVOICE> \
  payment.yaml

# Execute script to create bundle and PSBT
rgb exec --wallet my-wallet \
  payment.yaml \
  payment.bundle \
  1000
```

### Synchronizing Wallet

Keep your wallet synchronized with the blockchain:

```bash
# Sync wallet with Electrum server
rgb sync --wallet my-wallet \
  --electrum ssl://electrum.blockstream.info:60002
```

## Troubleshooting

### "Insufficient funds" error

Ensure your Bitcoin address has testnet BTC for fees:
```bash
rgb fund --wallet my-wallet
# Fund the address shown with testnet BTC
```

### "Contract validation failed"

Verify your wallet is synchronized:
```bash
rgb sync --wallet my-wallet \
  --electrum ssl://electrum.blockstream.info:60002
```

### View wallet seals

Check available UTXOs for RGB operations:
```bash
rgb seals --wallet my-wallet
```

### List all wallets

See all available wallets:
```bash
rgb wallets
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
