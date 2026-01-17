---
sidebar_position: 3
title: RGB Interfaces
description: Standard RGB interfaces and integration points
---

# RGB Interfaces

Standard interfaces for RGB protocol integration and interoperability. RGB interfaces provide a uniform API across different schema implementations, enabling wallets and applications to work with contracts in a standardized way.

## Interface Architecture

### What are RGB Interfaces?

RGB interfaces define standard methods and state structures that contracts must implement. They act as an abstraction layer between:
- **Schemas**: Low-level contract logic and validation
- **Applications**: High-level contract interaction

```rust
// Interface provides standard API
let rgb20: Rgb20 = stock.contract_iface_class::<Rgb20>(contract_id)?;

// Works with any schema that implements RGB20
let ticker = rgb20.spec().ticker;  // Standardized access
```

### Interface Implementation

Schemas map their internal state to interface requirements:

```rust
pub struct IfaceImpl {
    pub version: VerNo,
    pub schema_id: SchemaId,
    pub iface_id: IfaceId,
    pub timestamp: i64,
    pub developer: Identity,
    pub metadata: Confined<BTreeMap<MetaKey, MetaValue>>,
    pub global_state: Confined<BTreeSet<NamedField>>,
    pub assignments: Confined<BTreeSet<NamedField>>,
    pub valencies: Confined<BTreeSet<NamedField>>,
    pub transitions: Confined<BTreeSet<NamedField>>,
    pub extensions: Confined<BTreeSet<NamedField>>,
    pub errors: Confined<BTreeSet<NamedVariant>>,
}
```

## RGB20: Fungible Assets

### Overview

RGB20 is the standard interface for fungible tokens (like ERC-20 on Ethereum). It supports:
- Fixed or flexible supply
- Fractional ownership (precision up to 18 decimals)
- Transfer operations
- Optional burn/reissue capabilities

### Interface Specification

```typescript
interface IRGB20 {
  // Asset Specification
  spec(): AssetSpec;

  // Supply Queries
  totalSupply(): Amount;
  issuedSupply(): Amount;
  burnedSupply(): Amount;

  // Ownership Queries
  allocations(filter: AllocationFilter): Iterator<FungibleAllocation>;
  balance(filter: OutpointFilter): Amount;

  // Operations (via state transitions)
  // - transfer: Move tokens between owners
  // - burn: Destroy tokens (if enabled)
  // - issue: Mint new tokens (if enabled)
}
```

### Asset Specification

```rust
pub struct AssetSpec {
    pub ticker: Ticker,      // 1-8 uppercase chars
    pub name: Name,          // Human-readable name
    pub details: Option<Details>,  // Optional description
    pub precision: Precision,      // Decimal places (0-18)
}
```

**Example:**
```rust
let spec = rgb20.spec();
println!("Ticker: {}", spec.ticker);     // "USDT"
println!("Name: {}", spec.name);         // "Tether USD"
println!("Precision: {}", spec.precision); // 2 decimals
```

### Supply Information

```rust
// Total issued supply (including burned)
let total = rgb20.total_supply();

// Currently issued (not burned)
let issued = rgb20.issued_supply();

// Burned tokens
let burned = rgb20.burned_supply();

// Circulating = issued - burned
let circulating = issued - burned;
```

### Allocations

```rust
use rgbstd::interface::{FilterIncludeAll, FungibleAllocation};

// Get all allocations
for FungibleAllocation {
    seal,      // Output seal
    state,     // Amount
    witness,   // Transaction witness
    ..
} in rgb20.allocations(&FilterIncludeAll) {
    println!("Amount: {}, Owner: {}", state, seal);
}
```

### Schema Implementation: NonInflatableAsset (NIA)

Fixed-supply RGB20 implementation:

```rust
pub struct NonInflatableAsset;

impl IssuerWrapper for NonInflatableAsset {
    const FEATURES: Rgb20 = Rgb20::FIXED;
    type IssuingIface = Rgb20;

    fn schema() -> Schema {
        Schema {
            name: tn!("NonInflatableAsset"),
            global_types: tiny_bmap! {
                GS_NOMINAL => GlobalStateSchema::once("AssetSpec"),
                GS_TERMS => GlobalStateSchema::once("ContractTerms"),
                GS_ISSUED_SUPPLY => GlobalStateSchema::once("Amount"),
            },
            owned_types: tiny_bmap! {
                OS_ASSET => OwnedStateSchema::Fungible(FungibleType::Unsigned64Bit),
            },
            transitions: tiny_bmap! {
                TS_TRANSFER => TransitionSchema { /* ... */ }
            },
            // ...
        }
    }
}
```

