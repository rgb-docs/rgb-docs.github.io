---
sidebar_position: 1
title: Introduction to RGB
description: What RGB is, the two RGB lines this site covers, and where to start.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Introduction to RGB

:::info Applies to both RGB lines
This page describes ideas that RGB v0.11 and RGB v0.12 share. See [Two RGB lines](/getting-started/two-rgbs) for how they differ.
:::

RGB is a system of smart contracts and digital assets for Bitcoin and Lightning. Contract state is kept off-chain by the people who hold it, and Bitcoin transactions carry only small commitments to it. RGB rests on three ideas:

- **Client-side validation (CSV).** The blockchain doesn't validate contracts. Each recipient checks the history of the state they receive, from the contract's genesis up to the transfer that pays them. That history reaches them as a file called a *consignment*. See [Client-side validation](/core-concepts/client-side-validation).
- **Single-use seals.** Each piece of owned state is assigned to a Bitcoin transaction output. Spending that output "closes the seal". The spending transaction (the *witness transaction*) commits to the new state, so the same state can't be spent twice. The commitment goes either into a taproot script leaf (*tapret*) or into an `OP_RETURN` output (*opret*). See [Single-use seals](/core-concepts/single-use-seals).
- **AluVM.** Contract rules are scripts for a small, deterministic virtual machine. Line A uses zk-AluVM 0.12. Line B uses `rgb-aluvm`, a fork of AluVM 0.11. See [AluVM](/core-concepts/aluvm/overview).

Validation happens off-chain, so the on-chain cost doesn't grow with contract complexity. Each on-chain transfer is still an ordinary Bitcoin transaction: it carries a 32-byte commitment and pays a normal fee. Third parties never see the contract data, which is where RGB's privacy comes from. The recipient does see the history it validates.

:::danger A seed alone doesn't recover RGB assets
RGB state is held off-chain. A Bitcoin seed or descriptor restores your coins. It does not restore your RGB contracts or consignments, and for tapret wallets it does not restore the taproot tweaks that make your outputs spendable. Back up the RGB data directory as well as the seed.
:::

## Two RGB lines

Since 2025 there have been two incompatible implementations, and both install a command-line tool called `rgb`.

- **Line B (RGB v0.11)** comes from the RGB Protocol Association. It has been final at 0.11.1 since 2026-09-16 and runs on Bitcoin mainnet. It has a Lightning node and the `rgb-lib` wallet library.
- **Line A (RGB v0.12)** comes from the LNP/BP Standards Association. It is a protocol redesign. Its wallet and runtime are still at release candidate 0.12.0-rc.3 (2025-07-15), and its CLI refuses mainnet.

If you're not sure which to use, start with Line B: it is the line with mainnet assets, a wallet library and Lightning. [Two RGB lines](/getting-started/two-rgbs) explains how the split happened and when Line A is the better fit.

## Where to go next

- [Installation](/getting-started/installation): install `rgb-cmd` (Line B) or `rgb-wallet` (Line A).
- [Quick start](/getting-started/quick-start): issue and transfer a test asset on regtest or testnet.
- [Core concepts](/core-concepts/overview): validation, seals, commitments and state, in more depth.
- [Guides](/guides/overview): issuing, transferring, Lightning and app development, by line.
- CLI references: [v0.11 (rgb-cmd)](/technical-reference/cli-v011) and [v0.12 (rgb-wallet)](/technical-reference/cli).
- [Glossary](/technical-reference/glossary) for terms such as consignment, seal and tapret.
- Official documentation: [docs.rgb.info](https://docs.rgb.info) (Line B) and [rgb.tech](https://rgb.tech) (Line A).
- [Ecosystem](/technical-reference/ecosystem): wallets, libraries and nodes, and the line each one uses.
