---
sidebar_position: 3
title: Global State
description: Append-only contract data that nobody owns, such as ticker, name, supply and terms. What it is and how each RGB line stores it.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Global State

:::info Applies to both RGB lines
Both lines have append-only global state; the encoding differs. See [Two RGB lines](/getting-started/two-rgbs).
:::

**Global state** is contract data that is not bound to any Bitcoin output: an asset's ticker, name, precision, issued supply, legal terms, or a record of each later issuance. It is part of the contract, but nobody "owns" or spends it.

Three things are often misunderstood:

- **It is not public.** Like everything in RGB, it is client-side data. It is visible only to people who receive a consignment containing it. For example, everyone who receives the asset also receives its genesis, and with it the ticker and supply. Nobody else does.
- **It is append-only.** An operation can add new global values. It can never change or delete existing ones. There are no global variables to update.
- **There is no voting or consensus behind it.** An operation that adds global state is valid if it follows the contract's rules, which are the schema (B) or the codex (A). In Line B it must also spend at least one owned input. Its ordering comes from the Bitcoin transactions that anchor it. Two parties can't disagree about it, because the seals they spend are single-use.

Typical pattern: the right to change something is an **owned** state (for example IFA's inflation allowance in Line B). Using that right emits new **global** data (the newly issued amount).

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

Each global state type in the schema is declared as (`rgb-consensus` 0.11.1 `src/schema/state.rs`):

```rust
pub struct GlobalStateSchema {
    pub sem_id: SemId,     // strict type of each value
    pub max_items: u24,    // how many values one operation may add
}
```

`GlobalStateSchema::once(sem_id)` allows a single value. Genesis and transitions carry new values in their `globals` field.

For example, the NIA schema (`rgb-schemas` 0.11.1 `src/nia.rs`) declares three global types, each `once`: `spec` (`RGBContract.AssetSpec`), `terms` (`RGBContract.ContractTerms`) and `issuedSupply` (`RGBContract.Amount`). This is what `rgb state` shows for them:

```text
Global:
  spec := ticker "DEMO", name "Demo asset", details ~, precision centi
  terms := text "Demo terms", media ~
  issuedSupply := 100000000
```

AluVM scripts can read global state: `ldg` reads the current operation's values and `ldc` reads the contract's accumulated values (`rgb-consensus` `src/vm/op_contract.rs`).

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

Global state is a set of **immutable memory cells**, `immutable_out` in an operation (`ultrasonic` 0.12.0 `src/operation.rs`, `src/state.rs`):

```rust
pub struct StateData {
    pub value: StateValue,      // 0 to 4 fe256 field elements; the VM can check these
    pub raw: Option<RawData>,   // arbitrary bytes; committed to, but not readable by the VM
}
```

Later operations can reference earlier immutable cells through `immutable_in: [CellAddr]`, where a `CellAddr` is an operation id plus an index. The codex's API gives the cells names and types. In the demo `RGB20-FNA` contract these are `ticker`, `name`, `precision` and `issued`.

The CLI shows the field-element part as "verifiable state" and the raw part as "unverifiable state":

```text
Global: State name      	Conf. height	Verifiable state                	Unverifiable state              	RGB output
	issued          	genesis     	10000                           	~                               	rtVWyitimkZyM4bDei2AcftvX0HKur8kfdf~0Ku2Ry8:3
	ticker          	genesis     	"DEMO"                          	~                               	rtVWyitimkZyM4bDei2AcftvX0HKur8kfdf~0Ku2Ry8:0
```

`rgb-std` also derives **aggregated** state from global cells, e.g. total `supply`.

</TabItem>
</Tabs>

## What global state can't do

- **Read the clock or the chain.** Validation scripts in both lines are deterministic and have no access to time, block height or network data.
- **Be updated in place.** To "change" a value, a contract appends a new one, and the contract's API decides which value counts (for example, the latest).
- **Fork.** Every recipient who validates the same history gets the same global state.

## Privacy trade-off

Global data reaches every future holder of the contract's state. Don't put anything in it that later recipients shouldn't see. Per-transfer data that doesn't need to be kept belongs elsewhere: in Line B's operation `metadata`, or in an owned state value.
