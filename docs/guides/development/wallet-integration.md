---
sidebar_position: 3
title: Wallet Integration
description: What an RGB wallet must do on top of a Bitcoin wallet, and how to do it with rgb-lib (v0.11) or rgb-runtime (v0.12) instead of reimplementing RGB.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Wallet Integration

:::info Applies to both RGB lines
The responsibilities are the same on both lines. The libraries, invoices and data files differ and can't be mixed. See [Two RGB lines](/getting-started/two-rgbs).
:::

An RGB wallet is a Bitcoin wallet that also keeps client-side contract data. Besides UTXOs and keys, it tracks which outputs hold RGB state, keeps the contract history (the stash), exchanges consignments, and validates what it receives.

## Responsibilities

1. **UTXO management**: know which outputs carry RGB allocations, and never spend them by accident.
2. **State management**: keep the stash, the local copy of every contract's history the wallet cares about.
3. **Transfer coordination**: create invoices, build PSBTs that carry commitments, and exchange consignments.
4. **Validation**: check every incoming consignment against the contract's rules before treating it as received.
5. **Backup and recovery**: preserve both the Bitcoin keys and the RGB data.

```text
User interface (balance, send, receive, history)
        |
RGB library: rgb-lib (B) or rgb-runtime (A)
  invoices, transfers, consignments, validation, coin selection
        |                                   |
RGB data directory                    Bitcoin wallet
  (stash, state)                        (keys, UTXOs)
        |                                   |
Consignment transport                 Electrum or Esplora indexer
```

Let the library do steps 1 to 4. The stash format, transition building, validation and coin selection are consensus-critical. A home-made version can accept invalid assets or burn valid ones.

