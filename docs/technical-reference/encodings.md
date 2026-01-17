---
sidebar_position: 9
title: Encoding Formats
description: RGB encoding formats - BAID64, Base58, Bech32, consensus encoding
---

# RGB Encoding Formats

RGB uses multiple encoding formats for different purposes: human-readable identifiers, consensus-critical serialization, and Bitcoin compatibility.

## BAID64: Base Abstract Identity Encoding

**BAID64** (Base Abstract IDentifier) is RGB's primary encoding format for identifiers. It provides compact, URL-safe, human-readable representation of 256-bit hashes.

### Format Specification

```
BAID64 alphabet: 0-9, A-Z, a-z, plus '-' and '_'
Total characters: 64 (2^6 bits per character)
Checksum: Built-in error detection
Case-sensitive: Yes
```

### Structure

```
rgb:2Ky4xDT-VyLmtp9Y-XmKinHXG-utaq8UBu-qjfqDiUM-8bHNdBb
│   │                                                  │
│   └─ Base data (256 bits / 6 = ~43 chars)          └─ Checksum
└─ Prefix (indicates type)
```

### Components Encoded with BAID64

#### Contract IDs

```rust
// Contract ID encoding
let contract_id = ContractId::from_str(
    "rgb:2Ky4xDT-VyLmtp9Y-XmKinHXG-utaq8UBu-qjfqDiUM-8bHNdBb"
)?;

// Deterministic: Same contract data → Same ID
```

**Structure:**
- **Prefix**: `rgb:` (indicates RGB contract)
- **Data**: 256-bit hash of genesis commitment
- **Checksum**: Last segment provides error detection
- **Hyphens**: Visual grouping (7 segments)

#### Schema IDs

```rust
// Schema identifier
let schema_id = SchemaId::from_str(
    "sch:JK3fYxN-8mPqrz2A-BwLnKvHG-rtbp9Vc-rkghEjVN-9cIoFcC"
)?;
```

**Used for:**
- RGB20 schema: Non-Inflatable Asset
- RGB21 schema: Unique Digital Asset
- RGB25 schema: Collectible Fungible Asset
- Custom schemas

#### Interface IDs

```rust
// Interface identifier (RGB20, RGB21, etc.)
let iface_id = InterfaceId::from_str(
    "ifc:M5LdRyH-2bXsnt4P-CxQoLzIG-subq0Wd-slhiGkWO-0dJpGdD"
)?;
```

#### Operation IDs

```rust
// Transition/Extension operation ID
let op_id = OpId::from_str(
    "op:N6MeEzI-3cYtuv5Q-DyRpM0JH-tvcr1Xe-tmijHlXP-1eKqHeE"
)?;
```

### Encoding Algorithm

```rust
pub fn encode_baid64(data: &[u8; 32], prefix: &str) -> String {
    // 1. SHA256 double-hash for checksum
    let checksum = Sha256::digest(&Sha256::digest(data));

    // 2. Combine data + checksum
    let mut combined = Vec::from(data.as_slice());
    combined.extend_from_slice(&checksum[..4]);

    // 3. Encode in base64 alphabet
    let encoded = base64_custom_encode(&combined);

    // 4. Add visual separators every 7 chars
    let formatted = insert_hyphens(&encoded, 7);

    // 5. Add prefix
    format!("{}:{}", prefix, formatted)
}
```

### Advantages

**Compared to Hex:**
- **43 characters** vs 64 characters (32% shorter)
- URL-safe (no special encoding needed)
- Built-in checksums
- Visual grouping

**Compared to Base58:**
- Fixed length (easier validation)
- More compact
- Faster encoding/decoding
- No ambiguous characters (0/O, 1/l/I)

### Decoding

```rust
// Parse and validate BAID64
pub fn decode_baid64(encoded: &str) -> Result<[u8; 32], Error> {
    // 1. Split prefix
    let (prefix, data) = encoded.split_once(':')
        .ok_or(Error::InvalidFormat)?;

    // 2. Remove hyphens
    let clean = data.replace('-', "");

    // 3. Decode base64
    let bytes = base64_custom_decode(&clean)?;

    // 4. Verify checksum
    let (data, checksum) = bytes.split_at(32);
    verify_checksum(data, checksum)?;

    // 5. Return 32-byte hash
    Ok(data.try_into()?)
}
```

### Error Detection

BAID64 checksums detect:
- **Single character errors**: 99.6% detection
- **Transpositions**: 99.9% detection
- **Substitutions**: 100% detection

```rust
// Invalid BAID64 examples
"rgb:2Ky4xDT-..."  // ❌ Checksum mismatch
"rgb:2Ky4xDU-..."  // ❌ Character substitution detected
"rgb:2yK4xDT-..."  // ❌ Transposition detected
```

