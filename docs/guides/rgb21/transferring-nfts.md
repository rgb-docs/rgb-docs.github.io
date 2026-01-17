---
sidebar_position: 3
title: Transferring RGB21 NFTs
description: Learn how to transfer non-fungible tokens using RGB21 with privacy and provenance
---

# Transferring RGB21 NFTs

Transferring RGB21 NFTs follows the same client-side validation model as RGB20 fungible tokens, but with unique considerations for indivisible assets, metadata handling, and provenance tracking. This comprehensive guide covers the complete NFT transfer workflow from invoice creation to consignment acceptance.

## NFT Transfer Overview

RGB21 transfers move unique token ownership from one party to another while maintaining complete privacy and immutable provenance. Unlike fungible tokens where you can split amounts, each NFT transfer involves exactly one indivisible token.

### Key Characteristics

- **Indivisible**: Cannot be split or partially transferred
- **Unique Identity**: Each token has a distinct TokenIndex
- **Metadata Bundled**: Embedded metadata travels with consignment
- **Full Provenance**: Complete ownership history from genesis
- **Privacy Preserved**: Only transfer parties know details
- **Bitcoin Anchored**: Secured by Bitcoin's proof-of-work

### Transfer vs RGB20 Differences

| Aspect | RGB21 (NFTs) | RGB20 (Fungible) |
|--------|--------------|------------------|
| Amount | Always 1 | Variable amounts |
| Divisibility | Indivisible | Can split |
| Change output | Not needed | Usually required |
| Metadata | Travels with transfer | Static |
| Token selection | By index | By amount |

## Transfer Architecture

### Contract and Wallet Types

```rust
use rgb::{RgbWallet, Contract};
use rgb::popls::bp::WalletProvider;
use rgbstd::persistence::Stock;
use rgbstd::invoice::RgbInvoice;
use ifaces::Rgb21;

pub struct Rgb21Transfer {
    pub contract_id: ContractId,
    pub token_index: TokenIndex,
    pub from: BlindSeal,
    pub to: BlindSeal,
    pub witness: WitnessId,
}
```

### Transfer Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Recipient: Create NFT Invoice                           │
│     - Specify contract ID                                   │
│     - Specify token index                                   │
│     - Include blinded UTXO                                  │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Recipient: Send invoice to sender                       │
│     (via any communication channel)                         │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Sender: Verify ownership of NFT                         │
│     - Check token index exists                              │
│     - Verify current ownership                              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Sender: Create RGB transfer (state transition)          │
│     - Input: Current NFT ownership seal                     │
│     - Output: Blinded recipient seal                        │
│     - Allocation: TokenIndex + amount(1)                    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Sender: Create Bitcoin PSBT                             │
│     - Select Bitcoin UTXO(s) for fees                       │
│     - Add RGB commitment output(s)                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Sender: Commit RGB data to PSBT (DBC)                   │
│     - Embed RGB commitment in OP_RETURN or TapRet           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Sender: Sign and broadcast Bitcoin TX                   │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Sender: Generate consignment                            │
│     - Include full contract history                         │
│     - Include state transitions                             │
│     - Include Bitcoin witnesses                             │
│     - Include embedded metadata                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Sender: Transmit consignment to recipient               │
│     (file, proxy, messaging, etc.)                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Recipient: Validate consignment                         │
│     - Verify schema compliance                              │
│     - Validate all state transitions                        │
│     - Check Bitcoin witnesses                               │
│     - Verify seal ownership                                 │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. Recipient: Accept transfer                              │
│     - Import into local stock                               │
│     - Update ownership state                                │
└─────────────────────────────────────────────────────────────┘
```

## Complete Transfer Example

### Step 1: Recipient Creates Invoice

```rust
use rgbstd::invoice::{RgbInvoice, Beneficiary};
use rgbstd::{ContractId, TokenIndex};
use bp::seals::txout::BlindSeal;
use bp::Txid;

// Recipient generates blinded seal
let receive_txid = Txid::from_hex(
    "abc123def456...your_bitcoin_txid"
)?;
let receive_vout = 0;
let blinding_secret = 12345u64;

let blinded_seal = BlindSeal::with_blinding(
    CloseMethod::TapretFirst,
    receive_txid,
    receive_vout,
    blinding_secret,
);

