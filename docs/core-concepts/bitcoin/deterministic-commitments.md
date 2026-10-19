---
sidebar_position: 1
title: Deterministic Bitcoin Commitments
description: How RGB anchors client-side data in a Bitcoin transaction, and the one-commitment-per-transaction rule both lines enforce.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Deterministic Bitcoin Commitments

:::info Applies to both RGB lines
Both lines use the same commitment rules; the only byte-level difference is the tapret script prefix. See [Two RGB lines](/getting-started/two-rgbs).
:::

A **deterministic Bitcoin commitment (DBC)** puts a 32-byte hash of RGB client-side data into a Bitcoin transaction so that:

- the transaction provably carries **one and only one** commitment, and
- anyone holding the data and a short proof can check that commitment against the transaction.

That uniqueness is what makes a [single-use seal](../single-use-seals.md) safe. If a transaction could hold two commitments, its owner could show different histories to different people.

The transaction that closes a seal and carries the commitment is called the **witness transaction**.

## What gets committed

The 32 bytes in the transaction are an **MPC commitment**, the root of a [multi-protocol commitment](./multi-protocol-commitments.md) tree. Each leaf of the tree belongs to one RGB contract. The leaf holds:

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

The `BundleId` of the contract's transition bundle: all state transitions of that contract closed by this witness transaction (`rgb-consensus` 0.11.1 `src/validation/validator.rs`).

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

The commitment of a **multi-message bundle** (`mmb::BundleProof`): a map from each witness-transaction input index to the operation it closes. Tag `urn:lnp-bp:mmb:bundle#2024-11-18` (`bp-core` 0.12.0 `seals/src/txout.rs`).

</TabItem>
</Tabs>

Genesis, schemas, codexes and contract metadata are not anchored. They reach the verifier inside the consignment and are checked by hash.

## The first-output rule

> The only output that can hold an RGB commitment is the **first** output of the witness transaction that is either an `OP_RETURN` or a P2TR (taproot) output.

- If that output is `OP_RETURN`, it must hold an [opret](./opret.md) commitment.
- If it is P2TR, it must hold a [tapret](./tapret.md) commitment.
- Every later `OP_RETURN` or P2TR output is ignored.

Both lines enforce this in the verifier:

- Line A: `bp-core` 0.12.0 `seals/src/txout.rs`, `verify_commitment` takes the first output where `is_op_return() || is_p2tr()`.
- Line B: `rgb-consensus` 0.11.1 `src/validation/validator.rs` does the same search, and the proof type must match the output type.

Line B genesis also records the rule as `SealClosingStrategy::FirstOpretOrTapret`, its only variant (`src/operation/operations.rs`).

:::danger Output order matters
If a wallet places a P2TR payment output (change, or the recipient's taproot address) **before** the intended `OP_RETURN` commitment, the verifier looks for the commitment in the wrong output and the anchor fails. The RGB state that transaction tried to move is then lost. Let the RGB wallet build the transaction, and don't reorder its outputs in another tool.
:::

## Commitment schemes

| | Opret | Tapret |
|---|---|---|
| Where | A zero-value `OP_RETURN` output | A leaf in the taproot script tree of a P2TR output |
| Script | `OP_RETURN OP_PUSHBYTES_32 <mpc::Commitment>`, 34 bytes | 64-byte leaf script: 29-byte prefix, `OP_RETURN OP_PUSHBYTES_33`, the commitment, a 1-byte nonce |
| Extra output | Yes | No, it reuses a P2TR output |
| Visible on chain | Yes, as a 32-byte `OP_RETURN` | No, the output looks like any taproot output |
| Spending | No key change | The output key is tweaked; the wallet must keep the tweak to spend it |
| Line A vs B | Identical | Prefix differs: A uses 29 × `OP_NOP` (0x61), B uses 29 × `OP_RESERVED` (0x50) |

Which one gets used depends on the wallet:

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

`rgb-lib`, the library behind most Line B wallets, always sets `CloseMethod::OpretFirst` (`rgb-lib` `src/wallet/online.rs`). `rgb-cmd` can also run a taproot wallet: `rgb create` takes `--tapret-key-only <KEY>` or `--wpkh <KEY>`.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

`rgb create <NAME> <DESCRIPTOR>` takes the switch `--tapret-key-only` (tapret) or `--wpkh` (opret) (`RGB-WG/rgb` `cli/src/exec.rs`).

</TabItem>
</Tabs>

## How a verifier checks it

1. Find the first `OP_RETURN` or P2TR output of the witness transaction. If there is none, the anchor is invalid.
2. Check that the proof type matches the output type: opret for `OP_RETURN`, tapret for P2TR.
3. Rebuild the MPC commitment from the contract's leaf (B: the `BundleId`; A: the MMB commitment) and its Merkle path. Compare it with the output: the `OP_RETURN` payload for opret, or the taproot output key recomputed from the tapret proof.
4. Check that the transaction spends the seals the operation claims to close. Line A also checks that the MMB maps each of those inputs to this operation.

A witness transaction seen only in the mempool gives a **tentative** result. Wait for confirmations before treating a transfer as final.

## Further reading

- [Deterministic Bitcoin Commitments](https://docs.rgb.info/commitment-layer/deterministic-bitcoin-commitments-dbc) on docs.rgb.info, Line B's official docs. The first-output rule above follows that page.
- [`bp-core`](https://github.com/BP-WG/bp-core) v0.12.0, crates `bp-dbc` and `bp-seals` (Line A).
- [`rgb-consensus`](https://github.com/rgb-protocol/rgb-consensus) 0.11.1, modules `dbc` and `seals` (Line B). It carries its own copy of the commitment code instead of depending on `bp-core`.
