---
sidebar_position: 4
title: State Transitions
description: What an RGB state transition contains on each line, how it is committed to Bitcoin, and the CLI flow that creates one.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# State Transitions

:::info Applies to both RGB lines
The idea is the same on both lines, but the structures, commands and files differ and can't be mixed. See [Two RGB lines](/getting-started/two-rgbs).
:::

A state transition is a contract operation after [genesis](./genesis.md). It:

- **consumes** owned state by closing its seals, which means spending the Bitcoin outputs that hold it;
- **creates** new owned state, assigned to new seals (the recipient's and your change);
- may **add** global state, which is append-only and is never modified or deleted;
- is **validated client-side**: the contract's own code (AluVM) checks it, for example that amounts are conserved.

The transition itself never goes on chain. The transaction that spends the seals (the **witness transaction**) carries a 32-byte commitment to it, in an `OP_RETURN` output (opret) or in a taproot output (tapret), through a multi-protocol commitment. See [Deterministic commitments](/core-concepts/bitcoin/deterministic-commitments). The recipient gets the transition and its history from the sender in a [consignment](/technical-reference/consignments) and validates them.

Transitions aren't signed with holder keys. Closing a seal requires spending its output, so the Bitcoin signature on the witness transaction is what authorizes a transfer.

:::danger Before you broadcast
- **Send the consignment first.** Give it to the recipient and let them validate or accept it before you publish the witness transaction. If the transaction is mined and the consignment is lost, the assets are lost.
- **Every allocation on a spent output must move.** If an output you spend also holds state from another contract, the witness transaction has to carry a transition for that contract too, or that state is destroyed. rgb-lib, `rgb-cmd` and `rgb-wallet` do this for you. Don't build these transactions with your own coin selection.
- **Back up tapret wallets.** A tapret commitment tweaks your output key. Without the RGB data directory, a seed-only wallet can't find or spend that output.
:::

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## Line B

From [`rgb-consensus` `src/operation/operations.rs`](https://github.com/rgb-protocol/rgb-consensus/blob/0.11.1/src/operation/operations.rs):

```rust
// rgb-consensus 0.11.1
pub struct Transition {
    pub ffv: Ffv,
    pub contract_id: ContractId,
    pub nonce: u64,
    pub transition_type: TransitionType, // defined by the schema, e.g. NIA's `transfer`
    pub metadata: Metadata,
    pub globals: GlobalState,            // new global state, if the schema allows it
    pub inputs: Inputs,                  // the previous outputs (Opout) being consumed
    pub assignments: Assignments<GraphSeal>,
    pub signature: Option<Signature>,    // optional issuer-style signature, used by PFA
}
```

There's no anchor or proof inside the transition. All transitions of one contract that a witness transaction closes seals for are grouped in a [`TransitionBundle`](./bundles.md). Bundles of different contracts share the transaction through the multi-protocol commitment. The schema decides which transitions exist. NIA, for instance, has only `transfer`, while IFA adds `inflate`, `burn` and `link` (`rgb-schemas` `src/ifa.rs`).

### CLI flow

| Step | Who | Command |
|---|---|---|
| 1 | Recipient | `rgb invoice --amount 100 <CONTRACT_ID>` |
| 2 | Sender | `rgb transfer <INVOICE> <CONSIGNMENT> <PSBT>` writes the consignment and a PSBT that already contains the commitment |
| 3 | Recipient | `rgb validate <CONSIGNMENT>` |
| 4 | Sender | Sign the PSBT with the key holder (for example `bp-hot sign`), then `rgb finalize -p <PSBT>` (`-p` publishes the transaction) |
| 5 | Recipient | After the transaction confirms, `rgb accept <CONSIGNMENT>` (the `-f` flag is ignored in 0.11.1) |

```bash line=B
rgb -d data1 -w rcpt1 invoice --amount 100 "$contract_id"
rgb -d data0 -w issuer transfer "$invoice" transfer.rgb transfer.psbt
rgb -d data1 -w rcpt1 validate transfer.rgb
bp-hot sign -N transfer.psbt wallets/0.derive
rgb -d data0 -w issuer finalize -p transfer.psbt transfer.tx
rgb -d data1 -w rcpt1 accept transfer.rgb
```

Each command also needs `-n regtest --electrum=localhost:50001` or your own indexer. The full walkthrough is in [Quick Start](/getting-started/quick-start), and every flag is in the [v0.11 CLI reference](/technical-reference/cli-v011#transfer). In an app, rgb-lib's `send` and `refresh` do all of this, and move the consignment through an RGB proxy server. See [Wallet integration](../development/wallet-integration.md).

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## Line A

:::danger Release candidate, test networks only
`rgb-wallet` 0.12.0-rc.3 refuses mainnet. Use testnet4, signet or regtest.
:::

In v0.12 a transition is an `Operation` ([`ultrasonic` 0.12.0 `src/operation.rs`](https://github.com/AluVM/ultrasonic/blob/v0.12.0/src/operation.rs)):

```rust
// ultrasonic 0.12.0
pub struct Operation {
    pub version: ReservedBytes<1>,
    pub contract_id: ContractId,
    pub call_id: CallId,                       // which codex method is called
    pub nonce: fe256,
    pub witness: StateValue,                   // operation-wide witness data
    pub destructible_in: SmallVec<Input>,      // owned state being consumed (seals closed)
    pub immutable_in: SmallVec<CellAddr>,      // global state being read
    pub destructible_out: SmallVec<StateCell>, // new owned state
    pub immutable_out: SmallVec<StateData>,    // new global state
}
```

`rgb-core` 0.12 removed transition bundles, anchors, valencies and state extensions from consensus ([CHANGELOG](https://github.com/RGB-WG/rgb-core/blob/master/CHANGELOG.md)). When an operation closes seals, `rgb-core` checks that its witness transaction closes them with a commitment to the operation (`src/verify.rs`). The wallet groups the operations for one transaction in a `PrefabBundle` (`rgb-std` `src/popls/bp.rs`). Its documentation says it "should cover all contracts assigning state to the witness transaction previous outputs".

### CLI flow

| Step | Who | Command |
|---|---|---|
| 1 | Recipient | `rgb invoice -w bob --nonce 0 DemoToken 10` |
| 2 | Sender | `rgb pay -w alice <INVOICE> transfer.rgb transfer.psbt` writes the consignment and an unsigned PSBT |
| 3 | Sender | Sign the PSBT with the wallet that holds the keys (`rgb` doesn't sign) |
| 4 | Recipient | `rgb accept -w bob transfer.rgb` |
| 5 | Sender | `rgb finalize -w alice --broadcast --esplora transfer.psbt` |

```bash line=A
rgb invoice -w bob --nonce 0 DemoToken 10
rgb pay -w alice "$INVOICE" transfer.rgb transfer.psbt
rgb accept -w bob transfer.rgb
rgb finalize -w alice --broadcast --esplora transfer.psbt
```

`pay` already completes the PSBT. Don't run `rgb complete` on it: `complete` is for bundles made with `rgb exec`. This is the flow of [`examples/demo.sh`](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/examples/demo.sh) plus signing and broadcast. All flags are in the [v0.12 CLI reference](/technical-reference/cli#pay).

</TabItem>
</Tabs>
