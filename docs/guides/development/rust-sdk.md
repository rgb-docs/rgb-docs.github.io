---
sidebar_position: 1
title: Rust SDK
description: Building RGB applications with the official Rust SDK
---

# RGB Rust SDK

The RGB Rust SDK provides the core libraries for building RGB applications. This guide covers installation, basic usage, and the complete Contract API for Rust developers.

## Installation

### Adding Dependencies

Add RGB libraries to your `Cargo.toml`:

```toml
[dependencies]
# Core RGB libraries
rgb-std = "0.12"
rgb-core = "0.12"
rgb = "0.12"

# Schemata for RGB20, RGB21, etc.
rgb-schemata = "0.12"

# Bitcoin integration
bp-std = "0.12"
bp-wallet = "0.12"

# Persistence
rgb-persist-fs = { version = "0.12", optional = true }

# Optional: PSBT support
rgbpsbt = "0.12"

[features]
fs = ["rgb-persist-fs"]
serde = ["rgb-std/serde"]
```

### Platform Requirements

- Rust 1.75 or later
- Bitcoin Core (for testnet/mainnet)
- 64-bit architecture (required for strict types)

## Core Types and Concepts

### Contract Type

The central type for working with RGB contracts is `Contract<S, P>`:

```rust
use rgb::{Contract, Stock, Pile, RgbSeal};

pub struct Contract<S: Stock, P: Pile> {
    contract_id: ContractId,
    ledger: Ledger<S>,
    pile: P,
}
```

**Type Parameters:**
- `S: Stock` - Persistent storage backend for contract state
- `P: Pile` - Seal and witness management

### Stock

Storage abstraction for contract operations and state:

```rust
use rgbstd::persistence::Stock;

// In-memory stock (for testing)
let stock = Stock::in_memory();

// File-backed stock (for production)
use rgb_persist_fs::StockpileDir;
let stock = Stock::load(StockpileDir::new("/path/to/data")?)?;
```

### Pile

Manages UTXO bindings and witnesses:

```rust
pub trait Pile {
    type Seal: RgbSeal;
    type Conf;
    type Error: Error;

    fn seal(&self, addr: CellAddr) -> Option<Self::Seal>;
    fn add_seals(&mut self, opid: Opid, seals: SmallOrdMap<u16, Self::Seal::Definition>);
    fn witness_status(&self, wid: Self::Seal::WitnessId) -> WitnessStatus;
    // ... more methods
}
```

## Complete Contract API

### Initialization and Loading

#### Create from Consignment

```rust
use rgb::{Contract, Articles, Consignment};

impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn with(
        articles: Articles,
        consignment: Consignment<P::Seal>,
        conf: S::Conf,
    ) -> Result<Self, MultiError<ConsumeError<P::Seal::Definition>, S::Error, P::Error>>
    where
        P::Conf: From<S::Conf>,
        <P::Seal as RgbSeal>::Definition: StrictDecode,
        <P::Seal as RgbSeal>::Client: StrictDecode,
        <P::Seal as RgbSeal>::Published: StrictDecode,
    {
        // Create contract from articles and consignment
        // Validates entire history during import
    }
}
```

**Example:**
```rust
let articles = load_articles("contract_articles.rgb")?;
let consignment = load_consignment("transfer.consignment")?;
let config = StockConfig::default();

let contract = Contract::with(articles, consignment, config)?;
println!("Contract loaded: {}", contract.contract_id());
```

#### Issue New Contract

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn issue(
        issuer: Issuer,
        params: CreateParams<P::Seal::Definition>,
        conf: impl FnOnce(&Articles) -> Result<S::Conf, S::Error>,
    ) -> Result<Self, MultiError<IssuerError, S::Error, P::Error>>
    where
        P::Conf: From<S::Conf>,
    {
        // Issue new contract genesis
    }
}
```

**Example:**
```rust
use rgb::{Issuer, CreateParams, Consensus};

let issuer = Issuer::new(identity, private_key);
let params = CreateParams::new_testnet(
    "ssi:issuer",
    Consensus::Bitcoin,
    "RGB20Token",
);

let contract = Contract::issue(
    issuer,
    params,
    |articles| Ok(StockConfig::for_contract(articles)),
)?;
```

#### Load Existing Contract

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn load(
        stock_conf: S::Conf,
        pile_conf: P::Conf,
    ) -> Result<Self, MultiError<S::Error, P::Error>> {
        // Load contract from persistent storage
    }
}
```

**Example:**
```rust
let stock_config = StockConfig::load("/path/to/stock")?;
let pile_config = PileConfig::load("/path/to/pile")?;

let contract = Contract::load(stock_config, pile_config)?;
```

