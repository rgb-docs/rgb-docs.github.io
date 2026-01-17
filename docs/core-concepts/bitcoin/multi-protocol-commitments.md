---
sidebar_position: 4
title: Multi-Protocol Commitments
description: Sharing Bitcoin commitments across multiple protocols
---

# Multi-Protocol Commitments (MPC)

Multi-Protocol Commitments (MPC) enable multiple Layer 2 and Layer 3 protocols to share a single Bitcoin transaction commitment. This architecture allows RGB, Lightning, and other protocols to coexist efficiently while reducing blockchain footprint and transaction costs.

## Overview

MPC provides:

- **Shared commitments**: Multiple protocols in one Bitcoin transaction
- **Protocol independence**: Each protocol operates independently
- **Cost efficiency**: Amortized transaction fees
- **Scalability**: Reduced blockchain usage
- **Flexibility**: Easy addition of new protocols

## MPC Architecture

### Merkle Tree Structure

*To be expanded: MPC tree organization*

```
[Placeholder for MPC tree diagram]

Bitcoin Transaction Commitment
         │
    MPC Root Hash
         │
    ┌────┴────┐
    │         │
Hash(P1,P2) Hash(P3,P4)
 │      │    │      │
P1     P2   P3     P4
RGB   LNP  ...    ...
```

Each protocol has:
- Unique protocol identifier
- Independent sub-tree
- Own commitment data
- Separate validation

### Protocol Identification

*To be expanded: Identifying protocols*

Protocols identified by:
- **Protocol tag**: Unique 4-byte identifier
- **Version**: Protocol version number
- **Position**: Location in Merkle tree

Example tags:
```
RGB: 0x524742
LNP: 0x4C4E50
Custom: 0x????????
```

## Creating MPC Commitments

### Construction Process

*To be expanded: Building MPC trees*

```
1. Collect protocol commitments
   ├─> RGB: Merkle root of state transitions
   ├─> LNP: Lightning commitment
   └─> Others: Protocol-specific data

2. Build protocol sub-trees
   └─> Each protocol creates own Merkle tree

3. Combine into MPC tree
   ├─> Order protocols deterministically
   ├─> Build combined Merkle tree
   └─> Calculate MPC root

4. Embed in Bitcoin transaction
   └─> Via Tapret or Opret
```

### Code Example

*To be expanded: MPC implementation*

```rust
// Placeholder example
use mpc::{MpcTree, ProtocolCommitment};

let rgb_commitment = ProtocolCommitment {
    tag: RGB_TAG,
    version: 1,
    data: rgb_merkle_root,
};

let lnp_commitment = ProtocolCommitment {
    tag: LNP_TAG,
    version: 1,
    data: lnp_data,
};

let mpc_tree = MpcTree::new()
    .add_protocol(rgb_commitment)?
    .add_protocol(lnp_commitment)?;

let mpc_root = mpc_tree.root();

// Embed in Bitcoin transaction
let commitment = create_tapret_commitment(mpc_root);
```

## Protocol Coordination

### Independent Operation

*To be expanded: Protocol independence*

Each protocol:
- Operates independently
- Has own validation rules
- Manages own state
- Doesn't need to know about others

**Key property**: Adding/removing protocols doesn't affect others

### Shared Transaction Space

*To be expanded: Coordinating Bitcoin usage*

Protocols share:
- Single Bitcoin transaction
- Transaction fees
- Blockchain space
- Confirmation time

Benefits:
- Cost sharing
- Efficiency
- Reduced blockchain bloat

## Verification Process

### MPC Proof Generation

*To be expanded: Creating protocol proofs*

For each protocol, generate:
- Merkle proof from protocol commitment to MPC root
- Protocol-specific validation data
- Bitcoin transaction reference

```
Proof for RGB:
  - RGB commitment
  - Merkle path: RGB → MPC root
  - Bitcoin transaction
  - Other protocols (optional)
```

### Verification Steps

*To be expanded: Verifying MPC commitments*

```
1. Extract commitment from Bitcoin transaction
   └─> Parse Tapret or Opret

2. Obtain MPC tree structure
   └─> Provided by sender in consignment

3. Locate protocol subtree
   └─> Find RGB (or other protocol)

4. Verify Merkle proof
   ├─> Hash protocol data
   ├─> Apply Merkle path
   └─> Compare with extracted commitment

5. Validate protocol-specific data
   └─> Run protocol validation logic
```

## Use Cases

### RGB + Lightning

*To be expanded: RGB and Lightning together*

Common combination:
- RGB assets in Lightning channels
- Same Bitcoin transaction commits both
- Coordinated updates
- Shared security model

