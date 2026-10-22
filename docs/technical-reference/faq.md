---
sidebar_position: 9
title: FAQ
description: Short answers to common RGB questions, per RGB line, with dated status.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/technical-reference/faq.png
---

# Frequently Asked Questions

:::info Applies to both RGB lines
Many answers differ between RGB v0.11 (Line B) and v0.12 (Line A). Status answers are dated 2026-10-21. See [Two RGB lines](/getting-started/two-rgbs).
:::

## Which RGB?

### What is RGB?

A system for issuing and transferring assets and other contract state on Bitcoin. State is held by its owners and validated by the people who receive it ([client-side validation](/core-concepts/client-side-validation)). Bitcoin transactions only carry small commitments, which stop the same state being spent twice.

### Why are there two RGBs?

In 2025 the project split. RGB-WG (LNP/BP Standards Association) built v0.12, a redesign. The RGB Protocol Association (Bitfinex, RGB-Tools and others) continued v0.11 as 0.11.1. This site calls them **Line A** (v0.12) and **Line B** (v0.11). The full story is on [Two RGB lines](/getting-started/two-rgbs).

### Which one should I use?

To build a wallet or app, or to work with assets people hold today: **Line B**. To study the v0.12 design: **Line A**, on testnet or regtest only.

### Are they compatible?

No. Contracts, invoices, consignments and tapret commitments from one line don't work in the other, and there is no migration path in either direction. Both install a binary called `rgb`, so keep them apart.

## Status

### Is RGB on Bitcoin mainnet?

- **Line B: yes.** It went live on mainnet in July 2025 on 0.11.1 release candidates. 0.11.1 has been final since 2026-09-16 (crates.io). Wallets such as Iris use it.
- **Line A: no.** `rgb-wallet` 0.12.0-rc.3 is a release candidate, the last Line A release (2025-07-15). Its CLI panics on mainnet with "Non-testnet networks are not yet supported".

:::danger Real value
Line A is testnet-only. On Line B, wallets for real assets are built on `rgb-lib`; the `rgb-cmd` CLI is mostly used for development and the regtest sandbox. Whatever you use, back up your RGB data, not just the seed.
:::

### Does RGB work with Lightning?

- **Line B:** the [RGB Lightning Node](/guides/lightning/overview) (RGB-Tools) supports RGB asset channels. It is alpha, with no tagged releases, and its maintainers list open safety issues such as a fixed fee rate and no anchor fee bumping ([rgb.info, 2026-06-23](https://rgb.info/rgb-lightning-roadmap/)). Open pull requests (2026-10-08/09, unmerged on 2026-10-21) report and fix two more: receivers don't check the RGB amount against the invoice ([#180](https://github.com/RGB-Tools/rgb-lightning-node/pull/180)), and a routing node can be drained by an HTLC whose RGB amount doesn't match what it forwards ([#181](https://github.com/RGB-Tools/rgb-lightning-node/pull/181)). Don't put funds in it that you can't lose, and don't route RGB payments or run an LSP on it until those fixes land.
- **Line A:** RGB-WG has released no Lightning node. Bitlight Labs builds its own v0.12 Lightning stack.

### Is USDT on RGB?

Tether announced USD₮ on RGB (Line B) on 2025-08-28. As of 2026-10-21 it isn't confirmed live. [CoinDesk reported on 2026-10-02](https://www.coindesk.com/tech/2026/09/29/tether-s-usdt-is-coming-home-to-bitcoin-this-month-after-more-than-a-decade) that Utexo holds a Tether commercial licence and plans to start issuing that month, on-chain first and Lightning later. Utexo's own documentation describes the token as minted on RGB against USDT0 locked in an Arbitrum bridge contract, as a BFA asset (Utexo's guide expands this as "Burnable Fungible Asset"; the `rgb-schemas` 0.11.2-rc.1 README calls BFA a "bridged fungible asset" and "not production-ready"), with burns releasing USDT0 ([Utexo Mint](https://github.com/UTEXO-Protocol/docs/blob/main/product-suite/mint.mdx), updated 2026-10-16; its integration guide uses staging endpoints and signet). A 2025-08-12 "RGB bridge" demo by Tricorn (now part of Utexo) moved *wrapped* USDT and was not Tether issuance ([Bitcoin Magazine](https://bitcoinmagazine.com/news/first-rgb-bridge-brings-usdt-from-ethereum-to-bitcoin-via-lightning)). "USDT on Lightning" through Taproot Assets is a different protocol. See [Ecosystem](./ecosystem.md).

### Is it audited?

Line B says its code was audited up to v0.11.0-beta.9 (November 2024), but we found no public report. We found no published audit of v0.12. Line B's bug bounty is suspended (rgbprotocol.org, read 2026-10-21). rgb-lib and the RGB Lightning Node have a `SECURITY.md` (since 2026-09-16 and 2026-09-17): report vulnerabilities privately to `rgb.bugbounty@proton.me`.

## Building

### Can I use JavaScript?

- **Line B:** yes, through [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) (RGB-Tools), which has Node.js bindings as well as Kotlin, Swift and Python. Other npm packages, such as Utexo's, are listed on [Ecosystem](./ecosystem.md).
- **Line A:** no maintained JavaScript SDK. Use Rust.

There are no `@rgbjs/*` packages. Don't install anything under that name.

### How do I create a token?

- Line B: issue a NIA contract. See [Creating tokens](/guides/rgb20/creating-tokens).
- Line A: import an issuer such as `RGB20-FNA` and issue from a YAML file. See the [Quick Start](/getting-started/quick-start).

### What happened to RGB20 and RGB21?

They were *interfaces* in the v0.11 betas. Line B now names contract types after their schemas (NIA, IFA, UDA, CFA, PFA). Line A uses codexes and APIs, and keeps the name RGB20 in issuers like `RGB20-FNA`. See [Interfaces, schemas and codexes](./interfaces.md).

### How do I test?

On regtest. For Line B, [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) runs `bitcoind` and `electrs` with Docker. For Line A, use the [Quick Start](/getting-started/quick-start) on testnet4 or regtest. See [Testing](/guides/development/testing).

## Safety and privacy

### What if I lose a consignment or my RGB data?

You lose the ability to prove you own the state, so the assets are effectively gone. A Bitcoin seed doesn't restore them. Back up the RGB data directory, or with `rgb-lib` its backup file, after every receive and send. On Line A, `rgb backup` writes a whole contract to a file.

:::danger Never spend RGB UTXOs from a plain Bitcoin wallet
A wallet that doesn't know about RGB can spend an output holding assets and destroy them. Keep RGB UTXOs in an RGB-aware wallet only, and use each wallet on one device only.
:::

### Is RGB private?

More private than on-chain tokens, but not fully. Bitcoin sees only ordinary transactions, and nothing public shows balances. But a receiver gets the history of the state they receive, including earlier amounts and outpoints, and indexers see which transactions you look up.

### Can contracts call each other?

No. Each contract is validated on its own. Several contracts can move in one Bitcoin transaction, and swaps between them are possible, but one contract can't read or change another's state.

## Further reading

- [Troubleshooting](./troubleshooting.md)
- [Glossary](./glossary.md)
- The Line B [RGB FAQ](https://rgb.info/rgb-faq/) on rgb.info
