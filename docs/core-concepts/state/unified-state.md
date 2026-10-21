---
sidebar_position: 1
title: State model
description: How each RGB line represents contract state. Typed owned, global and metadata state in v0.11, and field-element memory cells in v0.12.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# State model

:::info Applies to both RGB lines
Both lines split contract state into an owned part bound to Bitcoin outputs and a public part, but they encode it very differently. See [Two RGB lines](/getting-started/two-rgbs).
:::

An RGB contract's state is built up by **operations**: genesis, then the operations that follow it. Each operation can create two kinds of state:

- **Owned state** is assigned to a [single-use seal](../single-use-seals.md), a Bitcoin output. Whoever can spend the output can move the state, by spending the output in a transaction that commits to a new operation. Balances, NFTs and issuance rights are owned state. See [Owned state](./owned-state.md).
- **Global state** is data that the operation publishes to the contract and that nobody owns: ticker, name, issued supply, terms. It is append-only. See [Global state](./global-state.md).

Both are client-side data. Nothing but a 32-byte commitment reaches the blockchain, and each holder sees only the history they received.

## The two encodings

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

State is **typed by the schema**. Each owned or global state type has a number and a declared type (`rgb-consensus` 0.11.1 `src/schema/state.rs`):

| Kind | Declared as | Holds |
|---|---|---|
| Owned, declarative | `OwnedStateSchema::Declarative` | Nothing: a right with no value (e.g. the IFA `linkRight`) |
| Owned, fungible | `OwnedStateSchema::Fungible(FungibleType::Unsigned64Bit)` | A `u64` amount; it's the only fungible type |
| Owned, structured | `OwnedStateSchema::Structured(SemId)` | A strict-typed value, e.g. an NFT allocation |
| Global | `GlobalStateSchema { sem_id, max_items: u24 }` | Up to `max_items` strict-typed values of that type |
| Metadata | `MetaDetails { sem_id, .. }` | Per-operation strict-typed data that isn't kept as state |

A transition carries all three (`src/operation/operations.rs`):

```rust
pub struct Transition {
    pub ffv: Ffv,
    pub contract_id: ContractId,
    pub nonce: u64,
    pub transition_type: TransitionType,
    pub metadata: Metadata,
    pub globals: GlobalState,
    pub inputs: Inputs,                      // NonEmptyOrdSet<Opout, U16>: at least one spent seal
    pub assignments: Assignments<GraphSeal>, // new owned state
    pub signature: Option<Signature>,
}
```

Here is the real state of a NIA (non-inflatable asset) contract issued offline with `rgb-cmd` 0.11.1:

```bash line=B
rgb -n regtest state -a rgb:Ca0d5l5K-Cr4Wm6I-owUkn6t-2NHrgjk-R1KRreF-tVBhAR0
```

```text
Global:
  spec := ticker "DEMO", name "Demo asset", details ~, precision centi
  terms := text "Demo terms", media ~
  issuedSupply := 100000000

Owned:
  State      	Seal                                                                          	Witness
  assetOwner:
    100000000	b449f7eaa3f98c145b27ad0eeb7b5679ceb567faef7a52479bc995792b65f804:1	~ -- third-party
```

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

State lives in **UltraSONIC memory cells** made of field elements. Their meaning comes from the contract's codex and API, not from the consensus layer (`ultrasonic` 0.12.0 `src/state.rs`, `src/operation.rs`):

```text
data StateValue : none () | single Fe256 | double (Fe256, Fe256)
                | triple (Fe256, Fe256, Fe256) | quadruple (Fe256, Fe256, Fe256, Fe256)

data StateCell  : data StateValue, auth AuthToken, lock CellLock?   -- destructible ("owned")
data StateData  : value StateValue, raw RawData?                    -- immutable ("global")

data Operation  : version, contractId, callId U16, nonce Fe256, witness StateValue
                , destructibleIn [Input], immutableIn [CellAddr]
                , destructibleOut [StateCell], immutableOut [StateData]
```