**Interface Mapping:**
```rust
fn nia_rgb20() -> IfaceImpl {
    IfaceImpl {
        schema_id: nia_schema().schema_id(),
        iface_id: Rgb20::FIXED.iface_id(),
        global_state: tiny_bset! {
            NamedField::with(GS_NOMINAL, fname!("spec")),
            NamedField::with(GS_TERMS, fname!("terms")),
            NamedField::with(GS_ISSUED_SUPPLY, fname!("issuedSupply")),
        },
        assignments: tiny_bset! {
            NamedField::with(OS_ASSET, fname!("assetOwner")),
        },
        transitions: tiny_bset! {
            NamedField::with(TS_TRANSFER, fname!("transfer")),
        },
        errors: tiny_bset![
            NamedVariant::with(ERRNO_ISSUED_MISMATCH, vname!("issuedMismatch")),
            NamedVariant::with(ERRNO_NON_EQUAL_IN_OUT, vname!("nonEqualAmounts")),
        ],
    }
}
```

### Validation Logic

NIA uses AluVM for validation:

```rust
pub fn nia_lib() -> Lib {
    let code = rgbasm! {
        // Transfer validation
        put     a8[0],ERRNO_NON_EQUAL_IN_OUT;
        pcvs    OS_ASSET;  // Pedersen commitment verification
        test;
        ret;

        // Genesis validation
        put     a8[0],ERRNO_ISSUED_MISMATCH;
        put     a8[1],0;
        put     a16[0],0;
        ldg     GS_ISSUED_SUPPLY,a8[1],s16[0];  // Load global state
        extr    s16[0],a64[0],a16[0];            // Extract amount
        pcas    OS_ASSET;  // Verify commitments vs. issued supply
        test;
        ret;
    };
    Lib::assemble(&code).expect("invalid NIA script")
}
```

**Validation Rules:**
- **Genesis**: Sum of output amounts must equal declared issued supply
- **Transfer**: Sum of input amounts must equal sum of output amounts
- **Pedersen Commitments**: Cryptographically verify amounts without revealing them

## RGB21: Non-Fungible Tokens

### Overview

RGB21 is the standard interface for unique digital assets (NFTs). It supports:
- Unique token identifiers
- Rich metadata (embedded or external)
- Media attachments
- Fractionalization (optional)

### Interface Specification

```typescript
interface IRGB21 {
  // Collection Specification
  spec(): AssetSpec;

  // Token Queries
  tokens(filter: AllocationFilter): Iterator<Allocation>;
  tokenData(index: TokenIndex): TokenData;

  // Ownership
  balance(filter: OutpointFilter): Amount;
  allocations(filter: AllocationFilter): Iterator<Allocation>;
}
```

### Token Data

```rust
pub struct TokenData {
    pub index: TokenIndex,           // Unique token ID
    pub preview: Option<EmbeddedMedia>,  // Preview image/media
    pub media: Option<Attachment>,   // Full media attachment
    pub attachments: Confined<BTreeMap<u8, Attachment>>,  // Additional files
    pub reserves: Option<ProofOfReserves>,  // Proof of reserves
}
```

**Example:**
```rust
let token_data = TokenData {
    index: TokenIndex::from_inner(1),
    preview: Some(EmbeddedMedia {
        ty: MediaType::with("image/png"),
        data: SmallBlob::try_from_iter(image_bytes)?,
    }),
    media: Some(Attachment {
        ty: MediaType::with("image/jpeg"),
        digest: Bytes::from_byte_array(sha256_hash),
    }),
    attachments: none!(),
    reserves: None,
};
```

### Embedded Media

Small media can be embedded directly in contract:

```rust
pub struct EmbeddedMedia {
    pub ty: MediaType,       // MIME type
    pub data: SmallBlob,     // Up to 64KB
}

// Example
let preview = EmbeddedMedia {
    ty: MediaType::with("image/png"),
    data: SmallBlob::try_from_iter(thumbnail_bytes)?,
};
```

### External Attachments

Large media referenced via content hash:

```rust
pub struct Attachment {
    pub ty: MediaType,       // MIME type
    pub digest: Bytes,       // Content hash (SHA-256)
}

// Link to external media
let attachment = Attachment {
    ty: MediaType::with("video/mp4"),
    digest: Bytes::from_byte_array(file_hash),
};
```

### Schema Implementation: UniqueDigitalAsset (UDA)

