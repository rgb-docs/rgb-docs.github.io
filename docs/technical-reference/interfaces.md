---
sidebar_position: 3
title: Interfaces, schemas and codexes
description: The RGB "interface" API is gone from both current lines. How v0.11 (schemas and wrappers) and v0.12 (codexes, APIs and issuers) give wallets a standard view of a contract instead.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Interfaces, schemas and codexes

:::info Applies to both RGB lines
Neither current line has the old interface API. Line B uses schemas with Rust wrappers, and Line A uses codexes, APIs and issuers. See [Two RGB lines](/getting-started/two-rgbs).
:::

## A short history

Up to the v0.11 betas (the last, beta.9, came out in November 2024), RGB-WG's `rgb-std` had **interfaces**: `Iface` definitions named RGB20, RGB21 and RGB25, and `IfaceImpl` values that mapped an interface onto a schema, so a wallet could read any fungible contract the same way. Code from that period uses calls such as `contract_iface_class::<Rgb20>()`.

Both lines dropped that design after the split:

- **Line B** (`rgb-ops` 0.11.1) has no `Iface` types. A grep for `IfaceImpl` or `contract_iface_class` in `rgb-ops`, `rgb-api` and `rgb-lib` finds nothing. Line B names its contract types after their schemas (NIA, IFA, UDA, CFA, PFA) and treats "RGB20" and "RGB21" as deprecated names.
- **Line A** (v0.12) replaced schemas and interfaces with **codexes** and **APIs**. The name RGB20 survives in issuer names such as `RGB20-FNA`, and an API can list the interface standards it conforms to.

Code or tutorials that use `Iface`, `IfaceImpl` or `rgbstd::interface` are for the old betas and won't compile against either line.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## Line B: schemas and wrappers

A **schema** defines a contract type: its global and owned state, its transitions and its AluVM validation scripts. The standard schemas are in [`rgb-schemas`](https://github.com/rgb-protocol/rgb-schemas) 0.11.1, and each comes as a compiled `.rgb` kit that a wallet imports. The [Schemas guide](/guides/contracts/schemas) covers the five standard schemas, their fields and their ids.

In place of interfaces, `rgb-ops` 0.11.1 (`src/contract/schema.rs`) has two traits:

- `IssuerWrapper`, implemented by each schema type (`NonInflatableAsset`, `InflatableFungibleAsset`, `UniqueDigitalAsset`, `CollectibleFungibleAsset`, `PermissionedFungibleAsset`). It provides `schema()`, `types()`, `scripts()` and `kit()`.
- `SchemaWrapper`, implemented by the matching read-only view (`NiaWrapper`, `IfaWrapper`, …), which has typed getters such as `spec()`, `contract_terms()`, `total_issued_supply()` and `allocations()`.

Reading a NIA contract, as in `examples/nia.rs` of `rgb-schemas` 0.11.1 (crates `rgb-ops` 0.11.1, imported as `rgbstd`, and `rgb-schemas` 0.11.1, imported as `schemata`):

```rust
use rgbstd::contract::FilterIncludeAll;
use schemata::NonInflatableAsset;

let contract = stock.contract_wrapper::<NonInflatableAsset>(contract_id)?;
let spec = contract.spec();                       // ticker, name, precision
let supply = contract.total_issued_supply();
for alloc in contract.allocations(&FilterIncludeAll) {
    println!("{} at {}", alloc.state.value(), alloc.seal);
}
```

`Stock::contract_wrapper` is in `src/persistence/stock.rs`. Apps built on [`rgb-lib`](https://github.com/RGB-Tools/rgb-lib) don't touch these traits: rgb-lib embeds the NIA, UDA, CFA and IFA schemas and exposes assets through its own API.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## Line A: codexes, APIs and issuers

v0.12 splits a contract type into a part that consensus checks and a part that only wallets use:

| Piece | What it is | Source |
|---|---|---|
| **Codex** | The consensus part: a name, the developer's identity, the field order and VM settings, and one zk-AluVM **verifier** per call. Its id prints like `7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet` | `ultrasonic` 0.12.0 `src/codex.rs` |
| **API** | The interface part, outside consensus: how global and owned state are built from field elements, the aggregators that compute derived values (such as total supply), the map from method names to verifier calls, and the error texts. `conforms` lists the interface standards the API follows | `sonic-api` 0.12.0 `src/api.rs` |
| **Semantics** | A default API plus named custom APIs, the libraries they use, and the type system | `sonic-api` 0.12.0 `src/api.rs` |
| **Issuer** | A codex together with its semantics, optionally signed by the developer, saved as a `.issuer` file | `sonic-api` 0.12.0 `src/issuer.rs` |

A wallet imports an issuer, then issues contracts from it with a YAML parameter file:

```bash line=A
rgb import examples/RGB20-FNA.issuer
rgb issue -w alice examples/DemoToken.yaml
```

Real output (rgb-wallet 0.12.0-rc.3, offline, 2026-10-19):

```text
Processing 'RGB20-FNA.issuer' ... codex id 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet ... success
A new contract issued with ID contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y
```

The parameter file names the codex, the method (`issue`) and the initial global and owned state by their API names (`ticker`, `name`, `precision`, `issued`, `balance`). Issuers are published in [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers). See [`import`](./cli.md#import) and [`issue`](./cli.md#issue) in the CLI reference, and the [Quick Start](/getting-started/quick-start).

</TabItem>
</Tabs>

## Further reading

- Line B: [Schemas guide](/guides/contracts/schemas); [Schema](https://github.com/rgb-protocol/RGB-Documentation/blob/master/rgb-contract-implementation/schema/README.md) in the official docs; `rgb-ops` on [docs.rs](https://docs.rs/rgb-ops/0.11.1)
- Line A: `sonic-api` on [docs.rs](https://docs.rs/sonic-api/0.12.0) and `ultrasonic` on [docs.rs](https://docs.rs/ultrasonic/0.12.0); [Genesis](/guides/contracts/genesis)
