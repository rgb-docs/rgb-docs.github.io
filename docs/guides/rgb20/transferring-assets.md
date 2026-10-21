---
sidebar_position: 2
title: Transferring fungible assets
description: How an RGB transfer works (invoice, transfer, consignment, validation, broadcast, accept) with rgb-cmd and rgb-lib on v0.11, and with rgb-wallet on v0.12.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Transferring fungible assets

:::info Applies to both RGB lines
Both lines follow the same steps, but their invoices, consignments and wallets are incompatible. See [Two RGB lines](/getting-started/two-rgbs).
:::

An RGB transfer moves state from seals the payer owns to a seal the recipient controls. Only a commitment goes on chain. The data that proves the transfer, the **consignment**, goes directly from payer to recipient.

1. **Invoice.** The recipient creates an invoice naming the contract, the amount and a seal. The seal is either one of the recipient's UTXOs, blinded so the payer can't see which (`utxob:` in v0.11, `at:` auth tokens in v0.12), or a new output in the payer's transaction (`wvout:` / `wout:`).
2. **Transfer.** The payer's wallet selects RGB inputs, builds the state transition, commits it into a PSBT and writes the consignment, all in one step.
3. **Validate.** The recipient validates the consignment: the whole history back to genesis, against the schema (v0.11) or codex (v0.12).
4. **Sign and broadcast.** Only after the recipient has the consignment does the payer sign and publish the witness transaction.
5. **Accept.** The recipient adds the transfer to their stash. The timing depends on the tool: `rgb-cmd` 0.11.1 expects the witness transaction to be mined first (its `--force` flag is ignored); rgb-lib settles after the confirmations you asked for; `rgb-wallet` 0.12 accepts before broadcast and tracks the witness afterwards. The new allocation is spendable once its witness transaction confirms.

:::danger Consignment before broadcast
Send the consignment, and wait until the recipient has validated it, **before** you broadcast. If the witness transaction is published and the consignment is lost, the assets are gone for good. rgb-lib enforces this order: it broadcasts only after the recipient's ACK, unless you set `donation` to true.

Also:
- **Back up the RGB data**, not just the seed. A seed alone doesn't recover assets.
- **Let only the RGB wallet spend its UTXOs.** A Bitcoin-only wallet that spends a UTXO holding RGB state destroys it. When a UTXO holds allocations of several contracts, the RGB wallet moves all of them to change. Other wallets don't.
:::

Amounts are not hidden. Every recipient who validates a consignment sees the amounts in the history it contains. What RGB keeps private is everything not in your consignment, and the link between blinded seals and UTXOs.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## v0.11

### With the CLI

The [Quick Start](/getting-started/quick-start), steps 6–9, runs the whole flow on regtest. The commands are:

```bash line=B
# recipient
rgb -d data1 -w rcpt1 --electrum=localhost:50001 invoice --amount 100 "$contract_id"
# payer: writes the consignment and a PSBT that already commits to it
rgb -d data0 -w issuer --electrum=localhost:50001 transfer "$invoice" consignment.rgb tx.psbt
# recipient, before anything is broadcast
rgb -d data1 -w rcpt1 --electrum=localhost:50001 validate consignment.rgb
# payer signs with bp-hot (rgb doesn't sign), then finalizes and publishes
bp-hot sign -N tx.psbt wallets/0.derive
rgb -d data0 -w issuer --electrum=localhost:50001 finalize -p tx.psbt tx.tx
# recipient, after confirmation
rgb -d data1 -w rcpt1 --electrum=localhost:50001 accept consignment.rgb
```

