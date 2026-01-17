---
sidebar_position: 5
title: Bundles
description: Transaction bundles - Multiple RGB operations in single Bitcoin transaction
---

# Transaction Bundles

**Bundles** allow multiple RGB state transitions and contract operations to be committed to a single Bitcoin transaction, enabling atomic multi-contract operations and improved efficiency.

## What is a Bundle?

A bundle aggregates multiple RGB operations into one Bitcoin transaction commitment:

```
Single Bitcoin Transaction
    │
    ├─ RGB Operation 1 (Contract A: Transfer)
    ├─ RGB Operation 2 (Contract B: Issuance)
    ├─ RGB Operation 3 (Contract C: Burn)
    └─ RGB Operation 4 (Contract A: Another transfer)

All operations atomic: All succeed or all fail
```

## Why Use Bundles?

### 1. Atomicity

```rust
// Without bundles: Two separate Bitcoin transactions
tx1: Transfer 100 USDT to Alice
tx2: Receive 0.1 BTC from Alice

// Problem: One might confirm, the other might fail
// Risk: Non-atomic swap

// With bundles: Single Bitcoin transaction
bundle {
    op1: Transfer 100 USDT to Alice,
    op2: Receive 0.1 BTC from Alice
}

// Both succeed together or both fail together
```

### 2. Cost Efficiency

```rust
// Without bundles
Transaction 1: Transfer Token A  (pays ~5,000 sats fee)
Transaction 2: Transfer Token B  (pays ~5,000 sats fee)
Transaction 3: Transfer Token C  (pays ~5,000 sats fee)
Total cost: ~15,000 sats

// With bundles
Transaction (bundle): Transfer A, B, C  (pays ~6,000 sats fee)
Savings: ~9,000 sats (60% reduction)
```

### 3. Privacy

```rust
// Without bundles: Multiple transactions reveal correlation
TX a1b2c3: RGB contract X state transition
TX d4e5f6: RGB contract Y state transition
// On-chain analysis: Same timing, likely same user

// With bundles: Single transaction, less correlation
TX g7h8i9: Multiple RGB operations
// Single transaction, harder to determine number of contracts
```

## Creating Bundles

### Basic Bundle

```rust
use rgb::{Bundle, Transition};

// Create individual operations
let transfer_usdt = create_transfer(
    contract: usdt_contract,
    amount: 1000,
    recipient: alice_seal
)?;

let transfer_token = create_transfer(
    contract: my_token_contract,
    amount: 500,
    recipient: bob_seal
)?;

// Combine into bundle
let bundle = Bundle::new(vec![
    transfer_usdt,
    transfer_token
]);

// Commit to single Bitcoin transaction
let psbt = bundle.to_psbt(bitcoin_wallet)?;
```

### Atomic Swaps

```rust
// Atomic token swap: USDT ↔ Custom Token
pub fn atomic_swap(
    offer_contract: ContractId,
    offer_amount: Amount,
    want_contract: ContractId,
    want_amount: Amount,
    counterparty_seal: Seal,
    my_seal: Seal,
) -> Result<Bundle, Error> {

    // My operation: Send offer
    let my_transfer = Transition::transfer(
        offer_contract,
        offer_amount,
        counterparty_seal,
        my_change_seal
    )?;

    // Counterparty operation: Send want
    let counterparty_transfer = Transition::transfer(
        want_contract,
        want_amount,
        my_seal,
        counterparty_change_seal
    )?;

    // Bundle both operations
    let bundle = Bundle::new(vec![
        my_transfer,
        counterparty_transfer
    ]);

    // Both transfers happen atomically
    Ok(bundle)
}

// Usage
let swap = atomic_swap(
    usdt_contract,
    Amount::from(1000),  // I send 1000 USDT
    btc_token_contract,
    Amount::from(10),    // I receive 10 BTC tokens
    alice_seal,
    my_seal
)?;
```

