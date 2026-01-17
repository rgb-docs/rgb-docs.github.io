---
sidebar_position: 2
title: Client-Side Validation
description: Understanding RGB's revolutionary validation paradigm
---

# Client-Side Validation

Client-side validation is the foundational concept that makes RGB unique. It fundamentally reverses how blockchain systems work by moving validation from the network to the client.

## The Paradigm Shift

### Traditional Blockchain Validation

```
Every node validates every transaction
↓
Global state replication
↓
Limited scalability
↓
No privacy
```

### RGB Client-Side Validation

```
Only involved parties validate
↓
Partial state replication
↓
Massive scalability
↓
Strong privacy
```

## How It Works

### 1. State Ownership

In RGB, you only need to know about state that belongs to you:

```typescript
// Alice doesn't know about Bob's assets
// Bob doesn't know about Charlie's assets
// Each validates only what they own
```

### 2. Consignment Transfer

When transferring assets, the sender provides a **consignment** - a data package containing all validation data:

```
Sender creates consignment containing:
├── Asset origin (genesis)
├── Full ownership history
├── State transitions
├── Witness data
└── Bitcoin commitments
```

### 3. Recipient Validation

The recipient validates the consignment independently:

```rust
// Pseudocode validation flow
fn validate_consignment(consignment: Consignment) -> Result<()> {
    // 1. Verify genesis is valid
    verify_genesis(&consignment.genesis)?;

    // 2. Verify all state transitions
    for transition in &consignment.transitions {
        verify_transition(transition)?;
        verify_bitcoin_commitment(transition)?;
    }

    // 3. Verify seals are properly closed
    verify_seals(&consignment)?;

    // 4. Verify I'm the recipient
    verify_ownership(&consignment, my_utxo)?;

    Ok(())
}
```

## Benefits

### Privacy

Since only involved parties see the data:

- **No public transaction history**
- **No public balances**
- **No public contract state**
- Third parties can't track your assets

### Scalability

Validation complexity is O(personal history), not O(global state):

```
Traditional: Validate ALL transactions ever
RGB: Validate only YOUR transaction history
```

This enables:
- Parallel validation across different assets
- No global state synchronization
- Unlimited number of contracts

### Efficiency

```
Memory usage: Hundreds of bytes (not gigabytes)
Validation time: Milliseconds (not seconds)
Network bandwidth: Minimal
```

## Consignment Structure

### Anatomy of a Consignment

```rust
struct Consignment {
    // Contract origin
    genesis: Genesis,

    // All state transitions in ownership chain
    transitions: Vec<StateTransition>,

    // Bitcoin transaction witnesses
    witnesses: Vec<BitcoinTx>,

    // Extension data (optional)
    extensions: Vec<Extension>,

    // Terminal states
    terminals: Vec<Terminal>,
}
```

### Stream-Based Validation (v0.12)

RGB v0.12 introduced streaming validation:

```rust
// Don't load entire consignment into memory
let mut stream = ConsignmentStream::new(file)?;

// Validate on-the-fly
while let Some(chunk) = stream.next()? {
    validate_chunk(chunk)?;
}

// Memory usage: ~200 bytes throughout
```

## Validation Rules

### 1. Genesis Validation

```rust
fn validate_genesis(genesis: &Genesis) -> Result<()> {
    // Verify schema compliance
    verify_schema(&genesis.schema)?;

    // Verify initial state allocations
    verify_initial_state(&genesis.assignments)?;

    // Verify metadata
    verify_metadata(&genesis.metadata)?;

    Ok(())
}
```

### 2. Transition Validation

```rust
fn validate_transition(transition: &Transition) -> Result<()> {
    // Verify inputs exist and are unspent
    verify_inputs(&transition.inputs)?;

    // Execute AluVM validation code
    execute_validation_script(&transition.script)?;

    // Verify state transformation rules
    verify_state_change(&transition)?;

    // Verify Bitcoin commitment
    verify_commitment(&transition.commitment)?;

    Ok(())
}
```

### 3. Seal Verification

```rust
fn verify_seals(consignment: &Consignment) -> Result<()> {
    for transition in &consignment.transitions {
        for seal in &transition.seals {
            // Verify seal was closed (UTXO spent)
            verify_seal_closed(seal)?;

            // Verify closure witness
            verify_closure_witness(seal)?;
        }
    }
    Ok(())
}
```

## Client-Side Validation in Practice

### Example: Token Transfer