// Create RGB21 invoice for specific token
let contract_id = ContractId::from_str("rgb:contract:...")?;
let token_index = TokenIndex::from_inner(42);

let invoice = RgbInvoice::nft(
    contract_id,
    token_index,
    blinded_seal,
    Some(DateTime::from_timestamp(1735689600, 0)?),  // Expiry
)?;

// Encode as Bech32m string
let invoice_string = invoice.to_string();
println!("NFT Invoice: {}", invoice_string);
// Output: rgb:nft:utxob1...

// Send invoice_string to sender via any channel
```

**Invoice Structure:**

```rust
pub struct NftInvoice {
    pub contract_id: ContractId,      // Which NFT collection
    pub token_index: TokenIndex,      // Which specific NFT (#42)
    pub beneficiary: BlindSeal,       // Where to send it
    pub expiry: Option<DateTime>,     // When invoice expires
}
```

### Step 2: Sender Verifies Ownership

```rust
use rgbstd::persistence::Stock;
use ifaces::Rgb21;

// Load sender's stock (contract database)
let mut stock = Stock::load("~/.rgb/stock")?;

// Get NFT contract via RGB21 interface
let contract = stock.contract_iface_class::<Rgb21>(contract_id)?;

// Get token data
let token_data = contract.token_data();
println!("Token #{}: {:?}", token_data.index, token_data.preview);

// Verify ownership by checking allocations
let allocations: Vec<_> = contract.allocations().collect();
let owned = allocations.iter().any(|alloc| {
    alloc.index == token_index && alloc.owner == my_seal
});

if !owned {
    return Err("You don't own this NFT".into());
}

println!("Verified ownership of token #{}", token_index);
```

### Step 3: Parse and Validate Invoice

```rust
use rgbstd::invoice::RgbInvoice;

// Parse invoice string received from buyer
let invoice = RgbInvoice::from_str(&invoice_string)?;

// Validate invoice parameters
if invoice.contract_id != expected_contract_id {
    return Err("Wrong contract ID in invoice".into());
}

if invoice.token_index != token_index {
    return Err("Wrong token index in invoice".into());
}

// Check expiry
if let Some(expiry) = invoice.expiry {
    if DateTime::now() > expiry {
        return Err("Invoice expired".into());
    }
}

println!("Invoice validated");
```

### Step 4: Create RGB Transfer

```rust
use rgb::Runtime;
use rgb::popls::bp::OpRequest;

// Initialize RGB runtime with wallet
let mut runtime = Runtime::new(wallet, stock)?;

// Fulfill the invoice (creates RGB state transition)
let request: OpRequest = runtime.fulfill_nft(
    &invoice,
    None,  // No giveaway needed for NFTs
)?;

println!("Transfer prepared:");
println!("  Token: #{}", token_index);
println!("  From seal: {:?}", request.inputs[0]);
println!("  To seal: {:?}", request.outputs[0]);
```

**What happens internally:**

```rust
// The OpRequest contains:
pub struct NftOpRequest {
    pub contract_id: ContractId,
    pub transition_type: TransitionType,  // "transfer"

    // Inputs
    pub inputs: Vec<Outpoint>,  // UTXO containing the NFT

    // Outputs
    pub outputs: Vec<Output>,  // New ownership assignment

    // State
    pub owned: Vec<OwnedState>,  // Allocation { index: 42, value: 1 }
}
```

### Step 5: Construct Bitcoin Transaction

```rust
use bpstd::psbt::{Psbt, TxParams};
use bpstd::Sats;

// Define transaction parameters
let params = TxParams {
    fee_rate: Some(5.0),              // 5 sat/vByte
    min_fee: Some(Sats::from(500)),   // Minimum 500 sats
    exact_fee: None,
    giveaway: Some(Sats::from(100)),  // Dust threshold
};

// Compose Bitcoin PSBT
// This selects Bitcoin UTXOs for fees and adds RGB commitment output
let (mut psbt, meta) = runtime.compose_psbt(&request, params)?;

println!("PSBT created:");
println!("  Inputs: {}", psbt.inputs().count());
println!("  Outputs: {}", psbt.outputs().count());
println!("  Fee: {} sats", meta.fee);
```

### Step 6: Commit RGB Data to PSBT

```rust
use rgbstd::psbt::RgbExt;

