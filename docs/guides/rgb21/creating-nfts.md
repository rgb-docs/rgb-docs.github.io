---
sidebar_position: 1
title: Issuing NFTs (UDA)
description: Issue a non-fungible token as a Unique Digital Asset (UDA) contract in RGB v0.11 with rgb-lib or the Rust builder. One token per contract.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# Issuing NFTs (UDA)

:::info RGB v0.11 line (rgb-cmd 0.11.1)
NFTs are issued as UDA contracts in v0.11. v0.12 rc.3 ships no NFT issuer: `rgb-interfaces` 0.12 defines NFT data types, but no issuer uses them yet. See [Two RGB lines](/getting-started/two-rgbs).
:::

An RGB NFT is a contract of the **UDA** (Unique Digital Asset) schema. Line B used to call this "RGB21", a name it now treats as deprecated.

## One token per contract

A UDA contract holds **exactly one token**. In `rgb-schemas` 0.11.1 `src/uda.rs`, the `tokens` global and the genesis `assetOwner` assignment both occur `Once`, and the only transition is `transfer`. Nothing can be minted after genesis. A collection of 100 NFTs is 100 contracts. Group them in your application, for example with a shared ticker or name, or a details string.

| Global | Type | Content |
|---|---|---|
| `spec` | `AssetSpec` | Ticker, name, optional details, precision |
| `terms` | `ContractTerms` | Contract text and an optional attachment |
| `tokens` | `TokenData` | The token itself (see [Metadata and attachments](/guides/rgb21/metadata-attachments)) |
| `attachmentTypes` | `AttachmentType` | Optional. Names an attachment slot (`id: u8`, `name`: 1–20 ASCII characters) |

The owned state `assetOwner` is an `Allocation(TokenIndex, OwnedFraction)`. The UDA script checks two things in genesis and in every transfer (excerpt from `uda_lib()`):

```rust
// the owned allocation's token index must equal the token's index
put     a8[0],ERRNO_NON_EQUAL_IN_OUT;   // errno 0
extr    s16[0],a32[0],a16[0];
lds     OS_ASSET,a16[1],s16[1];
extr    s16[1],a32[1],a16[0];
eq.n    a32[0],a32[1];
test;
// the owned fraction must be exactly 1: no fractional NFTs
put     a8[0],ERRNO_NON_FRACTIONAL;     // errno 10
put     a16[2],4;
extr    s16[1],a64[0],a16[2];
put     a64[1],1;
eq.n    a64[0],a64[1];
test;
```

The script doesn't check `precision`. Wallets usually use 0.

## With rgb-lib

`issue_asset_uda` in `rgb-lib` 0.3.0-beta.7 (`src/wallet/singlesig.rs`). Wallet setup is as in [Issuing fungible tokens](/guides/rgb20/creating-tokens). This code wasn't run for this page.

```rust
let nft = wallet.issue_asset_uda(
    "DEMONFT".into(),                       // ticker, upper case
    "Demo NFT #1".into(),                   // name
    Some("First item of the demo set".into()), // details
    0,                                      // precision
    Some("art/1.png".into()),               // media file → TokenData.media
    vec!["art/1-hires.tiff".into()],        // up to 20 attachments → TokenData.attachments
)?;
println!("{}", nft.asset_id);
```

- rgb-lib reads each file, computes its SHA-256 digest, detects its media type, and copies it to `<wallet dir>/media_files/<digest>`. The contract stores only the media type and digest.
- More than 20 attachments fails (`MAX_ATTACHMENTS = 20`, `src/wallet/offline.rs`).
- The token index is always 0. rgb-lib doesn't set `preview`, `reserves` or `attachmentTypes`, and it puts empty terms in genesis.
- As with every issuance, a UTXO must be available to hold the allocation (`create_utxos`).
- The [RGB Lightning Node](/guides/lightning/overview) offers `POST /issueassetuda`. Upload files first with `POST /postassetmedia` and pass their digests.

`rgb issue` (rgb-cmd 0.11.1) can't issue a UDA, because it handles only fungible assignments. See the [CLI reference (v0.11)](/technical-reference/cli-v011#issue).

## With the Rust builder

To set the preview or other fields yourself, build genesis directly. This is the core of [`examples/uda.rs`](https://github.com/rgb-protocol/rgb-schemas/blob/0.11.1/examples/uda.rs) in `rgb-schemas` 0.11.1 (crate `rgb-ops`, library name `rgbstd`):

```rust
use rgbstd::stl::{AssetSpec, ContractTerms, EmbeddedMedia, MediaType, RicardianContract, TokenData};
use rgbstd::invoice::Precision;
use rgbstd::{Allocation, ChainNet, TokenIndex};
use schemata::UniqueDigitalAsset;

let index = TokenIndex::from_inner(0);
let token = TokenData {
    index,
    preview: Some(EmbeddedMedia { ty: MediaType::with("image/*"), data: thumbnail_blob }),
    media: Some(media_attachment), // Attachment { ty, digest }
    ..Default::default()
};

let contract = stock
    .contract_builder("ssi:anonymous", UniqueDigitalAsset::schema().schema_id(), ChainNet::BitcoinTestnet4)?
    .add_global_state("spec", AssetSpec::new("DEMONFT", "Demo NFT #1", Precision::Indivisible))?
    .add_global_state("terms", ContractTerms { text: RicardianContract::default(), media: None })?
    .add_global_state("tokens", token)?
    .add_data("assetOwner", genesis_seal, Allocation::with(index, 1))?
    .issue_contract()?;
```

`thumbnail_blob` is a `SmallBlob` (at most 65,535 bytes). `genesis_seal` and `stock` are set up as in the [fungible example](/guides/rgb20/creating-tokens).

:::danger Back up the contract and the media
A seed phrase doesn't recover RGB assets. Back up the RGB data directory, or use rgb-lib's `backup`. Keep the original media files too: the contract holds only their digests, and a file that is lost can't be recreated from the digest.
:::

## Next

- [Metadata and attachments](/guides/rgb21/metadata-attachments)
- [Transferring NFTs](/guides/rgb21/transferring-nfts)