### Multi-Contract Operations

```rust
// Pay multiple recipients from multiple contracts
pub fn multi_payment(
    payments: Vec<Payment>,
    change_seal: Seal
) -> Result<Bundle, Error> {

    let mut operations = Vec::new();

    for payment in payments {
        let transfer = Transition::transfer(
            payment.contract,
            payment.amount,
            payment.recipient,
            change_seal
        )?;

        operations.push(transfer);
    }

    Ok(Bundle::new(operations))
}

// Usage: Pay salaries in multiple tokens
let salaries = vec![
    Payment {
        contract: usdt_contract,
        amount: Amount::from(5000),
        recipient: employee1_seal,
    },
    Payment {
        contract: usdc_contract,
        amount: Amount::from(3000),
        recipient: employee2_seal,
    },
    Payment {
        contract: company_token,
        amount: Amount::from(10000),
        recipient: employee3_seal,
    },
];

let bundle = multi_payment(salaries, company_change_seal)?;
```

## Bundle Structure

```rust
pub struct Bundle {
    /// All state transitions in this bundle
    pub transitions: BTreeMap<ContractId, Vec<Transition>>,

    /// Anchor data (Bitcoin transaction commitment)
    pub anchor: Anchor,

    /// Witness data for all transitions
    pub witness: Witness,
}

impl Bundle {
    /// Create new bundle from transitions
    pub fn new(transitions: Vec<Transition>) -> Self;

    /// Add transition to existing bundle
    pub fn add_transition(&mut self, transition: Transition);

    /// Create commitment for Bitcoin transaction
    pub fn commitment(&self) -> [u8; 32];

    /// Convert to PSBT for signing
    pub fn to_psbt(&self, wallet: &Wallet) -> Result<Psbt, Error>;
}
```

## Anchor Mechanism

Bundles use **anchors** to commit to Bitcoin:

```rust
pub struct Anchor {
    /// Bitcoin transaction ID
    pub txid: Txid,

    /// Commitment method (Tapret or Opret)
    pub method: Method,

    /// Multi-Protocol Commitment root
    pub mpc_root: [u8; 32],

    /// Individual contract commitments
    pub dbc_proofs: BTreeMap<ContractId, DbcProof>,
}

// Bundle commitment process:
// 1. Each transition creates commitment
// 2. Commitments combined in MPC tree
// 3. MPC root committed to Bitcoin output
// 4. All transitions verified via Merkle proofs
```

## Validation

### Bundle Validation Rules

```rust
impl Bundle {
    pub fn validate(&self) -> Result<(), ValidationError> {
        // 1. All transitions must be valid individually
        for (contract_id, transitions) in &self.transitions {
            for transition in transitions {
                transition.validate()?;
            }
        }

        // 2. No conflicting seals
        self.verify_no_seal_conflicts()?;

        // 3. Anchor must be valid
        self.anchor.verify()?;

        // 4. All commitments must be in MPC tree
        self.verify_mpc_inclusion()?;

        // 5. Bitcoin transaction must confirm
        self.verify_bitcoin_confirmation()?;

        Ok(())
    }
}
```

### Seal Conflict Detection

```rust
// Invalid bundle: Same seal used twice
let bundle = Bundle::new(vec![
    Transition {
        inputs: vec![seal_a],  // ❌ Uses seal_a
        outputs: vec![seal_b],
    },
    Transition {
        inputs: vec![seal_a],  // ❌ Uses seal_a again
        outputs: vec![seal_c],
    },
]);

// Error: seal_a cannot be spent twice in same bundle
bundle.validate()?; // Returns error

// Valid bundle: Each seal used once
let bundle = Bundle::new(vec![
    Transition {
        inputs: vec![seal_a],  // ✓ Uses seal_a
        outputs: vec![seal_b],
    },
    Transition {
        inputs: vec![seal_d],  // ✓ Uses seal_d (different)
        outputs: vec![seal_c],
    },
]);
```