### Contract Information

#### Contract ID

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn contract_id(&self) -> ContractId {
        self.contract_id
    }
}
```

**Example:**
```rust
let contract_id = contract.contract_id();
println!("Contract: {}", contract_id.to_string());
// Output: rgb:pOIzGFyQ-mA!yQq2-QH8vB5!-5fAplY!-x2lW!vz-JHDbYPg
```

#### Articles

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn articles(&self) -> &Articles {
        self.ledger.articles()
    }
}
```

**Articles** contain:
- Schema definition
- Interface implementations
- Genesis operation
- Issuer signature

**Example:**
```rust
let articles = contract.articles();
println!("Schema: {}", articles.schema().name);
println!("Genesis: {}", articles.genesis_opid());
```

### State Queries

#### Get Contract State

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn state(&self) -> ContractState<P::Seal> {
        // Returns current contract state with seal resolution
    }
}
```

**ContractState Structure:**
```rust
pub struct ContractState<Seal> {
    pub immutable: BTreeMap<StateName, Vec<ImmutableState>>,
    pub owned: BTreeMap<StateName, Vec<OwnedState<Seal>>>,
    pub aggregated: BTreeMap<StateName, StrictVal>,
}
```

**Example:**
```rust
let state = contract.state();

// Query global state
for (name, states) in state.immutable {
    for state in states {
        println!("Global {}: {:?}", name, state.data);
    }
}

// Query owned state
for (name, states) in state.owned {
    for owned in states {
        println!("Owned {}: seal={}, value={:?}, status={:?}",
            name,
            owned.assignment.seal,
            owned.assignment.data,
            owned.status
        );
    }
}

// Query aggregated state
for (name, value) in state.aggregated {
    println!("Aggregated {}: {:?}", name, value);
}
```

#### Full State (Raw)

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn full_state(&self) -> &EffectiveState {
        self.ledger.state()
    }
}
```

**Example:**
```rust
let full_state = contract.full_state();
println!("State hash: {}", full_state.state_hash());
```

#### Seal Queries

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn seal(&self, seal: &P::Seal::Definition) -> Option<CellAddr> {
        // Find state assignment for a seal
    }
}
```

**Example:**
```rust
let seal_def = TxoSeal::new(outpoint, method);
if let Some(addr) = contract.seal(&seal_def) {
    println!("Seal controls state at: opid={}, output={}",
        addr.opid, addr.ty);
}
```

### Operations

#### List Operations

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn operations(
        &self,
    ) -> impl Iterator<Item = (Opid, Operation, OpRels<P::Seal>)> + use<'_, S, P> {
        // Iterate all operations (excluding genesis)
    }
}
```

**Example:**
```rust
for (opid, operation, rels) in contract.operations() {
    println!("Operation {}", opid);
    println!("  Inputs: {}", operation.inputs.len());
    println!("  Outputs: {}", operation.owned.len());
    println!("  Seals: {:?}", rels.seals);
}
```

#### Trace History

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn trace(&self) -> impl Iterator<Item = (Opid, Transition)> + use<'_, S, P> {
        // Trace transition history
    }
}
```

**Example:**
```rust
for (opid, transition) in contract.trace() {
    println!("Transition {}: method={}", opid, transition.method);
}
```

#### Operation Relations

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn op_seals(&self, opid: Opid, up_to: u16) -> OpRels<P::Seal> {
        // Get seal relationships for operation
    }
}
```

### Witnesses

#### List Witness IDs

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn witness_ids(
        &self,
    ) -> impl Iterator<Item = P::Seal::WitnessId> + use<'_, S, P> {
        // All witness IDs in contract
    }
}
```

#### List Witnesses

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn witnesses(&self) -> impl Iterator<Item = Witness<P::Seal>> + use<'_, S, P> {
        // All witnesses with status
    }
}
```

**Example:**
```rust
for witness in contract.witnesses() {
    println!("Witness {}: status={:?}",
        witness.id(),
        witness.status
    );
}
```

#### Query by Witness

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn ops_by_witness_id(
        &self,
        wid: P::Seal::WitnessId,
    ) -> impl Iterator<Item = Opid> + use<'_, S, P> {
        // All operations using this witness
    }
}
```

**Example:**
```rust
let witness_id = TxWitness::from(txid);
for opid in contract.ops_by_witness_id(witness_id) {
    println!("Operation {} uses witness {}", opid, witness_id);
}
```

### State Transitions

#### Create State Transition (Call)

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn call(
        &mut self,
        call: CallParams,
        seals: SmallOrdMap<u16, P::Seal::Definition>,
    ) -> Result<Operation, MultiError<AcceptError, S::Error>> {
        // Create and apply new state transition
    }
}
```

