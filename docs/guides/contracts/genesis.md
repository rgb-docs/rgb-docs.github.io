---
sidebar_position: 3
title: Genesis Contracts
description: Creating and deploying RGB contract genesis - the initial state that defines a new RGB smart contract
---

# Genesis Contracts

The genesis is the birth of an RGB contract - it defines the initial state, allocates ownership, and anchors the contract to Bitcoin. This guide covers creating, deploying, and verifying RGB contract genesis with detailed implementation examples from rgb-core and rgb-std.

## What is Genesis?

Genesis is the first operation of an RGB contract, analogous to a genesis block in blockchain systems. It establishes the contract's initial conditions and serves as the immutable root of all future state transitions.

### Genesis Responsibilities

1. **Contract Identity**: Genesis defines the unique contract ID through its commitment hash
2. **Initial Global State**: Sets immutable and mutable contract-wide parameters
3. **Initial Allocations**: Distributes owned state to initial holders via blinded seals
4. **Schema Binding**: Links the contract to its schema for validation rules
5. **Bitcoin Anchoring**: Commits to Bitcoin for timestamping and publication

Once created and published, genesis is immutable and cryptographically binds all contract properties.

## Genesis Structure

### Core Components

Genesis consists of several key components as implemented in rgb-std:

```rust
// From rgb-std GenesisSchema
pub struct GenesisSchema {
    // Metadata types allowed in genesis
    metadata: TinyOrdMap<MetaType, Occurrences>,

    // Global state requirements
    globals: TinyOrdMap<GlobalStateType, Occurrences>,

    // Owned state (assignments) requirements
    assignments: TinyOrdMap<OwnedStateType, Occurrences>,

    // Valencies (contract extension points)
    valencies: TinyOrdMap<ValencyType, Occurrences>,

    // AluVM validation script for genesis
    validator: Option<LibSite>,
}
```

### State Types in Genesis

**Global State** - Contract-wide data visible to all parties:
- Immutable fields (ticker, name, precision)
- Mutable fields (total supply, metadata)
- Stored as key-value pairs in strict types

**Owned State** - Value attached to specific seals (UTXOs):
- Fungible amounts (RGB20 tokens)
- Data attachments (RGB21 NFTs)
- Rights (issuance, admin permissions)

**Metadata** - Optional descriptive information:
- Contract documentation
- Media attachments
- Ricardian contracts

### Genesis Data Structure

```typescript
interface Genesis {
  // Schema reference
  schema_id: SchemaId;

  // Contract identity and timestamp
  contract_id: ContractId;
  timestamp: number;

  // Global state initialization
  globals: {
    [field_name: string]: StateValue;
  };

  // Owned state allocations
  assignments: {
    [state_type: string]: Assignment[];
  };

  // Optional metadata
  metadata: {
    [meta_type: string]: MetaValue;
  };

  // Validation script reference
  script: LibSite;
}

interface Assignment {
  // Blinded UTXO seal
  seal: BlindedSeal;

  // State data (amount, token data, etc.)
  state: StateData;

  // Witness for verification
  witness: WitnessData;
}
```

## Creating Genesis - RGB20 Example

### Step 1: Define Asset Parameters

The NIA (Non-Inflatable Asset) schema implements RGB20:

```rust
// From rgb-schemata/src/nia.rs
pub fn testnet(
    issuer: &str,
    ticker: &str,
    name: &str,
    details: Option<&str>,
    precision: Precision,
    allocations: impl IntoIterator<Item = (Method, impl TxOutpoint, Amount)>,
) -> Result<ValidContract, InvalidRString>
```

Example parameters:

```typescript
const assetSpec = {
  ticker: 'USDT',      // 1-8 ASCII characters
  name: 'USD Tether',  // Asset name
  precision: 8,        // Decimal places (0-18)
  details: 'Stablecoin pegged to USD',  // Optional description
};

const terms = {
  text: ricardianContract,  // Legal terms
  media: attachmentHash,    // Optional contract document
};

const issuedSupply = 1_000_000_00000000n;  // 1 million with 8 decimals
```

### Step 2: Create Blinded Seals

Seals hide the actual UTXO while allowing verification:

