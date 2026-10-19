---
sidebar_position: 4
title: Multi-Protocol Commitments
description: How one 32-byte Bitcoin commitment covers many RGB contracts. The MPC tree, leaf placement by contract id, entropy leaves, and Line A's extra multi-message bundle layer.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Multi-Protocol Commitments

:::info Applies to both RGB lines
The MPC tree and its commitment are byte-identical in both lines. Line A adds one extra layer inside each leaf. See [Two RGB lines](/getting-started/two-rgbs).
:::

A witness transaction has room for exactly one [deterministic commitment](./deterministic-commitments.md). **Multi-protocol commitments (MPC)** let many RGB contracts share it. Each contract gets one leaf in a Merkle tree, and only the tree's 32-byte commitment goes on chain.

A verifier of one contract sees only that contract's leaf and a Merkle path. It learns nothing about the other contracts in the tree, or even how many there are.

The design comes from [LNPBP-4](https://github.com/LNP-BP/LNPBPs/blob/master/lnpbp-0004.md). In RGB, the "protocol" is the contract: the 32-byte `ProtocolId` of a leaf **is the `ContractId`**. There are no protocol tags, versions or per-protocol subtrees.

## What a leaf holds

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

The leaf message is the contract's **`BundleId`**: the id of the transition bundle that holds every state transition of that contract closed by this witness transaction (`rgb-consensus` 0.11.1 `src/validation/validator.rs`, `mpc::Message::from(bundle_id)`).

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

The leaf message is the commitment of a **multi-message bundle**, `mmb::BundleProof`. This is a map from witness-transaction input index to message (an operation id), tagged `urn:lnp-bp:mmb:bundle#2024-11-18`.

Verifying a seal therefore checks two things: that the witness transaction spends the seal's outpoint at some input `i`, and that the bundle maps `i` to this operation (`bp-core` 0.12.0 `seals/src/txout.rs`). Line A's `MerkleProof` and `MerkleBlock` also carry a `method` field (`Sha256t`) in their serialized form. The commitment value doesn't change.

</TabItem>
</Tabs>

## Building the tree

Source: `commit_verify` 0.12.0 `src/mpc/` (Line A) and `rgb-consensus` 0.11.1 `src/commit_verify/mpc/` (Line B). The [docs.rgb.info MPC page](https://docs.rgb.info/commitment-layer/multi-protocol-commitments-mpc) describes the same construction.

1. **Pick a size.** Start at depth `d = 3`, the minimum (`MPC_MINIMAL_DEPTH`), so that the tree doesn't reveal how few contracts it holds. The width is `w = 2^d`.
2. **Place each contract.** A contract with id `c` goes to leaf position
   ```text
   pos(c) = c mod (w − cofactor)
   ```
   where `c` is read as a 256-bit little-endian integer. The tree builder tries `cofactor = 0, 1, 2, …` (at most 500 tries) until every contract lands in a different position. If none works, it adds one level of depth and tries again.
3. **Fill the leaves.** Occupied leaves commit to the contract:
   ```text
   tH_merkle(0x10 || contract_id || message)
   ```
   Empty leaves commit to random **entropy**:
   ```text
   tH_merkle(0x11 || entropy || pos)
   ```
   `entropy` is a `u64` (8 bytes) picked by whoever builds the tree, and `pos` is a little-endian `u32`. docs.rgb.info calls entropy "a 64-byte random value". In the code it is 64 *bits* (`Leaf::Entropy { entropy: u64, pos: u32 }`).
4. **Hash the nodes.** Each branch is
   ```text
   tH_merkle(branching || depth || width || left || right)
   ```
   `tH_merkle` is a tagged SHA-256 with tag `urn:ubideco:merkle:node#2024-01-31`. Children are **not** sorted; their position comes from the leaf index.
5. **Commit.** The value that goes into the opret or tapret script is
   ```text
   mpc::Commitment = tH("urn:ubideco:mpc:commitment#2024-01-31", depth || cofactor || root)
   ```
   with `depth` as one byte and `cofactor` as a little-endian `u16`.

## Proofs

The sender gives each recipient an **MPC proof** (`MerkleProof`): the leaf position, the cofactor and the sibling hashes along the path. The recipient recomputes the commitment from their own contract's leaf and checks it against the witness transaction. The tree builder keeps the full `MerkleBlock` and can reveal or conceal individual leaves.

The Rust types live in `commit_verify::mpc` (Line A crate `commit_verify` 0.12.0) and `rgbcore::commit_verify::mpc` (Line B crate `rgb-consensus` 0.11.1, library name `rgbcore`): `MultiSource`, `MerkleTree`, `MerkleBlock`, `MerkleProof`, `ProtocolId`, `Message` and `Commitment`.

## What MPC does and doesn't do

- Different contracts' state moves can share one Bitcoin transaction, and so one fee.
- Each contract's data stays private from the holders of other contracts in the same tree.
- Within one contract, all transitions closed by the transaction share a single leaf: the bundle (B) or the multi-message bundle (A).
- No Lightning or other non-RGB protocol occupies MPC leaves in either line.
- Opret and tapret reveal the same thing: one 32-byte commitment. The difference is that opret's `OP_RETURN` output is visible as such, while tapret hides in a taproot key.