// Color PSBT with RGB commitments
let payment = runtime.color_psbt(psbt, meta, OpRequestSet::with(request))?;

println!("RGB commitment added to PSBT");

// The PSBT now contains:
// - OP_RETURN or TapRet commitment to RGB data
// - Blinded seal allocation
```

### Step 7: Sign and Broadcast

```rust
// Complete PSBT with RGB bundle
let mut psbt = runtime.complete(
    payment.uncomit_psbt.clone(),
    &payment.bundle
)?;

// Sign PSBT with wallet keys
wallet.sign_psbt(&mut psbt)?;

// Finalize PSBT
psbt.finalize(wallet.descriptor())?;

// Extract signed transaction
let signed_tx = psbt.extract()?;
let txid = signed_tx.txid();

// Broadcast to Bitcoin network
wallet.broadcast(&signed_tx)?;

println!("Transaction broadcast: {}", txid);
println!("Waiting for confirmation...");

// Wait for 1+ confirmations
wait_for_confirmations(txid, 1).await?;
```

### Step 8: Generate Consignment

```rust
use rgbstd::containers::Transfer;

// Export consignment for recipient
let consignment = runtime.transfer(
    contract_id,
    vec![WitnessId::from(txid)],  // Bitcoin TX witnesses
)?;

// Save to file
consignment.save_file("nft_transfer.rgb")?;

// Or save as armored (text format)
consignment.save_armored("nft_transfer.rgba")?;

println!("Consignment generated:");
println!("  Size: {} bytes", consignment.to_bytes().len());
println!("  Contract: {}", contract_id);
println!("  Token: #{}", token_index);
```

**Consignment Contents:**

```rust
pub struct NftConsignment {
    // Contract definition
    pub schema: Schema,              // RGB21 schema
    pub genesis: Genesis,            // Original NFT creation
    pub iface_impls: Vec<IfaceImpl>, // RGB21 interface implementation

    // State history
    pub transitions: Vec<Transition>,  // All state changes
    pub extensions: Vec<Extension>,    // None for basic UDA

    // Bitcoin witnesses
    pub witnesses: Vec<Witness>,  // Bitcoin TX proofs

    // Metadata (if embedded)
    pub embedded_media: Option<EmbeddedMedia>,

    // Terminal state
    pub terminals: Vec<Terminal>,  // Final ownership state
}
```

### Step 9: Transmit Consignment

```bash
# Option 1: Direct file transfer
scp nft_transfer.rgb recipient@server:/path/to/file

# Option 2: Via RGB Proxy
rgb-proxy upload nft_transfer.rgb

# Option 3: Via messaging (email, telegram, etc.)
# Attach nft_transfer.rgba (text format, more compatible)

# Option 4: IPFS
ipfs add nft_transfer.rgb
# Share IPFS CID with recipient
```

```rust
// Programmatic transmission via HTTP
use reqwest::Client;

async fn send_consignment(
    consignment_path: &str,
    recipient_url: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let consignment = std::fs::read(consignment_path)?;

    let response = client
        .post(recipient_url)
        .header("Content-Type", "application/rgb")
        .body(consignment)
        .send()
        .await?;

    if response.status().is_success() {
        println!("Consignment delivered");
    } else {
        println!("Delivery failed: {}", response.status());
    }

    Ok(())
}
```

### Step 10: Recipient Validates Consignment

```rust
use rgbstd::containers::ValidConsignment;
use rgbstd::validation::Validity;

// Load consignment file
let consignment = Transfer::load_file("nft_transfer.rgb")?;

// Validate against schema and history
let validation = stock.validate(consignment)?;

match validation {
    Validity::Valid => {
        println!("Consignment is valid!");
    }
    Validity::Invalid(errors) => {
        println!("Consignment validation failed:");
        for error in errors {
            eprintln!("  - {}", error);
        }
        return Err("Invalid consignment".into());
    }
}

// Additional checks
let resolved = validation.into_valid_consignment()?;

// Verify token index
let token_data = resolved.token_data();
if token_data.index != expected_token_index {
    return Err("Wrong token in consignment".into());
}

// Verify terminal seal belongs to us
let terminals = resolved.terminals();
if !terminals.iter().any(|t| t.seal == my_seal) {
    return Err("Consignment not sent to our seal".into());
}

