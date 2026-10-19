---
sidebar_position: 3
title: Genesis
description: How a new RGB contract is issued on each line, with rgb issue, ContractBuilder, rgb-lib and .issuer files. Genesis is not a Bitcoin transaction.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Genesis

:::info Applies to both RGB lines
Both lines start a contract with a genesis operation, but the data structures, tools and files differ. See [Two RGB lines](/getting-started/two-rgbs).
:::

Genesis is the first operation of a contract. It sets the contract's initial global state (ticker, name, supply and so on) and assigns its first owned state to seals, which are Bitcoin outpoints the issuer controls. The contract ID is computed from the genesis.

What genesis is **not**:

- **It isn't a Bitcoin transaction and isn't anchored to one.** No commitment is published when you issue. Genesis seals point at outputs that already exist. Only later state transitions are committed to the witness transactions that spend those outputs. In Line B's words, a genesis seal "always needs to point to an existing txid since there is no witness transaction" ([RGB docs](https://docs.rgb.info/rgb-state-and-operations/components-of-a-contract-operation)).
- **It doesn't hide amounts.** Neither line uses Pedersen commitments or bulletproofs. Amounts are visible to whoever validates the contract. Line B blinds the seals (which outpoint holds the state), not the amounts.
- **It isn't signed by a holder key.** Ownership comes from controlling the seal outpoints.

:::danger Issue only to outputs your RGB wallet controls
Use an outpoint of the wallet that will hold the asset, and never spend it with a wallet that doesn't know about RGB. Spending a seal outside an RGB-aware tool destroys the state assigned to it. Line A (rc.3) issues on test networks only.
:::

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## Line B: schemas and ContractBuilder

