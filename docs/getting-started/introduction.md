---
sidebar_position: 1
title: Introduction to RGB
description: Learn about RGB Protocol v0.12 - Smart contracts for Bitcoin and Lightning Network
---

# RGB Protocol: Smart Contracts for Bitcoin

<div style={{textAlign: 'center', margin: '2rem 0', fontSize: '1.3rem', color: 'var(--ifm-color-primary)'}}>
<strong>Scalable • Confidential • Lightning-Fast</strong>
</div>

:::tip Production Ready - v0.12
RGB is now **production-ready** with forward compatibility guarantees. Contracts issued with v0.12 will remain compatible with all future versions.
:::

## What is RGB?

RGB enables **Turing-complete smart contracts** on Bitcoin and Lightning Network without blockchain modifications, new tokens, or consensus changes. It represents a fundamental paradigm shift:

```
Traditional Blockchain: Everyone validates everything
RGB: You only validate what affects you
```

This **client-side validation** approach delivers:

<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', margin: '2rem 0'}}>

<div style={{padding: '1.5rem', border: '2px solid var(--ifm-color-primary)', borderRadius: '8px'}}>
<h3>⚡ 100x Faster</h3>
<p>5ms validation vs 500ms in v0.11</p>
</div>

<div style={{padding: '1.5rem', border: '2px solid var(--ifm-color-primary)', borderRadius: '8px'}}>
<h3>🔒 Total Privacy</h3>
<p>Zero on-chain contract data</p>
</div>

<div style={{padding: '1.5rem', border: '2px solid var(--ifm-color-primary)', borderRadius: '8px'}}>
<h3>♾️ Infinite Scale</h3>
<p>Validation cost independent of network size</p>
</div>

<div style={{padding: '1.5rem', border: '2px solid var(--ifm-color-primary)', borderRadius: '8px'}}>
<h3>💎 Bitcoin Security</h3>
<p>Inherits full Bitcoin PoW guarantees</p>
</div>

</div>

## See RGB in Action

### Issue a Token (RGB20)

```bash
# Create a fungible token with complete privacy
rgb issue \
  --schema RGB20 \
  --ticker "USDT" \
  --name "Tether USD" \
  --precision 8 \
  --supply 1000000 \
  --seal "bc1q...#0"

# ✓ Issued in seconds
# ✓ Zero blockchain footprint
# ✓ Lightning Network compatible
```

### Create an NFT (RGB21)

```typescript
// Issue unique digital asset with embedded media
const nft = await RGB21.issue({
  name: "RGB Genesis NFT",
  description: "First NFT on Bitcoin via RGB",
  media: await ipfs.upload(artworkFile),
  preview: embedThumbnail(64), // Embedded preview
  royalties: 5.0 // 5% creator royalty
});

// ✓ No token needed
// ✓ Unlimited metadata
// ✓ True Bitcoin ownership
```

## Why RGB Changes Everything

### Client-Side Validation Revolution

| Ethereum/Traditional | RGB Protocol |
|---------------------|--------------|
| Global state on-chain | Private state off-chain |
| Everyone validates everything | You validate only your data |
| Gas fees for computation | Zero network computation cost |
| Public transaction data | Cryptographically private |
| 15 TPS (Ethereum) | **Unlimited TPS** |
| Smart contract size limits | No size limits |

:::info How It Works
RGB uses Bitcoin **only** for timestamping and preventing double-spends. All contract logic, state transitions, and data remain completely off-chain and private to the parties involved.
:::

## Three Revolutionary Technologies

### 1. Client-Side Validation
**You validate only what you receive**. No global consensus needed. Scales infinitely.

```rust
// Traditional blockchain
fn validate(block) -> bool {
    verify_all_transactions(block) // ❌ Everyone validates everything
}

// RGB Protocol
fn validate(consignment) -> bool {
    verify_my_history(consignment) // ✅ Only validate your data
}
```

### 2. Single-Use Seals (Bitcoin UTXOs)
Bitcoin's UTXO model provides **natural prevention** of double-spending. RGB contracts "seal" state to specific UTXOs.

```
Contract State ──→ Sealed to UTXO ──→ Spent Once ──→ New State
                   (Bitcoin enforces single-use)
```

### 3. AluVM: Zero-Knowledge Ready VM

**40 instructions**. Turing-complete. Formally verifiable. zk-STARK ready.

```
EVM:          ~140 opcodes, stack-based, gas metering
WASM:         ~400 instructions, complex execution model
AluVM:        40 instructions, register-based, deterministic
              ✓ 10x smaller
              ✓ 100x faster validation
              ✓ Zero-knowledge proof compatible
```

## What You Can Build Today

<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', margin: '2rem 0'}}>

