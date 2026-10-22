---
sidebar_position: 8
title: Troubleshooting
description: Real error messages from the rgb CLIs of both RGB lines, what causes them, and the fix.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/technical-reference/troubleshooting.png
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Troubleshooting

:::info Applies to both RGB lines
The two lines have different CLIs that share the binary name `rgb`, so first check which one you are running. See [Two RGB lines](/getting-started/two-rgbs).
:::

The messages below are copied from the pinned binaries or their source.

## Which `rgb` is this?

{/* snippet:skip: meant to be run against either binary */}
```bash
rgb --version
```

- `rgb-cmd 0.11.1`: Line B.
- `error: unexpected argument '--version' found`: probably Line A, whose `rgb` has no `--version`. `rgb --help` lists `init`, `wallets`, `fund`, `seals`, `pay` and `script`.
- Any other version: the wrong crate. The crate `rgb-cli` is the old 0.9.1 (2023) tool from before v0.10, and a plain `cargo install rgb-wallet` installs 0.10.9, an old RGB v0.10 release of the same crate. Reinstall with the exact version, as in [Installation](/getting-started/installation):

```bash line=B
cargo install --locked rgb-cmd --version 0.11.1
```

```bash line=A
cargo install --locked rgb-wallet --version 0.12.0-rc.3
```

Both binaries are called `rgb`, so `which -a rgb` shows whether both are on your `PATH`.

## Errors by line

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

