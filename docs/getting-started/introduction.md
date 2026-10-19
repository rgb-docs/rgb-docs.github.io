---
sidebar_position: 1
title: Introduction to RGB
description: Learn about RGB Protocol v0.12 - Smart contracts for Bitcoin and Lightning Network
---

<div style={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '4rem 2rem',
  borderRadius: '16px',
  textAlign: 'center',
  color: 'white',
  marginBottom: '3rem',
  boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
}}>
  <h1 style={{
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    marginBottom: '1rem',
    fontWeight: '900',
    color: 'white'
  }}>
    RGB Protocol
  </h1>
  <p style={{
    fontSize: 'clamp(1.2rem, 3vw, 2rem)',
    marginBottom: '2rem',
    opacity: '0.95',
    fontWeight: '300'
  }}>
    Smart Contracts for Bitcoin & Lightning
  </p>
  <div style={{
    fontSize: 'clamp(1rem, 2vw, 1.5rem)',
    marginBottom: '2rem',
    fontWeight: '500',
    letterSpacing: '0.05em'
  }}>
    ⚡ Unlimited Scale • 🔒 Total Privacy • 💎 Bitcoin Security
  </div>
</div>

<div style={{background: 'var(--ifm-color-info-contrast-background)', padding: '1.5rem', borderRadius: '12px', margin: '2rem 0', border: '2px solid var(--ifm-color-info)', textAlign: 'center'}}>

### 🚀 RGB v0.12 Released

RGB v0.12 provides forward compatibility guarantees - contracts issued with v0.12 will remain compatible with future versions. Various implementations are under active development. [See what's new →](/getting-started/whats-new-0-12)

</div>

---

## The Breakthrough: Bitcoin Smart Contracts Without Compromise

RGB achieves what was thought impossible: **Turing-complete smart contracts on Bitcoin** without:
- ❌ Creating new tokens or sidechains
- ❌ Modifying Bitcoin consensus
- ❌ Sacrificing privacy or scalability
- ❌ Relying on centralized bridges

### The Paradigm Shift

<div style={{background: 'var(--ifm-background-surface-color)', padding: '2rem', borderRadius: '12px', margin: '2rem 0'}}>

**Traditional Blockchain:**
```
Everyone validates everything → Slow, expensive, no privacy
```

**RGB Protocol:**
```
You only validate what affects you → Fast, cheap, private
```

</div>

## Key Breakthroughs

<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', margin: '3rem 0'}}>

<div style={{
  padding: '2rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '16px',
  color: 'white',
  boxShadow: '0 8px 30px rgba(102, 126, 234, 0.3)',
  textAlign: 'center'
}}>
  <div style={{fontSize: '3.5rem', marginBottom: '0.5rem'}}>⚡</div>
  <h3 style={{color: 'white', fontSize: '1.8rem', marginBottom: '0.5rem'}}>100x Faster</h3>
  <p style={{fontSize: '1.1rem', opacity: 0.9}}>5ms validation</p>
  <p style={{fontSize: '0.9rem', opacity: 0.7}}>vs 500ms in v0.11</p>
</div>

<div style={{
  padding: '2rem',
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  borderRadius: '16px',
  color: 'white',
  boxShadow: '0 8px 30px rgba(240, 147, 251, 0.3)',
  textAlign: 'center'
}}>
  <div style={{fontSize: '3.5rem', marginBottom: '0.5rem'}}>♾️</div>
  <h3 style={{color: 'white', fontSize: '1.8rem', marginBottom: '0.5rem'}}>Unlimited Scale</h3>
  <p style={{fontSize: '1.1rem', opacity: 0.9}}>No TPS limit</p>
  <p style={{fontSize: '0.9rem', opacity: 0.7}}>Validation cost O(1)</p>
</div>

<div style={{
  padding: '2rem',
  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  borderRadius: '16px',
  color: 'white',
  boxShadow: '0 8px 30px rgba(79, 172, 254, 0.3)',
  textAlign: 'center'
}}>
  <div style={{fontSize: '3.5rem', marginBottom: '0.5rem'}}>🔒</div>
  <h3 style={{color: 'white', fontSize: '1.8rem', marginBottom: '0.5rem'}}>Total Privacy</h3>
  <p style={{fontSize: '1.1rem', opacity: 0.9}}>0 bytes on-chain</p>
  <p style={{fontSize: '0.9rem', opacity: 0.7}}>All data client-side</p>
</div>

<div style={{
  padding: '2rem',
  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  borderRadius: '16px',
  color: 'white',
  boxShadow: '0 8px 30px rgba(67, 233, 123, 0.3)',
  textAlign: 'center'
}}>
  <div style={{fontSize: '3.5rem', marginBottom: '0.5rem'}}>💎</div>
  <h3 style={{color: 'white', fontSize: '1.8rem', marginBottom: '0.5rem'}}>Bitcoin Security</h3>
  <p style={{fontSize: '1.1rem', opacity: 0.9}}>Full PoW protection</p>
  <p style={{fontSize: '0.9rem', opacity: 0.7}}>No trust assumptions</p>
</div>

</div>

<div style={{
  background: 'var(--ifm-alert-background-color)',
  border: '2px solid var(--ifm-color-warning)',
  borderRadius: '12px',
  padding: '2rem',
  margin: '3rem 0',
  textAlign: 'center'
}}>

### 🚀 What This Means in Practice

**Deploy a stablecoin with Lightning support in under 5 minutes.** Issue NFTs with unlimited metadata. Build DeFi protocols with zero blockchain footprint. All with Bitcoin's security, all completely private.

</div>

## See RGB in Action

### Issue a Token (RGB20)

```bash
# Create a fungible token with complete privacy
# (using params file - see Quick Start for details)
rgb issue --wallet my-wallet token-params.yaml

# ✓ Issued in seconds
# ✓ Zero blockchain footprint
# ✓ Lightning Network compatible
```

The params file defines your token specifications (ticker, name, precision, supply, etc.)

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

### 2. Bitcoin UTXO Anchoring
RGB binds state to Bitcoin UTXOs, leveraging Bitcoin's existing double-spend prevention.

```
RGB State ──→ Bound to UTXO ──→ UTXO Spent ──→ New State
              (UTXOs can only be spent once)
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

RGB assets can be transferred over Lightning Network channels for instant settlement with minimal fees. Implementation varies by Lightning node software.

```bash
# ✓ Millisecond settlement
# ✓ Satoshi-level fees
# ✓ Multi-hop routing
```

See [RGB Lightning](/guides/lightning/overview) for integration details.

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
# Install the Line A CLI (without --version, cargo picks the old 0.10.9)
cargo install --locked rgb-wallet --version 0.12.0-rc.3

# Issue token in a few commands
rgb init
rgb create my-wallet "xpub..."
rgb issue --wallet my-wallet token-params.yaml

# Deploy to production immediately
# No blockchain fees • No gas • No waiting
```
:::

### How RGB Compares

<div style={{overflowX: 'auto', margin: '2rem 0'}}>

| Feature | 🟣 RGB | Ethereum L2 | Liquid/RSK | Stacks |
|---------|:------:|:-----------:|:----------:|:------:|
| **Privacy** | ✅ **Total** | ⚠️ Partial | ⚠️ Moderate | ❌ None |
| **Scalability** | ✅ **Unlimited** | ⚠️ 1000s TPS | ⚠️ 100s TPS | ❌ ~30 TPS |
| **Bitcoin Security** | ✅ **Native** | ⚠️ Bridged | ⚠️ Federated | ⚠️ Anchored |
| **Smart Contracts** | ✅ Turing-complete | ✅ Turing-complete | ✅ Turing-complete | ⚠️ Clarity |
| **Lightning Network** | ✅ **Native** | ❌ No | ❌ No | ❌ No |
| **Transaction Cost** | ✅ **BTC fee only** | ❌ L2 + bridge | ❌ Network fees | ❌ STX fees |
| **On-chain Footprint** | ✅ **0 bytes** | ❌ Rollup data | ❌ Full state | ❌ Full state |
| **Trust Assumptions** | ✅ **Zero** | ❌ Bridges | ❌ Federation | ❌ Validators |

</div>

<div style={{
  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  padding: '2rem',
  borderRadius: '12px',
  color: 'white',
  margin: '2rem 0',
  textAlign: 'center'
}}>

**The Bottom Line:** RGB is the only solution that delivers Turing-complete smart contracts on Bitcoin with **zero compromises** on privacy, scalability, or security.

</div>

## Start Building in 5 Minutes

<div style={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '3rem 2rem',
  borderRadius: '16px',
  color: 'white',
  margin: '3rem 0',
  boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)',
  textAlign: 'center'
}}>

