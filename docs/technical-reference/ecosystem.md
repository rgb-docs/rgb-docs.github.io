---
title: Ecosystem
description: Wallets, nodes, SDKs and companies building on each RGB line, with dates and sources.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Ecosystem

Checked on 2026-10-21 against each project's own pages, GitHub and the npm and crates.io registries. Projects change fast, so check a project's own site before you rely on it. See [Two RGB lines](../getting-started/two-rgbs.md) for what Line A and Line B are.

## Line B: v0.11 (RGB Protocol Association)

| Project | What it is | Notes |
|---|---|---|
| [rgb-lib](https://github.com/RGB-Tools/rgb-lib) | Wallet library (Rust; Kotlin, Swift, Python, Node.js bindings) | `0.3.0-beta.7` (2026-07-17), which pins the Line B crates at `=0.11.1-rc.11`. (The older `0.2.2` on crates.io is built on RGB 0.10 crates, not v0.11.) npm package [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) 0.3.0-beta.7. An unreleased `next` branch moves to 0.11.2-rc.1 (2026-10-21). |
| [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) | Lightning node with RGB channels (LDK fork, REST API) | Alpha, regtest and testnet; no tagged releases. Read the maintainers' [safety caveats](https://rgb.info/rgb-lightning-roadmap/) before you use it. Open PRs (2026-10-08/09) fix invoice underpayment ([#180](https://github.com/RGB-Tools/rgb-lightning-node/pull/180)) and a routing-node drain via an RGB forward mismatch ([#181](https://github.com/RGB-Tools/rgb-lightning-node/pull/181)). Don't route RGB or run an LSP on it until they merge. |
| [rgb-sandbox](https://github.com/rgb-protocol/rgb-sandbox) | Docker regtest demo of `rgb-cmd` | The quickest way to try Line B. |
| [Iris Wallet](https://github.com/RGB-Tools/iris-wallet-android) | Android wallet built on rgb-lib | On mainnet since July 2025. |
| [KaleidoSwap](https://github.com/kaleidoswap) | Lightning DEX on RGB Lightning Node | First RGB asset swap on Lightning mainnet (Sept 2025). Desktop app [v0.6.0](https://github.com/kaleidoswap/desktop-app/releases/tag/v0.6.0) (2026-10-14) bundles its own RLN fork, pinned to 0.10.0; [swap-sdk](https://github.com/kaleidoswap/swap-sdk/releases) v0.12.0 (2026-10-20). Publishes the draft [SSPS](https://github.com/kaleidoswap/ssps) swap spec (Draft 2, 2026-09-29; "not a finalized standard or bLIP"). |
| [Utexo](https://github.com/UTEXO-Protocol) | RGB infrastructure; Tether WDK modules | `@utexo/rgb-sdk-core` / `-web` / `-rn`, `@utexo/rgb-lib-wasm`, `@utexo/wdk-rgb-lightning` on npm, all beta. Also [`@utexo/webrgb`](https://www.npmjs.com/package/@utexo/webrgb) (a `window.rgb` provider for dApps, 0.1.3, 2026-10-13) and an RLN fork with BFA Lightning channels ([PR #205](https://github.com/UTEXO-Protocol/rgb-lightning-node/pull/205), merged 2026-10-13). `@utexo/wdk-rgb-lightning` is at 0.2.0-beta.5 (2026-10-20). (The older `@utexo/rgb-sdk` repo is archived.) |
| BitMask (DIBA), LNFI, Bitcoin Tribe, Bihelix | Wallets and services | Listed as members on [rgbprotocol.org](https://rgbprotocol.org). |
| Tether USD₮ | Stablecoin | Announced 2025-08-28. [CoinDesk](https://www.coindesk.com/tech/2026/09/29/tether-s-usdt-is-coming-home-to-bitcoin-this-month-after-more-than-a-decade) (2026-10-02) reports that Utexo has a Tether commercial licence and will start issuing in October 2026. **Not confirmed live** as of 2026-10-21. Utexo's docs describe it as a BFA asset minted against USDT0 locked on Arbitrum, and burned to release USDT0 ([Utexo Mint](https://github.com/UTEXO-Protocol/docs/blob/main/product-suite/mint.mdx); the integration guide uses staging endpoints and signet). |

## Line A: v0.12 (RGB-WG / LNP/BP)

| Project | What it is | Notes |
|---|---|---|
| [RGB-WG/rgb](https://github.com/RGB-WG/rgb) | `rgb` CLI (`rgb-wallet`) and `rgb-runtime` | `0.12.0-rc.3` (2025-07-15); no release since. |
| [pandora-prime/rgb-issuers](https://github.com/pandora-prime/rgb-issuers) | Contract issuers (codexes) for v0.12 | Last pushed July 2025. |
| [Bitlight Labs](https://github.com/bitlightlabs) | Wallet and Lightning stack | Says its wallet is compatible with RGB v0.12. Its `rgb-ldk-*` Lightning repos were last pushed 2026-10-16. This site hasn't tested them. |

## JavaScript and TypeScript

- **Line B:** [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) (Node bindings, RGB-Tools). Utexo's [`@utexo/rgb-sdk-core`](https://www.npmjs.com/package/@utexo/rgb-sdk-core) and [`@utexo/rgb-lib-wasm`](https://www.npmjs.com/package/@utexo/rgb-lib-wasm) are third-party betas.
- **Line A:** no JavaScript SDK.
- The `@rgbjs/*` packages that this site once listed **don't exist**. Don't install anything under that name.
