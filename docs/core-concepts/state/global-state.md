---
sidebar_position: 3
title: Global State
description: Understanding RGB's global state for coordinated operations
---

# Global State

Global state in RGB enables coordination and shared information across all instances of a contract. Unlike owned state which is attached to individual UTXOs, global state is visible and verifiable by all contract participants, enabling use cases like DAOs, voting systems, and supply management.

## Overview

Global state represents data that:

- Is shared across all contract participants
- Requires coordination for updates
- Is publicly verifiable (within contract scope)
- Enables multi-party coordination
- Maintains deterministic consensus

This model is essential for applications requiring coordination, such as governance systems, auctions, and global supply caps.

## Global State Fundamentals

### Concept

*To be expanded: What is global state*

Global state is contract-level information that:

1. **Shared visibility**: All participants can read
2. **Coordinated updates**: Changes require consensus mechanism
3. **Deterministic**: Same for all validators
4. **Anchored**: Committed to Bitcoin for security
5. **Verifiable**: Anyone can validate state

```
[Placeholder for global state diagram]

┌─────────────────────────────────┐
│      RGB Contract               │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Global State            │ │
│  │                           │ │
│  │   TotalSupply: 1000000    │ │
│  │   ProposalCount: 5        │ │
│  │   VotingPeriod: 7 days    │ │
│  │                           │ │
│  └───────────────────────────┘ │
│           ▲                     │
│           │                     │
│  ┌────────┴──────────┐         │
│  │  All participants  │         │
│  │  can read & verify │         │
│  └────────────────────┘         │
└─────────────────────────────────┘
```

### Difference from Owned State

*To be expanded: Global vs. owned state*

| Aspect | Global State | Owned State |
|--------|--------------|-------------|
| Visibility | Public to all | Private to parties |
| Updates | Coordinated | Individual |
| Use case | Coordination | Transfers |
| Privacy | Lower | Higher |
| Scalability | Limited | Unlimited |

## State Definition

### Schema Definition

*To be expanded: Defining global state in schemas*

Global state is defined in contract schemas:

```rust
// Placeholder for global state definition
schema MyDAO {
    // Global state variables
    global TotalSupply: U64
    global SupplyCap: U64
    global ProposalCount: U64
    global VotingPeriod: U32

    // Owned state for individual holdings
    owned VotingPower: U64

    // Transitions can update global state
    transition CreateProposal {
        updates: [ProposalCount += 1]
        validate: { /* validation logic */ }
    }
}
```

### State Types

*To be expanded: Supported global state types*

Global state supports:

- **Primitives**: Integers, booleans, bytes
- **Collections**: Maps, arrays, sets
- **Structured data**: Custom types via Strict Types
- **Timestamps**: Block heights, time values
- **References**: Links to other state

## State Updates

### Update Mechanisms

*To be expanded: How global state changes*

Global state updates require:

1. **Valid transition**: Must follow schema rules
2. **Consensus mechanism**: Depends on contract design
3. **Bitcoin commitment**: Anchored on-chain
4. **Validation**: All participants verify

```
[Placeholder for update flow diagram]

1. Propose Update
   ┌──────────────┐
   │  Transition  │
   │  Request     │
   └──────────────┘
         │
         ▼
2. Consensus (if required)
   ┌──────────────┐
   │  Voting/     │
   │  Approval    │
   └──────────────┘
         │
         ▼
3. Bitcoin Commitment
   ┌──────────────┐
   │  Anchor to   │
   │  Bitcoin TX  │
   └──────────────┘
         │
         ▼
4. State Update
   ┌──────────────┐
   │  New Global  │
   │  State       │
   └──────────────┘
```

### Consensus Models

*To be expanded: Different consensus approaches*

Contracts can use various consensus models:

- **Single authority**: Contract issuer controls updates
- **Multi-sig**: M-of-N approvals required
- **Token-weighted voting**: Voting power from owned state
- **Time-locked**: Automatic updates after time period
- **Threshold signatures**: Schnorr/FROST signatures

### Atomic Updates

*To be expanded: Coordinating multiple updates*

Global state updates can be atomic across:
- Multiple global variables
- Global + owned state changes
- Cross-contract updates (advanced)

## State Visibility

### Public Verifiability

*To be expanded: How anyone can verify global state*

Global state is verifiable through:

