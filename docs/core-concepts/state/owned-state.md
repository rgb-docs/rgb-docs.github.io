---
sidebar_position: 2
title: Owned State
description: Understanding RGB's owned state and single-use seals
---

# Owned State

Owned state is RGB's mechanism for attaching private, transferable state to Bitcoin UTXOs (Unspent Transaction Outputs). This fundamental concept enables RGB to create digital assets and smart contracts that inherit Bitcoin's security model while maintaining complete privacy.

## Overview

Owned state represents data that:

- Is attached to specific Bitcoin UTXOs (via single-use seals)
- Can only be modified by the UTXO owner
- Transfers privately when the UTXO is spent
- Maintains privacy through client-side validation
- Scales independently of Bitcoin blockchain capacity

This model is ideal for assets, balances, ownership rights, and any state that should be privately controlled by individuals.

## Single-Use Seals

### Concept

*To be expanded: What are single-use seals*

A single-use seal is a commitment mechanism that:

1. **Can be closed exactly once**: Like a physical seal that breaks when opened
2. **Attached to a Bitcoin UTXO**: The seal is "over" a specific UTXO
3. **Proves one-time use**: Prevents double-spending of owned state
4. **Enables transfers**: Closing a seal transfers state to new seal(s)

```
[Placeholder for single-use seal diagram]

UTXO (Seal Container)
┌─────────────────────┐
│  Bitcoin UTXO       │
│  ┌───────────────┐  │
│  │  RGB Seal     │  │
│  │  - Unopened   │  │
│  │  - Contains:  │  │
│  │    Balance    │  │
│  │    Rights     │  │
│  │    Data       │  │
│  └───────────────┘  │
└─────────────────────┘
        │
        │ Spend UTXO (Close Seal)
        ▼
┌─────────────────────┐
│  New UTXOs (Seals)  │
│  ┌───────┬────────┐ │
│  │Seal 1 │ Seal 2 │ │
│  └───────┴────────┘ │
└─────────────────────┘
```

### Bitcoin UTXO Integration

*To be expanded: How seals use Bitcoin UTXOs*

Single-use seals leverage Bitcoin's UTXO model:

- **UTXO uniqueness**: Each UTXO can only be spent once
- **Consensus validation**: Bitcoin ensures UTXO can't be double-spent
- **Ownership proof**: Private key controls UTXO spending
- **Timestamping**: Bitcoin provides temporal ordering

**Key insight**: RGB doesn't need its own consensus because it inherits Bitcoin's.

### Seal Definition

*To be expanded: Defining a seal*

A seal is defined by:
```
Seal = (Transaction ID, Output Index)
```

Example:
```
txid: a1b2c3d4...
vout: 0

Full seal: a1b2c3d4...:0
```

This uniquely identifies the Bitcoin UTXO containing the seal.

## Owned State Structure

### State Assignment

*To be expanded: Assigning state to seals*

State is assigned to seals in RGB contracts:

```rust
// Placeholder for state assignment
StateAssignment {
    seal: Seal("a1b2c3d4...:0"),
    state: {
        type: "Balance",
        value: 1000000  // 1,000,000 tokens
    }
}
```

### State Types

*To be expanded: What can be owned state*

Common owned state types:

- **Fungible amounts**: Token balances (RGB20)
- **Data attachments**: Files, metadata (RGB21)
- **Rights**: Ownership rights, licenses
- **Fractions**: Fractional ownership
- **Structured data**: Complex custom types

### Multiple State Assignments

*To be expanded: Multiple states per seal*

A single seal can contain multiple state assignments:

```rust
// Placeholder example
UTXO a1b2c3d4...:0 contains:
  - Balance: 1000 tokens
  - VotingPower: 100 votes
  - MembershipLevel: "Gold"
```

## State Transfers

### Transfer Mechanics

*To be expanded: How owned state transfers*

Transferring owned state:

1. **Spend source UTXO**: Close the seal containing state
2. **Create state transition**: Specify how state changes
3. **Assign to new seal(s)**: Attach state to new UTXO(s)
4. **Validate transition**: Ensure rules are followed
5. **Commit to Bitcoin**: Anchor transition in Bitcoin tx

```
[Placeholder for transfer flow diagram]

Before Transfer:
┌────────────────┐
│ Alice's UTXO   │
│ Seal: 1000 tok │
└────────────────┘

Transfer Transaction:
┌────────────────┐
│ RGB Transition │
│ Input: 1000    │
│ Outputs:       │
│  - Bob: 600    │
│  - Alice: 400  │
└────────────────┘

After Transfer:
┌────────────────┐  ┌────────────────┐
│ Bob's UTXO     │  │ Alice's UTXO   │
│ Seal: 600 tok  │  │ Seal: 400 tok  │
└────────────────┘  └────────────────┘
```

### State Evolution

*To be expanded: State changes during transfers*

State can evolve during transfers:

- **Conservation**: Sum preserved (token transfers)
- **Transformation**: State changes form
- **Burning**: State destroyed (reduces supply)
- **Minting**: New state created (if authorized)

### Validation

*To be expanded: Validating state transfers*

Recipients validate transfers by:

1. Verifying state history back to genesis
2. Checking each transition follows schema rules
3. Validating Bitcoin commitments
4. Ensuring seal uniqueness (no double-spends)
5. Accepting or rejecting

**Result**: Only valid state can be received.

## Privacy Features

### Confidential Transfers

*To be expanded: Privacy of owned state*

Owned state is private by default:

- **No blockchain visibility**: State not on Bitcoin blockchain
- **Selective disclosure**: Only parties to transfer see state
- **Confidential amounts**: Optional Pedersen commitments
- **Hidden asset types**: Can obscure which contract
- **Graph privacy**: Transfer graph hidden

