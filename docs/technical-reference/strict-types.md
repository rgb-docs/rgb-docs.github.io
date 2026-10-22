---
sidebar_position: 7
title: Strict Types
description: The deterministic type system and binary encoding behind all RGB data, with the real encoding rules and a tested Rust example.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/technical-reference/strict-types.png
---

# Strict Types

:::info Applies to both RGB lines
Both lines encode all consensus data with strict encoding; they pin different crate versions. See [Two RGB lines](/getting-started/two-rgbs).
:::

**Strict types** is a type system for describing data, and **strict encoding** is its deterministic binary serialization. Both come from [UBIDECO](https://github.com/strict-types) ([strict-types.org](https://strict-types.org)). RGB uses them for everything that is hashed or validated: operations, schemas and codexes, seals, consignments, and the values of contract state.

| | Line B (rgb-cmd 0.11.1) | Line A (rgb-wallet 0.12.0-rc.3) |
|---|---|---|
| Encoding crate | `rgb-strict-encoding` 1.0.4 | `strict_encoding` 2.9.1 |
| Types crate | `rgb-strict-types` 1.0.4 | `strict_types` 2.9.0 |

Line B's RGB crates (`rgb-consensus`, `rgb-ops`, `rgb-invoicing`, `rgb-aluvm`) depend on `rgb-strict-encoding` and `rgb-strict-types`, the RGB Protocol Association's forks ([rgb-protocol/rgb-strict-types](https://github.com/rgb-protocol/rgb-strict-types)), not on the UBIDECO crates. The `bp-*` 0.11.1-alpha.2 Bitcoin crates under `rgb-cmd` still pull in `strict_encoding` 2.8.2 and `strict_types` 2.8.3. Versions are from the `Cargo.lock` files of `rgb-api` 0.11.1 and `RGB-WG/rgb` 0.12.0-rc.3. The forks are at 1.0.5 since 2026-10-09 (crates.io), and `rgb-lib` 0.3.0-beta.7 pins 1.0.2.

## Why "strict"

- **Deterministic.** A value has exactly one encoding, so hashes of it (contract ids, operation ids) are stable.
- **Confined.** Every collection has a maximum size in its type. A decoder knows the size limit of any input before reading it, and the width of the length prefix follows from that limit.
- **No self-description.** The bytes carry no field names or type tags. A reader needs the type to decode them, and the type has its own id (`SemId`), which commits to its structure and names.

## Encoding rules

From `strict_encoding` 2.9.1 `src/traits.rs`, `src/embedded.rs` and `src/writer.rs`:

| Type | Encoding |
|---|---|
| Unsigned and signed integers (`U8`…`U1024`, `I8`…`I1024`) | Fixed width, little-endian |
| Fixed byte array `[Byte ^ 32]` | The bytes, with no length |
| Collection or string with maximum length `MAX` | A length prefix, then the items. The prefix is `u8` if `MAX` ≤ 255, `u16` if ≤ 65,535, 24 bits if ≤ 2^24−1, `u32` if ≤ 2^32−1, otherwise `u64` |
| Struct or tuple | The fields in declaration order, with nothing between them |
| Enum (no data) | One byte: the variant's tag |
| Union (variants with data) | One tag byte, then that variant's fields |
| `Option<T>` | A union: `00` for none, `01` followed by `T` for some |

`Bool` isn't a primitive. It is the standard-library enum `data Bool : false | true` (`strict_types` `stl/Std@0.1.0.sty`), so it encodes as one byte. Non-zero integers (`N8`…) and floats (`F16`…`F256`) are also defined as primitives.

### Example

This compiles and runs with `strict_encoding` 2.9.1 and `amplify` 4.9.0 as the only dependencies, the versions in the Line A lock file (checked 2026-10-21):

```rust
use amplify::confinement::{Confined, TinyString};
use strict_encoding::{StrictDecode, StrictDeserialize, StrictEncode, StrictSerialize, StrictType};

const LIB: &str = "Demo";

#[derive(Clone, PartialEq, Eq, Debug, Default)]
#[derive(StrictType, StrictEncode, StrictDecode)]
#[strict_type(lib = LIB)]
struct Asset {
    ticker: TinyString,   // at most 255 bytes, so a 1-byte length prefix
    precision: u8,
    supply: u64,
    note: Option<u16>,
}
impl StrictSerialize for Asset {}
impl StrictDeserialize for Asset {}

fn main() {
    let a = Asset { ticker: TinyString::try_from(String::from("DEMO")).unwrap(),
                    precision: 2, supply: 1000, note: None };
    let bytes = a.to_strict_serialized::<0xFFFF>().unwrap();     // Confined<Vec<u8>, 0, 0xFFFF>
    println!("{:02x?}", bytes.as_slice());
    let back = Asset::from_strict_serialized::<0xFFFF>(Confined::try_from(bytes.release()).unwrap()).unwrap();
    assert_eq!(a, back);
    let b = Asset { note: Some(7), ..a };
    println!("{:02x?}", b.to_strict_serialized::<0xFFFF>().unwrap().as_slice());
}
```

It prints these bytes (annotated):

```text
note: None     04 44 45 4d 4f | 02 | e8 03 00 00 00 00 00 00 | 00
note: Some(7)  04 44 45 4d 4f | 02 | e8 03 00 00 00 00 00 00 | 01 07 00
               "DEMO" (len 4)  prec  supply = 1000 (u64 LE)    option
```

`StrictDumb` comes for free from `Default` here. Derive it yourself only for types without `Default`. The `const MAX` on `to_strict_serialized` / `from_strict_serialized` caps the total size. Decoding fails if the input has bytes left over. For files and streams, use `strict_serialize_to_file` and `strict_deserialize_from_file`.

## Type libraries and notation

Types are grouped into **type libraries**, each identified by a Baid64 `stl:` id. A library can be printed in a text notation (`.sty` files). Here is an excerpt of the real `UltraSONIC@0.12.0.sty` that describes Line A state:

```text
@mnemonic(critic-chicken-verona)
data StateCell         : data StateValue
                       , auth AuthToken
                       , lock CellLock?

@mnemonic(storm-dragon-brain)
data Opid              : [Byte ^ 32]

@mnemonic(lima-anvil-karate)
data RawData           : [Byte]
```

- `:` with `,` is a struct, `|` separates union or enum variants, and `?` is an option.
- `[T ^ 32]` is a fixed array, `[T ^ ..0xff]` a list of up to 255 items, and `[T]` a list with the default bound of 65,535 items (`RawData` is a `SmallBlob` in Rust).

The notation is the output of the Rust definitions. Types are defined in Rust with the derives above, not written by hand in YAML or JSON.

In Line B, schemas name a state type by its `SemId` (for example `RGBContract.Amount`), and validators decode state values with the contract's type system, which travels in the consignment. In Line A, the codex API maps field-element state to strict types for display.

## Further reading

- [`strict_encoding`](https://github.com/strict-types/strict-encoding) and [`strict_types`](https://github.com/strict-types/strict-types) source, and [strict-types.org](https://strict-types.org).
- [Encoding formats](./encodings.md): how ids made from strict-encoded data are hashed and printed.
- [Consignments](./consignments.md): the largest strict-encoded container.
