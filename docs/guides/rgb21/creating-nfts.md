---
sidebar_position: 1
title: Creating RGB21 NFTs
description: Learn how to create unique digital assets and NFT collections using the RGB21 schema
---

# Creating RGB21 NFTs

RGB21 is the standard interface for non-fungible tokens (NFTs) on RGB. This comprehensive guide covers creating individual NFTs and collections with rich metadata, attachments, and provable ownership using client-side validation.

## What is RGB21?

RGB21 defines an interface for unique, indivisible digital assets with associated metadata and optional file attachments. Unlike Ethereum NFTs, RGB21 NFTs leverage Bitcoin's security while maintaining complete privacy through client-side validation.

### Key Features

- **Unique Token IDs**: Each NFT has a unique `TokenIndex` identifier within the collection
- **Rich Metadata**: Flexible token data with embedded or referenced media
- **File Attachments**: Support for images, videos, audio, documents
- **Privacy**: Ownership and transfers are completely confidential
- **Indivisibility**: Each token represents exactly 1 non-fractional unit
- **Provenance**: Complete ownership history validated client-side
- **Bitcoin Security**: Anchored to Bitcoin blockchain via single-use-seals

### RGB21 vs Ethereum NFTs

| Feature | RGB21 | Ethereum ERC-721 |
|---------|-------|------------------|
| Validation | Client-side | On-chain |
| Privacy | Fully private | Fully public |
| Storage | Embedded or referenced | External (IPFS) |
| Transfer costs | Bitcoin tx fee only | Gas + computation |
| State bloat | None | All nodes store all data |
| Scalability | Unlimited | Limited by block gas |
| Metadata updates | Configurable | Contract-dependent |

## RGB21 Interface Specification

### Core Interface

The RGB21 interface defines the following methods:

```rust
pub trait Rgb21 {
    // Asset identification
    fn spec(&self) -> AssetSpec;
    fn terms(&self) -> ContractTerms;

    // Token data
    fn token_data(&self) -> TokenData;
    fn token_index(&self) -> TokenIndex;

    // Ownership
    fn allocations(&self) -> impl Iterator<Item = Allocation>;

    // Media
    fn preview(&self) -> Option<EmbeddedMedia>;
    fn attachments(&self) -> impl Iterator<Item = Attachment>;
}
```

### Schema: UniqueDigitalAsset (UDA)

The reference implementation of RGB21 is the **UniqueDigitalAsset** schema:

```rust
use schemata::UniqueDigitalAsset;
use ifaces::Rgb21;

pub struct UniqueDigitalAsset;

impl IssuerWrapper for UniqueDigitalAsset {
    type IssuingIface = Rgb21;
    const FEATURES: Rgb21 = Rgb21::NONE;

    fn schema() -> Schema {
        Schema {
            name: tn!("UniqueDigitalAsset"),
            global_types: tiny_bmap! {
                GS_NOMINAL => GlobalStateSchema::once("RGBContract.AssetSpec"),
                GS_TERMS => GlobalStateSchema::once("RGBContract.ContractTerms"),
                GS_TOKENS => GlobalStateSchema::once("RGB21.TokenData"),
                GS_ATTACH => GlobalStateSchema::once("RGB21.AttachmentType"),
            },
            owned_types: tiny_bmap! {
                OS_ASSET => OwnedStateSchema::Structured("RGBContract.Allocation"),
            },
            transitions: tiny_bmap! {
                TS_TRANSFER => TransitionSchema { /* ... */ }
            },
            // Validation scripts ensure:
            // 1. Token index matches between state transitions
            // 2. Owned fraction == 1 (non-fractional)
        }
    }
}
```

### Global State Types

RGB21 contracts store the following global state:

#### 1. AssetSpec (GS_NOMINAL)

Collection-level metadata:

```rust
pub struct AssetSpec {
    pub ticker: Ticker,        // Short identifier (e.g., "PEPE")
    pub name: Name,            // Full name (e.g., "Rare Pepes")
    pub precision: Precision,  // Must be Precision::Indivisible for NFTs
}

// Example
let spec = AssetSpec::new(
    "UNIQ",
    "Unique Digital Art",
    Precision::Indivisible
);
```