## Advanced Patterns

### Conditional Bundles

```rust
// Bundle with fallback: Try bundle, fall back to individual ops
pub fn try_bundle_or_split(
    operations: Vec<Transition>
) -> Result<Vec<Psbt>, Error> {

    // Try to create bundle
    match Bundle::new(operations.clone()).to_psbt() {
        Ok(psbt) => {
            // Bundle successful
            vec![psbt]
        }
        Err(_) => {
            // Bundle failed, create individual PSBTs
            operations.into_iter()
                .map(|op| op.to_psbt())
                .collect::<Result<Vec<_>, _>>()?
        }
    }
}
```

### Batch Issuance

```rust
// Issue multiple contracts in single transaction
pub fn batch_issue(
    issuances: Vec<GenesisParams>
) -> Result<Bundle, Error> {

    let mut operations = Vec::new();

    for params in issuances {
        let genesis = Genesis::new(params)?;
        operations.push(genesis);
    }

    Ok(Bundle::new(operations))
}

// Usage: Launch multiple tokens at once
let batch = batch_issue(vec![
    GenesisParams { /* USDT params */ },
    GenesisParams { /* USDC params */ },
    GenesisParams { /* DAI params */ },
])?;

// All tokens issued in single Bitcoin transaction
```

### DeFi Composability

```rust
// Complex DeFi operation: Swap + Add Liquidity in one bundle
pub fn swap_and_add_liquidity(
    token_a: ContractId,
    token_b: ContractId,
    lp_token: ContractId,
    swap_amount: Amount,
    liquidity_amount_a: Amount,
    liquidity_amount_b: Amount,
) -> Result<Bundle, Error> {

    let operations = vec![
        // 1. Swap token A for token B
        Transition::transfer(token_a, swap_amount, dex_seal)?,

        // 2. Receive swapped token B
        Transition::receive(token_b, swap_result_seal)?,

        // 3. Add liquidity (token A + token B)
        Transition::transfer(token_a, liquidity_amount_a, pool_seal)?,
        Transition::transfer(token_b, liquidity_amount_b, pool_seal)?,

        // 4. Receive LP tokens
        Transition::receive(lp_token, lp_seal)?,
    ];

    Ok(Bundle::new(operations))
}
```

## Bundle Size Limits

```rust
// Bitcoin transaction size limits apply
const MAX_TX_SIZE: usize = 100_000;  // 100 KB standard limit

impl Bundle {
    /// Estimate bundle size
    pub fn estimated_size(&self) -> usize {
        let base_tx_size = 200;  // Base transaction
        let per_transition_size = 150;  // Average per transition

        base_tx_size + (self.transitions.len() * per_transition_size)
    }

    /// Check if bundle fits in transaction
    pub fn fits_in_transaction(&self) -> bool {
        self.estimated_size() < MAX_TX_SIZE
    }
}

// Split large bundles
pub fn split_if_too_large(bundle: Bundle) -> Vec<Bundle> {
    if bundle.fits_in_transaction() {
        return vec![bundle];
    }

    // Split into multiple bundles
    bundle.split_into_chunks(MAX_TX_SIZE)
}
```

## Fee Calculation

```rust
// Bundle fees = Bitcoin fee + RGB processing fee
pub fn calculate_bundle_fee(
    bundle: &Bundle,
    fee_rate: FeeRate,  // sats/vByte
) -> Amount {

    // Bitcoin transaction size
    let tx_size = bundle.estimated_size();

    // Bitcoin network fee
    let btc_fee = tx_size * fee_rate;

    // RGB operations don't add network fee
    // (state transitions are off-chain)

    Amount::from_sat(btc_fee)
}

// Fee optimization
pub fn optimize_bundle_fees(
    operations: Vec<Transition>,
    max_fee: Amount,
    fee_rate: FeeRate,
) -> Result<Vec<Bundle>, Error> {

    let mut bundles = Vec::new();
    let mut current_bundle = Vec::new();

    for op in operations {
        current_bundle.push(op);

        let bundle = Bundle::new(current_bundle.clone());
        let fee = calculate_bundle_fee(&bundle, fee_rate);

        if fee > max_fee {
            // Start new bundle
            current_bundle.pop();
            bundles.push(Bundle::new(current_bundle));
            current_bundle = vec![op];
        }
    }

    if !current_bundle.is_empty() {
        bundles.push(Bundle::new(current_bundle));
    }

    Ok(bundles)
}
```