println!("All checks passed");
```

**Validation Steps:**

1. **Schema Compliance**: Verify contract follows RGB21 schema
2. **Genesis Validity**: Check genesis is well-formed
3. **State Transitions**: Validate all transitions from genesis to terminal
4. **Witness Verification**: Confirm Bitcoin transactions exist and are valid
5. **Seal Closure**: Verify each seal is properly closed
6. **Amount Conservation**: For NFTs, verify amount stays 1
7. **Token Index**: Verify token index matches throughout chain

### Step 11: Accept Transfer

```rust
use rgbstd::persistence::Stock;

// Accept consignment into stock
stock.accept_transfer(
    validated_consignment,
    force_consignment_validation: false,  // Already validated
)?;

// Update ownership records
stock.sync()?;

// Query updated NFT
let contract = stock.contract_iface_class::<Rgb21>(contract_id)?;
let token = contract.token_data();
let allocations: Vec<_> = contract.allocations().collect();

println!("NFT #{} received!", token.index);
println!("Allocations:");
for alloc in allocations {
    if alloc.seal == my_seal {
        println!("  ✓ Owned by us: Token #{}", alloc.index);
    } else {
        println!("  - Not ours: Token #{}", alloc.index);
    }
}

// Access metadata
if let Some(preview) = token.preview {
    println!("Preview type: {}", preview.ty);
    println!("Preview size: {} bytes", preview.data.len());
}

if let Some(media) = token.media {
    println!("Media type: {}", media.ty);
    println!("Media hash: {:?}", media.digest);
}
```

## Metadata Handling in Transfers

### Embedded Metadata

Embedded metadata (preview) is automatically included in every consignment:

```rust
// Sender: Metadata is bundled automatically
let consignment = runtime.transfer(contract_id, witnesses)?;
// consignment includes token_data.preview

// Recipient: Access embedded metadata immediately
let token = validated_consignment.token_data();
if let Some(preview) = token.preview {
    // Display thumbnail without external fetches
    display_image(&preview.data)?;
}
```

### Referenced Metadata

For referenced media (external files), ensure accessibility:

```rust
// Fetch referenced media after transfer
async fn fetch_nft_media(
    token_data: &TokenData,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    if let Some(media) = &token_data.media {
        // Determine storage location
        // In practice, you'd have a mapping from hash to IPFS CID
        let cid = lookup_ipfs_cid(&media.digest)?;

        // Fetch from IPFS
        let client = IpfsClient::from_str("http://localhost:5001")?;
        let bytes = client.cat(&cid)
            .map_ok(|chunk| chunk.to_vec())
            .try_concat()
            .await?;

        // Verify hash
        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let computed_hash = hasher.finalize();

        if computed_hash.as_slice() != media.digest.as_slice() {
            return Err("Media hash mismatch".into());
        }

        Ok(bytes)
    } else {
        Err("No media attachment".into())
    }
}
```

### Attachment Fetching

```rust
async fn fetch_all_attachments(
    token_data: &TokenData,
) -> Result<HashMap<u8, Vec<u8>>, Box<dyn std::error::Error>> {
    let mut fetched = HashMap::new();

    for (index, attachment) in token_data.attachments.iter() {
        let cid = lookup_ipfs_cid(&attachment.digest)?;
        let bytes = fetch_from_ipfs(&cid).await?;

        // Verify
        verify_attachment(attachment, &bytes)?;

        fetched.insert(*index, bytes);
        println!("Fetched attachment {}: {} bytes", index, bytes.len());
    }

    Ok(fetched)
}
```

## Provenance and History

### Viewing Ownership History

```rust
use rgbstd::history::TransferHistory;

