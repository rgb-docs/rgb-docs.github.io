---
sidebar_position: 1
title: Schemas (v0.11)
description: The five standard RGB v0.11 schemas (NIA, IFA, UDA, CFA, PFA), what each contains, and how schemas are built and imported. v0.12 has no schemas.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# Schemas (v0.11)

:::info RGB v0.11 line (rgb-cmd 0.11.1)
Schemas are a v0.11 concept. RGB v0.12 replaced them with codexes, issuers and APIs. See [Two RGB lines](/getting-started/two-rgbs).
:::

A **schema** is the template that every contract of one kind follows. It lists the global state types, the owned state types and the allowed transitions, and it points to the AluVM scripts that validate genesis and each transition. Every contract records its schema ID in genesis, and wallets validate each operation of the contract against that schema.

Schemas are Rust code. The [`rgb-schemas`](https://github.com/rgb-protocol/rgb-schemas) crate (0.11.1, 2026-09-16) builds each one as a `Schema` value, and its `rgb-schemas` binary compiles them into strict-encoded `.rgb` kit files. There is no YAML or text format for schemas, no schema compiler CLI and no schema registry.

:::note No interfaces in v0.11
Line B has no RGB20/RGB21 interfaces: the `rgb-ops` 0.11.1 source has no `Iface` types. Line B treats the names "RGB20" and "RGB21" as deprecated and uses the schema names below. Code reads a contract through a schema-specific wrapper, using the `IssuerWrapper` and `SchemaWrapper` traits (`rgb-ops` `src/contract/schema.rs`).
:::

## The five standard schemas

Summarised from `rgb-schemas` 0.11.1 `src/*.rs` and the official [supported schemas](https://github.com/rgb-protocol/RGB-Documentation/blob/master/rgb-contract-implementation/schema/supported-schemas.md) page.

| Schema | What it is | Global state | Owned state | Transitions | 0.11.1 README |
|---|---|---|---|---|---|
| **NIA**, Non-Inflatable Asset | Fixed-supply fungible token | `spec`, `terms`, `issuedSupply` | `assetOwner` (u64) | `transfer` | |
| **IFA**, Inflatable Fungible Asset | Fungible token with secondary issuance, burn and link | NIA's, plus `maxSupply`, `rejectListUrl`, `linkedFromContract`, `linkedToContract` | `assetOwner`, `inflationAllowance`, `linkRight` | `transfer`, `inflate`, `burn`, `link` | **Not production-ready** |
| **UDA**, Unique Digital Asset | One NFT per contract | `spec`, `terms`, `tokens` (one `TokenData`), `attachmentTypes` | `assetOwner` (token index and fraction, always 1) | `transfer` | |
| **CFA**, Collectible Fungible Asset | Fungible token with an optional `art` (Article) string | `art`, `name`, `details`, `precision`, `terms`, `issuedSupply` | `assetOwner` (u64) | `transfer` | |
| **PFA**, Permissioned Fungible Asset | Fixed supply. The issuer signs every transfer | NIA's, plus `pubkey` | `assetOwner` (u64) | `transfer` (signature checked) | **Not production-ready** |

Guides: [NIA tokens](/guides/rgb20/creating-tokens), [IFA secondary issuance](/guides/rgb20/secondary-issuance), [UDA NFTs](/guides/rgb21/creating-nfts) and [CFA](/guides/rgb25/overview).

## Inside a schema

This is the NIA schema from `rgb-schemas` 0.11.1 `src/nia.rs`, shortened. It is a Rust value, not a configuration file:

```rust
Schema {
    ffv: zero!(),
    name: tn!("NonInflatableAsset"),
    meta_types: none!(),
    global_types: tiny_bmap! {
        GS_NOMINAL => GlobalDetails {
            global_state_schema: GlobalStateSchema::once(types.get("RGBContract.AssetSpec")),
            name: fname!("spec"),
        },
        // GS_TERMS => "terms", GS_ISSUED_SUPPLY => "issuedSupply"
    },
    owned_types: tiny_bmap! {
        OS_ASSET => AssignmentDetails {
            owned_state_schema: OwnedStateSchema::Fungible(FungibleType::Unsigned64Bit),
            name: fname!("assetOwner"),
            default_transition: TS_TRANSFER,
        }
    },
    genesis: GenesisSchema { /* each global Once, assetOwner OnceOrMore, validator */ },
    transitions: tiny_bmap! { TS_TRANSFER => TransitionDetails { /* … */ } },
    default_assignment: Some(OS_ASSET),
}
```

- **Type numbers** are fixed in `src/lib.rs`. For example, `GS_NOMINAL` is 2000, `GS_TERMS` 2001, `GS_ISSUED_SUPPLY` 2010, `OS_ASSET` 4000 and `TS_TRANSFER` 10000.
- **Global state** belongs to one contract and is append-only. Genesis sets it, and a transition can add entries (an IFA `inflate` adds a new `issuedSupply`). Nothing overwrites it.
- **Owned state** comes in three kinds in 0.11.1: declarative (no value), fungible (u64) and structured (strict-typed data, such as the UDA allocation). Attachments are not a state type.
- **Validation scripts** are AluVM bytecode. The NIA transfer check is four instructions:

  ```rust
  put     a8[0],ERRNO_NON_EQUAL_IN_OUT;  // errno 0 if the check fails
  svs     OS_ASSET;                       // sum of inputs == sum of outputs
  test;
  ret;
  ```

  Amounts are plain u64 values, visible to everyone who validates the consignment. Neither RGB line uses Pedersen commitments.
- **The schema ID** is a commitment to the whole `Schema` value. Change one field and you get a different schema, so schemas can't be upgraded. IFA's `link` transition exists so that an issuer can point holders to a replacement contract.

## Using a schema

A wallet needs the compiled kit before it can issue or accept contracts of that schema. `rgb-schemas` ships the kits in `schemata/`. The IDs below are real `rgb import` output (rgb-cmd 0.11.1, run offline on 2026-10-19):

```bash
rgb -n regtest -d data0 import rgb-schemas/schemata/NonInflatableAsset.rgb
rgb -n regtest -d data0 schemata
```

| Schema | Schema ID |
|---|---|
| NIA | `rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus` |
| IFA | `rgb:sch:IpjJhFLz3oywYKQxO3KmFgR0Aa415nlTNrNyEFqMZCE#shoe-colombo-mango` |
| UDA | `rgb:sch:~6rjymf3GTE840lb5JoXm2aFwE8eWCk3mCjOf_mUztE#spider-montana-fantasy` |
| CFA | `rgb:sch:JgqK5hJX9YBT4osCV7VcW_iLTcA5csUCnLzvaKTTrNY#mars-house-friend` |
| PFA | `rgb:sch:YvvvQ4UsHuPQDT3nIQ9mnpsqMbrs5lYZRbyymHVrkY8#famous-process-eagle` |

[rgb-lib](https://github.com/RGB-Tools/rgb-lib) 0.3.0-beta.7 embeds NIA, UDA, CFA and IFA (its `AssetSchema` enum), so apps built on it import nothing. It doesn't support PFA.

To issue from Rust, pass a schema to `ContractBuilder::with(issuer, schema, types, scripts, chain_net)`, or call `stock.contract_builder(issuer, schema_id, chain_net)`. The [`examples/`](https://github.com/rgb-protocol/rgb-schemas/tree/0.11.1/examples) directory of rgb-schemas has one program per schema. A custom schema is a new Rust module built the same way. Wallets only accept contracts whose schema they have imported, so in practice apps use the five standard schemas.

:::info RGB v0.12 has no schemas
`rgb-core` 0.12 removed schema verification. In v0.12 (rgb-wallet 0.12.0-rc.3), a contract is issued from an **issuer** file, which holds a codex (the validation code) and an API, together with a YAML parameter file such as `DemoToken.yaml`. See [Genesis](/guides/contracts/genesis) and the [Quick Start](/getting-started/quick-start).
:::

## Further reading

- [rgb-schemas](https://github.com/rgb-protocol/rgb-schemas): source and compiled kits
- Official docs ([docs.rgb.info](https://docs.rgb.info)): [Schema](https://github.com/rgb-protocol/RGB-Documentation/blob/master/rgb-contract-implementation/schema/README.md) and the [NIA schema walkthrough](https://github.com/rgb-protocol/RGB-Documentation/blob/master/rgb-contract-implementation/schema/non-inflatable-fungible-asset-schema.md)
- [CLI reference (v0.11)](/technical-reference/cli-v011)
