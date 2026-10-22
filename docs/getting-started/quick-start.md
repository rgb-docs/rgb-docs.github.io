---
sidebar_position: 3
title: Quick Start
description: Issue and transfer a test asset with rgb-cmd 0.11.1 on regtest, or with rgb-wallet 0.12.0-rc.3 on testnet.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/getting-started/quick-start.png
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quick Start

:::info Applies to both RGB lines
There are two separate walkthroughs, one per line. Their files, invoices and wallets can't be mixed. See [Two RGB lines](/getting-started/two-rgbs).
:::

Both walkthroughs issue a fungible asset and send part of it to a second wallet. Each follows its project's own demo: [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) for Line B, and [`examples/demo.sh`](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/examples/demo.sh) for Line A. Output shown as **real output** came from running the pinned binary offline (2026-10-19, rechecked 2026-10-21). Steps that need a node or an indexer weren't run here. Their output is quoted from the upstream README, or left out.

You need the CLI for your line installed first: see [Installation](/getting-started/installation).

:::danger Before you move real value
- **Send the consignment, and have the recipient validate and approve it, before you broadcast.** Once the witness transaction is published, the consignment is the only proof of the new state. Keep your copy until the recipient has accepted it: if every copy is lost, the assets are gone.
- **Let only the RGB tool spend the RGB wallet's coins.** A Bitcoin-only wallet that spends a UTXO holding RGB state destroys that state.
- **Back up the RGB data directory**, not just the seed. A seed alone doesn't recover assets.
:::

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## Line B: regtest with rgb-cmd 0.11.1

