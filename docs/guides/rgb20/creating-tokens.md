---
sidebar_position: 1
title: Creating RGB20 Tokens
description: Step-by-step guide to creating fungible tokens with RGB20
---

# Creating RGB20 Tokens

RGB20 is the fungible token standard for RGB, analogous to ERC-20 on Ethereum but with superior privacy and scalability. This guide walks through creating your own RGB20 token from scratch using the actual RGB standard library APIs.

## Overview

Creating an RGB20 token involves:
1. Defining token specifications (ticker, name, precision)
2. Creating a contract builder with the NonInflatableAsset schema
3. Configuring global state (spec, terms, issued supply)
4. Allocating initial tokens to genesis seals
5. Issuing the contract and persisting to stock

## Prerequisites

- RGB development environment set up
- Bitcoin wallet (testnet/regtest recommended for learning)
- Basic understanding of [RGB concepts](../../core-concepts/overview.md)
- Familiarity with Bitcoin UTXOs and transaction outputs

## RGB20 Schema Structure

### NonInflatableAsset (NIA) Schema

RGB20 tokens use the **NonInflatableAsset** schema, which implements a fixed-supply fungible token. The schema defines:

**Global State Types:**
- `GS_NOMINAL` (0x3000): Asset specification (ticker, name, precision)
- `GS_TERMS` (0x3001): Contract terms and media attachments
- `GS_ISSUED_SUPPLY` (0x3002): Total issued supply

**Owned State Types:**
- `OS_ASSET` (0x1000): Fungible asset amounts (64-bit unsigned)

**Transitions:**
- `TS_TRANSFER`: Transfer assets between owners

### Schema Code

The NIA schema uses AluVM scripts for validation:

```rust
// Genesis validation ensures issued supply matches pedersen commitments
pub(crate) fn nia_lib() -> Lib {
    let code = rgbasm! {
        // Transfer validation
        put     a8[0],ERRNO_NON_EQUAL_IN_OUT;
        pcvs    OS_ASSET;  // Verify sum of inputs = sum of outputs
        test;
        ret;

        // Genesis validation
        put     a8[0],ERRNO_ISSUED_MISMATCH;
        ldg     GS_ISSUED_SUPPLY,a8[1],s16[0];
        extr    s16[0],a64[0],a16[0];
        pcas    OS_ASSET;  // Verify commitments match issued supply
        test;
        ret;
    };
    Lib::assemble(&code).expect("invalid NIA script")
}
```

### Interface Implementation

The RGB20 interface maps schema states to standardized names:

```rust
fn nia_rgb20() -> IfaceImpl {
    IfaceImpl {
        version: VerNo::V1,
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

## Complete Token Creation Example

### Using NonInflatableAsset

Here's a complete example creating an RGB20 token:

```rust
use amplify::hex::FromHex;
use bp::dbc::Method;
use bp::{Outpoint, Txid};
use ifaces::Rgb20;
use rgbstd::containers::{ConsignmentExt, FileContent};
use rgbstd::interface::{FilterIncludeAll, FungibleAllocation};
use rgbstd::invoice::Precision;
use rgbstd::persistence::Stock;
use schemata::NonInflatableAsset;