```typescript
import { BlindSeal, CloseMethod } from '@rgbjs/core';

// Create blinded seal for recipient
const recipientSeal = BlindSeal.with_blinding(
  CloseMethod.TapretFirst,  // Taproot commitment method
  txid,                     // Bitcoin transaction ID
  vout,                     // Output index
  blindingSecret            // Random blinding factor
);

// For multiple allocations
const allocations = [
  {
    method: 'TapretFirst',
    beneficiary: seal1,
    amount: 600_000_00000000n
  },
  {
    method: 'TapretFirst',
    beneficiary: seal2,
    amount: 400_000_00000000n
  }
];
```

### Step 3: Build Genesis with Schema

```typescript
// From rgb-schemata examples
import { NonInflatableAsset } from 'rgb-schemata';

const contract = NonInflatableAsset.testnet(
  'ssi:anonymous',           // Issuer identity
  'USDT',                    // Ticker
  'USD Tether',              // Name
  'Stablecoin pegged to USD', // Details
  Precision.CentiMicro,      // 8 decimal places
  allocations                // Initial distribution
);

const contractId = contract.contract_id();
console.log('Contract ID:', contractId.toString());
```

### Step 4: Genesis Global State

The NIA schema requires specific global state fields:

```rust
// From rgb-schemata/src/nia.rs
global_types: tiny_bmap! {
    GS_NOMINAL => GlobalStateSchema::once(types.get("RGBContract.AssetSpec")),
    GS_TERMS => GlobalStateSchema::once(types.get("RGBContract.ContractTerms")),
    GS_ISSUED_SUPPLY => GlobalStateSchema::once(types.get("RGBContract.Amount")),
}
```

Implementation:

```typescript
const builder = ContractBuilder
  .new(schema, issuer)

  // Required: Asset specification
  .add_global_state("spec", {
    ticker: "USDT",
    name: "USD Tether",
    precision: 8,
    details: null
  })

  // Required: Contract terms
  .add_global_state("terms", {
    text: ricardianContract,
    media: null
  })

  // Required: Issued supply
  .add_global_state("issuedSupply", 1_000_000_00000000n);
```

### Step 5: Add Owned State Assignments

```rust
// From rgb-schemata/src/nia.rs
owned_types: tiny_bmap! {
    OS_ASSET => OwnedStateSchema::Fungible(FungibleType::Unsigned64Bit),
}

genesis: GenesisSchema {
    assignments: tiny_bmap! {
        OS_ASSET => Occurrences::OnceOrMore,
    },
    // ...
}
```

Adding fungible allocations:

```typescript
// Deterministic allocation with specific blinding factor
builder.add_fungible_state_det(
  "assetOwner",              // State type name
  seal,                      // Blinded seal
  1_000_000_00000000n,       // Amount
  blindingFactor             // Specific blinding (optional)
);

// Or use random blinding
builder.add_fungible_state(
  "assetOwner",
  seal,
  1_000_000_00000000n
);
```

### Step 6: Issue Contract

```typescript
// Issue with current timestamp
const contract = builder.issue_contract();

// Or deterministic issue with specific timestamp
const contract = builder.issue_contract_det(timestamp);

// Contract is now ready for validation and anchoring
console.log('Contract issued:', contract.contract_id());
```

## Creating Genesis - RGB21 Example

### NFT Genesis Structure

The UDA (Unique Digital Asset) schema implements RGB21:

```rust
// From rgb-schemata/src/uda.rs
global_types: tiny_bmap! {
    GS_NOMINAL => GlobalStateSchema::once(types.get("RGBContract.AssetSpec")),
    GS_TERMS => GlobalStateSchema::once(types.get("RGBContract.ContractTerms")),
    GS_TOKENS => GlobalStateSchema::once(types.get("RGB21.TokenData")),
    GS_ATTACH => GlobalStateSchema::once(types.get("RGB21.AttachmentType")),
}

owned_types: tiny_bmap! {
    OS_ASSET => OwnedStateSchema::Structured(types.get("RGBContract.Allocation")),
}
```

### Building RGB21 Genesis

