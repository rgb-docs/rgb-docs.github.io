---
sidebar_position: 2
title: JavaScript and TypeScript
description: The real JavaScript options for RGB, rgb-lib on npm, third-party UTEXO packages and the RGB Lightning Node REST API, and the package names to avoid.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# JavaScript and TypeScript

:::info RGB v0.11 line (rgb-cmd 0.11.1)
Every JavaScript option on this page is for Line B. Line A (v0.12) has no JavaScript SDK: use the [`rgb` CLI](/technical-reference/cli) or the Rust crate [`rgb-runtime`](./rust-sdk.md). See [Two RGB lines](/getting-started/two-rgbs).
:::

:::danger `@rgbjs/*` packages don't exist
Earlier versions of this site documented `@rgbjs/core`, `@rgbjs/wallet`, `@rgbjs/react`, `@rgbjs/cli`, `@rgbjs/testing` and similar packages. None of them was ever published, and the `@rgbjs` scope isn't registered on npm, so anyone could claim those names. **Don't install them.** The API that page described (`RgbWallet`, `Rgb20Contract`, React hooks, a `window.rgb` provider) never existed.
:::

## Options

Versions are from `npm view` and GitHub on 2026-10-19.

| Package | Runs in | Maintainer | Status |
|---|---|---|---|
| [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) 0.3.0-beta.7 (2026-07-18) | Node.js, as a native addon | RGB-Tools ([rgb-lib-nodejs](https://github.com/RGB-Tools/rgb-lib-nodejs)) | Official bindings of [rgb-lib](https://github.com/RGB-Tools/rgb-lib). Beta. |
| [`@utexo/rgb-lib-wasm`](https://www.npmjs.com/package/@utexo/rgb-lib-wasm) 1.0.0-beta.3 | Browsers (WASM) | Utexo ([rgb-lib-wasm](https://github.com/UTEXO-Protocol/rgb-lib-wasm)) | Third party. Its README says it "has not been audited". NIA and IFA only, Esplora over HTTP, IndexedDB storage. |
| [`@utexo/rgb-sdk-core`](https://www.npmjs.com/package/@utexo/rgb-sdk-core), [`-web`](https://www.npmjs.com/package/@utexo/rgb-sdk-web), [`-rn`](https://www.npmjs.com/package/@utexo/rgb-sdk-rn) (1.0.0 betas) | Node.js, browsers, React Native | Utexo | Third-party, higher-level TypeScript wrappers over rgb-lib. Beta. The older `@utexo/rgb-sdk` repo is archived. |
| [RGB Lightning Node](https://github.com/RGB-Tools/rgb-lightning-node) REST API | Any language over HTTP | RGB-Tools | A daemon with an [OpenAPI spec](https://github.com/RGB-Tools/rgb-lightning-node/blob/master/openapi.yaml) (`/issueassetnia`, `/rgbinvoice`, `/sendrgb`, `/refreshtransfers`, `/backup` and more). Its README calls it "early alpha", for regtest and testnet. |

The unscoped npm package `rgbjs` is a 0.0.1 placeholder. The rgbjs project ([rgbjs.com](https://rgbjs.com)) is in development and has no published SDK yet.

Third-party packages hold your keys and RGB data. Read their code and pin exact versions before you trust them with funds.

## rgb-lib for Node.js

Install it with `npm install rgb-lib`. npm picks the right platform package (`@rgb-tools/rgb-lib-<os>-<arch>`). This sketch follows the project's [`example.js`](https://github.com/RGB-Tools/rgb-lib-nodejs/blob/master/example.js). Numbers are passed as strings, and the indexer and proxy are the local regtest services from [Testing](./testing.md).

```javascript
const rgblib = require("rgb-lib");

const net = rgblib.BitcoinNetwork.Regtest;
const keys = rgblib.generateKeys(net, rgblib.WitnessVersion.Taproot);
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

There is no RGB WalletConnect method, injected browser provider or React binding in any of these packages.
