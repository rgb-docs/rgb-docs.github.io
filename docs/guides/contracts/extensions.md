---
sidebar_position: 6
title: Extensions
description: Contract extensions - Adding functionality without state transfers
---

# Contract Extensions

**Extensions** are special RGB operations that modify contract global state or add functionality **without transferring owned state**. They enable features like governance, metadata updates, and parameter adjustments.

## What are Extensions?

While **transitions** move owned state (tokens, NFTs) between seals, **extensions** modify global contract state:

```
Transitions:  Transfer owned state (who owns what)
              Example: Transfer 100 tokens from Alice to Bob

Extensions:   Modify global state (contract-wide data)
              Example: Update token name, adjust inflation rate
```

## Extensions vs Transitions

| Feature | Transitions | Extensions |
|---------|------------|------------|
| **Owned State** | Modified (transfers) | Unchanged |
| **Global State** | Read-only | Modifiable |
| **Seals** | Required (inputs/outputs) | Optional (valencies) |
| **Use Case** | Token transfers, NFT trades | Governance, upgrades |
| **Frequency** | High (every transfer) | Low (rare updates) |

```rust
// Transition: Moves tokens
Transition {
    inputs: vec![alice_seal],    // Alice's 100 tokens
    outputs: vec![bob_seal],      // Bob receives 100 tokens
    // Global state unchanged
}

// Extension: Updates global data
Extension {
    prev_state: contract.global_state,
    new_state: updated_global_state,
    // Owned state unchanged
    // No token movement
}
```

## Common Use Cases

### 1. Metadata Updates

```rust
// Update token name/symbol after issuance
pub fn update_metadata(
    contract: &Contract,
    new_name: String,
    new_description: String,
    authority_seal: Seal,
) -> Result<Extension, Error> {

    Extension::new(
        contract_id: contract.id(),
        extension_type: METADATA_UPDATE,
        global_state: btreemap! {
            NAME => GlobalState::String(new_name),
            DESCRIPTION => GlobalState::String(new_description),
        },
        valencies: vec![authority_seal],  // Requires authority
    )
}

// Example: Rebrand token
let extension = update_metadata(
    &usdt_contract,
    "Tether USD v2".to_string(),
    "Updated stablecoin with new features".to_string(),
    owner_authority_seal
)?;
```

### 2. Governance Decisions

```rust
// DAO proposal execution via extension
pub struct GovernanceExtension {
    pub proposal_id: u64,
    pub decision: Decision,
    pub votes_for: Amount,
    pub votes_against: Amount,
    pub execution_timestamp: Timestamp,
}

impl GovernanceExtension {
    pub fn execute_proposal(
        contract: &mut Contract,
        proposal_id: u64,
    ) -> Result<Extension, Error> {

        let proposal = contract.get_proposal(proposal_id)?;

        // Verify proposal passed
        if !proposal.passed() {
            return Err(Error::ProposalFailed);
        }

        // Create extension with new parameters
        Extension::new(
            contract_id: contract.id(),
            extension_type: GOVERNANCE_EXECUTION,
            global_state: proposal.new_state,
            metadata: proposal.execution_metadata,
        )
    }
}

// Example: Change fee rate
let proposal = Proposal {
    description: "Reduce fee from 1% to 0.5%",
    new_state: btreemap! {
        FEE_RATE => GlobalState::U16(50),  // 0.5%
    },
};
```

### 3. Supply Adjustments

```rust
// Adjust total supply (inflationary/deflationary)
pub fn adjust_supply(
    contract: &Contract,
    adjustment: SupplyAdjustment,
    authority: Seal,
) -> Result<Extension, Error> {

    let current_supply = contract.total_supply()?;

    let new_supply = match adjustment {
        SupplyAdjustment::Inflate(amount) => current_supply + amount,
        SupplyAdjustment::Deflate(amount) => current_supply - amount,
    };

    Extension::new(
        contract_id: contract.id(),
        extension_type: SUPPLY_ADJUSTMENT,
        global_state: btreemap! {
            TOTAL_SUPPLY => GlobalState::Amount(new_supply),
        },
        valencies: vec![authority],
    )
}

// Example: Burn tokens (reduce supply)
let burn_extension = adjust_supply(
    &token_contract,
    SupplyAdjustment::Deflate(Amount::from(1000000)),
    treasury_authority
)?;
```

