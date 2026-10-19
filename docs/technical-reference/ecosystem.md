---
title: Ecosystem
description: Wallets, nodes, SDKs and companies building on each RGB line, with dates and sources.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# Ecosystem

Checked on 2026-10-19 against each project's own pages, GitHub and the npm and crates.io registries. Projects change fast, so check a project's own site before you rely on it. See [Two RGB lines](../getting-started/two-rgbs.md) for what Line A and Line B are.

## Line B: v0.11 (RGB Protocol Association)

| Project | What it is | Notes |
|---|---|---|
| [rgb-lib](https://github.com/RGB-Tools/rgb-lib) | Wallet library (Rust; Kotlin, Swift, Python, Node.js bindings) | `0.3.0-beta.7` (2026-07-17), stable `0.2.2`. npm package [`rgb-lib`](https://www.npmjs.com/package/rgb-lib). |
| [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) | Lightning node with RGB channels (LDK fork, REST API) | Alpha, regtest and testnet; no tagged releases. Read the maintainers' [safety caveats](https://rgb.info/rgb-lightning-roadmap/) before you use it. |
| [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) | Docker regtest demo of `rgb-cmd` | The quickest way to try Line B. |
| [Iris Wallet](https://github.com/RGB-Tools/iris-wallet-android) | Android wallet built on rgb-lib | On mainnet since July 2025. |
| [KaleidoSwap](https://github.com/kaleidoswap) | Lightning DEX on RGB Lightning Node | First RGB asset swap on Lightning mainnet (Sept 2025). |
| [Utexo](https://github.com/UTEXO-Protocol) | RGB infrastructure; Tether WDK modules | `@utexo/rgb-sdk-core` / `-web` / `-rn`, `@utexo/rgb-lib-wasm`, `@utexo/wdk-rgb-lightning` on npm, all beta. (The older `@utexo/rgb-sdk` repo is archived.) |
| BitMask (DIBA), LNFI, Bitcoin Tribe, Bihelix | Wallets and services | Listed as members on [rgbprotocol.org](https://rgbprotocol.org). |
| Tether USD₮ | Stablecoin | Announced 2025-08-28. Reports in Oct 2026 say Utexo will issue it in October 2026; **not confirmed live** as of 2026-10-19. |

## Line A: v0.12 (RGB-WG / LNP/BP)

| Project | What it is | Notes |
|---|---|---|
| [RGB-WG/rgb](https://github.com/RGB-WG/rgb) | `rgb` CLI (`rgb-wallet`) and `rgb-runtime` | `0.12.0-rc.3` (2025-07-15); no release since. |
| [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers) | Contract issuers (codexes) for v0.12 | Last pushed July 2025. |
| [Bitlight Labs](https://github.com/bitlightlabs) | Wallet and Lightning stack | Says its wallet is compatible with RGB v0.12. |

## JavaScript and TypeScript

- **Line B:** [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) (Node bindings, RGB-Tools). Utexo's [`@utexo/rgb-sdk-core`](https://www.npmjs.com/package/@utexo/rgb-sdk-core) and [`@utexo/rgb-lib-wasm`](https://www.npmjs.com/package/@utexo/rgb-lib-wasm) are third-party betas.
- **Line A:** no JavaScript SDK.
- The `@rgbjs/*` packages that this site once listed **don't exist**. Don't install anything under that name.