:::danger Rules that protect funds
- **A seed alone doesn't recover RGB assets.** Contract history lives only off chain, in the wallet's data directory. Restoring a mnemonic and rescanning the chain gives you back the bitcoin, not the assets. Back up the RGB data as well.
- **Back up tapret tweaks.** A tapret commitment tweaks the output key. Without the data directory that records the tweak, you can't spend that output.
- **Never write your own coin selection.** An output can hold allocations of several contracts. If you spend it without moving every one of them, the ones you left out are destroyed. The libraries add the needed transitions. A plain Bitcoin wallet that shares the same keys does not.
- **Consignment before broadcast.** Deliver the consignment (and on Line B wait for the recipient's ACK) before you publish the witness transaction.
- **Line A is testnet only**, and [RGB Lightning Node](/guides/lightning/overview) is alpha software.
:::

## Keys and derivation

rgb-lib derives two BIP32 accounts from one mnemonic (`src/utils.rs`, `src/keys.rs` at 0.3.0-beta.7):

| Keychain | Mainnet | Testnet, signet, regtest |
|---|---|---|
| Colored (RGB allocations) | `m/86'/827166'/0'` | `m/86'/827167'/0'` |
| Vanilla (plain bitcoin, fees) | `m/86'/0'/0'` | `m/86'/1'/0'` |

The purpose is 86 for `WitnessVersion::Taproot` and 84 for `SegWitV0`. Keeping colored and vanilla coins on separate accounts is how rgb-lib stops ordinary payments from spending RGB outputs. Line A's `rgb` CLI takes an account descriptor you supply (`rgb create --wpkh` or `--tapret-key-only`). It doesn't derive keys or sign.

Keep keys in the platform keychain (Keychain, Android Keystore, Secret Service) or a hardware signer, never in app code, config files or unencrypted storage. Hardware wallets don't know about tapret tweaks. If you sign with one, use opret commitments or check that your signer supports the tweak.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## Line B with rgb-lib

[rgb-lib](https://github.com/RGB-Tools/rgb-lib) handles all five responsibilities. The same calls exist in Rust and in the Kotlin, Swift and Python bindings. The [Node.js](./rgbjs.md) bindings lack the IFA calls. Argument lists are in the [Rust guide](./rust-sdk.md).

| Step | Call | Notes |
|---|---|---|
| Open | `Wallet::new(WalletData, SinglesigKeys)`, `go_online(OnlineOptions)` | The data directory holds the SQLite database and the RGB stash. |
| Prepare | `create_utxos(...)` | Creates colored UTXOs to hold allocations. `WalletData::max_allocations_per_utxo` caps how many go on one output. |
| Receive | `blind_receive(...)` or `witness_receive(...)` | Blinded (`utxob:`) invoices hide which UTXO receives. Witness invoices pay to an address in the sender's transaction. Both take an expiration (a UTC Unix timestamp, not a duration) and the transport endpoints. |
| Send | `send(...)`, or `send_begin` + external signing + `send_end` | Selects inputs, adds transitions for every allocation on them, commits with opret, and posts the consignment to the proxy. |
| Settle | `refresh(online, asset_id, filters, skip_sync)` on both sides | The recipient validates the consignment and ACKs or NACKs it through the proxy. The sender broadcasts after the ACK. Transfers settle after the requested confirmations. |
| Back up | `backup(path, password)`, `backup_info()`; `restore_backup(path, password, target_dir)` | An encrypted archive of the whole wallet directory, RGB data included. |

Consignments travel through an [RGB proxy server](https://github.com/RGB-Tools/rgb-proxy-server) given in the invoice's transport endpoints, such as `rpc://127.0.0.1:3000/json-rpc`. Pass an empty endpoint list to exchange them out of band instead (`provide_out_of_band_consignment` / `provide_out_of_band_ack`).

Every time the wallet goes online, rgb-lib checks that its UTXO set hasn't changed behind its back. It returns `Inconsistency` ("spent bitcoins with another wallet") if it has. Don't turn this off with `skip_consistency_check` in production.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## Line A with rgb-runtime

`rgb-runtime` 0.12.0-rc.3 provides the RGB side. You supply keys and signing. The [Rust guide](./rust-sdk.md) has a compiled example. The CLI does the same steps:

| Step | Runtime | CLI |
|---|---|---|
| Open | `RgbpRuntimeDir::from(RgbWallet::with_components(Owner::with_components(network, FileHolder::load(..), resolver), contracts))` | `rgb create`, `rgb sync` |
| Receive | `auth_token(nonce)` or `wout(nonce)` gives the seal for an invoice | `rgb invoice` (an `at:` auth-token seal on your UTXO, or `--wout` for a witness output) |
| Send | `pay_invoice(&invoice, strategy, TxParams, giveaway)` returns the PSBT and a `Payment`; `contracts.consign_to_file(..)` writes the consignment | `rgb pay` |
| Accept | `consume_from_file(..)` validates and imports the consignment | `rgb accept` |
| Broadcast | `finalize(psbt, meta)` after signing | `rgb finalize --broadcast` |
| Back up | Copy the data directory; per contract, `export_to_file` | `rgb backup <contract> <file>` writes one contract as a consignment. It doesn't save the wallet. |

Coin selection is the `CoinselectStrategy` passed to `pay_invoice`: `aggregate` or `smallsize`. When the spent outputs hold other contracts' state, the wallet adds blank operations for them, and fails with `ChangeRequired` if there's no change output to put them on (`rgb-std` `src/popls/bp.rs`). There's no transport server: you move the consignment file yourself. See the [v0.12 CLI reference](/technical-reference/cli#pay).

</TabItem>
</Tabs>

## Backups

A complete backup has three parts:

1. **The mnemonic or keys**, stored offline.
2. **The RGB data directory**: stash, state, index and, for tapret wallets, the commitment tweaks. It changes with every transfer, so back it up after each one. On Line B, `backup_info()` tells you when a new backup is needed.
3. **The backup password**, if the archive is encrypted.

On Line B, `backup()` writes an encrypted archive and `restore_backup()` restores it. If you encrypt a Line A data directory yourself, use an authenticated cipher such as AES-GCM with a random nonce, and derive the key with scrypt or Argon2 (or PBKDF2 at OWASP's current iteration counts). Test restores regularly, on a separate machine, with the wallet offline on the original.

## Privacy

- Prefer blinded receive (`blind_receive` on Line B, `at:` seals on Line A) when the payer shouldn't learn your UTXO.
- Don't reuse addresses or invoices, and don't mix colored and vanilla coins.
- Use Tor or your own indexer: the indexer sees every output your wallet queries.
- Amounts aren't hidden on either line. Anyone who validates the contract's history can see them.