### 4. Authority Transfer

```rust
// Transfer contract ownership/authority
pub fn transfer_authority(
    contract: &Contract,
    new_authority: Seal,
    current_authority: Seal,
) -> Result<Extension, Error> {

    Extension::new(
        contract_id: contract.id(),
        extension_type: AUTHORITY_TRANSFER,
        global_state: btreemap! {
            AUTHORITY_SEAL => GlobalState::Seal(new_authority),
        },
        valencies: vec![current_authority],  // Must prove current authority
    )
}

// Example: Transfer ownership to multisig
let extension = transfer_authority(
    &contract,
    multisig_seal,
    current_owner_seal
)?;
```

### 5. Fee Parameter Updates

```rust
// Adjust contract fee structure
pub fn update_fees(
    contract: &Contract,
    new_fee_structure: FeeStructure,
    authority: Seal,
) -> Result<Extension, Error> {

    Extension::new(
        contract_id: contract.id(),
        extension_type: FEE_UPDATE,
        global_state: btreemap! {
            TRANSFER_FEE_BPS => GlobalState::U16(new_fee_structure.transfer_bps),
            ROYALTY_FEE_BPS => GlobalState::U16(new_fee_structure.royalty_bps),
            FEE_RECIPIENT => GlobalState::Seal(new_fee_structure.recipient),
        },
        valencies: vec![authority],
    )
}

// Example: Reduce fees to be competitive
let extension = update_fees(
    &nft_contract,
    FeeStructure {
        transfer_bps: 100,   // 1%
        royalty_bps: 500,    // 5%
        recipient: treasury_seal,
    },
    owner_authority
)?;
```

## Extension Structure

```rust
pub struct Extension {
    /// Contract being extended
    pub contract_id: ContractId,

    /// Extension type (defined in schema)
    pub extension_type: u16,

    /// Updated global state
    pub global_state: BTreeMap<GlobalStateType, GlobalState>,

    /// Metadata (optional additional data)
    pub metadata: Metadata,

    /// Valencies (authority/permission seals)
    pub valencies: BTreeSet<Valency>,

    /// Witness (Bitcoin anchor)
    pub witness: Witness,
}
```

### Valencies

**Valencies** are seals that prove authority to execute an extension:

```rust
pub struct Valency {
    /// Valency type (e.g., "owner", "admin", "oracle")
    pub valency_type: u16,

    /// Seal that must be revealed
    pub seal: Seal,
}

// Example: Require owner approval
Extension {
    valencies: vec![
        Valency {
            valency_type: OWNER_VALENCY,
            seal: owner_seal,
        }
    ],
    // ...
}
```

## Schema Definition

Extensions must be defined in the contract schema:

```rust
pub struct Schema {
    // ... (global state, owned state)

    /// Extension definitions
    pub extensions: BTreeMap<ExtensionType, ExtensionSchema>,

    /// Valency definitions
    pub valencies: BTreeMap<ValencyType, ValencySchema>,
}

// Example: Governance extension schema
let schema = Schema {
    extensions: btreemap! {
        METADATA_UPDATE => ExtensionSchema {
            global_state: btreemap! {
                NAME => Occurrences::Once,
                DESCRIPTION => Occurrences::Once,
            },
            required_valencies: vec![OWNER_VALENCY],
        },
        GOVERNANCE_EXECUTION => ExtensionSchema {
            global_state: btreemap! {
                // Any global state can be modified
                _ => Occurrences::NoneOrMore,
            },
            required_valencies: vec![DAO_VALENCY],
        },
    },
    valencies: btreemap! {
        OWNER_VALENCY => ValencySchema {
            description: "Contract owner authority",
        },
        DAO_VALENCY => ValencySchema {
            description: "DAO governance authority",
        },
    },
};
```

