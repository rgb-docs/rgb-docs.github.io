---
sidebar_position: 2
title: Contractum Language
description: Learn Contractum, RGB's declarative language for defining smart contract logic and validation rules
---

# Contractum Language

Contractum is RGB's domain-specific language for defining smart contract schemas, validation logic, and business rules. It provides a human-readable, declarative syntax that compiles to AluVM bytecode for client-side validation.

## Introduction to Contractum

Contractum bridges the gap between high-level contract logic and low-level validation. It allows developers to express complex contract rules without writing assembly code.

### Key Features

- **Declarative Syntax**: Express what contracts should do, not how
- **Type Safety**: Strong typing prevents common errors
- **Composability**: Reuse common patterns and functions
- **Formal Verification**: Provable correctness guarantees
- **AluVM Compilation**: Compiles to efficient bytecode

*Language overview to be expanded*

## Basic Syntax

### Contract Definition

```contractum
contract FungibleToken {
  // Global state (shared across all holders)
  global {
    ticker: String<8>,
    name: String<256>,
    total_supply: U64,
    max_supply: Option<U64>
  }

  // Owned state (attached to UTXOs)
  owned {
    amount: U64
  }

  // State rights (special permissions)
  rights {
    issue: Unit,
    burn: Unit
  }
}
```

*Syntax basics to be expanded*

### Data Types

**Primitive Types**
```contractum
U8, U16, U32, U64      // Unsigned integers
I8, I16, I32, I64      // Signed integers
String<N>              // UTF-8 string, max N bytes
Bytes<N>               // Binary data, max N bytes
Bool                   // Boolean
Unit                   // Empty type (like void)
```

**Composite Types**
```contractum
Option<T>              // Optional value
Array<T, N>            // Fixed-size array
Vec<T>                 // Dynamic array
Map<K, V>              // Key-value map
Tuple<T1, T2, ...>     // Product type
```

*Type system to be expanded*

### State Declarations

**Global State**
```contractum
global {
  // Immutable after genesis
  const ticker: String<8>,

  // Mutable global state
  var total_supply: U64,

  // Optional fields
  details: Option<String<1024>>
}
```

**Owned State**
```contractum
owned {
  // Fungible amount
  amount: U64,

  // NFT token data
  token_data: Attachment,

  // Fractional ownership
  fraction: Rational<U64>
}
```

*State management to be expanded*

## Transitions (Operations)

### Defining Transitions

```contractum
transition Transfer {
  // Input requirements
  inputs {
    sender_amount: U64
  }

  // Output allocations
  outputs {
    recipient_amount: U64,
    change_amount: Option<U64>
  }

  // Validation rules
  validate {
    // Conservation of value
    sender_amount == recipient_amount + change_amount.unwrap_or(0);

    // No zero transfers
    recipient_amount > 0;
  }
}
```

*Transition syntax to be expanded*

### Metadata and Attachments

```contractum
transition Mint {
  // Metadata (not part of state)
  metadata {
    token_id: U64,
    uri: String<256>
  }

  // File attachments
  attachments {
    image: Bytes<10_000_000>  // Max 10 MB
  }

  outputs {
    token: TokenData
  }

  validate {
    // Validate metadata
    token_id > 0;
    uri.len() > 0;

    // Validate attachment
    image.mime_type() == "image/png";
  }
}
```

*Metadata handling to be expanded*

## Validation Logic

### Built-in Functions

```contractum
validate {
  // Arithmetic
  sum(inputs.amount) == sum(outputs.amount);
  max(outputs.amount) <= 1000;

  // Logic
  all(outputs, |o| o.amount > 0);
  any(inputs, |i| i.has_permission);

  // Cryptography
  verify_signature(msg, sig, pubkey);
  hash_sha256(data) == expected_hash;

  // Bitcoin integration
  current_height() >= unlock_height;
  current_timestamp() >= deadline;
}
```

*Function reference to be expanded*

### Conditional Logic

```contractum
transition ConditionalBurn {
  inputs {
    amount: U64,
    has_burn_right: Bool
  }

  validate {
    // Require burn permission
    require(has_burn_right, "Burn permission required");

    // Or use if-else
    if amount > 1000 {
      require(has_admin_right, "Large burns need admin approval");
    }
  }
}
```

*Control flow to be expanded*

### Complex Validation

```contractum
transition ComplexTransfer {
  inputs {
    amounts: Vec<U64>,
    permissions: Vec<Permission>
  }

  outputs {
    new_amounts: Vec<U64>
  }

  validate {
    // Check all inputs have permission
    require(
      all(permissions, |p| p.is_valid()),
      "Invalid permissions"
    );

    // Custom validation function
    validate_distribution(inputs, outputs);

    // Nested conditions
    if is_high_value_transfer() {
      require_multisig();
      log_transaction();
    }
  }

  // Helper functions
  fn is_high_value_transfer() -> Bool {
    sum(outputs.new_amounts) > 100_000
  }

  fn require_multisig() {
    require(
      count(valid_signatures) >= 2,
      "Multisig required"
    )
  }
}
```

*Advanced validation to be expanded*

## Functions and Libraries

### Defining Functions

```contractum
// Pure function
fn calculate_fee(amount: U64, rate: U64) -> U64 {
  (amount * rate) / 10000
}

// Function with validation
fn validate_amount(amount: U64) -> Bool {
  amount > 0 && amount <= MAX_AMOUNT
}

// Generic function
fn find<T>(items: Vec<T>, predicate: Fn(T) -> Bool) -> Option<T> {
  for item in items {
    if predicate(item) {
      return Some(item);
    }
  }
  None
}
```

