---
sidebar_position: 5
title: RGB Invoices
description: The invoice formats of RGB v0.11 (rgb:…) and RGB v0.12 (contract:…), with their grammar, seal types and real examples.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# RGB Invoices

:::info Applies to both RGB lines
Both lines use URI-style invoices, but the formats differ and neither line can parse the other's. See [Two RGB lines](/getting-started/two-rgbs).
:::

An RGB invoice is a string the receiver gives the payer. It names the contract, the amount (or token), and the **seal** that should receive the state. That seal is either a UTXO of the receiver's wallet, possibly blinded, or an output of the payer's own transaction. The payer's wallet reads the invoice, builds the transfer and writes a [consignment](./consignments.md) for the receiver.

An invoice is only a request. It doesn't carry bitcoin or any proof of payment.

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

**Format** (`rgb-invoicing` 0.11.1, `invoice/src/parse.rs`):

```text
rgb:<contract-id|~>/<schema-id|~>/<state|~>/<chain>:<beneficiary>[?<query>]
```

| Part | Meaning |
|---|---|
| `rgb:<contract-id>` | The contract id in [Baid64](./encodings.md) (`rgb` HRI, chunked). `rgb:~` leaves it open |
| `<schema-id>` | The schema id without its `rgb:sch:` prefix or mnemonic, or `~`. `rgb invoice` always writes `~` here |
| `<state>` | The amount; for a UDA token, `<fraction>@<token-index>`; or `~` |
| `<chain>` | `bc` (mainnet), `tb3` (testnet3), `tb4` (testnet4), `sb` (signet) or `bcrt` (regtest) |
| `<beneficiary>` | `utxob:…`, a blinded UTXO; or `wvout:…`, a witness output (an address payload), optionally followed by `+<internal key>` |
| `?<query>` | `expiry=<unix seconds>`, `endpoints=<url>,<url>` (transports such as `rpc://` or `rpcs://` for a consignment proxy) and `assignment_name=<name>`. Unknown keys are kept |

**Amounts aren't decimal.** `<state>` holds the amount's little-endian bytes in a base32 alphabet with no digits, `abcdefghkmnABCDEFGHKMNPQRSTVWXYZ` (`invoice/src/amount.rs`). So `BF` is 100 and `Sa` is 200. Read and write invoices with the library or the CLI, not by hand.

**Examples.** From the `rgb-invoicing` 0.11.1 tests, a 100-unit NIA invoice to a blinded UTXO:

```text
rgb:eIbQx5Am-XRDjj01-RM~5eo7-rv2nluD-OnBJRAy-S9~Yfts/XvmU3d4_nQQ8S7oagbXi07x5vjMm7P~ERukQNX6SC4M/BF/bc:utxob:4vm1CX2Z-K8hMo59-e7dgGBS-Jka7mYn-Xe~yP85-yUiHHxr-aVlYa
```

From the [rgb-sandbox README](https://github.com/rgb-protocol/rgb-sandbox), the output of `rgb invoice --amount 100 <contract>` on regtest:

```text
rgb:Tk3d0h5w-8v4XYCg-7e~Sc0o-Lu6rp~X-~Jt7VHS-jqgzFD8/~/BF/bcrt:utxob:MSLQCKkW-w6caphB-12do1nJ-HNfgxvv-WE3zOOC-s8yZyHq-Ihoa5
```

**Creating an invoice:**

```bash line=B
rgb invoice --amount 100 <CONTRACT_ID>                   # blinded UTXO (utxob:)
rgb invoice --address-based --amount 100 <CONTRACT_ID>   # witness output (wvout:)
```

A blinded invoice needs an unspent output in the wallet. Without one it fails with `blinded invoice requested but no suitable outpoint is available`. `rgb invoice` stores the blinding secret in the stash, and the receiver can't accept the transfer without it. See [`invoice`](./cli-v011.md#invoice) for the flags.

Apps use [`rgb-lib`](https://github.com/RGB-Tools/rgb-lib) instead (`blind_receive` and `witness_receive`), which also fills in the transport endpoints. The official description is in [Invoices](https://github.com/rgb-protocol/RGB-Documentation/blob/master/annexes/invoices.md) on docs.rgb.info.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

**Format** (`sonic-callreq` 0.12.0 `src/uri.rs`, `rgb-invoice` 0.12.0-rc.3):

```text
contract:<layer1>@<contract-id>/[<api>/][<method>/[<state>/]][<value>@]<seal>/[?<query>]
```

| Part | Meaning |
|---|---|
| `<layer1>` | `bc` (Bitcoin mainnet) or `tb` (any Bitcoin test network) |
| `<contract-id>` | The contract id. rc.3 prints it with its own `contract:` HRI, so the prefix appears twice |
| `<api>/<method>/<state>` | Optional: the contract API, the method (such as `transfer`) and the owned-state name. If you leave them out, the contract's defaults apply |
| `<value>` | The value, as a plain number |
| `<seal>` | `at:…`, an **auth token** derived from a wallet UTXO; or `wout:…`, an output of the payer's witness transaction |
| `?<query>` | `lock=…`, `expiry=<RFC 3339 time>`, `endpoints=…` |

**Real output** from `rgb invoice` (rgb-wallet 0.12.0-rc.3, run offline on 2026-10-19 with `DemoToken` issued from the `RGB-WG/rgb` examples):

```bash line=A
rgb invoice -w alice --wout DemoToken 10
rgb invoice -w alice --wout -a RGB20 -m transfer -s amount DemoToken 10
rgb invoice -w alice --nonce 0 --seal-only DemoToken
```

```text
contract:tb@contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y/10@wout:AQAAAAAA-AAAQsRRS-XNsv2N5Y-GwpKKH1Y-5iNzbEal-IiLv/
contract:tb@contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y/RGB20/transfer/amount/10@wout:AgAAAAAA-AAAQBDa8-5gLBB7Ak-ElBtuHev-bIGANisj-eXkg/
at:VbJYsl3B-FccP_ZkJ-Yi49U0M6-DLNra14f-SyXj7URN-pmdnfQ
```

Each `--wout` call uses the next nonce, so each prints a different seal. Without `--wout`, the wallet needs an unspent output for the `at:` seal. Otherwise it fails with ``Wallet has no unspent outputs; try `fund` first, or use `-w` flag to generate a witness output-based seal``. The message means `--wout`, not `-w`. See [`invoice`](./cli.md#invoice) for the flags.

</TabItem>
</Tabs>

## Lightning

Only Line B has Lightning. The [RGB Lightning Node](/guides/lightning/overview) uses ordinary BOLT11 invoices (`lnbc…`, `lntb…`, `lnbcrt…`) with two extra tagged fields: 30 for the RGB amount and 31 for the contract id (`lightning-invoice/src/lib.rs` in the RGB-Tools `rust-lightning` fork). There is no `lnrgb:` scheme.

:::danger Pay only from the same line and network
An invoice from one line can't be paid from the other, and a `tb` or `bcrt` invoice isn't a mainnet invoice. Always pay with a wallet on the same line and network as the receiver's.
:::

## Further reading

- Line B: `rgb-invoicing` on [docs.rs](https://docs.rs/rgb-invoicing/0.11.1)
- Line A: `rgb-invoice` on [docs.rs](https://docs.rs/rgb-invoice/0.12.0-rc.3) and `sonic-callreq` on [docs.rs](https://docs.rs/sonic-callreq/0.12.0)
- [Encoding formats](./encodings.md): the Baid64 ids used in both formats