fn get_nft_provenance(
    stock: &Stock,
    contract_id: ContractId,
    token_index: TokenIndex,
) -> Result<TransferHistory, Box<dyn std::error::Error>> {
    // Get contract history
    let history = stock.contract_history(contract_id)?;

    // Filter for this specific token
    let token_history = history
        .transitions
        .iter()
        .filter(|t| {
            // Check if transition involves our token
            t.owned_state.iter().any(|s| {
                s.token_index == token_index
            })
        })
        .collect::<Vec<_>>();

    println!("Provenance for Token #{}:", token_index);
    println!("  Genesis: {}", history.genesis.timestamp);

    for (i, transition) in token_history.iter().enumerate() {
        println!("  Transfer {}: Block {}, TXID {}",
            i + 1,
            transition.witness.height,
            transition.witness.txid
        );
    }

    Ok(TransferHistory {
        genesis: history.genesis,
        transfers: token_history,
    })
}
```

### Verifying Authenticity

```rust
fn verify_nft_authenticity(
    stock: &Stock,
    contract_id: ContractId,
    expected_genesis_hash: &[u8; 32],
) -> Result<bool, Box<dyn std::error::Error>> {
    let contract = stock.contract(contract_id)?;

    // Verify genesis hash
    let genesis = contract.genesis();
    let genesis_hash = genesis.consensus_commit();

    if genesis_hash.as_slice() != expected_genesis_hash {
        println!("Genesis hash mismatch - possible counterfeit");
        return Ok(false);
    }

    // Verify issuer identity
    let issuer = genesis.issuer();
    println!("Issuer: {}", issuer);

    // Verify schema
    if contract.schema_id() != UniqueDigitalAsset::schema().schema_id() {
        println!("Unknown schema");
        return Ok(false);
    }

    Ok(true)
}
```

### Export Full Provenance

```rust
pub struct NftProvenance {
    pub token_index: TokenIndex,
    pub creation_date: DateTime,
    pub creator: Identity,
    pub transfers: Vec<TransferRecord>,
}

pub struct TransferRecord {
    pub block_height: u32,
    pub timestamp: DateTime,
    pub txid: Txid,
    pub from_seal: Option<Seal>,  // None for genesis
    pub to_seal: Seal,
}

fn export_provenance(
    stock: &Stock,
    contract_id: ContractId,
    token_index: TokenIndex,
) -> Result<NftProvenance, Box<dyn std::error::Error>> {
    let history = get_nft_provenance(stock, contract_id, token_index)?;

    let transfers = history.transfers.iter().map(|t| {
        TransferRecord {
            block_height: t.witness.height,
            timestamp: DateTime::from_timestamp(t.witness.timestamp, 0)?,
            txid: t.witness.txid,
            from_seal: t.inputs.first().map(|i| i.seal),
            to_seal: t.outputs.first().unwrap().seal,
        }
    }).collect();

    Ok(NftProvenance {
        token_index,
        creation_date: history.genesis.timestamp,
        creator: history.genesis.issuer,
        transfers,
    })
}

// Save as JSON
fn save_provenance_json(
    provenance: &NftProvenance,
    path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(provenance)?;
    std::fs::write(path, json)?;
    Ok(())
}
```

## Advanced Transfer Scenarios

### Batch NFT Transfers

Transfer multiple NFTs in a single Bitcoin transaction:

```rust
async fn batch_nft_transfer(
    runtime: &mut Runtime,
    transfers: Vec<(ContractId, TokenIndex, RgbInvoice)>,
) -> Result<Txid, Box<dyn std::error::Error>> {
    let mut requests = Vec::new();

    // Create transfer request for each NFT
    for (contract_id, token_index, invoice) in transfers {
        let request = runtime.fulfill_nft(&invoice, None)?;
        requests.push(request);
    }

    // Combine into single PSBT
    let params = TxParams {
        fee_rate: Some(5.0),
        min_fee: Some(Sats::from(1000)),  // Higher min for batched
        exact_fee: None,
        giveaway: Some(Sats::from(100)),
    };

    let (mut psbt, meta) = runtime.compose_batch_psbt(&requests, params)?;

    // Color PSBT with all RGB commitments
    let payment = runtime.color_psbt(
        psbt,
        meta,
        OpRequestSet::from(requests)
    )?;

    // Sign and broadcast
    let mut psbt = runtime.complete(payment.uncomit_psbt, &payment.bundle)?;
    wallet.sign_psbt(&mut psbt)?;
    psbt.finalize(wallet.descriptor())?;

    let signed_tx = psbt.extract()?;
    let txid = signed_tx.txid();
    wallet.broadcast(&signed_tx)?;

    println!("Batch transfer broadcast: {}", txid);
    println!("  Transfers: {}", transfers.len());

    Ok(txid)
}
```

### Atomic NFT Swap

Exchange NFTs without trusted intermediary:

```rust
pub struct AtomicNftSwap {
    pub party1_offers: (ContractId, TokenIndex),
    pub party2_offers: (ContractId, TokenIndex),
}

