---
sidebar_position: 1
title: RGB Schemas
description: Understanding RGB contract schemas, validation rules, and how to create custom schemas
---

# RGB Schemas

RGB schemas define the structure, rules, and semantics of smart contracts. They specify what state contracts can hold, what operations are valid, and how state transitions are validated. This guide covers RGB's schema system and how to work with both standard and custom schemas.

## What is a Schema?

A schema is a formal definition of a contract type in RGB. It acts as a blueprint that determines:

- **State Structure**: What data the contract stores
- **Operations**: What actions can be performed
- **Validation Rules**: How to verify state transitions
- **Interfaces**: How contracts expose functionality

Schemas are identified by a schema ID (hash of the schema definition) and are immutable once created.

### Schema Components

```yaml
schema:
  id: <schema-hash>
  name: "RGB20"
  version: "0.12.0"

  global_state:
    - ticker: String(maxLen: 8)
    - name: String(maxLen: 256)
    - precision: U8

  owned_state:
    - assetOwner: Amount

  transitions:
    - Transfer:
        inputs: [assetOwner]
        outputs: [assetOwner]
    - Issue:
        outputs: [assetOwner]

  genesis:
    required: [ticker, name, precision]
    owned: [assetOwner]
```

*Schema structure to be expanded*

## Standard RGB Schemas

### RGB20 - Fungible Assets

The RGB20 schema defines fungible tokens (like ERC-20):

```yaml
schema_id: rgb:schema:fungible:...
version: 0.12.0

owned_rights:
  assetOwner:
    type: Amount

global_state:
  ticker: String(8)
  name: String(256)
  details: Option<String(4096)>
  precision: U8
  timestamp: I64

state_schema:
  totalSupply: Amount
  maxSupply: Option<Amount>

transitions:
  Transfer:
    owned_rights: assetOwner
  Issue:
    owned_rights: assetOwner
    global: totalSupply
```

*RGB20 schema details to be expanded*

### RGB21 - Non-Fungible Tokens

The RGB21 schema defines unique tokens (like ERC-721):

```yaml
schema_id: rgb:schema:nft:...
version: 0.12.0

owned_rights:
  assetOwner:
    type: Token

global_state:
  name: String(256)
  metadata: Attachment

token_schema:
  token_id: U64
  metadata: TokenData

transitions:
  Transfer:
    owned_rights: assetOwner
  Mint:
    owned_rights: assetOwner
    global: totalMinted
```

*RGB21 schema details to be expanded*

### RGB25 - Collectibles

Enhanced NFT schema with collection features:

*To be expanded*

## Schema Definition Language

### Strict Types

RGB schemas use strict type encoding for deterministic validation:

```typescript
// Basic types
type U8 = number;        // 8-bit unsigned integer
type U16 = number;       // 16-bit unsigned integer
type U32 = number;       // 32-bit unsigned integer
type U64 = bigint;       // 64-bit unsigned integer
type String = string;    // UTF-8 string with max length

// Complex types
type Option<T> = T | null;
type Array<T> = T[];
type Map<K, V> = Record<K, V>;

// Custom types
type Amount = U64;
type TokenId = U64;
type Attachment = Bytes;
```

*Type system to be expanded*

### State Definitions

**Global State**: Shared across all contract instances

```yaml
global_state:
  ticker: String(maxLen: 8)
  totalSupply: U64
  issuer: PublicKey
```

**Owned State**: Associated with specific UTXOs

```yaml
owned_state:
  assetOwner: Amount
  fractionOwner: Rational64
```

*State types to be expanded*

### Transition Rules

Define valid state changes:

```yaml
transitions:
  Transfer:
    inputs:
      - assetOwner: Amount
    outputs:
      - assetOwner: Amount
    validation:
      - sum(inputs.assetOwner) == sum(outputs.assetOwner)

  Burn:
    inputs:
      - assetOwner: Amount
    validation:
      - inputs.assetOwner > 0
```

*Transition validation to be expanded*

## Creating Custom Schemas

### Schema Design Process

1. **Define Use Case**: What does your contract do?
2. **Identify State**: What data needs to be tracked?
3. **Design Transitions**: What operations are needed?
4. **Add Validation**: What rules ensure correctness?
5. **Test Thoroughly**: Verify all edge cases

*Design methodology to be expanded*

### Example: Simple Voting Schema

```yaml
schema:
  name: "RGB-Vote"
  version: "0.1.0"

  global_state:
    proposal: String(maxLen: 1024)
    deadline: U64  # block height
    yes_votes: U64
    no_votes: U64

  owned_state:
    voting_right: Unit  # Right to vote
    vote_cast: Bool     # Has voted

  transitions:
    Vote:
      inputs:
        - voting_right: Unit
      outputs:
        - vote_cast: Bool
      metadata:
        - choice: Bool  # true = yes, false = no
      validation:
        - current_height() < global.deadline
        - !inputs.vote_cast

    Tally:
      validation:
        - current_height() >= global.deadline
      effects:
        - freeze global.yes_votes
        - freeze global.no_votes
```

