---
sidebar_position: 4
title: Consignments
description: RGB consignment format and transfer proof structure
---

# RGB Consignments

Consignments are self-contained packages containing all data needed to validate an RGB transfer.

## Consignment Structure

```typescript
interface Consignment {
  // Contract identification
  contractId: ContractId;
  schema: SchemaId;

  // Genesis (if first transfer)
  genesis?: Genesis;

  // State history
  transitions: Transition[];

  // Seals and anchors
  anchors: Anchor[];
  seals: Seal[];

  // Proofs
  proofs: Proof[];

  // Metadata
  created: Timestamp;
  version: Version;
}
```

*Structure to be expanded*

## Binary Format

Consignment binary encoding:

```
[Header]
  - Magic bytes: 'RGB0'
  - Version: u16
  - Contract ID: [u8; 32]

[Genesis] (optional)
  - Schema ID
  - Global state
  - Allocations

[Transitions]
  - Count: u32
  - Transition data...

[Anchors]
  - Bitcoin TX proofs

[Proofs]
  - State proofs
  - Merkle paths
```

*Binary format to be expanded*

## Creating Consignments

```typescript
const consignment = await transfer.createConsignment({
  includeGenesis: true,
  includeHistory: true,
  compress: true
});

const data = consignment.serialize();
await fs.writeFile('transfer.rgb', data);
```

*Creation to be expanded*

## Validating Consignments

```typescript
const consignment = Consignment.deserialize(data);

const validation = await validator.validate(consignment);

if (!validation.valid) {
  throw new Error(`Invalid: ${validation.errors}`);
}
```

*Validation to be expanded*

## Consignment Types

### Transfer Consignment

Standard asset transfer:

*To be expanded*

### Genesis Consignment

Initial contract distribution:

*To be expanded*

### State Consignment

State query response:

*To be expanded*

## Compression

```typescript
const compressed = consignment.compress({
  algorithm: 'zstd',
  level: 9
});

console.log('Original:', consignment.size);
console.log('Compressed:', compressed.size);
```

*Compression to be expanded*

## Related Documentation

- [State Transitions](../guides/contracts/state-transitions.md)
- [RGB20 Transfers](../guides/rgb20/transferring-assets.md)
- [Strict Types](./strict-types.md)
