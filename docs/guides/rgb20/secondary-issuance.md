---
sidebar_position: 3
title: Secondary issuance (IFA)
description: Inflatable Fungible Assets in RGB v0.11 — max supply, inflation rights, inflate, burn, link and reject lists — with rgb-lib, rgb-cmd and the RGB Lightning Node.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-19
---

# Secondary issuance (IFA)

:::info RGB v0.11 line (rgb-cmd 0.11.1)
Secondary issuance exists only in v0.11, through the IFA schema. v0.12 rc.3 ships only a fixed-supply issuer (RGB20-FNA). See [Two RGB lines](/getting-started/two-rgbs).
:::

A token whose supply can grow after genesis is a contract of the **IFA** (Inflatable Fungible Asset) schema. NIA, CFA and PFA contracts are fixed at genesis and can never be inflated or burned.

:::warning Not production-ready, and changing in 0.11.2
- The `rgb-schemas` 0.11.1 README marks IFA **"Not production-ready"**.
- **Coming next:** Line B 0.11.2 (release candidate since 2026-10-09) makes contracts issued with the old IFA schema invalid. Don't issue IFA assets you need to keep until 0.11.2 is final and your tools support it. See [Two RGB lines](/getting-started/two-rgbs).
:::

## How IFA works

From `rgb-schemas` 0.11.1 `src/ifa.rs` and the official [supported schemas](https://github.com/rgb-protocol/RGB-Documentation/blob/master/rgb-contract-implementation/schema/supported-schemas.md) page:

| Element | Kind | Meaning |
|---|---|---|
| `spec`, `terms` | Global | As in NIA: ticker, name, details, precision, and terms |
| `issuedSupply` | Global, once per issuing operation | The amount issued **by this operation**: by genesis, and then by each `inflate` |
| `maxSupply` | Global, set in genesis | Upper bound on the total supply |
| `assetOwner` | Owned, fungible | Token balances |
| `inflationAllowance` | Owned, fungible | **Inflation rights**: whoever controls this UTXO can issue up to this many more tokens |
| `linkRight` | Owned, declarative, at most one | The right to link this contract to another one, once |
| `rejectListUrl` | Global, optional | A URL where the issuer lists operations wallets should treat as invalid |
| `linkedFromContract`, `linkedToContract` | Global, optional | Declare another contract as the same economic asset |

The validation scripts enforce:

- **Genesis:** the `assetOwner` allocations add up to `issuedSupply`, and the inflation rights add up to exactly `maxSupply − issuedSupply` (errno 30 if not, `ERRNO_INFLATION_MISMATCH`).
- **`inflate`:** it spends inflation rights and creates new `assetOwner` allocations that add up to the new `issuedSupply`. Any leftover allowance goes to new inflation-right outputs and is declared in the `allowedInflation` metadata. Spent rights must equal new issuance plus remaining allowance (errno 31, `ERRNO_INFLATION_EXCEEDS_ALLOWANCE`). So the total can never exceed `maxSupply`.
- **`burn`:** it spends asset or inflation-right allocations and declares the burned amount, which must be non-zero, in the `burnedAsset` / `burnedInflation` metadata (errnos 40 and 41). Change outputs allow partial burns. A burn proves to third parties that the tokens or rights no longer exist.
- **`link`:** it spends the link right and sets `linkedToContract`. This can happen only once. A link from A to B is meant to count only when A says `linkedToContract = B` **and** B says `linkedFromContract = A`. It lets an issuer move holders to a new contract, for example a newer schema.
- **`transfer`:** it moves assets and rights. Inputs and outputs balance for both.

There is no inflation schedule and no signature-based issuance. Control comes from who holds the inflation-right UTXOs. To spread control, put the rights in a multisig wallet, such as rgb-lib's `MultisigWallet`.

**Reject lists** are advisory. The issuer can't enforce them, because validation is client-side. rgb-lib 0.3.0-beta.7 fetches the list when it handles an IFA transfer (`src/wallet/online.rs`). The list is a text file with one operation output (`Opout`) per line, and a `!` prefix marks an exception. A receiving rgb-lib wallet refuses consignments whose history includes a rejected output. A sending wallet leaves rejected inputs out of coin selection.

## With rgb-lib

For `rgb-lib` 0.3.0-beta.7 (`src/wallet/singlesig.rs`). Wallet setup is as in [Issuing fungible tokens](/guides/rgb20/creating-tokens). This code wasn't run for this page.

```rust
// Issue: 1,000 in circulation, plus inflation rights for 500 more (maxSupply = 1,500).
let asset = wallet.issue_asset_ifa(
    "DEMOI".into(),
    "Demo Inflatable".into(),
    0,                // precision
    vec![1_000],      // initial allocations
    vec![500],        // inflation-right allocations
    None,             // reject_list_url: Some("https://…".into())
)?;

// Later, from the wallet that holds the inflation rights: issue 200 more (fee rate 2 sat/vB).
wallet.inflate(online, asset.asset_id.clone(), vec![200], 2, 1)?;

// Burn 50 of the wallet's tokens.
wallet.burn(online, asset.asset_id.clone(), 50, 2, 1)?;
```

- `inflate` and `burn` publish a Bitcoin transaction, so they need the wallet online and a spendable UTXO for fees.
- `inflate_begin` / `inflate_end` and `burn_begin` / `burn_end` split the call around an external signer. The multisig wallet has `inflate_init` and `burn_init`.
- rgb-lib 0.3.0-beta.7 has no API to issue link rights or to link contracts.

The [RGB Lightning Node](/guides/lightning/overview) exposes `POST /issueassetifa` (`amounts`, `inflation_amounts`, `ticker`, `name`, `precision`, `reject_list_url`) and `POST /inflate` (`asset_id`, `inflation_amounts`, `fee_rate`, `min_confirmations`), according to its `openapi.yaml`.

## With rgb-cmd

`rgb issue` can create an IFA genesis, because both its assignments are fungible. This was run offline with rgb-cmd 0.11.1 after `rgb import InflatableFungibleAsset.rgb`. The seals are placeholders:

```yaml
schema: rgb:sch:IpjJhFLz3oywYKQxO3KmFgR0Aa415nlTNrNyEFqMZCE#shoe-colombo-mango

globals:
  spec:
    ticker: DEMOI
    name: Demo Inflatable
    details: ~
    precision: 0
  terms:
    text: demo IFA asset
    media: ~
  issuedSupply: 1000
  maxSupply: 1500

assignments:
  assetOwner:
    seal: <txid>:1
    amount: 1000
  inflationAllowance:
    seal: <txid>:2
    amount: 500
```

```bash
rgb -n regtest -d data0 issue "ssi:issuer" ifa.yaml
```

Real output: `A new contract rgb:HuhVTxeu-e_t~olZ-wRPYYOB-jr93HHf-1lSkoEd-EhlPbiI is issued and added to the stash.` rgb-cmd 0.11.1 has no `inflate` or `burn` command. Use rgb-lib or RLN for those.

## Related: PFA

The **PFA** (Permissioned Fungible Asset) schema is a different tool. Its supply is fixed, and the issuer's key, the `pubkey` global, must sign every **transfer**. It is meant for assets with legal limits on who may hold them. It is also marked "Not production-ready", and rgb-lib doesn't support it. See [Schemas (v0.11)](/guides/contracts/schemas).