#### 2. ContractTerms (GS_TERMS)

Legal terms and collection documentation:

```rust
pub struct ContractTerms {
    pub text: RicardianContract,  // Human & machine-readable terms
    pub media: Option<Attachment>, // Referenced documentation
}

// Example
let terms = ContractTerms {
    text: RicardianContract::from_str(
        "This NFT grants ownership rights to the digital artwork..."
    )?,
    media: Some(Attachment {
        ty: MediaType::with("application/pdf"),
        digest: Bytes::from_byte_array(terms_pdf_hash),
    }),
};
```

#### 3. TokenData (GS_TOKENS)

Individual NFT data:

```rust
pub struct TokenData {
    pub index: TokenIndex,      // Unique token ID (u32)
    pub preview: Option<EmbeddedMedia>,  // Small embedded preview
    pub media: Option<Attachment>,       // Main media (referenced)
    pub attachments: Confined<BTreeMap<u8, Attachment>>,  // Additional files
    pub reserves: Option<ProofOfReserves>,
}

// Example
let token_data = TokenData {
    index: TokenIndex::from_inner(1),
    preview: Some(EmbeddedMedia {
        ty: MediaType::with("image/png"),
        data: SmallBlob::try_from_iter(thumbnail_bytes)?,
    }),
    media: Some(Attachment {
        ty: MediaType::with("image/jpeg"),
        digest: Bytes::from_byte_array(sha256_hash),
    }),
    attachments: none!(),
    reserves: None,
};
```

#### 4. AttachmentType (GS_ATTACH)

Optional: Specify allowed attachment types:

```rust
pub enum AttachmentType {
    Image,      // Image files
    Video,      // Video files
    Audio,      // Audio files
    Document,   // PDF, text, etc.
}
```

### Owned State Types

#### Allocation (OS_ASSET)

Ownership assignment:

```rust
pub struct Allocation {
    pub index: TokenIndex,  // Which token
    pub value: u64,         // Must be 1 for NFTs (non-fractional)
}

// Example
let allocation = Allocation::with(
    TokenIndex::from_inner(1),
    1  // Always 1 for NFTs
);
```

## Creating a Single NFT

### Complete Example

Here's a full example creating a single NFT with embedded preview and referenced media:

