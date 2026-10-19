---
sidebar_position: 2
title: Owned State
description: State bound to a Bitcoin output. How it is defined, transferred and kept private in each RGB line.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Owned State

:::info Applies to both RGB lines
Both lines bind owned state to Bitcoin outputs; the data types differ. See [Two RGB lines](/getting-started/two-rgbs).
:::

**Owned state** is contract state assigned to a [single-use seal](../single-use-seals.md), a Bitcoin transaction output (`txid:vout`). Whoever can spend that output controls the state. Token balances, NFTs and issuance rights are owned state.

## Moving it

Every transfer follows the same steps:

1. The owner writes a new operation (a state transition) that **spends** the owned state on some seals and **assigns** new state to new seals. These are the recipient's seal, plus the owner's own change seal if needed.
2. The contract's rules check the operation. For a fungible asset this includes "inputs sum to outputs".
3. A Bitcoin transaction spends the old outputs and [commits](../bitcoin/deterministic-commitments.md) to the operation. This closes the old seals.
4. The owner sends the history to the recipient in a consignment. The recipient [validates](../client-side-validation.md) it.

```text
Before:   Alice  utxo_A : 1000
Operation: spend utxo_A : 1000  →  assign Bob utxo_B : 600, Alice utxo_C : 400
Witness tx: spends utxo_A, carries the commitment to the operation
After:    Bob    utxo_B : 600      Alice  utxo_C : 400
```

Bitcoin's no-double-spend rule means `utxo_A` can only be spent once, so its state can only move once.

## What owned state can hold

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

The schema gives each owned state type one of three forms (`rgb-consensus` 0.11.1 `src/schema/state.rs`, `src/operation/assignments.rs`):

| Form | Value | Used for |
|---|---|---|
| `Declarative` | none | Rights, e.g. IFA's `linkRight` |
| `Fungible` | a `u64` amount (the only fungible type) | Balances in NIA, IFA, CFA, PFA; IFA's inflation allowance |
| `Structured` | a strict-typed value (`SemId`) | NFT allocations in UDA |

Each assignment is either `Revealed { seal, state }` or `ConfidentialSeal { seal: SecretSeal, state }`. A recipient's blinded UTXO (`utxob:` invoice) shows up as a confidential seal in the sender's history.

There is no separate "attachment" state type. UDA media and attachments are data inside the strict-typed state, referenced by hash (see the [supported schemas](https://docs.rgb.info/rgb-contract-implementation/schema/supported-schemas) on docs.rgb.info).

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

Owned state is a **destructible memory cell** (`ultrasonic` 0.12.0 `src/state.rs`):

```rust
pub struct StateCell {
    pub data: StateValue,        // 0 to 4 field elements (fe256)
    pub auth: AuthToken,         // derived from the seal definition
    pub lock: Option<CellLock>,  // optional extra condition: aux data + a script entry point
}
```

The cell itself has no type. The contract's API (`sonic-api`) says how to read the field elements, e.g. as an amount, and it names the state (`balance` in the `RGB20-FNA` codex). The cell stores an `AuthToken`, not the seal. The seal definition travels in the consignment next to the operation.

</TabItem>
</Tabs>

Neither line has confidential amounts. Pedersen commitments were removed, so amounts are visible to everyone who receives the history.

## Several states on one output

One output can hold owned state from several assignments, or from several contracts. Spending it closes **all** of those seals at once. So whenever a wallet spends that output it must move all of that state in the same witness transaction, through [MPC](../bitcoin/multi-protocol-commitments.md) for the other contracts. RGB wallets do this automatically. A plain Bitcoin wallet doesn't.

:::danger Keep RGB outputs away from ordinary Bitcoin wallets
If a wallet that doesn't understand RGB spends an output holding RGB state, the seal closes without a valid commitment and the state is destroyed. Don't share an RGB wallet's seed with a regular Bitcoin wallet. Keep RGB-holding outputs out of manual coin selection.
:::

## Privacy

- **Seals are hidden from the sender.** In Line B the recipient gives a blinded seal (`SecretSeal`, a tagged hash with a random `u64` blinding). In Line A the recipient gives an `AuthToken`, whose seal is hidden behind 40 bytes of noise. Either way, the sender can't tell which UTXO received the state.
- **History is not public.** Only parties the state passed through see it. Each new owner learns the history back to genesis for the state they hold.
- **Amounts are not hidden** from those parties.

## Practical limits

- **Every holding needs a UTXO**, with enough sats to pass the dust limit. Receiving into many separate outputs costs fees to consolidate later.
- **The history must be kept.** Your wallet needs the consignments that prove your state. They are stored locally, not on chain.

:::danger Back up the RGB data
A seed alone can't restore owned state. Back up the wallet's RGB data directory (or use the wallet's backup feature) after every transfer.
:::