## Creating Extensions

### Manual Creation

```rust
use rgb::{Extension, GlobalState};

// Create extension
let extension = Extension::builder()
    .contract_id(contract_id)
    .extension_type(METADATA_UPDATE)
    .global_state(NAME, GlobalState::String("New Name".to_string()))
    .global_state(SYMBOL, GlobalState::String("NEW".to_string()))
    .valency(OWNER_VALENCY, owner_seal)
    .build()?;

// Commit to Bitcoin
let psbt = extension.to_psbt(wallet)?;
```

### Using Contract Interface

```rust
// High-level interface wraps extension creation
impl Contract {
    pub fn update_metadata(
        &mut self,
        name: Option<String>,
        description: Option<String>,
        authority: Seal,
    ) -> Result<Extension, Error> {

        let mut global_state = BTreeMap::new();

        if let Some(name) = name {
            global_state.insert(NAME, GlobalState::String(name));
        }

        if let Some(description) = description {
            global_state.insert(DESCRIPTION, GlobalState::String(description));
        }

        Extension::new(
            contract_id: self.id(),
            extension_type: METADATA_UPDATE,
            global_state,
            valencies: vec![Valency::new(OWNER_VALENCY, authority)],
        )
    }
}

// Usage
let extension = contract.update_metadata(
    Some("Tether USD v2".to_string()),
    Some("Improved stablecoin".to_string()),
    owner_seal
)?;
```

## Validation

Extensions are validated with strict rules:

```rust
impl Extension {
    pub fn validate(&self, schema: &Schema) -> Result<(), ValidationError> {
        // 1. Extension type must be defined in schema
        let ext_schema = schema.extensions.get(&self.extension_type)
            .ok_or(ValidationError::UnknownExtensionType)?;

        // 2. Global state updates must be allowed
        for (state_type, value) in &self.global_state {
            ext_schema.verify_state_allowed(state_type, value)?;
        }

        // 3. Required valencies must be present
        for required_valency in &ext_schema.required_valencies {
            self.verify_valency_present(*required_valency)?;
        }

        // 4. Valency seals must be valid (on Bitcoin blockchain)
        for valency in &self.valencies {
            valency.verify_on_chain()?;
        }

        // 5. Witness (Bitcoin anchor) must be valid
        self.witness.verify()?;

        Ok(())
    }
}
```

## Multi-Signature Extensions

Extensions can require multiple authorities:

```rust
// Extension requiring 2-of-3 multisig
pub fn multisig_extension(
    contract: &Contract,
    new_state: BTreeMap<GlobalStateType, GlobalState>,
    signers: Vec<Seal>,  // Must provide 2 of 3
) -> Result<Extension, Error> {

    // Verify at least 2 signatures
    if signers.len() < 2 {
        return Err(Error::InsufficientSignatures);
    }

    Extension::new(
        contract_id: contract.id(),
        extension_type: MULTISIG_GOVERNANCE,
        global_state: new_state,
        valencies: signers.into_iter()
            .map(|seal| Valency::new(MULTISIG_VALENCY, seal))
            .collect(),
    )
}

// Example: 3 board members, need 2 approvals
let extension = multisig_extension(
    &dao_contract,
    new_parameters,
    vec![
        board_member_1_seal,
        board_member_2_seal,
        // board_member_3 didn't sign (only need 2)
    ]
)?;
```

## Time-Locked Extensions

Extensions can be time-locked using Bitcoin locktime:

