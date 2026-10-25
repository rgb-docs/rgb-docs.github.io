---
sidebar_position: 2
title: JavaScript and TypeScript
description: The real JavaScript options for RGB, rgb-lib on npm, third-party UTEXO packages, the WebRGB browser provider and the RGB Lightning Node REST API, and the package names to avoid.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-25
image: /img/og/guides/development/rgbjs.png
---

# JavaScript and TypeScript

:::info RGB v0.11 line (rgb-cmd 0.11.1)
Every JavaScript SDK on this page is for Line B. Line A (v0.12) has no JavaScript SDK: use the [`rgb` CLI](/technical-reference/cli) or the Rust crate [`rgb-runtime`](./rust-sdk.md). The unpublished rgbjs (below) covers both lines, and can pay v0.12 invoices. See [Two RGB lines](/getting-started/two-rgbs).
:::

:::danger `@rgbjs/*` packages don't exist
Earlier versions of this site documented `@rgbjs/core`, `@rgbjs/wallet`, `@rgbjs/react`, `@rgbjs/cli`, `@rgbjs/testing` and similar packages. None of them was ever published, and the `@rgbjs` scope isn't registered on npm, so anyone could claim those names. **Don't install them.** The API that page described (`RgbWallet`, `Rgb20Contract`, React hooks, its `window.rgb` provider) never existed. A real `window.rgb` provider spec, WebRGB, appeared in October 2026 with a different API (below).
:::

## Options

Versions are from `npm view` and GitHub on 2026-10-21.

