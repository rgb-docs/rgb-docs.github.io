---
sidebar_position: 2
title: Transferring RGB20 Assets
description: Learn how to transfer fungible assets using RGB20 tokens with client-side validation
---

# Transferring RGB20 Assets

This guide covers the complete process of transferring RGB20 fungible tokens between parties using RGB's client-side validation model. RGB transfers are private, scalable, and leverage Bitcoin's security without bloating the blockchain.

## Understanding RGB Transfers

RGB uses a unique client-side validation approach where transfer data is transmitted directly between parties off-chain, while Bitcoin transactions serve only as commitment anchors.

### Key Concepts

**Client-Side Validation**: Transfer validity is verified by recipients, not miners. The entire history from genesis to the transfer is validated locally.

**Single-Use-Seals**: Bitcoin UTXOs act as one-time ownership containers. Once spent, the seal is closed and RGB assets transfer to new seals.

**Consignments**: Complete transfer packages containing:
- State transitions (operations)
- Seal definitions (explicit outputs)
- Witness data (Bitcoin transactions)
- Contract articles (schema, genesis)

**Blinded UTXOs**: Recipients generate blinded seals (via invoices) that hide the actual Bitcoin UTXO until payment.

## Transfer Architecture

### Contract and RgbWallet

The core transfer API is provided by `RgbWallet` and `Contract` types:

```rust
use rgb::{Contract, RgbWallet, Contracts};
use rgb::popls::bp::{WalletProvider, Coinselect, OpRequest};
use bpstd::psbt::Psbt;

pub struct RgbWallet<W, Sp, S, C>
where
    W: WalletProvider,
    Sp: Stockpile,
    S: KeyedCollection<Key = CodexId, Value = Issuer>,
    C: KeyedCollection<Key = ContractId, Value = Contract<Sp::Stock, Sp::Pile>>;
```

### Transfer Workflow Overview

```
1. Recipient creates invoice (blinded UTXO + amount)
   ↓
2. Sender fulfills invoice (selects inputs, creates transition)
   ↓
3. Sender constructs Bitcoin PSBT (includes RGB outputs)
   ↓
4. Sender commits RGB data to PSBT (DBC commitment)
   ↓
5. Sender signs and broadcasts Bitcoin TX
   ↓
6. Sender exports consignment (state history + witnesses)
   ↓
7. Sender transmits consignment to recipient
   ↓
8. Recipient validates consignment (full history check)
   ↓
9. Recipient accepts transfer (updates local state)
```

## Complete Transfer Example

### Step 1: Recipient Creates Invoice

The recipient generates an RGB invoice containing a blinded UTXO:

```rust
use rgb::invoice::{RgbInvoice, RgbBeneficiary};
use rgb::{ContractId, Amount};
use bpstd::seals::txout::BlindSeal;
use bp::Txid;

// Recipient side: Create blinded seal for receiving
let receive_txid = Txid::from_hex("abc123...")?;
let receive_vout = 0;
let blinding_factor = 12345u64;

let blinded_seal = BlindSeal::with_blinding(
    CloseMethod::TapretFirst,
    receive_txid,
    receive_vout,
    blinding_factor,
);

// Create invoice
let invoice = RgbInvoice {
    transports: none!(),
    contract: Some(contract_id),
    iface: Rgb20::FIXED.iface_id(),
    operation: None,
    assignment: AssignmentType::with(0),  // assetOwner
    auth: RgbBeneficiary::Token(blinded_seal.auth_token()),
    value: Some(Amount::from(1000_00000000u64)),  // 1000 tokens
    expiry: Some(DateTime::from_timestamp(1735689600, 0).unwrap()),
};

// Encode as Bech32m string
let invoice_string = invoice.to_string();
println!("Invoice: {}", invoice_string);
// Output: rgb:utxob16az...
```

### Step 2: Sender Fulfills Invoice

The sender processes the invoice and selects inputs:

```rust
use rgb::popls::bp::{FulfillError, OpRequest};

// Sender side: Parse invoice and fulfill
let invoice = RgbInvoice::<ContractId>::from_str(&invoice_string)?;

// RgbWallet fulfills the invoice, selecting UTXOs with sufficient RGB assets
let request: OpRequest = runtime.fulfill(
    &invoice,
    CoinselectStrategy::default(),  // Coin selection strategy
    None,                            // Optional giveaway for dust
)?;

println!("Selected {} inputs", request.using.len());
println!("Creating {} outputs", request.owned.len());
```