```rust
pub fn time_locked_extension(
    contract: &Contract,
    new_state: BTreeMap<GlobalStateType, GlobalState>,
    unlock_time: Timestamp,
    authority: Seal,
) -> Result<Extension, Error> {

    let extension = Extension::new(
        contract_id: contract.id(),
        extension_type: TIME_LOCKED_CHANGE,
        global_state: new_state,
        valencies: vec![Valency::new(TIMELOCK_VALENCY, authority)],
    )?;

    // Add Bitcoin locktime constraint
    let mut psbt = extension.to_psbt()?;
    psbt.unsigned_tx.lock_time = unlock_time.as_u32();

    Ok(extension)
}

// Example: Scheduled fee change in 30 days
let extension = time_locked_extension(
    &contract,
    new_fee_params,
    Timestamp::now() + 30 * 86400,  // 30 days
    owner_seal
)?;
```

## Extension History

Track all extensions for audit trail:

```rust
impl Contract {
    /// Get all extensions applied to contract
    pub fn extension_history(&self) -> Vec<Extension> {
        self.operations()
            .filter_map(|op| match op {
                Operation::Extension(ext) => Some(ext),
                _ => None,
            })
            .collect()
    }

    /// Get extensions by type
    pub fn extensions_by_type(&self, ext_type: u16) -> Vec<Extension> {
        self.extension_history()
            .into_iter()
            .filter(|ext| ext.extension_type == ext_type)
            .collect()
    }

    /// Get latest extension of type
    pub fn latest_extension(&self, ext_type: u16) -> Option<Extension> {
        self.extensions_by_type(ext_type).last()
    }
}

// Example: Audit metadata changes
let metadata_updates = contract.extensions_by_type(METADATA_UPDATE);
for update in metadata_updates {
    println!("Updated at {}: {:?}", update.timestamp(), update.global_state);
}
```

## CLI Usage

```bash
# Create extension
rgb extension create \
  --contract rgb:2Ky4xDT-... \
  --type metadata-update \
  --set name="New Token Name" \
  --set description="Updated description" \
  --authority owner.seal

# Sign extension
rgb extension sign extension.rgb --key owner.key

# Broadcast extension
rgb extension broadcast signed-extension.rgb

# View extension history
rgb extension history --contract rgb:2Ky4xDT-...

# View specific extension
rgb extension inspect --id ext:N6MeEzI-...
```

## Best Practices

### Design Guidelines

✅ **DO:**
- Use extensions for global state changes
- Require proper authority (valencies)
- Document extension types in schema
- Provide clear error messages
- Log extension history

❌ **DON'T:**
- Use extensions for token transfers (use transitions)
- Allow unrestricted extensions (require authority)
- Modify extension types after deployment
- Create complex multi-step extensions

### Security Considerations

```rust
// Always verify authority before creating extensions
pub fn create_extension(
    contract: &Contract,
    ext_type: u16,
    new_state: BTreeMap<GlobalStateType, GlobalState>,
    authority_seal: Seal,
) -> Result<Extension, Error> {

    // 1. Verify caller owns authority seal
    if !verify_seal_ownership(authority_seal, caller_pubkey) {
        return Err(Error::UnauthorizedExtension);
    }

    // 2. Verify extension type is allowed
    let schema = contract.schema();
    if !schema.extensions.contains_key(&ext_type) {
        return Err(Error::InvalidExtensionType);
    }

    // 3. Verify state changes are permitted
    for (state_type, _) in &new_state {
        if !schema.extension_can_modify(ext_type, *state_type) {
            return Err(Error::UnauthorizedStateChange);
        }
    }

    // 4. Create extension
    Extension::new(contract.id(), ext_type, new_state, vec![authority_seal])
}
```

## See Also

- [State Transitions](/guides/contracts/state-transitions) - Owned state transfers
- [Genesis Operations](/guides/contracts/genesis) - Contract creation
- [Contract Schemas](/guides/contracts/schemas) - Defining extension types
- [Global State](/core-concepts/state/global-state) - Global state management
- [Bundles](/guides/contracts/bundles) - Combining operations