async fn atomic_nft_swap(
    swap: AtomicNftSwap,
    party1_runtime: &mut Runtime,
    party2_runtime: &mut Runtime,
) -> Result<Txid, Box<dyn std::error::Error>> {
    // Party 1 creates invoice for what they want
    let party1_invoice = party1_runtime.create_nft_invoice(
        swap.party2_offers.0,
        swap.party2_offers.1,
    )?;

    // Party 2 creates invoice for what they want
    let party2_invoice = party2_runtime.create_nft_invoice(
        swap.party1_offers.0,
        swap.party1_offers.1,
    )?;

    // Party 1 fulfills party 2's invoice
    let req1 = party1_runtime.fulfill_nft(&party2_invoice, None)?;

    // Party 2 fulfills party 1's invoice
    let req2 = party2_runtime.fulfill_nft(&party1_invoice, None)?;

    // Construct combined PSBT
    // Both parties must contribute Bitcoin UTXOs for fees
    let (mut psbt, meta) = construct_atomic_psbt(
        vec![req1, req2],
        TxParams::default(),
    )?;

    // Both parties must sign
    party1_runtime.sign_psbt(&mut psbt)?;
    party2_runtime.sign_psbt(&mut psbt)?;

    // Finalize and broadcast
    psbt.finalize()?;
    let signed_tx = psbt.extract()?;
    let txid = signed_tx.txid();

    broadcast_tx(&signed_tx)?;

    println!("Atomic swap complete: {}", txid);

    Ok(txid)
}
```

### Time-Locked Transfer

Transfer that becomes valid only after specific block height:

```rust
use bp::opcodes;

fn create_timelocked_transfer(
    runtime: &mut Runtime,
    invoice: &RgbInvoice,
    unlock_height: u32,
) -> Result<Psbt, Box<dyn std::error::Error>> {
    // Create transfer
    let request = runtime.fulfill_nft(invoice, None)?;

    // Create PSBT with timelock
    let mut psbt = runtime.compose_psbt(&request, TxParams::default())?.0;

    // Add timelock to transaction
    psbt.unsigned_tx.lock_time = unlock_height;

    // Set sequence to enable timelock
    for input in &mut psbt.unsigned_tx.input {
        input.sequence = Sequence::from_height(unlock_height);
    }

    println!("Timelock transfer created: unlocks at block {}", unlock_height);

    Ok(psbt)
}
```

### Escrow Transfer

Conditional transfer via 2-of-3 multisig:

```rust
fn create_escrow_transfer(
    runtime: &mut Runtime,
    invoice: &RgbInvoice,
    buyer_key: PublicKey,
    seller_key: PublicKey,
    escrow_key: PublicKey,
) -> Result<Psbt, Box<dyn std::error::Error>> {
    // Create 2-of-3 multisig descriptor
    let descriptor = Descriptor::new_wsh_sortedmulti(
        2,
        vec![buyer_key, seller_key, escrow_key]
    )?;

    // Create transfer with multisig output
    let request = runtime.fulfill_nft(invoice, None)?;
    let (mut psbt, _) = runtime.compose_psbt_with_descriptor(
        &request,
        &descriptor,
        TxParams::default(),
    )?;

    println!("Escrow transfer created");
    println!("  Requires 2 of 3 signatures");

    Ok(psbt)
}
```

## Error Handling

### Common Transfer Errors

**NFT not owned**

```rust
Error: Token #42 not found in wallet

Solution:
- Verify you own the NFT: rgb-wallet list-nfts --contract-id <id>
- Check token index is correct
- Ensure you've accepted previous transfers
```

**Invalid invoice**

```rust
Error: Invoice format invalid or expired

Solution:
- Request new invoice from recipient
- Verify invoice string wasn't corrupted in transit
- Check expiry timestamp
```

**Insufficient Bitcoin for fees**

```rust
Error: Insufficient Bitcoin balance

Solution:
- Add more Bitcoin to wallet
- Use lower fee rate
- Consolidate UTXOs first
```

**Consignment validation failed**

```rust
Error: State transition validation failed