A Line B contract follows a **schema**: NIA, IFA, UDA, CFA or PFA, from [rgb-schemas](https://github.com/rgb-protocol/rgb-schemas) 0.11.1. The genesis structure is ([`rgb-consensus` `src/operation/operations.rs`](https://github.com/rgb-protocol/rgb-consensus/blob/0.11.1/src/operation/operations.rs)):

```rust
// rgb-consensus 0.11.1
pub struct Genesis {
    pub ffv: Ffv,
    pub schema_id: SchemaId,
    pub timestamp: i64,
    pub issuer: Identity,
    pub chain_net: ChainNet,                          // e.g. BitcoinMainnet, BitcoinTestnet4, BitcoinRegtest
    pub seal_closing_strategy: SealClosingStrategy,   // FirstOpretOrTapret
    pub metadata: Metadata,
    pub globals: GlobalState,
    pub assignments: Assignments<GenesisSeal>,
}
```

The contract ID is the genesis operation ID, shown as `rgb:` plus Baid64. There are no valencies and no extensions in 0.11.1. NIA's state is the globals `spec` (an `AssetSpec`), `terms` and `issuedSupply`, plus the owned state `assetOwner`. Its limits come from `rgb-ops` `src/stl/specs.rs`: the ticker is 1 to 8 characters, the name 1 to 40 characters, and the precision 0 to 18 decimal places.

### With the CLI

Import the schema kit, write a YAML file and run `rgb issue`. These commands ran offline with `rgb-cmd` 0.11.1 on 2026-10-19:

```yaml title="demo.yaml"
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

```bash line=B
rgb -n regtest -d data0 import NonInflatableAsset.rgb
rgb -n regtest -d data0 issue "ssi:issuer" demo.yaml
```

```text
A new contract rgb:vqtQSjVi-x9y5~WR-t8wds~_-6KCHaVx-pjM49W4-LLtiaH4 is issued and added to the stash.
Use `export` command to export the contract.
```

The ID changes every run, because the CLI blinds each genesis seal with a random value. Templates for every schema are in [rgb-sandbox `contracts/`](https://github.com/rgb-protocol/rgb-sandbox/tree/master/contracts). The flags are in the [v0.11 CLI reference](/technical-reference/cli-v011#issue).

### In Rust, with rgb-ops

```toml
[dependencies]
rgb-ops = { version = "=0.11.1", features = ["fs"] }
```

```rust
// rgb-ops 0.11.1 (library name `rgbstd`). Compiled and run on 2026-10-19.
use std::str::FromStr;

use rgbstd::containers::{ConsignmentExt, FileContent, Kit};
use rgbstd::invoice::Precision;
use rgbstd::persistence::Stock;
use rgbstd::schema::SchemaId;
use rgbstd::stl::{AssetSpec, ContractTerms, RicardianContract};
use rgbstd::txout::BlindSeal;
use rgbstd::{Amount, ChainNet, GenesisSeal, Txid};

fn main() {
    // The NIA kit from rgb-protocol/rgb-schemas 0.11.1 (schemata/NonInflatableAsset.rgb).
    let kit = Kit::load_file("NonInflatableAsset.rgb").unwrap().validate().unwrap();
    let mut stock = Stock::in_memory();
    stock.import_kit(kit).expect("invalid kit");

    let schema_id = SchemaId::from_str(
        "rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus",
    )
    .unwrap();
    // An outpoint the issuer owns. Use a fresh random u64 for the blinding.
    let txid = "02e107ddf4f42757f44fac43feb007606d8caf40616fa92dba62176995513e88";
    let seal = GenesisSeal::from(BlindSeal::with_blinding(Txid::from_str(txid).unwrap(), 0, 0x5eed));
    let terms = ContractTerms { text: RicardianContract::default(), media: None };

    let contract = stock
        .contract_builder("ssi:issuer", schema_id, ChainNet::BitcoinRegtest)
        .unwrap()
        .add_global_state("spec", AssetSpec::new("DEMO", "Demo asset", Precision::Indivisible))
        .unwrap()
        .add_global_state("terms", terms)
        .unwrap()
        .add_global_state("issuedSupply", Amount::from(1000u64))
        .unwrap()
        .add_fungible_state("assetOwner", seal, 1000u64)
        .unwrap()
        .issue_contract()
        .expect("contract doesn't fit the schema");

    println!("{}", contract.contract_id()); // rgb:AV3zvi8b-dnUCMju-…
}
```

`issue_contract()` stamps the current time. `issue_contract_raw(timestamp)` takes a fixed one, which gives a reproducible ID. With the `rgb-schemas` crate you can use `ContractBuilder::with(issuer, NonInflatableAsset::schema(), NonInflatableAsset::types(), NonInflatableAsset::scripts(), chain_net)` instead of loading a kit file, as its [`examples/nia.rs`](https://github.com/rgb-protocol/rgb-schemas/blob/0.11.1/examples/nia.rs) does.

### In an app, with rgb-lib

[rgb-lib](https://github.com/RGB-Tools/rgb-lib) picks the issuer's UTXOs and blinds the seals for you. Each amount becomes a separate allocation on a UTXO the wallet already has, so create UTXOs first with `create_utxos`.

```rust
// rgb-lib 0.3.0-beta.7, src/wallet/singlesig.rs. Checked against the source, not compiled.
let asset = wallet.issue_asset_nia(
    "DEMO".to_string(),       // ticker
    "Demo asset".to_string(), // name
    0,                        // precision
    vec![1000],               // amounts, one allocation each
)?;
println!("{}", asset.asset_id);
```

`issue_asset_ifa`, `issue_asset_uda` and `issue_asset_cfa` cover the other schemas. See [Rust](../development/rust-sdk.md) for setting up the wallet.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## Line A: codexes and issuers

Line A has no schemas. A contract is issued from an **issuer**: a compiled codex (the verification code) plus its API, distributed as an `.issuer` file. The genesis structure is ([`ultrasonic` 0.12.0 `src/operation.rs`](https://github.com/AluVM/ultrasonic/blob/v0.12.0/src/operation.rs)):

```rust
// ultrasonic 0.12.0 (reserved padding fields omitted)
pub struct Genesis {
    pub version: ReservedBytes<1>,
    pub codex_id: CodexId,
    pub call_id: CallId,
    pub nonce: fe256,
    pub destructible_out: SmallVec<StateCell>, // owned state, locked to seals
    pub immutable_out: SmallVec<StateData>,    // global, append-only state
}
```

The contract ID commits to the contract metadata, the codex ID and the genesis (`Issue` in `src/issue.rs`). It's shown as `contract:` plus Baid64.

### With the CLI

Import an issuer, then issue with a YAML parameter file. These are [`examples/RGB20-FNA.issuer`](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/examples/RGB20-FNA.issuer) and [`examples/DemoToken.yaml`](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/examples/DemoToken.yaml) from the `rgb` repo, run offline with `rgb-wallet` 0.12.0-rc.3 on 2026-10-19 against a copy of its `examples/data` directory:

```yaml title="DemoToken.yaml"
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

```bash line=A
rgb -d data import RGB20-FNA.issuer
rgb -d data issue -w alice DemoToken.yaml
```

```text
Processing 'RGB20-FNA.issuer' ... codex id 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet ... success
A new contract issued with ID contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y
```

With a fixed timestamp the ID is reproducible. `rgb issue` with no file lists the issuers you've imported. Issuers are published in [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers). That repo's README says no external audit of them has been made. Its readiness table marks only FNA (fungible, non-inflatable) as ready. NFU (unique NFT) and UFA (RGB25) also have compiled issuers. The flags are in the [v0.12 CLI reference](/technical-reference/cli#issue).

### In Rust

The same parameters map to `CreateParams` in `rgb-std` 0.12.0-rc.3 (`src/contract.rs`), which you pass to `Contracts::issue`. `CreateParams::new_testnet(issuer, Consensus::Bitcoin, name)` starts one; then add globals with `with_global_verified` and owned state with `push_owned_unlocked`. See [Rust](../development/rust-sdk.md).

</TabItem>
</Tabs>

## After issuing

Genesis lives only in the issuer's data directory until you share it. Back that directory up. To hand the contract to someone, export it: `rgb export` on Line B, or `rgb backup` on Line A (it writes a consignment that `rgb accept -u` loads). Then transfer it with a [state transition](./state-transitions.md).
