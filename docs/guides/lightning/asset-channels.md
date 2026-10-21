---
sidebar_position: 2
title: Asset channels
description: Opening, checking and closing RGB asset channels with the RGB Lightning Node. Parameters, limits and what happens on chain.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Asset channels

:::info RGB v0.11 line (rgb-cmd 0.11.1)
Asset channels exist only for v0.11, through the RGB Lightning Node (RLN), which is alpha software for regtest and testnet. Read [RGB on Lightning](/guides/lightning/overview) first. See [Two RGB lines](/getting-started/two-rgbs).
:::

An RGB channel is a Lightning channel that also holds a balance of **one** RGB asset. Everything below comes from RLN's `openapi.yaml` and `src/routes.rs` (commit of 2026-09-17).

## Opening

`POST /openchannel`:

| Field | Meaning |
|---|---|
| `peer_pubkey_and_opt_addr` | `<pubkey>@<host>:<port>` |
| `capacity_sat` | Bitcoin capacity. An RGB channel needs at least **30,010 sats**. Every channel must be between 5,506 and 16,777,215 sats. |
| `push_msat` | Bitcoin given to the peer at opening |
| `asset_id`, `asset_amount` | The RGB contract and the amount you put in (at least 1). Give both or neither. The units must already be spendable on chain in the node's RGB wallet. |
| `push_asset_amount` | Asset units given to the peer at opening (at most `asset_amount`) |
| `public` | Announce the channel in gossip |
| `with_anchors` | Must be `true` for RGB channels |
| `fee_base_msat`, `fee_proportional_millionths` | Your routing fees, in msat |

```bash
curl -X POST -H "Content-type: application/json" \
  -d '{"peer_pubkey_and_opt_addr": "<pubkey>@localhost:9736", "capacity_sat": 30010,
       "push_msat": 0, "asset_id": "<asset_id>", "asset_amount": 500, "push_asset_amount": 0,
       "public": true, "with_anchors": true}' \
  http://localhost:3001/openchannel
```

Only the opener funds the channel. There is no dual funding and no splicing. The funding transaction sends the bitcoin **and** the asset (an on-chain RGB transfer) to the 2-of-2 multisig output. The channel becomes usable after 6 confirmations. The node's own limits are in `GET /nodeinfo`: `rgb_channel_capacity_min_sat`, `channel_capacity_min_sat`, `channel_capacity_max_sat`, `channel_asset_min_amount`, `channel_asset_max_amount` and `rgb_htlc_min_msat`.

:::warning Keep bitcoin on both sides
Every RGB HTLC also carries at least 3,000 sats. A side whose bitcoin balance can't cover that minimum (plus reserve and fees) can't send asset payments, even if it holds asset units. Size `capacity_sat` and `push_msat` with that in mind.
:::

## Checking

`GET /listchannels` returns each channel's `status` (`Opening`, `Opened`, `Closing`), `ready`, `is_usable`, the bitcoin balances in msat, and `asset_id`, `asset_local_amount` and `asset_remote_amount`. `POST /assetbalance {"asset_id"}` adds `offchain_outbound` and `offchain_inbound` to the on-chain figures.

## Closing

```bash
curl -X POST -H "Content-type: application/json" \
  -d '{"channel_id": "<channel_id>", "peer_pubkey": "<pubkey>", "force": false}' \
  http://localhost:3001/closechannel
```

- **Cooperative close:** the closing transaction carries an RGB transition that gives each side its asset balance as ordinary on-chain allocations.
- **Force close** (`"force": true`): the latest commitment transaction is broadcast. It already anchors the RGB state of each output through its OP_RETURN commitment, so the assets settle on chain with it. Your own output stays timelocked as usual in Lightning.

:::danger Alpha software
RLN uses a fixed fee rate (7 sat/vB, `FEE_RATE` in `src/ldk.rs`) and has no CPFP or anchor fee bumping ([maintainers, 2026-06-23](https://rgb.info/rgb-lightning-roadmap/)). A force close can get stuck in a fee spike, and its static blinding factor weakens privacy after a force close. Use only amounts you can afford to lose, on regtest or testnet.
:::

There is no per-channel backup. `POST /backup` writes an encrypted backup of the whole node.
