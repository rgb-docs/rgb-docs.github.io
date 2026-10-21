---
sidebar_position: 1
title: AluVM Overview
description: The deterministic virtual machine that runs RGB contract scripts. What it is, how libraries work, and how the two RGB lines' VMs differ.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AluVM Overview

:::info Applies to both RGB lines
Both lines run contract scripts in AluVM, but in two very different versions: zk-AluVM 0.12 in Line A and `rgb-aluvm` 0.11.1 in Line B. See [Two RGB lines](/getting-started/two-rgbs).
:::

**AluVM** ("algorithmic logic unit VM") is a small, deterministic, register-based virtual machine. It has no access to the network, the clock, randomness or the file system, so a script gives the same result on every machine. RGB uses it for the parts of contract validation that a contract wants to program, such as "inputs sum to outputs". AluVM is a general VM, maintained in the [AluVM](https://github.com/AluVM) GitHub org.

## Which AluVM each line uses

| | Line A: v0.12 (rgb-wallet 0.12.0-rc.3) | Line B: v0.11 (rgb-cmd 0.11.1) |
|---|---|---|
| Crates | [`aluvm`](https://github.com/AluVM/aluvm) 0.12.0, [`zk-aluvm`](https://github.com/AluVM/zk-aluvm) 0.12.0, [`ultrasonic`](https://github.com/AluVM/ultrasonic) 0.12.0 | [`rgb-aluvm`](https://github.com/rgb-protocol/rgb-aluvm) 0.11.1, a fork of AluVM 0.11 |
| Design | A rewrite: a minimal control-flow core plus ISA extensions, aimed at future zk-STARK proving | The classic AluVM 0.11 with a large ALU instruction set |
| Data registers | 16 field-element registers `E1`–`E8`, `EA`–`EH` (each an `fe256`), plus the field-order register `FQ`; USONIC adds four `u16` iterator registers `UI1`–`UI4` | Integer `a8`…`a1024`, float `f16b`…`f512`, byte `r128`…`r8192` (32 of each size), and 16 string registers `s16` (up to 64 KiB each) |
| Status registers | `CK` (check, ok/fail), `CO` (test result), `CH` (halt on failure), `CF` (failure count) | One flag, `st0` |
| Call stack | At most 255 frames | A 65,536-entry `cs0`, but in 0.11.1 `ret` always stops the program (see the [instruction set](./instruction-set.md)) |
| Loop bound | Complexity limit only (`CA`/`CL`); `CY` exists but nothing increments it | Jump counter `cy0` (u16, at most 2^16 − 1 jumps) plus optional complexity limit `cl0` |
| Arithmetic | Field arithmetic only: `add`, `mul`, `neg`, `eq`, … | Integer and float arithmetic, bit operations, byte strings |
| Crypto | None | Hashes `ripemd`, `sha2`, `blake3`; secp256k1 point ops only behind a feature that `rgb-cmd` 0.11.1 doesn't enable; `vts` checks a transition's signature |
| RGB state access | USONIC ISA: `cknxi`, `cknxo`, `ldw`, `ldi`, `ldo`, `rsti`, `rsto` | RGB ISA: `cnp`, `cns`, `cng`, `cnc`, `ldp`, `lds`, `ldf`, `ldg`, `ldc`, `ldm`, `svs`, `sas`, `sps`, `vts` |
| Assembler macro | `uasm!` / `zk_aluasm!` | `rgbasm!` / `aluasm!` |

Sources: `aluvm-0.12.0/src/core/core.rs`, `zk-aluvm-0.12.0/src/core/core.rs`, `ultrasonic-0.12.0/src/isa/instr.rs`; `rgb-aluvm` 0.11.1 `src/reg/core_regs.rs`, `src/isa/instr.rs`; `rgb-consensus` 0.11.1 `src/vm/op_contract.rs`. Details are on the [instruction set](./instruction-set.md) page.

## Shared ideas

**Registers start undefined.** Every data register starts as "no value" (`None`), not zero. Reading an undefined register, or an arithmetic overflow, marks the result as failed (`st0 = false` in B, `CO`/`CK` in A) instead of raising an exception. `clr` makes a register undefined again.

**Programs are libraries.** Code is packaged as a `Lib` with four segments (`aluvm` 0.12.0 `src/library/lib.rs`; `rgb-aluvm` 0.11.1 `src/library/`):

| Segment | Holds | Limit |
|---|---|---|
| ISAE | Names of the instruction-set extensions the code uses | 255 (A), 64 (B) |
| code | Bytecode | 65,535 bytes |
| data | Read-only constants that instructions reference | 65,535 bytes |
| libs | Ids of other libraries this one may call | 255 (B also declares a 1,024-library program limit, `LIBS_MAX_TOTAL`, which nothing enforces) |

A library is identified by a hash of all four segments, its `LibId`. An entry point is a `LibSite`: library id plus code offset. Changing any constant in the data segment therefore changes the `LibId`, and the schema or codex that references it.

There is no RAM, heap, stack segment, or input or output area. The only data comes from registers, the data segment, and the RGB-specific load instructions that read the operation being validated.

**Complexity metering.** Each instruction has a complexity cost that is added to an accumulator (`CA` in A, `ca0` in B). If a limit is set (`CL`, `cl0`) and reached, execution stops with failure. Nobody pays a fee, but a contract can't make validators run forever. Line A codices can set the limit in `verification_config`. The `ultrasonic` test codex uses 10,000,000. `CoreConfig::default()` sets no limit (`complexity_lim: None`).

**The only output is pass or fail.** A script can't produce new state. The operation declares its new state, and the script checks it. Both lines read an error code when a script fails: `a8[0]` in B, and in A `E1` for a verifier or `E8` for a lock script (`ultrasonic` `src/codex.rs`).

## Where AluVM sits in validation

Not all validation is AluVM. Seals, commitments, consignment structure and state types are checked in Rust. Scripts run on top of that.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

Each genesis or transition type in a schema can name a `validator: Option<LibSite>`. `rgb-consensus` runs it **last**, after checking the operation against the schema (`src/validation/logic.rs`). For a transition it puts the transition type in `a16[0]` (genesis leaves it unset), and it reads an error code from `a8[0]` on failure.

This is the NIA script from `rgb-schemas` 0.11.1 (`src/nia.rs`). The instructions are verbatim, and the comments are this site's own:

```rust
rgbasm! {
    // SUBROUTINE Transfer validation
    put     a8[0],ERRNO_NON_EQUAL_IN_OUT;
    svs     OS_ASSET;          // sum of inputs == sum of outputs for the asset
    test;
    ret;

    // SUBROUTINE Genesis validation
    put     a8[0],ERRNO_ISSUED_MISMATCH;
    put     a8[1],0;
    put     a16[0],0;
    ldg     GS_ISSUED_SUPPLY,a8[1],s16[0];   // read global state into s16[0]
    extr    s16[0],a64[0],a16[0];            // take a u64 from its start
    sas     OS_ASSET;                        // sum of outputs == a64[0]
    test;
    ret;
}
```

The VM is created with `Vm::<Instr<RgbIsa<_>>>::new()` and run with `vm.exec(site, |id| scripts.get(&id), &context)`, which returns a `bool`.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

A codex has one **verifier** entry point per contract method (`verifiers: TinyOrdMap<CallId, LibSite>`), plus per-cell lock scripts (`CellLock`) that are checked for each spent input (`ultrasonic` 0.12.0 `src/codex.rs`, `src/state.rs`). The VM is built with `Vm::<Instr<LibId>>::with(CoreConfig, GfaConfig)` and run with `vm.exec(entry_point, &context, resolver)`, which returns the final `CK` status.

A lock-script test from `ultrasonic` 0.12.0 (`src/codex.rs`):

```rust
uasm! {
    stop;
    put     E1, 48;     // secret value
    ldi     auth;       // load the input's auth token into EA
    eq      EA, E1;     // must match
    put     E8, 1;      // failure code #1
    chk     CO;
    // ...
}
```

With the default `CoreConfig { halt: true, .. }`, the first failed check stops the program.

</TabItem>
</Tabs>

## Ownership doesn't come from the VM

Scripts don't decide who may move state. In RGB, the right to move owned state comes from spending the Bitcoin output that is its [single-use seal](../single-use-seals.md). Validators check this in Rust, outside AluVM. Scripts can only add conditions on top of the seal: Line B's PFA schema uses `vts` to require an issuer signature on each transfer, and Line A's lock scripts can check a cell's `CellLock` against the spending input's witness.

## What doesn't exist

No compiler from a high-level language to AluVM ships in either line. Contractum (`RGB-WG/contractum-lang`, last pushed 2022-12-24) was never released. Contracts are written in Rust with the assembler macros above. There is no AluVM debugger, simulator, profiler or JavaScript implementation. The tools that do exist are the macro assemblers and `Lib::assemble` / `Lib::disassemble`.

## Further reading

- [AluVM](https://github.com/AluVM/aluvm) and [zk-AluVM](https://github.com/AluVM/zk-aluvm) (Line A), [`rgb-aluvm`](https://github.com/rgb-protocol/rgb-aluvm) (Line B).
- [AluVM site](https://www.aluvm.org).
