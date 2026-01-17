---
sidebar_position: 1
title: Deterministic Bitcoin Commitments
description: RGB's system for committing contract data to Bitcoin transactions
---

# Deterministic Bitcoin Commitments

RGB uses Deterministic Bitcoin Commitments (DBC) to anchor client-side validated contracts to the Bitcoin blockchain. This system enables RGB to inherit Bitcoin's security and finality while keeping contract data off-chain and private.

## Overview

Deterministic Bitcoin Commitments provide:

- **Secure anchoring**: Contract state committed to Bitcoin transactions
- **Multi-protocol support**: Multiple protocols can share same Bitcoin transaction
- **Deterministic**: Same commitment always produces same result
- **Efficient**: Minimal on-chain footprint
- **Flexible**: Supports different commitment methods (Tapret, Opret)

This architecture allows RGB and other client-side validation protocols to leverage Bitcoin's security without bloating the blockchain.

## Commitment Concept

### What is a Commitment?

*To be expanded: Basic commitment concept*

A commitment is a cryptographic binding:

```
[Placeholder for commitment diagram]

RGB Contract Data (Off-chain)
         │
         ├─> Hash/Merkle Root
         │
         └─> Embedded in Bitcoin TX
                    │
                    └─> Bitcoin Blockchain
```

**Properties**:
- **Binding**: Can't change committed data without changing commitment
- **Hiding**: Commitment reveals nothing about data
- **Verifiable**: Anyone can verify data matches commitment
- **Compact**: Small size regardless of data size

### Why Commit to Bitcoin?

*To be expanded: Benefits of Bitcoin anchoring*

Bitcoin provides:

1. **Immutability**: Once confirmed, extremely hard to reverse
2. **Timestamping**: Proof of when data existed
3. **Ordering**: Determines transaction order
4. **Security**: Protected by massive hash power
5. **Finality**: Probabilistic finality after confirmations
6. **Censorship resistance**: Hard to prevent commitments

### RGB's Use of Commitments

*To be expanded: How RGB uses Bitcoin commitments*

RGB commits:
- State transition hashes
- Contract genesis
- Schema identifiers
- Merkle roots of state changes

## Commitment Structure

### Single Protocol Commitment

*To be expanded: Committing one protocol*

Basic commitment structure:

```
[Placeholder for single commitment]

┌─────────────────────────────┐
│  Bitcoin Transaction        │
│  ┌───────────────────────┐  │
│  │  OP_RETURN output or  │  │
│  │  Taproot commitment   │  │
│  │                       │  │
│  │  RGB_HASH             │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Multi-Protocol Commitments (MPC)

*To be expanded: Multiple protocols in one transaction*

Multiple protocols sharing one Bitcoin transaction:

```
[Placeholder for MPC diagram]

┌─────────────────────────────────┐
│  Bitcoin Transaction            │
│  ┌───────────────────────────┐  │
│  │  Single Commitment        │  │
│  │  (Tapret or Opret)        │  │
│  │                           │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  MPC Tree           │  │  │
│  │  │  ┌───┬───┬───┬───┐  │  │  │
│  │  │  │RGB│LNP│...│...│  │  │  │
│  │  │  └───┴───┴───┴───┘  │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Benefits**:
- Share transaction costs
- Reduce blockchain footprint
- Enable cross-protocol coordination
- Maintain protocol independence

## Commitment Methods

### Tapret (Taproot OP_RETURN)

*To be expanded: Tapret commitment method*

See [Tapret Details](./tapret.md) for full documentation.

**Overview**:
- Embeds commitment in Taproot script tree
- Unspendable script leaf contains commitment
- Most private and efficient method
- Recommended for new implementations

**Example structure**:
```
Taproot Output:
  Internal Key: <user_key>
  Script Tree:
    - Spending path (key path)
    - Commitment leaf (OP_RETURN <commitment>)
```

### Opret (OP_RETURN)

*To be expanded: OP_RETURN commitment method*

See [Opret Details](./opret.md) for full documentation.

**Overview**:
- Traditional OP_RETURN output
- Widely supported
- Clearly identified as data
- Lower privacy than Tapret

