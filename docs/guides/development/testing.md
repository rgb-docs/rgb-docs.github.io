---
sidebar_position: 4
title: Testing RGB Applications
description: Real test environments for each RGB line, regtest Docker stacks with an indexer and RGB proxy, rgb-sandbox, the Line A offline demo, and testnet4.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/guides/development/testing.png
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing RGB Applications

:::info Applies to both RGB lines
Both lines test on regtest with a local indexer. Line B also needs an RGB proxy server, and Line A has an offline demo. See [Two RGB lines](/getting-started/two-rgbs).
:::

RGB needs more than `bitcoind -regtest`. Wallets read the chain through an **Electrum or Esplora indexer**, not through Bitcoin Core RPC. Line B apps built on rgb-lib also exchange consignments through an **RGB proxy server**. The stacks below are the ones the upstream projects test with.

:::danger Keep tests off mainnet
Use regtest in CI and testnet4 or signet for manual tests. Never point a CI job at mainnet services or keys. Line A refuses mainnet anyway. RGB Lightning Node is alpha, and its maintainers say to test it only on regtest or testnet (its code doesn't block mainnet).
:::

<Tabs groupId="rgb-line">
<TabItem value="b" label="v0.11 (rgb-cmd)">

## Line B: regtest stack

This is adapted from rgb-lib's [`tests/compose.yaml`](https://github.com/RGB-Tools/rgb-lib/blob/0.3.0-beta.7/tests/compose.yaml) (and RGB Lightning Node's `compose.yaml`): bitcoind, electrs and the proxy, with the published ports bound to localhost. All three image tags were checked in their registries on 2026-10-19.

```yaml title="compose.yaml"
services:
  bitcoind:
    image: registry.gitlab.com/hashbeam/docker/bitcoind:30.2
    command: "-fallbackfee=0.0002"
  electrs:
    image: registry.gitlab.com/hashbeam/docker/electrs:0.11.0
    ports:
      - 127.0.0.1:50001:50001
    depends_on:
      - bitcoind
  proxy:
    image: ghcr.io/rgb-tools/rgb-proxy-server:0.3.0
    ports:
      - 127.0.0.1:3000:3000
```

Then point the wallet at `tcp://localhost:50001` (indexer) and `rpc://127.0.0.1:3000/json-rpc` (proxy). Create a miner wallet and mine as rgb-lib's [`tests/regtest.sh`](https://github.com/RGB-Tools/rgb-lib/blob/0.3.0-beta.7/tests/regtest.sh) does:

```bash line=B
docker compose up -d
docker compose exec -T -u blits bitcoind bitcoin-cli -regtest createwallet miner
docker compose exec -T -u blits bitcoind bitcoin-cli -regtest -rpcwallet=miner -generate 111
```

The ports are bound to `127.0.0.1` here. Don't publish regtest RPC or indexer ports on a shared network.

### Ready-made environments

- **rgb-sandbox** runs the CLI flow end to end (bitcoind, electrs or esplora, `rgb-cmd` and `bp-wallet`). Its README says it is based on 0.11.1 RC 6, but `demo.sh` installs `rgb-cmd` 0.11.1-rc.7 (checked 2026-10-21), not the 0.11.1 final this site is pinned to. See [Quick Start](/getting-started/quick-start) for the manual steps.

  ```bash line=B
  git clone https://github.com/rgb-protocol/rgb-sandbox --recurse-submodules --shallow-submodules
  cd rgb-sandbox
  bash demo.sh
  ```

