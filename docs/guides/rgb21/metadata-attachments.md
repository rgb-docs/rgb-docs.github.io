---
sidebar_position: 2
title: Metadata and attachments
description: What an RGB v0.11 UDA token can carry (TokenData, embedded preview, referenced media, attachments), the real size limits, and how rgb-lib moves media files.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# Metadata and attachments

:::info RGB v0.11 line (rgb-cmd 0.11.1)
This page describes UDA token data in v0.11. In v0.12, `rgb-interfaces` 0.12 has an `NftSpec` type with one optional external attachment, but rc.3 ships no NFT issuer that uses it. See [Two RGB lines](/getting-started/two-rgbs).
:::

A UDA token's data sits in the contract's `tokens` global, so it is part of genesis. Genesis is client-side data: it travels in every consignment of the contract, and none of it is written to the blockchain.

## TokenData

From `rgb-ops` 0.11.1 `src/stl/specs.rs`:

```rust
pub struct TokenData {
    pub index: TokenIndex,
    pub ticker: Option<Ticker>,
    pub name: Option<Name>,
    pub details: Option<Details>,
    pub preview: Option<EmbeddedMedia>,
    pub media: Option<Attachment>,
    pub attachments: Confined<BTreeMap<u8, Attachment>, 0, 20>,
    pub reserves: Option<ProofOfReserves>,
}

pub struct EmbeddedMedia { pub ty: MediaType, pub data: SmallBlob }
pub struct Attachment { pub ty: MediaType, pub digest: Bytes32 }
pub struct ProofOfReserves { pub utxo: Outpoint, pub proof: SmallBlob }
```

| Field | Limit (source: `specs.rs`) |
|---|---|
| `ticker` | 1–8 characters, starting with a letter |
| `name` | 1–40 printable ASCII characters |
| `details` | 1–255 bytes |
| `preview.data` | At most 65,535 bytes (`SmallBlob`) |
| `attachments` | At most **20**, keyed by a `u8` |
| `AttachmentType.name` (`attachmentTypes` global) | 1–20 ASCII characters |
| Contract `terms.text` | At most 65,535 characters (`SmallString`) |

`MediaType` is a MIME type, such as `image/png`, or a wildcard such as `image/*` as in the rgb-schemas example.

## Embed or reference

There are two ways to tie a file to a token:

- **Embed (`preview`).** The bytes are inside genesis. Every holder receives them in the consignment, and nothing else is needed to show them. The cost is size: the preview is copied into every future consignment of the contract, so keep it to a small thumbnail. The hard limit is 64 KiB.
- **Reference (`media`, `attachments`).** Genesis holds only the media type and a 32-byte digest. The file can be any size and lives somewhere else. Anyone who has the file can check it against the digest, but the contract doesn't say where to find the file, and a file that is lost can't be recovered.

The digest is just 32 bytes, and the protocol doesn't name a hash function. rgb-lib and the rgb-schemas example both use **SHA-256** of the file contents, so use it too if you want other wallets to verify your files.

Display metadata that isn't in `TokenData`, such as traits, rarity or collection info, is an application convention. Put it in a referenced JSON file and attach it by digest. RGB doesn't define a format for it.

## How rgb-lib moves media

In `rgb-lib` 0.3.0-beta.7:

1. **Issuing:** `issue_asset_uda` copies the media file and each attachment to `media_files/<sha256 hex>` in the wallet directory, detects the media type from the file contents, and writes `Attachment { ty, digest }` into the token.
2. **Sending:** `send` posts each media file to the [RGB proxy](https://github.com/RGB-Tools/rgb-proxy-server) with `media.post`, next to the consignment (`src/wallet/online.rs`).
3. **Receiving:** `refresh` fetches any missing file with `media.get`, hashes it, and fails the transfer if the hash doesn't match the digest in the contract.
4. **Out of band:** `provide_out_of_band_consignment` takes the media file paths as an argument and matches them by hash.

The [RGB Lightning Node](/guides/lightning/overview) has `POST /postassetmedia` (upload, returns the digest) and `POST /getassetmedia` (fetch by digest).

If you store files elsewhere, for example on your own server or a content-addressed network, publish only the media itself. **Never publish consignments.** A consignment contains the token's full ownership history.

:::danger Keep the originals
rgb-lib's backup covers its `media_files` directory, but a referenced file exists only where someone stored it. If every copy is lost, the token still validates, but it points to nothing. Keep your own backup of every file you attach.
:::