Solution:
- Verify sender provided correct consignment
- Check Bitcoin transactions are confirmed
- Ensure you have complete contract history
```

### Error Recovery

**Transfer stuck pending**

```bash
# Check Bitcoin transaction status
bitcoin-cli gettransaction <txid>

# If low fee, bump fee
rgb-wallet bump-fee --txid <txid> --new-fee-rate 10

# If stuck >24h with no confirmation, may need RBF
```

**Consignment lost in transit**

```bash
# Sender can regenerate consignment
rgb-wallet regenerate-consignment \
  --contract-id <id> \
  --witness-txid <txid> \
  --output consignment.rgb

# Then resend to recipient
```

**Wrong recipient**

```
If NFT sent to wrong address, it's permanent.
- RGB transfers are irreversible
- Always double-check invoice before sending
- Consider using staging/testnet first
```

## Security Best Practices

### Invoice Verification

```rust
fn verify_invoice_before_transfer(
    invoice: &RgbInvoice,
    expected_contract: ContractId,
    expected_token: TokenIndex,
    trusted_recipient: Option<PublicKey>,
) -> Result<(), String> {
    // Verify contract ID
    if invoice.contract_id != expected_contract {
        return Err(format!(
            "Wrong contract: expected {}, got {}",
            expected_contract, invoice.contract_id
        ));
    }

    // Verify token index
    if invoice.token_index != expected_token {
        return Err(format!(
            "Wrong token: expected {}, got {}",
            expected_token, invoice.token_index
        ));
    }

    // Check expiry
    if let Some(expiry) = invoice.expiry {
        if DateTime::now() > expiry {
            return Err("Invoice expired".into());
        }
    }

    // Optional: Verify recipient identity
    if let Some(trusted_key) = trusted_recipient {
        // Verify invoice signature (if signed)
        verify_invoice_signature(invoice, &trusted_key)?;
    }

    Ok(())
}
```

### Consignment Integrity

```rust
fn verify_consignment_integrity(
    consignment: &Transfer,
) -> Result<(), String> {
    // Verify consignment hash
    let commitment = consignment.consensus_commit();

    // Check all witnesses are present
    for transition in &consignment.transitions {
        if transition.witness.is_none() {
            return Err("Missing witness for transition".into());
        }
    }

    // Verify no tampering
    let recomputed = consignment.clone();
    if recomputed.consensus_commit() != commitment {
        return Err("Consignment has been tampered with".into());
    }

    Ok(())
}
```

### Replay Protection

RGB inherently prevents replay attacks:

```rust
// Each seal can only be closed once
// Attempting to reuse a consignment fails because:
// 1. The input seal is already spent
// 2. The Bitcoin UTXO no longer exists
// 3. Validation will fail at seal closure check

// This is enforced by single-use-seal protocol
```

## Privacy Enhancements

### Blinded Transfers

RGB already uses blinded UTXOs for maximum privacy:

```rust
// Invoice contains blinded seal
let blinded = BlindSeal::with_blinding(method, txid, vout, secret);

// Actual UTXO is hidden until reveal
// Only recipient knows which Bitcoin UTXO receives the NFT
// Blockchain observers see only anonymous outputs
```

### Metadata Privacy

Hide sensitive metadata from public view:

```rust
// Public metadata (embedded in contract)
let public_metadata = TokenData {
    index: TokenIndex::from_inner(1),
    preview: Some(public_thumbnail),
    media: Some(public_image_hash),
    attachments: none!(),
    reserves: None,
};

// Private metadata (shared off-chain with specific recipients)
let private_metadata = serde_json::json!({
    "owner_notes": "Purchased at auction for...",
    "private_attributes": {
        "vault_location": "encrypted",
        "appraisal_value": "encrypted"
    }
});

// Share private metadata via encrypted channel
encrypt_and_send(private_metadata, recipient_pubkey)?;
```

### Timing Obfuscation

Strategies to obscure transfer timing:

```rust
// Add random delay before broadcast
use rand::Rng;

let delay = rand::thread_rng().gen_range(0..3600);  // 0-1 hour
tokio::time::sleep(Duration::from_secs(delay)).await;
broadcast_tx(&signed_tx)?;