## Error Handling

```rust
pub enum BundleError {
    /// Seal used multiple times
    SealConflict(Seal),

    /// Invalid transition in bundle
    InvalidTransition(ContractId, TransitionId),

    /// Bitcoin transaction too large
    TransactionTooLarge { size: usize, max: usize },

    /// Insufficient Bitcoin funds for fees
    InsufficientBtcFees { required: Amount, available: Amount },

    /// Anchor verification failed
    InvalidAnchor,

    /// MPC proof missing
    MissingMpcProof(ContractId),
}

// Handle bundle errors
match bundle.finalize() {
    Ok(psbt) => {
        // Success: Sign and broadcast
    }
    Err(BundleError::SealConflict(seal)) => {
        // Split bundle to avoid conflict
        let bundles = split_to_avoid_conflict(bundle, seal);
    }
    Err(BundleError::TransactionTooLarge { .. }) => {
        // Split into smaller bundles
        let bundles = bundle.split_into_chunks(MAX_TX_SIZE);
    }
    Err(e) => {
        return Err(e);
    }
}
```

## Best Practices

### When to Use Bundles

✅ **Good use cases:**
- Atomic swaps
- Multi-token payments
- DeFi operations (swap + provide liquidity)
- Batch operations (issue multiple contracts)
- Privacy (combine unrelated operations)

❌ **Avoid bundles for:**
- Simple single-contract transfers
- When operations might fail independently
- Time-sensitive operations (harder to coordinate)

### Bundle Coordination

```rust
// Multi-party bundle coordination
pub struct BundleCoordinator {
    pending_operations: Vec<Transition>,
    participants: Vec<PublicKey>,
    signatures: BTreeMap<PublicKey, Signature>,
}

impl BundleCoordinator {
    /// Add operation from participant
    pub fn add_operation(&mut self, op: Transition, participant: PublicKey);

    /// Check if all operations received
    pub fn is_complete(&self) -> bool;

    /// Create bundle PSBT for signing
    pub fn create_psbt(&self) -> Result<Psbt, Error>;

    /// Collect signature from participant
    pub fn add_signature(&mut self, sig: Signature, participant: PublicKey);

    /// Finalize when all signatures collected
    pub fn finalize(&self) -> Result<Transaction, Error>;
}
```

## CLI Usage

```bash
# Create bundle from multiple operations
rgb bundle create \
  --operation transfer.rgb \
  --operation swap.rgb \
  --operation payment.rgb \
  --output bundle.psbt

# Validate bundle
rgb bundle validate bundle.psbt

# Sign bundle
rgb bundle sign bundle.psbt --key wallet.key

# Broadcast bundle
rgb bundle broadcast signed-bundle.psbt

# Monitor bundle confirmation
rgb bundle status --txid a1b2c3d4...
```

## See Also

- [State Transitions](/guides/contracts/state-transitions) - Creating transitions
- [Anchors](/technical-reference/api#anchors) - Bitcoin commitment mechanism
- [Multi-Protocol Commitments](/core-concepts/bitcoin/multi-protocol-commitments) - MPC trees
- [PSBT Integration](/guides/development/wallet-integration#psbt) - Partially Signed Bitcoin Transactions
- [Atomic Swaps](/guides/rgb20/transferring-assets#atomic-swaps) - Cross-contract swaps