```rust
use std::fs;
use sha2::{Digest, Sha256};
use amplify::{Bytes, Wrapper};
use amplify::confinement::SmallBlob;
use bp::Txid;
use ifaces::rgb21::{EmbeddedMedia, TokenData};
use ifaces::{IssuerWrapper, Rgb21};
use rgbstd::containers::{FileContent, Kit};
use rgbstd::persistence::Stock;
use rgbstd::stl::{AssetSpec, Attachment, ContractTerms, MediaType, RicardianContract};
use rgbstd::{Allocation, GenesisSeal, TokenIndex, XChain};
use rgbstd::invoice::Precision;
use schemata::UniqueDigitalAsset;

fn create_nft() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Define collection metadata
    let spec = AssetSpec::new(
        "UNIQ",
        "Unique Digital Art",
        Precision::Indivisible
    );

    // 2. Set contract terms
    let terms_text = r#"
    DIGITAL ARTWORK LICENSE AGREEMENT

    This NFT represents ownership of a unique digital artwork.
    The holder is granted:
    - Full ownership rights to this specific digital token
    - Right to display the artwork non-commercially
    - Right to resell or transfer the token

    Copyright remains with the original artist.
    "#;

    let terms = ContractTerms {
        text: RicardianContract::from_str(terms_text)?,
        media: None,
    };

    // 3. Prepare media files
    let full_image = fs::read("artwork_4k.jpg")?;
    let thumbnail = fs::read("artwork_thumb.jpg")?;

    // Hash the full-resolution image
    let mut hasher = Sha256::new();
    hasher.update(&full_image);
    let image_hash = hasher.finalize();

    // 4. Create token data
    let token_data = TokenData {
        index: TokenIndex::from_inner(1),

        // Embed small thumbnail (< 64KB)
        preview: Some(EmbeddedMedia {
            ty: MediaType::with("image/jpeg"),
            data: SmallBlob::try_from_iter(thumbnail)?,
        }),

        // Reference full image via hash
        media: Some(Attachment {
            ty: MediaType::with("image/jpeg"),
            digest: Bytes::from_byte_array(image_hash),
        }),

        attachments: none!(),
        reserves: None,
    };

    // 5. Define beneficiary (initial owner)
    let beneficiary_txid = Txid::from_hex(
        "14295d5bb1a191cdb6286dc0944df938421e3dfcbf0811353ccac4100c2068c5"
    )?;
    let beneficiary = XChain::Bitcoin(
        GenesisSeal::tapret_first_rand(beneficiary_txid, 1)
    );

    // 6. Create allocation (always 1 for NFTs)
    let allocation = Allocation::with(TokenIndex::from_inner(1), 1);

    // 7. Initialize stock (in-memory contract storage)
    let kit = Kit::load_file("schemata/UniqueDigitalAsset.rgb")?
        .validate()?;
    let mut stock = Stock::in_memory();
    stock.import_kit(kit)?;

    // 8. Build and issue contract
    let contract = stock.contract_builder(
            "ssi:anonymous",  // Issuer identity
            UniqueDigitalAsset::schema().schema_id(),
            "RGB21",
        )?
        .add_global_state("spec", spec)?
        .add_global_state("terms", terms)?
        .add_global_state("tokens", token_data)?
        .add_data("assetOwner", beneficiary, allocation)?
        .issue_contract()?;

    let contract_id = contract.contract_id();
    println!("NFT Contract Created: {}", contract_id);

    // 9. Save contract
    contract.save_file("my-nft.rgb")?;
    contract.save_armored("my-nft.rgba")?;

    // 10. Import into stock
    stock.import_contract(contract, NoResolver)?;

    // 11. Query via RGB21 interface
    let rgb21 = stock.contract_iface_class::<Rgb21>(contract_id)?;
    println!("NFT Spec: {:?}", rgb21.spec());
    println!("Token Index: {:?}", rgb21.token_data().index);

    Ok(())
}
```

### Breakdown: Key Steps

#### Step 1-2: Collection Metadata