This is the manual demo from the [rgb-sandbox README](https://github.com/rgb-protocol/rgb-sandbox#manual-demo), run with `rgb-cmd` 0.11.1. The sandbox itself isn't on 0.11.1 final: its README installs 0.11.1-rc.6 and its `demo.sh` installs 0.11.1-rc.7. `rgb-cmd` does the RGB work, and `bp-wallet` (`bp`, `bp-hot`) holds the keys and signs. For apps, [rgb-lib](https://github.com/RGB-Tools/rgb-lib) wraps all of this in one library.

### 1. Start regtest and set up

```bash line=B
git clone https://github.com/rgb-protocol/rgb-sandbox --recurse-submodules --shallow-submodules
cd rgb-sandbox
docker compose --profile electrum up -d
cargo install --locked bp-wallet --version 0.11.1-alpha.2 --root ./bp-wallet --features=cli,hot
cargo install --locked rgb-cmd --version 0.11.1 --root ./rgb-cmd
export PATH="$PWD/rgb-cmd/bin:$PWD/bp-wallet/bin:$PATH"
export LNPBP_NETWORK=regtest
alias bcli="docker compose exec -u blits bitcoind bitcoin-cli -regtest"
bcli createwallet miner
bcli -generate 103
```

The issuer's data lives in `data0` and the recipient's in `data1`. Every `rgb` command below passes `-d` (data directory), `-w` (wallet name) and `--electrum=localhost:50001` (the sandbox's indexer; the `=` is required).

### 2. Create keys and RGB wallets

```bash line=B
mkdir wallets
export SEED_PASSWORD="seed test password"
bp-hot seed wallets/0.seed
bp-hot derive -N -s bip86 wallets/0.seed wallets/0.derive
# copy the "Account:" value it prints, e.g. [598d26fe/86h/1h/0h]tpubDCwK...4FLe
descriptor_0="<account_0>/<0;1;9>/*"
rgb -d data0 --electrum=localhost:50001 create --wpkh "$descriptor_0" issuer
```

Repeat with `wallets/1.seed`, `descriptor_1`, `-d data1` and the name `rcpt1` for the recipient.

### 3. Import the NIA schema

The sandbox ships the compiled schemas from `rgb-schemas` as a submodule:

```bash line=B
rgb -d data0 -w issuer import rgb-schemas/schemata/NonInflatableAsset.rgb
rgb -d data1 -w rcpt1 import rgb-schemas/schemata/NonInflatableAsset.rgb
```

Real output:

```text
Unable to find or parse config file; using config defaults
Importing kit rgb:kit:qxyONQWD-WY7Sha7-wzsRSMW-MaNI6PI-T74uzx9-sBzUztg:
- schema NonInflatableAsset RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus
- script library alu:q~CZ0ovt-UN9eBlc-VMn86mz-Kfd3ywu-f7~9jTB-k6A8tiY#japan-nylon-center
- strict types: 35 definitions
Kit is imported
```

The schema ID is `rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus`. `rgb schemata` prints it again.

### 4. Fund both wallets

```bash line=B
rgb -d data0 -w issuer --electrum=localhost:50001 address -k 9
rgb -d data1 -w rcpt1 --electrum=localhost:50001 address -k 9
bcli -rpcwallet=miner sendtoaddress "<addr_issue>" 1
bcli -rpcwallet=miner sendtoaddress "<addr_receive>" 1
bcli -rpcwallet=miner -generate 1
rgb -d data0 -w issuer --electrum=localhost:50001 utxos --sync
rgb -d data1 -w rcpt1 --electrum=localhost:50001 utxos --sync
```

Note one outpoint (`txid:vout`) from each wallet: `outpoint_issue` for the issuer and `outpoint_receive` for the recipient.

### 5. Issue

Write `demo.yaml`. This is the sandbox's `contracts/usdt.yaml.template` with a neutral ticker, and with the schema ID and issue outpoint filled in:

```yaml
schema: rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus

globals:
  spec:
    ticker: DEMO
    name: Demo Asset
    details: ~
    precision: 0
  terms:
    text: demo NIA asset
    media: ~
  issuedSupply: 1000

assignments:
  assetOwner:
    seal: <outpoint_issue>
    amount: 1000
```

```bash line=B
rgb -d data0 -w issuer issue "ssi:issuer" demo.yaml
rgb -d data0 -w issuer contracts
contract_id=$(rgb -d data0 -w issuer contracts 2>/dev/null | head -1 | cut -f1)
```

Real output (the contract ID differs on every run, because genesis seals are blinded with random values):

```text
A new contract rgb:7Wf1Rne9-BQWvPlL-P50XBTB-D1sZQlF-Wn7eRYV-3_wZZg8 is issued and added to the stash.
Use `export` command to export the contract.

rgb:7Wf1Rne9-BQWvPlL-P50XBTB-D1sZQlF-Wn7eRYV-3_wZZg8	BitcoinRegtest	2026-10-19	rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus
  Developer: ssi:issuer
```

The last line saves the contract ID (the first column of `contracts`) in `contract_id` for the next steps. With several contracts, set it by hand instead, in single quotes so that the shell doesn't expand `~`: `contract_id='rgb:7Wf1Rne9-…'`. `rgb -d data0 -w issuer --electrum=localhost:50001 state "$contract_id"` shows the 1000 units on `outpoint_issue`.

### 6. Recipient: create an invoice

```bash line=B
invoice=$(rgb -d data1 -w rcpt1 --electrum=localhost:50001 invoice --amount 100 "$contract_id")
echo "$invoice"
```

Example output, from the sandbox README:

```text
rgb:Tk3d0h5w-8v4XYCg-7e~Sc0o-Lu6rp~X-~Jt7VHS-jqgzFD8/~/BF/bcrt:utxob:MSLQCKkW-w6caphB-12do1nJ-HNfgxvv-WE3zOOC-s8yZyHq-Ihoa5
```

The invoice is saved in `invoice` for the next step. The `utxob:` part is the recipient's outpoint, blinded so that the payer never learns it. Use the long option `--amount`: in 0.11.1, `invoice` gives the short flag `-a` to three different options.

### 7. Sender: transfer

```bash line=B
rgb -d data0 -w issuer --electrum=localhost:50001 transfer "$invoice" data0/consignment.rgb data0/tx.psbt
```

This writes the consignment and a PSBT that already commits to it. The default fee is 400 sats (`--fee`).

### 8. Recipient: validate, and only then broadcast

Send `data0/consignment.rgb` to the recipient. The sandbox just copies it. Real deployments use an [RGB proxy](https://github.com/RGB-Tools/rgb-proxy-server).

```bash line=B
cp data0/consignment.rgb data1/
rgb -d data1 -w rcpt1 --electrum=localhost:50001 validate data1/consignment.rgb
```

Once the recipient approves, the sender signs, finalizes and publishes:

```bash line=B
bp-hot sign -N data0/tx.psbt wallets/0.derive
rgb -d data0 -w issuer --electrum=localhost:50001 finalize -p data0/tx.psbt data0/tx.tx
bcli -rpcwallet=miner -generate 1
```

### 9. Recipient: accept

```bash line=B
rgb -d data1 -w rcpt1 --electrum=localhost:50001 utxos --sync
rgb -d data1 -w rcpt1 --electrum=localhost:50001 accept data1/consignment.rgb
rgb -d data1 -w rcpt1 --electrum=localhost:50001 state "$contract_id"
```

`accept` prints `Transfer accepted into the stash` (from `cli/src/command.rs`). The recipient's state now shows 100 units, and the sender's shows 900 units of change. To clean up, run `docker compose --profile electrum down -v` and `rm -fr data0 data1 wallets`.

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## Line A: rgb-wallet 0.12.0-rc.3

:::danger Release candidate, test networks only
`rgb-wallet` 0.12.0-rc.3 refuses mainnet: with `-n bitcoin` it panics on any command that loads contracts. Use testnet4 (the default), signet or regtest.
:::

### 1. Offline demo with the upstream example data

The `RGB-WG/rgb` repository ships two prepared wallets: `alice` in `examples/data` and `bob` in `examples/data2`. It also ships an issuer (codex) file, and a contract definition that allocates the supply to an output already in Alice's wallet. These steps follow `examples/demo.sh`. Steps 1 to 3 run without a network. Step 4 (`pay`) needs an indexer.

```bash line=A
git clone https://github.com/RGB-WG/rgb --branch v0.12.0-rc.3
cd rgb
rgb -d examples/data init
rgb -d examples/data2 init
rgb -d examples/data import examples/RGB20-FNA.issuer
rgb -d examples/data issue -w alice examples/DemoToken.yaml
```

Real output:

```text
Processing 'RGB20-FNA.issuer' ... codex id 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet ... success
A new contract issued with ID contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y
```

Running `rgb issue` with no file lists the issuers you can issue under. Here that is `Fungible Non-inflatable Asset`, developer `dns:pandoraprime.ch`. More issuers are published in [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers).

`DemoToken.yaml` is the issue parameter file. Its `owned` section puts all 10000 units on one seal, which is an outpoint (`txid:vout`) in Alice's wallet:

```yaml
consensus: bitcoin
testnet: true
issuer:
  codexId: 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8
  version: 0
  checksum: AYkSrg
name: DemoToken
method: issue
timestamp: "2024-12-18T10:32:00-02:00"

global:
  - name: ticker
    verified: DEMO
  - name: name
    verified: Demo Token
  - name: precision
    verified: centiMilli
  - name: issued
    verified: 10000

owned:
  - name: balance
    seal: b7116550736fbe5d3e234d0141c6bc8d1825f94da78514a3cede5674e9a5eae9:1
    data: 10000
```

### 2. Give Bob the contract

Bob must know the contract before he can invoice for it. Before this step, `rgb -d examples/data2 invoice -w bob DemoToken 10` fails with `Error: unknown contract 'DemoToken'` (real output).

```bash line=A
rgb -d examples/data backup -f DemoToken examples/DemoToken.rgb
rgb -d examples/data2 accept -w bob -u examples/DemoToken.rgb
rgb -d examples/data state -go -w alice
```

`-u` allows a contract Bob has never seen. In `backup`, `-f` only means "overwrite the file if it exists"; the contract is the positional `DemoToken`. `state` needs `-g` (global), `-o` (owned) or both.

### 3. Bob creates an invoice

```bash line=A
rgb -d examples/data2 invoice -w bob --nonce 0 --seal-only DemoToken
INVOICE=$(rgb -d examples/data2 invoice -w bob --nonce 0 DemoToken 10)
echo "$INVOICE"
```

The first command prints only Bob's seal, an auth token. Real output:

```text
at:FWKMBVDc-NBk8dAZA-tYGt2HIP-MtzSRO17-8g3QvRIN-nuPjug
```

The second prints the full invoice, `contract:tb@<contract id>/<value>@<seal>/`, and saves it in `INVOICE`. Real output:

```text
contract:tb@contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y/10@at:FWKMBVDc-NBk8dAZA-tYGt2HIP-MtzSRO17-8g3QvRIN-nuPjug/
```

With `--wout`, the seal is a new output in the payer's transaction (`wout:…`) rather than one of Bob's UTXOs.

### 4. Alice pays, Bob accepts

```bash line=A
rgb -d examples/data pay -w alice --esplora "$INVOICE" examples/transfer.rgb examples/transfer.psbt
rgb -d examples/data2 accept -w bob examples/transfer.rgb
rgb -d examples/data2 state -go -w bob
```

`pay` writes a consignment and a ready-to-sign binary PSBT. It needs an indexer: `examples/demo.sh` calls it without one, and offline it stops with this real output:

```text
Error: no blockchain indexer specified; use either --esplora or --electrum argument
```

This page didn't run `pay` against a network, so its output isn't shown. The demo ends here, before anything is signed or broadcast. On a real network, Alice would sign the PSBT with whatever holds the wallet's keys (`rgb` doesn't sign), wait until Bob has accepted the consignment, and then run `rgb finalize -w alice --broadcast --esplora examples/transfer.psbt`. Don't run `complete` after `pay`. `complete` belongs to the `script` → `exec` workflow ([upstream Payments.md](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/doc/Payments.md)).

### 5. Your own testnet4 wallet

To leave the demo data and use your own wallet, start from a BIP-32 account descriptor in the form `[fingerprint/84h/1h/0h]tpub…/<0;1>/*`. `init`, `create`, `fund` and `seals` were run offline for this page. `sync` needs an indexer and wasn't run.

```bash line=A
rgb init
rgb create --wpkh alice.wallet "[<fp>/84h/1h/0h]<tpub>/<0;1>/*"
rgb fund alice
rgb sync alice --esplora
rgb seals -w alice
```

- The `.wallet` suffix works around the rc.3 `create` bug: without it, `-w alice` can't find the wallet (`cli/src/exec.rs:104`). Reported upstream: [RGB-WG/rgb#323](https://github.com/RGB-WG/rgb/issues/323).
- `--wpkh` makes an opret-only wallet. Use `--tapret-key-only` with an 86h (taproot) account for tapret.
- `rgb fund` prints a receive address. Send testnet4 coins to it, then sync. A bare `--esplora` uses `https://mempool.space/testnet4/api` (`cli/src/opts.rs`).
- `rgb seals` lists outpoints. Put one in the `seal:` field of your copy of `DemoToken.yaml`, give it a new `name`, and `rgb issue -w alice` it.

</TabItem>
</Tabs>

## Next steps

- [Guides](/guides/overview): issuing, transfers, Lightning and app development, by line.
- [Core concepts](/core-concepts/overview): what the commands above did, from seals to consignments.
- CLI references: [v0.11 (rgb-cmd)](/technical-reference/cli-v011) and [v0.12 (rgb-wallet)](/technical-reference/cli).
- Line B: [docs.rgb.info](https://docs.rgb.info), [rgb-lib](https://github.com/RGB-Tools/rgb-lib), and [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) (alpha).
- Line A: [rgb.tech](https://rgb.tech) and the [RGB-WG/rgb README](https://github.com/RGB-WG/rgb/tree/v0.12.0-rc.3).