```typescript
import { UniqueDigitalAsset } from 'rgb-schemata';

// Define token data
const tokenData = {
  index: 1n,                    // Token ID
  ticker: null,                 // Optional ticker
  name: 'Genesis NFT',          // Token name
  details: 'First NFT',         // Description
  preview: {                    // Embedded preview
    type: 'image/png',
    data: previewImageBytes
  },
  media: attachmentHash,        // Full media hash
  attachments: [],              // Additional attachments
  reserves: null                // Future use
};

// Create allocation (NFTs use structured state)
const allocation = {
  index: 1n,      // Same as token index
  fraction: 1n    // Always 1 for unique assets
};

// Build genesis
const contract = stock.contract_builder(
  'ssi:anonymous',
  UniqueDigitalAsset.schema().schema_id(),
  'RGB21Unique'
)
  .add_global_state('spec', {
    ticker: 'NFT',
    name: 'My NFT Collection',
    precision: 0  // Indivisible
  })

  .add_global_state('terms', contractTerms)

  .add_global_state('tokens', tokenData)

  .add_data('assetOwner', beneficiarySeal, allocation)

  .issue_contract();
```

## Genesis Validation

### AluVM Validation Scripts

Genesis validation is performed by AluVM scripts embedded in the schema:

```rust
// From rgb-schemata/src/nia.rs - NIA Genesis Validator
pub(crate) fn nia_lib() -> Lib {
    let code = rgbasm! {
        // SUBROUTINE Genesis validation
        // Checking pedersen commitments against reported amount
        put     a8[0],ERRNO_ISSUED_MISMATCH;
        put     a8[1],0;
        put     a16[0],0;

        // Read global state into s16[0]
        ldg     GS_ISSUED_SUPPLY,a8[1],s16[0];

        // Extract 64 bits from the beginning of s16[0] into a64[0]
        extr    s16[0],a64[0],a16[0];

        // Verify sum of pedersen commitments for assignments against a64[0] value
        pcas    OS_ASSET;
        test;
        ret;
    };
    Lib::assemble::<Instr<RgbIsa<MemContract>>>(&code)
        .expect("wrong non-inflatable asset script")
}
```

### What Genesis Validation Checks

1. **Schema Compliance**: All required fields present
2. **Type Validity**: Values match declared types
3. **Pedersen Commitment**: Blinded amounts sum correctly
4. **Occurrence Rules**: Field occurrences match schema (Once, OnceOrMore, etc.)
5. **Custom Logic**: Schema-specific validation rules

### Validation Example

```typescript
// Genesis validation happens automatically during issue
try {
  const contract = builder.issue_contract();
  console.log('✓ Genesis validation passed');
  console.log('Contract ID:', contract.contract_id());
} catch (error) {
  if (error.code === 'ERRNO_ISSUED_MISMATCH') {
    console.error('✗ Issued supply mismatch with commitments');
  } else if (error.code === 'SCHEMA_VIOLATION') {
    console.error('✗ Schema validation failed:', error.details);
  } else {
    console.error('✗ Genesis validation failed:', error);
  }
}
```

## Bitcoin Anchoring

### Commitment Process

RGB uses deterministic Bitcoin commitments (DBC) to anchor contracts:

```typescript
// 1. Create Bitcoin transaction
const bitcoinTx = createBitcoinTransaction({
  inputs: [myUtxo],
  outputs: [
    { address: changeAddress, amount: changeAmount }
  ]
});

// 2. Add RGB commitment
const commitment = contract.create_commitment();
const committedTx = bitcoinTx.add_opreturn_commitment(commitment);

// 3. Sign and broadcast
const signedTx = wallet.sign(committedTx);
const txid = await broadcast(signedTx);

console.log('Genesis anchored in:', txid);
```

### Commitment Structure

```
Bitcoin Transaction Output:
  OP_RETURN
    <protocol_tag>        # 'rgb' or protocol identifier
    <commitment_hash>     # SHA256 of contract data
    <extra_proof>         # Optional: multi-protocol proof
```

### Taproot Commitment (Preferred Method)

Modern RGB uses Taproot for better privacy:

```typescript
// TapretFirst - First taproot output
const seal = BlindSeal.with_blinding(
  CloseMethod.TapretFirst,
  txid,
  0,  // First taproot output
  blindingSecret
);

// The commitment is embedded in the taproot script tree
// Much more efficient and private than OP_RETURN
```

