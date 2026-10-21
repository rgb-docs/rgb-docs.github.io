---
sidebar_position: 2
title: Installation
description: Install the rgb command-line tool for RGB v0.11 (rgb-cmd) or RGB v0.12 (rgb-wallet), and the libraries for building apps.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation

:::info Applies to both RGB lines
Each line has its own CLI, crates and data directory, so the tabs below are separate. See [Two RGB lines](/getting-started/two-rgbs) for which one to use.
:::

Both lines install a binary called `rgb`, and the two binaries are incompatible. Install only one per `PATH`, or use `cargo install --root <dir>` to keep them apart.

## Rust toolchain

Both CLIs are built from source with Cargo. Both declare `rust-version = "1.85.0"` (`Cargo.toml` of `RGB-WG/rgb` at v0.12.0-rc.3 and of `rgb-protocol/rgb-api` at 0.11.1). `rgb-lib` needs Rust 1.88.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update stable
```

## Command-line tool

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

`rgb-cmd` 0.11.1 was published on 2026-09-16 from [rgb-protocol/rgb-api](https://github.com/rgb-protocol/rgb-api).

```bash line=B
cargo install --locked rgb-cmd --version 0.11.1
rgb --version
```

`rgb --version` prints `rgb-cmd 0.11.1`.

`rgb-cmd` does RGB work only. To sign transactions you need a Bitcoin wallet that holds the keys. The official sandbox uses `bp-wallet` for this, installing its `bp` and `bp-hot` tools:

```bash line=B
cargo install --locked bp-wallet --version 0.11.1-alpha.2 --root ./bp-wallet --features=cli,hot
```

**Defaults:** the data directory is `~/.lnp-bp` (env `LNPBP_DATA_DIR`) and the network is `testnet3` (env `LNPBP_NETWORK`). Data goes in a per-network subdirectory, such as `~/.lnp-bp/regtest`. There is no `init` step: the directory is created on first use.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

`rgb-wallet` 0.12.0-rc.3 was published on 2025-07-15 from [RGB-WG/rgb](https://github.com/RGB-WG/rgb). It is a release candidate, and no later release exists as of 2026-10-19. Always give `--version`: a plain `cargo install rgb-wallet` installs the last *stable* version, 0.10.9, an old RGB v0.10 release.

```bash line=A
cargo install --locked rgb-wallet --version 0.12.0-rc.3
rgb --help
rgb init
```

This `rgb` has no `--version` flag, so use `--help` to check the install. `rgb init` creates the data directory. Every other command refuses to run until the directory exists.

**Defaults:** the data directory is `~/.local/share/rgb` on Linux (or `$XDG_DATA_HOME/rgb`; env `RGB_DATA_DIR`). The network is `testnet4` (env `RGB_NETWORK`). All test networks share the subdirectory `bitcoin.testnet`.

:::danger Testnet only
With `-n bitcoin`, `rgb-wallet` 0.12.0-rc.3 panics with "Non-testnet networks are not yet supported" on every command that loads contracts, such as `contracts` or `issue` (`cli/src/args.rs:137`). `init`, `create` and `wallets` still run, so the refusal comes late. Use it with testnet, signet or regtest only.
:::

**Known rc.3 bugs**

- `rgb create <name> …` writes the wallet to `<data>/<name>`, but every other command loads `<data>/<name>.wallet` (`cli/src/exec.rs:104` vs `cli/src/args.rs`). Name the wallet with the suffix, as in `rgb create --wpkh alice.wallet …`, and then refer to it as `-w alice`. The bug is still on `master`.
- The Electrum environment variable is spelled `ELECRTUM_SERVER` (`cli/src/opts.rs:42`). Setting `ELECTRUM_SERVER` has no effect. Pass `--electrum=<URL>` instead.

</TabItem>
</Tabs>

## Blockchain access

Neither CLI talks to Bitcoin Core RPC. Both read the chain through an indexer that you choose per command: `--electrum=<URL>` or `--esplora=<URL>`, and on Line B also `--mempool=<URL>`. The `=` is required. Give a full URL with the network already in it.

- **Line A:** a bare `--electrum` uses `mycitadel.io:50001`, and a bare `--esplora` uses `https://mempool.space/{network}/api`, with `{network}` replaced by the network name (`cli/src/args.rs`, `resolver`).
- **Line B:** a bare `--electrum` uses the placeholder `example.com:50001`, so always give a URL. A bare `--esplora` uses `https://blockstream.info/{network}/api`. In 0.11.1, `{network}` is replaced only when the wallet syncs (`bp-wallet` 0.11.1-alpha.2 `src/cli/args.rs`, `indexer`). The RGB resolver used by `validate`, `accept` and contract `import` gets the URL unchanged (`rgb-cmd` `src/args.rs`, `resolver`), so a URL that still contains `{network}` breaks those commands. The Electrum environment variable in `bp-wallet` 0.11.1-alpha.2 has the same typo, `ELECRTUM_SERVER`.

