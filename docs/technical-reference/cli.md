---
sidebar_position: 2
title: CLI reference (v0.12)
description: Every command, flag, alias and environment variable of the rgb command from rgb-wallet 0.12.0-rc.3 (Line A).
rgb_line: A
verified_with: rgb-wallet 0.12.0-rc.3
last_update:
  date: 2026-10-21
---

# CLI reference (v0.12)

:::info RGB v0.12 line (rgb-wallet 0.12.0-rc.3, release candidate)
This page covers the `rgb` binary from the `rgb-wallet` crate. The v0.11 binary has the same name but different commands: see [CLI reference (v0.11)](/technical-reference/cli-v011) and [Two RGB lines](/getting-started/two-rgbs).
:::

This reference was generated from `rgb --help` and `rgb <command> --help` of the pinned binary (cached in `scripts/cli-help/A.json`), and from the clap definitions in [`cli/src/`](https://github.com/RGB-WG/rgb/tree/v0.12.0-rc.3/cli/src) at tag `v0.12.0-rc.3`. Install it with `cargo install --locked rgb-wallet --version 0.12.0-rc.3`.

:::danger Testnet only
Any command that opens the contract store panics on a non-test network, with the message "Non-testnet networks are not yet supported" (`cli/src/args.rs`). `-n bitcoin` / `-n mainnet` don't work in rc.3.
:::

## Global options

These options are accepted by every command. The binary has no `--version` flag.

| Option | Env | Default | Meaning |
|---|---|---|---|
| `-d, --data-dir <DIR>` | `RGB_DATA_DIR` | `~/.local/share/rgb` (Linux), or `$XDG_DATA_HOME/rgb`; `~/Library/Application Support/RGB Smart Contracts` (macOS) | Data directory |
| `-n, --network <NET>` | `RGB_NETWORK` | `testnet4` | `bitcoin`/`mainnet`, `testnet`/`testnet3`, `testnet4`, `signet`, `regtest` |
| `--no-network-prefix` | `RGB_NO_NETWORK_PREFIX` | off | Use the data directory as given, without the network subdirectory |
| `--min-confirmations <N>` | — | `32` | Confirmations after which an operation counts as final |

**Data directory layout.** Data goes in `<data-dir>/bitcoin.testnet` for every test network, and `<data-dir>/bitcoin` for mainnet. After the quick-start steps, it contains:

```text
bitcoin.testnet/
├── alice.wallet/            descriptor.toml, utxo.toml
├── DemoToken.<contract-id>.contract/
└── Fungible Non-inflatable Asset.<codex-id>.issuer
```

### Wallet and indexer options

Commands that use a wallet take `-w, --wallet <NAME>` (env `RGB_WALLET`). Without it, they use the wallet named `default`, and if `<data-dir>/<network dir>/default.wallet` doesn't exist they panic with ``unable to load wallet from path `…/default.wallet` `` (exit 101). `sync` and `fund` take the wallet as a positional argument instead.

Commands that can reach the chain also take these options:

| Option | Env | Bare default | Meaning |
|---|---|---|---|
| `--electrum[=<URL>]` | `ELECRTUM_SERVER` (sic) | `mycitadel.io:50001` | Electrum server |
| `--esplora[=<URL>]` | `ESPLORA_SERVER` | `https://mempool.space/{network}/api` | Esplora server. `{network}` becomes e.g. `testnet4` |
| `--sync` | — | off | Sync the wallet with the indexer before the command runs (not on `sync`) |

- **The `=` is required.** `--electrum ssl://host:port` is parsed as a positional argument, so write `--electrum=ssl://host:port`.
- **The environment variable is misspelt** `ELECRTUM_SERVER` in `cli/src/opts.rs:42`, and it is still misspelt on `master`. Setting `ELECTRUM_SERVER` does nothing.
- `RUST_LOG` has no effect, because the CLI installs no logger.

## Commands

| Command | Alias | Purpose |
|---|---|---|
| [`init`](#init) | | Initialize the data directory |
| [`wallets`](#wallets) | | List known wallets |
| [`create`](#create) | | Create a wallet from a descriptor |
| [`sync`](#sync) | | Sync a wallet and contracts with the blockchain |
| [`fund`](#fund) | | Print a receive address for gas funding |
| [`seals`](#seals) | | List the wallet's available seals (UTXOs) |
| [`import`](#import) | | Import contract issuers |
| [`export`](#export) | | Export a contract issuer |
| [`contracts`](#contracts) | | List contracts (and issuers) |
| [`issue`](#issue) | | Issue a new contract |
| [`purge`](#purge) | | Remove a contract and all its data |
| [`backup`](#backup) | | Save a whole contract as a consignment |
| [`state`](#state) | `s` | Print contract state |
| [`invoice`](#invoice) | `i` | Generate an invoice |
| [`pay`](#pay) | `p` | Pay an invoice: PSBT + consignment |
| [`script`](#script) | | Turn an invoice into a payment script |
| [`exec`](#exec) | `x` | Run a payment script: bundle + PSBT |
| [`complete`](#complete) | | Add commitments to an `exec` PSBT |
| [`consign`](#consign) | | Make a consignment for given terminals |
| [`finalize`](#finalize) | | Finalize a signed PSBT, extract, optionally broadcast |
| [`accept`](#accept) | `a` | Verify and accept a consignment |

The aliases are hidden: they work, but `--help` doesn't list them.

Most commands print nothing on success; the output lines shown on this page are real. Errors come from `anyhow` with exit code 1. Usage errors come from clap with exit code 2. Panics, such as the mainnet check or a missing wallet, exit with 101.

### init {#init}

`rgb init [-q]`. Creates `<data-dir>/<network dir>`, and prints nothing.

- `-q, --quiet`: the help says "do nothing" if the directory exists. In rc.3 it does the opposite. Without `-q`, `init` on an existing directory exits 0 silently. With `-q`, it fails with `Error: data directory at '…' is already initialized` (observed with the pinned binary; `cli/src/args.rs`).

Every other command fails until the directory exists, with: `the data directory at '…' is not initialized; please initialize it with init command …`.

### wallets {#wallets}

`rgb wallets`. Prints one wallet name per line, or `No wallets found` on stderr. Only `<name>.wallet` directories are listed (see the `create` bug).

### create {#create}

`rgb create (--wpkh | --tapret-key-only) <NAME> <DESCRIPTOR>`

- `<DESCRIPTOR>` is an extended-key descriptor such as `[cf05f8ea/84h/1h/0h]tpubDCpZ…/<0;1>/*`, the format of `examples/data/bitcoin.testnet/alice.wallet/descriptor.toml`. It is not a `wpkh(...)` or `tr(...)` output descriptor.
- `--wpkh` creates an opret-only P2WPKH wallet. `--tapret-key-only` creates a taproot key-only wallet that uses tapret commitments. You must pick one, or you get `Error: a type of wallet descriptor must be specified either with --tapret-key-only or --wpkh`.

:::warning rc.3 bug: wallet name
`create` writes `<data>/<NAME>` (`cli/src/exec.rs:104`), but every other command loads `<data>/<NAME>.wallet`. Give the suffix yourself:

```bash
rgb create --wpkh alice.wallet "[<fp>/84h/1h/0h]<tpub>/<0;1>/*"
rgb wallets
```

`rgb wallets` then lists `alice`, and `-w alice` works.
:::

:::danger Back up tapret wallets
Keys alone don't recover RGB state. For `--tapret-key-only` wallets they also don't recover the tapret tweaks needed to spend outputs that carry commitments. Back up the whole data directory, not only the keys.
:::

### sync {#sync}

`rgb sync [WALLET] [--electrum[=URL] | --esplora[=URL]]`. The wallet is positional (env `RGB_WALLET`), and `sync -w alice` is a usage error.

```bash
rgb sync alice --esplora
```

### fund {#fund}

`rgb fund [WALLET]`. Prints the wallet's next receive address. The wallet is positional.

### seals {#seals}

`rgb seals [-w WALLET] [--sync] [--electrum[=URL] | --esplora[=URL]]`. Prints the wallet's UTXOs, one `txid:vout` per line. Use one as the `seal:` in an issue file.

### import {#import}

`rgb import [FILE]...`. Imports contract **issuer** files (`*.issuer`). To import a contract, use `accept`.

```bash
rgb import examples/RGB20-FNA.issuer
```

Real output:

```text
Processing 'RGB20-FNA.issuer' ... codex id 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet ... success
```

A second import prints `already known, skipping`. Issuers are published in [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers).

### export {#export}

`rgb export [-f] <CODEX> <FILE>`. Saves the issuer for codex `<CODEX>` to `<FILE>`. Use `-f, --force` to overwrite. If the codex isn't known, it fails with `unknown issuer '<codex>'`.

### contracts {#contracts}

`rgb contracts [-i]`. Prints each contract as a YAML block (id, name, issuer, timestamp, codex, consensus, testnet). With `-i, --issuers`, it first lists the issuers, with the columns Codex ID, Codex name, Standard (e.g. `RGB-20`) and Developer.

### issue {#issue}

`rgb issue [-q] [-w WALLET] [PARAMS]`

- With no `PARAMS`, it lists the issuers you can issue under. Real output:

  ```text
  To issue a new contract, please specify a parameter file. A contract may be issued under one of the codex listed below.

  Name                            	ID                                                              	Developer
  Fungible Non-inflatable Asset   	7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet	dns:pandoraprime.ch
  ```

- With `PARAMS`, a YAML `CreateParams` file such as [`examples/DemoToken.yaml`](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/examples/DemoToken.yaml), it issues the contract and prints its ID. Real output:

  ```text
  A new contract issued with ID contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y
  ```

- `-q, --quiet` exits 0 without printing an error if issuing fails.

Each `seal:` in the file must be an outpoint (`txid:vout`). `issue` doesn't check that the wallet owns it, so take one from [`seals`](#seals): otherwise the issued state is assigned to an output the wallet can't spend, and `state -o` shows no owned state.

### purge {#purge}

`rgb purge <CONTRACT>`. Removes a contract and all its data. Back it up first.

### backup {#backup}

`rgb backup [-f] <CONTRACT> <FILE>`. Writes the whole contract as a consignment. Another wallet can load it with `accept -u`. `<CONTRACT>` can be the contract name or its ID.

```bash
rgb backup -f DemoToken DemoToken.rgb
```

### state (alias `s`) {#state}

`rgb state (-g | -o) [-a] [-w WALLET] [--sync] [CONTRACT]`

- `-g, --global`: global state entries.
- `-o, --owned`: owned state entries.
- `-a, --all`: all state, not just the state this wallet owns.

You must give at least one of `-g` or `-o`. Without `CONTRACT`, it prints every contract.

```bash
rgb state -go -w alice
```

### invoice (alias `i`) {#invoice}

`rgb invoice [-w WALLET] [--seal-only] [--wout] [--nonce N] [-a API] [-m METHOD] [-s STATE] [CONTRACT] [VALUE]`

- `--seal-only`: print only the beneficiary seal, not a full invoice.
- `--wout`: use a seal on an output of the payer's witness transaction (`wout:…`) instead of a UTXO of this wallet (`at:…`).
- `--nonce <N>`: the nonce to derive the seal from.
- `-a, --api` / `-m, --method` / `-s, --state`: the contract API, method and state name. If you leave them out, the contract's defaults are used.

Except with `--seal-only`, the wallet must already know the contract, or you get `unknown contract '<name>'`. Without `--wout`, it also needs an unspent output, or you get `Wallet has no unspent outputs; try fund first, or use -w flag to generate a witness output-based seal` (the message means `--wout`). Real output:

```bash
rgb invoice -w alice --nonce 0 --seal-only DemoToken
rgb invoice -w alice --nonce 0 DemoToken 10
rgb invoice -w alice --wout DemoToken 10
```

```text
at:VbJYsl3B-FccP_ZkJ-Yi49U0M6-DLNra14f-SyXj7URN-pmdnfQ
contract:tb@contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y/10@at:VbJYsl3B-FccP_ZkJ-Yi49U0M6-DLNra14f-SyXj7URN-pmdnfQ/
contract:tb@contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y/10@wout:AAAAAAAA-AAAQI6Ji-M00AJxeO-tYwYd2u7-iKteBoc2-eHjo/
```

The grammar is `contract:[tb@]<contract>/[<api>/][<method>/[<state>/]][<value>@]<seal>/[?…]`. See [Invoices](/technical-reference/invoices).

### pay (alias `p`) {#pay}

`rgb pay [-w WALLET] [-s STRATEGY] [--sats N] [--fee N] [-2] [-p] [-f] [--sync] [--electrum[=URL] | --esplora[=URL]] <INVOICE> <CONSIGNMENT> [PSBT]`

Pays an invoice. It writes a consignment for the beneficiary and a ready-to-sign binary PSBT. The PSBT path always gets the extension `.psbt`: if you leave out `PSBT`, `pay … transfer.rgb` writes `transfer.psbt` (the code calls `with_extension("psbt")`, `cli/src/exec.rs`).

| Option | Env | Default | Meaning |
|---|---|---|---|
| `-s, --strategy` | `RGB_COINSELECT_STRATEGY` | `aggregate` | `aggregate` (collect small outputs until the value is reached) or `smallsize` (the fewest, largest outputs). There are no other values |
| `--sats <N>` | — | — | Sats to send to a pay-to-address invoice |
| `--fee <N>` | — | `1000` | Fee in sats |
| `-2, --psbt2` | `RGB_PSBT_VER2` | off | Write a PSBT v2 |
| `-p, --print` | — | off | Also print the PSBT to stdout |
| `-f, --force` | — | off | Overwrite existing files |

```bash
rgb pay -w alice "$INVOICE" transfer.rgb transfer.psbt
```

:::danger Order matters
After `pay`, sign the PSBT, send `transfer.rgb` to the beneficiary, and wait for them to accept it. Only then run `finalize --broadcast`. Don't run `complete` on a `pay` PSBT. `rgb` doesn't sign: use whatever holds the wallet's keys ([Payments.md](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/doc/Payments.md)).
:::

### script {#script}

`rgb script [-w WALLET] [-s STRATEGY] [--sats N] [--sync] [--electrum[=URL] | --esplora[=URL]] <INVOICE> <OUTPUT>`

Turns one invoice into a YAML payment script (`PaymentScript`), which you can edit before `exec`. This is the first step of the custom-payment workflow (`script` → `exec` → `complete` → `consign` → sign → `finalize`).

### exec (alias `x`) {#exec}

`rgb exec [-w WALLET] [-2] [-p] <SCRIPT> <BUNDLE> <FEE> [PSBT]`

Runs a payment script. It writes a *prefabricated operation bundle* (binary, conventionally `*.pfab`) and a PSBT. If you leave out `PSBT`, it uses the bundle's filename with the extension `psbt`. This PSBT is **not ready to sign** until you run `complete` on it.

### complete {#complete}

`rgb complete [-w WALLET] <BUNDLE> <PSBT>`

Adds the RGB commitments for `<BUNDLE>` to the `exec` PSBT, rewrites the file in place, and records the witness in the contract store. Run it **before** signing. After `complete`, don't modify the transaction ([Payments.md](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/doc/Payments.md), steps 2–4). The help text calls the argument "Signed PSBT", but the upstream workflow runs `complete` before signing.

### consign {#consign}

`rgb consign [-t TOKEN]... <CONTRACT> <OUTPUT>`

Writes a consignment of `<CONTRACT>` up to the given terminals. Terminals are the auth tokens (`at:…`) of the beneficiary's outputs, given with `-t, --terminals`.

```bash
rgb consign DemoToken -t "$AUTH_TOKEN" transfer.rgb
```

### finalize {#finalize}

`rgb finalize [-w WALLET] [-b] [--sync] [--electrum[=URL] | --esplora[=URL]] <PSBT> [TX]`

Finalizes the signed inputs and extracts the transaction. It saves the transaction to `TX` if given, prints it if neither `TX` nor `-b` is given, and broadcasts it with `-b, --broadcast`. In rc.3 `--broadcast` only sends the transaction: the `runtime.finalize` call that [Payments.md](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/doc/Payments.md) step 8 describes is commented out (`cli/src/exec.rs`). It prints on stderr: `<n> of <m> inputs were finalized, transaction is ready for the extraction` and `Extracting signed transaction ... success`.

```bash
rgb finalize -w alice --broadcast --esplora transfer.psbt
```

### accept (alias `a`) {#accept}

`rgb accept [-u] [-w WALLET] <INPUT>`

Verifies a contract or transfer consignment and adds it to the store. Use `-u, --unknown` to accept a contract this wallet hasn't seen yet, for example a `backup` file. It prints nothing on success.

```bash
rgb accept -w bob -u DemoToken.rgb
rgb accept -w bob transfer.rgb
```

## See also

- [Quick start](/getting-started/quick-start) (v0.12 tab), a walkthrough built from `examples/demo.sh`.
- Upstream: [RGB-WG/rgb README](https://github.com/RGB-WG/rgb/tree/v0.12.0-rc.3) and [Payments.md](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/doc/Payments.md).
- [CLI reference (v0.11)](/technical-reference/cli-v011).

The `rgb-wallet` source is Apache-2.0, © LNP/BP Standards Association, LNP/BP Labs, the RGB Consortium and Dr Maxim Orlovsky (per the `cli/src/main.rs` header).