1. **State commitments**: Merkle roots in Bitcoin
2. **Transition history**: Complete change log
3. **Validation proofs**: Cryptographic verification
4. **Consensus proof**: Evidence of approval

### State Queries

*To be expanded: Reading global state*

Applications query global state:

```typescript
// Placeholder for query API
const totalSupply = await contract.getGlobalState('TotalSupply');
const proposalCount = await contract.getGlobalState('ProposalCount');

// Query at specific point in time
const historicalSupply = await contract.getGlobalStateAt(
  'TotalSupply',
  blockHeight
);
```

### State Synchronization

*To be expanded: Keeping global state in sync*

Participants synchronize global state:

- Monitor Bitcoin commitments
- Validate state transitions
- Update local copies
- Detect conflicts
- Resolve discrepancies

## Use Cases

### Supply Management

*To be expanded: Tracking total supply*

Global supply cap enforcement:

```rust
// Placeholder schema
schema CappedToken {
    global TotalSupply: U64
    global SupplyCap: U64
    owned Balance: U64

    transition Issue {
        outputs: [Balance+]
        updates: [TotalSupply += sum(outputs)]
        validate: {
            TotalSupply <= SupplyCap
        }
    }

    transition Burn {
        inputs: [Balance+]
        updates: [TotalSupply -= sum(inputs)]
    }
}
```

### DAO Governance

*To be expanded: Decentralized governance*

Proposal and voting system:

```rust
// Placeholder schema
schema DAO {
    global ProposalCount: U64
    global Proposals: Map<U64, Proposal>
    owned VotingPower: U64

    transition CreateProposal {
        updates: [
            ProposalCount += 1,
            Proposals[ProposalCount] = new_proposal
        ]
    }

    transition Vote {
        inputs: [VotingPower]
        outputs: [VotingPower]  // Return voting power
        updates: [
            Proposals[proposal_id].votes += vote_amount
        ]
    }

    transition ExecuteProposal {
        validate: {
            Proposals[proposal_id].passed() &&
            Proposals[proposal_id].timelock_expired()
        }
        updates: [
            // Execute proposal action
        ]
    }
}
```

### Auctions and Markets

*To be expanded: Price discovery and trading*

Auction state management:

```rust
// Placeholder schema
schema Auction {
    global CurrentBid: U64
    global CurrentBidder: PublicKey
    global AuctionEnd: Timestamp
    owned BidToken: U64

    transition PlaceBid {
        inputs: [BidToken]
        validate: {
            input_amount > CurrentBid &&
            now() < AuctionEnd
        }
        updates: [
            CurrentBid = input_amount,
            CurrentBidder = bidder_key
        ]
    }

    transition CloseAuction {
        validate: { now() >= AuctionEnd }
        outputs: [BidToken -> winner]
    }
}
```

### Registries and Namespaces

*To be expanded: Decentralized registries*

Name registration system:

```rust
// Placeholder schema
schema NameRegistry {
    global Names: Map<String, Owner>
    global RegistrationCount: U64
    owned RegistrationRight: Unit

    transition Register {
        inputs: [RegistrationRight]
        updates: [
            Names[name] = owner,
            RegistrationCount += 1
        ]
        validate: {
            !Names.contains(name)  // Name not taken
        }
    }
}
```

## Privacy Considerations

### Transparency Trade-offs

*To be expanded: Balancing privacy and coordination*

Global state reduces privacy:

- **Visible to participants**: All can see global state
- **Transaction graph**: Updates may reveal relationships
- **Timing information**: Update times visible
- **Value disclosure**: Amounts may be public

### Privacy-Preserving Techniques

*To be expanded: Enhancing global state privacy*

Techniques to preserve privacy:

- **Commitments**: Hide actual values, reveal later
- **Zero-knowledge proofs**: Prove properties without revealing data
- **Aggregated data**: Only show totals, not individuals
- **Delayed disclosure**: Commit now, reveal later
- **Encrypted state**: Decrypt only when needed

Example with commitments:
```rust
// Placeholder
global CommittedValue: Hash
global RevealedValue: Option<U64>

transition Commit {
    updates: [CommittedValue = hash(value + nonce)]
}

transition Reveal {
    updates: [RevealedValue = value]
    validate: {
        hash(value + nonce) == CommittedValue
    }
}
```

## Coordination Patterns

### Voting Systems

*To be expanded: Implementing voting*

Token-weighted voting:

