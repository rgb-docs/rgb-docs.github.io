---
sidebar_position: 1
title: Guides Overview
description: Practical guides for building with RGB
---

# RGB Guides Overview

This section provides practical, hands-on guides for building applications with RGB v0.12. Whether you're creating fungible tokens, NFTs, complex smart contracts, or integrating RGB into existing applications, these guides will help you get started.

## Quick Navigation

### Token Development
- [**RGB20 Tokens**](./rgb20/creating-tokens.md) - Fungible token standard
  - Creating tokens
  - Transferring assets
  - Secondary issuance
  - Supply management

### NFT Development
- [**RGB21 NFTs**](./rgb21/creating-nfts.md) - Non-fungible token standard
  - Creating NFTs
  - Metadata and attachments
  - Transferring NFTs
  - Royalties and rights

### Smart Contracts
- [**Contract Development**](./contracts/schemas.md) - Building custom contracts
  - Schema design
  - Contractum language
  - Genesis creation
  - State transitions
  - Validation logic

### Lightning Network
- [**Lightning Integration**](./lightning/overview.md) - RGB on Lightning
  - Asset channels
  - Routing RGB payments
  - Channel management
  - Liquidity

### Development
- [**Development Guides**](./development/rust-sdk.md) - Building applications
  - Rust SDK
  - RGB.js
  - Wallet integration
  - Testing strategies

## Getting Started

### Prerequisites

*To be expanded: What you need to know*

Before starting with RGB development:
- **Bitcoin basics**: UTXOs, transactions, scripts
- **Programming**: Rust or TypeScript/JavaScript
- **Cryptography**: Hashes, signatures, commitments
- **Development tools**: Git, package managers

### Choosing Your Path

*To be expanded: Guide selection*

**For fungible assets** → Start with [RGB20 guide](./rgb20/creating-tokens.md)

**For unique assets/NFTs** → Start with [RGB21 guide](./rgb21/creating-nfts.md)

**For custom logic** → Start with [Contracts guide](./contracts/schemas.md)

**For Lightning** → Start with [Lightning guide](./lightning/overview.md)

**For integration** → Start with [Development guide](./development/wallet-integration.md)

## Development Environment

### Tools and SDKs

*To be expanded: Development tools*

Available tooling:
- **rgb-sdk**: Rust library for RGB operations
- **rgbjs**: JavaScript/TypeScript implementation
- **rgb-cli**: Command-line interface
- **rgb-wallet**: Reference wallet implementation

### Networks

*To be expanded: Testing networks*

Development networks:
- **Regtest**: Local testing
- **Signet**: Public test network
- **Testnet**: Bitcoin testnet
- **Mainnet**: Production network

## Common Patterns

### Asset Creation

*To be expanded: Creating assets*

Typical workflow:
1. Design schema (or use standard)
2. Create genesis transaction
3. Issue initial supply
4. Distribute to holders

### Asset Transfers

*To be expanded: Transfer patterns*

Transfer process:
1. Validate current state
2. Create state transition
3. Commit to Bitcoin
4. Generate consignment
5. Send to recipient

### Multi-Asset Operations

*To be expanded: Handling multiple assets*

Coordinating operations:
- Batched transfers
- Atomic swaps
- Multi-protocol transactions

## Best Practices

### Security

*To be expanded: Security guidelines*

- Always validate full history
- Verify Bitcoin commitments
- Secure private keys
- Test thoroughly
- Audit contracts

### Privacy

*To be expanded: Privacy best practices*

- Use Tapret commitments
- Avoid address reuse
- Consider CoinJoin
- Minimize data disclosure

### Efficiency

*To be expanded: Optimization tips*

- Batch operations
- Prune history when possible
- Optimize state size
- Cache validation results

## Example Projects

### Simple Token

*To be expanded: Basic token example*

Complete example: [Simple RGB20 Token](./rgb20/creating-tokens.md)

### NFT Collection

*To be expanded: NFT project example*

Complete example: [RGB21 NFT Collection](./rgb21/creating-nfts.md)

### DAO

*To be expanded: DAO example*

Complete example: [DAO Contract](./contracts/schemas.md)

### Lightning Asset Wallet

*To be expanded: Lightning example*

Complete example: [Lightning Asset Wallet](./lightning/asset-channels.md)

## Troubleshooting

Common issues and solutions in [Troubleshooting Guide](../technical-reference/troubleshooting.md)

## Community Resources

- **Discord**: RGB developer community
- **GitHub**: RGB repositories and issues
- **Documentation**: Technical reference
- **Examples**: Sample projects

## Next Steps

Choose a guide based on your needs:

- 📘 [Create RGB20 Tokens](./rgb20/creating-tokens.md)
- 🎨 [Create RGB21 NFTs](./rgb21/creating-nfts.md)
- ⚡ [RGB on Lightning](./lightning/overview.md)
- 🔧 [Wallet Integration](./development/wallet-integration.md)

---

**Status**: Overview complete - Individual guides provide detailed implementations.