Example:
```
Bitcoin TX commits:
  ├─> RGB: Token transfer
  └─> LNP: Channel update
```

### Multi-Asset Operations

*To be expanded: Multiple RGB contracts*

Single transaction with multiple RGB operations:
```
MPC Tree:
  └─> RGB
      ├─> Contract A: Token transfer
      ├─> Contract B: NFT transfer
      └─> Contract C: New issuance
```

### Cross-Protocol Atomic Operations

*To be expanded: Atomic cross-protocol operations*

Coordinated operations:
- RGB transfer + Lightning payment
- Multiple protocol updates
- Atomic success/failure
- Simplified implementation

## Efficiency Benefits

### Cost Amortization

*To be expanded: Sharing transaction costs*

Single Bitcoin transaction for:
- 100 RGB transfers
- 10 Lightning updates
- 5 other protocol operations

**Cost per operation**: Total fees / 115 operations

### Blockchain Efficiency

*To be expanded: Reducing blockchain impact*

Without MPC:
- 115 separate transactions
- 115 separate commitments
- High blockchain usage

With MPC:
- 1 transaction
- 1 commitment
- Minimal blockchain usage

**Savings**: ~99% reduction in blockchain space

## Privacy Considerations

### Protocol Privacy

*To be expanded: MPC privacy implications*

**Tapret MPC** (high privacy):
- Entire MPC tree hidden
- No protocol identification on-chain
- Selective revelation to recipients
- Only involved parties see their protocol

**Opret MPC** (moderate privacy):
- MPC root visible
- Individual protocols hidden
- Need proof to identify which protocols
- Better than separate commitments

### Selective Disclosure

*To be expanded: Revealing partial MPC trees*

Can prove participation without revealing:
- Other protocols in tree
- Other RGB contracts
- Unrelated operations
- Full tree structure

Example:
```
Prove RGB transfer without revealing:
  - Lightning update also in transaction
  - Other RGB contracts
  - Full MPC tree structure
```

## Adding New Protocols

### Protocol Registration

*To be expanded: Adding protocols to MPC*

Steps to add new protocol:
1. Define protocol tag (unique 4 bytes)
2. Specify commitment format
3. Implement Merkle tree integration
4. Provide verification logic
5. Publish specification

### Backwards Compatibility

*To be expanded: Maintaining compatibility*

Adding protocols doesn't break:
- Existing protocols
- Existing validators
- Existing commitments
- Previous specifications

**Key**: Each protocol validates independently

## Implementation Details

### MPC Tree Format

*To be expanded: Binary format specification*

```
MPC Tree Node:
  - Version: 1 byte
  - Node type: 1 byte (leaf/branch)
  - Data: variable

Leaf Node (Protocol):
  - Protocol tag: 4 bytes
  - Protocol version: 2 bytes
  - Commitment: 32+ bytes

Branch Node:
  - Left child hash: 32 bytes
  - Right child hash: 32 bytes
```

### Deterministic Ordering

*To be expanded: Protocol ordering rules*

Protocols ordered:
- Lexicographically by tag
- Deterministic for all implementations
- Same tree structure always
- Enables verification

### Proof Format

*To be expanded: Merkle proof structure*

```
MPC Merkle Proof:
  - Protocol tag: 4 bytes
  - Commitment: 32 bytes
  - Merkle path: [32 bytes] * depth
  - Sibling positions: [bool] * depth
```

## Error Handling

### Invalid MPC Trees

*To be expanded: Handling malformed trees*

Common errors:
- Duplicate protocol tags
- Invalid Merkle structure
- Missing protocol data
- Incorrect ordering

**Resolution**: Reject entire commitment

### Proof Verification Failures

*To be expanded: Failed verification*

When proof doesn't verify:
- Check proof completeness
- Verify hash calculations
- Confirm MPC root matches Bitcoin commitment
- Validate protocol data format

## Testing

### Test Vectors

*To be expanded: MPC test cases*

Test scenarios:
- Single protocol MPC
- Multi-protocol MPC
- Maximum tree depth
- All protocol combinations
- Edge cases

### Compatibility Testing

*To be expanded: Cross-implementation tests*

Ensure compatibility between:
- Different RGB implementations
- Different Lightning implementations
- Various Bitcoin libraries
- Multiple protocol versions

## Related Documentation

- [Deterministic Commitments](./deterministic-commitments.md) - Commitment architecture
- [Tapret](./tapret.md) - Tapret with MPC
- [Opret](./opret.md) - Opret with MPC
- [Lightning Integration](../../guides/lightning/overview.md) - RGB + Lightning

## References

*Coming soon: MPC specifications and protocol registry*

---

**Status**: Draft outline - To be expanded with detailed MPC specifications and protocol registry.
