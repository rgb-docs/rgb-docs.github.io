---
sidebar_position: 1
title: Collectible Fungible Assets (CFA)
description: The CFA schema of RGB v0.11, a fungible asset with an optional Article string. What it contains and how to issue it with rgb-cmd, rgb-lib or the RGB Lightning Node.
rgb_line: B
verified_with: rgb-cmd 0.11.1; rgb-wallet 0.12.0-rc.3
last_update:
  date: 2026-10-25
image: /img/og/guides/rgb25/overview.png
---

# Collectible Fungible Assets (CFA)

:::info RGB v0.11 line (rgb-cmd 0.11.1)
CFA is a v0.11 schema. v0.12 has no CFA. Its nearest equivalent is a third-party "RGB25" issuer, described [at the end](#v012-rgb25). See [Two RGB lines](/getting-started/two-rgbs).
:::

**CFA** (Collectible Fungible Asset) is the v0.11 schema once called "RGB25". The official docs describe it as "similar to NIA, with an additional string (Article) that represents the collectible" ([supported schemas](https://docs.rgb.info/rgb-contract-implementation/schema/supported-schemas)).

A CFA contract is **one fungible asset**, like NIA. It has no item types, per-item supply, attributes, rarity or royalties. For a set of different collectibles, issue one contract per item. For one-of-a-kind items, use [UDA](/guides/rgb21/creating-nfts).

## What a CFA contract holds

From `rgb-schemas` 0.11.1 `src/cfa.rs`:

| Element | Kind | Content |
|---|---|---|
| `art` | Global, optional | `Article`: 1–32 characters, starting with a letter, then letters and digits |
| `name` | Global | 1–40 printable ASCII characters |
| `details` | Global, optional | 1–255 bytes |
| `precision` | Global | 0–18 |
| `terms` | Global | `ContractTerms`: text plus an optional media attachment (type and digest) |
| `issuedSupply` | Global | Total supply, which must equal the genesis allocations |
| `assetOwner` | Owned, fungible (u64) | Balances |

Unlike NIA, a CFA has **no ticker**: name, details and precision are separate globals rather than an `AssetSpec`. The only transition is `transfer`, so there is no burn and no secondary issuance (for those, use [IFA](/guides/rgb20/secondary-issuance)). Transfers work exactly like [NIA transfers](/guides/rgb20/transferring-assets).

## Issuing

### rgb-cmd

Run offline with rgb-cmd 0.11.1 on 2026-10-19. The schema file is in [rgb-schemas](https://github.com/rgb-protocol/rgb-schemas/tree/0.11.1/schemata), and the seal must be an outpoint your wallet owns:

```yaml
schema: rgb:sch:JgqK5hJX9YBT4osCV7VcW_iLTcA5csUCnLzvaKTTrNY#mars-house-friend

globals:
  art: DEMOART
  name: Demo Collectible
  precision: 0
  terms:
    text: demo CFA asset
    media: ~
  issuedSupply: 500

assignments:
  assetOwner:
    seal: <txid>:<vout>
    amount: 500
```

```bash
rgb -n regtest -d data0 import rgb-schemas/schemata/CollectibleFungibleAsset.rgb
rgb -n regtest -d data0 issue "ssi:issuer" cfa.yaml
```

Real output (the contract ID differs on every run, because the seal is blinded with a random value):

```text
A new contract rgb:HWJLxdaV-ikg7xlb-sCuIY2u-JP2GEuJ-0Lwd4OW-TRwyjOY is issued and added to the stash.
Use `export` command to export the contract.
```

To leave out an optional global, leave out its key. Writing `details: ~` makes `rgb issue` panic with `global type doesn't match type definition` (real output), because `details` is an optional global, not an optional value.

### rgb-lib

`issue_asset_cfa` in `rgb-lib` 0.3.0-beta.7 (`src/wallet/singlesig.rs`). Wallet setup is as in [Issuing fungible tokens](/guides/rgb20/creating-tokens), with `AssetSchema::Cfa` in `supported_schemas` (otherwise it fails with `UnsupportedSchema`). This passes `cargo check` (2026-10-21) but wasn't run.

```rust
let asset = wallet.issue_asset_cfa(
    "Demo Collectible".into(),           // name
    Some("Limited series".into()),       // details
    0,                                   // precision
    vec![500],                           // one allocation per amount
    Some("art/cover.png".into()),        // optional file: its type and SHA-256 go into terms.media
)?;
```

rgb-lib doesn't set the `art` global.

### RGB Lightning Node

`POST /issueassetcfa` takes `name`, `details`, `precision`, `amounts` and an optional `file_digest`. Upload the file first with `POST /postassetmedia`. This is from RLN's `openapi.yaml` and wasn't run here. RLN's README calls it "early alpha", for regtest and testnet only.

```bash
curl -X POST -H "Content-type: application/json" \
  -d '{"name": "Demo Collectible", "precision": 0, "amounts": [500]}' \
  http://localhost:3001/issueassetcfa
```

:::danger Back up after issuing
A seed phrase doesn't recover RGB assets. Back up the RGB data directory, or use rgb-lib's `backup`, right after you issue.
:::

## v0.12: third-party RGB25 issuer {#v012-rgb25}

RGB-WG's `rgb` release ships no RGB25 issuer. [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers) publishes `compiled/RGB25-UniquelyFungible-v0-aiRB3w.issuer` ("Uniquely Fungible Asset", UFA), unaudited according to its README. Like CFA it has `name`, `details`, `precision` and `issued` globals and a fungible `balance`, but no `art` field, and its contracts are incompatible with CFA. With rgb-wallet 0.12.0-rc.3 it imports and issues offline (tested 2026-10-21) from a parameter file shaped like [`templates/RGB25-UniquelyFungible.yaml`](https://github.com/pandora-prime/rgb-issuers/blob/master/templates/RGB25-UniquelyFungible.yaml), with the same commands as the [RGB20-FNA example](/guides/rgb20/creating-tokens). `rgb-wallet` 0.12.0-rc.3 refuses mainnet. Transfers work as for RGB20: an amount invoice (`rgb invoice -w bob <contract> 10`), then `rgb pay`. A UFA transfer built offline with `rgb-runtime` 0.12.0-rc.3's `pay_invoice`, the library call behind `rgb pay`, was accepted by `rgb accept` (2026-10-25).
