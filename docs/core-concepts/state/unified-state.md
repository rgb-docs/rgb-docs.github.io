---
sidebar_position: 1
title: Unified State Model
description: RGB's unified approach to state management
---

# Unified State Model

RGB v0.12 introduces a unified state model that elegantly combines owned and global state into a single coherent framework. This model provides the flexibility needed for complex smart contracts while maintaining the privacy and scalability advantages of client-side validation.

## Overview

The unified state model in RGB allows contracts to manage:

- **Owned state**: State attached to specific UTXOs (single-use seals)
- **Global state**: State shared across all contract instances
- **Hybrid state**: Combinations of owned and global state

This flexibility enables RGB to support a wide range of applications from simple token transfers to complex DeFi protocols and DAOs.

## State Architecture

### Unified Design

*To be expanded: How owned and global state work together*

```
[Placeholder for state architecture diagram]

┌─────────────────────────────────────┐
│         RGB Contract                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     Global State              │ │
│  │  - Shared across all UTXOs    │ │
│  │  - Consensus-based updates    │ │
│  │  - DAO governance             │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     Owned State               │ │
│  │  - Attached to UTXOs          │ │
│  │  - Private transfers          │ │
│  │  - Individual balances        │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │     State Transitions         │ │
│  │  - Validate both state types  │ │
│  │  - Coordinate updates         │ │
│  │  - Maintain consistency       │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### State Types

*To be expanded: Different kinds of state*

See individual documentation:
- [Owned State](./owned-state.md) - UTXO-attached state
- [Global State](./global-state.md) - Shared contract state

## State Definitions

### Schema-Level Definition

*To be expanded: Defining state in schemas*

State is defined in RGB schemas:

```rust
// Placeholder for schema definition
schema MyContract {
    // Global state
    global TotalSupply: U64

    // Owned state
    owned Balance: U64
    owned AssetData: Bytes

    // State transitions can modify both
}
```

### State Types and Semantics

*To be expanded: State type system*

Supported state types:
- **Unsigned integers**: U8, U16, U32, U64, U128, U256
- **Signed integers**: I8, I16, I32, I64, I128, I256
- **Bytes**: Fixed and variable-length byte arrays
- **Strings**: UTF-8 encoded text
- **Structured data**: Custom types via Strict Types
- **Collections**: Arrays, sets, maps

## State Transitions

### Modifying State

*To be expanded: How state changes*

State transitions define rules for modifying state:

```rust
// Placeholder for state transition definition
transition Transfer {
    // Inputs: owned state being consumed
    inputs: [Balance]

    // Outputs: new owned state being created
    outputs: [Balance, Balance]

    // Global state updates
    updates: []

    // Validation logic
    validate: {
        // Sum of outputs must equal sum of inputs
        sum(outputs.Balance) == sum(inputs.Balance)
    }
}
```

### Validation Rules

*To be expanded: State transition validation*

Every state transition must:
1. Consume valid inputs (owned state)
2. Reference current global state
3. Produce valid outputs
4. Satisfy validation predicates
5. Maintain state invariants

### Atomicity

*To be expanded: All-or-nothing updates*

State transitions are atomic:
- Either all state updates succeed
- Or none take effect
- No partial updates
- Consistency maintained

## State History

### Tracking Changes

*To be expanded: State evolution over time*

RGB maintains complete history of state changes:

```
[Placeholder for state history diagram]

Genesis
  │
  ├─→ Transition 1 → State 1
  │
  ├─→ Transition 2 → State 2
  │
  ├─→ Transition 3 → State 3
  │
  └─→ Current State
```

### History Pruning

*To be expanded: Optimizing history storage*

- Recipients only need relevant history
- Old state can be pruned
- Cryptographic commitments remain
- Verification still possible

## State Commitment

### Merkle Tree Structure

*To be expanded: How state is committed*

State is committed using Merkle trees:

```
[Placeholder for Merkle tree diagram]

          Root Hash
         /          \
    Hash(A,B)    Hash(C,D)
     /    \       /    \
  Hash(A) Hash(B) Hash(C) Hash(D)
    |      |       |       |
  State  State   State   State
    A      B       C       D