```
[Placeholder for privacy diagram]

Public (Bitcoin Blockchain):
┌─────────────────────────────┐
│ Bitcoin Transaction         │
│ - Input: UTXO 1            │
│ - Output: UTXO 2, UTXO 3   │
│ - RGB Commitment: hash123   │
└─────────────────────────────┘

Private (Client-Side Only):
┌─────────────────────────────┐
│ RGB State Transfer          │
│ - Amount: 1000 → 600 + 400 │
│ - Asset: MyToken           │
│ - Sender: Alice            │
│ - Receivers: Bob, Alice     │
└─────────────────────────────┘
```

### Controlled Disclosure

*To be expanded: Selective information sharing*

State can be selectively disclosed:

- **To recipients**: Full transfer details
- **To auditors**: Proof of ownership/balance
- **To regulators**: Compliance information
- **Public disclosure**: Optional transparency

### Zero-Knowledge Proofs

*To be expanded: ZK proofs for owned state*

Prove properties without revealing state:

- Proof of sufficient balance
- Proof of ownership
- Range proofs (amount > X)
- Set membership proofs

## Seal Types and Patterns

### Basic Seal

*To be expanded: Standard single-output seal*

Simple seal on one UTXO:
```
Seal: txid:vout
State: [Balance: 1000]
```

### Multi-Seal Outputs

*To be expanded: State split across multiple UTXOs*

Splitting state to multiple seals:
```
Input Seal: [Balance: 1000]
  ↓
Output Seals:
  - Seal 1: [Balance: 600]
  - Seal 2: [Balance: 400]
```

### Blank Seals

*To be expanded: Seals without initial state*

Create seal without state (for future receipt):
```
Seal: txid:vout
State: [] (empty, awaiting assignment)
```

### Seal Reuse Prevention

*To be expanded: Ensuring one-time use*

Mechanisms preventing seal reuse:
- Bitcoin UTXO model (can't double-spend)
- Client-side validation (detects reuse attempts)
- History tracking (identifies conflicts)

## Use Cases

### Fungible Tokens (RGB20)

*To be expanded: Token balances as owned state*

Each token holder has owned state:

```rust
// Alice's UTXO
Seal: alice_utxo
State: [Balance: 5000]

// Bob's UTXO
Seal: bob_utxo
State: [Balance: 3000]
```

**Privacy**: Alice and Bob don't know each other's balances.

### Non-Fungible Tokens (RGB21)

*To be expanded: NFT ownership as owned state*

NFT ownership via owned state:

```rust
// NFT owner's UTXO
Seal: owner_utxo
State: [
  TokenId: 42,
  Metadata: "ipfs://...",
  Royalty: 5%
]
```

### Collectibles and Data

*To be expanded: Arbitrary data ownership*

Owned data attachments:

```rust
Seal: collector_utxo
State: [
  Item: "Rare Trading Card #123",
  Provenance: "...",
  Certification: "..."
]
```

### Rights and Licenses

*To be expanded: Digital rights management*

Transferable rights:

```rust
Seal: licensee_utxo
State: [
  License: "Commercial Use",
  Expiry: 1735689600,
  Territory: "Global"
]
```

## Advanced Patterns

### Atomic Swaps

*To be expanded: Exchanging owned state atomically*

Swap state between parties in single Bitcoin tx:

```
Alice's State → Bob
Bob's State → Alice
(Atomic: both or neither)
```

### State Aggregation

*To be expanded: Combining multiple seals*

Merge multiple owned states:

```
Inputs:
  - Seal 1: [Balance: 100]
  - Seal 2: [Balance: 200]
  - Seal 3: [Balance: 300]
Output:
  - Seal 4: [Balance: 600]
```

### State Splitting

*To be expanded: Dividing owned state*

Split single owned state:

```
Input:
  - Seal 1: [Balance: 1000]
Outputs:
  - Seal 2: [Balance: 100]
  - Seal 3: [Balance: 100]
  - Seal 4: [Balance: 100]
  - Seal 5: [Balance: 700]
```

## Limitations and Considerations

### UTXO Management

*To be expanded: Managing Bitcoin UTXOs*

Each seal requires a UTXO:
- **UTXO creation costs**: Bitcoin transaction fees
- **UTXO consolidation**: May be needed periodically
- **Dust limits**: Minimum UTXO size requirements

### State Availability

*To be expanded: Ensuring state accessibility*

Owned state requires:
- Maintaining state history (or receiving it)
- Access to consignments for verification
- Proper backup and recovery
- State server infrastructure (optional)

### Coordination Challenges

*To be expanded: When owned state is insufficient*

Owned state alone can't handle:
- Global coordination (use global state)
- Multi-party agreements (requires coordination)
- Time-locked operations (needs global reference)

## Performance Optimization

### UTXO Consolidation

*To be expanded: Optimizing UTXO usage*

Strategies:
- Periodic consolidation transactions
- Batching multiple states
- Optimal seal assignment
- Fee optimization

### State Compression

*To be expanded: Minimizing state size*

Techniques:
- Compact serialization
- State pruning
- Merkle compression
- Reference deduplication

## Related Documentation

- [Unified State Model](./unified-state.md) - Overall state architecture
- [Global State](./global-state.md) - Shared state mechanisms
- [Single-Use Seals](../client-side-validation.md#single-use-seals) - Detailed seal explanation
- [RGB20 Guide](../../guides/rgb20/creating-tokens.md) - Fungible token implementation
- [RGB21 Guide](../../guides/rgb21/creating-nfts.md) - NFT implementation

## References

*Coming soon: Single-use seals papers and specifications*

---

**Status**: Draft outline - To be expanded with detailed implementation patterns and examples.