### Step 3: Construct Bitcoin PSBT

Create the Bitcoin transaction that will anchor the RGB transfer:

```rust
use bpstd::psbt::{TxParams, PsbtMeta};

// Define transaction parameters
let params = TxParams {
    fee_rate: Some(5.0),         // 5 sat/vByte
    min_fee: Some(Sats::from(500)),
    exact_fee: None,
    giveaway: Some(Sats::from(100)),
};

// Compose PSBT with RGB-aware coin selection
let (mut psbt, meta) = runtime.compose_psbt(&request, params)?;

println!("PSBT inputs: {}", psbt.inputs().count());
println!("PSBT outputs: {}", psbt.outputs().count());
println!("Change output: {:?}", meta.change);
```

### Step 4: Color PSBT with RGB Data

Add RGB commitment data to the PSBT:

```rust
use rgpsbt::{RgbPsbt, ScriptResolver};

// Resolve script for RGB operations
let script = OpRequestSet::with(request);

// Color the PSBT (adds CSV commitments for client-side validation)
let payment = runtime.color_psbt(psbt, meta, script)?;

// The PSBT now contains:
// - Anonymous RGB commitments in CSV outputs
// - Blinded seal allocations
// - Change output assignments
```

### Step 5: Complete and Sign PSBT

Commit RGB data and finalize the Bitcoin transaction:

```rust
// Complete PSBT with DBC (deterministic Bitcoin commitment)
let mut psbt = runtime.complete(payment.uncomit_psbt.clone(), &payment.bundle)?;

// Sign PSBT (implementation depends on wallet)
psbt.finalize(wallet.descriptor());
let signed_tx = psbt.extract()?;

// Broadcast Bitcoin transaction
wallet.broadcast(&signed_tx, meta.change)?;

println!("Transaction broadcast: {}", signed_tx.txid());
```

### Step 6: Export Consignment

Create the consignment package for the recipient:

```rust
use rgb::Consignment;
use std::fs::File;
use strict_encoding::StrictWriter;

// Get the contract
let contract = runtime.contract(contract_id)?;

// Export consignment with transfer history
let terminals = payment.terminals;  // Terminal seals from payment
let file = File::create("transfer.consignment")?;
let writer = StrictWriter::with(file);

contract.consign(terminals, writer)?;

println!("Consignment exported to transfer.consignment");
```

Alternatively, export to file directly:

```rust
// Using file-based export
contract.consign_to_file("transfer.consignment", terminals)?;
```

### Step 7: Transmit Consignment

Send the consignment file to the recipient through any channel:

```rust
// Option 1: Direct file transfer
// Copy transfer.consignment to recipient

// Option 2: Embed in QR code (for small transfers)
use qrcode::QrCode;
let consignment_data = std::fs::read("transfer.consignment")?;
let qr = QrCode::new(&consignment_data)?;

// Option 3: Upload to IPFS or RGB proxy server
// let cid = ipfs_client.add(consignment_data).await?;

// Option 4: Send via encrypted messaging
// messenger.send_file(recipient_id, "transfer.consignment").await?;
```

### Step 8: Recipient Validates Consignment

The recipient validates the complete transfer history:

```rust
use rgb::{Contract, ConsumeError};
use std::fs::File;
use strict_encoding::StrictReader;

// Load consignment file
let file = File::open("transfer.consignment")?;
let mut reader = StrictReader::new(file);

// Parse consignment
let contract_id = parse_consignment(&mut reader)?;

// Get or create contract
let mut contract = if runtime.has_contract(contract_id) {
    runtime.contract_mut(contract_id)?
} else {
    // Import new contract from consignment
    Contract::with(articles, consignment, config)?
};

// Consume consignment (validates all history)
let seal_resolver = |op: &Operation| -> BTreeMap<u16, TxoSeal> {
    // Resolve blinded seals to actual seals
    // Returns seals that match wallet-generated invoices
    wallet.resolve_seals(op)
};

let sig_validator = |hash: StrictHash, identity: &Identity, sig: &SigBlob| {
    // Validate issuer signature
    identity.verify(hash, sig)
};

contract.consume(
    &mut reader,
    seal_resolver,
    sig_validator,
)?;

println!("Consignment validated successfully");
```

