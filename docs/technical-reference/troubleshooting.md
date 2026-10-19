---
sidebar_position: 8
title: Troubleshooting
description: Common RGB issues and solutions
---

# Troubleshooting

:::danger `@rgbjs/*` packages don't exist
The `@rgbjs/...` imports on this page refer to npm packages that were never published, and the `@rgbjs` scope isn't registered. Treat these examples as illustrative only and **don't install anything under that name**: anyone could register it. Real JavaScript options: Line B (RGB Protocol Association) has the [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) bindings from RGB-Tools. Line A (RGB-WG v0.12) has no JavaScript SDK. This page is being rewritten.
:::

Solutions to common RGB problems and error messages.

## Installation Issues

### Rust Build Failures

```bash
error: failed to compile rgb-std
```

**Solution:**
```bash
# Update Rust
rustup update stable

# Install dependencies
apt-get install build-essential pkg-config libssl-dev
```

*Build issues to be expanded*

### Node.js Module Errors

```bash
Error: Cannot find module '@rgbjs/core'
```

**Solution:** there's no `@rgbjs/core` package on npm, so don't install anything under that name. Line B's JavaScript bindings are the [`rgb-lib`](https://www.npmjs.com/package/rgb-lib) package from RGB-Tools. Line A has no JavaScript SDK.

*Module issues to be expanded*

## Runtime Errors

### Invalid Consignment

```
Error: Consignment validation failed
```

**Common causes:**
- Corrupted file
- Missing genesis
- Invalid state transition
- Bitcoin anchor not confirmed

**Solutions:**
- Re-request consignment
- Verify Bitcoin transaction
- Check contract state

*Consignment errors to be expanded*

### UTXO Not Found

```
Error: UTXO not found in stash
```

**Solution:**
```bash
# Sync wallet
rgb-cli sync

# Import missing state
rgb-cli import genesis.rgb
```

*UTXO errors to be expanded*

### Insufficient Balance

```
Error: Insufficient RGB balance
```

**Check:**
```bash
rgb-cli balance --contract-id <id>
```

*Balance errors to be expanded*

## Network Issues

### Bitcoin RPC Connection Failed

```
Error: Cannot connect to Bitcoin RPC
```

**Solution:**
```bash
# Check bitcoind is running
bitcoin-cli getblockcount

# Verify RPC credentials
# Check rgb.conf
```

*Network errors to be expanded*

### Anchor Transaction Not Found

```
Error: Anchor transaction not in blockchain
```

**Solution:**
- Wait for confirmation
- Check transaction was broadcast
- Verify transaction ID

*Anchor errors to be expanded*

## Performance Issues

### Slow Validation

Large consignments take time to validate:

**Solutions:**
- Use incremental validation
- Enable caching
- Increase memory allocation

*Performance tuning to be expanded*

### High Memory Usage

**Solutions:**
```bash
# Prune old state
rgb-cli prune --before <date>

# Archive unused contracts
rgb-cli archive --contract-id <id>
```

*Memory optimization to be expanded*

## Data Issues

### Corrupted Stash

```
Error: Stash data corrupted
```

**Recovery:**
```bash
# Restore from backup
rgb-cli restore --backup stash-backup.tar.gz

# Rebuild from consignments
rgb-cli rebuild --from-consignments ./consignments/
```

*Data recovery to be expanded*

### State Mismatch

```
Error: State validation mismatch
```

**Debug:**
```bash
rgb-cli validate-state --contract-id <id> --verbose
```

*State debugging to be expanded*

## Getting Help

### Enable Debugging

```bash
RGB_LOG_LEVEL=debug rgb-cli <command>
```

### Report Issues

Include:
- RGB version
- Error message
- Steps to reproduce
- Relevant logs

*Issue reporting to be expanded*

### Community Support

- GitHub Issues: https://github.com/RGB-WG/rgb
- Telegram: @rgbtelegram
- Discord: RGB Protocol

*Community resources to be expanded*

## Related Documentation

- [CLI Reference](./cli.md)
- [FAQ](./faq.md)
