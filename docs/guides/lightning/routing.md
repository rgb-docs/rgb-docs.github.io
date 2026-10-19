---
sidebar_position: 3
title: Routing
description: How RGB asset payments are routed across Lightning channels by the RGB Lightning Node. One asset per route, msat fees, a single path, and swaps.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# Routing

:::info RGB v0.11 line (rgb-cmd 0.11.1)
This describes the RGB Lightning Node (RLN) and its rust-lightning fork, which is alpha software. Read [RGB on Lightning](/guides/lightning/overview) first. See [Two RGB lines](/getting-started/two-rgbs).
:::

An RGB payment can cross several channels, as long as **every hop has a channel with the same asset** and enough liquidity in it. Alice → Bob → Carol works when Alice–Bob and Bob–Carol both hold contract *C*. Each hop forwards the asset amount, and at least 3,000 sats along with it.

What the fork (RGB-Tools/rust-lightning, branch `rgb`, commit of 2026-08-07) changes:

- **Payment:** a route carries one `(contract ID, amount)` pair end to end (`RouteParameters.rgb_payment`, `lightning/src/routing/router.rs`). The onion and the HTLC messages carry the same pair. No state proofs travel along the route. Channel peers exchange RGB data for their own commitment updates.
- **Gossip:** channel announcements and updates add the channel's `contract_id` and `htlc_maximum_rgb` (`lightning/src/routing/gossip.rs`). The router uses them to skip channels with the wrong asset or not enough of it. Route hints in invoices carry `htlc_maximum_rgb` too.
- **Fees** are paid in msat only, set per channel with `fee_base_msat` and `fee_proportional_millionths`. Routing fees in the asset don't exist.
- **One path:** RLN builds routes with `max_path_count: 1` (`src/utils.rs`), so there is no multi-path payment. There is no trampoline routing either.
- **No cross-asset payments in one route.** To exchange one asset for another, or for BTC, use RLN's maker/taker swaps: the maker calls `POST /makerinit` and gets a swap string, the taker accepts it with `POST /taker`, and the maker completes it with `POST /makerexecute`. Each swap runs as Lightning payments between the two nodes.

Privacy is as in Lightning: onion routing hides the sender and recipient from intermediate hops. Every hop learns the asset (contract ID) and the amount it forwards, and public channels announce their asset in gossip.

## Paying

There is no route query endpoint. Routing happens inside the payment calls:

```bash
# pay a BOLT11 invoice that carries RGB fields
curl -X POST -H "Content-type: application/json" \
  -d '{"invoice": "<lnbcrt…>"}' http://localhost:3001/sendpayment
# spontaneous payment to a node pubkey
curl -X POST -H "Content-type: application/json" \
  -d '{"dest_pubkey": "<pubkey>", "amt_msat": 3000000, "asset_id": "<asset_id>", "asset_amount": 10}' \
  http://localhost:3001/keysend
```

`GET /listpayments` and `POST /getpayment` show the result. `GET /networkinfo` returns the network and the block height, and `GET /nodeinfo` returns the counts of known nodes and channels.