### Step 9: Accept Transfer

Update local state and mark transfer as accepted:

```rust
// Contract state is now updated with the transfer
let state = contract.state();

// Query owned assets
for (name, owned) in state.owned {
    for assignment in owned {
        println!(
            "State: {}={}, status={:?}",
            name, assignment.assignment.data, assignment.status
        );
    }
}

// Sync witness status (mark as confirmed)
let witness_updates = vec![
    (witness_id, WitnessStatus::Mined { depth: 6 })
];
contract.sync(witness_updates)?;
```

## High-Level Payment API

For simpler use cases, use the high-level payment API:

```rust
use rgb::RgbRuntime;

// Initialize runtime
let mut runtime = RgbRuntime::with_components(wallet, contracts);

// Pay invoice in one call
let (psbt, payment) = runtime.pay_invoice(
    &invoice,
    CoinselectStrategy::default(),
    TxParams::default(),
    Some(Sats::from(100)),  // Giveaway
)?;

// Sign and finalize
psbt.finalize(wallet.descriptor());
let tx = psbt.extract()?;
runtime.wallet.broadcast(&tx, payment.psbt_meta.change)?;

// Export consignment
let contract = runtime.contract(invoice.contract.unwrap())?;
contract.consign_to_file("transfer.consignment", payment.terminals)?;
```

## Advanced Transfer Scenarios

### Batch Transfers

Send to multiple recipients in a single Bitcoin transaction:

```rust
// Create multiple invoices
let invoices = vec![invoice1, invoice2, invoice3];

// Fulfill all invoices
let mut requests = Vec::new();
for invoice in invoices {
    let request = runtime.fulfill(&invoice, strategy, None)?;
    requests.push(request);
}

// Combine into single payment script
let script = OpRequestSet::new(requests);

// Create single PSBT for all transfers
let (psbt, payment) = runtime.transfer(script, params)?;

// Export separate consignments for each recipient
for (i, invoice) in invoices.iter().enumerate() {
    let terminals = vec![payment.terminals[i]];
    contract.consign_to_file(
        format!("transfer_{}.consignment", i),
        terminals
    )?;
}
```

### Change Outputs

Managing asset change when transferring partial amounts:

```rust
// Example: Send 1000 tokens from UTXO with 5000 tokens
let invoice = create_invoice(1000_00000000u64);
let request = runtime.fulfill(&invoice, strategy, None)?;

// The request automatically includes:
// - Input: 5000 tokens from owned UTXO
// - Output 1: 1000 tokens to recipient (blinded)
// - Output 2: 4000 tokens to change address (internal)

println!("Change allocation: {} tokens", request.change_amount());
```

### Multi-Asset Transfers

Transferring multiple asset types simultaneously:

```rust
// Create requests for different contracts
let rgb20_request = runtime.fulfill(&rgb20_invoice, strategy, None)?;
let rgb21_request = runtime.fulfill(&rgb21_invoice, strategy, None)?;

// Combine into multi-asset payment
let script = OpRequestSet::new(vec![rgb20_request, rgb21_request]);

// Single Bitcoin TX commits to all RGB transfers
let (psbt, payment) = runtime.transfer(script, params)?;

// Export consignments per contract
contract1.consign_to_file("rgb20.consignment", payment.terminals)?;
contract2.consign_to_file("rgb21.consignment", payment.terminals)?;
```

### Replace-By-Fee (RBF)

Increase fee for pending transfers:

```rust
// Original payment
let (psbt, payment) = runtime.pay_invoice(&invoice, strategy, params, None)?;

// Transaction not confirming, increase fee
let new_fee = Sats::from(2000);  // Higher fee
let rbf_psbt = runtime.rbf(&payment, new_fee)?;

// Sign and broadcast replacement
rbf_psbt.finalize(wallet.descriptor());
let tx = rbf_psbt.extract()?;
wallet.broadcast(&tx, payment.psbt_meta.change)?;

// Same consignment works for both transactions
```

## Transfer States and Lifecycle

### Witness Status

Track confirmation status of transfers:

