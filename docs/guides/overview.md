---
sidebar_position: 1
title: Guides Overview
description: Which guide to read for which RGB line, and the real tools each line ships.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Guides Overview

:::info Applies to both RGB lines
This page routes you to the guide for your line. Some guides cover both lines in tabs, others only one. See [Two RGB lines](/getting-started/two-rgbs).
:::

## Pick a line first

| | Line B: v0.11 (RGB Protocol Association) | Line A: v0.12 (RGB-WG) |
|---|---|---|
| Use it for | Wallets, apps and assets that exist today, including Lightning | Studying the v0.12 design on testnet or regtest |
| CLI | `rgb` from [`rgb-cmd`](/technical-reference/cli-v011) 0.11.1 | `rgb` from [`rgb-wallet`](/technical-reference/cli) 0.12.0-rc.3 (refuses mainnet) |
| App library | [`rgb-lib`](https://github.com/RGB-Tools/rgb-lib) (Rust, plus Kotlin, Swift, Python and Node.js bindings) | `rgb-runtime` (Rust only) |
| Contracts | Schemas: NIA, IFA, UDA, CFA, PFA | Codexes and issuers (`.issuer` files) |
| Lightning | [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) (alpha) | None |

If you're not sure, use Line B. Neither line can read the other's contracts, invoices or consignments.

## Guides and their lines

**Contracts**

| Guide | Line | What it covers |
|---|---|---|
| [Schemas](./contracts/schemas.md) | B | The NIA, IFA, UDA, CFA and PFA schemas |
| [Genesis](./contracts/genesis.md) | both | Issuing a contract: `rgb issue`, `ContractBuilder`, rgb-lib, `.issuer` files |
| [State transitions](./contracts/state-transitions.md) | both | What a transition contains and how a transfer flows |
| [Bundles](./contracts/bundles.md) | B | Transition bundles (Line A removed them from consensus) |
| [Contractum](./contracts/contractum.md) | A | A proposed contract language; not implemented |

**Assets**

| Guide | Line |
|---|---|
| [Creating fungible tokens](./rgb20/creating-tokens.md) and [transferring them](./rgb20/transferring-assets.md) | both |
| [Secondary issuance](./rgb20/secondary-issuance.md) (IFA) | B |
| [Collectible fungible assets](./rgb25/overview.md) (CFA) | B, plus a note on a third-party v0.12 RGB25 issuer |
| [Unique digital assets](./rgb21/creating-nfts.md) (UDA): [metadata](./rgb21/metadata-attachments.md), [transfers](./rgb21/transferring-nfts.md) | B, plus issuing with a third-party v0.12 RGB21 issuer |

**Lightning:** [overview](./lightning/overview.md), [asset channels](./lightning/asset-channels.md) and [routing](./lightning/routing.md). Line B only, through RGB Lightning Node.

**Development**

| Guide | Line | What it covers |
|---|---|---|
| [Rust](./development/rust-sdk.md) | both | `rgb-lib`, `rgb-ops`/`rgb-api` (B); `rgb-runtime`/`rgb-std` (A) |
| [JavaScript and TypeScript](./development/rgbjs.md) | B | `rgb-lib` on npm, third-party packages, the RGB Lightning Node REST API |
| [Wallet integration](./development/wallet-integration.md) | both | Keys, coin selection, receiving, sending, backups |
| [Testing](./development/testing.md) | both | Regtest stacks, rgb-sandbox, testnet4 |

## Names to avoid

These appear in older RGB material, but they aren't the tools of either current line:

- **`rgb-cli`, `rgb-node`, `lnp-node`** (crates.io): 0.9.x releases from 2023.
- **`rgb-sdk`**: no such crate on crates.io, and `RGB-WG/rgb-sdk` is archived (last pushed 2022-06-06).
- **`rgb`** (crates.io): an unrelated pixel-colour crate. The v0.12 library crate is `rgb-std`, which you import as `rgb`.
- **`@rgbjs/*`** (npm): never published, so anyone could register the names. Don't install them.