An invoice looks like `rgb:<contract>/~/BF/bcrt:utxob:<blinded seal>`. Use `--address-based` for a `wvout:` invoice, and use long option names: in 0.11.1 the short flag `-a` belongs to three options of `invoice`. The fee for `transfer` is in sats (`--fee`, default 400). Details are in the [CLI reference (v0.11)](/technical-reference/cli-v011#transfer).

### With rgb-lib (Rust)

rgb-lib does the whole exchange through an [RGB proxy server](https://github.com/RGB-Tools/rgb-proxy-server): the payer posts the consignment, the recipient fetches it, validates it and posts an ACK, and the payer then broadcasts. Both sides call `refresh` to move the transfer forward.

This code is for `rgb-lib` 0.3.0-beta.7 (`src/wallet/singlesig.rs`, `src/wallet/online.rs`). It assumes two wallets, `alice` and `bob`, set up and online as in [Issuing fungible tokens](/guides/rgb20/creating-tokens) (`alice_online`, `bob_online`), and the `asset_id` String of an asset Alice holds. Inside a function returning `Result<_, Box<dyn std::error::Error>>` it passes `cargo check` (2026-10-21). It wasn't run.

```rust
use std::collections::HashMap;
use rgb_lib::wallet::{Invoice, Recipient, RgbWalletOpsOnline};
use rgb_lib::Assignment;

let proxy = "rpcs://proxy.iriswallet.com/0.2/json-rpc".to_string();
let expiry = (std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)?
    .as_secs()) + 3600;

// Recipient: blind one of its UTXOs and make an invoice.
let receive = bob.blind_receive(
    Some(asset_id.clone()),
    Assignment::Fungible(1_000),
    expiry,
    vec![proxy.clone()],
    1, // min confirmations
)?;
// Send receive.invoice to the payer.

// Payer: decode the invoice and send (fee rate in sat/vB).
let data = Invoice::new(receive.invoice)?.invoice_data();
let recipient = Recipient {
    recipient_id: data.recipient_id,
    witness_data: None, // Some(WitnessData { amount_sat, blinding }) for witness_receive invoices
    assignment: Assignment::Fungible(1_000),
    transport_endpoints: data.transport_endpoints,
};
let result = alice.send(
    alice_online,
    HashMap::from([(asset_id.clone(), vec![recipient])]),
    false, // donation: false = wait for the recipient's ACK before broadcasting
    2,     // fee rate
    1,     // min confirmations
    expiry,
)?;

// Both sides: refresh until the transfer is Settled.
bob.refresh(bob_online, None, vec![], false)?;   // fetch, validate, ACK
alice.refresh(alice_online, None, vec![], false)?; // see the ACK, broadcast
```

- `witness_receive` makes a `wvout:` invoice instead. The payer then creates the output, paying `amount_sat` to the recipient.
- For an external signer, use `send_begin` (it returns the PSBT), sign it, then call `send_end`.
- Pass an empty `transport_endpoints` list for out-of-band exchange, and move the files yourself with `provide_out_of_band_consignment` and `provide_out_of_band_ack`.
- One `send` can pay several recipients and several assets in one Bitcoin transaction, with one consignment per asset.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## v0.12

:::danger Release candidate, test networks only
`rgb-wallet` 0.12.0-rc.3 refuses mainnet. Use testnet4, signet or regtest.
:::

### With the CLI

The [Quick Start](/getting-started/quick-start), steps 2–4, uses the upstream demo wallets. `invoice` and `accept` run offline. `pay` doesn't: with the pinned binary and no indexer it exits with `Error: no blockchain indexer specified; use either --esplora or --electrum argument` (tested 2026-10-21), so pass `--esplora` or `--electrum` to it.

```bash line=A
# recipient (the contract must already be known: rgb accept -u <contract file>)
rgb -d examples/data2 invoice -w bob --nonce 0 DemoToken 10
# payer: writes the consignment and a ready-to-sign PSBT; needs an indexer
rgb -d examples/data pay -w alice --esplora "$INVOICE" transfer.rgb transfer.psbt
# recipient, before anything is broadcast
rgb -d examples/data2 accept -w bob transfer.rgb
# payer: sign the PSBT with your signer (rgb doesn't sign), then publish
rgb -d examples/data finalize -w alice --broadcast --esplora transfer.psbt
```

The invoice looks like `contract:tb@contract:<id>/10@at:<auth token>/`. Use `--wout` for a seal in a new output of the payer's transaction. The `pay` fee is absolute, in sats (`--fee`, default 1000), not a rate. **Don't run `complete` after `pay`**: `pay` already includes it. `complete` belongs to the `script` → `exec` → `complete` → `consign` workflow for custom payments ([CLI reference (v0.12)](/technical-reference/cli#exec)).

### In Rust

This is how rgb-wallet's own `pay` command does it, condensed from `cli/src/exec.rs` at v0.12.0-rc.3. `runtime` is an `rgbp::RgbRuntime` (crate `rgb-runtime`), built from a wallet and a contract stockpile with `RgbRuntime::with_components`. See `cli/src/args.rs` for how the CLI builds one. The `fs` feature is required: it provides `consign_to_file` (through `rgb-std/binfile`) and the file-based `RgbpRuntimeDir`.

```toml
[dependencies]
rgb-runtime = { version = "=0.12.0-rc.3", features = ["fs"] }
rgb-std = "=0.12.0-rc.3"
bp-std = "=0.12.0-rc.3"
```

```rust
use bpstd::psbt::TxParams;

// invoice: rgb::invoice::RgbInvoice<ContractId>; strategy: rgbp::CoinselectStrategy
let params = TxParams::with(fee_sats);
let (psbt, payment) = runtime.pay_invoice(&invoice, strategy, params, giveaway_sats)?;
// psbt is committed and ready to sign; write it out for the signer.
runtime
    .contracts
    .consign_to_file("transfer.rgb", invoice.scope, payment.terminals)?;
```

`pay_invoice` is `fulfill` (invoice → operation request), then `transfer`. `transfer` is `exec` (`compose_psbt`, then `color_psbt`), then `complete`. Call those steps yourself when you need to change the PSBT before it is committed. Keep the returned `Payment`: `runtime.rbf(&payment, new_fee)` rebuilds the transaction with a higher fee, but it panics if the payment has no change output (`src/runtime.rs`).

The recipient side is `RgbWallet::consume` (CLI `rgb accept`). The witness status of an operation (`Mined`, `Tentative`, `Offchain`, `Archived`) is tracked in the contract's pile and updated by `rgb sync`.

</TabItem>
</Tabs>

## Next

- [Secondary issuance](/guides/rgb20/secondary-issuance) (v0.11 IFA)
- [Invoices](/technical-reference/invoices) and [Consignments](/technical-reference/consignments)