| Message | Cause and fix |
|---|---|
| `Unable to find or parse config file; using config defaults` | Not an error. There is no `rgb.toml` yet |
| `Error: no blockchain indexer specified; use either --esplora --mempool or --electrum argument` | The command needs chain data. `create` prints this and then **doesn't save the wallet** (exit 1). Pass an indexer, as in `--electrum=localhost:50001` |
| `Error: resolver error:  - error: no transaction resolver is specified; use either --esplora --mempool or --electrum argument` | `validate`, `accept` or importing a contract consignment needs an indexer to check witness transactions. Pass one with a full URL |
| Esplora or Mempool errors for a URL containing `{network}` | A bare `--esplora` or `--mempool` keeps the literal `{network}` placeholder outside wallet sync. Give the full URL ([rgb-api#14](https://github.com/rgb-protocol/rgb-api/issues/14)) |
| Connection errors to `example.com:50001` | A bare `--electrum` without `=<URL>` uses a placeholder server. Always write `--electrum=<URL>` |
| `ELECTRUM_SERVER` has no effect | The variable is misspelt `ELECRTUM_SERVER` in `bp-wallet` 0.11.1-alpha.2. Pass `--electrum=<URL>` ([BP-WG/bp-wallet#96](https://github.com/BP-WG/bp-wallet/issues/96)) |
| `Loading descriptor from wallet default ... Error: No such file or directory (os error 2)` | No wallet named `default` (or the `-w` name) exists for this network and data directory. Check `-n` and `-d`; the default network is `testnet3` |
| `blinded invoice requested but no suitable outpoint is available` | `rgb invoice` without `--address-based` needs an unspent output in the wallet. Fund it, or use `--address-based` |
| `only amount or token data should be provided` | `invoice` got both `--amount` and `--token-index`, or neither |
| `invalid assignment name for state type` | `--assignment-name` doesn't match the kind of state (`--amount` for fungible, `--token-index` for UDA) |
| `error: invalid value '…' for '<CONTRACT_ID>': invalid length of identifier …` or `… Invalid last symbol …` | A truncated or mistyped contract id. Copy the full `rgb:…` id from `rgb contracts` |
| `Error: unexpected end of file` on `import` | The file isn't a strict-encoded kit or consignment, or is truncated |
| `state provided via PSBT inputs is not sufficient to cover invoice state requirements` | Not enough of the asset in the selected UTXOs |
| `the invoice has expired` | Ask the receiver for a new invoice |
| `invoice requesting chain-network pair … but contract commits to a different one` | Invoice and contract are on different networks |
| ``use `validate` and `accept` commands to work with …`` | `import` was given a transfer consignment. Use `rgb validate` and `rgb accept` |

The full error list is in `rgb-api` 0.11.1 `src/errors.rs` and `rgb-ops` 0.11.1 `src/persistence/stock.rs`. Errors exit with code 1, and usage errors with code 2.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

| Message | Cause and fix |
|---|---|
| ``Error: the data directory at '…/bitcoin.testnet' is not initialized; please initialize it with `init` command …`` | Run `rgb init` once, with the same `-d` and `-n` |
| `Abnormal program termination through panic.` `Error: Non-testnet networks are not yet supported` (exit 101) | rc.3 refuses mainnet. Use `-n testnet4` (the default), `signet` or `regtest` |
| ``Error: unable to load wallet from path `…/alice.wallet` `` `Details: No such file or directory` (exit 101) | The rc.3 `create` bug: `rgb create alice …` writes `…/alice`, but other commands read `…/alice.wallet`. Create it as `alice.wallet` and use `-w alice`. See [`create`](./cli.md#create). If the path ends in `default.wallet`, you left out `-w` ([RGB-WG/rgb#323](https://github.com/RGB-WG/rgb/issues/323)) |
| `Error: data directory at '…' is already initialized` | `init -q` fails on an existing directory, the opposite of what its help says. Run `init` without `-q` ([RGB-WG/rgb#324](https://github.com/RGB-WG/rgb/issues/324)) |
| `Error: no xpub key origin information.` | The descriptor needs the key origin, as in `"[<fp>/84h/1h/0h]<tpub>/<0;1>/*"` |
| ``a type of wallet descriptor must be specified either with `--tapret-key-only` or `--wpkh` `` | Add one of the two flags to `create` |
| `Unable to connect to the indexing server` (panic) | The indexer URL is wrong or unreachable. A bare `--electrum` uses `mycitadel.io:50001` |
| `ELECTRUM_SERVER` has no effect | The variable is misspelt `ELECRTUM_SERVER` in `cli/src/opts.rs`. Pass `--electrum=<URL>` ([RGB-WG/rgb#322](https://github.com/RGB-WG/rgb/issues/322)) |
| `Error: unknown contract '…'` | The wallet doesn't know that contract name or id. Check `rgb contracts` |
| ``Wallet has no unspent outputs; try `fund` first, or use `-w` flag to generate a witness output-based seal`` | `invoice` needs a UTXO for an `at:` seal. Fund the wallet, or use `--wout` (the message says `-w`, which is the wallet flag) |
| `the state owned by the wallet is not enough to fulfill the invoice` | Not enough of the asset |
| `unknown … can't be consumed; please import contract articles first` | `accept` got a transfer for a contract the wallet doesn't have. Accept the contract first, or use `accept -u` |
| `PSBT still contains N non-finalized inputs, failing to extract transaction` | The PSBT isn't fully signed. Sign it with your Bitcoin wallet before `finalize` |

Errors exit with code 1, usage errors with 2 and panics with 101. Sources: `rgb-wallet` 0.12.0-rc.3 `cli/src/args.rs` and `cli/src/exec.rs`, `rgb-std` 0.12.0-rc.3 `src/popls/bp.rs` and `src/contract.rs`.

</TabItem>
</Tabs>

## Before you report a bug

- Check the line and version (above), and the network (`-n`) and data directory (`-d`) of every command.
- Neither CLI talks to Bitcoin Core RPC. Both need an Electrum, Esplora or (Line B) Mempool indexer for the right network.
- A build failing on missing headers usually needs `build-essential`, `pkg-config` and `libssl-dev` (Debian and Ubuntu). Line B's sandbox also needs `libsqlite3-dev`.

:::danger Don't try to "fix" a stuck transfer by spending UTXOs
If a transfer looks stuck, don't spend the wallet's UTXOs from another Bitcoin wallet, and don't delete the RGB data directory. Either can destroy the assets for good. Back up the data directory first, then ask for help.
:::

Where to ask:

- Line B: [rgb-protocol](https://github.com/rgb-protocol) and [RGB-Tools](https://github.com/RGB-Tools) issue trackers, and [docs.rgb.info](https://docs.rgb.info)
- Line A: the [RGB-WG/rgb](https://github.com/RGB-WG/rgb/issues) issue tracker