## Consensus Encoding

**Consensus encoding** is RGB's deterministic serialization format used for creating cryptographic commitments. It ensures identical data produces identical byte sequences across all implementations.

### Requirements

1. **Deterministic**: Same input → Same bytes, always
2. **Canonical**: Only one valid encoding per data structure
3. **Efficient**: Minimal overhead
4. **Verifiable**: Can be independently reimplemented

### Core Principles

```rust
// Consensus encoding principles
trait ConsensusEncode {
    fn consensus_encode(&self, writer: &mut impl Write) -> Result<usize>;
}

// All types must encode deterministically
impl ConsensusEncode for u64 {
    fn consensus_encode(&self, writer: &mut impl Write) -> Result<usize> {
        // Always little-endian
        writer.write_all(&self.to_le_bytes())?;
        Ok(8)
    }
}
```

### Data Type Encoding

#### Integers

```rust
// Fixed-size integers: Little-endian
u8:  [byte]
u16: [lo, hi]
u32: [b0, b1, b2, b3]
u64: [b0, b1, b2, b3, b4, b5, b6, b7]

// Example: 0x12345678 encodes as [0x78, 0x56, 0x34, 0x12]
```

#### Variable-Length Integers (VarInt)

```rust
// Compact integer encoding
0..0xFC          => [value]
0xFD..0xFFFF     => [0xFD, lo, hi]
0x10000..        => [0xFE, b0, b1, b2, b3]

// Example encodings
0x42       → [0x42]
0x1234     → [0xFD, 0x34, 0x12]
0x12345678 → [0xFE, 0x78, 0x56, 0x34, 0x12]
```

#### Byte Arrays

```rust
// Length-prefixed encoding
fn encode_bytes(data: &[u8]) -> Vec<u8> {
    let mut encoded = Vec::new();
    encoded.extend(encode_varint(data.len()));
    encoded.extend_from_slice(data);
    encoded
}

// Example: [0xAA, 0xBB, 0xCC]
// Encodes as: [0x03, 0xAA, 0xBB, 0xCC]
//              └─len  └─data
```

#### Collections

```rust
// Sets: Sorted order (deterministic)
fn encode_set<T: Ord + ConsensusEncode>(set: &BTreeSet<T>) -> Vec<u8> {
    let mut encoded = encode_varint(set.len());
    for item in set.iter() {  // BTreeSet guarantees sorted order
        item.consensus_encode(&mut encoded)?;
    }
    encoded
}

// Maps: Sorted by key
fn encode_map<K: Ord, V>(map: &BTreeMap<K, V>) -> Vec<u8> {
    let mut encoded = encode_varint(map.len());
    for (key, value) in map.iter() {  // Sorted iteration
        key.consensus_encode(&mut encoded)?;
        value.consensus_encode(&mut encoded)?;
    }
    encoded
}
```

### RGB-Specific Encoding

#### State Commitments

```rust
// Unified state encoding (RGB v0.12)
pub struct StateCommitment {
    pub data: FieldElement,  // 32 bytes
}

impl ConsensusEncode for StateCommitment {
    fn consensus_encode(&self, writer: &mut impl Write) -> Result<usize> {
        // Single field element (256 bits)
        writer.write_all(&self.data.to_bytes())?;
        Ok(32)
    }
}
```

#### Operation Commitments

```rust
// Transition commitment
pub struct Transition {
    pub contract_id: ContractId,
    pub transition_type: u16,
    pub metadata: Metadata,
    pub globals: BTreeMap<GlobalStateType, GlobalState>,
    pub assignments: BTreeMap<AssignmentType, Vec<Assignment>>,
    pub valencies: BTreeSet<Valency>,
}

// Encoding order (deterministic)
impl ConsensusEncode for Transition {
    fn consensus_encode(&self, w: &mut impl Write) -> Result<usize> {
        let mut len = 0;
        len += self.contract_id.consensus_encode(w)?;
        len += self.transition_type.consensus_encode(w)?;
        len += self.metadata.consensus_encode(w)?;
        len += self.globals.consensus_encode(w)?;      // Sorted by key
        len += self.assignments.consensus_encode(w)?;  // Sorted by key
        len += self.valencies.consensus_encode(w)?;    // Sorted set
        Ok(len)
    }
}
```

### Commitment Hashing

```rust
// Create commitment hash from consensus encoding
pub fn commitment_hash<T: ConsensusEncode>(data: &T) -> [u8; 32] {
    let mut encoded = Vec::new();
    data.consensus_encode(&mut encoded).unwrap();

    // SHA256 of consensus-encoded data
    Sha256::digest(&encoded).into()
}

// Example: Contract ID
let contract_id = commitment_hash(&genesis);
```

