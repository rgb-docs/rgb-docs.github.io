---
sidebar_position: 8
title: Troubleshooting
description: Common RGB issues and solutions
---

# Troubleshooting

Solutions to common RGB problems and error messages.

## Version Compatibility Issues

### Commands Don't Match Documentation

**Problem:** Commands shown in tutorials don't work with your RGB installation.

**Example Error:**
```bash
$ rgb issue --schema RGB20 --ticker TEST ...
Error: unrecognized option '--schema'
```

**Root Cause:** You're using a pre-release version (like `v0.12.0-rc.3`) that has different command syntax than the stable release documented here.

**Solution:**

1. **Check your installed version:**
```bash
rgb --version
```

2. **If you see an RC version** (e.g., `0.12.0-rc.3`, `0.12.0-rc.2`):
   - **Option A:** Install the stable release that matches this documentation:
     ```bash
     cargo install rgb-cli
     rgb --version  # Should show stable version without -rc
     ```
   
   - **Option B:** Use documentation from the specific branch you're working with:
     ```bash
     # Clone the repository at your RC version
     git clone --branch v0.12.0-rc.3 https://github.com/RGB-WG/rgb
     cd rgb
     
     # Read the README and examples from that specific version
     cat README.md
     ls examples/
     ```

3. **For development work**, use stable releases:
   ```bash
   # Remove RC version
   cargo uninstall rgb-cli
   
   # Install latest stable
   cargo install rgb-cli
   ```

### API Function Signatures Don't Match

**Problem:** Rust code examples fail to compile with type mismatches.

**Example Error:**
```rust
error[E0308]: mismatched types
  expected `ContractId`, found `ContractIface`
```

**Root Cause:** Pre-release versions may have different API structures.

**Solution:**
- Ensure you're using stable crate versions in `Cargo.toml`:
  ```toml
  [dependencies]
  rgb-core = "0.12"     # Not "0.12.0-rc.3"
  rgb-std = "0.12"
  ```
- Or use the exact RC version in your dependencies if needed:
  ```toml
  [dependencies]
  rgb-core = { git = "https://github.com/RGB-WG/rgb-core", tag = "v0.12.0-rc.3" }
  ```

### Breaking Changes Between Versions

**Problem:** Code that worked in v0.11 doesn't work in v0.12.

**Solution:** Review the [Migration Guide](/getting-started/whats-new-0-12#-migration-guide) for breaking changes and update your code accordingly.

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

**Solution:**
```bash
npm install @rgbjs/core
# or
npm run rebuild
```

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
- [API Reference](./api.md)