// Or batch with other transfers to obscure patterns
```

## Marketplace Integration

### Listing NFTs for Sale

```rust
pub struct NftListing {
    pub contract_id: ContractId,
    pub token_id: TokenIndex,
    pub seller_seal: Seal,
    pub price: Amount,
    pub payment_asset: ContractId,  // RGB20 stablecoin or BTC
    pub royalty_recipient: Option<PublicKey>,
    pub royalty_bps: u16,  // Basis points (500 = 5%)
    pub expiry: DateTime,
    pub metadata_preview: TokenData,
}

impl NftListing {
    pub fn create(
        stock: &Stock,
        contract_id: ContractId,
        token_id: TokenIndex,
        price: Amount,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        // Get NFT details
        let contract = stock.contract_iface_class::<Rgb21>(contract_id)?;
        let token_data = contract.token_data();

        // Verify ownership
        let allocations: Vec<_> = contract.allocations().collect();
        let my_alloc = allocations.iter()
            .find(|a| a.index == token_id)
            .ok_or("NFT not owned")?;

        Ok(NftListing {
            contract_id,
            token_id,
            seller_seal: my_alloc.seal,
            price,
            payment_asset: ContractId::default(),  // BTC
            royalty_recipient: None,
            royalty_bps: 0,
            expiry: DateTime::now() + Duration::from_days(30),
            metadata_preview: token_data,
        })
    }
}
```

### Processing Sale

```rust
async fn process_nft_sale(
    listing: &NftListing,
    buyer_runtime: &mut Runtime,
    seller_runtime: &mut Runtime,
) -> Result<(Txid, Txid), Box<dyn std::error::Error>> {
    // 1. Buyer creates invoice for NFT
    let nft_invoice = buyer_runtime.create_nft_invoice(
        listing.contract_id,
        listing.token_id,
    )?;

    // 2. Seller creates invoice for payment
    let payment_amount = listing.price;
    let payment_invoice = seller_runtime.create_payment_invoice(
        listing.payment_asset,
        payment_amount,
    )?;

    // 3. Execute atomic swap
    // Buyer sends payment
    let payment_txid = buyer_runtime.pay_invoice(&payment_invoice).await?;

    // Seller sends NFT (after payment confirms)
    wait_for_confirmations(payment_txid, 1).await?;
    let nft_txid = seller_runtime.transfer_nft(&nft_invoice).await?;

    // 4. Handle royalties (if any)
    if let Some(royalty_recipient) = listing.royalty_recipient {
        let royalty_amount = (listing.price * listing.royalty_bps as u64) / 10000;
        pay_royalty(royalty_recipient, royalty_amount).await?;
    }

    Ok((payment_txid, nft_txid))
}
```

## Testing on Testnet

### Testnet Setup

```rust
use bp::Network;

async fn test_nft_transfer() -> Result<(), Box<dyn std::error::Error>> {
    // Use testnet
    let network = Network::Testnet;

    // Create test NFT
    let contract_id = create_test_nft(network).await?;

    // Test transfer
    let invoice = create_test_invoice(contract_id, 1)?;
    let txid = transfer_nft(invoice).await?;

    println!("Test transfer: {}", txid);
    println!("View on testnet explorer:");
    println!("  https://mempool.space/testnet/tx/{}", txid);

    Ok(())
}
```

## Related Documentation

- [Creating RGB21 NFTs](./creating-nfts.md) - NFT creation guide
- [Metadata and Attachments](./metadata-attachments.md) - NFT content management
- [RGB21 Interface](../../technical-reference/interfaces.md#rgb21) - Technical specification
- [Consignments](../../technical-reference/consignments.md) - Understanding consignments
- [RGB20 Transfers](../rgb20/transferring-assets.md) - Fungible token transfers
- [Client-Side Validation](../../core-concepts/client-side-validation.md) - Validation model
- [Single-Use-Seals](../../core-concepts/single-use-seals.md) - Ownership model

## Next Steps

1. **Practice on testnet**: Create and transfer test NFTs
2. **Build marketplace integration**: Implement listing and trading
3. **Add provenance tracking**: Export ownership history
4. **Implement escrow**: Use multisig for secure sales
5. **Optimize batch transfers**: Transfer multiple NFTs efficiently