### Strict Encoding vs Consensus Encoding

| Feature | Strict Encoding | Consensus Encoding |
|---------|----------------|-------------------|
| **Purpose** | General serialization | Cryptographic commitments |
| **Types** | Rich type system | Minimal types |
| **Metadata** | Type information included | No metadata |
| **Size** | Larger (includes types) | Minimal (data only) |
| **Use case** | Storage, transmission | Hashing, validation |

```rust
// Strict encoding: Includes type tags
[0x01, 0x42]  // Type tag + data

// Consensus encoding: Data only
[0x42]        // Just the data
```

## Commitment Encoding

**Commitment encoding** extends consensus encoding for Merkle tree construction and multi-protocol commitments.

### Tagged Hashing

RGB uses tagged SHA256 hashing (BIP-340 style):

```rust
pub fn tagged_hash(tag: &str, data: &[u8]) -> [u8; 32] {
    // Tag hash computed once
    let tag_hash = Sha256::digest(tag.as_bytes());

    // Double-tagged SHA256
    let mut engine = Sha256::new();
    engine.update(&tag_hash);
    engine.update(&tag_hash);
    engine.update(data);
    engine.finalize().into()
}

// Example tags
tagged_hash("rgb:contract", &contract_data)
tagged_hash("rgb:transition", &transition_data)
tagged_hash("rgb:bundle", &bundle_data)
```

**Purpose**: Domain separation (prevents cross-protocol attacks)

### Merkle Tree Encoding

```rust
// Merkle branch node
pub fn merkle_branch(left: [u8; 32], right: [u8; 32]) -> [u8; 32] {
    // Nodes are lexicographically sorted
    let (first, second) = if left < right {
        (left, right)
    } else {
        (right, left)
    };

    // Tagged hash of sorted pair
    let mut data = Vec::with_capacity(64);
    data.extend_from_slice(&first);
    data.extend_from_slice(&second);

    tagged_hash("rgb:merkle:branch", &data)
}
```

### Multi-Protocol Commitment (MPC) Encoding

```rust
// MPC tree construction
pub struct MpcCommitment {
    pub protocol: u16,           // Protocol ID
    pub message: [u8; 32],       // Protocol-specific commitment
}

impl MpcCommitment {
    pub fn commitment(&self) -> [u8; 32] {
        let mut data = Vec::new();
        data.extend_from_slice(&self.protocol.to_le_bytes());
        data.extend_from_slice(&self.message);

        tagged_hash("rgb:mpc:commitment", &data)
    }
}

// Combine multiple protocols
pub fn mpc_root(commitments: &BTreeMap<u16, [u8; 32]>) -> [u8; 32] {
    // Build Merkle tree from sorted protocol IDs
    let leaves: Vec<_> = commitments
        .iter()
        .map(|(proto, msg)| {
            MpcCommitment {
                protocol: *proto,
                message: *msg,
            }.commitment()
        })
        .collect();

    merkle_root(&leaves)
}
```

### Deterministic Bitcoin Commitment (DBC) Encoding

```rust
// DBC output encoding
pub struct DbcOutput {
    pub method: Method,          // Tapret or Opret
    pub commitment: [u8; 32],    // MPC root
}

// Tapret encoding
impl DbcOutput {
    pub fn tapret_tweak(&self) -> [u8; 32] {
        let mut data = Vec::new();
        data.push(0x01);  // Tapret tag
        data.extend_from_slice(&self.commitment);

        tagged_hash("TapTweak", &data)
    }
}

// Opret encoding
impl DbcOutput {
    pub fn opret_script(&self) -> Script {
        Script::builder()
            .push_opcode(OP_RETURN)
            .push_slice(&self.commitment)
            .into_script()
    }
}
```

## Base58 Encoding

While RGB primarily uses BAID64, **Base58** is used for Bitcoin address compatibility.

### Bitcoin Address Encoding

```rust
// P2PKH address (legacy)
pub fn encode_p2pkh(pubkey_hash: &[u8; 20]) -> String {
    let mut data = vec![0x00];  // Mainnet prefix
    data.extend_from_slice(pubkey_hash);

    // Add checksum
    let checksum = double_sha256(&data);
    data.extend_from_slice(&checksum[..4]);

    bs58::encode(data).into_string()
}

// Example: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
```

### Base58 Alphabet

```
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
```

**Excluded characters**: 0 (zero), O (capital o), I (capital i), l (lowercase L)

**Reason**: Prevent visual confusion in handwritten/typed addresses

## Bech32/Bech32m Encoding

RGB uses **Bech32m** (BIP-350) for Bitcoin SegWit v1+ addresses (Taproot).

### Format