**Example**:
```
Output:
  Value: 0
  Script: OP_RETURN <protocol_tag> <commitment>
```

### Comparison

*To be expanded: Method comparison*

| Feature | Tapret | Opret |
|---------|--------|-------|
| Privacy | High (hidden) | Low (obvious) |
| Efficiency | High | Moderate |
| Compatibility | Taproot required | Universal |
| Cost | Lower | Slightly higher |
| Recommended | Yes (new apps) | Legacy support |

## Deterministic Commitment Scheme

### Determinism Requirements

*To be expanded: What makes commitments deterministic*

For reproducibility, commitments must:

1. **Canonical ordering**: Deterministic data ordering
2. **Fixed encoding**: Standard serialization
3. **Predictable hashing**: Same hash algorithm always
4. **No randomness**: No random nonces or padding
5. **Version-locked**: Commitment scheme version fixed

### Commitment Calculation

*To be expanded: How commitments are computed*

**Process**:

```
1. Collect commitment data
   ├─> State transitions
   ├─> Contract operations
   └─> Protocol messages

2. Canonicalize data
   ├─> Sort in defined order
   ├─> Encode with Strict Types
   └─> Remove any randomness

3. Build Merkle tree
   ├─> Hash individual items
   ├─> Construct tree bottom-up
   └─> Produce root hash

4. Create final commitment
   ├─> Combine with protocol tag
   ├─> Add version information
   └─> Produce commitment bytes

5. Embed in Bitcoin transaction
   ├─> Tapret or Opret
   └─> Publish transaction
```

### Strict Encoding

*To be expanded: Deterministic serialization*

RGB uses [Strict Types](../../technical-reference/strict-types.md) for:
- Canonical serialization
- Platform-independent encoding
- Deterministic byte representation
- Schema versioning

## Merkle Tree Construction

### Tree Structure

*To be expanded: Merkle tree organization*

```
[Placeholder for Merkle tree diagram]

                Root
              /      \
          Hash(A,B)  Hash(C,D)
           /    \      /    \
       Hash(A) Hash(B) Hash(C) Hash(D)
         |       |       |       |
       Data A  Data B  Data C  Data D
         |       |       |       |
    Transition Contract State  Event
```

### Hashing Algorithm

*To be expanded: Hash function details*

RGB uses:
- **SHA-256**: Primary hash function
- **Tagged hashes**: Domain separation
- **Merkle tree**: Efficient proofs
- **Collision resistance**: Cryptographic security

### Proof Generation

*To be expanded: Creating Merkle proofs*

Generate proofs of inclusion:

```
To prove Data B is in tree:
Proof = [Hash(A), Hash(C,D)]

Verification:
  1. Hash(B)
  2. Hash(Hash(A), Hash(B))
  3. Hash(Hash(A,B), Hash(C,D))
  4. Compare with Root
```

**Compact**: O(log n) proof size

## Multi-Protocol Commitments

### MPC Tree Structure

*To be expanded: How multiple protocols share commitment space*

See [Multi-Protocol Commitments](./multi-protocol-commitments.md) for details.

**Structure**:
```
MPC Root
  ├─> Protocol 1 (RGB)
  ├─> Protocol 2 (Lightning)
  ├─> Protocol 3 (...)
  └─> Protocol N
```

Each protocol has independent subtree.

### Protocol Identification

*To be expanded: Identifying protocols in MPC*

Protocols identified by:
- Protocol tag (unique identifier)
- Version number
- Position in MPC tree

### Adding Protocols

*To be expanded: Extending MPC trees*

New protocols can be added:
- Without affecting existing protocols
- Using same Bitcoin transaction
- Maintaining independent validation

## Commitment Verification

### Verification Process

*To be expanded: Verifying commitments*

**Steps**:

```
1. Obtain Bitcoin transaction
   └─> From blockchain or provided by sender

2. Extract commitment
   ├─> Parse Tapret or Opret
   └─> Get commitment bytes

3. Verify commitment structure
   ├─> Check protocol tag
   ├─> Validate version
   └─> Parse MPC tree (if applicable)

4. Reconstruct Merkle proof
   ├─> Hash local data
   ├─> Apply Merkle proof
   └─> Calculate expected root

5. Compare roots
   ├─> Expected == Actual?
   └─> Accept or reject
```

