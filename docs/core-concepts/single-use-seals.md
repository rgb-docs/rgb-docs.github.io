---
sidebar_position: 3
title: Single-Use Seals
description: How RGB ties contract state to Bitcoin outputs. A seal is closed only when its output is spent by a transaction that commits to the message.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Single-Use Seals

:::info Applies to both RGB lines
Both lines use Bitcoin transaction outputs as single-use seals, with different seal structures. See [Two RGB lines](/getting-started/two-rgbs).
:::

A **single-use seal** is a cryptographic primitive described by Peter Todd in 2016 ([Commitments and single-use seals](https://petertodd.org/2016/commitments-and-single-use-seals)). A seal is a promise that can be kept once: it can be **closed over exactly one message**, and anyone can later check which message that was.

Both lines implement it in code:

- Line A: the `SingleUseSeal` trait and `SealWitness::verify_seal_closing` in `single_use_seals` 0.12.0 (`LNP-BP/client_side_validation`).
- Line B: `rgb-consensus` 0.11.1 `src/single_use_seals/` and `src/seals/`.

## Seals on Bitcoin

RGB uses a Bitcoin **transaction output** as the seal:

| Seal operation | On Bitcoin |
|---|---|
| **Define** | Name an output (`txid:vout`) in an RGB operation, e.g. the receiver's UTXO in a transfer. |
| **Close** | Spend that output in a transaction that **commits to the message**: the new RGB operation that moves the state. |
| **Verify** | Check that the output was spent by that transaction **and** that the transaction carries a valid commitment to the message. |

Bitcoin consensus guarantees that an output is spent at most once. The [deterministic commitment](./bitcoin/deterministic-commitments.md) rules guarantee that the spending transaction commits to at most one message per contract. Together they give single use.

:::danger A spend alone proves nothing
"The UTXO was spent" is **not** enough to accept a transfer. A verifier must also check that:

1. the first `OP_RETURN`-or-P2TR output of the spending transaction (the **witness transaction**) holds a valid [opret](./bitcoin/opret.md) or [tapret](./bitcoin/tapret.md) commitment;
2. the [MPC proof](./bitcoin/multi-protocol-commitments.md) links this contract's leaf to that commitment; and
3. the leaf commits to this operation: through the transition bundle in Line B, and through the multi-message bundle entry for the spending input in Line A.

Code that only checks `is_spent()` would accept forged transfers. Use the validators in `rgb-consensus` (B) or `rgb-core` (A).
:::

The verification code is `src/validation/validator.rs` `validate_seal_closing` in `rgb-consensus` 0.11.1 (B), and `TxoSeal::is_included` plus `Tx::verify_commitment` in `bp-core` 0.12.0 `seals/src/txout.rs` (A).

## What a seal looks like

No seal stores a commitment method. Opret or tapret is decided when the seal is closed, by the type of the first `OP_RETURN`-or-P2TR output of the witness transaction.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

```rust
// rgb-consensus 0.11.1, src/seals/txout/blind.rs
pub struct BlindSeal<Id: SealTxid> {
    pub txid: Id,       // Txid, or TxPtr::WitnessTx for "an output of the witness tx"
    pub vout: Vout,
    pub blinding: u64,  // random; stops anyone matching the seal to on-chain UTXOs
}
```

- `GenesisSeal` = `BlindSeal<Txid>`. `GraphSeal` = `BlindSeal<TxPtr>`, which can point at an output of the witness transaction itself.
- The **concealed** form, `SecretSeal`, is a tagged hash of the seal (tag `urn:lnp-bp:seals:secret#2024-02-03`). A receiver puts it in an invoice as `utxob:…`, and the sender never learns the UTXO.
- A receiver who wants the output created by the payment itself uses a **witness-output** invoice, `wvout:…`.
- Genesis fixes the closing rule as `SealClosingStrategy::FirstOpretOrTapret`.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

```rust
// bp-core 0.12.0, seals/src/wtxout.rs and seals/src/txout.rs
pub struct WTxoSeal {
    pub primary: WOutpoint,     // Wout(vout) of the witness tx, or Extern(Outpoint)
    pub secondary: TxoSealExt,  // Noise(40 bytes) or Fallback(Outpoint)
}
pub struct TxoSeal {            // the resolved seal
    pub primary: Outpoint,
    pub secondary: TxoSealExt,
}
```

- Contract state doesn't store the seal. Each state cell holds an **`AuthToken`**: the first 30 bytes of the seal definition's tagged hash (`rgb-core` 0.12.0 `src/seals.rs`). Invoices carry it as `at:…`, or `wout:…` for a witness output.
- The 40-byte `Noise` hides the seal from anyone who has only the auth token.
- `Fallback` seals are defined, but fallback proofs are not implemented yet (marked "TODO v0.13" in `txout.rs`).
- The closing witness is `SealWitness { published: Tx, client: Anchor { mmb_proof, mpc_protocol, mpc_proof, dbc_proof, fallback_proof } }`.

</TabItem>
</Tabs>

At the pinned versions, neither line carries SPV Merkle proofs or block headers in the witness. Wallets look transactions up through an indexer (Electrum, Esplora) to check that they exist and are confirmed. Line B 0.11.2-rc.1 (release candidate, 2026-10-09) adds optional SPV proofs to consignments.

## Seals and contracts

- One output can carry seals of several contracts at once. Spending it closes all of them, so the wallet must move every contract's state in the same witness transaction (Line B's `rgb-api` and `rgb-lib` build these "extra transitions" automatically for contracts you weren't sending).
- Seals of different contracts closed by one transaction share one commitment through MPC: one leaf per contract.
- Validation cost grows with the history a recipient checks. It is not constant per seal.

:::danger Coin selection
An ordinary Bitcoin wallet doesn't know which of your UTXOs hold RGB state. If it spends one, the seal closes without a valid RGB commitment and the assets on it are gone. Keep RGB UTXOs in the RGB wallet. Don't import the same seed into a Bitcoin wallet that may spend them.
:::

## Confirmations

A seal closed by a transaction that is only in the mempool is not final. The transaction can be replaced or never mined, and then the closing never happened. Wait for confirmations before treating received state as settled. Line A's `rgb-wallet` defaults to `--min-confirmations 32` for its own operations.

## Further reading

- [Single-use seals](https://docs.rgb.info/distributed-computing-concepts/single-use-seals) on docs.rgb.info (Line B).
- [`single_use_seals`](https://github.com/LNP-BP/client_side_validation) and [`bp-seals`](https://github.com/BP-WG/bp-core) (Line A).
- [Invoices](/technical-reference/invoices) for the `utxob:` / `wvout:` and `at:` / `wout:` forms.