```
bc1p<data><checksum>
│  │ │    └─ 6-character checksum
│  │ └─ Base32 encoded data
│  └─ Witness version (p = v1 for Taproot)
└─ Human-readable part (bc = mainnet)
```

### Example Taproot Address

```rust
// Encode Taproot output
pub fn encode_taproot_address(output_key: &XOnlyPublicKey) -> String {
    bech32::encode(
        "bc",                    // HRP
        output_key.serialize(),  // Data
        bech32::Variant::Bech32m // Use Bech32m for v1+
    )
}

// Example: bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr
```

### Bech32 vs Bech32m

| Feature | Bech32 (BIP-173) | Bech32m (BIP-350) |
|---------|------------------|-------------------|
| **Use case** | SegWit v0 (P2WPKH, P2WSH) | SegWit v1+ (Taproot) |
| **Checksum** | Original algorithm | Modified (better error detection) |
| **Example** | `bc1q...` | `bc1p...` |

```rust
// Choose variant based on witness version
match witness_version {
    0 => Variant::Bech32,    // Legacy SegWit
    _ => Variant::Bech32m,   // Taproot and future
}
```

## Hexadecimal Encoding

**Hex encoding** is used for debugging, raw data display, and transaction hashes.

### Usage in RGB

```rust
// Transaction IDs (Bitcoin compatibility)
let txid = "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890";

// Raw contract data (debugging)
println!("Genesis: {}", hex::encode(&genesis_bytes));

// Witness scripts
let script_hex = "76a914...88ac";
```

### Lowercase vs Uppercase

RGB convention: **Lowercase hex** for consistency

```rust
// ✅ Correct
"abc123def456"

// ❌ Avoid (but accepted)
"ABC123DEF456"
```

## Encoding Comparison

| Format | Length (256-bit) | Use Case | Checksum | Case |
|--------|-----------------|----------|----------|------|
| **BAID64** | 43 chars | Contract IDs, Schema IDs | Built-in | Sensitive |
| **Base58** | 44 chars | Bitcoin addresses (legacy) | Built-in | Sensitive |
| **Bech32m** | 62 chars | Taproot addresses | Built-in | Insensitive |
| **Hex** | 64 chars | Debugging, raw data | None | Insensitive |
| **Consensus** | 32 bytes | Commitments, hashing | N/A | Binary |

## Best Practices

### When to Use Each Format

```rust
// BAID64: User-facing identifiers
let contract_id: ContractId = "rgb:2Ky4xDT-...".parse()?;
let schema_id: SchemaId = "sch:JK3fYxN-...".parse()?;

// Consensus encoding: Creating commitments
let commitment = consensus_encode(&genesis)?;
let hash = Sha256::digest(&commitment);

// Bech32m: Bitcoin addresses
let address = encode_taproot_address(&pubkey);

// Hex: Debugging/logging
debug!("Raw data: {}", hex::encode(&bytes));
```

### Validation

```rust
// Always validate user input
pub fn validate_contract_id(input: &str) -> Result<ContractId, Error> {
    // 1. Check prefix
    if !input.starts_with("rgb:") {
        return Err(Error::InvalidPrefix);
    }

    // 2. Decode BAID64
    let id = ContractId::from_str(input)?;

    // 3. Verify checksum (happens in from_str)
    Ok(id)
}
```

### Error Handling

```rust
// Clear error messages
match ContractId::from_str(input) {
    Ok(id) => id,
    Err(e) => match e {
        Error::InvalidChecksum => {
            return Err("Invalid contract ID: checksum mismatch");
        }
        Error::InvalidLength => {
            return Err("Invalid contract ID: wrong length");
        }
        Error::InvalidCharacter(ch) => {
            return Err(format!("Invalid character in contract ID: '{}'", ch));
        }
        _ => return Err("Invalid contract ID"),
    }
}
```

## Implementation Reference

RGB encoding implementations:

- **BAID64**: [`rgb-core/src/baid64.rs`](https://github.com/RGB-WG/rgb-core)
- **Consensus encoding**: [`rgb-core/src/consensus.rs`](https://github.com/RGB-WG/rgb-core)
- **Commitment encoding**: [`rgb-core/src/commit.rs`](https://github.com/RGB-WG/rgb-core)
- **Strict encoding**: [`strict-encoding`](https://github.com/strict-types/strict-encoding) crate

## See Also

- [Deterministic Bitcoin Commitments](/core-concepts/bitcoin/deterministic-commitments) - DBC architecture
- [Multi-Protocol Commitments](/core-concepts/bitcoin/multi-protocol-commitments) - MPC trees
- [Tapret Commitments](/core-concepts/bitcoin/tapret) - Taproot commitment method
- [Contract Lifecycle](/guides/contracts/genesis) - Genesis and operations
- [CLI Reference](/technical-reference/cli) - Working with encoded identifiers