### Validation Requirements

*To be expanded: What validators check*

Validators verify:

- Commitment exists in Bitcoin transaction
- Transaction is confirmed (or in mempool)
- Commitment matches expected value
- Merkle proof is valid
- No double-spend of source UTXO
- Proper Bitcoin confirmations

### Proofs of Publication

*To be expanded: Proving data was published*

Commitment proves:
- Data existed at time of Bitcoin block
- Data was committed to by transaction
- Data matches provided commitment
- No later tampering possible

## Security Properties

### Tamper Resistance

*To be expanded: Protection against modification*

Once committed:
- Can't change data without changing commitment
- Can't change commitment without changing Bitcoin tx
- Can't change Bitcoin tx without mining new block
- Bitcoin PoW protects commitment

### Censorship Resistance

*To be expanded: Preventing censorship*

Commitments inherit Bitcoin's censorship resistance:
- Hard to prevent transaction inclusion
- No on-chain indication of protocol
- Generic commitment format
- Plausible deniability (Tapret)

### Timeline Integrity

*To be expanded: Temporal ordering*

Bitcoin provides:
- Proof of existence at time of block
- Ordering between commitments
- Relative timestamps
- Fork-choice rule

## Privacy Considerations

### Commitment Privacy

*To be expanded: What commitments reveal*

**Tapret** (high privacy):
- Commitment hidden in Taproot tree
- Indistinguishable from other Taproot scripts
- Only revealed when needed
- No on-chain protocol indication

**Opret** (lower privacy):
- Clearly visible commitment
- Protocol tag identifies RGB
- Transaction flagged as "data carrier"
- Still private data content (only hash)

### Data Privacy

*To be expanded: Protecting committed data*

Commitments reveal:
- ✗ No actual data content
- ✓ Only cryptographic hash
- ✗ No transaction amounts
- ✗ No participant identities
- ✓ Just proof of existence

### Traffic Analysis

*To be expanded: Mitigating traffic analysis*

Considerations:
- Timing correlation
- Transaction graph analysis
- UTXO linking
- Mitigation strategies (CoinJoin, etc.)

## Performance Optimization

### Batching Commitments

*To be expanded: Efficient commitment batching*

Combine multiple state transitions:
```
Single Bitcoin TX commits:
  - 100 RGB transfers
  - 50 contract operations
  - 10 genesis contracts
  All in one Merkle tree
```

**Benefits**:
- Amortized Bitcoin fees
- Reduced blockchain footprint
- Improved throughput

### Commitment Scheduling

*To be expanded: When to commit*

Strategies:
- Immediate commitment (highest security)
- Batched commitment (lower cost)
- Periodic commitment (regular intervals)
- Threshold-based (when batch size reached)

## Implementation Details

### Commitment Format

*To be expanded: Binary format specification*

```
Commitment bytes:
  [Version: 1 byte]
  [Protocol Tag: 4 bytes]
  [Merkle Root: 32 bytes]
  [Metadata: variable]
```

### Code Example

*To be expanded: Creating commitments*

```rust
// Placeholder example
use rgb::Commitment;

let transitions = vec![transition1, transition2, transition3];
let merkle_root = build_merkle_tree(&transitions);
let commitment = Commitment::new(
    protocol_tag,
    version,
    merkle_root
);

// Embed in Bitcoin transaction
let tx = bitcoin::Transaction {
    // ... transaction details
    output: vec![
        // ... other outputs
        commitment.to_tapret_output(internal_key)
    ]
};
```

## Related Documentation

- [Tapret](./tapret.md) - Taproot commitment method
- [Opret](./opret.md) - OP_RETURN commitment method
- [Multi-Protocol Commitments](./multi-protocol-commitments.md) - MPC details
- [Client-Side Validation](../client-side-validation.md) - Overall validation model
- [Strict Types](../../technical-reference/strict-types.md) - Deterministic encoding

## References

*Coming soon: DBC specifications and BIPs*

---

**Status**: Draft outline - To be expanded with detailed specifications and implementation examples.
