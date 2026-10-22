---
sidebar_position: 1
title: RGB on Lightning
description: How RGB assets move over Lightning with the RGB Lightning Node (RLN), Line B's alpha LDK-based daemon. Limits, safety caveats and a REST walkthrough.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/guides/lightning/overview.png
---

# RGB on Lightning

:::info RGB v0.11 line (rgb-cmd 0.11.1)
This page covers the RGB Lightning Node, a v0.11 implementation. RGB-WG has released no Lightning node for v0.12; see the note at the end of this page. See [Two RGB lines](/getting-started/two-rgbs).
:::

The [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) (RLN, maintained by RGB-Tools) is a daemon that opens Lightning channels holding an RGB asset and routes payments of that asset. It is built on [rgb-lib](https://github.com/RGB-Tools/rgb-lib) and on RGB-Tools' [fork of rust-lightning](https://github.com/RGB-Tools/rust-lightning) (LDK), whose changes are applied to LDK v0.2.2. RLN's `Cargo.toml` asks for `rgb-lib = "=0.3.0-beta.7"` but patches it to rgb-lib's git `master`, so the published 0.3.0-beta.7 crate isn't exactly what it runs (`Cargo.lock`, commit of 2026-09-17). You control it through a REST API. It has no CLI.

:::danger Early alpha: test networks only
The RLN README says the node "can be tested only in regtest or testnet environments", calls it "early alpha", and accepts no responsibility for loss of funds (README, 2026-09-17). On 2026-06-23 the maintainers listed these open safety issues ([RGB Lightning roadmap](https://rgb.info/rgb-lightning-roadmap/)):

- a fixed fee rate, which is safety-critical on channel close (`FEE_RATE = 7` sat/vB in `src/ldk.rs` at the 2026-09-17 commit)
- anchor outputs are used, but there is no CPFP or anchor fee bumping
- a static blinding factor (`STATIC_BLINDING`), which weakens privacy after a force close
- no re-org detection yet
- no multi-asset channels, multi-asset payments, splicing, dual funding or BOLT12

Open pull requests, checked 2026-10-21, describe further problems that aren't fixed in the 2026-09-17 code:

- a receiver doesn't check the RGB amount against the invoice, so an invoice for 1,000 units can be settled with 1 unit, or with another asset ([PR #180](https://github.com/RGB-Tools/rgb-lightning-node/pull/180), opened 2026-10-08)
- a routing node forwards the RGB amount the onion asks for without checking what the incoming HTLC carries, so an attacker can drain its asset channels ([PR #181](https://github.com/RGB-Tools/rgb-lightning-node/pull/181), opened 2026-10-09). Don't route RGB payments or run an LSP or swap service on RLN until it is merged.
- a dynamic fee estimator to replace the fixed fee rate is proposed but not merged ([PR #177](https://github.com/RGB-Tools/rgb-lightning-node/pull/177), opened 2026-10-02)

The same post planned to move consignments off the proxy and onto the Lightning peer link. At the 2026-09-17 commit, RLN already sends a channel's funding consignment to the peer over that link (`src/ldk.rs`), and a proxy is only used for on-chain transfers that name one in `transport_endpoints`.

RLN's code doesn't block mainnet: the "test networks only" rule is the maintainers' advice, and following it is up to you. RLN has no tagged releases (Cargo version `0.1.0`). Pin a commit.
:::

## How it works

The design is described in the official [Lightning Network compatibility](https://docs.rgb.info/rgb-over-lightning-network/lightning-network-compatibility) page.

- **One asset per channel.** A channel holds bitcoin plus a balance of at most one RGB contract (`asset_id`, `asset_local_amount`, `asset_remote_amount`).
- **Funding** is an on-chain RGB transfer to the channel's 2-of-2 multisig output, and it needs 6 confirmations (`MIN_CHANNEL_CONFIRMATIONS`, `src/ldk.rs`).
- **Commitments.** Every commitment transaction gets an extra **OP_RETURN** output, an opret commitment, that anchors an RGB transition moving the asset from the funding output to the commitment outputs and HTLCs. RLN channels use opret, not tapret, and they require anchor outputs (`with_anchors: true`).
- **Payments are HTLCs with an asset amount attached**, and RLN requires each one to carry at least **3,000,000 msat (3,000 sats)** as well (`HTLC_MIN_MSAT`, `src/routes.rs`; also `rgb_htlc_min_msat` in `GET /nodeinfo`). So an RGB payment always moves some bitcoin too.
- **Invoices are ordinary BOLT11** (`lnbc…`, `lntb…`, `lnbcrt…`) with two extra tagged fields: 30 = RGB amount, 31 = RGB contract ID (`lightning-invoice/src/lib.rs` in the fork).
- **Routing fees are in msat.** There are no fees paid in the asset. A payment uses one contract end to end. See [Routing](/guides/lightning/routing).
- **Closing:** a cooperative or force close puts a normal on-chain RGB state on the closing or commitment outputs. RLN then holds it as a regular RGB allocation.

RLN also does maker/taker atomic swaps between two assets, or an asset and BTC, over Lightning (`/makerinit`, `/makerexecute`, `/taker`).

## Install and run

From the RLN README. RLN isn't on crates.io, and it needs Rust 1.94 or later (`rust-version` in `Cargo.toml`). `regtest.sh` needs Docker.

```bash
git clone https://github.com/RGB-Tools/rgb-lightning-node --recurse-submodules --shallow-submodules
cd rgb-lightning-node
cargo install --locked --path .
./regtest.sh start
```

`regtest.sh` starts bitcoind, electrs and an RGB proxy in Docker, wiping any earlier regtest data. Start two nodes, A and B, each in its own shell, with a data directory, ports and network:

{/* snippet:skip: rgb-lightning-node is RLN's binary, built from source above */}
```bash
# node A: REST on 3001, Lightning peers on 9735
rgb-lightning-node dataldk0/ --daemon-listening-port 3001 \
    --ldk-peer-listening-port 9735 --network regtest \
    --disable-authentication
# node B: REST on 3002, Lightning peers on 9736
rgb-lightning-node dataldk1/ --daemon-listening-port 3002 \
    --ldk-peer-listening-port 9736 --network regtest \
    --disable-authentication
```

`--disable-authentication` is for local tests only. Otherwise, pass `--root-public-key` and send a [Biscuit](https://www.biscuitsec.org/) token in an `Authorization: Bearer` header (see "Authentication" in the README). For testnet3 or testnet4, use `--network testnet` or `--network testnet4` and the public services the README lists.

## A first payment (regtest)

These calls follow the RLN `openapi.yaml` and `src/routes.rs` at the 2026-09-17 commit. They weren't run for this page. `/init` returns the node's `mnemonic`: write it down, but remember that it doesn't recover channels or RGB assets on its own.

```bash
# 1. create and unlock the node (repeat on :3002)
curl -X POST -H "Content-type: application/json" \
  -d '{"password": "nodepassword"}' http://localhost:3001/init
curl -X POST -H "Content-type: application/json" \
  -d '{"password": "nodepassword", "indexer_url": "127.0.0.1:50001", "announce_addresses": [],
       "ldk_chain_sync": {"mode": "BlockSync", "config": {"bitcoind_rpc_username": "user",
       "bitcoind_rpc_password": "password", "bitcoind_rpc_host": "localhost", "bitcoind_rpc_port": 18443}}}' \
  http://localhost:3001/unlock

# 2. fund it (./regtest.sh sendtoaddress <address> 1), make UTXOs, issue an asset
curl -X POST http://localhost:3001/address
curl -X POST -H "Content-type: application/json" \
  -d '{"up_to": false, "fee_rate": 5, "skip_sync": false}' http://localhost:3001/createutxos
curl -X POST -H "Content-type: application/json" \
  -d '{"ticker": "DEMO", "name": "Demo Asset", "precision": 0, "amounts": [1000]}' \
  http://localhost:3001/issueassetnia

# 3. open an RGB channel to B (B's pubkey from GET :3002/nodeinfo)
curl -X POST -H "Content-type: application/json" \
  -d '{"peer_pubkey_and_opt_addr": "<B_pubkey>@localhost:9736", "capacity_sat": 30010,
       "push_msat": 0, "asset_id": "<asset_id>", "asset_amount": 500,
       "public": true, "with_anchors": true}' \
  http://localhost:3001/openchannel
# mine 6 blocks (./regtest.sh mine 6), then wait until GET /listchannels shows is_usable: true

# 4. B creates an invoice for 10 units (plus the 3,000-sat minimum); A pays it
curl -X POST -H "Content-type: application/json" \
  -d '{"amt_msat": 3000000, "expiry_sec": 420, "asset_id": "<asset_id>", "asset_amount": 10}' \
  http://localhost:3002/lninvoice
curl -X POST -H "Content-type: application/json" \
  -d '{"invoice": "<lnbcrt…>"}' http://localhost:3001/sendpayment
curl -X POST -H "Content-type: application/json" \
  -d '{"asset_id": "<asset_id>"}' http://localhost:3002/assetbalance
```

`assetbalance` reports `offchain_outbound` and `offchain_inbound` next to the on-chain balances. `/sendrgb` and `/rgbinvoice` make ordinary on-chain RGB transfers from the same node.

:::danger Back up the node
`POST /backup {"backup_path", "password"}` writes an encrypted backup of the whole node, and `/restore` reads it back. Channel state changes with every payment, and restoring an old channel state can cost you the channel funds. As with any Lightning node, a backup isn't a substitute for keeping the node online and its data directory safe.
:::

## Who uses it

The RLN README lists Iris Wallet desktop, KaleidoSwap, Lnfi, Spectrum, Thunderstack and Tiramisu Wallet (2026-09-17). Utexo's `wdk-rgb-lightning` module for Tether's WDK, announced in beta on 2026-08-28, is described as an "RLN Community Module" ([rgb.info](https://rgb.info/rgb-lightning-tether-wdk/)). KaleidoSwap maintains its own RLN fork (latest [v0.10.1](https://github.com/kaleidoswap/rgb-lightning-node/releases), 2026-10-14). Its desktop app [v0.6.0](https://github.com/kaleidoswap/desktop-app/releases/tag/v0.6.0) (2026-10-14) bundles that fork pinned to 0.10.0.

:::info No RGB-WG Lightning node for v0.12
RGB-WG hasn't released a Lightning node for v0.12, and the old `lnp-node` (0.9, 2023) has no RGB support. Bitlight Labs develops its own v0.12 Lightning stack, which this site hasn't checked. As of 2026-10-21, there is nothing to document for Line A.
:::

## More

- [Asset channels](/guides/lightning/asset-channels): opening, limits and closing
- [Routing](/guides/lightning/routing)
- [RLN API reference](https://rgb-tools.github.io/rgb-lightning-node) (Swagger UI for `master`)