```rust
pub struct UniqueDigitalAsset;

impl IssuerWrapper for UniqueDigitalAsset {
    type IssuingIface = Rgb21;
    const FEATURES: Rgb21 = Rgb21::NONE;

    fn schema() -> Schema {
        Schema {
            name: tn!("UniqueDigitalAsset"),
            global_types: tiny_bmap! {
                GS_TOKENS => GlobalStateSchema::once("Rgb21.TokenData"),
                GS_NOMINAL => GlobalStateSchema::once("AssetSpec"),
                GS_TERMS => GlobalStateSchema::once("ContractTerms"),
            },
            owned_types: tiny_bmap! {
                OS_ASSET => OwnedStateSchema::Structured("Rgb21.Allocation"),
            },
            transitions: tiny_bmap! {
                TS_TRANSFER => TransitionSchema { /* ... */ }
            },
            // ...
        }
    }
}
```

### Creating RGB21 Tokens

```rust
use schemata::UniqueDigitalAsset;
use ifaces::Rgb21;

// Define asset spec
let spec = AssetSpec::new("UNIQ", "Unique Art", Precision::Indivisible);

// Define token data
let token_data = TokenData {
    index: TokenIndex::from_inner(1),
    preview: Some(preview_media),
    media: Some(media_attachment),
    ..Default::default()
};

// Create contract
let contract = stock.contract_builder(
        "ssi:artist",
        UniqueDigitalAsset::schema().schema_id(),
        "RGB21",
    )?
    .add_global_state("spec", spec)?
    .add_global_state("tokens", token_data)?
    .add_data("assetOwner", seal, Allocation::with(index, 1))?
    .issue_contract()?;

// Query via RGB21 interface
let rgb21 = stock.contract_iface_class::<Rgb21>(contract_id)?;
let tokens: Vec<_> = rgb21.tokens(&FilterIncludeAll).collect();
```

## RGB25: Collectible Fungible Assets

### Overview

RGB25 combines aspects of RGB20 and RGB21, providing:
- Fungible fractional ownership
- Rich metadata (like NFTs)
- Collection management
- Proof of reserves

Use cases: Fractionalized NFTs, tokenized real-world assets, game items

### Interface Specification

```typescript
interface IRGB25 {
  // Collection Info
  name(): Name;
  details(): Option<Details>;
  precision(): Precision;

  // Asset Specification
  art(): Option<Attachment>;  // Collection artwork

  // Supply & Ownership (like RGB20)
  totalSupply(): Amount;
  allocations(filter: AllocationFilter): Iterator<FungibleAllocation>;
  balance(filter: OutpointFilter): Amount;
}
```

### Schema Implementation: CollectibleFungibleAsset (CFA)

```rust
pub struct CollectibleFungibleAsset;

impl IssuerWrapper for CollectibleFungibleAsset {
    type IssuingIface = Rgb25;
    const FEATURES: Rgb25 = Rgb25::NONE;

    fn schema() -> Schema {
        Schema {
            name: tn!("CollectibleFungibleAsset"),
            global_types: tiny_bmap! {
                GS_ART => GlobalStateSchema::once("Article"),
                GS_NAME => GlobalStateSchema::once("Name"),
                GS_DETAILS => GlobalStateSchema::once("Details"),
                GS_PRECISION => GlobalStateSchema::once("Precision"),
                GS_TERMS => GlobalStateSchema::once("ContractTerms"),
                GS_ISSUED_SUPPLY => GlobalStateSchema::once("Amount"),
            },
            owned_types: tiny_bmap! {
                OS_ASSET => OwnedStateSchema::Fungible(FungibleType::Unsigned64Bit),
            },
            // Uses same validation as NIA
            genesis: GenesisSchema {
                validator: Some(LibSite::with(FN_NIA_GENESIS_OFFSET, nia_lib_id)),
                // ...
            },
            transitions: tiny_bmap! {
                TS_TRANSFER => TransitionSchema {
                    validator: Some(LibSite::with(FN_NIA_TRANSFER_OFFSET, nia_lib_id)),
                    // ...
                }
            },
        }
    }
}
```

### Creating RGB25 Assets

```rust
// Example: Fractionalized artwork
let contract = stock.contract_builder(
        "ssi:gallery",
        CollectibleFungibleAsset::schema().schema_id(),
        "RGB25",
    )?
    .add_global_state("name", Name::from("Mona Lisa Fraction"))?
    .add_global_state("details", Details::from("1/1000 ownership"))?
    .add_global_state("precision", Precision::Centi)?  // 2 decimals
    .add_global_state("art", artwork_attachment)?
    .add_fungible_state("assetOwner", seal, 1000_00)?  // 1000 fractions
    .issue_contract()?;
```

## Interface Compliance