Every NFT belongs to a collection (even if it's a collection of one). The `AssetSpec` and `ContractTerms` define collection-level properties:

- **Ticker**: Short identifier (3-8 chars typically)
- **Name**: Full collection name
- **Precision**: Must be `Indivisible` for NFTs
- **Terms**: Legal/usage terms for the collection

#### Step 3-4: Media Handling

RGB21 supports two media storage strategies:

**Embedded** (preview):
- Stored directly in contract state
- Limited to 64KB (SmallBlob)
- Always available with contract
- Best for thumbnails, icons

**Referenced** (media):
- Stored externally (IPFS, Arweave, etc.)
- Only content hash stored on-chain
- Unlimited size
- Best for full-resolution files

#### Step 5-6: Ownership Assignment

The beneficiary is defined by:
- **Seal**: A Bitcoin UTXO (blinded for privacy)
- **Allocation**: Token index + amount (always 1)

Seal types:
- `tapret_first_rand`: TapRet protocol, first output
- `opret_first_rand`: OpRet protocol, first output

#### Step 7-10: Contract Issuance

The contract builder pattern:
1. Initialize stock (contract database)
2. Import schema kit
3. Build contract with builder pattern
4. Issue (validates against schema)
5. Save to disk
6. Import into stock for querying

## NFT Collections

While the above creates a single NFT, you can create collections with multiple NFTs minted over time.

### Collection Setup

```rust
fn create_nft_collection() -> Result<(), Box<dyn std::error::Error>> {
    // Collection-level specification
    let spec = AssetSpec::new(
        "PEPE",
        "Rare Pepes Collection",
        Precision::Indivisible
    );

    let terms = ContractTerms {
        text: RicardianContract::from_str(r#"
        RARE PEPES NFT COLLECTION

        Max Supply: 10,000 unique pepe artworks
        Royalties: 5% on secondary sales
        License: CC BY-NC 4.0

        Each NFT represents ownership of a unique rare pepe.
        "#)?,
        media: None,
    };

    // Genesis creates first NFT (#1)
    let first_token = TokenData {
        index: TokenIndex::from_inner(1),
        preview: Some(load_preview("pepe_001_thumb.jpg")?),
        media: Some(reference_image("pepe_001.jpg")?),
        attachments: none!(),
        reserves: None,
    };

    // Issue genesis with first token
    let contract = stock.contract_builder(
            "ssi:artist",
            UniqueDigitalAsset::schema().schema_id(),
            "RGB21",
        )?
        .add_global_state("spec", spec)?
        .add_global_state("terms", terms)?
        .add_global_state("tokens", first_token)?
        .add_data("assetOwner", beneficiary_1, Allocation::with(1, 1))?
        .issue_contract()?;

    Ok(())
}
```

### Sequential Minting

The current UDA schema mints all tokens at genesis. For sequential minting, you would need a custom schema with inflation rights. Here's the conceptual approach:

```rust
// Note: Requires custom schema with inflation
// UDA schema doesn't support post-genesis minting
fn mint_next_nft(
    stock: &mut Stock,
    contract_id: ContractId,
    next_token_id: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    // This would require a schema with:
    // - Inflation transition type
    // - Minting rights (e.g., only issuer can mint)
    // - Max supply enforcement

    // Conceptual (not supported by current UDA):
    let mint = stock.transition_builder(
            contract_id,
            "mint",  // Inflation operation
        )?
        .add_global_state("tokens", TokenData {
            index: TokenIndex::from_inner(next_token_id),
            // ... token data
        })?
        .add_data("assetOwner", beneficiary, Allocation::with(next_token_id, 1))?
        .complete_transition()?;

    Ok(())
}
```

**Important**: The standard UniqueDigitalAsset schema creates all tokens at genesis. For post-genesis minting, you need a custom schema (similar to RGB20 with inflation).

## Metadata Standards

### Standard Metadata Fields

Follow these conventions for interoperability:

```rust
pub struct NftMetadata {
    // Required
    pub name: String,              // "Rare Pepe #1"
    pub description: String,       // Detailed description

    // Media
    pub image: String,             // Primary image URI or hash
    pub animation_url: Option<String>,  // Video/animation
    pub external_url: Option<String>,   // Website

    // Attributes (for filtering/display)
    pub attributes: Vec<Attribute>,

    // Creator info
    pub creator: Option<String>,
    pub license: Option<String>,
}

pub struct Attribute {
    pub trait_type: String,
    pub value: AttributeValue,
    pub display_type: Option<DisplayType>,
}

pub enum AttributeValue {
    String(String),
    Number(i64),
    Boolean(bool),
}

pub enum DisplayType {
    Number,
    BoostPercentage,
    BoostNumber,
    Date,
    Ranking,
}
```

### Example: Rich Metadata

```rust
let token_data = TokenData {
    index: TokenIndex::from_inner(42),

    preview: Some(EmbeddedMedia {
        ty: MediaType::with("image/png"),
        data: SmallBlob::try_from_iter(thumbnail)?,
    }),

    media: Some(Attachment {
        ty: MediaType::with("image/png"),
        digest: image_hash,
    }),

    // Store additional metadata as attachments
    attachments: confined_bmap! {
        0 => Attachment {
            ty: MediaType::with("application/json"),
            digest: metadata_json_hash,
        },
        1 => Attachment {
            ty: MediaType::with("model/gltf-binary"),
            digest: model_3d_hash,
        },
    },

    reserves: None,
};
```

Where `metadata.json` might look like:

```json
{
  "name": "CyberPepe #42",
  "description": "A rare cyberpunk pepe from the digital wasteland",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Neon City"
    },
    {
      "trait_type": "Rarity",
      "value": "Legendary",
      "display_type": "ranking"
    },
    {
      "trait_type": "Power Level",
      "value": 9001,
      "display_type": "number"
    }
  ],
  "creator": "Artist Name",
  "license": "CC BY-NC 4.0",
  "external_url": "https://rarepepes.example/42"
}
```

## IPFS Integration

### Uploading to IPFS

```rust
use ipfs_api_backend_hyper::{IpfsApi, IpfsClient, TryFromUri};

async fn upload_to_ipfs(file_path: &str) -> Result<String, Box<dyn std::error::Error>> {
    let client = IpfsClient::from_str("http://localhost:5001")?;

    // Upload file
    let file = std::fs::File::open(file_path)?;
    let response = client.add(file).await?;

    let cid = response.hash;
    println!("Uploaded to IPFS: {}", cid);

    // Pin to ensure persistence
    client.pin_add(&cid, false).await?;
    println!("Pinned: {}", cid);

    Ok(cid)
}

// Use in NFT creation
async fn create_nft_with_ipfs() -> Result<(), Box<dyn std::error::Error>> {
    // Upload artwork
    let image_cid = upload_to_ipfs("artwork.jpg").await?;
    let image_url = format!("ipfs://{}", image_cid);

    // Upload metadata
    let metadata = serde_json::json!({
        "name": "My NFT",
        "image": image_url,
        "description": "..."
    });

    std::fs::write("metadata.json", serde_json::to_string(&metadata)?)?;
    let metadata_cid = upload_to_ipfs("metadata.json").await?;

    // Download to verify and hash
    let image_bytes = client.cat(&image_cid).await?;
    let image_hash = sha256(&image_bytes);

    // Create NFT with IPFS reference
    let token_data = TokenData {
        index: TokenIndex::from_inner(1),
        preview: Some(load_thumbnail()?),
        media: Some(Attachment {
            ty: MediaType::with("image/jpeg"),
            digest: Bytes::from_byte_array(image_hash),
        }),
        // Store metadata CID in attachments
        attachments: confined_bmap! {
            0 => Attachment {
                ty: MediaType::with("application/json"),
                digest: Bytes::from_byte_array(sha256(&metadata_bytes)),
            }
        },
        reserves: None,
    };

    // ... continue with contract creation

    Ok(())
}
```

### IPFS Pinning Services

For production, use pinning services to ensure availability:

```rust
// Pinata
async fn pin_to_pinata(file_path: &str, api_key: &str) -> Result<String, Error> {
    let client = reqwest::Client::new();
    let form = reqwest::multipart::Form::new()
        .file("file", file_path)?;

    let response = client
        .post("https://api.pinata.cloud/pinning/pinFileToIPFS")
        .header("pinata_api_key", api_key)
        .multipart(form)
        .send()
        .await?;

    let result: serde_json::Value = response.json().await?;
    Ok(result["IpfsHash"].as_str().unwrap().to_string())
}

// Web3.Storage
async fn pin_to_web3storage(file_path: &str, token: &str) -> Result<String, Error> {
    let client = reqwest::Client::new();
    let file_bytes = std::fs::read(file_path)?;

    let response = client
        .post("https://api.web3.storage/upload")
        .header("Authorization", format!("Bearer {}", token))
        .body(file_bytes)
        .send()
        .await?;

    let result: serde_json::Value = response.json().await?;
    Ok(result["cid"].as_str().unwrap().to_string())
}
```

## Provenance and Authenticity

### Cryptographic Proof

RGB21 NFTs include built-in provenance:

```rust
// The contract itself proves authenticity
let contract = stock.contract_iface_class::<Rgb21>(contract_id)?;

// Genesis data is immutable
let spec = contract.spec();
let terms = contract.terms();
let token = contract.token_data();

println!("Original Issuance:");
println!("  Contract ID: {}", contract_id);
println!("  Token Index: {}", token.index);
println!("  Media Hash: {:?}", token.media.map(|a| a.digest));
```

### Verifying Authenticity

```rust
fn verify_nft_authenticity(
    contract_id: ContractId,
    expected_issuer: &str,
    expected_media_hash: &[u8; 32],
) -> Result<bool, Error> {
    let stock = Stock::load("~/.rgb/stock")?;
    let contract = stock.contract_iface_class::<Rgb21>(contract_id)?;

    // Verify issuer
    let issuer = contract.issuer();
    if issuer != expected_issuer {
        return Ok(false);
    }

    // Verify media hash
    let token = contract.token_data();
    if let Some(media) = token.media {
        if media.digest.as_slice() != expected_media_hash {
            return Ok(false);
        }
    } else {
        return Ok(false);
    }

    Ok(true)
}
```

### Schema Validation

The UDA schema enforces non-fractionality via AluVM validation:

```rust
// From uda.rs validation script:

// SUBROUTINE 1: Genesis validation
put     a16[0],0x00;
put     a8[1],0x00;
ldg     GS_TOKENS,a8[1],s16[0];   // Load token data

// SUBROUTINE 3: Shared validation
put     a8[0],ERRNO_NON_EQUAL_IN_OUT;
extr    s16[0],a32[0],a16[0];     // Extract token index
lds     OS_ASSET,a16[1],s16[1];   // Load owned state
extr    s16[1],a32[1],a16[0];     // Extract owned index
eq.n    a32[0],a32[1];            // Token indexes must match
test;                             // Fail if not equal

put     a8[0],ERRNO_NON_FRACTIONAL;
put     a16[2],4;
extr    s16[1],a64[0],a16[2];     // Extract owned amount
put     a64[1],1;
eq.n    a64[0],a64[1];            // Must equal exactly 1
test;                             // Fail if not 1
```

This ensures:
1. Token index in state matches token index in allocation
2. Owned amount is exactly 1 (non-fractional)

## Royalties and Secondary Sales

The basic UDA schema doesn't enforce royalties, but you can implement them at the marketplace level:

### Marketplace Integration

```rust
pub struct NftListing {
    pub contract_id: ContractId,
    pub token_id: u32,
    pub seller: PublicKey,
    pub price: Amount,
    pub royalty_recipient: Option<PublicKey>,
    pub royalty_bps: u16,  // Basis points (500 = 5%)
}

impl NftListing {
    pub fn calculate_royalty(&self) -> Amount {
        (self.price * self.royalty_bps as u64) / 10000
    }

    pub fn process_sale(
        &self,
        buyer: PublicKey,
    ) -> Result<(Transfer, Payment), Error> {
        let royalty = self.calculate_royalty();
        let seller_amount = self.price - royalty;

        // NFT transfer to buyer
        let nft_transfer = create_nft_transfer(
            self.contract_id,
            self.token_id,
            buyer,
        )?;

        // Payment split
        let payment = Payment {
            seller: (self.seller, seller_amount),
            royalty: self.royalty_recipient.map(|r| (r, royalty)),
        };

        Ok((nft_transfer, payment))
    }
}
```

### Schema-Level Royalties

For enforced royalties, you'd need a custom schema:

```rust
// Conceptual - requires custom schema
pub struct RoyaltyEnforcedNft {
    global_types: tiny_bmap! {
        GS_ROYALTY => GlobalStateSchema::once("RoyaltyInfo"),
        // ... other states
    },
    transitions: tiny_bmap! {
        TS_TRANSFER => TransitionSchema {
            // Validator checks:
            // 1. RGB20 payment to royalty recipient
            // 2. Payment amount >= sale_price * royalty_bps
            validator: Some(LibSite::with(FN_TRANSFER_ROYALTY, alu_id)),
        }
    },
}
```

## Best Practices

### 1. Metadata Design

**DO:**
- Use standard field names (name, description, image, attributes)
- Embed small thumbnails (less than 64KB) for quick preview
- Reference large files via content hash
- Include license information
- Provide creator attribution

**DON'T:**
- Embed large files (bloats consignments)
- Use proprietary metadata formats
- Omit critical information (name, image)
- Change metadata after issuance (unless schema allows)

### 2. Media Storage

**DO:**
- Use IPFS or Arweave for decentralization
- Pin to multiple providers for redundancy
- Verify content hashes after upload
- Compress images appropriately
- Provide multiple resolutions

**DON'T:**
- Use centralized hosting alone
- Skip hash verification
- Use overly large file sizes
- Forget to pin IPFS content

### 3. Collection Planning

**DO:**
- Define max supply upfront
- Set clear terms and conditions
- Use meaningful token IDs
- Document attribute rarities
- Plan for future utility

**DON'T:**
- Leave supply unlimited
- Change collection parameters post-launch
- Use arbitrary/random token IDs without system
- Overpromise utility

### 4. Privacy Considerations

**DO:**
- Use blinded seals for ownership privacy
- Consider metadata privacy implications
- Limit identifying information in public metadata
- Use pseudonymous identities when appropriate

**DON'T:**
- Include personal information in metadata
- Link to real-world identities unnecessarily
- Expose ownership patterns publicly

## Testing NFTs on Testnet

### Testnet Setup

```rust
use bp::Network;

fn create_testnet_nft() -> Result<(), Error> {
    // Use testnet Bitcoin UTXOs
    let testnet_txid = Txid::from_hex("...")?;
    let beneficiary = XChain::Bitcoin(
        GenesisSeal::tapret_first_rand(testnet_txid, 1)
    );

    // Create contract with testnet seal
    let contract = stock.contract_builder(
            "ssi:test",
            UniqueDigitalAsset::schema().schema_id(),
            "RGB21",
        )?
        // ... add states
        .add_data("assetOwner", beneficiary, allocation)?
        .issue_contract()?;

    // Test transfer
    test_nft_transfer(contract.contract_id())?;

    Ok(())
}
```

### Validation Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nft_creation() {
        let mut stock = Stock::in_memory();
        let kit = Kit::load_file("UniqueDigitalAsset.rgb").unwrap();
        stock.import_kit(kit).unwrap();

        let spec = AssetSpec::new("TEST", "Test NFT", Precision::Indivisible);
        let token = TokenData {
            index: TokenIndex::from_inner(1),
            preview: None,
            media: None,
            attachments: none!(),
            reserves: None,
        };

        let contract = stock.contract_builder("ssi:test", schema_id, "RGB21")
            .unwrap()
            .add_global_state("spec", spec).unwrap()
            .add_global_state("tokens", token).unwrap()
            .add_data("assetOwner", beneficiary, Allocation::with(1, 1)).unwrap()
            .issue_contract().unwrap();

        assert_eq!(contract.contract_id().to_string().len(), 64);
    }
}
```

## Troubleshooting

### Common Issues

#### "Invalid precision for NFT"

```
Error: Precision must be Indivisible for RGB21 tokens
```

**Solution**: Use `Precision::Indivisible`:

```rust
let spec = AssetSpec::new("NFT", "My NFT", Precision::Indivisible);
```

#### "Owned amount must be 1"

```
Error: nonFractionalToken - owned amount is not 1
```

**Solution**: Always allocate exactly 1:

```rust
let allocation = Allocation::with(token_index, 1);  // Not 0, not 2, only 1
```

#### "Embedded media too large"

```
Error: SmallBlob size limit exceeded (max 65535 bytes)
```

**Solution**: Use referenced attachments for large files:

```rust
// Instead of:
preview: Some(EmbeddedMedia { data: large_file, ... })

