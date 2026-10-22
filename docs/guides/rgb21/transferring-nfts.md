---
sidebar_position: 3
title: Transferring NFTs
description: Send a UDA NFT in RGB v0.11 with rgb-cmd or rgb-lib. Same flow as a fungible transfer, with a token index instead of an amount.
rgb_line: B
verified_with: rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
image: /img/og/guides/rgb21/transferring-nfts.png
---

# Transferring NFTs

:::info RGB v0.11 line (rgb-cmd 0.11.1)
This covers UDA NFTs in v0.11. v0.12 has only a third-party NFT issuer, and a transfer with it failed when tested, so there is no v0.12 NFT transfer to document (see [Issuing NFTs](/guides/rgb21/creating-nfts#v012-rgb21)). See [Two RGB lines](/getting-started/two-rgbs).
:::

A UDA NFT moves exactly like a fungible asset: invoice → transfer (consignment plus PSBT) → recipient validates → payer signs and broadcasts → recipient accepts. Read [Transferring fungible assets](/guides/rgb20/transferring-assets) first. This page covers only what is different.

- The invoice asks for the **token** (index and fraction), not an amount. A UDA contract has one token, and the fraction is always 1.
- The transfer has one input and one output allocation (`assetOwner` is `Once` in the UDA transfer schema). There is no RGB change. The Bitcoin transaction still normally has a change output for the sats.
- The consignment carries genesis, and with it the token's `TokenData`, including the embedded `preview`. Referenced media files travel separately (see [Metadata and attachments](/guides/rgb21/metadata-attachments)).

:::danger Consignment before broadcast
Send the consignment and get it validated **before** you broadcast. If the witness transaction is published and the consignment is lost, the NFT is gone. Never publish a consignment on a public network: it contains the token's whole ownership history.
:::

## With the CLI

The commands are the same as in the [Quick Start](/getting-started/quick-start) regtest demo, apart from the invoice. Set the network first: `rgb-cmd` defaults to testnet3.

```bash
export LNPBP_NETWORK=regtest
# recipient (the contract and the UDA kit must be imported first)
rgb -d data1 -w rcpt1 --electrum=localhost:50001 invoice --token-index 0 --token-fraction 1 "$contract_id"
# payer
rgb -d data0 -w issuer --electrum=localhost:50001 transfer "$invoice" nft.rgb nft.psbt
# recipient, before broadcast
rgb -d data1 -w rcpt1 --electrum=localhost:50001 validate nft.rgb
# payer signs (bp-hot sign), then:
rgb -d data0 -w issuer --electrum=localhost:50001 finalize -p nft.psbt nft.tx
# recipient, after confirmation
rgb -d data1 -w rcpt1 --electrum=localhost:50001 accept nft.rgb
```

rgb-lib issues its UDAs with token index 0. Always pass `--token-fraction 1`: without it, `rgb-cmd` puts a fraction of 0 in the invoice (`cli/src/command.rs`), and the UDA script accepts only a fraction of 1. See [`invoice`](/technical-reference/cli-v011#invoice) and [`transfer`](/technical-reference/cli-v011#transfer).

## With rgb-lib

For `rgb-lib` 0.3.0-beta.7. This is the same code as the [fungible example](/guides/rgb20/transferring-assets), with `Assignment::NonFungible`. `refresh` is a method of the `RgbWalletOpsOnline` trait, so import it:

```rust
use std::collections::HashMap;
use rgb_lib::wallet::{Invoice, Recipient, RgbWalletOpsOnline};
use rgb_lib::Assignment;

let receive = bob.blind_receive(Some(nft_id.clone()), Assignment::NonFungible, expiry, vec![proxy.clone()], 1)?;

let data = Invoice::new(receive.invoice)?.invoice_data();
let recipient = Recipient {
    recipient_id: data.recipient_id,
    witness_data: None,
    assignment: Assignment::NonFungible,
    transport_endpoints: data.transport_endpoints,
};
alice.send(alice_online, HashMap::from([(nft_id.clone(), vec![recipient])]), false, 2, 1, expiry)?;

bob.refresh(bob_online, None, vec![], false)?;     // fetches consignment and media, checks digests, ACKs
alice.refresh(alice_online, None, vec![], false)?; // broadcasts after the ACK
```

`send` also posts the token's media files to the proxy (`media.post`), and the recipient's `refresh` fetches them and checks them against the digests in the contract.

## Checking what you received

The contract ID commits to genesis, so a contract ID you trust also fixes the token data. The `validate` step (or rgb-lib's `refresh`) checks the whole history back to that genesis. `rgb -d data1 -w rcpt1 state "$contract_id"` shows the token and its owner, and `rgb history` lists the operations. Neither the CLI nor rgb-lib can tell you who issued a contract: `ssi:` issuer identities are not verified.