```rust
use rgb::WitnessStatus;

// Possible witness states
enum WitnessStatus {
    Genesis,                           // Genesis operation
    Tentative,                         // Unconfirmed
    Mined { depth: u32 },             // Confirmed with depth
    Invalid,                           // Double-spent or invalid
}

// Update witness status after confirmations
contract.sync(vec![
    (witness_id, WitnessStatus::Mined { depth: 1 })
])?;

// Query operation status
let status = contract.witness_status(witness_id);
match status {
    WitnessStatus::Mined { depth } if depth >= 6 => {
        println!("Transfer confirmed with {} blocks", depth);
    }
    WitnessStatus::Tentative => {
        println!("Transfer pending confirmation");
    }
    _ => {
        println!("Transfer status: {:?}", status);
    }
}
```

### Pending Transfers

Handle transfers awaiting confirmation:

```rust
// Get all pending witnesses
let pending: Vec<_> = contract.witnesses()
    .filter(|w| w.status == WitnessStatus::Tentative)
    .collect();

println!("Pending transfers: {}", pending.len());

// Wait for confirmations
for witness in pending {
    let tx = witness.published;
    println!("Waiting for TX: {}", tx.pub_id());
}
```

### Failed Transfers

Recovery from failed transfers:

```rust
// Detect failed witness
let witness_status = contract.witness_status(wid);
if witness_status == WitnessStatus::Invalid {
    eprintln!("Transfer failed - transaction double-spent");

    // Roll back the operation
    contract.sync(vec![(wid, WitnessStatus::Invalid)])?;

    // RGB state automatically rolls back
    // Assets return to sender's control

    // Retry with new transaction
    let (new_psbt, new_payment) = runtime.pay_invoice(&invoice, strategy, params, None)?;
}
```

## Consignment Format Details

### Consignment Structure

A consignment contains:

```rust
pub struct Consignment<Seal: RgbSeal> {
    // Contract articles (schema, interfaces, genesis)
    pub articles: Articles,

    // State transitions in transfer history
    pub operations: Vec<Operation>,

    // Seal definitions (explicit outputs)
    pub seals: BTreeMap<Opid, SmallOrdMap<u16, Seal::Definition>>,

    // Witness data (Bitcoin transactions)
    pub witnesses: Vec<SealWitness<Seal>>,

    // Extension blocks for future compatibility
    pub extensions: Vec<ExtensionBlock>,
}
```

### Binary Format

Consignments use strict encoding:

```
[Magic Number: 4 bytes]
[Version: 1 byte]
[Extension Blocks: variable]
[Articles: variable]
  - Semantics
  - Signature
  - Issue version
  - Contract metadata
  - Codex
[Operations: variable]
  - Operation count
  - For each operation:
    - Operation data
    - Seal definitions
    - Optional witness
```

### Consignment Validation

The validation process:

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn consume<E>(
        &mut self,
        reader: &mut StrictReader<impl ReadRaw>,
        seal_resolver: impl FnMut(&Operation) -> BTreeMap<u16, P::Seal::Definition>,
        sig_validator: impl FnOnce(StrictHash, &Identity, &SigBlob) -> Result<(), E>,
    ) -> Result<(), MultiError<ConsumeError<P::Seal::Definition>, S::Error>> {
        // 1. Parse consignment
        // 2. Validate contract ID matches
        // 3. Validate issuer signature
        // 4. Resolve blinded seals
        // 5. Verify all state transitions
        // 6. Check witness validity
        // 7. Update contract state
    }
}
```

## Privacy and Security

### Blinded UTXOs

UTXO blinding preserves recipient privacy:

```rust
// Recipient generates blinded seal
let blinding_factor = thread_rng().gen::<u64>();
let blinded = BlindSeal::with_blinding(
    method,
    txid,      // Public
    vout,      // Public
    blinding_factor,  // SECRET - never share
);

// Only auth token is sent to sender
let auth_token = blinded.auth_token();  // Public, hides UTXO

// Sender cannot determine actual UTXO
// Sender only knows auth token commitment
```

### Confidential Amounts

While RGB20 doesn't hide amounts by default, Pedersen commitments ensure:

```rust
// Amounts are committed via Pedersen commitments
// Validation ensures sum(inputs) == sum(outputs)
// Without revealing individual amounts on-chain