For local testing, run regtest with an Electrum server. [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) (below) packages `bitcoind` and `electrs` with Docker Compose.

## Line B: regtest sandbox

[rgb-protocol/rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) is the official regtest demo. It needs git, cargo, Docker with Compose, and the SQLite development headers (`libsqlite3-dev`).

```bash line=B
git clone https://github.com/rgb-protocol/rgb-sandbox --recurse-submodules --shallow-submodules
cd rgb-sandbox
bash demo.sh
```

`demo.sh` installs `bp-wallet` and `rgb-cmd` into the project directory, starts the services, issues an asset, runs transfers and cleans up. As of its last commit (2026-09-22) the sandbox isn't on 0.11.1 final: `demo.sh` installs `rgb-cmd` 0.11.1-rc.7 (`RGB_CMD_VER`), and the README says it is "based on RGB version 0.11.1 RC 6" and installs rc.6 in its manual steps. The [quick start](/getting-started/quick-start) walks through the manual version.

## Libraries

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

**Wallets and apps:** use [`rgb-lib`](https://github.com/RGB-Tools/rgb-lib) (RGB-Tools). It handles Bitcoin walleting (through BDK) and RGB together, and has official bindings for Kotlin, Swift, Python, Node.js and C/C++ ([bindings list](https://github.com/RGB-Tools/rgb-lib/tree/master/bindings)). Version 0.3.0-beta.7 (2026-07-17) is built on `rgb-ops` 0.11.1-rc.11 and needs Rust 1.88.

```toml
[dependencies]
rgb-lib = "=0.3.0-beta.7"
```

:::danger Use each wallet on one device only
The rgb-lib README warns that using the same mnemonic on more than one device "can lead to RGB asset loss due to improper UTXO management".
:::

**Lower-level crates**, the ones `rgb-cmd` is built from:

```toml
[dependencies]
rgb-api = "=0.11.1"
rgb-ops = "=0.11.1"
rgb-consensus = "=0.11.1"
rgb-schemas = "=0.11.1"
```

Pin these exactly. 0.11.2 (release candidate since 2026-10-09) changes the consignment format.

rgb-lib 0.3.0-beta.7 still depends on `rgb-ops` 0.11.1-rc.11 and the strict libraries 1.0.2 (`rgb-lib` `Cargo.toml`), while `rgb-cmd` 0.11.1 uses 1.0.4 and 0.11.2-rc.1 uses 1.0.5 (release notes). rgb-lib's `next` branch moves to 0.11.2-rc.1, unreleased as of 2026-10-21.

API docs: [docs.rs/rgb-lib](https://docs.rs/rgb-lib/0.3.0-beta.7/rgb_lib/) builds. As of 2026-10-21, docs.rs failed to build `rgb-api` and `rgb-ops` 0.11.1, so run `cargo doc --open` in your project or read the source on GitHub. [`rgb-consensus`](https://docs.rs/rgb-consensus/0.11.1/rgbcore/) and [`rgb-invoicing`](https://docs.rs/rgb-invoicing/0.11.1/rgbinvoice/) 0.11.1 do build.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

The Rust runtime that the CLI uses is `rgb-runtime` (library name `rgbp`), built on `rgb-std`. Both are release candidates, so Cargo needs an exact pre-release requirement. A plain `"0.12"` doesn't match them.

```toml
[dependencies]
rgb-runtime = "=0.12.0-rc.3"
rgb-std = "=0.12.0-rc.3"
```

`rgb-core` 0.12.0 (final, 2025-07-10) comes in as a dependency. There are no bindings for other languages. API docs are on [docs.rs/rgb-runtime](https://docs.rs/rgb-runtime/0.12.0-rc.3) and [docs.rs/rgb-std](https://docs.rs/rgb-std/0.12.0-rc.3).

</TabItem>
</Tabs>

## Next steps

- [Quick start](/getting-started/quick-start): issue and transfer a test asset.
- CLI references: [v0.11](/technical-reference/cli-v011) and [v0.12](/technical-reference/cli).
