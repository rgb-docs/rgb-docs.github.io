---
sidebar_position: 9
title: Encoding Formats
description: How RGB prints identifiers (Baid64) and hashes data (tagged SHA-256), with the identifier prefixes used by each RGB line.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/technical-reference/encodings.png
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Encoding Formats

:::info Applies to both RGB lines
Both lines use the same Baid64 and tagged-hash code, but with different identifier prefixes (`rgb:` in v0.11, `contract:` in v0.12). See [Two RGB lines](/getting-started/two-rgbs).
:::

RGB uses three encodings:

- **[Strict encoding](./strict-types.md)** for all consensus data: operations, schemas, codexes, consignments. It is binary, deterministic and has no type tags.
- **Tagged SHA-256** to turn that data into ids and commitments.
- **Baid64** to print ids for people: contract ids, seals in invoices, library ids.

Bitcoin data (transactions, scripts, addresses) keeps Bitcoin's own encodings.

## Baid64

Baid64 is "Base64 encoding extended with HRP and mnemonic checksum", from the [`baid64`](https://github.com/UBIDECO/rust-baid64) crate by UBIDECO. Line A pins `baid64` 0.4.2 and Line B pins 0.4.1. The encoding is the same in both: the only change between them is a debug assertion. Everything below comes from `baid64` `src/lib.rs`.

| Part | Rule |
|---|---|
| Alphabet | `A–Z a–z 0–9 _ ~` (Base64 with `_` and `~` instead of `+` and `/`), no padding |
| HRI prefix | An optional human-readable identifier and a colon, e.g. `rgb:`; up to 16 bytes |
| Chunking | Optional: groups separated by `-`, the first group 8 characters, the rest 7 (some types use other sizes) |
| Embedded checksum | Optional: 4 checksum bytes appended to the payload before encoding |
| Mnemonic | Optional: the same checksum as three words after `#`, e.g. `#remote-digital-pegasus` |

`-` is a separator, not part of the alphabet. Parsers drop it before decoding.

**The checksum.** With `h = SHA-256( SHA-256(HRI) ‖ payload )`, the checksum is the four bytes `h[0] h[1] h[1] h[2]`. Byte 1 really is used twice; that's how the code is written (`fn check`). Because the HRI is mixed in, the same 32 bytes get a different checksum as a contract id than as a schema id.

**Lengths.** A 32-byte id is 43 Base64 characters. With an embedded checksum it is 36 bytes, so 48 characters. Chunk separators and the prefix come on top.

**Parsing** (`FromBaid64Str`) accepts the string with or without the HRI. It checks the HRI if one is present, strips `-`, and verifies the checksum when either an embedded checksum or a mnemonic is present.

### Which ids use which format

Each type sets its own options through `DisplayBaid64` constants:

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

| Id | HRI | Chunked | Checksum | Example |
|---|---|---|---|---|
| Contract id | `rgb` | yes | no | `rgb:Ca0d5l5K-Cr4Wm6I-owUkn6t-2NHrgjk-R1KRreF-tVBhAR0` |
| Schema id | `rgb:sch` | no | mnemonic | `rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus` |
| Blinded seal (`SecretSeal`) | `utxob` | yes | embedded | `utxob:4vm1CX2Z-K8hMo59-e7dgGBS-Jka7mYn-Xe~yP85-yUiHHxr-aVlYa` |
| Witness output (33 bytes) | `wvout` | yes | embedded | in invoices as `bc:wvout:…` |
| Consignment id | `rgb:csg` | yes | mnemonic | |
| Kit id | `rgb:kit` | yes | no | |
| AluVM library | `alu` | yes | mnemonic | `alu:q~CZ0ovt-UN9eBlc-VMn86mz-Kfd3ywu-f7~9jTB-k6A8tiY#japan-nylon-center` |

Sources: `rgb-consensus` 0.11.1 `src/operation/commit.rs`, `src/schema/schema.rs`, `src/seals/secret.rs`; `rgb-ops` 0.11.1 `src/containers/consignment.rs`, `src/containers/kit.rs`, `invoice/src/parse.rs`; `rgb-aluvm` 0.11.1 `src/library/lib.rs`.

The contract id, schema id and library id above are real output from `rgb-cmd` 0.11.1, from importing `NonInflatableAsset.rgb` from `rgb-schemas` 0.11.1 and issuing a contract offline on regtest:

```bash line=B
rgb -n regtest import NonInflatableAsset.rgb
rgb -n regtest schemata
```

```text
NonInflatableAsset      	rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus
```

The `utxob:` example is from the `rgb-ops` invoice tests.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

| Id | HRI | Shown with prefix | Chunked | Checksum | Example |
|---|---|---|---|---|---|
| Contract id | `contract` | yes | yes | no | `contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y` |
| Codex id | `codex` | no | yes | mnemonic | `7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet` |
| Operation id (`Opid`) | `usop` | no | no | no | `FDqnQ~ReMcfI2N69Y1kMiLrrEIWnPzUvENfgqGbfw5M` |
| Auth token (30 bytes) | `at` | yes | 8 + 8 | embedded | `at:VbJYsl3B-FccP_ZkJ-Yi49U0M6-DLNra14f-SyXj7URN-pmdnfQ` |
| Witness output seal | `wout` | yes | | | in invoices |
| AluVM library | `alu` | yes | yes | mnemonic | |

Sources: `ultrasonic` 0.12.0 `src/issue.rs`, `src/codex.rs`, `src/operation.rs`, `src/state.rs`; `rgb-invoice` 0.12.0-rc.3 `src/bp.rs` (`WITNESS_OUT_HRI`); `aluvm` 0.12.0 `src/library/lib.rs`.

These are real output from `rgb-wallet` 0.12.0-rc.3, run offline on 2026-10-21: the contract and operation ids from issuing the unmodified `examples/DemoToken.yaml` of `RGB-WG/rgb` (the id is the same on every run, because the file fixes the timestamp and seal), the codex id from importing `examples/RGB20-FNA.issuer`, and the `at:` token from `rgb invoice -w alice --nonce 0 --seal-only DemoToken` on the example `alice` wallet. The operation id is the one `rgb state -g` prints before `:0`, `:1`, … .

In invoices, `rgb invoice` (rc.3) prints the contract id after a network prefix, as `contract:tb@contract:<id>/10@at:<token>/`, with the `contract:` HRI appearing twice. See [Invoices](./invoices.md) and the [CLI reference (v0.12)](./cli.md).

</TabItem>
</Tabs>

Strict-types ids use Baid64 too: `semid:` (a type's semantic id), `stl:` (type library) and `sts:` (type system), all chunked with a mnemonic (`src/ast/id.rs`, `src/typelib/id.rs`, `src/typesys/id.rs` in both `strict_types` 2.9.0 for Line A and `rgb-strict-types` 1.0.4 for Line B).

### Reference implementation

This Python sketch follows `baid64` 0.4.x. It reproduces the real ids above, including the embedded checksums of the `utxob:` and `at:` examples (checked on 2026-10-21; for `at:` use `embed=True, first=8, size=8` on the 30-byte payload):

```python
import base64, hashlib

STD   = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
BAID  = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~"

def checksum(hri: str, payload: bytes) -> bytes:
    h = hashlib.sha256(hashlib.sha256(hri.encode()).digest() + payload).digest()
    return bytes([h[0], h[1], h[1], h[2]])

def baid64(hri, payload, chunking=True, embed=False, first=8, size=7, prefix=True):
    data = payload + (checksum(hri, payload) if embed else b"")
    s = base64.b64encode(data).decode().rstrip("=").translate(str.maketrans(STD, BAID))
    if chunking:
        s = "-".join([s[:first]] + [s[i:i + size] for i in range(first, len(s), size)])
    return f"{hri}:{s}" if prefix else s

cid = bytes.fromhex("09ad1de65e4a0abe169ba228c14927eadd8d1eb823911d4a46b785b55061011d")
print(baid64("rgb", cid))   # rgb:Ca0d5l5K-Cr4Wm6I-owUkn6t-2NHrgjk-R1KRreF-tVBhAR0
```

The mnemonic suffix encodes the same 4 checksum bytes with the word list of the Rust `mnemonic` crate. It is left out here.

## Tagged hashes

RGB ids and commitments are **tagged SHA-256** hashes, the same construction as BIP 340:

```text
tH(tag, data) = SHA-256( SHA-256(tag) ‖ SHA-256(tag) ‖ data )
```

`data` is the strict encoding of the object (`commit_verify` `src/digest.rs`, `Sha256::from_tag`). The tag is a dated URN, so the same bytes hashed as two different kinds of object can't collide. Some tags in use:

| Tag | Used for | Line |
|---|---|---|
| `urn:lnp-bp:rgb:operation#2024-02-03` | Operation id; the contract id is the genesis id | B |
| `urn:lnp-bp:rgb:bundle#2024-02-03` | Transition bundle id | B |
| `urn:lnp-bp:rgb:schema#2024-02-03` | Schema id | B |
| `urn:lnp-bp:seals:secret#2024-02-03` | Blinded seal (`SecretSeal`) | B |
| `urn:ubideco:sonic:contract#2024-11-16` | Contract id | A |
| `urn:ubideco:sonic:codex#2025-05-15` | Codex id | A |
| `urn:ubideco:ultrasonic:operation#2024-11-14` | Operation id | A |
| `urn:lnp-bp:mmb:bundle#2024-11-18` | Multi-message bundle | A |
| `urn:ubideco:mpc:commitment#2024-01-31` | MPC commitment | both |
| `urn:ubideco:merkle:node#2024-01-31` | Merkle nodes and MPC leaves | both |

Sources: `const TAG` in `rgb-consensus` 0.11.1, `ultrasonic` 0.12.0, `bp-seals` 0.12.0 (`src/txout.rs`, in the `bp-core` repo) and `commit_verify` 0.12.0. Merkle nodes commit to their branching, depth and width as well as the two children, and children are **not** sorted ([MPC](/core-concepts/bitcoin/multi-protocol-commitments)).

RGB never uses Bitcoin's double SHA-256 for its own ids. That appears only in Bitcoin's txids and block hashes.