```

**Properties**:
- Compact representation
- Efficient updates
- Proof of inclusion
- Tamper resistance

### Bitcoin Anchoring

*To be expanded: Committing to Bitcoin*

State commitments are anchored to Bitcoin:

1. Compute state Merkle root
2. Combine with other protocol commitments
3. Embed in Bitcoin transaction
4. Achieve Bitcoin-level security

See [Deterministic Commitments](../bitcoin/deterministic-commitments.md) for details.

## State Queries

### Reading Current State

*To be expanded: Querying state*

Applications query current state:

```typescript
// Placeholder for query example
const balance = await contract.getOwnedState(utxo, 'Balance');
const totalSupply = await contract.getGlobalState('TotalSupply');
```

### Historical Queries

*To be expanded: Querying past state*

Query state at specific points:

```typescript
// State at specific transition
const pastBalance = await contract.getOwnedStateAt(
  utxo,
  'Balance',
  transitionId
);
```

### State Proofs

*To be expanded: Proving state values*

Generate proofs for state values:
- Merkle inclusion proofs
- Historical state proofs
- Ownership proofs
- Verification without full history

## State Synchronization

### Client State Management

*To be expanded: Managing state on clients*

Clients maintain:
- Relevant owned state (their UTXOs)
- Current global state
- Pending transitions
- Validation history

### State Updates

*To be expanded: Receiving state updates*

When receiving assets:
1. Receive consignment
2. Validate state history
3. Update local state database
4. Accept or reject transfer

### Conflict Resolution

*To be expanded: Handling conflicts*

**Owned state conflicts**: Impossible (UTXO model)
**Global state conflicts**: Resolved by consensus rules

## Privacy Considerations

### Owned State Privacy

*To be expanded: Privacy of owned state*

Owned state is private:
- Only parties to a transfer see it
- No global visibility
- Selective disclosure possible
- Confidential amounts (optional)

### Global State Visibility

*To be expanded: Global state transparency*

Global state may be public:
- Visible to all participants
- Necessary for coordination
- Can still use commitments
- Zero-knowledge proofs possible

### Balance Privacy vs. Transparency

*To be expanded: Design tradeoffs*

Choosing between privacy and transparency:

| Use Case | Owned State | Global State |
|----------|-------------|--------------|
| Private transfers | ✓ High privacy | Limited |
| Public auditability | Limited | ✓ Full transparency |
| DAO voting | Can be private | Vote counts public |
| Supply cap | Can be private | Cap is public |

## Performance Optimization

### State Storage

*To be expanded: Efficient state storage*

- Compact serialization
- Deduplication
- Compression
- Indexed access

### State Caching

*To be expanded: Caching strategies*

- Cache current state
- Lazy loading of history
- Incremental updates
- Memory-mapped databases

### Parallel Validation

*To be expanded: Concurrent validation*

- Independent UTXO validation
- Parallel history verification
- Batch processing
- Multi-core utilization

## Use Cases

### Token Balances (Owned State)

*To be expanded: Token balance management*

```rust
// Simple token with owned balances
schema RGB20 {
    owned Balance: U64

    transition Transfer {
        inputs: [Balance]
        outputs: [Balance+]
        validate: sum(inputs) == sum(outputs)
    }
}
```

### Supply Management (Global State)

*To be expanded: Global supply tracking*

```rust
// Token with global supply cap
schema RGB20Extended {
    global TotalSupply: U64
    global SupplyCap: U64
    owned Balance: U64

    transition Issue {
        outputs: [Balance+]
        updates: [TotalSupply += sum(outputs)]
        validate: TotalSupply <= SupplyCap
    }
}
```

### DAO Governance (Hybrid State)

*To be expanded: Combining state types*

```rust
// DAO with voting
schema DAO {
    global ProposalCount: U64
    global Proposal: Map<U64, ProposalData>
    owned VotingPower: U64

    transition CreateProposal { /* ... */ }
    transition Vote { /* ... */ }
    transition Execute { /* ... */ }
}
```

## Migration and Upgrades

### Schema Evolution

*To be expanded: Evolving state schemas*

- Adding new state fields
- Deprecating old fields
- Migrating data
- Backward compatibility

### State Migration

*To be expanded: Migrating state between schemas*

- Migration transactions
- Data transformation
- Validation during migration
- Rollback capabilities

## Error Handling

### Invalid State Transitions

*To be expanded: Handling validation failures*

Common validation errors:
- Insufficient balance
- Invalid state type
- Constraint violation
- Missing signatures

### Recovery Mechanisms

*To be expanded: Error recovery*

- Reject invalid transitions
- Maintain last valid state
- Provide error diagnostics
- Allow retry with corrections

## Testing State Logic

### Unit Testing

*To be expanded: Testing state transitions*

```rust
// Placeholder for test example
#[test]
fn test_transfer_validation() {
    let mut state = State::new();
    state.owned.insert("Balance", 1000);

    let transition = Transfer {
        inputs: vec![1000],
        outputs: vec![600, 400],
    };

    assert!(transition.validate(&state));
}
```

### Property-Based Testing

*To be expanded: Invariant testing*

Test state invariants:
- Sum preservation
- Non-negative balances
- Supply cap enforcement
- Access control rules

## Related Documentation

- [Owned State](./owned-state.md) - UTXO-attached state details
- [Global State](./global-state.md) - Shared state details
- [State Transitions](../../guides/contracts/state-transitions.md) - Creating transitions
- [Schemas](../../guides/contracts/schemas.md) - Schema design
- [Strict Types](../../technical-reference/strict-types.md) - Type system

## References

*Coming soon: State model specifications and research papers*

---

**Status**: Draft outline - To be expanded with detailed state management patterns and examples.
