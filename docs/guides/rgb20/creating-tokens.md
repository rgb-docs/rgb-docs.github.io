---
sidebar_position: 1
title: Issuing fungible tokens
description: Issue a fixed-supply fungible token as an NIA contract (v0.11, with rgb-cmd or rgb-lib) or with the RGB20-FNA issuer (v0.12 release candidate).
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Issuing fungible tokens

:::info Applies to both RGB lines
Both lines can issue a fixed-supply fungible token, but with different tools and incompatible contracts. See [Two RGB lines](/getting-started/two-rgbs).
:::

Issuing a token means creating a contract **genesis**: the token's name and supply, and one or more seals (Bitcoin UTXOs) that own the initial supply. Issuing is offline: genesis is not a Bitcoin transaction and nothing is published on chain. The UTXOs you assign the supply to must already exist in your wallet.

- **v0.11:** a fixed-supply token is a contract of the **NIA** (Non-Inflatable Asset) schema. For a supply you can increase later, use IFA ([Secondary issuance](/guides/rgb20/secondary-issuance)).
- **v0.12:** a fixed-supply token is issued with the **RGB20-FNA** issuer ("Fungible Non-inflatable Asset").

## Token parameters

| Field | v0.11 (NIA, `AssetSpec`) | v0.12 (RGB20-FNA) |
|---|---|---|
| Ticker | 1–8 characters, starting with a letter (`rgb-ops` `stl/specs.rs`). rgb-lib also requires upper case. | 2–8 characters (`rgb-interfaces` 0.12 `names.rs`) |
| Name | 1–40 printable ASCII characters | Global `name` |
| Details | Optional, 1–255 bytes | Not in the example issuer |
| Precision | 0–18 | Global `precision`, by name (for example `centiMilli`) |
| Terms | `ContractTerms { text, media }`: a text and an optional attachment (media type plus digest) | Not in the example issuer |
| Supply | Global `issuedSupply`, which must equal the sum of the allocations (errno 1, `ERRNO_ISSUED_MISMATCH`) | Global `issued` |

Precision sets the number of decimal places. Amounts in RGB are always whole numbers of the smallest unit: with precision 2, an allocation of `100000` displays as 1,000.00.

| Value | Name | Value | Name | Value | Name |
|---|---|---|---|---|---|
| 0 | Indivisible | 6 | Micro | 12 | Pico |
| 1 | Deci | 7 | DeciMicro | 13 | DeciPico |
| 2 | Centi | 8 | CentiMicro | 14 | CentiPico |
| 3 | Milli | 9 | Nano | 15 | Femto |
| 4 | DeciMilli | 10 | DeciNano | 16 | DeciFemto |
| 5 | CentiMilli | 11 | CentiNano | 17 | CentiFemto |
| | | | | 18 | Atto |

Source: `Precision` in `rgb-invoicing` 0.11.1 `src/amount.rs`. Tickers aren't unique. Anyone can issue a contract with any ticker, so wallets identify assets by contract ID.

:::danger Back up after issuing
A seed phrase does not recover RGB assets. The contract and its state live in the wallet's data directory (or in rgb-lib's backup), so back it up as soon as you have issued. Tapret wallets also need their tapret tweaks backed up.
:::

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## v0.11: NIA

### With the CLI

`rgb-cmd` issues from a YAML file that names the schema, its globals and the seal that receives the supply. The full walkthrough, with real output, is step 5 of the [Quick Start](/getting-started/quick-start). In short:

```yaml
schema: rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus

globals:
  spec:
    ticker: DEMO
    name: Demo Asset
    details: ~
    precision: 2
  terms:
    text: demo NIA asset
    media: ~
  issuedSupply: 100000

assignments:
  assetOwner:
    seal: <txid>:<vout>
    amount: 100000
```

```bash line=B
rgb -n regtest -d data0 import rgb-schemas/schemata/NonInflatableAsset.rgb
rgb -n regtest -d data0 -w issuer issue "ssi:issuer" demo.yaml
rgb -n regtest -d data0 -w issuer contracts
```