### Checking Implementation

Verify that a schema correctly implements an interface:

```rust
let iface = Rgb20::FIXED.iface();
let schema = NonInflatableAsset::schema();
let iface_impl = NonInflatableAsset::issue_impl();

if let Err(errors) = iface_impl.check(&iface, &schema) {
    for error in errors {
        eprintln!("Compliance error: {}", error);
    }
    panic!("Invalid interface implementation");
}
```

### Runtime Interface Detection

```rust
// Check if contract implements RGB20
fn implements_rgb20(contract: &Contract) -> bool {
    contract.iface_id() == Rgb20::FIXED.iface_id()
}

// Query via interface
if implements_rgb20(&contract) {
    let rgb20 = stock.contract_iface_class::<Rgb20>(contract_id)?;
    println!("Token: {}", rgb20.spec().ticker);
}
```

## Custom Interfaces

### Defining Custom Interfaces

For specialized use cases, define custom interfaces:

```rust
use rgbstd::interface::{Iface, IfaceOp, OpName, GlobalStateName, AssignmentName};

fn stablecoin_iface() -> Iface {
    Iface {
        name: tn!("Stablecoin"),
        timestamp: 1713343888,
        developer: Identity::from("ssi:developer"),
        global_state: tiny_bset! {
            GlobalStateName::from("spec"),
            GlobalStateName::from("collateralRatio"),
            GlobalStateName::from("oraclePrice"),
        },
        assignments: tiny_bset! {
            AssignmentName::from("assetOwner"),
        },
        transitions: tiny_bset! {
            IfaceOp {
                name: OpName::from("mint"),
                global: tiny_bset![GlobalStateName::from("collateral")],
                assignments: tiny_bset![AssignmentName::from("assetOwner")],
                // ...
            },
            IfaceOp {
                name: OpName::from("redeem"),
                // ...
            },
        },
        // ...
    }
}
```

### Implementing Custom Interface

```rust
fn stablecoin_impl() -> IfaceImpl {
    let schema = stablecoin_schema();

    IfaceImpl {
        schema_id: schema.schema_id(),
        iface_id: stablecoin_iface().iface_id(),
        global_state: tiny_bset! {
            NamedField::with(0, fname!("spec")),
            NamedField::with(1, fname!("collateralRatio")),
            NamedField::with(2, fname!("oraclePrice")),
        },
        transitions: tiny_bset! {
            NamedField::with(0, fname!("mint")),
            NamedField::with(1, fname!("redeem")),
        },
        // ...
    }
}
```

## Interface Versioning

### Version Compatibility

```rust
pub enum VerNo {
    V1,   // Version 1
    V2,   // Version 2
    // Future versions
}

// Interface implementations specify version
impl IfaceImpl {
    pub version: VerNo = VerNo::V1;
}
```

### Backward Compatibility

```rust
// Check interface version
match iface_impl.version {
    VerNo::V1 => {
        // Handle V1 interface
    }
    VerNo::V2 => {
        // Handle V2 interface (backward compatible)
    }
}
```

## State Filters

### Allocation Filters

Query specific subsets of contract state:

```rust
use rgbstd::interface::{AllocationFilter, OutpointFilter};

// Include all allocations
let filter = FilterIncludeAll;
let all: Vec<_> = rgb20.allocations(&filter).collect();

// Filter by outpoint
let outpoint_filter = OutpointFilter::with(specific_outpoint);
let balance = rgb20.balance(&outpoint_filter);

// Custom filters
pub trait AllocationFilter {
    fn include_outpoint(&self, outpoint: &Outpoint) -> bool;
    fn include_witness(&self, witness: &XWitnessId) -> bool;
}
```

### State Access

```rust
// Global state (immutable)
for (name, state) in contract.state().immutable {
    println!("Global {}: {:?}", name, state);
}

// Owned state (mutable)
for (name, allocations) in contract.state().owned {
    for alloc in allocations {
        println!("Owned {}: {:?}", name, alloc);
    }
}

// Aggregated state (computed)
for (name, value) in contract.state().aggregated {
    println!("Aggregated {}: {:?}", name, value);
}
```

## Error Variants

### Interface-Defined Errors

Interfaces can define standard error codes:

```rust
// RGB20 errors
pub const ERRNO_ISSUED_MISMATCH: u8 = 1;     // Issued supply mismatch
pub const ERRNO_NON_EQUAL_IN_OUT: u8 = 2;    // Input != Output amounts

// Map to named variants
errors: tiny_bset![
    NamedVariant::with(ERRNO_ISSUED_MISMATCH, vname!("issuedMismatch")),
    NamedVariant::with(ERRNO_NON_EQUAL_IN_OUT, vname!("nonEqualAmounts")),
]
```

