---
sidebar_position: 4
title: State Transitions
description: Understanding RGB state transitions, validation, and how contract state evolves over time
---

# State Transitions

State transitions are the fundamental operations in RGB contracts that modify state ownership and update global data. This guide covers how transitions work, validation rules, and advanced state management patterns.

## What are State Transitions?

A state transition represents a valid change in contract state - transferring ownership, updating global values, or executing contract logic. Each transition:

- **Consumes Inputs**: Spends existing state (sealed UTXOs)
- **Creates Outputs**: Generates new state (new seals)
- **Updates Globals**: Modifies shared contract state
- **Validates Rules**: Proves compliance with schema

Transitions are client-side validated and anchored to Bitcoin without publishing data on-chain.

### Transition Anatomy

```yaml
transition:
  transition_type: Transfer
  contract_id: rgb:2wHxKf...

  inputs:
    - seal: btc:bc1q...:0
      amount: 1000

  outputs:
    - seal: <blinded-utxo>
      amount: 600
    - seal: <blinded-utxo>
      amount: 400

  globals:
    total_supply: 1000000  # Unchanged

  validation_proof:
    schema_check: passed
    amount_conservation: passed
    signature: valid

  bitcoin_anchor:
    txid: abc123...
    block: 800000
```

*Transition structure to be expanded*

## Transition Types

### Transfer Transitions

Move owned state from one party to another:

```typescript
import { RgbContract } from '@rgbjs/core';

const transfer = await contract.createTransition({
  type: 'Transfer',
  inputs: [
    { seal: mySeal, amount: 1000n }
  ],
  outputs: [
    { seal: recipientSeal, amount: 600n },
    { seal: changeSeal, amount: 400n }
  ]
});

await transfer.validate();
await transfer.anchor();
await transfer.finalize();
```

*Transfer transitions to be expanded*

### State Update Transitions

Modify global contract state:

```typescript
const update = await contract.createTransition({
  type: 'UpdateMetadata',
  inputs: [
    { seal: adminRightsSeal, rights: ['admin'] }
  ],
  globals: {
    description: 'Updated contract description',
    website: 'https://newsite.com'
  }
});
```

*State updates to be expanded*

### Issuance Transitions

Create new tokens (if permitted):

```typescript
const issuance = await contract.createTransition({
  type: 'Issue',
  inputs: [
    { seal: issuerSeal, rights: ['issue'] }
  ],
  outputs: [
    { seal: recipientSeal, amount: 100000n },
    { seal: newIssuerSeal, rights: ['issue'] }  // Preserve rights
  ],
  globals: {
    total_supply: current_supply + 100000n
  }
});
```

*Issuance transitions to be expanded*

### Burn Transitions

Permanently destroy tokens:

```typescript
const burn = await contract.createTransition({
  type: 'Burn',
  inputs: [
    { seal: holderSeal, amount: 500n }
  ],
  outputs: [],  // No outputs = burned
  globals: {
    total_supply: current_supply - 500n
  }
});
```

*Burn transitions to be expanded*

## Validation Rules

### Conservation Laws

Amount must be conserved (unless burning/issuing):

```typescript
function validateConservation(inputs, outputs) {
  const inputSum = inputs.reduce((sum, i) => sum + i.amount, 0n);
  const outputSum = outputs.reduce((sum, o) => sum + o.amount, 0n);

  if (inputSum !== outputSum) {
    throw new Error('Amount conservation violated');
  }
}
```

*Conservation validation to be expanded*

### Schema Compliance

Transition must match schema definition:

```yaml
schema_rules:
  Transfer:
    inputs:
      - assetOwner: Amount
    outputs:
      - assetOwner: Amount
    validation:
      - sum(inputs.assetOwner) == sum(outputs.assetOwner)
      - all(outputs.assetOwner > 0)
```

*Schema validation to be expanded*

### Custom Validation

Schemas can define arbitrary validation logic:

```typescript
// In schema definition
validation_script: |
  // Check transfer limits
  if (sum(outputs) > MAX_TRANSFER) {
    require(has_admin_permission);
  }

  // Check recipient whitelist
  for (output in outputs) {
    require(is_whitelisted(output.owner));
  }

  // Time-based restrictions
  if (current_time < unlock_time) {
    reject("Tokens still locked");
  }
```