- **rgb-lib's own suite** is the reference for library behaviour. From a clone of rgb-lib, `cargo test --workspace --all-features` runs `tests/regtest.sh prepare_tests_environment`, which builds two images and starts regtest and signet bitcoind, four electrs nodes, esplora, three proxies, a reject-list server and a multisig hub, then runs the integration tests under `src/wallet/test/`. The services keep running afterwards. Stop them with `tests/regtest.sh stop_services`, which runs `docker compose --profile '*' down`, so the services in the `tests` profile stop too. Coverage uses `cargo llvm-cov` (`tests/coverage.sh`).
- **RGB Lightning Node** has `./regtest.sh start`, `mine <blocks>`, `sendtoaddress <address> <amount>` and `stop` in its repo ([README](https://github.com/RGB-Tools/rgb-lightning-node#run)).

</TabItem>
<TabItem value="a" label="v0.12 (rgb-wallet)">

## Line A: offline demo, then regtest

The `rgb` repo ships a demo with prepared wallets in `examples/data`. It issues `DemoToken`, makes an invoice, pays it and accepts the payment, with no node or indexer ([`examples/demo.sh`](https://github.com/RGB-WG/rgb/blob/v0.12.0-rc.3/examples/demo.sh)). It's the quickest regression test for the CLI. The script first builds the whole workspace with `cargo build --all-features` (Rust 1.85 or later) and runs `./target/debug/rgb`, not an installed binary. Run it in a fresh clone, because it rewrites `examples/data`:

```bash line=A
git clone https://github.com/RGB-WG/rgb --branch v0.12.0-rc.3 --depth 1
cd rgb
bash examples/demo.sh
```

The issue step was run offline with the pinned binary for this site. The output is on [Genesis](../contracts/genesis.md). The pay and accept steps weren't run here.

For tests that touch a chain, run regtest bitcoind with electrs or Esplora (the Line B compose file without the proxy works), then pass the indexer to the commands that need one:

```bash line=A
rgb -n regtest create --wpkh alice.wallet "[<fp>/84h/1h/0h]<tpub>/<0;1>/*"
rgb -n regtest sync alice --electrum=localhost:50001
rgb -n regtest pay -w alice --electrum=localhost:50001 "$INVOICE" transfer.rgb transfer.psbt
```

The `.wallet` suffix works around an rc.3 naming bug ([CLI reference](/technical-reference/cli#create)). `rgb` doesn't sign, so sign PSBTs in the test with whatever holds the keys. Other v0.12 test suites are RGB-WG's own repos and Bitlight Labs' [rgb-tests](https://github.com/BitlightLabs/rgb-tests). Reported upstream: [RGB-WG/rgb#323](https://github.com/RGB-WG/rgb/issues/323).

</TabItem>
</Tabs>

## Public test networks

Use **testnet4** (Bitcoin Core 28 or later) rather than testnet3. It's the default network of the Line A CLI. The Line B CLI (`rgb-cmd` 0.11.1) still defaults to testnet3, so pass `-n testnet4`; `ChainNet::BitcoinTestnet4` is the default only in the `rgb-consensus` library. Faucets that responded on 2026-10-19: [mempool.space testnet4 faucet](https://mempool.space/testnet4/faucet) and [faucet.testnet4.dev](https://faucet.testnet4.dev/). Mempool's testnet4 Esplora API is `https://mempool.space/testnet4/api`.

## CI

Start the stack as a step, not as a GitHub Actions `services:` container: service containers can't take a command, so a bitcoind image there starts on mainnet. Example for a Line B project:

```yaml title=".github/workflows/test.yml"
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: docker compose -f tests/compose.yaml up -d
      - run: |
          bcli="docker compose -f tests/compose.yaml exec -T -u blits bitcoind bitcoin-cli -regtest"
          for i in $(seq 30); do $bcli getblockchaininfo && break; sleep 2; done
          $bcli createwallet miner
          $bcli -rpcwallet=miner -generate 111
      - run: cargo test
      - if: always()
        run: docker compose -f tests/compose.yaml down
```

## Writing tests

- **Make IDs reproducible.** Line B's `issue_contract_raw(timestamp)` and a fixed `timestamp:` in a Line A params file give the same contract ID on every run. The CLI on Line B blinds genesis seals randomly, so its IDs change.
- **Unit-test without a chain.** Line B's `Stock::in_memory()` and Line A's `Contracts` over a temporary `StockpileDir` let you issue and inspect contracts offline. See [Rust](./rust-sdk.md).
- **Test the failure paths that lose money**: a consignment that never arrives, an expired invoice, a transfer the recipient NACKs (`refresh` should fail it), and a spend of a colored UTXO by another wallet (rgb-lib reports `Inconsistency` on `go_online`).
- **Logs:** `rgb-api` and `rgb-runtime` (with its `log` feature) use the `log` facade. rgb-lib uses `slog` and writes a log file into the wallet directory.