*Custom schema example to be expanded*

### Schema Compilation

```bash
# Compile schema definition
rgb-schema compile voting-schema.yaml -o voting.schema

# Verify schema
rgb-schema verify voting.schema

# Get schema ID
rgb-schema id voting.schema
```

*Schema tooling to be expanded*

### Using Custom Schemas

```typescript
import { Schema, Contract } from '@rgbjs/core';

// Load custom schema
const schema = await Schema.load('./voting.schema');

// Create contract using schema
const contract = await Contract.create({
  schema: schema,
  genesis: {
    global: {
      proposal: "Should we implement feature X?",
      deadline: currentHeight + 2016,
      yes_votes: 0n,
      no_votes: 0n
    },
    owned: {
      voting_right: voters.map(v => ({
        seal: v.seal,
        amount: 1
      }))
    }
  }
});
```

*Schema usage to be expanded*

## Schema Versioning

### Backward Compatibility

```yaml
schema:
  name: "RGB20"
  version: "0.12.0"
  compatible_with:
    - "0.11.0"
    - "0.10.0"

  upgrades:
    from_0_11:
      - add_field: max_supply
      - deprecate_field: old_precision
```

*Versioning strategy to be expanded*

### Migration Paths

Upgrading contracts to new schema versions:

*To be expanded*

## Schema Interfaces

### AluVM Script Integration

Schemas can include validation scripts in AluVM:

```asm
; Transfer validation script
push inputs.amount     ; Push input amounts
sum                    ; Sum all inputs
push outputs.amount    ; Push output amounts
sum                    ; Sum all outputs
eq                     ; Check equality
assert                 ; Assert true or fail
```

*AluVM integration to be expanded*

### Programmable Validation

Complex validation logic:

```typescript
interface ValidationRule {
  condition: AluVMScript;
  error: string;
}

const rules: ValidationRule[] = [
  {
    condition: 'sum(inputs) == sum(outputs)',
    error: 'Amount conservation violated'
  },
  {
    condition: 'all(outputs.amount > 0)',
    error: 'Zero-amount outputs not allowed'
  }
];
```

*Validation rules to be expanded*

## Schema Registry

### Publishing Schemas

```bash
# Publish to schema registry
rgb-schema publish voting.schema \
  --registry https://schema.rgb.tech \
  --author-key <key>
```

*Schema publishing to be expanded*

### Discovering Schemas

```bash
# Search for schemas
rgb-schema search "voting"

# Get schema by ID
rgb-schema get <schema-id>

# List all schemas
rgb-schema list --category governance
```

*Schema discovery to be expanded*

## Advanced Features

### Parametric Schemas

Schemas with configurable parameters:

*To be expanded*

### Composable Schemas

Combining multiple schemas:

*To be expanded*

### Recursive Structures

Schemas referencing themselves:

*To be expanded*

## Schema Security

### Validation Best Practices

1. **Conservation Laws**: Ensure assets aren't created/destroyed incorrectly
2. **Access Control**: Verify operation permissions
3. **Overflow Protection**: Check for arithmetic overflow
4. **State Consistency**: Maintain invariants
5. **DoS Prevention**: Limit computational complexity

*Security guidelines to be expanded*

### Common Vulnerabilities

**Insufficient Validation**
```yaml
# BAD: No amount checking
Transfer:
  inputs: [amount]
  outputs: [amount]

# GOOD: Explicit validation
Transfer:
  inputs: [amount]
  outputs: [amount]
  validation:
    - sum(inputs) == sum(outputs)
    - all(outputs > 0)
```

*Vulnerability patterns to be expanded*

## Testing Schemas

### Unit Testing

```typescript
import { SchemaTest } from '@rgbjs/testing';

describe('Voting Schema', () => {
  it('should prevent double voting', async () => {
    const test = new SchemaTest(votingSchema);

    const contract = await test.genesis({
      proposal: "Test",
      deadline: 1000
    });

    // First vote succeeds
    await test.transition('Vote', {
      inputs: [{ voting_right: 1 }],
      metadata: { choice: true }
    });

    // Second vote fails
    await expect(
      test.transition('Vote', {
        inputs: [{ vote_cast: true }],
        metadata: { choice: false }
      })
    ).rejects.toThrow('Already voted');
  });
});
```

*Testing framework to be expanded*

## Related Documentation

- [Contractum](./contractum.md)
- [Genesis Contracts](./genesis.md)
- [State Transitions](./state-transitions.md)
- [Strict Types](../../technical-reference/strict-types.md)
- [RGB20 Guide](../rgb20/issuing-assets.md)
- [RGB21 Guide](../rgb21/creating-nfts.md)