**CallParams Structure:**
```rust
pub struct CallParams {
    pub method: MethodName,        // Transition method name
    pub global: Vec<NamedState<StateAtom>>,   // Global state updates
    pub owned: Vec<NamedState<DataCell>>,     // Owned state assignments
    pub valencies: Vec<Valency>,   // Valency declarations
}
```

**Example:**
```rust
use rgb::CallParams;

let call = CallParams {
    method: MethodName::from("transfer"),
    global: vec![],
    owned: vec![
        NamedState {
            name: StateName::from("assetOwner"),
            state: DataCell {
                auth: recipient_seal.auth_token(),
                data: StrictVal::from(1000u64),
                lock: None,
            },
        }
    ],
    valencies: vec![],
};

let seals = small_bmap! {
    0u16 => recipient_seal
};

let operation = contract.call(call, seals)?;
println!("Created operation: {}", operation.opid());
```

#### Include Operation

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn include(
        &mut self,
        opid: Opid,
        anchor: P::Seal::Client,
        published: &P::Seal::Published,
    ) {
        // Include operation with witness
    }
}
```

**Example:**
```rust
// After broadcasting Bitcoin transaction
let opid = operation.opid();
let anchor = ClientAnchor::from(psbt);
let published = PublishedWitness::from(tx);

contract.include(opid, anchor, &published);
```

### Synchronization

#### Sync Witness Status

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn sync(
        &mut self,
        changed: impl IntoIterator<Item = (P::Seal::WitnessId, WitnessStatus)>,
    ) -> Result<(), MultiError<AcceptError, S::Error>> {
        // Update witness status and recompute state
    }
}
```

**WitnessStatus Enum:**
```rust
pub enum WitnessStatus {
    Genesis,               // Genesis operation
    Tentative,             // Unconfirmed
    Mined { depth: u32 }, // Confirmed
    Invalid,               // Rejected/double-spent
}
```

**Example:**
```rust
// After Bitcoin confirmations
let updates = vec![
    (witness_id1, WitnessStatus::Mined { depth: 1 }),
    (witness_id2, WitnessStatus::Mined { depth: 6 }),
];

contract.sync(updates)?;

// State automatically recomputes
let state = contract.state();
```

### Consignments

#### Export Full Contract

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn export(&self, writer: StrictWriter<impl WriteRaw>) -> io::Result<()>
    where
        P::Seal::Client: StrictDumb + StrictEncode,
        P::Seal::Published: StrictDumb + StrictEncode,
        P::Seal::WitnessId: StrictEncode,
    {
        // Export complete contract
    }
}
```

**Example:**
```rust
use std::fs::File;
use strict_encoding::StrictWriter;

let file = File::create("contract.rgb")?;
let writer = StrictWriter::new(file);
contract.export(writer)?;
```

#### Create Consignment

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn consign(
        &self,
        terminals: impl IntoIterator<Item = impl Borrow<AuthToken>>,
        writer: StrictWriter<impl WriteRaw>,
    ) -> io::Result<()>
    where
        P::Seal::Client: StrictDumb + StrictEncode,
        P::Seal::Published: StrictDumb + StrictEncode,
        P::Seal::WitnessId: StrictEncode,
    {
        // Export consignment for specific terminals
    }
}
```

**Example:**
```rust
// Create consignment for transfer
let terminals = vec![recipient_auth_token];
let file = File::create("transfer.consignment")?;
let writer = StrictWriter::new(file);

contract.consign(terminals, writer)?;
```

#### Consume Consignment

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn consume<E>(
        &mut self,
        reader: &mut StrictReader<impl ReadRaw>,
        seal_resolver: impl FnMut(&Operation) -> BTreeMap<u16, P::Seal::Definition>,
        sig_validator: impl FnOnce(StrictHash, &Identity, &SigBlob) -> Result<(), E>,
    ) -> Result<(), MultiError<ConsumeError<P::Seal::Definition>, S::Error>>
    where
        P::Seal::Client: StrictDecode,
        P::Seal::Published: StrictDecode,
        P::Seal::WitnessId: StrictDecode,
    {
        // Import and validate consignment
    }
}
```

**Example:**
```rust
let file = File::open("transfer.consignment")?;
let mut reader = StrictReader::new(file);

// Seal resolver matches blinded seals to wallet seals
let seal_resolver = |op: &Operation| {
    wallet.resolve_seals_for_operation(op)
};

// Signature validator checks issuer signature
let sig_validator = |hash, identity, sig| {
    identity.verify_signature(hash, sig)
};