### PSBT Construction

For hardware wallets and multi-sig:

```typescript
import { Psbt } from 'bitcoinjs-lib';

// 1. Create PSBT with RGB commitment
const psbt = new Psbt({ network });

psbt.addInput({
  hash: utxo.txid,
  index: utxo.vout,
  witnessUtxo: {
    script: utxo.scriptPubKey,
    value: utxo.value
  }
});

// 2. Add output with RGB commitment
psbt.addOutput({
  script: createCommitmentScript(commitment),
  value: 0  // OP_RETURN has zero value
});

// 3. Sign
psbt.signInput(0, keyPair);
psbt.finalizeAllInputs();

const tx = psbt.extractTransaction();
```

## Verification Process

### Client-Side Validation

Each party independently validates the genesis:

```typescript
class GenesisValidator {
  async validate(genesis: Genesis): Promise<ValidationResult> {
    const errors = [];

    // 1. Schema validation
    const schemaCheck = await this.validateSchema(genesis);
    if (!schemaCheck.valid) {
      errors.push(...schemaCheck.errors);
    }

    // 2. Global state validation
    const globalCheck = await this.validateGlobalState(genesis);
    if (!globalCheck.valid) {
      errors.push(...globalCheck.errors);
    }

    // 3. Owned state validation
    const ownedCheck = await this.validateOwnedState(genesis);
    if (!ownedCheck.valid) {
      errors.push(...ownedCheck.errors);
    }

    // 4. Run AluVM validator
    const scriptCheck = await this.runValidator(genesis);
    if (!scriptCheck.valid) {
      errors.push(...scriptCheck.errors);
    }

    // 5. Verify Bitcoin anchor
    const anchorCheck = await this.validateAnchor(genesis);
    if (!anchorCheck.valid) {
      errors.push(...anchorCheck.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      contractId: genesis.contract_id()
    };
  }
}
```

### Pedersen Commitment Verification

For fungible assets, amounts are hidden using Pedersen commitments:

```rust
// From NIA validation script
// pcas (Pedersen Commitment Asset Sum)
// Verifies: sum(commitment_i) == commitment(declared_amount)

pcas    OS_ASSET;    // Validate asset commitments
test;                // Fail if invalid
```

This ensures:
- Total supply matches allocated amounts
- Individual amounts stay private
- No inflation possible

## Real-World Examples

### Example 1: Simple Token Genesis

```typescript
import { NonInflatableAsset } from 'rgb-schemata';

// Create 1 million tokens
const contract = NonInflatableAsset.testnet(
  'ssi:anonymous',
  'TEST',
  'Test Token',
  null,  // No details
  8,     // 8 decimals
  [
    ['TapretFirst', beneficiaryUtxo, 1_000_000_00000000n]
  ]
);

// Save contract
contract.save_file('test-token.rgb');
contract.save_armored('test-token.rgba');  // ASCII-armored version
```

### Example 2: Multi-Allocation Genesis

```typescript
const allocations = [
  // Team allocation - 40%
  ['TapretFirst', teamSeal, 400_000_00000000n],

  // Community sale - 30%
  ['TapretFirst', saleSeal, 300_000_00000000n],

  // Reserve - 20%
  ['TapretFirst', reserveSeal, 200_000_00000000n],

  // Liquidity - 10%
  ['TapretFirst', liquiditySeal, 100_000_00000000n]
];

const contract = NonInflatableAsset.testnet(
  'ssi:project_org',
  'PROJ',
  'Project Token',
  'Governance token for Project DAO',
  8,
  allocations
);
```

### Example 3: Deterministic Genesis

For reproducible contract IDs:

```typescript
import { ContractBuilder, BlindingFactor } from 'rgb-std';

const builder = ContractBuilder.deterministic(
  Identity.default(),
  schema,
  iface,
  impl,
  types,
  scripts
)
  .add_global_state('spec', spec)
  .add_global_state('terms', terms)
  .add_global_state('issuedSupply', supply)
  .add_fungible_state_det(
    'assetOwner',
    seal,
    amount,
    BlindingFactor.from_hex('a3401bcc...')  // Fixed blinding
  );

// Always produces same contract ID with same inputs
const contract = builder.issue_contract_det(timestamp);
```

