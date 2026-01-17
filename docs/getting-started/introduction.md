---
sidebar_position: 1
title: Introduction to RGB
description: Learn about RGB Protocol v0.12 - Smart contracts for Bitcoin and Lightning Network
---

# Introduction to RGB

RGB is a suite of protocols for scalable and confidential smart contracts on Bitcoin and the Lightning Network. It enables complex smart contracts without introducing new tokens or requiring blockchain modifications.

## What is RGB?

RGB represents a "post-blockchain" paradigm that fundamentally reverses traditional blockchain validation. Instead of every network participant validating all transactions, **each party validates only their own transaction history** relevant to assets they receive.

### Key Features

- **Client-Side Validation**: All smart contract code and data is kept off the Bitcoin blockchain
- **Privacy by Design**: One-way cryptographic hashing obscures original transaction details
- **Lightning Network Integration**: Seamless asset transfers across payment channels
- **Turing-Complete**: Full smart contract capabilities via AluVM virtual machine
- **Bitcoin-Native**: Uses Bitcoin as a timestamping and anti-double-spending layer

## RGB v0.12: Production Ready

Version 0.12, released July 10, 2025, is the final production-ready consensus layer following 8 months of protocol redesign. This version achieves **forward compatibility**, meaning contracts issued with v0.12 will remain compatible with future releases.

### Major Improvements in v0.12

- **zk-STARK Readiness**: Complete re-architecture for zero-knowledge proof integration
- **State Unification**: Simplified to a single finite field element state type
- **4x Code Reduction**: Dramatically simplified consensus codebase
- **Enhanced Performance**: Orders of magnitude faster validation
- **Payment Scripts**: Multi-beneficiary, multi-contract transactions support

## Core Concepts

RGB is built on three fundamental concepts:

1. **Client-Side Validation**: Validation happens on the client side, not on the blockchain
2. **Single-Use Seals**: Using Bitcoin UTXOs (which can only be spent once) to prevent double-spending
3. **PRISM Computing**: Partially-Replicated Infinite State Machines

These concepts enable RGB to provide scalability, privacy, and complex smart contract functionality while leveraging Bitcoin's security.

## Use Cases

RGB enables a wide range of applications:

- **Fungible Assets (RGB20)**: Stablecoins, utility tokens, securities
- **NFTs (RGB21)**: Digital art, collectibles, unique digital items
- **DeFi**: Decentralized exchanges, lending, liquidity pools
- **Lightning Network**: Instant asset transfers across payment channels
- **Identity Systems**: Self-issued identity (RGB22)
- **Audit Logs**: Transparent audit frameworks (RGB23)

## Getting Started

Ready to start building with RGB?

1. [**Install RGB**](/getting-started/installation) - Set up your development environment
2. [**Quick Start**](/getting-started/quick-start) - Build your first RGB contract
3. [**Explore Core Concepts**](/core-concepts/overview) - Deep dive into RGB architecture

## Community and Resources

- [GitHub](https://github.com/RGB-WG) - Source code and development
- [RGB.tech](https://rgb.tech) - Official website
- [rgbjs.com](https://rgbjs.com) - JavaScript/TypeScript SDK
- [FAQ](https://www.rgbfaq.com) - Frequently asked questions
- [Telegram](https://t.me/rgbtelegram) - Community chat

## Next Steps

- [**Installation Guide**](/getting-started/installation) - Install RGB tools
- [**What's New in 0.12**](/getting-started/whats-new-0-12) - Learn about the latest features