`rgb issue` prints `A new contract rgb:… is issued and added to the stash.` The contract ID changes on every run, because the genesis seal is blinded with a random value. Templates for each schema are in [rgb-sandbox `contracts/`](https://github.com/rgb-protocol/rgb-sandbox/tree/master/contracts).

### With rgb-lib (Rust)

[rgb-lib](https://github.com/RGB-Tools/rgb-lib) is what Line B wallets use. It holds the keys, manages UTXOs and embeds the schemas. This code is for `rgb-lib` 0.3.0-beta.7, which needs Rust 1.88. It wasn't run for this page, because it needs an indexer. All functions used are in `src/keys.rs` and `src/wallet/singlesig.rs` at that tag.

```toml
[dependencies]
rgb-lib = "=0.3.0-beta.7"
```

```rust
use rgb_lib::keys::{generate_keys, WitnessVersion};
use rgb_lib::wallet::{DatabaseType, OnlineOptions, SinglesigKeys, Wallet, WalletData};
use rgb_lib::{AssetSchema, BitcoinNetwork};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let network = BitcoinNetwork::Regtest;
    let keys = generate_keys(network, WitnessVersion::Taproot);
    // Store keys.mnemonic safely. It is needed, but not enough, to restore the wallet.

    std::fs::create_dir_all("rgb-data")?;
    let mut wallet = Wallet::new(
        WalletData {
            data_dir: "rgb-data".to_string(),
            bitcoin_network: network,
            database_type: DatabaseType::Sqlite,
            max_allocations_per_utxo: 5,
            // Must not be empty: an empty list fails with NoSupportedSchemas,
            // despite the field's doc comment (src/wallet/core.rs).
            supported_schemas: vec![AssetSchema::Nia],
        },
        SinglesigKeys::from_keys(&keys, None),
    )?;

    let online = wallet.go_online(OnlineOptions {
        indexer_url: "127.0.0.1:50001".to_string(), // your Electrum server
        skip_consistency_check: false,
        vanilla_sync_lookback: 20,
    })?;
    println!("fund this address: {}", wallet.get_address()?);

    // After funding: create UTXOs to hold RGB allocations (fee rate in sat/vB).
    wallet.create_utxos(online, false, None, None, 2, false)?;

    // Ticker, name, precision, and one amount per allocation.
    let asset = wallet.issue_asset_nia("DEMO".into(), "Demo Asset".into(), 2, vec![100_000])?;
    println!("issued {}", asset.asset_id);
    Ok(())
}
```

- `issue_asset_nia` is offline. Each entry in `amounts` becomes a separate allocation on a separate UTXO, which must already exist (`create_utxos`).
- rgb-lib puts empty terms in genesis. To set your own terms or details, use the Rust builder below.
- The [RGB Lightning Node](/guides/lightning/overview) exposes the same call as `POST /issueassetnia` with `{"ticker", "name", "precision", "amounts"}`.
- The Kotlin, Swift, Python and Node.js (npm `rgb-lib`) bindings expose `issue_asset_nia` too (as `issueAssetNIA` in Node.js). The Node.js bindings lack the IFA calls (`issueAssetIFA`, `inflate`, `burn`); see [JavaScript and TypeScript](/guides/development/rgbjs).

### With the Rust contract builder

To control every field, build genesis with `rgb-ops` and `rgb-schemas` 0.11.1:

```toml
[dependencies]
rgb-ops = { version = "=0.11.1", features = ["fs"] }
rgb-schemas = "=0.11.1"
```

Don't add these to a project that also uses `rgb-lib` 0.3.0-beta.7: rgb-lib pins `rgb-ops` and `rgb-schemas` to `=0.11.1-rc.11` (its `Cargo.toml`), so Cargo can't resolve both. This is the core of [`examples/nia.rs`](https://github.com/rgb-protocol/rgb-schemas/blob/0.11.1/examples/nia.rs) (`rgbstd` is the library name of the `rgb-ops` crate, and `schemata` that of `rgb-schemas`):

```rust
use rgbstd::stl::{AssetSpec, ContractTerms, RicardianContract};
use rgbstd::invoice::Precision;
use rgbstd::{Amount, ChainNet};
use schemata::NonInflatableAsset;

let spec = AssetSpec::new("DEMO", "Demo Asset", Precision::Centi);
let terms = ContractTerms { text: RicardianContract::default(), media: None };

let contract = stock
    .contract_builder("ssi:anonymous", NonInflatableAsset::schema().schema_id(), ChainNet::BitcoinTestnet4)?
    .add_global_state("spec", spec)?
    .add_global_state("terms", terms)?
    .add_global_state("issuedSupply", Amount::from(100_000u64))?
    .add_fungible_state("assetOwner", genesis_seal, 100_000u64)?
    .issue_contract()?;
```

Here `stock` is a `Stock` with the NIA kit imported, and `genesis_seal` is a `GenesisSeal` built with `BlindSeal::with_blinding(txid, vout, blinding)`. See `examples/common/mod.rs` for both. `issue_contract_raw(timestamp)` gives a fixed timestamp, which makes the contract ID reproducible in tests.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## v0.12: RGB20-FNA

:::danger Release candidate, test networks only
`rgb-wallet` 0.12.0-rc.3 refuses mainnet. Use testnet4, signet or regtest.
:::

v0.12 issues from an **issuer** file (a compiled codex plus its API) and a YAML parameter file. The `RGB-WG/rgb` repository ships `examples/RGB20-FNA.issuer` and `examples/DemoToken.yaml`. More issuers are published in [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers).

```bash line=A
rgb -d examples/data import examples/RGB20-FNA.issuer
rgb -d examples/data issue -w alice examples/DemoToken.yaml
```

Real output (2026-10-19):

```text
Processing 'RGB20-FNA.issuer' ... codex id 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet ... success
A new contract issued with ID contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y
```

The parameter file names the issuer by codex ID, sets the globals by their API names, and assigns the supply to a seal (an outpoint in your wallet):

```yaml
consensus: bitcoin
testnet: true
issuer:
  codexId: 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8
  version: 0
  checksum: AYkSrg
name: DemoToken
method: issue
timestamp: "2024-12-18T10:32:00-02:00"

global:
  - name: ticker
    verified: DEMO
  - name: name
    verified: Demo Token
  - name: precision
    verified: centiMilli
  - name: issued
    verified: 10000

owned:
  - name: balance
    seal: b7116550736fbe5d3e234d0141c6bc8d1825f94da78514a3cede5674e9a5eae9:1
    data: 10000
```

To issue your own token, copy this file, give it a new `name`, and replace `seal` with an outpoint from `rgb seals -w <wallet>`. `rgb issue` with no file lists the issuers you have imported. The [Quick Start](/getting-started/quick-start) walks through setting up a testnet4 wallet, and the [CLI reference](/technical-reference/cli#issue) lists every option.

There is no stable Rust issuing API for rc.3. The CLI calls `RgbWallet::issue(CreateParams)` (`rgb-std` 0.12.0-rc.3 `src/popls/bp.rs`), which wraps `Contracts::issue` (`src/contracts.rs`).

</TabItem>
</Tabs>

## Next

- [Transferring assets](/guides/rgb20/transferring-assets)
- [Schemas (v0.11)](/guides/contracts/schemas)