contract.consume(&mut reader, seal_resolver, sig_validator)?;
```

### File Operations

When the `fs` feature is enabled:

```rust
impl<S: Stock, P: Pile> Contract<S, P> {
    pub fn export_to_file(&self, path: impl AsRef<Path>) -> io::Result<()>
    where
        P::Seal::Client: StrictDumb + StrictEncode,
        P::Seal::Published: StrictDumb + StrictEncode,
        P::Seal::WitnessId: StrictEncode,
    {
        // Export to file
    }

    pub fn consign_to_file(
        &self,
        path: impl AsRef<Path>,
        terminals: impl IntoIterator<Item = impl Borrow<AuthToken>>,
    ) -> io::Result<()>
    where
        P::Seal::Client: StrictDumb + StrictEncode,
        P::Seal::Published: StrictDumb + StrictEncode,
        P::Seal::WitnessId: StrictEncode,
    {
        // Create consignment file
    }
}
```

**Example:**
```rust
// Export full contract
contract.export_to_file("contract.rgb")?;

// Create consignment
contract.consign_to_file("transfer.consignment", terminals)?;
```

## Working with RGB20

### Creating Fungible Tokens

```rust
use schemata::NonInflatableAsset;
use ifaces::Rgb20;
use rgbstd::persistence::Stock;

// Simple token creation
let contract = NonInflatableAsset::testnet(
    "ssi:issuer",
    "TOKEN",
    "My Token",
    None,
    Precision::CentiMicro,
    [(Method::TapretFirst, beneficiary, 1_000_000_00000000u64)]
)?;

// Import to stock
let mut stock = Stock::in_memory();
stock.import_contract(contract, NoResolver)?;

// Query via RGB20 interface
let rgb20 = stock.contract_iface_class::<Rgb20>(contract_id)?;
```

### Interface Queries

```rust
// Get token spec
let spec = rgb20.spec();
println!("Ticker: {}", spec.ticker);
println!("Name: {}", spec.name);
println!("Precision: {}", spec.precision);

// Get supply
let total_supply = rgb20.total_supply();
println!("Total Supply: {}", total_supply);

// Get allocations
use rgbstd::interface::{FilterIncludeAll, FungibleAllocation};

for FungibleAllocation { seal, state, witness, .. } in rgb20.allocations(&FilterIncludeAll) {
    println!("Allocation: amount={}, seal={}", state, seal);
}
```

## Working with RGB21

### Creating NFTs

```rust
use schemata::UniqueDigitalAsset;
use ifaces::Rgb21;
use ifaces::rgb21::{TokenData, EmbeddedMedia};

// Define token data
let token_data = TokenData {
    index: TokenIndex::from_inner(1),
    preview: Some(EmbeddedMedia {
        ty: MediaType::with("image/png"),
        data: SmallBlob::try_from_iter(image_bytes)?,
    }),
    ..Default::default()
};

// Create contract with builder
let mut stock = Stock::in_memory();
let kit = Kit::load_file("UniqueDigitalAsset.rgb")?.validate()?;
stock.import_kit(kit)?;

let contract = stock.contract_builder(
        "ssi:issuer",
        UniqueDigitalAsset::schema().schema_id(),
        "RGB21",
    )?
    .add_global_state("tokens", token_data)?
    .add_global_state("spec", spec)?
    .add_data("assetOwner", seal, Allocation::with(index, 1))?
    .issue_contract()?;

// Query via RGB21 interface
let rgb21 = stock.contract_iface_class::<Rgb21>(contract_id)?;
```

## Advanced Patterns

### Custom Schemas

Define custom contract logic:

```rust
use rgbstd::schema::{Schema, GenesisSchema, TransitionSchema};
use aluvm::library::Lib;

fn custom_schema() -> Schema {
    let types = StandardTypes::new();

    Schema {
        ffv: zero!(),
        flags: none!(),
        name: tn!("CustomContract"),
        timestamp: 1713343888,
        developer: Identity::from("ssi:developer"),
        meta_types: none!(),
        global_types: tiny_bmap! {
            0u16 => GlobalStateSchema::once(types.get("CustomData")),
        },
        owned_types: tiny_bmap! {
            0u16 => OwnedStateSchema::Fungible(FungibleType::Unsigned64Bit),
        },
        valency_types: none!(),
        genesis: GenesisSchema {
            metadata: none!(),
            globals: tiny_bmap! { 0u16 => Occurrences::Once },
            assignments: tiny_bmap! { 0u16 => Occurrences::OnceOrMore },
            valencies: none!(),
            validator: Some(LibSite::with(0, validation_lib_id)),
        },
        extensions: none!(),
        transitions: tiny_bmap! {
            0u16 => TransitionSchema {
                metadata: none!(),
                globals: none!(),
                inputs: tiny_bmap! { 0u16 => Occurrences::OnceOrMore },
                assignments: tiny_bmap! { 0u16 => Occurrences::OnceOrMore },
                valencies: none!(),
                validator: Some(LibSite::with(4, validation_lib_id)),
            }
        },
        reserved: none!(),
    }
}
```

### Validation Scripts

Create AluVM validation scripts:

```rust
use aluvm::library::Lib;
use rgbstd::rgbasm;