## Error Handling

### Common Genesis Errors

```typescript
// Error codes from rgb-schemata
const ERRNO_ISSUED_MISMATCH = 1;  // Supply ≠ sum(allocations)
const ERRNO_NON_EQUAL_IN_OUT = 2; // Conservation violation
const ERRNO_NON_FRACTIONAL = 3;   // Fractional NFT (invalid)
```

### Handling Validation Failures

```typescript
try {
  const contract = builder.issue_contract();
} catch (error) {
  switch (error.errno) {
    case ERRNO_ISSUED_MISMATCH:
      console.error('Total supply does not match allocations');
      console.error('Declared:', declaredSupply);
      console.error('Allocated:', sum(allocations));
      break;

    case 'MISSING_REQUIRED_FIELD':
      console.error('Required field missing:', error.field);
      console.error('Schema requires:', schema.genesis.globals);
      break;

    case 'TYPE_MISMATCH':
      console.error('Type validation failed:', error.details);
      break;

    default:
      console.error('Genesis validation failed:', error);
  }
}
```

### Recovery Strategies

```typescript
async function createGenesisWithRetry(params) {
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      // Validate allocations sum to total supply
      const totalAllocated = params.allocations.reduce(
        (sum, a) => sum + a.amount, 0n
      );

      if (totalAllocated !== params.supply) {
        throw new Error(`Supply mismatch: ${params.supply} vs ${totalAllocated}`);
      }

      // Create genesis
      const contract = await NonInflatableAsset.testnet(
        params.issuer,
        params.ticker,
        params.name,
        params.details,
        params.precision,
        params.allocations
      );

      return contract;

    } catch (error) {
      attempt++;
      console.warn(`Genesis attempt ${attempt} failed:`, error);

      if (attempt >= maxAttempts) {
        throw error;
      }

      // Adjust parameters based on error
      if (error.errno === ERRNO_ISSUED_MISMATCH) {
        // Recalculate allocations
        params = adjustAllocations(params);
      }
    }
  }
}
```

## Testing Genesis

### Local Testing with Regtest

```bash
# Start Bitcoin regtest
bitcoind -regtest -daemon

# Create test wallet
bitcoin-cli -regtest createwallet "rgb-test"

# Generate blocks to get coins
bitcoin-cli -regtest -generate 101

# Create UTXO for RGB anchor
ADDR=$(bitcoin-cli -regtest getnewaddress)
UTXO=$(bitcoin-cli -regtest sendtoaddress $ADDR 0.001)

# Mine block
bitcoin-cli -regtest -generate 1
```

### Genesis Testing Script

```typescript
import { NonInflatableAsset } from 'rgb-schemata';
import { BitcoinRegtest } from 'bitcoin-regtest';

async function testGenesis() {
  const regtest = new BitcoinRegtest();
  await regtest.start();

  // Get test UTXO
  const utxo = await regtest.getFreshUtxo();

  // Create test contract
  const contract = NonInflatableAsset.testnet(
    'ssi:test',
    'TEST',
    'Test Token',
    null,
    8,
    [['TapretFirst', utxo, 1000_00000000n]]
  );

  console.log('Genesis created:', contract.contract_id());

  // Validate
  const validator = new GenesisValidator();
  const result = await validator.validate(contract);

  if (result.valid) {
    console.log('✓ Genesis validation passed');
  } else {
    console.error('✗ Genesis validation failed:');
    result.errors.forEach(e => console.error('  -', e));
  }

  await regtest.stop();
}
```

