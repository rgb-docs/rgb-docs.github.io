---
sidebar_position: 5
title: RGB on the BLAKE2b testnet4
description: Running RGB v0.12 on the Bitcoin BLAKE2b testnet4 (txbt4). Why it works unchanged, why an OP_RETURN commitment can be refused while tapret is not, and three mined payments made in a browser with rgbjs and Bunting.
rgb_line: A
verified_with: rgbjs bef8787 (rgb-runtime 0.12.0-rc.3); rgb-wallet 0.12.0-rc.3
last_update:
  date: 2026-10-25
image: /img/og/guides/development/rgb-on-blake.png
---

# RGB on the BLAKE2b testnet4

:::info RGB v0.12 line (rgb-wallet 0.12.0-rc.3)
Everything on this page uses Line A, through [rgbjs](./rgbjs.md), which compiles the v0.12 crates to WebAssembly. See [Two RGB lines](/getting-started/two-rgbs).
:::

:::caution Test coins only
The BLAKE2b testnet4 is a test network. Its coins have no value, and rgbjs and Bunting are early, independent projects. Don't use them for real funds.
:::

The **Bitcoin BLAKE2b testnet4** (txbt4) is a fork of testnet4 by Bitcoin Knots. It shares testnet4's history up to block 150,307, then switches to 164-byte version-2 block headers with BLAKE2b proof of work from block 150,308. Its explorer is [mempool.guide](https://mempool.guide/testnet4/), which serves the usual Esplora API at `https://mempool.guide/testnet4/api`. Addresses use the testnet prefix `tb`.

RGB runs on it unchanged, and three RGB payments have been mined there so far. This page explains why it works, the one thing that differs in practice, and how to try it.

## Why RGB works unchanged

RGB never looks at block headers or proof of work. Client-side validation needs three things from the chain: the witness transactions, their transaction IDs, and whether they are mined. On txbt4:

- **Transactions are Bitcoin's.** The fork's rules change headers, proof of work, the header's committed height and transaction count, and a block-weight cap. They don't touch the transaction format.
- **Transaction IDs are Bitcoin's.** A txid is still the double SHA-256 of the transaction without witnesses, so an RGB [anchor](/core-concepts/bitcoin/deterministic-commitments) to a txbt4 transaction verifies exactly as on testnet4.
- **Signatures are Bitcoin's.** Ordinary BIP 341 taproot key-path signatures are valid. The chain also offers an opt-in "unified" signature hash, but nothing requires it.

So a v0.12 contract, invoice or consignment is the same bytes on txbt4 as on testnet4. A file can't say which of the two chains its witnesses are on: a witness that one explorer doesn't know may be on the other.

## OP_RETURN can be refused; tapret isn't

The first RGB payment on txbt4 used an [opret](/core-concepts/bitcoin/opret) commitment, the only kind rgb-wallet 0.12.0-rc.3 makes. mempool.guide's node refused to relay it (`sendrawtransaction` error `-26`, with no reason given). A Bitcoin Knots node with default settings (`datacarrier` on, up to 83 bytes) accepted the same transaction (`testmempoolaccept`: allowed), and it was mined after being relayed from there. The signature and the transaction were valid, so the likely cause is the explorer node's data-carrier policy: Knots lets an operator turn `datacarrier` off or lower `datacarriersize` below the 34 bytes of an opret script. The node's actual settings weren't checked.

A [tapret](/core-concepts/bitcoin/tapret) commitment has no `OP_RETURN` output: it hides inside the change output's taproot key, so data-carrier limits never apply. The second payment used tapret, and mempool.guide's node accepted it directly.