fn main() {
    // 1. Define beneficiary UTXO (where tokens will be issued)
    let beneficiary_txid =
        Txid::from_hex("14295d5bb1a191cdb6286dc0944df938421e3dfcbf0811353ccac4100c2068c5")
            .unwrap();
    let beneficiary = Outpoint::new(beneficiary_txid, 1);

    // 2. Create token contract using testnet helper
    let contract = NonInflatableAsset::testnet(
        "ssi:anonymous",           // Issuer identity
        "TEST",                    // Ticker (max 8 chars)
        "Test Asset",              // Name
        None,                      // Optional details
        Precision::CentiMicro,     // 8 decimal places (like Bitcoin)
        [(
            Method::TapretFirst,   // Commitment method
            beneficiary,           // Receiving UTXO
            1_000_000_000_00u64    // Amount: 1 billion with 8 decimals
        )]
    ).expect("invalid contract data");

    let contract_id = contract.contract_id();
    println!("Contract ID: {}", contract_id);

    // 3. Save contract to file
    contract.save_file("rgb20-token.rgb")
        .expect("unable to save contract");
    contract.save_armored("rgb20-token.rgba")
        .expect("unable to save armored contract");

    // 4. Import into stock for state management
    let mut stock = Stock::in_memory();
    stock.import_contract(contract, NoResolver).unwrap();

    // 5. Read contract state through RGB20 interface
    let contract = stock.contract_iface_class::<Rgb20>(contract_id).unwrap();

    println!("\nToken Specification:");
    println!("{}", serde_json::to_string(&contract.spec()).unwrap());

    println!("\nAllocations:");
    let allocations = contract.allocations(&FilterIncludeAll);
    for FungibleAllocation { seal, state, witness, .. } in allocations {
        let witness_id = witness
            .as_ref()
            .map(|w| w.to_string())
            .unwrap_or("~".to_owned());
        println!("  amount={}, owner={}, witness={}", state, seal, witness_id);
    }

    println!("\nTotal Supply: {}", contract.total_supply());
}
```

### Using ContractBuilder (Advanced)

For more control over contract creation:

```rust
use rgbstd::containers::Kit;
use rgbstd::persistence::Stock;
use rgbstd::stl::{AssetSpec, ContractTerms, RicardianContract};
use rgbstd::{Amount, Allocation, GenesisSeal, XChain};
use bp::seals::txout::CloseMethod;
use bp::Txid;
use std::str::FromStr;

fn create_token_advanced() -> Result<ValidContract, Box<dyn std::error::Error>> {
    // 1. Define token specification
    let spec = AssetSpec {
        ticker: Ticker::from("MYTKN"),
        name: Name::from("My Token"),
        details: Some(Details::from("A demonstration token")),
        precision: Precision::try_from(8)?,  // 8 decimals
    };

    // 2. Define contract terms
    let terms = ContractTerms {
        text: RicardianContract::default(),
        media: None,  // Optional: attach contract documents
    };

    // 3. Define issued supply
    let issued_supply = Amount::from(21_000_000_00000000u64);  // 21M tokens

    // 4. Create genesis seal (blinded UTXO)
    let genesis_txid = Txid::from_str(
        "8d54c98d4c29a1ec4fd90635f543f0f7a871a78eb6a6e706342f831d92e3ba19"
    )?;
    let seal = XChain::with(
        Layer1::Bitcoin,
        GenesisSeal::from(BlindSeal::with_blinding(
            CloseMethod::TapretFirst,  // Use taproot commitment
            genesis_txid,
            0,                          // Output index
            654321,                     // Blinding factor
        )),
    );

    // 5. Load schema kit
    let kit = Kit::load_file("NonInflatableAsset.rgb")?.validate()?;
    let mut stock = Stock::in_memory();
    stock.import_kit(kit)?;

    // 6. Build contract
    let contract = stock.contract_builder(
            "ssi:anonymous",
            NonInflatableAsset::schema().schema_id(),
            "RGB20",
        )?
        .add_global_state("spec", spec)?
        .add_global_state("terms", terms)?
        .add_global_state("issuedSupply", issued_supply)?
        .add_fungible_state(
            "assetOwner",
            seal,
            issued_supply.value(),
        )?
        .issue_contract()?;

    Ok(contract)
}
```

## Token Properties and Configuration

### Precision Settings

Precision determines decimal places (0-18):

```rust
// Common precision values
Precision::Indivisible      // 0 decimals (whole units only)
Precision::Deci             // 1 decimal
Precision::Centi            // 2 decimals (like USD cents)
Precision::Milli            // 3 decimals
Precision::Micro            // 6 decimals
Precision::CentiMicro       // 8 decimals (Bitcoin-like)
Precision::Nano             // 9 decimals
```

### Supply Configuration

Define initial token allocation:

```rust
// Single allocation to treasury
let allocations = vec![
    (Method::TapretFirst, treasury_utxo, 1_000_000_00000000u64)
];

