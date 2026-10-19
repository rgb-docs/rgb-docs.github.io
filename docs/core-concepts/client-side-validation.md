---
sidebar_position: 2
title: Client-Side Validation
description: Why RGB state is checked by the people who receive it, not by every node, and what a recipient has to verify.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Client-Side Validation

:::info Applies to both RGB lines
Both lines validate client-side the same way; the data containers differ. See [Two RGB lines](/getting-started/two-rgbs).
:::

On a blockchain like Bitcoin or Ethereum, every full node checks every transaction and keeps the whole state. RGB works the other way round. **The contract data never goes on chain.** Bitcoin carries only a 32-byte [commitment](./bitcoin/deterministic-commitments.md) per witness transaction, and each party checks the part of the contract history that concerns them.

| | Global validation (L1 blockchain) | Client-side validation (RGB) |
|---|---|---|
| Who validates | Every full node | The recipient of the state |
| What is stored | Everything, by everyone | Your own contracts' history |
| What the chain sees | All data | A 32-byte commitment hidden in an opret or tapret output |
| Ordering and double-spend protection | The chain's consensus | Bitcoin, through [single-use seals](./single-use-seals.md) |

Every RGB transfer still needs a Bitcoin transaction. [MPC](./bitcoin/multi-protocol-commitments.md) lets many contracts share one, but on-chain throughput is still bounded by Bitcoin.

## How a transfer is checked

1. **State lives on Bitcoin outputs.** Each piece of owned state is assigned to a seal, i.e. a UTXO (see [owned state](./state/owned-state.md)).
2. **The sender builds a consignment.** It holds everything the recipient needs: the contract's genesis and its rules, every operation from genesis to the new state, and the anchors that tie each operation to a Bitcoin transaction.
3. **The recipient validates it.** It checks the whole graph from genesis to the outputs it now owns:
   - each operation follows the contract's rules (schema in Line B, codex in Line A), including any [AluVM](./aluvm/overview.md) scripts;
   - each spent seal was closed by a witness transaction that commits to that operation (commitment, MPC proof, and in Line A the multi-message bundle);
   - each witness transaction exists on Bitcoin, which the wallet looks up through an indexer.
4. **The recipient accepts it** into its local stash. Only then does the state count as received.

Nothing in history can be skipped or pruned. The recipient needs every operation back to genesis on the path to their state, but not operations on unrelated branches. Consignments grow with that history.

## What's in a consignment

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

```rust
// rgb-ops 0.11.1, src/containers/consignment.rs
pub struct Consignment<const TRANSFER: bool> {
    pub version: ContainerVer,
    pub transfer: bool,
    pub terminals: SmallOrdMap<BundleId, SecretSeals>,
    pub genesis: Genesis,
    pub bundles: LargeVec<WitnessBundle>,  // transitions + anchor + witness tx
    pub schema: Schema,
    pub types: TypeSystem,
    pub scripts: Confined<BTreeSet<Lib>, 0, CONSIGNMENT_MAX_LIBS>,
}
```

Validation code lives in [`rgb-consensus`](https://github.com/rgb-protocol/rgb-consensus) 0.11.1, `src/validation/`.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

```rust
// rgb-std 0.12.0-rc.3, src/consignment.rs
pub struct Consignment<Seal: RgbSeal> {
    header: ConsignmentHeader<Seal>,   // extensions, semantics, sig, issue (codex + genesis),
                                       // genesis_seals, op_count
    operation_seals: LargeVec<OperationSeals<Seal>>,
}
```

The consignment is read as a stream, operation by operation. Verification lives in [`rgb-core`](https://github.com/RGB-WG/rgb-core) 0.12.0, `src/verify.rs`. The header's `extensions` field is a list of opaque blobs, not v0.10-style "state extensions".

</TabItem>
</Tabs>

State extensions were removed in both lines. Both encode consignments in binary [strict encoding](/technical-reference/strict-types). Line B's `rgb armor` can also wrap a file in ASCII armor for transport. See [Consignments](/technical-reference/consignments).

## Commands

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

```bash line=B
rgb validate transfer.rgb   # check only (needs an indexer to look up witness txs)
rgb accept transfer.rgb     # check and add to the stash
```

`rgb accept --force` accepts a consignment whose last witness transaction isn't mined yet. Don't use it for payments you haven't otherwise confirmed.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

```bash line=A
rgb accept transfer.rgb     # verify and accept a contract or transfer consignment
```

`rgb accept --unknown` allows contracts the wallet hasn't seen before.

</TabItem>
</Tabs>

Full flag lists: [CLI reference (v0.11)](/technical-reference/cli-v011) and [CLI reference (v0.12)](/technical-reference/cli).

## Trust model

- **You don't trust the sender.** Anything that fails validation is rejected, whatever the sender claims.
- **You don't need a blockchain node for the contract**, only a Bitcoin indexer (your own or a third party's) to confirm that witness transactions exist and are mined. A dishonest indexer can hide or delay transactions, but it can't make invalid state look valid.
- **Privacy.** Only the people a history passes through learn about it. Each recipient sees the history back to genesis for the state they receive, but nothing about other branches or other contracts.

:::danger Back up RGB data, not just the seed
Your seed restores your bitcoin keys, **not** your RGB state. The consignments and the stash are stored only on your device. If you lose them, a restored seed shows the UTXOs but not the assets on them. Back up the RGB data directory (or use your wallet's RGB backup feature) after every receive and send.
:::

:::danger Send the consignment before broadcasting
In an interactive transfer the recipient should validate the consignment **before** the sender broadcasts the witness transaction. Keep a copy of every consignment you send or receive. If the transaction confirms but the recipient never got the consignment, the state can only be recovered from your copy.
:::

## Further reading

- [Client-side validation](https://docs.rgb.info/distributed-computing-concepts/client-side-validation) on docs.rgb.info (Line B).
- [RGB black paper](https://black-paper.rgb.tech) (Line A).
- [`client_side_validation`](https://github.com/LNP-BP/client_side_validation) libraries (Line A).
