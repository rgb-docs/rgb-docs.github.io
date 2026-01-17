---
sidebar_position: 9
title: FAQ
description: Frequently asked questions about RGB
---

# Frequently Asked Questions

Common questions about RGB protocol and development.

## General

### What is RGB?

RGB is a smart contract system for Bitcoin and Lightning Network that uses client-side validation.

*Answer to be expanded*

### How is RGB different from Ethereum?

- **Validation**: Client-side vs on-chain
- **Privacy**: Default privacy vs public
- **Scalability**: Unlimited vs limited
- **Security**: Bitcoin-backed vs own consensus

*Comparison to be expanded*

### Is RGB on Bitcoin mainnet?

Yes, RGB v0.10+ supports Bitcoin mainnet.

*Status to be expanded*

## Technical

### How does client-side validation work?

Instead of miners/validators checking transactions, recipients validate transfer history themselves.

*Explanation to be expanded*

### Where is RGB state stored?

State is stored client-side in "stashes." Only commitments go on Bitcoin blockchain.

*Storage to be expanded*

### Can RGB contracts interact?

Not directly. Each contract is independent, though atomic swaps enable coordination.

*Interoperability to be expanded*

### What happens if I lose my consignment?

You can't prove ownership. Always backup consignments.

*Data safety to be expanded*

## Development

### Which SDK should I use?

- Rust: For core applications, wallets, infrastructure
- TypeScript/JavaScript: For web apps, mobile apps

*SDK selection to be expanded*

### Can I use RGB with JavaScript?

Yes, via @rgbjs packages.

*JavaScript support to be expanded*

### How do I test RGB contracts?

Use regtest or testnet. See [Testing Guide](../guides/development/testing.md).

*Testing to be expanded*

## Tokens

### How do I create an RGB20 token?

See [Creating RGB20 Tokens](../guides/rgb20/issuing-assets.md).

*Token creation to be expanded*

### Can RGB20 tokens be listed on exchanges?

Yes, with RGB-aware exchange integration.

*Exchange support to be expanded*

### What's the difference between RGB20 and RGB21?

- RGB20: Fungible tokens (like ERC-20)
- RGB21: NFTs (like ERC-721)

*Token standards to be expanded*

## Lightning

### Does RGB work with Lightning?

Yes, RGB supports Lightning Network channels for instant transfers.

*Lightning support to be expanded*

### Do I need Lightning for RGB?

No, but Lightning enables instant, low-fee transfers.

*Lightning requirement to be expanded*

## Privacy

### Is RGB private?

Yes, transfers are private by default. Only parties involved know details.

*Privacy to be expanded*

### Can anyone see my RGB balance?

No, balances are not public.

*Balance privacy to be expanded*

## Troubleshooting

### My transfer isn't showing up

- Check Bitcoin transaction confirmed
- Verify consignment was received
- Sync wallet state

*Transfer issues to be expanded*

### Validation failing

- Ensure consignment is complete
- Check contract genesis in stash
- Verify Bitcoin anchors

*Validation issues to be expanded*

## Related Documentation

- [Troubleshooting](./troubleshooting.md)
- [Glossary](./glossary.md)
- [Getting Started](../guides/getting-started.md)
