---
sidebar_position: 1
title: Core Concepts Overview
description: The ideas behind RGB, how they fit together, and where the two RGB lines differ.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Core Concepts Overview

:::info Applies to both RGB lines
The core ideas are shared by both lines; the table below lists where they differ. See [Two RGB lines](/getting-started/two-rgbs).
:::

RGB is a system of smart contracts for Bitcoin in which **contract data stays off chain**. It rests on three ideas.

1. **[Client-side validation](./client-side-validation.md).** The contract's history is kept and checked by the people who hold its state, not by every node. A recipient validates everything from genesis to the state they receive.
2. **[Single-use seals](./single-use-seals.md).** Owned state is bound to Bitcoin transaction outputs. Moving the state means spending the output in a transaction that commits to the new state, and Bitcoin ensures an output can be spent only once. This stops double spends without a separate consensus layer.
3. **[Deterministic Bitcoin commitments](./bitcoin/deterministic-commitments.md).** Each witness transaction carries exactly one 32-byte commitment, in an [opret](./bitcoin/opret.md) or [tapret](./bitcoin/tapret.md) output. [Multi-protocol commitments](./bitcoin/multi-protocol-commitments.md) let many contracts share it.

On top of these sit:

- the **[state model](./state/unified-state.md)**: [owned state](./state/owned-state.md) bound to seals, and append-only [global state](./state/global-state.md);
- the contract rules: a **schema** in Line B, a **codex** in Line A;
- **[AluVM](./aluvm/overview.md)**, a deterministic VM for the programmable parts of those rules;
- **[strict types](/technical-reference/strict-types)**, the deterministic binary encoding of all of this data, and [Baid64](/technical-reference/encodings) for printing ids.

## What a transfer looks like

```text
Alice owns 1000 on utxo_A.  Bob sends Alice an invoice naming a seal (his UTXO, hidden).
Alice writes a transition:  spend utxo_A → 600 to Bob's seal, 400 to her change seal.
Alice builds a Bitcoin tx:  spends utxo_A; its first OP_RETURN or P2TR output commits to the transition.
Alice sends Bob a consignment: the history from genesis to his 600, plus the anchors.
Bob validates it and tells Alice it's fine. Only then does Alice sign and broadcast.
The Bitcoin tx confirms, Bob accepts the consignment, and the 600 is now Bob's.
```

This is the `rgb-cmd` (Line B) order. With `rgb-wallet` (Line A), Bob runs `accept` before Alice broadcasts, and his wallet then tracks the transaction ([Transferring assets](/guides/rgb20/transferring-assets)).

Nothing on chain says "RGB", shows amounts or names the contract. An observer sees an ordinary Bitcoin transaction with an `OP_RETURN` output (opret) or a taproot output (tapret).

## Where the two lines differ

| | Line B: v0.11 (rgb-cmd 0.11.1) | Line A: v0.12 (rgb-wallet 0.12.0-rc.3) |
|---|---|---|
| Contract rules | Schemas NIA, IFA, CFA, UDA, PFA (`rgb-schemas` 0.11.1); no separate interfaces | Codex plus API (SONIC / UltraSONIC), e.g. the `RGB20-FNA` codex |
| State | Typed: owned `Declarative` / `Fungible` (u64) / `Structured`, global values, metadata | Memory cells of up to four 256-bit field elements, plus raw bytes the VM can't read; no per-operation metadata (only contract-level `ContractMeta`) |
| VM | `rgb-aluvm` 0.11.1 (a, f, r and s registers) | zk-AluVM 0.12 (field-element registers) |
| Seals in invoices | `utxob:` (blinded UTXO), `wvout:` (witness output) | `at:` (auth token), `wout:` (witness output) |
| Contract id | `rgb:Ca0d5l5K-Cr4Wm6I-…` | `contract:nztjpjRX-_NVDDgd-…` |
| Tapret leaf prefix | 29 × `OP_RESERVED` (0x50) | 29 × `OP_NOP` (0x61) |
| Opret, MPC | Byte-identical in both | Byte-identical in both |
| MPC leaf message | Transition `BundleId` | Multi-message bundle (input → operation) |
| Lightning | [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) (alpha) | None from RGB-WG; Bitlight Labs has its own stack (unchecked) |
| Networks | Mainnet, testnet, signet, regtest | Testnet, signet, regtest; the CLI refuses mainnet |

Shared by both: no confidential amounts (Pedersen commitments were removed), no state extensions or valencies, and no zero-knowledge proofs of history yet.

:::danger Line A is testnet-only
`rgb-wallet` 0.12.0-rc.3 is a release candidate and refuses mainnet. Don't move real value with it.
:::

## Vocabulary you may meet

- **SONIC, UltraSONIC, codex, Prism** are RGB-WG (Line A) terms for parts of the v0.12 design. Line B doesn't use them.
- **Contractum** is a contract language RGB-WG proposed. No compiler has been released (`RGB-WG/contractum-lang` was last updated 2022-12-24), and neither line uses it. Contracts are written in Rust.
- **RGB20, RGB21, RGB25** were interface names in RGB v0.10 and the v0.11 betas. Line B 0.11.1 has no interfaces and names schemas directly (NIA, IFA, UDA, CFA, PFA). Line A uses the label in codex names such as `RGB20-FNA`.

## Further reading

- Line B: [docs.rgb.info](https://docs.rgb.info), the official documentation of the RGB Protocol Association.
- Line A: [rgb.tech](https://rgb.tech) and the [RGB black paper](https://black-paper.rgb.tech).
- Peter Todd, [Commitments and single-use seals](https://petertodd.org/2016/commitments-and-single-use-seals) (2016), where single-use seals were introduced.
