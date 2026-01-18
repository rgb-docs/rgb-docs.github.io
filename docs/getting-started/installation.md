---
sidebar_position: 2
title: Installation
description: Install RGB Protocol tools and SDKs for development
---

# Installation

This guide covers installing RGB tools and SDKs for different development environments.

## Available Implementations

RGB has several implementations under active development:

### End-User Wallets

- **[BitMask](https://bitmask.app/)** - Browser extension wallet supporting RGB20 tokens and RGB21 NFTs on Bitcoin and Lightning
- **[MyCitadel](https://mycitadel.io/)** - Desktop wallet with RGB asset management

### Node Implementations

- **[rgb-node](https://github.com/RGB-WG/rgb-node)** - Reference RGB node implementation in Rust
- **[RGB Lightning Node](https://github.com/RGB-WG/rgb-lightning-node)** - Lightning Network node with RGB support

### Developer Tools

- **[rgb-cli](https://crates.io/crates/rgb-cli)** - Command-line interface for RGB operations
- **[rgbjs](https://www.npmjs.com/package/rgbjs)** - JavaScript/TypeScript SDK for web and Node.js

:::info Development Status
RGB is under active development. Test thoroughly on testnet before using on mainnet.
:::

## Prerequisites

Before installing RGB, ensure you have:

- **Bitcoin Node** or **Electrum Server** access
- **Rust** (for Rust development) - v1.75 or higher
- **Node.js** (for JavaScript development) - v18 or higher
- **Git** - For cloning repositories

## Rust Installation

RGB is primarily developed in Rust. To use the Rust SDK:

### Install Rust Toolchain

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Ensure you have the latest stable version
rustup update stable
```

### Install RGB CLI

```bash
# Install rgb-cli from crates.io
cargo install rgb-cli

# Verify installation
rgb --version
```

### Add RGB Libraries to Your Project

```toml title="Cargo.toml"
[dependencies]
rgb-core = "0.12"
rgb-std = "0.12"
rgb-wallet = "0.12"
rgb-contracts = "0.12"
```

## JavaScript/TypeScript Installation

For web and mobile development, use the rgbjs library:

### Install via npm

```bash
npm install rgbjs
```

### Install via yarn

```bash
yarn add rgbjs
```

### Install via pnpm

```bash
pnpm add rgbjs
```

### Basic Usage

```typescript
import { RGB } from 'rgbjs';

// Initialize RGB client
const rgb = new RGB({
  network: 'testnet',
  electrumUrl: 'ssl://electrum.blockstream.info:60002'
});
```

## Bitcoin Infrastructure

RGB requires access to Bitcoin blockchain data:

### Option 1: Full Bitcoin Node

```bash
# Install Bitcoin Core
# Follow instructions at https://bitcoin.org/en/download

# Configure bitcoin.conf for RGB usage
txindex=1
server=1
```

### Option 2: Electrum Server

RGB can work with Electrum servers for lighter infrastructure:

```bash
# Connect to public Electrum server
electrum.blockstream.info:50002 (mainnet)
electrum.blockstream.info:60002 (testnet)
```

### Option 3: Local Electrs

```bash
# Install and run electrs
git clone https://github.com/romanz/electrs
cd electrs
cargo build --release

# Run electrs
./target/release/electrs --network testnet
```

## Development Tools

### RGB Explorer (Optional)

```bash
# Install RGB explorer for debugging
cargo install rgb-explorer

# Run explorer
rgb-explorer --network testnet
```

### AluVM Debugger (Optional)

```bash
# Install AluVM debugger
cargo install aluvm-debugger
```

## Verify Installation

### Check RGB CLI

```bash
# Check version
rgb --version

# Show help
rgb --help

# List available commands
rgb help
```

:::warning Version Compatibility
Ensure your installed version matches this documentation:

**Expected output:**
```
rgb-cli 0.12.0 (or higher stable version)
```

**If you see a pre-release version** (e.g., `0.12.0-rc.3`):
- Pre-release versions are built from development branches
- Commands and APIs may not match this documentation
- Consider installing the stable release: `cargo install rgb-cli`
- Or refer to documentation in the specific git branch you're using

**To install a specific stable version:**
```bash
# Install latest stable
cargo install rgb-cli

# Or install specific version
cargo install rgb-cli --version 0.12.0
```
:::

### Test JavaScript Installation

```typescript
import { RGB } from 'rgbjs';

console.log('RGB SDK version:', RGB.version);
```

## Configuration

### Configure RGB Data Directory

```bash
# Set RGB data directory (optional)
export RGB_DATA_DIR="$HOME/.rgb"

# Create directory
mkdir -p $RGB_DATA_DIR
```

### Configure Network

```bash
# For testnet development
export RGB_NETWORK=testnet

# For mainnet (production)
export RGB_NETWORK=mainnet
```

## Docker Installation (Alternative)

For containerized development:

```dockerfile
FROM rust:latest

# Install RGB
RUN cargo install rgb-cli rgb-wallet

# Set working directory
WORKDIR /app

# Configure environment
ENV RGB_NETWORK=testnet
ENV RGB_DATA_DIR=/app/.rgb

CMD ["rgb", "--help"]
```

## Next Steps

- [**Quick Start**](/getting-started/quick-start) - Build your first RGB contract
- [**Core Concepts**](/core-concepts/overview) - Understand RGB architecture
- [**Development Guide**](/guides/development/rust-sdk) - Start developing with RGB

## Troubleshooting

### Common Issues

**Issue: `cargo install` fails**
- Ensure Rust is up to date: `rustup update`
- Check you have build tools installed

**Issue: Electrum connection fails**
- Verify server URL and port
- Check firewall settings
- Try alternative Electrum servers

**Issue: Node.js module errors**
- Ensure Node.js v18 or higher
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies

## Additional Resources

- [RGB GitHub](https://github.com/RGB-WG)
- [rgbjs Documentation](https://rgbjs.com)
- [Rust Installation Guide](https://www.rust-lang.org/tools/install)
