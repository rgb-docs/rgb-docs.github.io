---
sidebar_position: 6
title: Payment Scripts
description: Bitcoin transaction scripts for RGB commitments
---

# RGB Payment Scripts

RGB uses Bitcoin transaction outputs to commit to state transitions.

## OP_RETURN Commitments

```
OP_RETURN <rgb_tag> <commitment_hash>

Example:
OP_RETURN 0x524742 0x2a5f...
```

*OP_RETURN format to be expanded*

## Taproot Commitments

```typescript
// Commit RGB data in taproot output
const taproot = createTaprootCommitment({
  internalKey: publicKey,
  rgbCommitment: commitmentHash
});
```

*Taproot commits to be expanded*

## Commitment Schemes

### DBC (Deterministic Bitcoin Commitments)

*To be expanded*

### Tapret (Taproot OP_RETURN)

*To be expanded*

## Script Templates

```typescript
const script = buildCommitmentScript({
  type: 'opreturn',
  commitment: hash,
  extraData: metadata
});
```

*Script building to be expanded*

## Related Documentation

- [Bitcoin UTXOs](../core-concepts/bitcoin-utxos.md)
- [State Transitions](../guides/contracts/state-transitions.md)