fn validation_lib() -> Lib {
    let code = rgbasm! {
        // Custom validation logic
        put     a8[0], 1;         // Error code
        pcvs    0u16;              // Verify commitments
        test;
        ret;
    };

    Lib::assemble(&code).expect("invalid validation script")
}
```

## Error Handling

### Common Error Types

```rust
#[derive(Debug, Display, Error)]
pub enum ConsumeError<Seal: RgbSealDef> {
    Io(IoError),
    UnknownContract(ContractId),
    Semantics(SemanticError),
    Decode(DecodeError),
    Verify(VerificationError<Seal::Src>),
    Issue(IssuerError),
}
```

### Error Handling Pattern

```rust
match contract.consume(&mut reader, resolver, validator) {
    Ok(_) => {
        println!("Consignment accepted");
    }
    Err(MultiError::A(ConsumeError::UnknownContract(id))) => {
        eprintln!("Unknown contract: {}", id);
        // Import genesis first
    }
    Err(MultiError::A(ConsumeError::Verify(err))) => {
        eprintln!("Validation failed: {}", err);
        // Invalid consignment
    }
    Err(e) => {
        eprintln!("Error: {}", e);
    }
}
```

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contract_creation() {
        let contract = NonInflatableAsset::testnet(
            "ssi:test",
            "TEST",
            "Test Token",
            None,
            Precision::CentiMicro,
            [(Method::TapretFirst, test_outpoint(), 1000_00000000)]
        ).unwrap();

        assert_eq!(contract.contract_id().to_string().len() > 0, true);
    }

    #[test]
    fn test_state_query() {
        let contract = create_test_contract();
        let state = contract.state();

        assert!(state.owned.contains_key(&StateName::from("assetOwner")));
    }

    #[test]
    fn test_transfer() {
        let mut contract = create_test_contract();

        let call = CallParams {
            method: MethodName::from("transfer"),
            global: vec![],
            owned: vec![create_transfer_output(1000)],
            valencies: vec![],
        };

        let result = contract.call(call, test_seals());
        assert!(result.is_ok());
    }
}
```

### Integration Tests

```rust
#[test]
fn test_full_transfer_workflow() {
    // 1. Create genesis
    let contract = create_genesis_contract();

    // 2. Export consignment
    let terminals = vec![recipient_token];
    let mut consignment_data = Vec::new();
    contract.consign(terminals, StrictWriter::new(&mut consignment_data)).unwrap();

    // 3. Import on recipient side
    let mut recipient_contract = Contract::with(
        contract.articles().clone(),
        Consignment::decode(&consignment_data).unwrap(),
        config,
    ).unwrap();

    // 4. Verify state
    let state = recipient_contract.state();
    assert!(state.owned.len() > 0);
}
```

## Best Practices

### Resource Management

```rust
// Use RAII for automatic cleanup
{
    let contract = Contract::load(config)?;
    // Contract automatically saved on drop
} // <- Resources freed here
```

### Thread Safety

```rust
use std::sync::{Arc, Mutex};

// Share contracts across threads
let contract = Arc::new(Mutex::new(contract));

let contract_clone = contract.clone();
std::thread::spawn(move || {
    let mut c = contract_clone.lock().unwrap();
    // Use contract
});
```

### Performance Tips

```rust
// Cache state queries
let state = contract.state();
// Reuse state for multiple queries

// Batch witness updates
let updates = vec![
    (wid1, status1),
    (wid2, status2),
    (wid3, status3),
];
contract.sync(updates)?;  // Single batch update

// Use iterators efficiently
for (opid, op, rels) in contract.operations().take(10) {
    // Process only first 10 operations
}
```

## Related Documentation

- [Creating RGB20 Tokens](../rgb20/creating-tokens.md)
- [Transferring Assets](../rgb20/transferring-assets.md)
- [RGB Interfaces](../../technical-reference/interfaces.md)
- [Client-Side Validation](../../core-concepts/client-side-validation.md)

---

**Source Code**: See `/tmp/rgb-repos/rgb-std/src/contract.rs` for complete Contract implementation.