| Package | Runs in | Maintainer | Status |
|---|---|---|---|
| [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) 0.3.0-beta.7 (2026-07-18) | Node.js, as a native addon | RGB-Tools ([rgb-lib-nodejs](https://github.com/RGB-Tools/rgb-lib-nodejs)) | Official bindings of [rgb-lib](https://github.com/RGB-Tools/rgb-lib). Beta. |
| [`@utexo/rgb-lib-wasm`](https://www.npmjs.com/package/@utexo/rgb-lib-wasm) 1.0.0-beta.3 | Browsers (WASM) | Utexo ([rgb-lib-wasm](https://github.com/UTEXO-Protocol/rgb-lib-wasm)) | Third party. Its README says it "has not been audited". NIA and IFA only, Esplora over HTTP, IndexedDB storage. |
| [`@utexo/rgb-sdk-core`](https://www.npmjs.com/package/@utexo/rgb-sdk-core), [`-web`](https://www.npmjs.com/package/@utexo/rgb-sdk-web), [`-rn`](https://www.npmjs.com/package/@utexo/rgb-sdk-rn) (1.0.0 betas) | Node.js, browsers, React Native | Utexo | Third-party, higher-level TypeScript wrappers over rgb-lib. Beta. The older `@utexo/rgb-sdk` repo is archived. |
| [`@utexo/webrgb`](https://github.com/UTEXO-Protocol/webrgb) 0.1.3 (2026-10-13), `@utexo/webrgb-walletconnect` | Browser dApps | Utexo, a fork of [KaleidoSwap WebRGB](https://github.com/kaleidoswap/webrgb) | Third party, first published 2026-10-02. TypeScript declarations, discovery, a mock wallet and a conformance suite for a `window.rgb` provider that a wallet injects (`enable`, `blindReceive`, `witnessReceive`, `issueAsset` and more). The README names the KaleidoSwap browser extension as the reference wallet. It holds no keys itself. |
| [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) REST API | Any language over HTTP | RGB-Tools | A daemon with an [OpenAPI spec](https://github.com/RGB-Tools/rgb-lightning-node/blob/master/openapi.yaml) (`/issueassetnia`, `/rgbinvoice`, `/sendrgb`, `/refreshtransfers`, `/backup` and more). Its README calls it "early alpha", for regtest and testnet. |

The unscoped npm package `rgbjs` is still the 0.0.1 placeholder. The [rgbjs](https://github.com/rgbjs/rgbjs) project is in early development and not published to npm. It compiles each line's own Rust crates (v0.11.1 and v0.12.0-rc.3) to WebAssembly and works offline: it parses invoices and contract IDs and validates consignments for both lines; issues contracts, makes invoices and checks what a transfer pays you, on test networks, for both lines; and, for v0.12 only, pays an invoice. A payment comes back as an unsigned PSBT for your own signer, with the transfer for the payee, committed with opret or with tapret (which rgb-wallet 0.12.0-rc.3 can't make). It holds no keys. Its [conformance page](https://rgbjs.com/conformance.html) runs the upstream invoice test vectors, real CLI consignments and payments mined on a test network, for both lines, in your browser. [RGB on the BLAKE2b testnet4](./rgb-on-blake.md) shows it paying in a browser wallet.

Third-party packages hold your keys and RGB data. Read their code and pin exact versions before you trust them with funds.

## rgb-lib for Node.js

Install it with `npm install rgb-lib`. npm picks the platform package (`@rgb-tools/rgb-lib-<os>-<arch>`, published for Linux x64 and arm64, macOS x64 and arm64, and Windows x64), which builds a native addon on install, so you need Python 3 and a C++ toolchain (make, g++). This sketch follows the project's [`example.js`](https://github.com/RGB-Tools/rgb-lib-nodejs/blob/master/example.js). Numbers are passed as strings, and the indexer and proxy are the local regtest services from [Testing](./testing.md).

```javascript
const fs = require("fs");
const rgblib = require("rgb-lib");

const net = rgblib.BitcoinNetwork.Regtest;
const keys = rgblib.generateKeys(net, rgblib.WitnessVersion.Taproot);
fs.mkdirSync("./data", { recursive: true }); // the data directory must exist
const wallet = new rgblib.Wallet(
  new rgblib.WalletData({
    dataDir: "./data",
    bitcoinNetwork: net,
    databaseType: rgblib.DatabaseType.Sqlite,
    maxAllocationsPerUtxo: "1",
    supportedSchemas: [rgblib.AssetSchema.Nia],
  }),
  new rgblib.SinglesigKeys({
    accountXpubVanilla: keys.accountXpubVanilla,
    accountXpubColored: keys.accountXpubColored,
    vanillaKeychain: null,
    masterFingerprint: keys.masterFingerprint,
    mnemonic: keys.mnemonic,
  }),
);
try {
  // Fund wallet.getAddress() first.
  const online = wallet.goOnline({
    indexerUrl: "tcp://localhost:50001",
    skipConsistencyCheck: false,
    vanillaSyncLookback: 20,
  });
  wallet.createUtxos(online, false, "5", null, "1", false);
  const asset = wallet.issueAssetNIA("DEMO", "Demo asset", "0", ["1000"]);
  console.log(wallet.getAssetBalance(asset.assetId));
  wallet.refresh(online, null, [], false);
  wallet.backup("./wallet.backup", "backup password");
} finally {
  wallet.drop(); // the Node bindings leak memory unless you free the wallet
}
```

Sending and receiving use `blindReceive` / `witnessReceive` on the recipient, then `send` and `refresh` on both sides. The [Rust guide](./rust-sdk.md) shows the same flow with the full argument lists, and [Wallet integration](./wallet-integration.md) explains the rules around it.

## Old names and their real equivalents

| Name on the old page (invented) | Real `rgb-lib` call |
|---|---|
| `new RgbWallet(config)` + `initialize()` | `new rgblib.Wallet(new rgblib.WalletData({...}), new rgblib.SinglesigKeys({...}))`, then `wallet.goOnline({...})` |
| key setup | `rgblib.generateKeys(network, witnessVersion)` / `rgblib.restoreKeys(network, mnemonic, witnessVersion)` |
| `Rgb20Contract.create(...)` | `wallet.issueAssetNIA(ticker, name, precision, amounts)` (also `issueAssetCFA`, `issueAssetUDA`) |
| `createInvoice(...)` | `wallet.blindReceive(...)` or `wallet.witnessReceive(...)`; parse an invoice with `rgblib.invoiceData(str)` |
| `transfer(...)` | `wallet.send(...)`, or `sendBegin` + `signPsbt` + `sendEnd` |
| `acceptTransfer(consignment)` | `wallet.refresh(online, assetId, filter, skipSync)`: consignments move through the RGB proxy server |
| `getBalance` / `listAssets` / `listUtxos` | `getAssetBalance(assetId)` / `listAssets(schemas)` / `listUnspents(...)` |
| `exportStash` / `importStash` | `wallet.backup(path, password)` / `rgblib.restoreBackup(path, password, dir)` |
| `releaseWasmMemory()` | `wallet.drop()` |

None of these packages has the React hooks the old page described. For a browser dApp talking to a user's wallet, WebRGB (above) is the only published provider interface, and it is new and third party: check which wallets implement it before you depend on it.
