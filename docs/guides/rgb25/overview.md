---
sidebar_position: 1
title: Collectible Fungible Assets (CFA)
description: The CFA schema of RGB v0.11, a fungible asset with an optional Article string. What it contains and how to issue it with rgb-cmd, rgb-lib or the RGB Lightning Node.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# Collectible Fungible Assets (CFA)

:::info RGB v0.11 line (rgb-cmd 0.11.1)
CFA is a v0.11 schema. v0.12 has no CFA, or "RGB25", issuer. See [Two RGB lines](/getting-started/two-rgbs).
:::

**CFA** (Collectible Fungible Asset) is the v0.11 schema once called "RGB25". The official docs describe it as "similar to NIA, with an additional string (Article) that represents the collectible" ([supported schemas](https://github.com/rgb-protocol/RGB-Documentation/blob/master/rgb-contract-implementation/schema/supported-schemas.md)).

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

Run offline with rgb-cmd 0.11.1 on 2026-10-19, after `rgb import CollectibleFungibleAsset.rgb` from rgb-schemas. The seal is a placeholder outpoint:

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
rgb -n regtest -d data0 issue "ssi:issuer" cfa.yaml
```

Real output:

```text
A new contract rgb:HWJLxdaV-ikg7xlb-sCuIY2u-JP2GEuJ-0Lwd4OW-TRwyjOY is issued and added to the stash.
Use `export` command to export the contract.
```

To leave out an optional global, leave out its key. Writing `details: ~` makes `rgb issue` panic with `global type doesn't match type definition` (real output), because `details` is an optional global, not an optional value.

### rgb-lib

`issue_asset_cfa` in `rgb-lib` 0.3.0-beta.7 (`src/wallet/singlesig.rs`). Wallet setup is as in [Issuing fungible tokens](/guides/rgb20/creating-tokens).

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

`POST /issueassetcfa` takes `name`, `details`, `precision`, `amounts` and an optional `file_digest`. Upload the file first with `POST /postassetmedia`. This is from RLN's `openapi.yaml` and wasn't run here.

```bash
curl -X POST -H "Content-type: application/json" \
  -d '{"name": "Demo Collectible", "precision": 0, "amounts": [500]}' \
  http://localhost:3001/issueassetcfa
```

:::danger Back up after issuing
A seed phrase doesn't recover RGB assets. Back up the RGB data directory, or use rgb-lib's `backup`, right after you issue.
:::
