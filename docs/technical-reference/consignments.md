---
sidebar_position: 4
title: Consignments
description: What an RGB consignment contains in v0.11 and v0.12, its file format, and when to send it.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Consignments

:::info Applies to both RGB lines
Both lines move contract history in consignments, but the file formats differ and are incompatible. See [Two RGB lines](/getting-started/two-rgbs).
:::

A **consignment** is the package of contract data that one party sends another. It holds everything the receiver needs to [validate](/core-concepts/client-side-validation) the state they get: the contract's genesis, the operations from genesis to the receiver's seals, and the Bitcoin witness data and commitment proofs anchoring each one. The receiver checks it against Bitcoin through an indexer, then adds it to their stash.

There are two uses:

- **Contract consignment**: the whole contract, used to share or back up a contract (Line B `rgb export`, Line A `rgb backup`).
- **Transfer consignment**: the history leading to the seals in one transfer, made by the payer and given to the receiver (Line B `rgb transfer`, Line A `rgb pay`).

A transfer consignment holds only the history that the receiver's new state depends on, not the whole contract. It still reveals that history, including earlier amounts and outpoints, to the receiver.

Both formats are **binary [strict encoding](./strict-types.md)**, not JSON. Neither is compressed.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

**Contents** (`rgb-ops` 0.11.1, `src/containers/consignment.rs`, struct `Consignment<TRANSFER>`):

| Field | What it holds |
|---|---|
| `version` | The container version, `v0` (`rgb inspect` prints `version: v0`) |
| `transfer` | Whether it is a transfer (`true`) or a contract consignment |
| `terminals` | The concealed (secret) seals the transfer ends at, by bundle (`SmallOrdMap<BundleId, SecretSeals>`) |
| `genesis` | The contract's genesis |
| `bundles` | Each transition bundle with its witness: the Bitcoin transaction (`PubWitness`) and the anchor, i.e. the MPC proof and the tapret or opret proof |
| `schema` | The contract's schema |
| `types` | The strict type system used by the schema |
| `scripts` | The AluVM libraries the schema calls |

The consignment id is a tagged hash, shown in Baid64 with the `rgb:csg` HRI.

**File format** (`src/containers/file.rs`): the bytes `RGB\x00`, then a 3-byte type marker, `CON` (contract), `TFR` (transfer) or `KIT` (schema kit), then the strict-encoded data. There is also an ASCII-armoured text form with the plate `RGB CONSIGNMENT` and headers for the version, type, contract id, schema id and terminals (the `StrictArmor` trait). The `rgb-schemas` examples write both, with `save_file("….rgb")` and `save_armored("….rgba")`.

```bash line=B
rgb transfer <INVOICE> transfer.rgb transfer.psbt   # payer
rgb validate transfer.rgb                           # receiver: prints "The provided consignment is valid"
rgb accept transfer.rgb                             # receiver: adds it to the stash
rgb inspect transfer.rgb                            # dump any RGB file as YAML
rgb armor transfer.rgb                              # print the ASCII-armoured form
```

Commands are in the [CLI reference (v0.11)](./cli-v011.md#transfer).

:::warning Coming next: consignment format v1
Line B 0.11.2-rc.1 (2026-10-09, a release candidate) moves the container to `v1`. Schemas are imported once instead of travelling in each consignment ([rgb.info, 2026-10-15](https://rgb.info/rgb-protocol-v0-11-2-rc1-update/)), and consignments can carry per-witness SPV proofs ([rgb-ops#16](https://github.com/rgb-protocol/rgb-ops/issues/16), St333p, 2026-10-12). 0.11.2 reads v0 by converting it (the `legacy` feature). 0.11.1 can't read v1: it fails with ``unsupported value `1` for enum `ContainerVer` ``, and the maintainers say they won't emit v0 for peers that haven't upgraded ([rgb-ops#26](https://github.com/rgb-protocol/rgb-ops/issues/26), 2026-10-16). Sender and receiver will have to upgrade together. This page is pinned to 0.11.1.
:::

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

**Contents** (`rgb-std` 0.12.0-rc.3, `src/consignment.rs`):

| Part | What it holds |
|---|---|
| Header | Extensions; the contract's **semantics** (its APIs, the zk-AluVM and AluVM libraries, the type system); the issuer's signature; the **issue** (the contract metadata, the codex and the genesis); and the seals genesis defines |
| Operations | For each operation: the operation, the seals it defines, and an optional **seal witness**, i.e. the Bitcoin transaction and the commitment proof (`OperationSeals` in `rgb-core` 0.12.0) |

The stream starts with a version byte (`0`) and the contract id, so a wallet can reject an unknown contract before reading the rest.

**File format:** a `binfile` container with the 8-byte magic `RGBCNSGN` and version `0` (`CONSIGN_MAGIC_NUMBER` and `CONSIGN_VERSION` in `src/contracts.rs`), then the strict-encoded stream. rc.3 has no ASCII-armoured form.

```bash line=A
rgb pay -w alice <INVOICE> transfer.rgb          # payer: writes transfer.rgb and transfer.psbt
rgb accept -w bob transfer.rgb                    # receiver: validates and accepts
rgb backup DemoToken demo.consignment             # a whole contract
```

On the receiving side, `accept` resolves the auth tokens in the consignment against the receiver's own invoices, and checks the issuer's signature over the contract articles (`Contract::consume`). Commands are in the [CLI reference (v0.12)](./cli.md#pay).

</TabItem>
</Tabs>

:::danger Send the consignment before you broadcast
The transfer is final as soon as the Bitcoin transaction is mined. If the transaction is published and the consignment is then lost, nobody can prove the receiver's ownership, and the assets are gone. Give the receiver the consignment, and wait for them to validate it, before you sign and publish. Keep a copy of every consignment you send or receive: a wallet seed alone doesn't restore RGB assets.
:::

## Further reading

- Line B: [Contract transfers](https://github.com/rgb-protocol/RGB-Documentation/blob/master/annexes/contract-transfers.md) in the official docs; `rgb-ops` 0.11.1 [source](https://github.com/rgb-protocol/rgb-ops/tree/0.11.1) (docs.rs failed to build this version)
- Line A: `rgb-std` on [docs.rs](https://docs.rs/rgb-std/0.12.0-rc.3)
- [Client-side validation](/core-concepts/client-side-validation)
