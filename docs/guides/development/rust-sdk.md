---
sidebar_position: 1
title: Rust
description: The Rust crates for each RGB line, rgb-lib and rgb-ops/rgb-api for v0.11 and rgb-runtime/rgb-std for v0.12, with pinned versions and checked examples.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Rust

:::info Applies to both RGB lines
Each line has its own crates, and they don't interoperate. See [Two RGB lines](/getting-started/two-rgbs).
:::

| | Line B: v0.11 | Line A: v0.12 |
|---|---|---|
| For wallets and apps | [`rgb-lib`](https://docs.rs/rgb-lib/0.3.0-beta.7) 0.3.0-beta.7 (2026-07-17). The last non-beta, 0.2.2 (2023), is built on RGB 0.10 and works with neither line. | [`rgb-runtime`](https://docs.rs/rgb-runtime/0.12.0-rc.3) 0.12.0-rc.3, imported as `rgbp` |
| Lower level | [`rgb-api`](https://github.com/rgb-protocol/rgb-api/tree/0.11.1) (imported as `rgb`), [`rgb-ops`](https://github.com/rgb-protocol/rgb-ops/tree/0.11.1) (`rgbstd`), `rgb-consensus` (`rgbcore`), `rgb-schemas` (`schemata`), all 0.11.1 | [`rgb-std`](https://docs.rs/rgb-std/0.12.0-rc.3) 0.12.0-rc.3 (`rgb`), `rgb-core` 0.12.0 |
| Minimum Rust | 1.85; rgb-lib needs 1.88 | 1.85 |
| Chain access | Electrum or Esplora indexer | Electrum or Esplora indexer |

docs.rs failed to build `rgb-api` and `rgb-ops` 0.11.1, so the links above go to the source. Neither line needs a Bitcoin Core RPC connection. Pin every version exactly: Cargo never matches a pre-release such as `0.12.0-rc.3` from a plain `"0.12"`. The crate called `rgb` on crates.io is an unrelated pixel-colour library.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## Line B: rgb-lib

[rgb-lib](https://github.com/RGB-Tools/rgb-lib) (RGB-Tools) is a complete wallet: BDK for bitcoin, `rgb-ops` for RGB, SQLite for its database, and an RGB proxy server to exchange consignments. 0.3.0-beta.7 is built on `rgb-ops` 0.11.1-rc.11.

```toml
[dependencies]
rgb-lib = "=0.3.0-beta.7"
```

:::warning A new project doesn't resolve without rgb-lib's lock file
As of 2026-10-21, a fresh `cargo build` stops with ``failed to select a version for the requirement `secp256k1 = "^0.32.0-beta.2"` ``: `rgb-consensus` 0.11.1-rc.11, which rgb-lib pins, needs that version, and it has been yanked from crates.io. Cargo still uses a yanked version that is already in `Cargo.lock`, so start from rgb-lib's lock file. In your project directory, run `curl -LO https://raw.githubusercontent.com/RGB-Tools/rgb-lib/0.3.0-beta.7/Cargo.lock` before the first build.
:::

The flow below uses only names that exist at the [0.3.0-beta.7 tag](https://github.com/RGB-Tools/rgb-lib/tree/0.3.0-beta.7). It passes `cargo check` (2026-10-21, with that lock file), but wasn't run, because it needs an indexer and a proxy. The methods are on `Wallet` (`src/wallet/singlesig.rs`) and on the `RgbWalletOpsOffline` and `RgbWalletOpsOnline` traits.

```rust
// rgb-lib 0.3.0-beta.7
use std::collections::HashMap;

use rgb_lib::keys::{generate_keys, WitnessVersion};
use rgb_lib::wallet::{
    DatabaseType, OnlineOptions, Recipient, RgbWalletOpsOffline, RgbWalletOpsOnline,
    SinglesigKeys, Wallet, WalletData,
};
use rgb_lib::{AssetSchema, Assignment, BitcoinNetwork, Error};

const PROXY: &str = "rpc://127.0.0.1:3000/json-rpc";

fn demo(expiry: u64) -> Result<(), Error> {
    let keys = generate_keys(BitcoinNetwork::Regtest, WitnessVersion::Taproot);
    // Store keys.mnemonic securely. It is not enough to restore RGB assets on its own.
    std::fs::create_dir_all("./data")?; // Wallet::new fails with InexistentDataDir otherwise
    let mut wallet = Wallet::new(
        WalletData {
            data_dir: "./data".to_string(),
            bitcoin_network: BitcoinNetwork::Regtest,
            database_type: DatabaseType::Sqlite,
            max_allocations_per_utxo: 1,
            supported_schemas: vec![AssetSchema::Nia],
        },
        SinglesigKeys::from_keys(&keys, None),
    )?;
    let online = wallet.go_online(OnlineOptions {
        indexer_url: "tcp://localhost:50001".to_string(),
        skip_consistency_check: false,
        vanilla_sync_lookback: 20,
    })?;

    // Fund wallet.get_address()? first, then create UTXOs to hold RGB allocations.
    wallet.create_utxos(online, false, Some(5), None, 1, false)?;
    let asset = wallet.issue_asset_nia("DEMO".into(), "Demo asset".into(), 0, vec![1000])?;

    // The recipient (another Wallet) makes an invoice:
    //   rcv.blind_receive(None, Assignment::Fungible(100), expiry, vec![PROXY.into()], 1)?
    // or rcv.witness_receive(...) for an address-based one.
    let recipient_id = "<recipient_id from the invoice>".to_string();
    let recipients = HashMap::from([(
        asset.asset_id.clone(),
        vec![Recipient {
            recipient_id,
            witness_data: None, // Some(WitnessData { .. }) for witness_receive invoices
            assignment: Assignment::Fungible(100),
            transport_endpoints: vec![PROXY.to_string()],
        }],
    )]);
    wallet.send(online, recipients, false, 2, 1, expiry)?;

    // Both sides call refresh until the transfer settles.
    wallet.refresh(online, None, vec![], false)?;

    // Encrypted backup of the whole RGB data directory.
    wallet.backup("./wallet.backup", "backup password")?;
    Ok(())
}
```

The rest of the API: `list_assets`, `get_asset_balance`, `list_transfers`, `list_unspents`, `sync`, `send_begin`/`send_end` with `sign_psbt` (for external signers), `issue_asset_ifa`/`_uda`/`_cfa`, and `rgb_lib::wallet::restore_backup(path, password, target_dir)`. The [Kotlin](https://github.com/RGB-Tools/rgb-lib-kotlin), [Swift](https://github.com/RGB-Tools/rgb-lib-swift) and [Python](https://github.com/RGB-Tools/rgb-lib-python) bindings expose the same calls. The [Node.js](./rgbjs.md) bindings cover a subset: at 0.3.0-beta.7 they have no `issueAssetIFA`, `inflate` or `burn`, and `AssetSchema` has no `Ifa`.

:::danger Use each wallet on one device only
The rgb-lib README warns that using the same mnemonic on more than one device "can lead to RGB asset loss due to improper UTXO management". rgb-lib expects to manage every UTXO of its wallet.
:::

## Line B: rgb-ops and rgb-api

These are the crates `rgb-cmd` is built from. Use them for tooling, or for a wallet that manages its own bitcoin side.

```toml
[dependencies]
rgb-ops = { version = "=0.11.1", features = ["fs"] }
rgb-api = { version = "=0.11.1", features = ["bp", "fs"] } # or "bdk" for a BDK wallet
rgb-schemas = "=0.11.1"
```

`rgb-api` has no default features. Without `bp` or `bdk` it has no wallet backend for `RgbWallet`.

- **`rgbstd::persistence::Stock`** holds contracts. Create it with `Stock::in_memory()` or `Stock::load(provider, autosave)`. It has `import_kit`, `import_contract`, `contract_builder(issuer, schema_id, chain_net)`, `transition_builder(contract_id, name)` and `contract_wrapper::<NonInflatableAsset>(id)` (the type is from `rgb-schemas`), which gives typed readers such as `spec()`, `total_issued_supply()` and `allocations(filter)` (`src/persistence/stock.rs`).
- **`rgb::RgbWallet`** in `rgb-api` pairs a `Stock` with a bp-wallet or BDK wallet and provides `pay`, `construct_psbt`, `transfer` and `history` (`src/wallet.rs`).

[Genesis](../contracts/genesis.md) has a complete `ContractBuilder` example that was compiled and run against `rgb-ops` 0.11.1. The [rgb-schemas examples](https://github.com/rgb-protocol/rgb-schemas/tree/0.11.1/examples) issue and read every schema. Line B 0.11.1 has no interfaces, valencies or state extensions.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## Line A: rgb-runtime and rgb-std

:::danger Release candidate, test networks only
`rgb-std`, `rgb-runtime` and `rgb-wallet` are at 0.12.0-rc.3 (2025-07-15), with no release since. The `rgb` CLI refuses mainnet. Don't hold real value with them.
:::

```toml
[dependencies]
rgb-std = { version = "=0.12.0-rc.3", features = ["binfile", "uri", "serde"] }
rgb-runtime = { version = "=0.12.0-rc.3", features = ["fs", "resolvers-all", "serde"] }
rgb-persist-fs = "=0.12.0-rc.3"
bp-std = "=0.12.0-rc.3"
```

`rgb-std` features: `std`, `bitcoin` (both default), `liquid`, `prime`, `binfile`, `uri`, `stl`, `serde`, `async`. File persistence is the `fs` feature of `rgb-runtime`, together with the `rgb-persist-fs` crate.

This program follows how the `rgb` CLI builds its runtime (`cli/src/args.rs` at `v0.12.0-rc.3`). It was compiled offline on 2026-10-19 with exactly the dependencies above. The read-only part was run against the data directory from [Genesis](../contracts/genesis.md):

```rust
// rgb-runtime / rgb-std 0.12.0-rc.3
use std::path::PathBuf;

use bpstd::psbt::TxParams;
use bpstd::seals::TxoSeal;
use bpstd::{Network, Sats};
use rgb::invoice::RgbInvoice;
use rgb::popls::bp::RgbWallet;
use rgb::{Consensus, ContractId, Contracts};
use rgb_persist_fs::StockpileDir;
use rgbp::resolvers::MultiResolver;
use rgbp::{CoinselectStrategy, FileHolder, Owner, RgbpRuntimeDir};

fn contracts(dir: PathBuf) -> Contracts<StockpileDir<TxoSeal>> {
    // `testnet: true`: rc.3 doesn't support non-test networks.
    let stockpile = StockpileDir::load(dir, Consensus::Bitcoin, true).expect("contracts dir");
    Contracts::load(stockpile)
}

fn main() {
    let data = PathBuf::from(std::env::args().nth(1).expect("usage: <data-dir>/bitcoin.testnet"));

    // List contracts and their owned state.
    let contracts = contracts(data.clone());
    for id in contracts.contract_ids() {
        let articles = contracts.contract_articles(id);
        let state = contracts.contract_state(id);
        println!("{id} {}", articles.issue().meta.name);
        for (name, cells) in &state.owned {
            for cell in cells {
                println!("  {name}: {} at {}", cell.assignment.data, cell.assignment.seal);
            }
        }
    }

    // Pay an invoice. Needs a funded wallet and an indexer resolver.
    if let Some(invoice) = std::env::args().nth(2) {
        let invoice: RgbInvoice<ContractId> = invoice.parse().expect("invalid invoice");
        let holder = FileHolder::load(data.join("alice.wallet")).expect("wallet");
        let resolver = MultiResolver::new_absent().expect("resolver"); // or new_esplora(url)
        let owner = Owner::with_components(Network::Testnet4, holder, resolver);
        let mut runtime = RgbpRuntimeDir::from(RgbWallet::with_components(owner, contracts));
        let params = TxParams::with(Sats::from_sats(1000u64));
        let (psbt, payment) = runtime
            .pay_invoice(&invoice, CoinselectStrategy::Aggregate, params, None)
            .expect("payment");
        runtime
            .contracts
            .consign_to_file("transfer.rgb", invoice.scope, payment.terminals)
            .expect("consignment");
        // Sign `psbt` elsewhere. Send transfer.rgb and wait until it's accepted, then
        // finalize and broadcast (runtime.finalize).
        println!("{psbt}");
    }
}
```

Real output of the read-only part:

```text
contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y DemoToken
  balance: 10000 at b7116550736fbe5d3e234d0141c6bc8d1825f94da78514a3cede5674e9a5eae9:1/16bba313796e55a7cca81e2fbc5b6a47d5e2dc97f886a40ed31fc537b014c3b3ffffffffffffffff
```

`RgbRuntime` (`src/runtime.rs`) also has `rbf`, `script`, `transfer`, `compose_psbt`, `color_psbt`, `exec`, `complete` and `finalize`. `pay_invoice` already calls `complete`.

### The Contract API

Below `Contracts` sits one `Contract<S: Stock, P: Pile>` per contract ([`src/contract.rs`](https://github.com/RGB-WG/rgb-std/blob/v0.12.0-rc.3/src/contract.rs)):

| Group | Methods |
|---|---|
| Create and open | `with`, `issue`, `load(stock_conf, pile_conf)` |
| Read | `contract_id`, `articles`, `operations`, `trace`, `witness_ids`, `witnesses`, `ops_by_witness_id`, `op_seals`, `seal`, `state`, `full_state` |
| Change | `sync`, `call`, `include` |
| Move data | `export`, `consign`, `consume`; with `binfile`, `export_to_file` and `consign_to_file` |

Types you'll meet:

- **`ContractState`** has `immutable`, `owned` and `aggregated` maps, keyed by state name. Each owned entry is an `OwnedState` with `addr`, `assignment` (`seal`, `data`) and `status`.
- **`WitnessStatus`** (`src/pile.rs`) is `Genesis`, `Mined(NonZeroU64)` (a block height), `Offchain`, `Tentative` or `Archived` (the default).
- **`CallParams`** (`hypersonic` 0.12.0) is `{ core: CoreParams { method, global, owned }, using, reading }`. There are no valencies.
- **`Issuer`** (`sonic-api` 0.12.0) is a codex plus its semantics. Load one from an `.issuer` file with `Issuer::load`. It is not a key pair.
- **`Articles`** holds the `Issue` (contract metadata, codex and genesis), the semantics (APIs, types, libraries) and an optional issuer signature. There are no schemas or interfaces in v0.12.
- **`CreateParams`** is the input to `Contracts::issue`. See [Genesis](../contracts/genesis.md).
- **`ConsumeError`** has the variants `Io`, `UnknownContract`, `Semantics`, `Decode`, `Verify` and `Issue`.

Changes are committed to persistence inside each method call. There is no save-on-drop.

</TabItem>
</Tabs>
