---
sidebar_position: 7
title: Strict Types
description: RGB strict type encoding system for deterministic serialization
---

# Strict Types

RGB uses a strict type system for deterministic, portable data encoding.

## Type System

### Primitive Types

```
U8, U16, U32, U64, U128, U256    // Unsigned integers
I8, I16, I32, I64, I128, I256    // Signed integers
F32, F64                          // Floats
Bool                              // Boolean
Bytes                             // Raw bytes
String                            // UTF-8 string
```

*Primitive types to be expanded*

### Composite Types

```typescript
// Option
Option<T> = Some(T) | None

// Array
Array<T, N> = [T; N]  // Fixed size

// Vec
Vec<T> = [T]  // Dynamic size

// Map
Map<K, V> = [(K, V)]

// Tuple
Tuple<A, B, ...> = (A, B, ...)
```

*Composite types to be expanded*

## Encoding

```rust
// Encode to bytes
let data: Vec<u8> = value.strict_encode()?;

// Decode from bytes
let value = T::strict_decode(&data)?;
```

*Encoding to be expanded*

## Schema Definition

```yaml
MyType:
  fields:
    id: U64
    name: String<256>
    balance: U64
    metadata: Option<Bytes>
```

*Schema types to be expanded*

## Custom Types

```typescript
type TokenAmount = U64;
type Timestamp = I64;
type Hash = Bytes<32>;
```

*Custom types to be expanded*

## Deterministic Encoding

Strict encoding ensures same data always produces same bytes:

*To be expanded*

## Related Documentation

- [RGB Schemas](../guides/contracts/schemas.md)
- [Contractum](../guides/contracts/contractum.md)
- [Consignments](./consignments.md)