// Use:
media: Some(Attachment { digest: hash_of_large_file, ... })
```

#### "Token index mismatch"

```
Error: unknownToken - token index in state doesn't match allocation
```

**Solution**: Ensure token_data.index matches allocation.index:

```rust
let index = TokenIndex::from_inner(1);
let token_data = TokenData { index, ... };
let allocation = Allocation::with(index, 1);  // Same index!
```

## Related Documentation

- [Metadata and Attachments](./metadata-attachments.md) - Deep dive into NFT metadata
- [Transferring NFTs](./transferring-nfts.md) - Transfer workflow and provenance
- [RGB21 Interface](../../technical-reference/interfaces.md#rgb21) - Technical specification
- [Consignments](../../technical-reference/consignments.md) - Understanding consignment structure
- [Client-Side Validation](../../core-concepts/client-side-validation.md) - How RGB validates
- [Single-Use-Seals](../../core-concepts/single-use-seals.md) - Ownership model

## Next Steps

1. **Create your first NFT**: Follow the complete example above
2. **Test transfers**: See [Transferring NFTs](./transferring-nfts.md)
3. **Add rich metadata**: See [Metadata and Attachments](./metadata-attachments.md)
4. **Integrate IPFS**: Upload and pin your media files
5. **Build a marketplace**: Implement listing and trading