### Handling Errors

```rust
use rgb::validation::ValidationStatus;

match contract.validate_operation(opid) {
    ValidationStatus::Valid => {
        println!("Operation valid");
    }
    ValidationStatus::Invalid { error_code } => {
        match error_code {
            ERRNO_ISSUED_MISMATCH => {
                eprintln!("Issued supply doesn't match allocations");
            }
            ERRNO_NON_EQUAL_IN_OUT => {
                eprintln!("Transfer amounts don't balance");
            }
            _ => {
                eprintln!("Unknown error: {}", error_code);
            }
        }
    }
}
```

## Best Practices

### Interface Design

**Do:**
- Keep interfaces focused and minimal
- Use clear, descriptive names
- Version interfaces for evolution
- Document all methods and state

**Don't:**
- Mix unrelated functionality
- Change interface semantics in new versions
- Break backward compatibility

### Schema Implementation

```rust
// Good: Clear mapping between schema and interface
fn clear_mapping() -> IfaceImpl {
    IfaceImpl {
        global_state: tiny_bset! {
            NamedField::with(SCHEMA_TICKER, fname!("ticker")),
            NamedField::with(SCHEMA_NAME, fname!("name")),
        },
        // Clear 1:1 mapping
    }
}

// Bad: Confusing or arbitrary mappings
fn confusing_mapping() -> IfaceImpl {
    IfaceImpl {
        global_state: tiny_bset! {
            NamedField::with(17, fname!("x")),  // What is 17? What is x?
        },
    }
}
```

### Performance Considerations

```rust
// Cache interface queries
let rgb20 = stock.contract_iface_class::<Rgb20>(contract_id)?;
let spec = rgb20.spec();  // Query once
println!("Ticker: {}", spec.ticker);
println!("Name: {}", spec.name);

// Avoid repeated interface instantiation
for i in 0..1000 {
    // Bad: Creates interface 1000 times
    let rgb20 = stock.contract_iface_class::<Rgb20>(contract_id)?;
}

// Good: Reuse interface
let rgb20 = stock.contract_iface_class::<Rgb20>(contract_id)?;
for i in 0..1000 {
    // Use rgb20
}
```

## Testing Interfaces

### Interface Compliance Tests

```rust
#[test]
fn test_rgb20_compliance() {
    let iface = NonInflatableAsset::FEATURES.iface();
    let schema = NonInflatableAsset::schema();
    let impl = NonInflatableAsset::issue_impl();

    // Should not have errors
    assert!(impl.check(&iface, &schema).is_ok());
}
```

### Interface Behavior Tests

```rust
#[test]
fn test_rgb20_behavior() {
    let contract = create_test_rgb20_contract();
    let mut stock = Stock::in_memory();
    stock.import_contract(contract, NoResolver).unwrap();

    let rgb20 = stock.contract_iface_class::<Rgb20>(contract_id).unwrap();

    // Test standard behavior
    assert!(rgb20.total_supply() > 0);
    assert_eq!(rgb20.spec().ticker.to_string(), "TEST");

    let allocations: Vec<_> = rgb20.allocations(&FilterIncludeAll).collect();
    assert!(allocations.len() > 0);
}
```

## Future Interfaces

### Planned Standards

- **RGB22**: Identity & Authentication
- **RGB23**: Audit & Compliance Tokens
- **RGB24**: Decentralized Name Service
- **RGB30**: Decentralized Identities
- **RGB40**: Payment Channels

### Extending Existing Interfaces

New versions can add optional features:

```rust
// RGB20 V2 (future)
interface IRGB20_V2 extends IRGB20 {
    // V1 methods remain
    spec(): AssetSpec;
    totalSupply(): Amount;

    // V2 additions
    metadata(): ContractMetadata;  // New
    proofOfReserves(): Option<Proof>;  // New
}
```

## Related Documentation

- [Creating RGB20 Tokens](../guides/rgb20/creating-tokens.md)
- [RGB21 NFTs](../guides/rgb21/creating-nfts.md)
- [Contract API](../guides/development/rust-sdk.md)
- [Schema Design](../guides/contracts/schemas.md)

---

**Source Code**:
- RGB20 (NIA): `/tmp/rgb-repos/rgb-schemata/src/nia.rs`
- RGB21 (UDA): `/tmp/rgb-repos/rgb-schemata/src/uda.rs`
- RGB25 (CFA): `/tmp/rgb-repos/rgb-schemata/src/cfa.rs`
