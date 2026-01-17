---
sidebar_position: 4
title: What's New in RGB v0.12
description: Major changes and improvements in RGB Protocol version 0.12
---

# What's New in RGB v0.12

RGB v0.12 represents a complete redesign of the protocol, achieving production-ready status and forward compatibility. This release includes breaking changes that significantly improve performance, simplify the architecture, and prepare RGB for zero-knowledge proof integration.

## 🚨 Breaking Changes

### Contracts Not Compatible

**CRITICAL**: Contracts issued before v0.12 are **NOT compatible** due to consensus-level changes. All contracts must be re-issued.

### Migration Required

If you're upgrading from RGB v0.11 or earlier:

1. Export all asset data
2. Upgrade to v0.12
3. Re-issue all contracts
4. Re-distribute assets

## 🎯 Major Features

### 1. zk-STARK Readiness

RGB v0.12 was completely re-architected to support zero-knowledge STARK proofs:

- **State Unification**: All state types unified into finite field elements
- **Circuit-Compatible**: Validation logic representable as arithmetic circuits
- **Future-Proof**: Ready for zk-compression when zk-STARKs mature

### 2. zk-AluVM Virtual Machine

Introduced a revolutionary VM with just **40 instructions**:

```rust
// AluVM characteristics
- Non-von-Neumann architecture
- Read-once memory model
- Turing-complete
- Exception-less execution
- Formally verifiable
```

### 3. Enhanced Invoicing System

Invoices now support complex scenarios:

```bash
# Multiple assets in one invoice
rgb invoice create \
  --contract <CONTRACT_ID_1> --amount 100 \
  --contract <CONTRACT_ID_2> --amount 50 \
  --output multi-asset-invoice.txt
```

### 4. Payment Scripts

New support for multi-beneficiary, multi-contract transactions:

```typescript
// Multiple recipients, multiple contracts
const paymentScript = await rgb.createPaymentScript({
  payments: [
    { beneficiary: 'alice', contract: tokenA, amount: 100n },
    { beneficiary: 'bob', contract: tokenB, amount: 50n },
    { beneficiary: 'charlie', contract: nft, tokenId: 5n },
  ]
});
```

### 5. Contractum Language

New functional declarative language for smart contracts:

```contractum
// Example Contractum contract
contract StableCoin {
  global supply: Amount
  owned balance: Amount

  transition transfer(amount: Amount) {
    require(balance >= amount)
    balance -= amount
  }
}
```

Compiles to AluVM bytecode for execution.

## 🚀 Performance Improvements

### 4x Code Reduction

The consensus codebase was reduced by **75%**:

- Removed complexity in type system
- Eliminated redundant abstractions
- Simplified data structures

### Orders of Magnitude Faster Validation

```
v0.11: ~500ms consignment validation
v0.12: ~5ms consignment validation
100x improvement!
```

### Stream-Based Consignments

Memory usage during validation reduced from **megabytes to hundreds of bytes**:

```rust
// v0.11: Load entire consignment
let consignment = Consignment::load(file)?; // 50MB+

// v0.12: Stream validation
let stream = ConsignmentStream::new(file)?; // ~200 bytes
```

### NoSQL Database Integration

Dedicated append-only embedded database:

- Optimized for client-side validation
- Fixed-size data structures
- No deletion operations needed
- Significant performance boost

## 🔧 API Changes

### Simplified State Types

**Before (v0.11)**:
```rust
enum StateType {
    Fungible(PedersenCommitment),
    Structured(Data),
    Attachment(Binary),
}
```

**After (v0.12)**:
```rust
struct State {
    data: FieldElement  // Single unified type
}
```

### Unified Seals

**Before**: Separate Tapret and Opret seal types
**After**: Single seal type with method selection

```rust
// v0.12 unified seal
let seal = Seal::new(txid, vout, method);
```

### Enhanced Interfaces

Standard interfaces (RGB20, RGB21) now support:

- Multiple token types per contract
- Richer metadata
- Complex state management

```typescript
// v0.12 RGB20 with multiple tokens
const contract = await RGB20.issue({
  tokens: [
    { name: 'Token A', ticker: 'TKNA', supply: 1000000n },
    { name: 'Token B', ticker: 'TKNB', supply: 500000n },
  ]
});
```

## 🔐 Security Enhancements

### Comprehensive Test Coverage

First RGB version with extensive testing:

- **>66.7%** overall code coverage
- **>75%** consensus library coverage
- Unit, integration, and security tests
- Attack scenario coverage