<div style={{padding: '1.5rem', background: 'var(--ifm-background-surface-color)', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-200)'}}>

### 💰 RGB20: Fungible Assets
**Stablecoins, securities, loyalty points**

```typescript
// USDT on Bitcoin with Lightning
const usdt = await RGB20.issue({
  ticker: "USDT",
  supply: 1000000000n,
  precision: 6
});

// Instant Lightning transfers
await lightning.send(invoice, 1000);
```

</div>

<div style={{padding: '1.5rem', background: 'var(--ifm-background-surface-color)', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-200)'}}>

### 🎨 RGB21: NFTs & Digital Art
**True ownership, unlimited metadata**

```typescript
// NFT with royalties
const artwork = await RGB21.issue({
  name: "Digital Masterpiece",
  media: ipfsHash,
  royalties: 10.0, // 10%
  attachments: [certificate, provenance]
});
```

</div>

<div style={{padding: '1.5rem', background: 'var(--ifm-background-surface-color)', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-200)'}}>

### 🔄 DeFi on Bitcoin
**DEXs, lending, liquidity pools**

```typescript
// Decentralized exchange
const dex = await RGB.create({
  type: "AMM",
  pairs: [
    { tokenA: btc, tokenB: usdt },
    { tokenA: btc, tokenB: weth }
  ]
});
```

</div>

<div style={{padding: '1.5rem', background: 'var(--ifm-background-surface-color)', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-200)'}}>

### ⚡ Lightning Network Assets
**Instant, low-cost transfers**

```bash
# Open RGB-enabled channel
rgb lightning open \
  --capacity 1000000 \
  --asset USDT

# Route multi-hop payments
rgb lightning pay lnrgb1...
# ✓ Millisecond settlement
# ✓ Satoshi-level fees
```

</div>

<div style={{padding: '1.5rem', background: 'var(--ifm-background-surface-color)', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-200)'}}>

### 🆔 Identity & Credentials
**Self-sovereign identity**

```typescript
// RGB22: Verifiable credentials
const credential = await RGB22.issue({
  holder: userDID,
  claims: {
    name: "Alice",
    verified: true,
    issuer: govDID
  }
});
```

</div>

<div style={{padding: '1.5rem', background: 'var(--ifm-background-surface-color)', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-200)'}}>

### 📊 Audit & Compliance
**Transparent audit logs**

```typescript
// RGB23: Immutable audit trail
const auditLog = await RGB23.create({
  entries: auditEvents,
  verifiable: true,
  public: false // Private by default
});
```

</div>

</div>

## Why Developers Choose RGB

:::tip **Developer Experience**
```bash
# Install CLI
cargo install rgb-cli

# Issue token in 3 commands
rgb init
rgb create-wallet
rgb issue --schema RGB20 --ticker TKN --supply 1000000

# Deploy to production immediately
# No blockchain fees • No gas • No waiting
```
:::

### Comparison with Alternatives

| Feature | RGB | Ethereum L2 | Liquid/RSK | Stacks |
|---------|-----|-------------|------------|--------|
| **Privacy** | Total | Partial | Moderate | None |
| **Scalability** | Unlimited | 1000s TPS | 100s TPS | ~30 TPS |
| **Bitcoin Security** | Native | Bridged | Federated | Anchored |
| **Smart Contracts** | Turing-complete | Turing-complete | Turing-complete | Clarity |
| **Lightning Compatible** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Transaction Cost** | Bitcoin fee only | L2 + bridge fees | Network fees | STX fees |
| **Blockchain Data** | Zero | Rollup data | Full state | Full state |

## Start Building in 5 Minutes

<div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', borderRadius: '12px', color: 'white', margin: '2rem 0'}}>

### 🚀 Quick Start Path

1. **[Install RGB](/getting-started/installation)** - 2 minutes
2. **[Create Your First Token](/getting-started/quick-start)** - 3 minutes
3. **[Deploy to Production](/guides/rgb20/creating-tokens)** - Now

**Total time: Less than 5 minutes**

[Get Started Now →](/getting-started/installation)

</div>

## Join the RGB Community

- **[GitHub](https://github.com/RGB-WG)** - 2000+ stars, actively developed
- **[Telegram](https://t.me/rgbtelegram)** - 5000+ developers
- **[Twitter](https://twitter.com/rgb_protocol)** - Latest updates
- **[RGB.tech](https://rgb.tech)** - Official website & blog
- **[rgbjs.com](https://rgbjs.com)** - JavaScript/TypeScript SDK
- **[FAQ](https://www.rgbfaq.com)** - Common questions answered

## What's Next?

<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', margin: '2rem 0'}}>

<a href="/getting-started/installation" style={{textDecoration: 'none', color: 'inherit'}}>
<div style={{padding: '1.5rem', background: 'var(--ifm-color-primary-lightest)', borderRadius: '8px', border: '2px solid var(--ifm-color-primary)'}}>
<h3>📦 Installation</h3>
<p>Set up RGB in 2 minutes</p>
</div>
</a>

<a href="/getting-started/whats-new-0-12" style={{textDecoration: 'none', color: 'inherit'}}>
<div style={{padding: '1.5rem', background: 'var(--ifm-color-primary-lightest)', borderRadius: '8px', border: '2px solid var(--ifm-color-primary)'}}>
<h3>🎯 What's New in 0.12</h3>
<p>100x faster, zk-ready</p>
</div>
</a>

<a href="/core-concepts/overview" style={{textDecoration: 'none', color: 'inherit'}}>
<div style={{padding: '1.5rem', background: 'var(--ifm-color-primary-lightest)', borderRadius: '8px', border: '2px solid var(--ifm-color-primary)'}}>
<h3>🧠 Core Concepts</h3>
<p>Deep dive into RGB architecture</p>
</div>
</a>

</div>

---

<div style={{textAlign: 'center', margin: '3rem 0', fontSize: '1.1rem', fontStyle: 'italic'}}>
"RGB represents the most significant advancement in Bitcoin smart contracts since the Lightning Network."
</div>
