---
sidebar_position: 2
title: Contractum (proposed)
description: Contractum is a proposed RGB contract language. There is no compiler; v0.12 issuers are written in Rust and zk-AluVM assembly.
rgb_line: A
verified_with: rgb-wallet 0.12.0-rc.3
last_update:
  date: 2026-10-21
image: /img/og/guides/contracts/contractum.png
---

# Contractum (proposed, not implemented)

:::info RGB v0.12 line (rgb-wallet 0.12.0-rc.3, release candidate)
Contractum is an RGB-WG proposal, now presented as part of the v0.12 (UltraSONIC) design. Line B has no contract language: its schemas are Rust code. See [Two RGB lines](/getting-started/two-rgbs).
:::

Contractum is a planned language for writing RGB contracts. It has no compiler, crate, CLI or npm package, so there's nothing to install or run. [RGB-WG/contractum-lang](https://github.com/RGB-WG/contractum-lang) describes itself as "a prototyping for possible RGB contract language" that "should compile to RGB Schema data", so it predates the v0.11/v0.12 split. It holds two grammar experiments (`attempt1`, `attempt2`) and was last pushed on 2022-12-24 (GitHub API, checked 2026-10-21). The UltraSONIC README calls Contractum "a domain-specific version of Cation for writing programs for UltraSONIC" ([AluVM/ultrasonic](https://github.com/AluVM/ultrasonic)). The syntax is Haskell-like. Pandora Prime's [rgb-issuers](https://github.com/pandora-prime/rgb-issuers/tree/master/contractum) repo keeps `.con` sketches such as `RGB20.con` (last changed 2025-05-27) as design notes. The project site is [contractum.org](https://www.contractum.org).

What you can use today: v0.12 contracts are issued from compiled **issuer** files (a codex plus its API). The issuers in [rgb-issuers](https://github.com/pandora-prime/rgb-issuers) are built by Rust programs in its `rust/` directory, using the `zk-aluvm` and `hypersonic` 0.12.0 crates. You import an issuer with `rgb import` and issue a contract from it with a YAML parameter file. See [Genesis](./genesis.md) and the [v0.12 CLI reference](/technical-reference/cli#issue). Older pages on this site showed Contractum syntax, a `contractum` compiler and an `@rgbjs/contractum` package. None of those exist.