### Re-org Protection

Formal mathematical model for blockchain reorganization attacks:

```rust
// Configurable re-org depth protection
rgb config set reorg-depth 6
```

### Deterministic Bitcoin Commitments (DBC)

Enhanced commitment verification:

```
Rule: Exactly ONE valid commitment per transaction
- First DBC-compatible output wins
- Subsequent outputs ignored
- Prevents ambiguity attacks
```

## 📦 Architectural Removals

### Removed Features

To achieve simplification, these were removed:

- ❌ **Pedersen Commitments**: Replaced by zk-STARK preparation
- ❌ **Bulletproofs**: No longer needed with new architecture
- ❌ **Blank State Transitions**: Eliminated entirely
- ❌ **Multi-Blockchain Support**: Each chain gets dedicated contracts
- ❌ **Schema Complexity**: Replaced by Contractum

### Deprecated APIs

```rust
// Removed in v0.12
pub fn create_blank_transition() // Removed
pub fn bulletproof_verify()     // Removed
pub struct PedersenCommitment   // Removed
```

## 🌟 New Capabilities

### Lightning Network Integration

Production-ready Lightning support:

```bash
# Open RGB-enabled channel
rgb lightning open \
  --contract <CONTRACT_ID> \
  --capacity 1000000 \
  --peer <NODE_PUBKEY>

# Route RGB payments
rgb lightning pay \
  --invoice <LN_RGB_INVOICE>
```

### Multiple Token Standards

Single contract can expose multiple interacting tokens:

```typescript
// DeFi pair contract
const dexPair = await RGB.createContract({
  interface: 'DexPair',
  tokens: {
    tokenA: RGB20Contract,
    tokenB: RGB20Contract,
    lpToken: RGB20Contract
  },
  logic: poolLogic
});
```

### Enhanced Privacy

Additional privacy features:

- Blinded UTXO allocations in invoices
- Optional clear allocations for specific use cases
- Entropy leaves in MPC trees

## 📊 Comparison Table

| Feature | v0.11 | v0.12 |
|---------|-------|-------|
| State Types | 3 distinct types | 1 unified type |
| VM Instructions | ~200 | 40 |
| Code Size | ~40k LOC | ~10k LOC |
| Validation Speed | 500ms | 5ms |
| Memory Usage | 50MB+ | 200 bytes |
| Test Coverage | Less than 30% | Greater than 66.7% |
| zk-Ready | No | Yes |
| Lightning | Experimental | Production |

## 🔄 Migration Guide

### For Contract Issuers

```bash
# 1. Export v0.11 contract data
rgb-v0.11 export --contract <ID> --output old-data.json

# 2. Upgrade to v0.12
cargo install rgb-cli@0.12

# 3. Re-issue contract
rgb issue \
  --schema RGB20 \
  --from-export old-data.json \
  --output new-contract.rgb

# 4. Announce to users
```

### For Wallet Developers

Update your integration:

```typescript
// Old (v0.11)
import { RGB } from 'rgbjs@0.11';

// New (v0.12)
import { RGB } from 'rgbjs@0.12';

// Update API calls
const transfer = await rgb.transfer({
  // New payment script format
  payments: [...]  // Changed from single invoice
});
```

### For Users

1. Backup wallet data
2. Upgrade wallet software
3. Re-sync RGB contracts
4. Verify balances

## 🎓 Learning Path

If you're new to v0.12:

1. [**Core Concepts**](/core-concepts/overview) - Understand the new architecture
2. [**AluVM Guide**](/core-concepts/aluvm/overview) - Learn the new VM
3. [**State Management**](/core-concepts/state/unified-state) - Understand unified state
4. [**Migration Guide**](/guides/development/testing) - Update existing projects

## 📚 Additional Resources

- [v0.12 Release Notes](https://rgb.tech/blog/release-v0-12-consensus/)
- [Breaking Changes Details](https://github.com/RGB-WG/rgb-core/blob/v0.12/CHANGELOG.md)
- [Migration Examples](https://github.com/RGB-WG/rgb-examples/tree/main/migration)

## Forward Compatibility Guarantee

**Important**: All contracts issued with RGB v0.12 will remain compatible with future versions. This is the first version with this guarantee.

```
RGB v0.12+ = Stable consensus layer
Future versions will be backward compatible
```

---

Ready to build with v0.12? Start with the [Quick Start Guide](/getting-started/quick-start).
