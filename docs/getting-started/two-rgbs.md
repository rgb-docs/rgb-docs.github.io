---
sidebar_position: 2
title: Two RGB lines
description: In 2025 RGB split into two incompatible implementations. What each one is, which to use, and how they differ.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Two RGB lines

:::info Applies to both RGB lines
This page is the site's reference for how the two lines differ. Every other page links back here.
:::

Since mid-2025 there have been two implementations that both call themselves RGB. They share a history up to v0.11.0-beta.9 (November 2024). After that they diverged, and **contracts, consignments and invoices from one don't work with the other**. Both install a command-line tool called `rgb`.

This site covers both. Every page says which line it applies to:

- **Line A: RGB v0.12**, maintained by the LNP/BP Standards Association in the [RGB-WG](https://github.com/RGB-WG) GitHub org ([rgb.tech](https://rgb.tech)).
- **Line B: RGB v0.11**, maintained by the RGB Protocol Association in the [rgb-protocol](https://github.com/rgb-protocol) and [RGB-Tools](https://github.com/RGB-Tools) orgs ([rgb.info](https://rgb.info), [docs.rgb.info](https://docs.rgb.info)).

## At a glance

| | Line B: v0.11 (RGB Protocol Association) | Line A: v0.12 (RGB-WG) |
|---|---|---|
| Pinned on this site | `rgb-cmd` **0.11.1** (2026-09-16) | `rgb-wallet` **0.12.0-rc.3** (2025-07-15) |
| Release status | Final since 2026-09-16. 0.11.2-rc.1 is out (2026-10-09). | Consensus crate `rgb-core` 0.12.0 final (2025-07-10). Standard library, runtime and wallet are still release candidates, with no release since July 2025. |
| Networks | Mainnet, testnet, signet and regtest | The CLI refuses mainnet; testnet, signet and regtest only |
| Install | `cargo install --locked rgb-cmd --version 0.11.1` | `cargo install --locked rgb-wallet --version 0.12.0-rc.3` |
| Core crates | `rgb-consensus`, `rgb-ops`, `rgb-api`, `rgb-invoicing`, `rgb-psbt-utils`, `rgb-schemas` | `rgb-core`, `rgb-std`, `rgb-runtime`, `rgb-invoice`, `rgb-psbt` |
| Application library | [`rgb-lib`](https://github.com/RGB-Tools/rgb-lib): Rust with Kotlin, Swift, Python and Node.js bindings | Rust only (`rgb-runtime`) |
| Contract model | Schemas: NIA, IFA, UDA, CFA, PFA | Codexes, issuers and APIs (SONIC/UltraSONIC), with state held as field elements |
| Virtual machine | `rgb-aluvm` (a fork of AluVM 0.11) | zk-AluVM 0.12 |
| Tapret commitment prefix | 29 × `OP_RESERVED` (0x50) | 29 × `OP_NOP` (0x61) |
| Invoice format ([details](/technical-reference/invoices)) | `rgb:<contract>/<schema or ~>/<amount>/<chain>:<seal>` | `contract:<network>@<contract>/<amount>@<seal>/` |
| Lightning | [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) (alpha; its README says it "can be tested only in regtest or testnet") | None released by RGB-WG. Bitlight Labs develops its own stack, which this site hasn't checked |
| Main users | Bitfinex, Tether (USD₮ announced 2025-08-28; not live as of 2026-10-21), Utexo, Iris, KaleidoSwap, BitMask and others | Bitlight Labs |

The tapret prefix row is a consensus difference: a tapret commitment made by one line doesn't verify under the other. Source: `bp-core` `dbc/src/tapret/tapscript.rs` (Line A) and `rgb-consensus` `src/dbc/tapret/tapscript.rs` (Line B).

## How the split happened

| Date | Event |
|---|---|
| 2024-11 | v0.11.0-beta.9: the last common base. Line B says it was audited; this site found no public report ([FAQ](/technical-reference/faq#is-it-audited)). |
| 2025-05-20 | v0.12 release candidate 1, a protocol redesign. RGB-WG states that contracts issued before it aren't compatible. |
| 2025-07-01 | The `rgb-protocol` org publishes `rgb-consensus` / `rgb-cmd` 0.11.1-rc.1, continuing v0.11. |
| 2025-07-10 | RGB-WG releases the v0.12 consensus layer (`rgb-core` 0.12.0). |
| 2025-07-15 | `rgb-wallet` / `rgb-runtime` 0.12.0-rc.3, the last Line A release. The RGB Protocol Association is founded. |
| 2025-07-16 | Line B goes live on Bitcoin mainnet (on 0.11.1 release candidates; 0.11.1-rc.3 was published 2025-07-15). |
| 2025-07-18 | LNP/BP publishes a security notice calling Line B a fork and recommending only v0.12 for production. |
| 2025-08-28 | Tether announces USD₮ on RGB (Line B). |
| 2026-09-16 | Line B 0.11.1 final. |
| 2026-10-09 | Line B 0.11.2-rc.1: a new consignment format, and contracts issued with the old IFA schema become invalid. |
| 2026-10-17/18 | RGB Protocol Association hackathon in Turin, with Tether as main sponsor ([recap](https://rgb.info/rgb-hackathon-2026-agentic-dollars-recap/)). USD₮ issuance through Utexo is still pending. |

Each side gives its own reasons. RGB-WG presents v0.12 as a smaller, zk-ready consensus layer ([release post](https://rgb.tech/blog/release-v0-12-consensus/), [notice on the fork](https://rgb.tech/blog/on-rgb-fork-by-bitfinex/)). The Association says v0.12 dropped privacy features and Lightning support and would have thrown away years of audit work ([comparison](https://rgb.info/rgb-v0-11-1-vs-v0-12/)). This site doesn't take sides. It documents what each release actually does, checked against its source.

## Which one should I use?

- **To build a wallet or app, or to work with assets people hold today** (including Lightning): use **Line B**. Start with the [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) regtest demo and [`rgb-lib`](https://github.com/RGB-Tools/rgb-lib).
- **To study the v0.12 design** (zk-AluVM, codexes, field-element state): use **Line A** on testnet or regtest. It is a release candidate and refuses mainnet.
- **Don't mix them.** A wallet, invoice or consignment from one line can't be used with the other, and both binaries are called `rgb`, so keep them on separate `PATH`s.

:::warning Coming next
Line B 0.11.2 (release candidate since 2026-10-09) moves consignments to a new format, v1, and gives the IFA schema a new schema id; the Association's 0.11.2-rc.1 post (2026-10-15) says IFA contracts issued with the previous schema become invalid. The maintainers say 0.11.1 wallets can't read v1 consignments and that no v0 output is planned. The RGB proxy protocol changes too (rgb-proxy-server 0.4.0), so sender and receiver have to upgrade together. In rgb-lib, pending transfers whose consignment was already handled settle normally and the others fail ([rgb-ops#26](https://github.com/rgb-protocol/rgb-ops/issues/26), 2026-10-16). The `rgb` CLI doesn't migrate data stored by 0.11.1 ([rgb-api 0.11.2-rc.1 release notes](https://github.com/rgb-protocol/rgb-api/releases/tag/0.11.2-rc.1)). As of 2026-10-21 no rgb-lib release uses 0.11.2. This site is pinned to 0.11.1 and will move when 0.11.2 is final.
:::

## Not RGB

- **RGB++** (Nervos CKB) is a different protocol that borrows the name.
- **Taproot Assets** (Lightning Labs) is a different asset protocol on Bitcoin.
- **USDT0** (LayerZero's omnichain USDT) is not RGB. Utexo's [mint documentation](https://github.com/UTEXO-Protocol/docs/blob/main/product-suite/mint.mdx) uses USDT0 locked on Arbitrum as the backing for USDT on RGB.
- **SONIC, UltraSONIC and Prism** are names RGB-WG uses for parts of the v0.12 design. **Ultraviolet** is a separate project of Pandora Prime.

## Next steps

- [Installation](/getting-started/installation): install the CLI for your line.
- [Quick start](/getting-started/quick-start): issue and transfer a test asset.
