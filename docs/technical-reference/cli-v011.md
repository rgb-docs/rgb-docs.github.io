---
sidebar_position: 3
title: CLI reference (v0.11)
description: Every command, flag and environment variable of the rgb command from rgb-cmd 0.11.1 (Line B).
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/technical-reference/cli-v011.png
---

# CLI reference (v0.11)

:::info RGB v0.11 line (rgb-cmd 0.11.1)
This page covers the `rgb` binary from the `rgb-cmd` crate (RGB Protocol Association). The v0.12 binary has the same name but different commands: see [CLI reference (v0.12)](/technical-reference/cli) and [Two RGB lines](/getting-started/two-rgbs).
:::

This reference was generated from `rgb --help` and `rgb <command> --help` of the pinned binary (cached in `scripts/cli-help/B.json`), and from the clap definitions in [`cli/src/command.rs`](https://github.com/rgb-protocol/rgb-api/blob/0.11.1/cli/src/command.rs) of `rgb-protocol/rgb-api` 0.11.1. The general wallet commands (`list`, `default`, `create`, `address`, `finalize`, `extract`) come from `bp-wallet` 0.11.1-alpha.2 (`src/cli/command.rs`).

```bash
cargo install --locked rgb-cmd --version 0.11.1
rgb --version
```

`rgb --version` prints `rgb-cmd 0.11.1`.

`rgb-cmd` keeps watch-only wallets and does the RGB work. It doesn't sign: sign PSBTs with a wallet that holds the keys, such as `bp-hot sign` from `bp-wallet`, as [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) does. For applications, use [rgb-lib](https://github.com/RGB-Tools/rgb-lib) instead of the CLI.

## Global options

All of these options can be given before or after the command.

| Option | Env | Default | Meaning |
|---|---|---|---|
| `-d, --data-dir <DIR>` | `LNPBP_DATA_DIR` | `~/.lnp-bp` (Linux); `~/Library/Application Support/LNP-BP Suite` (macOS) | Data directory |
| `-n, --network <NET>` | `LNPBP_NETWORK` | `testnet3` | Network: `bitcoin` or `mainnet`, `testnet` or `testnet3`, `testnet4`, `signet`, `regtest`. The default is testnet3, not testnet4 |
| `--no-network-prefix` | — | off | Don't add the network subdirectory to `--data-dir` |
| `-w, --wallet <NAME>` | — | the default wallet | Use a named wallet |
| `-W, --wallet-path <PATH>` | — | — | Use the wallet at this path |
| `--wpkh <DESCRIPTOR>` | — | — | Use a `wpkh(KEY)` descriptor given on the command line |
| `--tapret-key-only <DESCRIPTOR>` | — | — | Use a `tapret(KEY)` descriptor given on the command line |
| `--electrum[=<URL>]` | `ELECRTUM_SERVER` (sic) | bare: `example.com:50001` | Electrum indexer |
| `--esplora[=<URL>]` | `ESPLORA_SERVER` | bare: `https://blockstream.info/{network}/api` | Esplora indexer |
| `--mempool[=<URL>]` | `MEMPOOL_SERVER` | bare: `https://mempool.space/{network}/api` | Mempool indexer |
| `--sync` | — | off | Sync the wallet with the indexer before the command runs |
| `-H, --from-height <N>` | — | — | Check witness transactions for re-orgs starting at this height |
| `-v, --verbose` | — | — | More output. Repeat it for more |
| `-V, --version` | — | — | Print the version |

- **The `=` is required** with the indexer options: write `--electrum=localhost:50001`. A bare `--electrum` falls back to the placeholder `example.com:50001`, so always give a URL.
- **`{network}` is only filled in for wallet sync.** The bare `--esplora` and `--mempool` defaults contain `{network}`. `bp-wallet` replaces it when it syncs the wallet (`src/cli/args.rs`), but the RGB resolver used by `transfer`, `validate`, `accept` and consignment `import` passes the URL on unchanged (`rgb-api` 0.11.1 `cli/src/args.rs`, `fn resolver`). Give a full URL with the network spelled out.
- **The Electrum environment variable is misspelt** `ELECRTUM_SERVER` (`bp-wallet` 0.11.1-alpha.2, `src/cli/opts.rs:59`).
- Any command that syncs (`--sync`, `--wpkh`, `--tapret-key-only`, or `create`) needs exactly one indexer option. Otherwise it fails with `Error: no blockchain indexer specified; use either --esplora --mempool or --electrum argument`. Commands that resolve witness transactions (`validate`, `accept`, importing a contract consignment) need one too, and fail with `Error: resolver error:  - error: no transaction resolver is specified; use either --esplora --mempool or --electrum argument`.
- Data goes in `<data-dir>/<network>`, for example `data0/regtest`, which contains `stash.dat`, `state.dat`, `index.dat` and `rgb.toml`. Named wallets are subdirectories of the same directory. There is no `init` command: the directory is created on first use. Unless `rgb.toml` there holds a valid config, each command first prints `Unable to find or parse config file; using config defaults`. This is harmless.

## Commands

| Command | Purpose |
|---|---|
| [`list`](#list) | List named wallets |
| [`default`](#default) | Get or set the default wallet |
| [`create`](#create) | Create a named wallet |
| [`address`](#address) | Generate wallet addresses |
| [`utxos`](#utxos) | Show the wallet's UTXOs and balance |
| [`taprets`](#taprets) | List the wallet's known tapret tweaks |
| [`schemata`](#schemata) | List known schemas |
| [`contracts`](#contracts) | List known contracts |
| [`import`](#import) | Import a kit (schemas) or a contract consignment |
| [`export`](#export) | Export a contract |
| [`armor`](#armor) | Convert a binary RGB file to ASCII armour |
| [`issue`](#issue) | Issue a contract from a YAML description |
| [`state`](#state) | Show a contract's state |
| [`history`](#history) | Show a contract's operation history |
| [`invoice`](#invoice) | Create an invoice |
| [`transfer`](#transfer) | Create a transfer: consignment + PSBT |
| [`prepare`](#prepare) | Low-level: build the transfer PSBT |
| [`consign`](#consign) | Low-level: build the consignment for a prepared PSBT |
| [`validate`](#validate) | Validate a transfer consignment |
| [`accept`](#accept) | Validate and accept a transfer consignment |
| [`finalize`](#finalize) | Finalize a signed PSBT, optionally publish |
| [`extract`](#extract) | Extract the signed transaction from a PSBT |
| [`inspect`](#inspect) | Dump any RGB file as YAML |
| [`dump`](#dump) | Debug-dump the whole stash |

There is also a hidden `reconstruct` command, which rebuilds a consignment from YAML.

## Wallet commands

### list {#list}

`rgb list`. Lists named wallets.

### default {#default}

`rgb default [NAME]`. Prints the default wallet, or sets it to `NAME`.

### create {#create}

`rgb [--wpkh <DESCRIPTOR> | --tapret-key-only <DESCRIPTOR>] create <NAME>`. Saves a descriptor as a named wallet and syncs it, so it needs an indexer. The descriptor is an account xpub with origin and keychains, for example `[598d26fe/86h/1h/0h]tpubDCwK…/<0;1;9>/*` as in rgb-sandbox.

```bash
rgb -n regtest --electrum=localhost:50001 -d data0 create --wpkh "$descriptor_0" issuer
```

Example output, from the rgb-sandbox README:

```text
Loading descriptor from command-line argument ... success
Syncing keychain 0 .......... keychain 1 .......... keychain 9 .......... success
Saving the wallet as 'issuer' ... success
```

### address {#address}

`rgb address [-k KEYCHAIN] [-1] [-i INDEX] [-D] [-C COUNT]`. Generates addresses.

- `-k, --keychain <N>`: a custom keychain. rgb-sandbox uses `-k 9`.
- `-1, --change`: the change keychain.
- `-i, --index <N>`: a custom address index.
- `-D, --dry-run`: don't advance the last-used index.
- `-C, --count <N>`: how many addresses to generate (default 1).

### utxos {#utxos}

`rgb utxos [--sync]`. Shows the wallet's UTXOs with height, amount and outpoint, then the total balance.

### taprets {#taprets}

`rgb taprets`. Prints `<witness txid>\t<tapret tweak>` for each tapret commitment the stash knows.

:::danger Back up tapret tweaks and the stash
To spend an output that carries a tapret commitment, you need the tweak, and the seed alone doesn't hold it. Losing the data directory also loses the RGB state. Back up `<data-dir>/<network>` (stash, state, index) together with the wallet.
:::

## Contract commands

### schemata {#schemata}

`rgb schemata`. Lists imported schemas. Real output after importing NIA:

```text
NonInflatableAsset      	rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus
```

### contracts {#contracts}

`rgb contracts`. Lists contracts: ID, network, issue date, schema, and developer. Real output:

```text
rgb:7Wf1Rne9-BQWvPlL-P50XBTB-D1sZQlF-Wn7eRYV-3_wZZg8	BitcoinRegtest	2026-10-19	rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus
  Developer: ssi:issuer
```

### import {#import}

`rgb import [-a] <FILE>`. Imports one file: a kit (schemas, script libraries and types, for example `NonInflatableAsset.rgb` from [rgb-schemas](https://github.com/rgb-protocol/rgb-schemas)) or a contract consignment. Use `-a` for ASCII-armoured input. A kit imports offline. A contract consignment is validated first, so it needs an indexer.

```bash
rgb -n regtest -d data0 import NonInflatableAsset.rgb
```

Real output:

```text
Importing kit rgb:kit:qxyONQWD-WY7Sha7-wzsRSMW-MaNI6PI-T74uzx9-sBzUztg:
- schema NonInflatableAsset RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus
- script library alu:q~CZ0ovt-UN9eBlc-VMn86mz-Kfd3ywu-f7~9jTB-k6A8tiY#japan-nylon-center
- strict types: 35 definitions
Kit is imported
```

### export {#export}

`rgb export [-a] <CONTRACT_ID> [FILE]`. Exports a contract consignment to `FILE`, or prints it to stdout. `-a` asks for ASCII armour.

### armor {#armor}

`rgb armor <FILE>`. Prints a binary RGB file as ASCII armour.

### issue {#issue}

`rgb issue <ISSUER> <CONTRACT_PATH>`. Issues a contract from a YAML file, where `<ISSUER>` is an identity string such as `ssi:issuer`. The file names the `schema`, its `globals` and its `assignments`, each keyed by the schema's state name. Each assignment has one `seal` (`txid:vout`) and an `amount`. This NIA file issued offline with the pinned binary on 2026-10-21:

```yaml
schema: rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus
globals:
  spec:
    ticker: DEMO
    name: Demo Asset
    details: ~
    precision: 0
  terms:
    text: demo NIA asset
    media: ~
  issuedSupply: 1000
assignments:
  assetOwner:
    seal: 02e107ddf4f42757f44fac43feb007606d8caf40616fa92dba62176995513e88:0
    amount: 1000
```

If a required global is missing, `issue` fails with `Error: detected a failure that makes the consignment invalid`. Only fungible assignments can be issued this way. Void and structured assignments hit a `todo!()` in 0.11.1. See [rgb-sandbox `contracts/`](https://github.com/rgb-protocol/rgb-sandbox/tree/master/contracts) for templates.

```bash
rgb -n regtest -d data0 issue "ssi:issuer" demo.yaml
```

Real output (the ID is different each time, because genesis seals are blinded with random values):

```text
A new contract rgb:7Wf1Rne9-BQWvPlL-P50XBTB-D1sZQlF-Wn7eRYV-3_wZZg8 is issued and added to the stash.
Use `export` command to export the contract.
```

### state {#state}

`rgb state [-a] <CONTRACT_ID>`. Prints global state, then owned state with its seal and witness. Use `-a, --all` to include spent state and state the wallet doesn't own.

### history {#history}

`rgb history [--details] <CONTRACT_ID>`. Prints the operation history.

## Transfer commands

### invoice {#invoice}

`rgb invoice [--amount N] [--address-based] [--assignment-name NAME] [--token-index I [--token-fraction F]] <CONTRACT_ID>`

- `--amount <N>`: the amount in the smallest unit. Give exactly one of `--amount` or `--token-index`, or `invoice` fails with `only amount or token data should be provided`.
- `--address-based`: use an address-based (witness-output) invoice instead of a blinded UTXO. Without it, the wallet needs an unspent output, or you get `blinded invoice requested but no suitable outpoint is available`.
- `--assignment-name <NAME>`: the state to invoice. It is detected if you leave it out.
- `--token-index` and `--token-fraction`: the token and fraction for NFT (UDA) transfers.

:::warning Use long option names
In 0.11.1 the short flag `-a` belongs to three options of `invoice`: `--address-based`, `--assignment-name` and `--amount` (see `rgb invoice --help`). Spell them out.
:::

The invoice grammar is `rgb:<contract>/<schema|~>/<state|~>/<chain>:<utxob:…|wvout:…>[?expiry=…&endpoints=…]`. Example output, from the rgb-sandbox README:

```text
rgb:Tk3d0h5w-8v4XYCg-7e~Sc0o-Lu6rp~X-~Jt7VHS-jqgzFD8/~/BF/bcrt:utxob:MSLQCKkW-w6caphB-12do1nJ-HNfgxvv-WE3zOOC-s8yZyHq-Ihoa5
```

See [Invoices](/technical-reference/invoices).

### transfer {#transfer}

`rgb transfer [-2] [--sats N] [-f FEE] <INVOICE> <CONSIGNMENT> [PSBT]`

Creates the transfer consignment, and a PSBT that already contains the RGB commitment. Without `PSBT`, it prints the PSBT to stdout.

- `-f, --fee <N>`: the fee in sats (default 400).
- `--sats <N>`: the sats paid to an address-based beneficiary (default 2000).
- `-2`: write a PSBT v2.

:::danger Consignment before broadcast
Give the consignment to the recipient, and let them `validate` it, before you sign and publish the transaction. If the transaction is published and the consignment is lost, the assets are lost. Also, spend the wallet's UTXOs only through RGB-aware tools. A plain Bitcoin wallet that spends an output holding RGB state destroys it.
:::

### prepare {#prepare}

`rgb prepare [-2] [--sats N] <INVOICE> <FEE> [PSBT]`. The first half of `transfer`: builds the PSBT. The help says that in most cases you should use `transfer` instead.

### consign {#consign}

`rgb consign <INVOICE> <PSBT> <CONSIGNMENT>`. The second half of `transfer`: adds the commitment to a prepared PSBT and writes the consignment.

### validate {#validate}

`rgb validate <FILE>`. Validates a transfer consignment. On success it prints `The provided consignment is valid`. Otherwise it prints the validation status.

### accept {#accept}

`rgb accept [-f] <FILE>`. Validates the consignment and adds it to the stash, printing `Transfer accepted into the stash`. The help says `-f, --force` accepts consignments whose terminal witness transaction isn't mined yet, but 0.11.1 ignores the flag (`Command::Accept { force: _, .. }` in `cli/src/command.rs`, with a TODO).

### finalize {#finalize}

`rgb finalize [-p] <PSBT> [TX]`. Finalizes the signed PSBT, and saves the transaction to `TX` if given. `-p, --publish` extracts the transaction and sends it to the network. The flag is `-p`. There is no `--broadcast`.

```bash
rgb -n regtest --electrum=localhost:50001 -d data0 -w issuer finalize -p data0/tx.psbt data0/tx.tx
```

### extract {#extract}

`rgb extract [-p] <PSBT> [TX]`. Extracts the signed transaction without modifying the PSBT. Without `TX`, it prints the transaction to stdout. `-p, --publish` sends it.

## Debugging

### inspect {#inspect}

`rgb inspect [--dir] <FILE> [PATH]`. Dumps any RGB file (consignment, kit, contract) as YAML, to `PATH` or to stdout. With `--dir` and a `PATH`, compound bundles are written in directory form.

### dump {#dump}

`rgb dump [ROOT_DIR]`. Dumps the whole stash and inventory into a directory (default `./rgb-dump`).

## See also

- [Quick start](/getting-started/quick-start) (v0.11 tab), built from the rgb-sandbox manual demo.
- [docs.rgb.info](https://docs.rgb.info), the official Line B documentation.
- [rgb-protocol/rgb-api](https://github.com/rgb-protocol/rgb-api) and [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox).
