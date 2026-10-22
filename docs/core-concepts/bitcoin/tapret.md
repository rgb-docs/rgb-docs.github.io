---
sidebar_position: 2
title: Tapret
description: The taproot commitment scheme. The 64-byte leaf script, where it sits in the script tree, the proof, and the prefix difference between the two RGB lines.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/core-concepts/bitcoin/tapret.png
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Tapret

:::info Applies to both RGB lines
Both lines use the same tapret construction, but with a different 29-byte script prefix, so a tapret commitment from one line does not verify under the other. See [Two RGB lines](/getting-started/two-rgbs).
:::

**Tapret** hides the RGB commitment inside the script tree of a taproot (P2TR) output. On chain the output looks like any other taproot output, and no extra output is needed. It is one of the two [deterministic Bitcoin commitment](./deterministic-commitments.md) schemes. The other is [opret](./opret.md).

The commitment only counts if the P2TR output is the **first** `OP_RETURN`-or-P2TR output of the witness transaction ([first-output rule](./deterministic-commitments.md#the-first-output-rule)). A transaction carries at most one tapret commitment. Several contracts share it through [MPC](./multi-protocol-commitments.md).

## The leaf script

The commitment is a tapscript leaf of exactly 64 bytes:

```text
<29-byte prefix> OP_RETURN OP_PUSHBYTES_33 <mpc::Commitment> <nonce>
     29 bytes     1 byte    1 byte (0x21)      32 bytes       1 byte
```

The prefix is the one byte that differs between the lines:

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

29 × `OP_RESERVED` (**0x50**), then `6a 21`.

Source: `rgb-consensus` 0.11.1 `src/dbc/tapret/tapscript.rs`, `TAPRET_SCRIPT_COMMITMENT_PREFIX`. The [docs.rgb.info tapret page](https://docs.rgb.info/commitment-layer/deterministic-bitcoin-commitments-dbc/tapret) shows the same layout.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

29 × `OP_NOP` (**0x61**), then `6a 21`.

Source: `bp-core` 0.12.0 `dbc/src/tapret/tapscript.rs`, `TAPRET_SCRIPT_COMMITMENT_PREFIX`. The doc comment there says the prefix used to be `OP_RESERVED`.

</TabItem>
</Tabs>

:::warning Consensus difference
The prefix is part of the leaf hash, and so of the output key. A wallet or verifier from one line computes a different taproot key from the same commitment than the other line does. The two lines' tapret commitments are not interchangeable. Opret commitments and MPC trees are byte-identical in both lines.
:::

The leaf is never meant to be spent: execution would reach `OP_RETURN` and fail. Its only job is to be hashed into the taproot tree.

## Where the leaf goes

Taproot (BIP 341) builds the output key `Q` from an internal key `P` and an optional script tree:

```text
Q = P + tH_TapTweak(P || script_root) · G
```

`tH_TapTweak` is a BIP 340 tagged hash, and branch hashes (`TapBranch`) sort their two children lexicographically. RGB adds one rule on top: **the tapret leaf sits at depth 1**, as a direct child of the root. Any script tree the wallet already had becomes the other child.

| Case | Script tree before | Tree after | What the proof must reveal |
|---|---|---|---|
| No script path | none | the tapret leaf is the whole tree | only `P` |
| Commitment ends up on the right | root `R` | `TapBranch(R, T)` with `R < T` | `P` and the hash of `R` |
| Commitment on the left, `R` is a leaf | leaf `C` | `TapBranch(T, C)` | `P` and the script of `C` |
| Commitment on the left, `R` is a branch | branch `(X, Y)` | `TapBranch(T, R)` | `P` and the hashes of `X` and `Y` |

These are the cases the verifier accepts. The wallet code at both pins only builds the first one: it commits into a taproot output with no existing script tree and fails with `TapTreeNonEmpty` otherwise ("TODO #10: support non-empty tap trees" in `rgb-psbt-utils` 0.11.1 `src/lib.rs` and `psbt` 0.12.0-rc.3 `src/csval/tapret.rs`).

Revealing the right-hand partner shows that it can't hide a second commitment at depth 1. A leaf is shown as its script. A branch is shown as two child hashes, and branch and leaf hashes use different tags, so a branch can't pose as a 64-byte leaf.

**The nonce.** The last byte of the leaf can be changed freely. The design lets a wallet "mine" it so the commitment hash `T` sorts to the right of `R`; then the proof needs only `R`'s hash, and the scripts under `R` stay private. The pinned wallet code always uses nonce 0, because it only commits into outputs with no script tree.

This section follows the [docs.rgb.info tapret page](https://docs.rgb.info/commitment-layer/deterministic-bitcoin-commitments-dbc/tapret), which has full diagrams of each case.

## The proof

The same structure appears in both lines (`bp-core` 0.12.0 `dbc/src/tapret/mod.rs`; `rgb-consensus` 0.11.1 `src/dbc/tapret/mod.rs`). This is the 0.12 form; 0.11.1 uses rust-bitcoin types, `internal_pk: UntweakedPublicKey` and `RightLeaf(LeafScript<ScriptBuf>)`:

```rust
pub struct TapretProof {
    pub path_proof: TapretPathProof, // { partner_node: Option<TapretNodePartner>, nonce: u8 }
    pub internal_pk: InternalPk,
}

pub enum TapretNodePartner {
    LeftNode(TapNodeHash),            // commitment is on the right
    RightLeaf(LeafScript),            // the old tree was a single leaf
    RightBranch(TapretRightBranch),   // the old tree was a branch
}
```

The verifier rebuilds the leaf from the MPC commitment and the nonce. It combines that leaf with the partner (if any), tweaks `internal_pk`, and checks that the result equals the output key of the first P2TR output. No output index is needed, because the first-output rule picks the output.

## Spending a tapret output

:::danger Back up the tapret tweak
A tapret output's key is `P` tweaked by a script tree only your RGB wallet knows. To spend the bitcoin later, the signer needs that tweak: the commitment and nonce, or the full `TapretProof`. A generic taproot wallet, hardware wallet or Bitcoin Core descriptor wallet that has only your seed **cannot** produce the signature. If you lose the RGB wallet data, the BTC in that output is unspendable, and so are the RGB assets assigned to it.

- **Line B:** `rgb taprets` lists the tweaks a wallet knows (0.11.1; the command is removed in 0.11.2-rc.1). Back up the RGB data directory, not just the seed.
- **Line A:** wallets made with `rgb create --tapret-key-only` keep the tweaks in the RGB data directory. Back it up the same way.
:::

```bash line=B
# Line B (rgb-cmd 0.11.1): list known tapret tweaks for a wallet
rgb taprets --wallet <NAME>
```

See the [CLI reference (v0.11)](/technical-reference/cli-v011) and the [CLI reference (v0.12)](/technical-reference/cli) for the wallet commands of each line.

## Further reading

- [BIP 341](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki) (Taproot) and [BIP 340](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki) (tagged hashes).
- [Tapret](https://docs.rgb.info/commitment-layer/deterministic-bitcoin-commitments-dbc/tapret) on docs.rgb.info (Line B).
- [`bp-core` `dbc/src/tapret`](https://github.com/BP-WG/bp-core/tree/v0.12.0/dbc/src/tapret) (Line A).