### Unit Testing

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Genesis Creation', () => {
  it('should create valid RGB20 genesis', () => {
    const contract = NonInflatableAsset.testnet(
      'ssi:test',
      'TEST',
      'Test',
      null,
      8,
      [['TapretFirst', testUtxo, 1000n]]
    );

    expect(contract.contract_id()).toBeDefined();
  });

  it('should reject mismatched supply', () => {
    expect(() => {
      // This should fail validation
      builder
        .add_global_state('issuedSupply', 1000n)
        .add_fungible_state('assetOwner', seal, 900n)  // Wrong!
        .issue_contract();
    }).toThrow(ERRNO_ISSUED_MISMATCH);
  });

  it('should produce deterministic contract ID', () => {
    const contract1 = createDeterministicGenesis(params);
    const contract2 = createDeterministicGenesis(params);

    expect(contract1.contract_id()).toEqual(contract2.contract_id());
  });
});
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Schema validated and tested
- [ ] All required global state fields populated
- [ ] Allocations sum to total supply (RGB20)
- [ ] Blinded seals generated securely
- [ ] Ricardian contract reviewed
- [ ] Genesis validated locally
- [ ] Testnet deployment successful
- [ ] Bitcoin anchor UTXO prepared
- [ ] Backup of genesis data secured
- [ ] Recovery procedures documented

### Mainnet Deployment

```typescript
import { NonInflatableAsset } from 'rgb-schemata';
import { BitcoinMainnet } from '@rgbjs/bitcoin';

async function deployMainnet() {
  // 1. Prepare secure randomness for blinding
  const blindingSecret = crypto.randomBytes(32);

  // 2. Get fresh Bitcoin UTXO
  const bitcoinWallet = new BitcoinMainnet();
  const anchorUtxo = await bitcoinWallet.getUtxo({
    minValue: 10000,  // 10k sats
    confirmations: 6
  });

  // 3. Create production genesis
  const contract = NonInflatableAsset.testnet(  // Note: method name is testnet but works for mainnet
    ISSUER_IDENTITY,
    TICKER,
    NAME,
    DESCRIPTION,
    PRECISION,
    [
      ['TapretFirst', seal1, allocation1],
      ['TapretFirst', seal2, allocation2],
      // ... more allocations
    ]
  );

  // 4. Save multiple backups
  await contract.save_file(`${TICKER}-genesis.rgb`);
  await contract.save_armored(`${TICKER}-genesis.rgba`);
  await backupToSecureStorage(contract);

  // 5. Publish
  const consignment = await contract.create_consignment();
  await publishConsignment(consignment);

  console.log('✓ Contract deployed:', contract.contract_id());

  return contract;
}
```

### Security Considerations

1. **Blinding Factor Security**: Use cryptographically secure random for blinding
2. **Private Key Management**: Secure keys controlling anchor UTXOs
3. **Genesis Backup**: Store multiple encrypted backups
4. **Consignment Publication**: Use redundant publication channels
5. **Timestamp Verification**: Confirm Bitcoin anchor is confirmed

## Advanced Patterns

### Multi-Contract Genesis (Batch Issuance)

```typescript
// Issue multiple contracts in parallel
const contracts = await Promise.all([
  createTokenGenesis('USDT', 'USD Tether', ...),
  createTokenGenesis('USDC', 'USD Coin', ...),
  createTokenGenesis('DAI', 'Dai Stablecoin', ...)
]);

// All can share same Bitcoin anchor
const sharedAnchor = await createAnchorTx();
await Promise.all(
  contracts.map(c => c.anchor(sharedAnchor))
);
```

### Genesis with Future Issuance Rights

```typescript
// Reserve issuance rights for future token creation
const allocations = [
  // Initial distribution
  ['TapretFirst', publicSaleSeal, 600_000_00000000n],

  // Issuer retains issuance rights
  // (Implementation depends on schema supporting secondary issuance)
];
```

### Time-Locked Genesis

```typescript
// Genesis that activates at specific block height
const genesis = builder
  .add_global_state('activationHeight', 850000)
  .add_validation_rule(
    'current_height() >= global.activationHeight'
  )
  .issue_contract();
```

## Related Documentation

- [RGB Schemas](./schemas.md) - Understanding contract schemas
- [State Transitions](./state-transitions.md) - How to modify contract state
- [Contractum Language](./contractum.md) - High-level contract definition
- [RGB20 Token Creation](../rgb20/issuing-assets.md) - Fungible token guide
- [RGB21 NFT Creation](../rgb21/creating-nfts.md) - NFT creation guide
- [Bitcoin Integration](../../core-concepts/bitcoin-utxos.md) - UTXO and anchoring
- [Client-Side Validation](../../core-concepts/client-side-validation.md) - Validation principles
- [Consignments](../../technical-reference/consignments.md) - State transfer format