<h2 style={{color: 'white', fontSize: '2.5rem', marginBottom: '2rem'}}>🚀 From Zero to Production in Minutes</h2>

<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '2rem',
  margin: '2rem 0',
  textAlign: 'left'
}}>
  <div>
    <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>1️⃣</div>
    <h3 style={{color: 'white'}}>Install RGB</h3>
    <p style={{opacity: 0.9}}>One command, 2 minutes</p>
  </div>
  <div>
    <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>2️⃣</div>
    <h3 style={{color: 'white'}}>Create Contract</h3>
    <p style={{opacity: 0.9}}>Issue tokens or NFTs</p>
  </div>
  <div>
    <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>3️⃣</div>
    <h3 style={{color: 'white'}}>Deploy</h3>
    <p style={{opacity: 0.9}}>Test on testnet</p>
  </div>
</div>

</div>

## Available Implementations

RGB has several implementations you can try:

### For Users

- **[BitMask](https://bitmask.app/)** - Browser extension wallet with RGB20 and RGB21 support
- **[MyCitadel](https://mycitadel.io/)** - Desktop wallet for RGB asset management

### For Developers

- **[rgb-node](https://github.com/RGB-WG/rgb-node)** - Reference node implementation (Rust)
- **[rgb-cli](https://crates.io/crates/rgb-cli)** - Command-line tools
- **[rgbjs](https://www.npmjs.com/package/rgbjs)** - JavaScript/TypeScript SDK
- **[RGB Lightning Node](https://github.com/RGB-WG/rgb-lightning-node)** - Lightning with RGB support

:::caution Development Status
RGB is under active development. Always test on testnet first.
:::

## Join the RGB Community

- **[GitHub](https://github.com/RGB-WG)** - 2000+ stars, actively developed
- **[Telegram](https://t.me/rgbtelegram)** - Community discussion
- **[Twitter](https://twitter.com/rgb_protocol)** - Latest updates
- **[RGB.tech](https://rgb.tech)** - Official website & blog
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

<div style={{
  background: 'var(--ifm-background-surface-color)',
  padding: '3rem 2rem',
  borderRadius: '16px',
  margin: '4rem 0',
  textAlign: 'center',
  border: '1px solid var(--ifm-color-emphasis-200)'
}}>

<div style={{fontSize: '2.5rem', marginBottom: '1.5rem'}}>💡</div>

<p style={{fontSize: '1.5rem', fontStyle: 'italic', marginBottom: '1rem', color: 'var(--ifm-color-primary)'}}>
"RGB represents the most significant advancement in Bitcoin smart contracts since the Lightning Network."
</p>

<p style={{fontSize: '1.1rem', opacity: 0.8, marginTop: '2rem'}}>
**The future of Bitcoin DeFi is private, scalable, and already here.**
</p>

</div>