```
1. Recipient generates invoice
   ├── Creates blinded UTXO
   └── Shares invoice with sender

2. Sender creates transfer
   ├── Selects own tokens to spend
   ├── Creates state transition
   ├── Commits to Bitcoin transaction
   └── Creates consignment

3. Sender delivers consignment
   ├── Off-chain (email, QR, etc.)
   └── Along with Bitcoin tx

4. Recipient validates
   ├── Checks full history
   ├── Verifies Bitcoin commitments
   ├── Verifies seals
   └── Accepts if valid

5. Bitcoin transaction confirms
   ├── Seals are closed
   └── Transfer is final
```

## Comparison with On-Chain Validation

| Aspect | On-Chain | Client-Side |
|--------|----------|-------------|
| Validator | All nodes | Only parties involved |
| Privacy | Public | Private |
| Scalability | Limited | Massive |
| State Storage | Blockchain | Off-chain |
| Validation Cost | Network-wide | Individual |
| Throughput | ~10 TPS (Bitcoin) | Unlimited |

## Advanced Concepts

### Proof Compression

Future zk-STARK integration will compress consignments:

```
Current: ~100 lines of validation code
Future: Single zk-STARK proof
Size: Constant regardless of history length
```

### Partial Disclosure

You can prove specific facts without revealing full history:

```rust
// Prove balance without revealing transactions
let proof = create_balance_proof(
    balance: 1000,
    without_revealing_history: true
);
```

### History Pruning

Consignments can be "merged" to reduce size:

```
Long history: A → B → C → D → E (5 transitions)
Pruned: A → E (1 transition)
Validity: Same cryptographic guarantees
```

## Implementation Details

### Validation Order

```rust
// Topological sort of DAG
let ordered = topological_sort(&consignment.transitions);

// Validate in dependency order
for transition in ordered {
    validate_transition(transition)?;
}
```

### Caching

```rust
// Cache validation results
let mut cache = ValidationCache::new();

// Reuse previous validations
if let Some(result) = cache.get(&transition_id) {
    return result;
}
```

### Parallel Validation

```rust
// Validate independent branches in parallel
let results = transitions
    .par_iter()
    .map(|t| validate_transition(t))
    .collect::<Result<Vec<_>>>()?;
```

## Security Considerations

### Double-Spend Prevention {#single-use-seals}

Client-side validation prevents double-spending through:

1. **Single-use seals** - Can only be closed once
2. **Bitcoin confirmation** - Seal closure is final
3. **Cryptographic commitment** - Linked to specific state

### Validation Completeness

Recipients must validate:

- ✓ All transitions from genesis
- ✓ All Bitcoin commitments
- ✓ All seal closures
- ✓ Schema compliance
- ✓ AluVM execution

**Incomplete validation = Risk of invalid assets**

### Trust Model

```
Don't trust, verify!

You validate:
├── Full ownership history
├── Bitcoin commitments
├── Cryptographic proofs
└── Smart contract logic

You don't trust:
├── Sender's claims
├── Third party validation
└── Network consensus
```

## Best Practices

### For Wallet Developers

```typescript
// Always validate before accepting
async function acceptTransfer(consignment: Consignment) {
    // Validate consignment
    await validateConsignment(consignment);

    // Check Bitcoin confirmation
    await waitForConfirmation(consignment.txid);

    // Update local state
    await updateBalances();
}
```

### For Users

```
1. Always wait for Bitcoin confirmation
2. Verify consignment size is reasonable
3. Keep backup of consignment files
4. Validate immediately upon receipt
```

## Common Pitfalls

### ❌ Trusting Without Validating

```typescript
// WRONG: Assuming sender is honest
function unsafeAccept(consignment: Consignment) {
    // Just accept without validation
    updateBalance(+100); // Dangerous!
}

// RIGHT: Always validate
async function safeAccept(consignment: Consignment) {
    await fullValidation(consignment);
    updateBalance(validated_amount);
}
```

### ❌ Partial Validation

```typescript
// WRONG: Only checking some transitions
function partialValidation(consignment: Consignment) {
    validate(consignment.latest); // Incomplete!
}

// RIGHT: Full history validation
function fullValidation(consignment: Consignment) {
    validateFromGenesis(consignment); // Complete!
}
```

## Next Steps

- [**Single-Use Seals**](/core-concepts/single-use-seals) - How double-spending is prevented
- [**PRISM Computing**](/core-concepts/prism-computing) - The computational model
- [**Consignments**](/technical-reference/consignments) - Technical specification

## Additional Resources

- [Client-Side Validation Whitepaper](https://rgb-org.github.io/)
- [Validation Implementation](https://github.com/RGB-WG/rgb-core/tree/master/src/validation)