// Multiple allocations
let allocations = vec![
    (Method::TapretFirst, treasury_utxo, 900_000_00000000u64),  // 90%
    (Method::TapretFirst, team_utxo,     100_000_00000000u64),  // 10%
];
```

### Commitment Methods

RGB supports different Bitcoin commitment methods:

- **TapretFirst**: Taproot commitment (recommended)
- **OpretFirst**: OP_RETURN commitment (legacy)

```rust
use bp::dbc::Method;

// Use taproot for better privacy and efficiency
let method = Method::TapretFirst;
```

## Working with Stock

### Importing and Querying Contracts

```rust
use rgbstd::persistence::Stock;
use ifaces::Rgb20;

// Create in-memory stock
let mut stock = Stock::in_memory();

// Import contract
stock.import_contract(contract, NoResolver)?;

// Query via interface
let rgb20 = stock.contract_iface_class::<Rgb20>(contract_id)?;

// Access token data
println!("Ticker: {}", rgb20.spec().ticker);
println!("Name: {}", rgb20.spec().name);
println!("Precision: {}", rgb20.spec().precision);
println!("Total Supply: {}", rgb20.total_supply());
```

### Persistent Stock

For production use with filesystem persistence:

```rust
use rgb_persist_fs::StockpileDir;

// Create file-backed stock
let data_dir = "/path/to/rgb/data";
let stock = Stock::load(StockpileDir::new(data_dir)?)?;
```

## Contract Verification

### Schema Validation

Verify interface implementation matches schema:

```rust
let iface = NonInflatableAsset::FEATURES.iface();
let schema = NonInflatableAsset::schema();
let iface_impl = NonInflatableAsset::issue_impl();

if let Err(errors) = iface_impl.check(&iface, &schema) {
    for error in errors {
        eprintln!("Validation error: {}", error);
    }
    panic!("Invalid interface implementation");
}
```

### Deterministic Contract IDs

For reproducible contract generation:

```rust
use chrono::DateTime;
use rgbstd::containers::BuilderSeal;
use rgbstd::BlindingFactor;

let created_at = 1713261744;  // Unix timestamp
let contract = builder
    .add_asset_tag("assetOwner", AssetTag::new_deterministic(
        "domain",
        AssignmentType::with(0),
        DateTime::from_timestamp(created_at, 0).unwrap(),
        123456,  // Salt
    ))?
    .add_fungible_state_det(
        "assetOwner",
        BuilderSeal::from(seal),
        issued_supply,
        BlindingFactor::from_str("a3401bcceb26...")?,  // Deterministic blinding
    )?
    .issue_contract_det(created_at)?;

// Contract ID is now deterministic and reproducible
assert_eq!(
    contract.contract_id().to_string(),
    "rgb:pOIzGFyQ-mA!yQq2-QH8vB5!-5fAplY!-x2lW!vz-JHDbYPg"
);
```

## Error Handling

### Common Errors

**Issued Mismatch Error:**
```rust
// Occurs when issued supply doesn't match allocation amounts
NamedVariant::with(ERRNO_ISSUED_MISMATCH, vname!("issuedMismatch"))
```

**Non-Equal Amounts Error:**
```rust
// Occurs in transfers when inputs != outputs
NamedVariant::with(ERRNO_NON_EQUAL_IN_OUT, vname!("nonEqualAmounts"))
```

### Validation Results

```rust
match stock.import_contract(contract, resolver) {
    Ok(_) => println!("Contract imported successfully"),
    Err(e) => eprintln!("Import failed: {}", e),
}
```

## Testing Your Token

### Regtest Testing

```bash
# Start Bitcoin regtest
bitcoind -regtest -daemon

# Generate test blocks
bitcoin-cli -regtest generatetoaddress 101 <address>

# Create RGB20 token
# (Run Rust program from above)
cargo run --example rgb20

