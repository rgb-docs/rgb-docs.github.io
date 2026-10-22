---
sidebar_position: 2
title: Instruction Set
description: The real AluVM instructions in each RGB line. The zk-AluVM 0.12 control, GFA256 and USONIC sets, and the rgb-aluvm 0.11 ALU and RGB sets.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/core-concepts/aluvm/instruction-set.png
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Instruction Set

:::info Applies to both RGB lines
The two lines run different AluVM versions with different opcodes; pick your line below. See [Two RGB lines](/getting-started/two-rgbs).
:::

This page lists the instructions that actually exist at the pinned versions. Neither line has load/store memory instructions, push/pop or Merkle-proof opcodes, and only Line B's `vts` checks a signature. For the VM model (registers, libraries, complexity), see the [AluVM overview](./overview.md).

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## rgb-aluvm 0.11.1

Line B runs `rgb-aluvm` 0.11.1, a fork of AluVM 0.11, with the RGB ISA extension from `rgb-consensus` 0.11.1. The full instruction enum is in `rgb-aluvm` `src/isa/instr.rs`; opcodes are in `src/isa/opcodes.rs`.

### Control flow

| Opcode | Mnemonic | Effect |
|---|---|---|
| 0x00 | `fail` | Stop with `st0 = false` |
| 0x01 | `test` | Stop if `st0` is false, otherwise do nothing |
| 0x02 | `jmp offset` | Jump; increments `cy0` |
| 0x03 | `jif offset` | Jump if `st0` is true; increments `cy0` |
| 0x04 | `routine offset` | Call a subroutine in the same library; increments `cy0` and writes `cs0` (see the note below) |
| 0x05 | `call lib:offset` | Call another library; same call-stack handling as `routine` |
| 0x06 | `exec lib:offset` | Jump to another library with no return; increments `cy0`, leaves the call stack alone |
| 0x07 | `ret` | Return to the site on top of `cs0`; with an empty stack, stop; doesn't change `cy0` |
| 0xFF | `nop` | Nothing |

`cy0` is a `u16`, so a script can make at most 2^16 − 1 jumps (`checked_add`). Control-flow instructions cost complexity 2 each (`src/isa/exec.rs`).