*Function definitions to be expanded*

### Importing Libraries

```contractum
// Import standard library
use std::math::*;
use std::crypto::{hash_sha256, verify_sig};

// Import custom library
use rgb::common::amount_validation;

contract MyToken {
  use amount_validation::validate_transfer;

  transition Transfer {
    validate {
      validate_transfer(inputs, outputs);
    }
  }
}
```

*Module system to be expanded*

## Advanced Features

### State Machines

```contractum
contract Auction {
  global {
    var state: AuctionState,
    highest_bid: U64,
    end_time: U64
  }

  enum AuctionState {
    Open,
    Closed,
    Finalized
  }

  transition Bid {
    inputs { bid_amount: U64 }

    validate {
      // State check
      state == AuctionState::Open;
      current_timestamp() < end_time;
      bid_amount > highest_bid;
    }

    effects {
      state = AuctionState::Open;
      highest_bid = bid_amount;
    }
  }

  transition Close {
    validate {
      state == AuctionState::Open;
      current_timestamp() >= end_time;
    }

    effects {
      state = AuctionState::Closed;
    }
  }
}
```

*State machine patterns to be expanded*

### Oracles and External Data

```contractum
transition PriceBasedTransfer {
  metadata {
    oracle_signature: Signature,
    price_data: PriceData
  }

  validate {
    // Verify oracle signature
    verify_signature(
      price_data.hash(),
      oracle_signature,
      ORACLE_PUBKEY
    );

    // Use oracle data in validation
    let usd_value = amount * price_data.btc_usd_rate;
    require(usd_value <= max_usd_value, "Exceeds USD limit");
  }
}
```

*Oracle integration to be expanded*

### Time Locks and HTLCs

```contractum
transition TimeLocked {
  inputs {
    amount: U64,
    unlock_height: U64
  }

  validate {
    current_height() >= unlock_height;
  }
}

transition HashLocked {
  metadata {
    preimage: Bytes<32>
  }

  inputs {
    hash_lock: Bytes<32>
  }

  validate {
    hash_sha256(preimage) == hash_lock;
  }
}
```

*Advanced patterns to be expanded*

## Compilation and Deployment

### Compiling Contractum

```bash
# Compile to schema
contractum compile contract.ctrm -o contract.schema

# With optimization
contractum compile contract.ctrm -o contract.schema --optimize

# Generate documentation
contractum doc contract.ctrm -o docs/
```

*Compilation process to be expanded*

### Deployment

```typescript
import { Contractum } from '@rgbjs/contractum';

// Load compiled schema
const schema = await Contractum.loadSchema('./contract.schema');

// Create contract instance
const contract = await schema.instantiate({
  global: {
    ticker: "TKN",
    name: "My Token",
    total_supply: 0n
  }
});

console.log(`Contract ID: ${contract.contractId}`);
```

*Deployment workflow to be expanded*

## Testing and Debugging

### Unit Tests

```contractum
#[test]
fn test_transfer_validation() {
  let inputs = [100];
  let outputs = [60, 40];

  assert(sum(inputs) == sum(outputs));
}

#[test]
#[should_fail]
fn test_invalid_transfer() {
  let inputs = [100];
  let outputs = [60, 50];  // Sum mismatch

  validate_transfer(inputs, outputs);  // Should fail
}
```

*Testing framework to be expanded*

### Debugging

```contractum
transition Debug {
  validate {
    // Debug logging
    debug!("Input amount: {}", inputs.amount);
    debug!("Output sum: {}", sum(outputs));

    // Assertions
    assert!(inputs.amount > 0, "Amount must be positive");

    // Trace execution
    trace!("Validation passed");
  }
}
```

*Debugging tools to be expanded*

## Best Practices

### Code Organization

```contractum
// contracts/token.ctrm
contract Token {
  // Group related state
  global {
    // Core token info
    const ticker: String<8>,
    const name: String<256>,

    // Supply management
    var total_supply: U64,
    max_supply: Option<U64>
  }

  // Group related transitions
  mod transfers {
    transition Transfer { /* ... */ }
    transition BatchTransfer { /* ... */ }
  }

  mod issuance {
    transition Issue { /* ... */ }
    transition Burn { /* ... */ }
  }
}
```

*Organization patterns to be expanded*

### Security Guidelines

1. **Validate All Inputs**: Never trust input data
2. **Check Arithmetic**: Prevent overflow/underflow
3. **Access Control**: Verify permissions explicitly
4. **State Consistency**: Maintain invariants
5. **Gas Limits**: Prevent DoS through complexity

*Security practices to be expanded*

### Performance Optimization

```contractum
// BAD: Inefficient
validate {
  for i in 0..1000 {
    for j in 0..1000 {
      check(i, j);  // O(n²)
    }
  }
}

// GOOD: Optimized
validate {
  let cached = precompute();
  for i in 0..1000 {
    check_cached(i, cached);  // O(n)
  }
}
```

*Optimization techniques to be expanded*

## Related Documentation

- [RGB Schemas](./schemas.md)
- [Genesis Contracts](./genesis.md)
- [State Transitions](./state-transitions.md)
- [Strict Types](../../technical-reference/strict-types.md)
- [AluVM](../../core-concepts/aluvm.md)
- [Rust SDK](../development/rust-sdk.md)
