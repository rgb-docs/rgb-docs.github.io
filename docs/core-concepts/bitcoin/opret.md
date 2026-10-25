---
sidebar_position: 3
title: Opret
description: The OP_RETURN commitment scheme. A 34-byte script holding the 32-byte MPC commitment, identical in both RGB lines and the default in Line B wallets.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-25
image: /img/og/core-concepts/bitcoin/opret.png
---

# Opret

:::info Applies to both RGB lines
The opret format is byte-identical in both lines. See [Two RGB lines](/getting-started/two-rgbs).
:::

**Opret** is the simpler of the two [deterministic Bitcoin commitment](./deterministic-commitments.md) schemes. The 32-byte [MPC commitment](./multi-protocol-commitments.md) goes into a zero-value `OP_RETURN` output of the witness transaction.

## The script

```text
OP_RETURN  OP_PUSHBYTES_32  <mpc::Commitment>
  0x6a          0x20            32 bytes          = 34 bytes
```

That is all: no protocol tag, no version byte. The 32 bytes are the tagged MPC commitment (tag `urn:ubideco:mpc:commitment#2024-01-31`), and nothing in the script itself says "RGB". The verifier rejects an `OP_RETURN` script of any other length (`bp-core` 0.12.0 `dbc/src/opret/spk.rs`; `rgb-consensus` 0.11.1 `src/dbc/opret/`). The format is documented on the [docs.rgb.info opret page](https://docs.rgb.info/commitment-layer/deterministic-bitcoin-commitments-dbc/opret).

The full output is 43 bytes: an 8-byte value (zero), a 1-byte script length and the 34-byte script.

## The rules

- **First output only.** The commitment must be in the first output of the transaction that is `OP_RETURN` **or** P2TR. If a P2TR output comes before the `OP_RETURN`, the verifier looks for a tapret commitment in that P2TR output instead, and the opret output is ignored. See the [first-output rule](./deterministic-commitments.md#the-first-output-rule).
- **One commitment per transaction.** Several contracts share it through the MPC tree.
- **Placeholder, then fill.** When building the transaction, the wallet adds a bare `OP_RETURN` output (a 1-byte script). After the MPC tree is built, it replaces that output's script with the 34-byte commitment. The embed code refuses any other starting script (`bp-core` `dbc/src/opret/spk.rs`, `embed_commit`).

:::danger Don't edit the transaction after the commitment
Sign and broadcast the transaction exactly as the RGB wallet produced it. If you add a P2TR output in front of the `OP_RETURN`, or change the `OP_RETURN` payload, the anchor is invalid and the RGB state moved by that transaction is lost. Also send the consignment to the recipient, and keep your own copy, **before** you broadcast.
:::

## Who uses it

- **Line B.** `rgb-lib`, Line B's wallet library, always builds opret commitments: it calls `set_rgb_close_method(CloseMethod::OpretFirst)` (`rgb-lib` `src/wallet/online.rs`). `rgb-cmd` uses opret for `--wpkh` wallets.
- **Line A.** `rgb create --wpkh` makes an opret wallet. `--tapret-key-only` makes a tapret one.

Opret has not been deprecated in either line.

## Trade-offs against tapret

| | Opret | [Tapret](./tapret.md) |
|---|---|---|
| Extra output | One 43-byte zero-value output | None |
| On-chain visibility | A 32-byte `OP_RETURN` is visible and easy to fingerprint | Looks like an ordinary taproot output |
| Spending the change | Ordinary; no key tweak to back up | The tweak must be backed up, or the output can't be spent |
| Wallet support | Works with any output type for the other outputs | Needs a taproot wallet that tracks tapret tweaks |

## Bitcoin relay policy

`OP_RETURN` outputs are unspendable and are never added to the UTXO set. Since Bitcoin Core 0.11.0 (July 2015) the default relay limit for data carrier scripts was 83 bytes, with one such output per transaction. **Bitcoin Core 30.0 (October 10, 2025)** raised the default `-datacarriersize` to 100,000 and allows several `OP_RETURN` outputs per transaction ([release notes](https://bitcoincore.org/en/releases/30.0/)). A 34-byte opret script fits under both the old and new policy. These are relay-policy defaults, not consensus rules. Background: [OP_RETURN on the Bitcoin wiki](https://en.bitcoin.it/wiki/OP_RETURN).

Even when a transaction has several `OP_RETURN` outputs, RGB looks only at the first `OP_RETURN`-or-P2TR output.

Some nodes relay less than the default. Bitcoin Knots lets an operator turn `datacarrier` off or lower `datacarriersize`, and such a node refuses an opret payment it would otherwise accept. On the BLAKE2b testnet4 an explorer's node refused an opret payment that a Knots node with default settings accepted; a [tapret](./tapret.md) payment, which has no `OP_RETURN` output, went through. See [RGB on the BLAKE2b testnet4](/guides/development/rgb-on-blake).
