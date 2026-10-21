---
sidebar_position: 5
title: Transition bundles
description: In RGB v0.11, a transition bundle holds all of one contract's transitions in one witness transaction and fills one MPC leaf. v0.12 removed bundles from consensus.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Transition bundles

:::info RGB v0.11 line (rgb-cmd 0.11.1)
Transition bundles are part of v0.11 consensus. v0.12 removed them, as described at the end of this page. See [Two RGB lines](/getting-started/two-rgbs).
:::

A **transition bundle** is the set of all state transitions **of one contract** that are committed in the same witness transaction. It is not a way to put several contracts together: each contract in a witness transaction has its own bundle.

## Why bundles exist

One Bitcoin transaction can close seals of several contracts and several transitions of the same contract. For example, a payer might merge two allocations, or send tokens and inflation rights together. The witness transaction carries a single commitment, so RGB arranges the data in three levels:

1. **Per contract:** all transitions of contract *C* in this transaction form one `TransitionBundle`. Its `BundleId` goes into the MPC tree.
2. **Across contracts:** the [MPC](/core-concepts/bitcoin/multi-protocol-commitments) (multi-protocol commitment) tree has one leaf per contract, at a position set by the contract ID. Empty leaves are filled with random data.
3. **On chain:** the MPC root goes into one tapret or opret output ([DBC](/core-concepts/bitcoin/deterministic-commitments)).

So batching many contracts into one transaction is done by the MPC tree, not by the bundle. Source: [State Transitions](https://docs.rgb.info/rgb-state-and-operations/state-transitions) in the official docs, and the glossary entry "Transition Bundle".

## The structure

From `rgb-consensus` 0.11.1 `src/operation/bundle.rs`:

```rust
pub struct TransitionBundle {
    pub input_map: NonEmptyOrdMap<Opout, OpId, U16MAX>,
    pub known_transitions: NonEmptyVec<KnownTransition, U16MAX>,
}

pub struct KnownTransition {
    pub opid: OpId,
    pub transition: Transition,
}
```

- **`input_map`** maps every assignment being spent (an `Opout`: operation ID, assignment type, index) to the transition that spends it. Only this map goes into the commitment (`CommitEncode` commits to `input_map`), and because a map key can appear only once, a single assignment can't be spent by two transitions in the same bundle.
- **`known_transitions`** holds the transitions whose contents are revealed. A consignment for one recipient can leave out (conceal) transitions that don't concern them. Their opids are still in `input_map`.
- Both collections are limited to 65,535 entries (`U16MAX`).

The bundle has no anchor or witness field. The anchor (MPC proof plus DBC proof) and the witness transaction are carried next to the bundle in the consignment.

## In practice

You don't build bundles by hand. `rgb transfer` in rgb-cmd and `send` in rgb-lib create them:

- **rgb-cmd 0.11.1:** `rgb transfer <INVOICE> <CONSIGNMENT> [PSBT]` builds the transitions, the bundle, the MPC commitment and the PSBT ([CLI reference](/technical-reference/cli-v011#transfer)).
- **rgb-lib 0.3.0-beta.7:** `send` (or `send_begin`/`send_end`) takes a map of asset ID → recipients. All recipients share one Bitcoin transaction, and rgb-lib writes one consignment per asset ([Transferring assets](/guides/rgb20/transferring-assets)).

When a transaction spends a UTXO that holds state of several contracts, the wallet must also move the state of those other contracts, usually to change. Otherwise that state is lost. Both tools handle this.

:::danger Let only RGB tools spend RGB UTXOs
A Bitcoin wallet that doesn't know about RGB can spend a UTXO that holds allocations of several contracts. It creates no bundles for them, so all of that state is destroyed. Keep RGB UTXOs in a wallet that only RGB software controls.
:::

## RGB v0.12

:::info RGB v0.12 line (rgb-wallet 0.12.0-rc.3, release candidate)
v0.12 has no transition bundles in consensus: the `rgb-core` 0.12 changelog lists "Remove transition bundles" and "Remove anchors". The wallet layer still groups the operations of one witness transaction in a `PrefabBundle`, a set of `Prefab { closes, defines, operation }` (`rgb-std` 0.12.0-rc.3 `src/popls/bp.rs`). `rgb exec` writes one, and `rgb complete` adds it to the stash after the PSBT is committed. `rgb pay` does both internally. See [CLI reference (v0.12)](/technical-reference/cli).
:::