If a node you depend on limits `OP_RETURN` data, use tapret. It is also more private (the payment looks like any taproot spend) and one output smaller. The cost is that the wallet must keep the tapret tweak to spend that change later; see [Spending a tapret output](/core-concepts/bitcoin/tapret#spending-a-tapret-output).

rgb-wallet 0.12.0-rc.3 can't make tapret payments: its payment path always adds an `OP_RETURN` host. rgbjs can, with `payInvoice({ …, commit: 'tapret' })`, which marks the change output as the tapret host instead. The pinned rgb-wallet accepts the result.

## Try it in a browser: Bunting

[Bunting](https://bitcoin-blake.github.io/bunting/) is a small RGB wallet for txbt4 that runs in a browser tab ([source](https://github.com/bitcoin-blake/bunting), AGPL). It uses rgbjs for all the RGB work and signs and broadcasts the transactions itself:

1. **Make a wallet.** One random seed, kept in the tab, gives a BIP 86 taproot account (`m/86'/1'/0'`) and the secrets for RGB seals and invoices.
2. **Get test coins.** Send txbt4 to the wallet's address.
3. **Issue.** An RGB20 token (ticker, fixed supply) or an RGB25 asset (no ticker, with terms) on one of your coins. Issuing costs nothing on chain: the contract names the coin that holds the supply.
4. **Make an invoice.** Bunting puts the payment on a coin with no other asset on it, and keeps the invoice's secret so it can recognize the payment later.
5. **Pay an invoice.** rgbjs builds the witness transaction as an unsigned PSBT with a tapret commitment. Bunting signs it (BIP 341, checked against the BIP's own test vectors), broadcasts it to the explorer and to Nostr relays, and gives you the transfer file to hand to the payee.
6. **Take a transfer in.** The payee loads the file. Bunting validates it with rgbjs and finds the state paid to its invoices.

Each coin carries at most one asset, and Bunting won't sign a payment that would also spend a coin carrying another asset, which would lose it. Back up both the seed and the **asset backup** (contract files, invoice secrets and tapret records): the seed alone brings back the keys but not the assets.

To check a txbt4 transfer without a wallet, load it in the [rgbjs Check page](https://rgbjs.com/check.html) and look its witnesses up on "BLAKE2b testnet4, txbt4 (mempool.guide)".

## Checking confirmations in the tab

An RGB transfer is only final once its witness transactions are mined, so "is it mined?" matters. Bunting, and the rgbjs Check page when you pick the BLAKE2b testnet4, don't take the explorer's word for it. For each witness they check, in the browser:

1. **The merkle proof.** The explorer's proof leads from the transaction ID to the merkle root in the block's header.
2. **The header's proof of work.** The 164-byte v2 header hashes to the block hash under the chain's BLAKE2b construction, using the hasher from [bitcoin-desktop/schema](https://github.com/bitcoin-desktop/schema) (`codec/pow/knots-header-v2.js`, loaded pinned to a commit). The hash must meet the target in the header's `bits`, within testnet4's limit. The header's committed height must match.
3. **The links.** Every header from that block up to the tip links to the one before it, with the same checks. The confirmations shown are counted this way, up to 30.
4. **The signed tip.** The tip the chain's publisher signs on Nostr ([NIP-333](https://nip-333.github.io/) kind 33333 events, as [blaketestnode](https://github.com/bitcoin-blake/blaketestnode) follows) has its signature checked and is compared with the explorer's chain at that height.

An explorer that serves a wrong header, proof or link fails these checks, and the page says so. Two gaps remain: each header's target is checked against its own `bits`, not against the difficulty-adjustment rules, and the explorer is still trusted for the current tip height and for what is in the mempool. A full node validating in the tab, as [Reef](https://bitcoin-blake.github.io/reef/) runs, closes both.

## Mined payments

These three transfers are in the rgbjs test vectors (`test/vectors/v012/mined-*.transfer.rgb`) and the [conformance suite](https://rgbjs.com/conformance.html). The pinned rgb-wallet accepts all three (`accept -u`, exit 0).

| File | Payment | Commitment | Witness | Block |
|---|---|---|---|---|
| `mined-opret.transfer.rgb` | 250 FLAG, to the same wallet | opret | [`c14ab82f…`](https://mempool.guide/testnet4/tx/c14ab82fffa1858d9721d3d94a6effaf01205c787e0732d50baba38ddc07c5d1) | 153,561 |
| `mined-tapret.transfer.rgb` | 500 FLAG, to the same wallet | tapret | [`a564889f…`](https://mempool.guide/testnet4/tx/a564889f30d6cde95c5159e9bafb436265f2bf11e3b7b6ecddf89efe5b7656c5) | 153,562 |
| `mined-to-bob.transfer.rgb` | 100 FLAG, from one wallet to another | tapret | [`3e0bafc9…`](https://mempool.guide/testnet4/tx/3e0bafc938cb94c0d9f33f6a85824ccbfe7bfb6a9283e7f721e29a4386b1ae6d) | 153,567 |

FLAG is an RGB20 token with the standard fungible issuer. Each later file carries the earlier payments as history, since each one spent the previous change.

## Further reading

- [Tapret](/core-concepts/bitcoin/tapret) and [Opret](/core-concepts/bitcoin/opret): the two commitment schemes.
- [JavaScript and TypeScript](./rgbjs.md): rgbjs and the other JavaScript options.
- [Consignments](/technical-reference/consignments): what a transfer file holds.