*Custom validation to be expanded*

## Creating Transitions

### Using RGB CLI

```bash
# Create transfer
rgb transfer \
  --contract-id <contract-id> \
  --from <my-seal> \
  --to <recipient-invoice> \
  --amount 1000 \
  --change-to <change-seal>

# Validate transition
rgb validate-transition transition.rgb

# Anchor to Bitcoin
rgb anchor-transition \
  --transition transition.rgb \
  --bitcoin-tx <tx-hex>
```

*CLI workflow to be expanded*

### Using RGB.js SDK

```typescript
import { RgbWallet, StateTransition } from '@rgbjs/core';

const wallet = new RgbWallet(config);

// Step 1: Build transition
const transition = await wallet.buildTransition({
  contractId: contractId,
  transitionType: 'Transfer',

  // Inputs (what we're spending)
  inputs: await wallet.selectInputs({
    contractId: contractId,
    amount: 1000n
  }),

  // Outputs (where it's going)
  outputs: [
    {
      recipient: recipientInvoice,
      amount: 1000n
    }
  ]
});

// Step 2: Validate
const validationResult = await transition.validate();
if (!validationResult.valid) {
  throw new Error('Invalid transition: ' + validationResult.errors);
}

// Step 3: Sign
await transition.sign(privateKey);

// Step 4: Anchor to Bitcoin
const bitcoinTx = await transition.createAnchorTx();
await wallet.broadcastTx(bitcoinTx);

// Step 5: Finalize
await transition.finalize();
```

*SDK implementation to be expanded*

## State Management

### Global State Updates

Tracking contract-wide state:

```typescript
interface GlobalState {
  // Immutable fields (set at genesis)
  readonly ticker: string;
  readonly precision: number;

  // Mutable fields
  total_supply: bigint;
  total_burned: bigint;
  last_update: number;
}

// Update in transition
const transition = await contract.updateGlobals({
  total_supply: newSupply,
  last_update: Date.now()
});
```

*Global state management to be expanded*

### Owned State Tracking

State attached to specific UTXOs:

```typescript
interface OwnedState {
  seal: Seal;           // Bitcoin UTXO
  amount: bigint;       // Fungible amount
  data?: AttachmentId;  // NFT data
  rights?: Right[];     // Special permissions
}

// Query owned state
const myState = await wallet.getOwnedState(contractId);
console.log('My balance:', myState.reduce((sum, s) => sum + s.amount, 0n));
```

*Owned state management to be expanded*

### State History

Complete state evolution over time:

```typescript
const history = await contract.getStateHistory();

history.forEach(snapshot => {
  console.log(`Block ${snapshot.height}:`);
  console.log(`  Total Supply: ${snapshot.global.total_supply}`);
  console.log(`  Holders: ${snapshot.owned_state.length}`);
});
```

*State history to be expanded*

## Advanced Patterns

### Atomic Multi-Transitions

Multiple contracts in single Bitcoin transaction:

```typescript
const atomicTransitions = await wallet.createAtomicBatch([
  {
    contractId: contract1,
    type: 'Transfer',
    outputs: [{ seal: seal1, amount: 100n }]
  },
  {
    contractId: contract2,
    type: 'Transfer',
    outputs: [{ seal: seal2, amount: 200n }]
  }
]);

// All succeed or all fail together
await atomicTransitions.execute();
```

*Atomic operations to be expanded*

### Conditional Transitions

Transitions with external requirements:

```typescript
const conditional = await contract.createTransition({
  type: 'ConditionalTransfer',
  inputs: [{ seal: mySeal, amount: 1000n }],
  outputs: [{ seal: recipientSeal, amount: 1000n }],

  conditions: {
    // Require Bitcoin block height
    min_height: 850000,

    // Require oracle signature
    oracle_data: {
      price_feed: 'BTC/USD',
      min_price: 50000,
      oracle_pubkey: oraclePubkey
    },

    // Require time lock
    unlock_time: future_timestamp
  }
});
```

*Conditional transitions to be expanded*

### State Aggregation

Combining multiple small states:

```typescript
// Consolidate dust amounts
const consolidate = await wallet.consolidateState({
  contractId: contractId,
  minAmount: 100n,  // Only consolidate amounts > 100
  targetOutputs: 1  // Combine into single UTXO
});

// Before: [50, 75, 25, 100, 30]
// After:  [280]
```

