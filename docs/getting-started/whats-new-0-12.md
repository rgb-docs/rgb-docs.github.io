---
sidebar_position: 4
title: What's new in v0.12 (Line A)
description: The changes RGB-WG made in RGB v0.12, as stated in its release posts, and what is still a release candidate.
rgb_line: A
verified_with: rgb-wallet 0.12.0-rc.3
last_update:
  date: 2026-10-19
---

# What's new in v0.12 (Line A)

:::info RGB v0.12 line (rgb-wallet 0.12.0-rc.3, release candidate)
This page covers only RGB-WG's v0.12 redesign. The other line continued v0.11. See [Two RGB lines](/getting-started/two-rgbs).
:::

:::note Line B stayed on 0.11.x
The RGB Protocol Association didn't adopt v0.12. It continued the v0.11 protocol: 0.11.1 has been final since 2026-09-16, and 0.11.2 is a release candidate (2026-10-09). Nothing on this page applies to Line B, and v0.12 can't read Line B contracts. See [Two RGB lines](/getting-started/two-rgbs).
:::

Except where noted, everything below comes from RGB-WG's own posts: [v0.12 release candidate 1](https://rgb.tech/blog/release-v0-12-rc-1/) (2025-05-20), [release candidate 2](https://rgb.tech/blog/release-v0-12-rc-2/) (2025-06-01) and the [v0.12 consensus release](https://rgb.tech/blog/release-v0-12-consensus/) (2025-07-10). These are the project's own claims. This site hasn't benchmarked them.

## Release status (2026-10-19)

| Component | Version | Date | Status |
|---|---|---|---|
| `rgb-core` (consensus) | 0.12.0 | 2025-07-10 | final |
| `rgb-std`, `rgb-runtime`, `rgb-wallet` (CLI) | 0.12.0-rc.3 | 2025-07-15 | release candidate |

There has been no Line A release since 2025-07-15 (crates.io). The consensus post says the release candidate "will become a full release" once the ecosystem adopts it. The rc.3 CLI refuses mainnet: it panics with "Non-testnet networks are not yet supported".

## Breaking change

RC1 states that "contracts issued before this release will not be compatible with the new RGB version", and the consensus post recommends re-issuing all earlier contracts. There is no migration tool, and v0.11 contracts can't be imported into v0.12.

The consensus post also says that with consensus frozen, "contracts are now forward-compatible". That is RGB-WG's intention for its own consensus layer (`rgb-core` 0.12). It isn't a guarantee for the release-candidate libraries, and it says nothing about Line B.

## What changed

**Consensus and VM**

- Consensus code is about four times smaller ("x4 reduction in the size of the consensus code and x2 reduction in standard libraries"). "The whole consensus validation was reduced to just a few hundred lines of code."
- **zk-AluVM**, a VM "made of just 40 instructions", is designed so that validation can later be proven with zk-STARKs. See [AluVM](/core-concepts/aluvm/overview).
- Fungible, structured and attachment state are merged into one type made of finite field elements. See [Unified state](/core-concepts/state/unified-state).
- Tapret and opret seals are unified into a single seal type, with an `OP_RETURN` fallback.
- RC2 added input-specific lock scripts and an operation-level `witness` field.

**Removed**

- Pedersen commitments and Bulletproofs.
- Blank state transitions.
- Multi-chain contracts: "each blockchain will have its own version of the contract".
- Schemata. Contracts are now issued from *codexes* and *issuers*, with APIs on top. Interfaces left the standard library: "Interfaces are still present, but not in the standard library". The higher-level language Contractum, which is meant to compile into these APIs, hasn't been released ([RGB-WG/contractum-lang](https://github.com/RGB-WG/contractum-lang), last pushed 2022-12-24).

**Payments and storage**

- Richer invoices with a new `contract:` URI scheme. An example of real rc.3 output is `contract:tb@contract:<id>/10@at:<token>/` (see [CLI reference](/technical-reference/cli#invoice)).
- Contracts can expose several tokens.
- *Payment scripts* for multi-party and batched payments: the `rgb script` → `exec` → `complete` workflow ([Payments.md](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/doc/Payments.md)).
- Consignments are streamed and validated as they are read. RC1 says this takes "a few hundred bytes of memory".
- Chain-index sync is separated from consignment validation. The consensus post says validation "became order of magnitude faster", but publishes no benchmark.
- Contract history is kept in an append-only embedded database.

**Testing.** The consensus post reports unit-test coverage that "exceeds 66.7% for all RGB abstraction levels", "reaching >75% in the consensus libraries".

## Lightning

v0.12 has no released Lightning implementation. RC1 lists Lightning channel operations as a use for payment scripts. As of 2026-10-19, the only RGB Lightning node that has been released is [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) (Line B, alpha).

## Try it

```bash
cargo install --locked rgb-wallet --version 0.12.0-rc.3
```

Then follow the [quick start](/getting-started/quick-start) (v0.12 tab) and the [CLI reference](/technical-reference/cli).