**Call-stack note (0.11.1).** `CoreRegs::call` writes the calling instruction's own site to `cs0[cp0]` and checks `cp0 + 1` for overflow, but never stores the incremented `cp0` (`src/reg/core_regs.rs:183-202`). `cp0` stays 0, so `ret` always finds an empty stack and stops the program. Nested subroutines therefore don't return in 0.11.1. The schemas in `rgb-schemas` 0.11.1 only use `ret` to end a script, which works. Reported upstream: [rgb-aluvm#14](https://github.com/rgb-protocol/rgb-aluvm/issues/14).

### ALU (opcodes 0x08–0x3F)

Two-operand forms: the result goes into the **second** register, e.g. `add.{flags} a64[0],a64[1]`.

| Group | Mnemonics |
|---|---|
| Set / clear | `clr`, `put`, `putif` |
| Move and convert | `mov`, `dup`, `swp`, `cpy`, `cnv`, `spy` |
| Compare | `gt`, `lt`, `eq`, `ifz`, `ifn`, `st`, `inv` (these set `st0`) |
| Arithmetic | `add`, `sub`, `mul`, `div`, `rem`, `inc`, `dec`, `neg`, `abs` (`inc`/`dec` and `add`/`sub` with an immediate are the `Stp` instruction) |
| Bitwise | `and`, `or`, `xor`, `not`, `shl`, `shr`, `scl`, `scr`, `rev` |
| Byte strings (`s16`) | `put`, `mov`, `swp`, `fill`, `len`, `cnt`, `eq`, `con`, `find`, `extr`, `inj`, `join`, `splt`, `ins`, `del`, `rev` |

Arithmetic overflow either wraps or leaves the result undefined, depending on the instruction flags. There are no zero, sign or overflow flags.

### Crypto (ISA extensions, 0x80–0x8B)

| Opcode | Mnemonic | Effect |
|---|---|---|
| 0x80 | `ripemd s16[x],r160[y]` | RIPEMD-160 of a string register |
| 0x81 / 0x82 | `sha2 s16[x],r256[y]` / `r512[y]` | SHA-256 / SHA-512 |
| 0x84 | `blake3 s16[x],r256[y]` | BLAKE3 |
| 0x88–0x8B | `secpgen`, `secpmul`, `secpadd`, `secpneg` | secp256k1 point operations, only with `rgb-aluvm`'s optional `secp256k1` feature |

No crate in the `rgb-cmd` 0.11.1 chain enables that feature: `rgb-consensus` 0.11.1 asks for `rgb-ascii-armor` and `std` only (its `Cargo.toml`). In that build, the secp opcodes don't exist.

None of these verifies a signature over arbitrary data. The only signature check is the RGB ISA's `vts`, which checks the operation's own `signature` field. The PFA (permissioned fungible asset) schema uses it to require the issuer's key on every transfer (`rgb-schemas` 0.11.1 `src/pfa.rs`).

### RGB ISA (0xC0–0xD3)

From `rgb-consensus` 0.11.1 `src/vm/op_contract.rs` and `src/vm/opcodes.rs`:

| Opcode | Mnemonic | Effect |
|---|---|---|
| 0xC0 | `cnp type,a16[i]` | Count the operation's inputs of an owned state type |
| 0xC1 | `cns type,a16[i]` | Count its outputs of a type |
| 0xC2 | `cng type,a8[i]` | Count its global values of a type |
| 0xC3 | `cnc type,a32[i]` | Count the contract's global values of a type |
| 0xC4 | `ldp type,a16[i],s16[j]` | Load an input's structured state |
| 0xC5 | `lds type,a16[i],s16[j]` | Load an output's structured state |
| 0xC6 | `ldf type,a16[i],a64[j]` | Load an output's fungible amount |
| 0xC8 | `ldg type,a8[i],s16[j]` | Load a global value of this operation |
| 0xC9 | `ldc type,a32[i],s16[j]` | Load a global value of the contract |
| 0xCA | `ldm type,s16[j]` | Load operation metadata |
| 0xD0 | `svs type` | Check that the sum of inputs equals the sum of outputs for a fungible type |
| 0xD1 | `sas type` | Check that the sum of outputs equals `a64[0]` |
| 0xD2 | `sps type` | Check that the sum of inputs equals `a64[0]` |
| 0xD3 | `vts s16[i]` | Verify the transition's `signature` field against the public key in `s16[i]` |

The NIA script on the [overview](./overview.md#where-aluvm-sits-in-validation) page uses `put`, `svs`, `ldg`, `extr`, `sas`, `test` and `ret`.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## zk-AluVM 0.12

Line A runs `aluvm` 0.12.0 (control flow), `zk-aluvm` 0.12.0 (GFA256 field arithmetic) and `ultrasonic` 0.12.0 (USONIC state access). Opcodes 0x00–0x10 are the core (`aluvm` `src/isa/ctrl/bytecode.rs`). 0x11–0x3F are reserved, GFA256 uses 0x40–0x45 (`zk-aluvm` `src/gfa/bytecode.rs`) and USONIC uses 0x80–0x8F (`ultrasonic` `src/isa/bytecode.rs`).

### Control flow (core)

Encoding: one opcode byte, then operands. Offsets (`pos`) are little-endian `u16`. A relative `shift` is an `i8`, measured from the **start** of the jump instruction. An external site is a 1-byte index into the library's libs segment, followed by a `u16` offset.

| Opcode | Mnemonic | Size | Complexity | Effect |
|---|---|---|---|---|
| 0x00 | `nop` | 1 | 0 | Nothing |
| 0x01 | `not CO` | 1 | 2,000 | Invert `CO` |
| 0x02 | `chk CO` | 1 | 2,000 | If `CO` is failed: set `CK` failed, increment `CF`, halt if `CH` |
| 0x03 | `chk CK` | 1 | 2,000 | If `CK` is failed: stop (whatever `CH` holds) |
| 0x04 | `fail CK` | 1 | 2,000 | Set `CK` failed, increment `CF`, halt if `CH` |
| 0x05 | `mov CO, CK` | 1 | 2,000 | Copy `CK` into `CO`, then reset `CK` to ok |
| 0x06 | `jmp pos` | 3 | 10,000 | Jump |
| 0x07 | `jif CO, pos` | 3 | 20,000 | Jump if `CO` is failed |
| 0x08 | `jif CK, pos` | 3 | 20,000 | Jump if `CK` is failed |
| 0x09 | `jmp shift` | 2 | 10,000 | Relative jump |
| 0x0A | `jif CO, shift` | 2 | 20,000 | Relative jump if `CO` is failed |
| 0x0B | `jif CK, shift` | 2 | 20,000 | Relative jump if `CK` is failed |
| 0x0C | `jmp lib:pos` | 4 | 548,000 | Jump to another library, no return |
| 0x0D | `call pos` | 3 | 30,000 | Call a subroutine in this library; fails if the stack already has 255 frames |
| 0x0E | `call lib:pos` | 4 | 548,000 | Call another library |
| 0x0F | `ret` | 1 | 20,000 | Return; with an empty call stack, end the program normally |
| 0x10 | `stop` | 1 | 0 | Stop; the result is whatever `CK` holds |

Complexity is charged when the instruction runs, whether or not a jump is taken. External `jmp` and `call` cost (2 operand bytes + 32 × 2 bytes of library id) × 8 × 1000 + 20,000 = 548,000 (`aluvm` `src/isa/instr.rs`, `src/isa/ctrl/exec.rs`). Execution halts with failure once `CA` reaches `CL`. Nothing increments `CY` in 0.12.

With the default `CoreConfig { halt: true }`, which codices also use, the first failed `chk` or `fail` halts the program. An error-handler branch after it never runs.

Example encoding: `chk CO; jif CK, 0x0005; stop; fail CK; stop` assembles to `02 08 05 00 10 04 10`.

### GFA256 (zk-aluvm)

Field arithmetic over 256-bit elements in registers `E1`–`E8` and `EA`–`EH`, modulo the field order in `FQ` (`zk-aluvm` 0.12.0 `src/gfa/instr.rs`):

| Mnemonic | Effect |
|---|---|
| `test src` | Set `CO` to ok if `src` holds a value, to failed if it is undefined |
| `clr dst` | Make `dst` undefined |
| `put dst, data` | Load a value from the data segment |
| `put dst, 0` / `put dst, <const>` | Load zero, or one of four built-in constants: 1, `u64::MAX`, `u128::MAX`, or the field order minus one (`ConstVal`). Other literals assemble to a data-segment load |
| `fits src, bits` | Check that `src` fits in 8, 16, 24, 32, 48, 64, 96 or 128 bits; sets `CO`. In 0.12.0 the bytecode decoder turns 128 back into 96 (`src/gfa/instr.rs:296`) |
| `mov dst, src` | Copy |
| `eq src1, src2` | Compare; sets `CO` |
| `neg dst, src` | Field negation |
| `add dst_src, src` | Field addition into the first register |
| `mul dst_src, src` | Field multiplication into the first register |

### USONIC (ultrasonic)

Iterators over the operation being verified (`ultrasonic` 0.12.0 `src/isa/instr.rs`). Loads put a `StateValue` (up to four field elements) into `EA`–`ED`, and set `CO` to failed if there is nothing left to load.

| Mnemonic | Effect |
|---|---|
| `cknxi destructible` / `cknxi immutable` | Is there a next input cell of that kind? Sets `CO` |
| `cknxo destructible` / `cknxo immutable` | Is there a next output cell? Sets `CO` |
| `ldi destructible` / `ldi immutable` | Load the next input cell |
| `ldo destructible` / `ldo immutable` | Load the next output cell |
| `ldw` | Load the operation witness |
| `ldi witness` | Load the current input's witness |
| `ldi lock` | Load the current input's lock data |
| `ldi auth` | Load the current input's auth token into `EA`; `EB` = 1 if it has a lock script |
| `rsti …` / `rsto …` | Reset the input or output iterator |

A short verifier from the `ultrasonic` tests (`src/codex.rs`):

```rust
zk_aluasm! {
    put     E1, 1;
    test    E2;     // E2 is undefined, so CO fails
    chk     CO;     // CK fails and, with CH set, the program halts
}
```

</TabItem>
</Tabs>

## Sources

- Line A: [`aluvm` 0.12.0](https://github.com/AluVM/aluvm), [`zk-aluvm` 0.12.0](https://github.com/AluVM/zk-aluvm), [`ultrasonic` 0.12.0](https://github.com/AluVM/ultrasonic).
- Line B: [`rgb-aluvm` 0.11.1](https://github.com/rgb-protocol/rgb-aluvm), [`rgb-consensus` 0.11.1](https://github.com/rgb-protocol/rgb-consensus) (`src/vm/`).