*State aggregation to be expanded*

## Validation Process

### Client-Side Validation

Each party validates transitions independently:

```typescript
class TransitionValidator {
  async validate(transition: Transition): Promise<ValidationResult> {
    // 1. Schema validation
    await this.validateSchema(transition);

    // 2. Input validation
    await this.validateInputs(transition.inputs);

    // 3. State conservation
    await this.validateConservation(transition);

    // 4. Custom rules
    await this.validateCustomRules(transition);

    // 5. Signature verification
    await this.validateSignatures(transition);

    // 6. Bitcoin anchor
    await this.validateAnchor(transition);

    return { valid: true };
  }
}
```

*Validation workflow to be expanded*

### Proof Generation

Creating cryptographic proofs:

```typescript
const proof = await transition.generateProof({
  include: {
    schema_compliance: true,
    amount_conservation: true,
    signature_validity: true,
    merkle_path: true
  }
});

// Proof can be verified independently
const verified = await ProofVerifier.verify(proof);
```

*Proof generation to be expanded*

## Anchoring to Bitcoin

### Creating Anchor Transaction

```typescript
const anchorTx = await transition.createAnchorTransaction({
  feeRate: 5,  // sats/vbyte
  changeAddress: myBitcoinAddress,

  // Optional: Anchor multiple transitions
  additionalTransitions: [transition2, transition3]
});

// Broadcast to Bitcoin network
const txid = await bitcoinClient.sendRawTransaction(anchorTx);
```

*Anchoring process to be expanded*

### Commitment Structure

RGB commitment in OP_RETURN:

```
OP_RETURN
  <protocol_tag>      # 'rgb1'
  <commitment>        # Hash(transition_data)
  <extra_proof>       # Optional: Multi-protocol proof
```

*Commitment format to be expanded*

### Confirmation Handling

```typescript
// Wait for confirmations
await transition.waitForConfirmation({
  required: 6,
  timeout: 3600000  // 1 hour
});

// Handle reorganizations
transition.on('reorg', async (event) => {
  console.warn('Reorg detected at height', event.oldHeight);
  await transition.reanchor();
});
```

*Confirmation management to be expanded*

## Error Handling

### Common Validation Errors

```typescript
try {
  await transition.validate();
} catch (error) {
  if (error instanceof AmountConservationError) {
    console.error('Inputs and outputs don\'t match');
  } else if (error instanceof SchemaValidationError) {
    console.error('Transition violates schema rules');
  } else if (error instanceof InsufficientRightsError) {
    console.error('Missing required permissions');
  }
}
```

*Error handling to be expanded*

### Recovery Strategies

```typescript
// Retry with different parameters
async function transferWithRetry(params) {
  try {
    return await createTransfer(params);
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      // Reduce amount
      params.amount = params.amount * 0.9n;
      return transferWithRetry(params);
    } else if (error instanceof FeeEstimationError) {
      // Increase fee
      params.feeRate *= 1.5;
      return transferWithRetry(params);
    }
    throw error;
  }
}
```

*Recovery patterns to be expanded*

## Performance Optimization

### Batch Processing

```typescript
// Process multiple transitions efficiently
const transitions = await Promise.all(
  invoices.map(invoice =>
    wallet.createTransition({
      recipient: invoice,
      amount: 100n
    })
  )
);

await wallet.anchorBatch(transitions);
```

*Batch optimization to be expanded*

### Caching Validation Results

```typescript
const validationCache = new Map();

async function validateCached(transition) {
  const key = transition.id;
  if (validationCache.has(key)) {
    return validationCache.get(key);
  }

  const result = await transition.validate();
  validationCache.set(key, result);
  return result;
}
```

*Caching strategies to be expanded*

## Related Documentation

- [RGB Schemas](./schemas.md)
- [Contractum Language](./contractum.md)
- [Genesis Contracts](./genesis.md)
- [RGB20 Transfers](../rgb20/transferring-assets.md)
- [RGB21 Transfers](../rgb21/transferring-nfts.md)
- [Client-Side Validation](../../core-concepts/client-side-validation.md)
- [Consignments](../../technical-reference/consignments.md)