```rust
// Placeholder
transition Vote {
    inputs: [VotingPower]
    outputs: [VotingPower]  // Non-destructive voting
    updates: [
        Proposal[id].for_votes += amount,
    ]
    validate: {
        !already_voted(voter_id)
    }
}
```

### Multi-Signature Updates

*To be expanded: M-of-N approvals*

Require multiple approvals:

```rust
// Placeholder
global PendingUpdate: Option<StateUpdate>
global Approvals: Set<PublicKey>

transition ProposeUpdate {
    updates: [
        PendingUpdate = proposed_change
        Approvals = empty_set()
    ]
}

transition ApproveUpdate {
    updates: [
        Approvals.insert(signer_key)
    ]
}

transition ExecuteUpdate {
    validate: {
        Approvals.len() >= THRESHOLD
    }
    updates: [
        apply(PendingUpdate),
        PendingUpdate = None,
        Approvals = empty_set()
    ]
}
```

### Time-Locked Operations

*To be expanded: Scheduled state changes*

Automatic execution after timelock:

```rust
// Placeholder
global ScheduledUpdate: Option<Update>
global ExecutionTime: Timestamp

transition Schedule {
    updates: [
        ScheduledUpdate = update,
        ExecutionTime = now() + delay
    ]
}

transition Execute {
    validate: {
        now() >= ExecutionTime
    }
    updates: [
        apply(ScheduledUpdate),
        ScheduledUpdate = None
    ]
}
```

## Scalability Considerations

### State Size Limits

*To be expanded: Managing global state size*

Global state should remain bounded:

- **Pruning old data**: Remove obsolete information
- **Pagination**: Split large collections
- **Archival**: Move historical data off-chain
- **Compression**: Efficient encoding

### Update Frequency

*To be expanded: Rate limiting updates*

High update frequency challenges:

- Bitcoin transaction costs
- Coordination overhead
- State synchronization
- Validation complexity

**Solutions**:
- Batch updates
- Off-chain coordination with periodic anchoring
- Layer 2 state channels
- Optimistic updates with dispute resolution

## Validation and Consistency

### State Validation

*To be expanded: Validating global state transitions*

Validators check:

1. Transition follows schema rules
2. Consensus requirements met
3. State invariants maintained
4. Bitcoin commitment valid
5. No conflicts with other updates

### Conflict Resolution

*To be expanded: Handling conflicting updates*

When multiple updates conflict:

- **First-seen rule**: First valid update wins
- **Bitcoin ordering**: Use Bitcoin block order
- **Explicit priority**: Schema defines precedence
- **Merger**: Combine compatible updates

### State Forks

*To be expanded: Preventing and handling forks*

Global state can fork if:
- Different validators see different updates first
- Network partition occurs
- Conflicting consensus decisions

**Prevention**:
- Clear ordering rules
- Bitcoin anchoring for finality
- Waiting for confirmations
- Explicit conflict resolution

## Performance Optimization

### Caching Strategies

*To be expanded: Efficient state access*

- Cache current global state locally
- Incremental updates
- Lazy loading of historical state
- Indexed queries

### Validation Optimization

*To be expanded: Fast validation*

- Parallel validation of independent transitions
- Merkle proof verification
- Cached intermediate results
- Optimized state serialization

## Testing Global State

### Unit Tests

*To be expanded: Testing state transitions*

```rust
// Placeholder test
#[test]
fn test_supply_cap_enforcement() {
    let mut contract = Contract::new();
    contract.global.insert("SupplyCap", 1000000);
    contract.global.insert("TotalSupply", 900000);

    let issue = Issue { amount: 150000 };

    assert!(issue.validate(&contract).is_err());
    // Exceeds supply cap
}
```

### Integration Tests

*To be expanded: End-to-end testing*

Test complete workflows:
- Proposal creation and voting
- Multi-party coordination
- Timelock execution
- Conflict resolution

## Related Documentation

- [Unified State Model](./unified-state.md) - Overall state architecture
- [Owned State](./owned-state.md) - Private UTXO-attached state
- [State Transitions](../../guides/contracts/state-transitions.md) - Creating transitions
- [Schemas](../../guides/contracts/schemas.md) - Schema design guide

## References

*Coming soon: Global state coordination research and specifications*

---

**Status**: Draft outline - To be expanded with detailed coordination patterns and implementation examples.