pub fn verify_commitments(
    inputs: &[PedersenCommitment],
    outputs: &[PedersenCommitment],
) -> bool {
    // Verify sum of input commitments equals sum of output commitments
    let input_sum = inputs.iter().sum();
    let output_sum = outputs.iter().sum();
    input_sum == output_sum
}
```

### Security Best Practices

**Consignment Validation:**
```rust
// ALWAYS validate before accepting
match contract.consume(&mut reader, resolver, validator) {
    Ok(_) => {
        // Only accept after successful validation
        contract.sync(updates)?;
    }
    Err(e) => {
        // NEVER accept invalid consignments
        eprintln!("Invalid consignment: {}", e);
        return Err(e);
    }
}
```

**Asset ID Verification:**
```rust
// Verify contract ID matches expectations
let expected_contract_id = ContractId::from_str("rgb:...")?;
if invoice.contract != Some(expected_contract_id) {
    return Err("Wrong contract ID in invoice");
}
```

**Secure Transmission:**
```rust
// Use encrypted channels for consignments
// Option 1: HTTPS
// Option 2: End-to-end encrypted messaging
// Option 3: PGP-encrypted email
// Option 4: RGB proxy with TLS

// Verify consignment integrity
use sha256::digest;
let hash = digest(&consignment_data);
println!("Consignment hash: {}", hash);
```

## Performance and Scalability

### Scalability Advantages

RGB transfers scale independently of Bitcoin block space:

```rust
// Bitcoin transaction: ~200 bytes
// RGB consignment: Variable (depends on history depth)
// But: Only parties involved validate, not miners

// Example metrics:
// - Bitcoin TX size: 200 bytes
// - RGB commitment: ~32 bytes (in OP_RETURN or taproot)
// - Consignment size: 1-100 KB (depending on history)
// - Validation time: O(n) where n = history depth
```

### Optimizations

**Consignment Pruning:**
```rust
// Future feature: Prune unnecessary history
// Keep only: Genesis + direct ancestry to received outputs
// Reduces consignment size for long chains
```

**Witness Caching:**
```rust
// Cache witness validation results
let witness_cache: HashMap<WitnessId, bool> = HashMap::new();

if let Some(&valid) = witness_cache.get(&wid) {
    return Ok(valid);
}

// Validate and cache
let valid = validate_witness(witness)?;
witness_cache.insert(wid, valid);
```

## Troubleshooting

### Common Issues

**Invalid Consignment Error:**
```rust
ConsumeError::Verify(VerificationError::InvalidOperation)
// Possible causes:
// - Corrupted consignment file
// - Wrong contract ID
// - Invalid state transitions
// - Missing witness data

// Solution: Re-request consignment from sender
```

**Seal Resolution Failed:**
```rust
// Error: Unable to resolve blinded seal
// Cause: Invoice was not generated by recipient's wallet
// Solution: Ensure invoice came from recipient's seal resolver
```

**Genesis Not Found:**
```rust
ConsumeError::UnknownContract(contract_id)
// Cause: Contract not in local stock
// Solution: Import contract articles first:
stock.import_contract(genesis_contract, resolver)?;
```

### Debug Tools

```rust
// Inspect consignment contents
let consignment = Consignment::from_file("transfer.consignment")?;
println!("Contract: {}", consignment.articles.contract_id());
println!("Operations: {}", consignment.operations.len());
println!("Witnesses: {}", consignment.witnesses.len());

// Trace operation history
for (opid, operation) in contract.trace() {
    println!("Op {}: {} inputs, {} outputs",
        opid, operation.inputs.len(), operation.owned.len());
}

// Check witness status
for witness in contract.witnesses() {
    println!("Witness {}: {:?}", witness.id(), witness.status);
}
```

## Related Documentation

- [Creating RGB20 Tokens](./creating-tokens.md)
- [RGB Consignments](../../technical-reference/consignments.md)
- [RGB Invoices](../../technical-reference/invoices.md)
- [Client-Side Validation](../../core-concepts/client-side-validation.md)
- [Single-Use-Seals](../../core-concepts/single-use-seals.md)
- [Rust SDK API](../development/rust-sdk.md)

---

**Code Examples**: See `/tmp/rgb-repos/rgb/src/runtime.rs` for complete RgbRuntime implementation and transfer workflows.