# Verify contract file
ls -lh rgb20-token.rgb
```

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_creation() {
        let contract = NonInflatableAsset::testnet(
            "ssi:anonymous",
            "TEST",
            "Test Token",
            None,
            Precision::CentiMicro,
            [(Method::TapretFirst, test_outpoint(), 1000_00000000u64)]
        ).expect("token creation failed");

        assert_eq!(contract.contract_id().to_string().len() > 0, true);
    }

    #[test]
    fn test_stock_import() {
        let contract = create_test_token();
        let mut stock = Stock::in_memory();

        stock.import_contract(contract.clone(), NoResolver)
            .expect("import failed");

        let rgb20 = stock.contract_iface_class::<Rgb20>(contract.contract_id())
            .expect("interface query failed");

        assert_eq!(rgb20.spec().ticker.to_string(), "TEST");
    }
}
```

## Production Deployment

### Mainnet Checklist

- [ ] Test thoroughly on regtest/testnet
- [ ] Audit contract logic and validation scripts
- [ ] Verify deterministic contract ID generation
- [ ] Document token specifications
- [ ] Prepare distribution strategy
- [ ] Set up persistent stock storage
- [ ] Configure backup procedures
- [ ] Test consignment creation and validation

### Security Considerations

**Genesis Seal Security:**
- Use fresh UTXOs for genesis
- Ensure UTXO has sufficient confirmations
- Protect blinding factors (treat like private keys)

**Stock Management:**
- Use encrypted filesystem for stock data
- Regular backups of contract state
- Multi-signature for treasury operations

**Validation:**
- Always validate consignments before acceptance
- Verify contract ID matches expectations
- Check issued supply constraints

## Advanced Features

### Custom Asset Specifications

```rust
use rgbstd::stl::{AssetSpec, Ticker, Name, Details};

let spec = AssetSpec {
    ticker: Ticker::from("USDT"),
    name: Name::from("Tether USD"),
    details: Some(Details::from("Stablecoin pegged to USD")),
    precision: Precision::Centi,  // 2 decimals for USD
};
```

### Contract Terms and Media

```rust
use rgbstd::stl::{ContractTerms, RicardianContract, Attachment, MediaType};

let terms = ContractTerms {
    text: RicardianContract::from("Legal contract text..."),
    media: Some(Attachment {
        ty: MediaType::with("application/pdf"),
        digest: Bytes::from_byte_array(pdf_hash),
    }),
};
```

### Multiple Genesis Allocations

```rust
// Distribute tokens to multiple recipients at genesis
let allocations = vec![
    (Method::TapretFirst, founder1_utxo, 200_000_00000000u64),
    (Method::TapretFirst, founder2_utxo, 200_000_00000000u64),
    (Method::TapretFirst, treasury_utxo, 600_000_00000000u64),
];

let contract = NonInflatableAsset::testnet(
    "ssi:company",
    "COMP",
    "Company Token",
    Some("Equity token"),
    Precision::CentiMicro,
    allocations
)?;
```

## Troubleshooting

### Common Issues

**"Invalid contract data" error:**
- Check that issued supply matches sum of allocations
- Verify precision is within valid range (0-18)
- Ensure ticker is 1-8 characters

**"Unable to save contract" error:**
- Check file permissions
- Verify directory exists
- Ensure sufficient disk space

**"Import failed" error:**
- Validate contract before import
- Check resolver configuration
- Verify schema is loaded in stock

### Debug Output

```rust
// Print contract details
eprintln!("{}", contract);

// Print JSON-formatted spec
eprintln!("{}", serde_json::to_string_pretty(&contract.spec())?);

// Debug allocations
for allocation in contract.allocations(&FilterIncludeAll) {
    eprintln!("{:?}", allocation);
}
```

## Next Steps

- [Transferring Assets](./transferring-assets.md) - How to transfer RGB20 tokens
- [Wallet Integration](../development/wallet-integration.md) - Building RGB-enabled wallets
- [Rust SDK](../development/rust-sdk.md) - Complete SDK documentation

## Related Documentation

- [RGB20 Specification](../../technical-reference/interfaces.md#rgb20)
- [State Transitions](../contracts/state-transitions.md)
- [Client-Side Validation](../../core-concepts/client-side-validation.md)

---

**Example Code**: See `/tmp/rgb-repos/rgb-schemata/examples/rgb20.rs` for complete working examples.