(Excerpt from `ultrasonic` 0.12.0 `stl/UltraSONIC@0.12.0.sty`, the strict-types definition of these types.)

- A **destructible** cell is owned state. Its `auth` token is derived from the seal (see [single-use seals](../single-use-seals.md)). It is destroyed when an operation spends it. An optional `CellLock` adds a script condition.
- An **immutable** cell is global state. Its `raw` bytes are stored and committed to, but the VM can't read them.
- The VM sees at most four 256-bit field elements per cell.
- Operations have **no metadata field**.
- `rgb-std` presents the state to wallets as `immutable`, `owned` and `aggregated` (values computed from the others by the API, e.g. total supply) (`rgb-std` 0.12.0-rc.3 `src/contracts.rs`).

Here is the real state of the demo `RGB20-FNA` contract issued offline with `rgb-wallet` 0.12.0-rc.3 from the examples in the `RGB-WG/rgb` repo (steps 1 and 2 of the [quick start](/getting-started/quick-start), v0.12 tab). `state` needs a wallet: without `-w` it panics looking for `default.wallet`.

```bash line=A
rgb -d examples/data state -w alice -a -g -o
```

```text
contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y	DemoToken
Global: State name      	Conf. height	Verifiable state                	Unverifiable state              	RGB output
	issued          	genesis     	10000                           	~                               	FDqnQ~ReMcfI2N69Y1kMiLrrEIWnPzUvENfgqGbfw5M:3
	name            	genesis     	"Demo Token"                    	~                               	FDqnQ~ReMcfI2N69Y1kMiLrrEIWnPzUvENfgqGbfw5M:1
	precision       	genesis     	centiMilli                      	~                               	FDqnQ~ReMcfI2N69Y1kMiLrrEIWnPzUvENfgqGbfw5M:2
	ticker          	genesis     	"DEMO"                          	~                               	FDqnQ~ReMcfI2N69Y1kMiLrrEIWnPzUvENfgqGbfw5M:0
Aggr.:  State name      	Value                           	name            	"Demo Token"
	precision       	centiMilli
	supply          	10000
	ticker          	"DEMO"
Owned:  State name      	Conf. height	Value                           	RGB output                                    	Bitcoin outpoint
	balance         	genesis     	10000                           	FDqnQ~ReMcfI2N69Y1kMiLrrEIWnPzUvENfgqGbfw5M:0	b7116550736fbe5d3e234d0141c6bc8d1825f94da78514a3cede5674e9a5eae9:1
```

"Verifiable state" is what the VM can check. "Unverifiable state" is the raw data.

</TabItem>
</Tabs>

## Removed in both lines

- **State extensions and valencies** (public "anyone can claim" operations in RGB v0.10) exist in neither line. Every Line B transition must spend at least one owned input.
- **Confidential amounts.** Pedersen commitments and bulletproofs are gone. Amounts are explicit to everyone who receives the history; privacy comes from client-side validation and from hiding seals: blinded `SecretSeal`s in Line B, noise-hidden `AuthToken`s in Line A (which has no secret-seal type).
- **Zero-knowledge proofs** of state or history are not implemented in either line. Line A's zk-AluVM is designed to make them possible later.

## Where contract rules live

| | v0.11 (rgb-cmd) | v0.12 (rgb-wallet) |
|---|---|---|
| Rules | A **schema** (NIA, IFA, CFA, UDA, PFA in `rgb-schemas` 0.11.1), written in Rust, plus optional [AluVM](../aluvm/overview.md) scripts | A **codex** (verifier scripts in zk-AluVM) plus an **API** that gives names and types to the field elements |
| Typed meaning | In consensus, through `SemId` | In the API layer, outside consensus |
| See | [Schemas](/guides/contracts/schemas) | [What's new in v0.12](/getting-started/whats-new-0-12) |

Both lines describe state values with [strict types](/technical-reference/strict-types).
