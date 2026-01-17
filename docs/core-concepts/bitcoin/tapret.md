---
sidebar_position: 2
title: Tapret
description: Taproot-based commitment method for RGB
---

# Tapret (Taproot OP_RETURN)

Tapret is RGB's recommended method for embedding commitments in Bitcoin transactions using Taproot's script tree structure. It provides superior privacy and efficiency compared to traditional OP_RETURN commitments while maintaining full compatibility with standard Bitcoin wallets.

## Overview

Tapret leverages Bitcoin's Taproot upgrade (BIP 341/342) to:

- **Hide commitments**: Indistinguishable from regular Taproot transactions
- **Reduce costs**: More efficient than OP_RETURN
- **Maintain compatibility**: Works with any Taproot wallet
- **Enable key-path spending**: Normal Bitcoin transactions possible
- **Support multiple commitments**: Multiple protocols in one output

This makes Tapret the preferred commitment method for new RGB applications.

## Taproot Basics

### Taproot Overview

Taproot (BIP 341, activated November 2021) introduces a powerful scripting improvement to Bitcoin that allows multiple spending conditions to be hidden in a Merkle tree structure. This forms the foundation for Tapret's privacy-preserving commitment scheme.

#### Core Taproot Concepts

**Taproot Output Structure**:
```
Taproot Output (P2TR)
┌─────────────────────────────────────────────────────────┐
│  Witness v1 (32-byte public key)                        │
│                                                          │
│  Internal Key (P)          Script Tree (optional)       │
│  ┌──────────────┐          ┌────────────────────┐       │
│  │   x-only     │    +     │   Merkle Root (t)  │       │
│  │  pubkey (P)  │          │                    │       │
│  └──────────────┘          └────────────────────┘       │
│         │                            │                  │
│         │      Hash together         │                  │
│         └────────────┬───────────────┘                  │
│                      ▼                                  │
│         Q = P + H(P || t) * G                           │
│         (Output Key - tweaked pubkey)                   │
│                                                          │
│  Where:                                                 │
│    P = Internal public key (32 bytes, x-only)          │
│    t = Merkle root of script tree                       │
│    H = Tagged hash "TapTweak"                           │
│    G = secp256k1 generator point                        │
│    Q = Final output key visible on-chain                │
└─────────────────────────────────────────────────────────┘
```

**Script Tree (Taptree)**:
```
            Merkle Root (t)
           ╱              ╲
      Hash(A,B)        Hash(C,D)
      ╱      ╲         ╱      ╲
  Leaf A  Leaf B   Leaf C  Leaf D
     │       │        │        │
  Script1 Script2  Script3  Commitment
                              (RGB)
```

**Key features**:
- **Key-path spending**: Most common - spend with single signature, no scripts revealed
- **Script-path spending**: Reveal one script leaf + Merkle proof to execute conditions
- **Privacy**: Unused scripts never appear on blockchain
- **Efficiency**: Key-path spends look like simple pubkey spends
- **Flexibility**: Unlimited script alternatives in tree

### Script Trees

#### Taptree Construction

A Taproot script tree (Taptree) organizes alternative spending conditions in a binary Merkle tree structure. Each leaf contains a TapLeaf script, and the tree is constructed bottom-up to produce a single Merkle root.

**TapLeaf Format**:
```
TapLeaf = leaf_version || compact_size(script_len) || script

Where:
  leaf_version: 1 byte (0xc0 for Tapscript)
  script_len: compact size encoding of script length
  script: the actual script bytes
```

**Merkle Tree Construction**:
```rust
// Pseudocode for TapTree construction
fn build_taptree(leaves: Vec<TapLeaf>) -> MerkleRoot {
    // 1. Hash each leaf with tagged hash
    let mut nodes: Vec<Hash> = leaves.iter().map(|leaf| {
        tagged_hash("TapLeaf", leaf.serialize())
    }).collect();

    // 2. Build tree bottom-up
    while nodes.len() > 1 {
        let mut next_level = Vec::new();
        for pair in nodes.chunks(2) {
            if pair.len() == 2 {
                // Lexicographically sort before hashing (BIP 341)
                let (left, right) = if pair[0] < pair[1] {
                    (&pair[0], &pair[1])
                } else {
                    (&pair[1], &pair[0])
                };
                next_level.push(
                    tagged_hash("TapBranch", left || right)
                );
            } else {
                // Odd node carries up unchanged
                next_level.push(pair[0]);
            }
        }
        nodes = next_level;
    }

    nodes[0] // Merkle root
}
```

**Tagged Hash Function** (BIP 340):
```
tagged_hash(tag, msg) = SHA256(SHA256(tag) || SHA256(tag) || msg)

Common tags in Taproot:
  - "TapLeaf": Hash individual script leaves
  - "TapBranch": Hash internal tree nodes
  - "TapTweak": Tweak internal key with tree root
  - "TapSighash": Signature messages
```

**Key Properties**:
- Binary Merkle tree structure
- Lexicographic ordering of siblings (deterministic)
- Tagged hashing for domain separation
- Efficient Merkle proofs (log n size)
- Privacy: unrevealed branches stay hidden

## Tapret Commitment Structure

### Commitment Placement

Tapret embeds RGB commitments as a special leaf in the Taproot script tree. This leaf contains an OP_RETURN script that is provably unspendable, ensuring the commitment never needs to be revealed on-chain during normal spending.

**Complete Tapret Structure**:
```
Taproot Output (Visible On-Chain)
│
├─ Output Key Q (32 bytes)
│  └─ Tweaked with Merkle root of script tree
│
└─ Script Tree (Off-Chain, Revealed Selectively)
    │
    ├─ Key-Path Spending (Preferred)
    │  └─ Sign with internal key
    │  └─ No script revelation needed
    │  └─ Most private and efficient
    │
    └─ Script Tree Root
        │
        ├─ Left Subtree (Optional User Scripts)
        │  ├─ Timelock scripts
        │  ├─ Multisig conditions
        │  └─ Other spending paths
        │
        └─ Right Subtree (RGB Commitment)
            └─ TapLeaf: OP_RETURN <protocol_tag> <commitment_hash>
               │
               ├─ Provably unspendable (OP_RETURN)
               ├─ Never revealed during normal spending
               ├─ Cryptographically bound via Merkle root
               └─ Can prove inclusion with Merkle proof
```

**Commitment Leaf Details**:

The RGB commitment leaf is structured as:
```
TapLeaf Structure:
┌────────────────────────────────────────────┐
│ Leaf Version: 0xc0 (Tapscript)             │
│ Script Length: compact_size(script_len)    │
│ Script:                                    │
│   OP_RETURN (0x6a)                         │
│   OP_PUSHBYTES_4 <protocol_tag>            │
│   OP_PUSHBYTES_32 <commitment_hash>        │
└────────────────────────────────────────────┘

Total leaf size: ~40 bytes
Leaf hash: tagged_hash("TapLeaf", leaf_bytes)
```

**Why This Design Works**:

1. **Unspendable**: OP_RETURN immediately fails script execution
2. **Hidden**: Leaf not revealed when using key-path spending (99% of cases)
3. **Bound**: Commitment cryptographically tied to output via Merkle tree
4. **Provable**: Merkle proof demonstrates commitment exists in tree
5. **Flexible**: Tree can include other user scripts without conflict

### Commitment Script

The Tapret commitment script follows a strict format that makes it provably unspendable while encoding the RGB commitment data.

#### Script Format Specification

**Basic Structure**:
```
OP_RETURN <protocol_tag> <commitment_hash>

Bytecode breakdown:
  0x6a          OP_RETURN opcode
  0x04          PUSHBYTES_4 (protocol tag length)
  0xXXXXXXXX    Protocol tag (4 bytes)
  0x20          PUSHBYTES_32 (commitment hash length)
  0xYYYY...     Commitment hash (32 bytes)

Total: 39 bytes
```

**Protocol Tags** (Multi-Protocol Commitment):

RGB supports multiple commitment types through protocol tags:

```
Standard Tags:
  RGB1: 0x52474231  - RGB Protocol v1
  RGBT: 0x52474254  - RGB Testnet
  MPC:  0x4D504300  - Multi-Protocol Commitment root

Custom Protocol Tags:
  Reserved range: 0x50000000 - 0x5FFFFFFF
```

**Complete Script Example**:

```
Hexadecimal representation:
6a 04 52474231 20 a8f5e2d1c3b4...

Disassembly:
OP_RETURN
OP_PUSHBYTES_4 52474231
OP_PUSHBYTES_32 a8f5e2d1c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0

Semantic interpretation:
  Opcode: OP_RETURN (script fails immediately)
  Protocol: "RGB1" (mainnet RGB v1)
  Commitment: SHA-256 hash of RGB state transition Merkle tree
```

**Commitment Hash Calculation**:

The 32-byte commitment hash is derived from RGB contract data:

```rust
// Simplified commitment hash calculation
use sha2::{Sha256, Digest};
use commit_verify::CommitEncode;

fn calculate_commitment_hash(
    transitions: &[StateTransition],
    mpc_tree: Option<&MpcTree>
) -> [u8; 32] {
    // 1. Build Merkle tree of state transitions
    let transition_hashes: Vec<[u8; 32]> = transitions
        .iter()
        .map(|t| t.commit_id().into_inner())
        .collect();

    let merkle_root = build_merkle_root(&transition_hashes);

    // 2. If using MPC, combine with other protocols
    if let Some(mpc) = mpc_tree {
        mpc.commit(ProtocolId::RGB, merkle_root)
    } else {
        merkle_root
    }
}
```

**Properties and Security**:

1. **Provably Unspendable**: OP_RETURN causes immediate script failure
2. **Deterministic**: Same input always produces same script
3. **Compact**: Only 39 bytes regardless of committed data size
4. **Collision-Resistant**: SHA-256 provides 128-bit security
5. **Binding**: Changing commitment changes Merkle root, invalidating output
6. **Standard**: Uses Bitcoin's standard OP_RETURN format

**Verification**:

To verify a Tapret commitment script:

```rust
fn verify_commitment_script(
    script: &Script,
    expected_protocol: &[u8; 4],
    expected_commitment: &[u8; 32]
) -> bool {
    // Parse script
    let mut iter = script.instructions();

    // Check OP_RETURN
    if iter.next() != Some(Ok(Instruction::Op(OP_RETURN))) {
        return false;
    }

    // Check protocol tag
    if let Some(Ok(Instruction::PushBytes(tag))) = iter.next() {
        if tag.len() != 4 || tag.as_bytes() != expected_protocol {
            return false;
        }
    } else {
        return false;
    }

    // Check commitment hash
    if let Some(Ok(Instruction::PushBytes(hash))) = iter.next() {
        if hash.len() != 32 || hash.as_bytes() != expected_commitment {
            return false;
        }
    } else {
        return false;
    }

    // Should be no more instructions
    iter.next().is_none()
}
```

### Key Tweaking

Taproot's key tweaking mechanism cryptographically binds the script tree (containing the RGB commitment) to the output key. This ensures the commitment cannot be altered without invalidating the entire output.

#### Mathematical Foundation

**Taproot Tweak Formula** (BIP 341):

```
Q = P + H_taptweak(P || m) * G

Where:
  Q = Output public key (what appears on blockchain)
  P = Internal public key (user's key, x-only 32 bytes)
  m = Merkle root of script tree (32 bytes, or empty if no scripts)
  H_taptweak = tagged_hash("TapTweak", ...)
  G = secp256k1 generator point
  * = Scalar multiplication on elliptic curve
  + = Point addition on elliptic curve
```

**Tagged Hash Function**:

```rust
use sha2::{Sha256, Digest};

fn tagged_hash(tag: &str, msg: &[u8]) -> [u8; 32] {
    let tag_hash = Sha256::digest(tag.as_bytes());
    let mut hasher = Sha256::new();
    hasher.update(&tag_hash);
    hasher.update(&tag_hash);  // Tag hash appears twice
    hasher.update(msg);
    hasher.finalize().into()
}

// Taproot tweak specific
fn compute_taptweak(
    internal_pubkey: &XOnlyPublicKey,  // 32 bytes
    merkle_root: Option<&[u8; 32]>     // 32 bytes or None
) -> [u8; 32] {
    let mut data = internal_pubkey.serialize().to_vec();
    if let Some(root) = merkle_root {
        data.extend_from_slice(root);
    }
    tagged_hash("TapTweak", &data)
}
```

#### Complete Tweaking Process

**Step-by-Step Computation**:

```rust
use secp256k1::{Secp256k1, XOnlyPublicKey, Scalar};

fn create_taproot_output(
    internal_key: &XOnlyPublicKey,
    script_tree: Option<&TapTree>
) -> (XOnlyPublicKey, Option<u8>) {
    let secp = Secp256k1::new();

    // 1. Get Merkle root (if tree exists)
    let merkle_root = script_tree.map(|tree| tree.merkle_root());

    // 2. Compute tweak hash
    let tweak_hash = compute_taptweak(internal_key, merkle_root.as_ref());

    // 3. Convert hash to scalar
    let tweak_scalar = Scalar::from_be_bytes(tweak_hash)
        .expect("hash is valid scalar");

    // 4. Compute tweaked point: Q = P + tweak*G
    let internal_point = internal_key.public_key(&secp);
    let tweak_point = PublicKey::from_secret_key(
        &secp,
        &SecretKey::from_slice(&tweak_hash).unwrap()
    );

    let output_key = internal_point
        .combine(&tweak_point)
        .expect("point addition");

    // 5. Convert to x-only pubkey with parity
    let (output_xonly, parity) = output_key.x_only_public_key();

    (output_xonly, Some(parity as u8))
}
```

#### Spending with Tweaked Keys

**Key-Path Spending** (most common):

```rust
// To spend via key-path, the internal private key must be tweaked
fn sign_keypath_spend(
    internal_privkey: &SecretKey,
    merkle_root: Option<&[u8; 32]>,
    sighash: &[u8; 32]
) -> Signature {
    let secp = Secp256k1::new();

    // 1. Derive internal pubkey
    let internal_pubkey = XOnlyPublicKey::from_secret_key(
        &secp,
        internal_privkey
    );

    // 2. Compute tweak
    let tweak = compute_taptweak(&internal_pubkey, merkle_root);

    // 3. Tweak private key: k' = k + tweak
    let tweak_scalar = Scalar::from_be_bytes(tweak)
        .expect("valid scalar");
    let tweaked_privkey = internal_privkey.add_tweak(&tweak_scalar)
        .expect("valid tweak");

    // 4. Sign with tweaked key
    secp.sign_schnorr(sighash, &tweaked_privkey.into())
}
```

**Script-Path Spending** (revealing commitment):

For script-path spending, the internal key doesn't need tweaking, but you must provide:
1. The script being executed
2. Merkle proof (control block) showing script is in tree
3. Witness data satisfying the script

```rust
// Control block for script-path spending
struct ControlBlock {
    leaf_version: u8,              // 0xc0 | parity_bit
    internal_key: XOnlyPublicKey,  // 32 bytes
    merkle_path: Vec<[u8; 32]>,    // Variable length (0-128 hashes)
}

impl ControlBlock {
    fn serialize(&self) -> Vec<u8> {
        let mut bytes = vec![self.leaf_version];
        bytes.extend_from_slice(&self.internal_key.serialize());
        for hash in &self.merkle_path {
            bytes.extend_from_slice(hash);
        }
        bytes
    }

    // Verify control block proves script is in tree
    fn verify(&self, script: &Script, output_key: &XOnlyPublicKey) -> bool {
        // 1. Hash the script leaf
        let leaf_hash = compute_tapleaf_hash(self.leaf_version, script);

        // 2. Compute Merkle root using path
        let computed_root = self.compute_root(leaf_hash);

        // 3. Tweak internal key with computed root
        let tweak = compute_taptweak(&self.internal_key, Some(&computed_root));
        let tweaked_key = self.internal_key.add_tweak(&tweak);

        // 4. Verify tweaked key matches output key
        tweaked_key == *output_key
    }

    fn compute_root(&self, mut current: [u8; 32]) -> [u8; 32] {
        for sibling in &self.merkle_path {
            // Lexicographic ordering
            let (left, right) = if current < *sibling {
                (&current, sibling)
            } else {
                (sibling, &current)
            };

            let mut data = Vec::with_capacity(64);
            data.extend_from_slice(left);
            data.extend_from_slice(right);
            current = tagged_hash("TapBranch", &data);
        }
        current
    }
}
```

**Security Properties**:

1. **Binding**: Changing Merkle root changes output key (breaks signature)
2. **Hiding**: Output key reveals nothing about script tree
3. **Non-malleability**: Cannot modify commitment without private key
4. **Quantum-resistant hashing**: Uses SHA-256 (post-quantum secure)
5. **Standard**: Full compatibility with BIP 341

## Creating Tapret Commitments

### Construction Process

Building a Tapret commitment involves several cryptographic steps that bind RGB contract data to a Bitcoin transaction through the Taproot script tree.

#### Complete Construction Algorithm

**Step 1: Prepare RGB Commitment Data**

```rust
use rgb::StateTransition;
use commit_verify::{CommitEncode, Digest};

// Collect all state transitions for this anchor
fn prepare_rgb_commitment(
    transitions: Vec<StateTransition>,
    contract_id: ContractId
) -> Result<[u8; 32], Error> {
    // 1.1. Serialize each transition deterministically
    let mut transition_commits: Vec<[u8; 32]> = Vec::new();

    for transition in transitions {
        // Use strict encoding for determinism
        let commit_id = transition.commit_id();
        transition_commits.push(commit_id.into_inner());
    }

    // 1.2. Sort commits (deterministic ordering)
    transition_commits.sort();

    // 1.3. Build Merkle tree
    let merkle_root = build_merkle_tree(&transition_commits)?;

    Ok(merkle_root)
}

fn build_merkle_tree(leaves: &[[u8; 32]]) -> Result<[u8; 32], Error> {
    if leaves.is_empty() {
        return Err(Error::EmptyTree);
    }

    let mut level = leaves.to_vec();

    while level.len() > 1 {
        let mut next_level = Vec::new();

        for chunk in level.chunks(2) {
            let node = if chunk.len() == 2 {
                // Hash pair together
                let mut hasher = Sha256::new();
                hasher.update(&chunk[0]);
                hasher.update(&chunk[1]);
                hasher.finalize().into()
            } else {
                // Odd node - promote to next level
                chunk[0]
            };
            next_level.push(node);
        }

        level = next_level;
    }

    Ok(level[0])
}
```

**Step 2: Create Commitment Script**

```rust
use bitcoin::Script;
use bitcoin::blockdata::opcodes::all::*;

fn create_commitment_script(
    protocol_tag: [u8; 4],
    commitment_hash: [u8; 32]
) -> Script {
    Script::builder()
        .push_opcode(OP_RETURN)
        .push_slice(&protocol_tag)
        .push_slice(&commitment_hash)
        .into_script()
}

// Example usage
let rgb_tag: [u8; 4] = *b"RGB1";
let commitment_hash = prepare_rgb_commitment(transitions, contract_id)?;
let commitment_script = create_commitment_script(rgb_tag, commitment_hash);

// Script in hex:
// 6a 04 52474231 20 [32-byte commitment hash]
```

**Step 3: Build Complete Script Tree**

```rust
use bitcoin::taproot::{TapTree, TapLeafHash, TaprootBuilder};

fn build_tapret_tree(
    commitment_script: Script,
    user_scripts: Vec<(Script, u8)>  // (script, leaf_version)
) -> Result<TapTree, Error> {
    let mut builder = TaprootBuilder::new();

    // 3.1. Add user scripts (if any)
    for (script, version) in user_scripts {
        builder = builder.add_leaf(version, script)?;
    }

    // 3.2. Add RGB commitment leaf (always version 0xc0)
    builder = builder.add_leaf(0xc0, commitment_script)?;

    // 3.3. Finalize tree structure
    let tree = builder.finalize_tree()?;

    Ok(tree)
}

// Alternative: Simple tree with only commitment
fn build_simple_tapret_tree(
    commitment_script: Script
) -> Result<TapTree, Error> {
    TaprootBuilder::new()
        .add_leaf(0xc0, commitment_script)?
        .finalize_tree()
}
```

**Step 4: Compute Merkle Root and Tweak**

```rust
use secp256k1::{XOnlyPublicKey, Secp256k1};

fn compute_taproot_output(
    internal_key: XOnlyPublicKey,
    tap_tree: TapTree
) -> Result<(XOnlyPublicKey, TapTreeInfo), Error> {
    let secp = Secp256k1::verification_only();

    // 4.1. Get Merkle root from tree
    let merkle_root = tap_tree.merkle_root();

    // 4.2. Compute tweak
    let tweak_hash = tagged_hash(
        "TapTweak",
        &[internal_key.serialize(), merkle_root.as_ref()].concat()
    );

    // 4.3. Apply tweak to internal key
    let tweaked_key = internal_key
        .add_tweak(&secp, &tweak_hash.into())?;

    // 4.4. Store tree info for later proof generation
    let tree_info = TapTreeInfo {
        merkle_root,
        tap_tree,
        internal_key,
    };

    Ok((tweaked_key, tree_info))
}

#[derive(Clone, Debug)]
struct TapTreeInfo {
    merkle_root: [u8; 32],
    tap_tree: TapTree,
    internal_key: XOnlyPublicKey,
}
```

**Step 5: Create P2TR Output**

```rust
use bitcoin::{Address, Network, TxOut, Amount};

fn create_taproot_output(
    tweaked_key: XOnlyPublicKey,
    amount: Amount,
    network: Network
) -> Result<(TxOut, Address), Error> {
    // 5.1. Create witness v1 script pubkey
    let script_pubkey = Script::new_v1_p2tr_tweaked(tweaked_key.into());

    // 5.2. Create output
    let output = TxOut {
        value: amount.to_sat(),
        script_pubkey: script_pubkey.clone(),
    };

    // 5.3. Create address for display/communication
    let address = Address::from_script(&script_pubkey, network)?;

    Ok((output, address))
}
```

**Step 6: Build Complete Transaction**

```rust
use bitcoin::{Transaction, TxIn, OutPoint};

fn build_tapret_transaction(
    inputs: Vec<TxIn>,
    recipient_outputs: Vec<TxOut>,
    tapret_output: TxOut,
    change_output: Option<TxOut>
) -> Transaction {
    let mut outputs = recipient_outputs;
    outputs.push(tapret_output);  // Add Tapret commitment output

    if let change_output = change_output {
        outputs.push(change_output);
    }

    Transaction {
        version: 2,
        lock_time: 0,
        input: inputs,
        output: outputs,
    }
}
```

**Step 7: Complete Example - End to End**

```rust
// Complete Tapret commitment creation
fn create_tapret_commitment(
    transitions: Vec<StateTransition>,
    contract_id: ContractId,
    internal_key: XOnlyPublicKey,
    amount: Amount,
    network: Network
) -> Result<TapretCommitment, Error> {
    // 1. Prepare commitment
    let commitment_hash = prepare_rgb_commitment(transitions, contract_id)?;

    // 2. Create script
    let protocol_tag = *b"RGB1";
    let commitment_script = create_commitment_script(
        protocol_tag,
        commitment_hash
    );

    // 3. Build tree
    let tap_tree = build_simple_tapret_tree(commitment_script)?;

    // 4. Compute output key
    let (output_key, tree_info) = compute_taproot_output(
        internal_key,
        tap_tree
    )?;

    // 5. Create output
    let (output, address) = create_taproot_output(
        output_key,
        amount,
        network
    )?;

    Ok(TapretCommitment {
        output,
        address,
        tree_info,
        commitment_hash,
    })
}

#[derive(Debug)]
struct TapretCommitment {
    output: TxOut,
    address: Address,
    tree_info: TapTreeInfo,
    commitment_hash: [u8; 32],
}
```

**Transaction Example**:

```
Bitcoin Transaction with Tapret Commitment:

Inputs:
  [0] Previous UTXO being spent
      - txid: a1b2c3...
      - vout: 0
      - value: 100,000 sats

Outputs:
  [0] Recipient payment
      - value: 50,000 sats
      - scriptPubKey: <recipient address>

  [1] Tapret commitment (can also be change)
      - value: 48,000 sats (or dust limit)
      - scriptPubKey: OP_1 <32-byte tweaked pubkey>
      - Contains hidden RGB commitment in script tree

  [2] Change (optional)
      - value: 1,000 sats (minus fee)
      - scriptPubKey: <change address>

Fee: ~1,000 sats

On-chain appearance:
  - Looks like normal Taproot transaction
  - No visible RGB data
  - Commitment hidden in script tree
  - Can be spent via key-path like any Taproot output
```

### Code Example

#### Complete Implementation in Rust

```rust
use bitcoin::{
    Address, Amount, Network, Script, Transaction, TxIn, TxOut, Witness,
    secp256k1::{Secp256k1, XOnlyPublicKey, SecretKey, rand},
    taproot::{TaprootBuilder, LeafVersion, TapLeafHash},
    blockdata::opcodes::all::*,
};
use rgb_core::{StateTransition, ContractId};
use sha2::{Sha256, Digest};

/// Complete Tapret commitment builder
pub struct TapretCommitmentBuilder {
    secp: Secp256k1<secp256k1::All>,
    network: Network,
}

impl TapretCommitmentBuilder {
    pub fn new(network: Network) -> Self {
        Self {
            secp: Secp256k1::new(),
            network,
        }
    }

    /// Create a Tapret commitment for RGB state transitions
    pub fn commit(
        &self,
        transitions: Vec<StateTransition>,
        contract_id: ContractId,
        internal_key: XOnlyPublicKey,
        amount: Amount,
    ) -> Result<TapretOutput, Error> {
        // Step 1: Calculate commitment hash
        let commitment_hash = self.calculate_commitment(
            &transitions,
            contract_id
        )?;

        // Step 2: Build commitment script
        let commitment_script = self.build_commitment_script(
            b"RGB1",
            &commitment_hash
        );

        // Step 3: Build Taproot tree
        let taproot_spend_info = TaprootBuilder::new()
            .add_leaf(
                0,  // depth
                commitment_script.clone()
            )?
            .finalize(&self.secp, internal_key)
            .expect("valid tree");

        // Step 4: Extract output key and Merkle root
        let output_key = taproot_spend_info.output_key();
        let merkle_root = taproot_spend_info
            .merkle_root()
            .map(|r| r.to_byte_array());

        // Step 5: Create P2TR output
        let script_pubkey = Script::new_v1_p2tr(
            &self.secp,
            output_key,
            merkle_root
        );

        let output = TxOut {
            value: amount.to_sat(),
            script_pubkey: script_pubkey.clone(),
        };

        // Step 6: Create address
        let address = Address::from_script(
            &script_pubkey,
            self.network
        )?;

        Ok(TapretOutput {
            output,
            address,
            internal_key,
            output_key: output_key.to_inner(),
            commitment_hash,
            commitment_script,
            spend_info: taproot_spend_info,
        })
    }

    /// Calculate Merkle root of state transitions
    fn calculate_commitment(
        &self,
        transitions: &[StateTransition],
        contract_id: ContractId
    ) -> Result<[u8; 32], Error> {
        if transitions.is_empty() {
            return Err(Error::NoTransitions);
        }

        // Collect transition commitments
        let mut commits: Vec<[u8; 32]> = transitions
            .iter()
            .map(|t| t.commit_id().into_inner())
            .collect();

        // Sort for determinism
        commits.sort_unstable();

        // Build Merkle tree
        let root = self.merkle_root(&commits);

        // Tag with contract ID for domain separation
        let mut final_commitment = Sha256::new();
        final_commitment.update(contract_id.as_slice());
        final_commitment.update(&root);

        Ok(final_commitment.finalize().into())
    }

    /// Build Merkle tree from leaf hashes
    fn merkle_root(&self, leaves: &[[u8; 32]]) -> [u8; 32] {
        let mut level = leaves.to_vec();

        while level.len() > 1 {
            level = level
                .chunks(2)
                .map(|pair| {
                    if pair.len() == 2 {
                        let mut hasher = Sha256::new();
                        hasher.update(&pair[0]);
                        hasher.update(&pair[1]);
                        hasher.finalize().into()
                    } else {
                        pair[0]
                    }
                })
                .collect();
        }

        level[0]
    }

    /// Build the commitment script (OP_RETURN leaf)
    fn build_commitment_script(
        &self,
        protocol_tag: &[u8; 4],
        commitment: &[u8; 32]
    ) -> Script {
        Script::builder()
            .push_opcode(OP_RETURN)
            .push_slice(protocol_tag)
            .push_slice(commitment)
            .into_script()
    }

    /// Sign and spend Tapret output via key-path
    pub fn sign_keypath(
        &self,
        output: &TapretOutput,
        internal_privkey: &SecretKey,
        tx: &Transaction,
        input_index: usize,
        prevouts: &[TxOut],
    ) -> Result<Witness, Error> {
        use bitcoin::sighash::{SighashCache, TapSighashType};

        // Create sighash
        let mut sighash_cache = SighashCache::new(tx);
        let sighash = sighash_cache
            .taproot_key_spend_signature_hash(
                input_index,
                &prevouts,
                TapSighashType::Default,
            )?;

        // Tweak private key
        let keypair = output.spend_info
            .sign_with_keyspend(
                internal_privkey.into(),
                sighash.to_byte_array(),
                &self.secp
            )?;

        // Create witness
        let sig = keypair.signature;
        let witness = Witness::from_slice(&[sig.as_ref()]);

        Ok(witness)
    }
}

/// Tapret output with full commitment information
#[derive(Debug, Clone)]
pub struct TapretOutput {
    pub output: TxOut,
    pub address: Address,
    pub internal_key: XOnlyPublicKey,
    pub output_key: XOnlyPublicKey,
    pub commitment_hash: [u8; 32],
    pub commitment_script: Script,
    pub spend_info: TaprootSpendInfo,
}

impl TapretOutput {
    /// Generate Merkle proof for the commitment leaf
    pub fn commitment_proof(&self) -> TapretProof {
        let control_block = self.spend_info
            .control_block(&(self.commitment_script.clone(), LeafVersion::TapScript))
            .expect("commitment script is in tree");

        TapretProof {
            internal_key: self.internal_key,
            commitment_script: self.commitment_script.clone(),
            control_block,
        }
    }

    /// Verify proof against output key
    pub fn verify_proof(
        proof: &TapretProof,
        output_key: &XOnlyPublicKey
    ) -> bool {
        proof.control_block.verify_taproot_commitment(
            &Secp256k1::verification_only(),
            output_key,
            &proof.commitment_script
        )
    }
}

/// Proof that a commitment exists in a Taproot output
#[derive(Debug, Clone)]
pub struct TapretProof {
    pub internal_key: XOnlyPublicKey,
    pub commitment_script: Script,
    pub control_block: ControlBlock,
}

/// Error types
#[derive(Debug)]
pub enum Error {
    NoTransitions,
    Bitcoin(bitcoin::Error),
    Secp(secp256k1::Error),
    InvalidTree,
}

// Example usage
fn example_usage() -> Result<(), Error> {
    let secp = Secp256k1::new();
    let builder = TapretCommitmentBuilder::new(Network::Bitcoin);

    // Generate internal key
    let (internal_privkey, internal_pubkey) = secp.generate_keypair(&mut rand::thread_rng());
    let internal_xonly = XOnlyPublicKey::from_keypair(&(internal_privkey, internal_pubkey).into()).0;

    // Create RGB transitions (example)
    let transitions = vec![/* state transitions */];
    let contract_id = ContractId::from([0u8; 32]);

    // Build commitment
    let tapret_output = builder.commit(
        transitions,
        contract_id,
        internal_xonly,
        Amount::from_sat(10_000),
    )?;

    println!("Tapret address: {}", tapret_output.address);
    println!("Commitment hash: {:x?}", tapret_output.commitment_hash);

    // Later, when spending:
    // let witness = builder.sign_keypath(&tapret_output, &internal_privkey, &tx, 0, &prevouts)?;

    Ok(())
}
```

#### TypeScript/JavaScript Implementation

```typescript
import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';
import { BIP340 } from '@bitcoinerlab/secp256k1';

interface StateTransition {
  commitId(): Buffer;
}

interface TapretCommitment {
  output: bitcoin.TxOutput;
  address: string;
  internalKey: Buffer;
  outputKey: Buffer;
  commitmentHash: Buffer;
  tapTree: bitcoin.Taptree;
}

class TapretBuilder {
  constructor(private network: bitcoin.Network) {}

  /**
   * Create Tapret commitment for RGB transitions
   */
  commit(
    transitions: StateTransition[],
    contractId: Buffer,
    internalPubkey: Buffer,
    amount: number
  ): TapretCommitment {
    // 1. Calculate commitment
    const commitmentHash = this.calculateCommitment(
      transitions,
      contractId
    );

    // 2. Build commitment script
    const commitmentScript = bitcoin.script.compile([
      bitcoin.opcodes.OP_RETURN,
      Buffer.from('RGB1'),
      commitmentHash,
    ]);

    // 3. Build Taproot tree
    const tapLeaf: bitcoin.Tapleaf = {
      output: commitmentScript,
      version: 0xc0, // Tapscript version
    };

    const tapTree: bitcoin.Taptree = [tapLeaf];

    // 4. Compute Taproot output
    const { output, address, outputKey } = bitcoin.payments.p2tr({
      internalPubkey,
      scriptTree: tapTree,
      network: this.network,
    });

    return {
      output: { script: output!, value: amount },
      address: address!,
      internalKey: internalPubkey,
      outputKey: outputKey!,
      commitmentHash,
      tapTree,
    };
  }

  /**
   * Calculate Merkle root of transitions
   */
  private calculateCommitment(
    transitions: StateTransition[],
    contractId: Buffer
  ): Buffer {
    // Get commitment IDs
    const commits = transitions
      .map(t => t.commitId())
      .sort(Buffer.compare);

    // Build Merkle tree
    const merkleRoot = this.buildMerkleRoot(commits);

    // Tag with contract ID
    const finalHash = crypto.createHash('sha256')
      .update(contractId)
      .update(merkleRoot)
      .digest();

    return finalHash;
  }

  /**
   * Build Merkle tree from leaves
   */
  private buildMerkleRoot(leaves: Buffer[]): Buffer {
    let level = [...leaves];

    while (level.length > 1) {
      const nextLevel: Buffer[] = [];

      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          const combined = crypto.createHash('sha256')
            .update(level[i])
            .update(level[i + 1])
            .digest();
          nextLevel.push(combined);
        } else {
          nextLevel.push(level[i]);
        }
      }

      level = nextLevel;
    }

    return level[0];
  }

  /**
   * Sign key-path spend
   */
  signKeyPath(
    commitment: TapretCommitment,
    internalPrivkey: Buffer,
    tx: bitcoin.Transaction,
    inputIndex: number,
    prevOuts: bitcoin.TxOutput[]
  ): Buffer {
    // Create sighash
    const sighash = tx.hashForWitnessV1(
      inputIndex,
      prevOuts.map(o => o.script),
      prevOuts.map(o => o.value),
      bitcoin.Transaction.SIGHASH_DEFAULT
    );

    // Tweak private key
    const tweakedPrivkey = this.tweakPrivkey(
      internalPrivkey,
      commitment.tapTree
    );

    // Sign with BIP340 Schnorr
    const signature = BIP340.sign(sighash, tweakedPrivkey);

    return signature;
  }

  private tweakPrivkey(privkey: Buffer, tapTree: bitcoin.Taptree): Buffer {
    // Implementation depends on library
    // Tweaks private key with Merkle root of tap tree
    throw new Error('Implementation required');
  }
}

// Example usage
const builder = new TapretBuilder(bitcoin.networks.bitcoin);
const internalKey = Buffer.from('02' + '00'.repeat(31), 'hex');

const commitment = builder.commit(
  transitions,
  contractId,
  internalKey,
  10000
);

console.log('Tapret Address:', commitment.address);
console.log('Commitment Hash:', commitment.commitmentHash.toString('hex'));
```

### Commitment Verification

Verifying a Tapret commitment requires proving that a specific RGB commitment exists in a Taproot output's script tree, without revealing the entire tree structure on-chain.

#### Verification Components

**What the Verifier Needs**:

1. **Bitcoin Transaction**: The published transaction containing the Taproot output
2. **Output Index**: Which output contains the commitment
3. **Tapret Proof**: Off-chain data proving commitment existence
   - Internal public key
   - Commitment script
   - Merkle proof (control block)
4. **Expected Commitment**: The commitment hash to verify against
5. **RGB State Data**: Transitions that should match the commitment

**TapretProof Structure**:

```rust
/// Proof that a commitment exists in a Taproot script tree
#[derive(Clone, Debug, StrictEncode, StrictDecode)]
pub struct TapretProof {
    /// The internal public key (before tweaking)
    pub internal_key: XOnlyPublicKey,

    /// The commitment script (OP_RETURN leaf)
    pub commitment_script: Script,

    /// Control block with Merkle path
    pub control_block: ControlBlock,

    /// Optional: Additional user script proofs
    pub script_proofs: Vec<ScriptProof>,
}

/// Control block for script-path verification (BIP 341)
#[derive(Clone, Debug)]
pub struct ControlBlock {
    /// Leaf version | parity (1 byte)
    pub leaf_version_parity: u8,

    /// Internal public key (32 bytes)
    pub internal_key: XOnlyPublicKey,

    /// Merkle proof path (32 bytes each, up to 128 entries)
    pub merkle_path: Vec<[u8; 32]>,
}

impl ControlBlock {
    /// Serialize to bytes (for witness inclusion)
    pub fn serialize(&self) -> Vec<u8> {
        let mut bytes = vec![self.leaf_version_parity];
        bytes.extend_from_slice(&self.internal_key.serialize());
        for hash in &self.merkle_path {
            bytes.extend_from_slice(hash);
        }
        bytes
    }

    /// Size: 33 + 32 * path_len bytes
    pub fn size(&self) -> usize {
        33 + 32 * self.merkle_path.len()
    }
}
```

#### Complete Verification Algorithm

**Step-by-Step Verification**:

```rust
use bitcoin::{Transaction, TxOut, Script, XOnlyPublicKey};
use sha2::{Sha256, Digest};

/// Complete Tapret commitment verifier
pub struct TapretVerifier {
    secp: Secp256k1<secp256k1::Verification>,
}

impl TapretVerifier {
    pub fn new() -> Self {
        Self {
            secp: Secp256k1::verification_only(),
        }
    }

    /// Verify a Tapret commitment in a transaction
    pub fn verify(
        &self,
        tx: &Transaction,
        output_index: usize,
        proof: &TapretProof,
        expected_commitment: &[u8; 32],
    ) -> Result<bool, VerificationError> {
        // Step 1: Extract output from transaction
        let output = tx
            .output
            .get(output_index)
            .ok_or(VerificationError::OutputNotFound)?;

        // Step 2: Verify it's a P2TR output
        if !output.script_pubkey.is_v1_p2tr() {
            return Err(VerificationError::NotTaproot);
        }

        // Step 3: Extract output key from scriptPubkey
        let output_key = self.extract_output_key(&output.script_pubkey)?;

        // Step 4: Verify commitment script format
        self.verify_commitment_script(
            &proof.commitment_script,
            expected_commitment
        )?;

        // Step 5: Compute TapLeaf hash
        let leaf_hash = self.compute_tapleaf_hash(
            proof.control_block.leaf_version_parity & 0xfe, // Remove parity bit
            &proof.commitment_script
        );

        // Step 6: Compute Merkle root from proof
        let computed_root = self.compute_merkle_root_from_path(
            leaf_hash,
            &proof.control_block.merkle_path
        );

        // Step 7: Verify output key matches tweak
        let verified = self.verify_output_key(
            &proof.internal_key,
            &computed_root,
            &output_key,
            proof.control_block.leaf_version_parity & 1 // Parity bit
        )?;

        Ok(verified)
    }

    /// Extract output key from P2TR scriptPubkey
    fn extract_output_key(
        &self,
        script_pubkey: &Script
    ) -> Result<XOnlyPublicKey, VerificationError> {
        // P2TR format: OP_1 <32-byte x-only pubkey>
        if script_pubkey.len() != 34 {
            return Err(VerificationError::InvalidScriptPubkey);
        }

        if script_pubkey.as_bytes()[0] != 0x51 {  // OP_1
            return Err(VerificationError::InvalidScriptPubkey);
        }

        if script_pubkey.as_bytes()[1] != 0x20 {  // Push 32 bytes
            return Err(VerificationError::InvalidScriptPubkey);
        }

        let key_bytes = &script_pubkey.as_bytes()[2..34];
        let output_key = XOnlyPublicKey::from_slice(key_bytes)
            .map_err(|_| VerificationError::InvalidOutputKey)?;

        Ok(output_key)
    }

    /// Verify commitment script contains expected commitment
    fn verify_commitment_script(
        &self,
        script: &Script,
        expected_commitment: &[u8; 32]
    ) -> Result<(), VerificationError> {
        let bytes = script.as_bytes();

        // Check minimum length: OP_RETURN + tag push + tag + hash push + hash
        if bytes.len() < 39 {
            return Err(VerificationError::InvalidCommitmentScript);
        }

        // Verify OP_RETURN
        if bytes[0] != 0x6a {
            return Err(VerificationError::NotOpReturn);
        }

        // Verify protocol tag (4 bytes)
        if bytes[1] != 0x04 {
            return Err(VerificationError::InvalidProtocolTag);
        }

        // Verify commitment hash (32 bytes)
        if bytes[6] != 0x20 {
            return Err(VerificationError::InvalidCommitmentLength);
        }

        // Extract and verify commitment
        let commitment = &bytes[7..39];
        if commitment != expected_commitment {
            return Err(VerificationError::CommitmentMismatch);
        }

        Ok(())
    }

    /// Compute TapLeaf hash (BIP 341)
    fn compute_tapleaf_hash(
        &self,
        leaf_version: u8,
        script: &Script
    ) -> [u8; 32] {
        let mut data = Vec::new();
        data.push(leaf_version);
        data.extend_from_slice(&compact_size_encode(script.len()));
        data.extend_from_slice(script.as_bytes());

        tagged_hash("TapLeaf", &data)
    }

    /// Compute Merkle root from leaf and path
    fn compute_merkle_root_from_path(
        &self,
        mut current: [u8; 32],
        path: &[[u8; 32]]
    ) -> [u8; 32] {
        for sibling in path {
            // Lexicographically order before hashing
            let (left, right) = if current.as_ref() < sibling.as_ref() {
                (&current, sibling)
            } else {
                (sibling, &current)
            };

            let mut data = Vec::with_capacity(64);
            data.extend_from_slice(left);
            data.extend_from_slice(right);

            current = tagged_hash("TapBranch", &data);
        }

        current
    }

    /// Verify output key matches internal key + tweak
    fn verify_output_key(
        &self,
        internal_key: &XOnlyPublicKey,
        merkle_root: &[u8; 32],
        output_key: &XOnlyPublicKey,
        parity: u8
    ) -> Result<bool, VerificationError> {
        // Compute tweak
        let mut tweak_data = Vec::with_capacity(64);
        tweak_data.extend_from_slice(&internal_key.serialize());
        tweak_data.extend_from_slice(merkle_root);
        let tweak = tagged_hash("TapTweak", &tweak_data);

        // Apply tweak to internal key
        let tweaked_key = internal_key
            .add_tweak(&self.secp, &tweak.into())
            .map_err(|_| VerificationError::TweakFailed)?;

        // Verify match
        Ok(tweaked_key.0 == *output_key)
    }
}

/// Compact size encoding (Bitcoin varint)
fn compact_size_encode(n: usize) -> Vec<u8> {
    match n {
        0..=252 => vec![n as u8],
        253..=0xffff => {
            let mut bytes = vec![0xfd];
            bytes.extend_from_slice(&(n as u16).to_le_bytes());
            bytes
        }
        0x10000..=0xffffffff => {
            let mut bytes = vec![0xfe];
            bytes.extend_from_slice(&(n as u32).to_le_bytes());
            bytes
        }
        _ => {
            let mut bytes = vec![0xff];
            bytes.extend_from_slice(&(n as u64).to_le_bytes());
            bytes
        }
    }
}

#[derive(Debug)]
pub enum VerificationError {
    OutputNotFound,
    NotTaproot,
    InvalidScriptPubkey,
    InvalidOutputKey,
    InvalidCommitmentScript,
    NotOpReturn,
    InvalidProtocolTag,
    InvalidCommitmentLength,
    CommitmentMismatch,
    TweakFailed,
}
```

#### Merkle Proof Generation

**Creating Proofs for Transfer**:

```rust
/// Generate Tapret proof for RGB consignment
pub fn generate_tapret_proof(
    internal_key: XOnlyPublicKey,
    commitment_script: Script,
    tap_tree: &TapTree,
) -> Result<TapretProof, ProofError> {
    // 1. Get leaf hash of commitment script
    let leaf_version = 0xc0; // Tapscript
    let leaf_hash = compute_tapleaf_hash(leaf_version, &commitment_script);

    // 2. Generate Merkle path from tree
    let merkle_path = tap_tree
        .merkle_path_to_leaf(&leaf_hash)
        .ok_or(ProofError::LeafNotInTree)?;

    // 3. Determine parity bit
    let (_, parity) = tap_tree
        .output_key(&internal_key)
        .ok_or(ProofError::InvalidTree)?;

    // 4. Build control block
    let control_block = ControlBlock {
        leaf_version_parity: leaf_version | (parity as u8),
        internal_key,
        merkle_path: merkle_path.to_vec(),
    };

    Ok(TapretProof {
        internal_key,
        commitment_script,
        control_block,
        script_proofs: vec![],
    })
}
```

#### Real Transaction Example

**Bitcoin Mainnet Transaction** (hypothetical):

```
Transaction ID: 3a4b5c6d...
Output [1]: Tapret Commitment

On-Chain Data:
  scriptPubkey: 5120a1b2c3d4e5f6... (OP_1 <32-byte key>)
  value: 10,000 sats

Off-Chain Proof (in RGB consignment):
  Internal Key: 02abc123...
  Commitment Script: 6a 04 52474231 20 [commitment_hash]
  Control Block: c0 [internal_key] [path_hash_1] [path_hash_2]

Verification:
  1. Leaf hash = tagged_hash("TapLeaf", commitment_script)
     = e4f5a6b7...

  2. With path: [path_hash_1, path_hash_2]
     merkle_root = tagged_hash("TapBranch",
                     tagged_hash("TapBranch", leaf_hash || path_hash_1) ||
                     path_hash_2)
     = d3e4f5a6...

  3. Tweak = tagged_hash("TapTweak", internal_key || merkle_root)
     = b2c3d4e5...

  4. Output key = internal_key + tweak*G
     = a1b2c3d4... ✓ matches scriptPubkey

Commitment Verified ✓
```

#### Batch Verification

For efficiency when verifying multiple commitments:

```rust
/// Verify multiple Tapret commitments in parallel
pub fn batch_verify(
    transactions: &[(Transaction, usize, TapretProof, [u8; 32])]
) -> Vec<Result<bool, VerificationError>> {
    use rayon::prelude::*;

    let verifier = TapretVerifier::new();

    transactions
        .par_iter()
        .map(|(tx, idx, proof, commitment)| {
            verifier.verify(tx, *idx, proof, commitment)
        })
        .collect()
}
```

## Spending Tapret Outputs

### Key-Path Spending

*To be expanded: Normal spending (commitment hidden)*

Most common spending path:

```
Key-path spend:
  - Sign with internal key
  - No scripts revealed
  - Commitment stays hidden
  - Indistinguishable from any Taproot spend
```

**Process**:
1. Create spending transaction
2. Sign with internal private key
3. Broadcast transaction

**Privacy**: Commitment never revealed on-chain.

### Script-Path Spending

*To be expanded: Revealing scripts (rarely needed)*

Alternative spending if needed:

```
Script-path spend:
  - Reveal specific script from tree
  - Provide Merkle proof
  - Execute script conditions
```

**Note**: RGB commitment leaf is unspendable (OP_RETURN), so it would never be revealed for spending.

### Commitment Revelation

*To be expanded: When to reveal commitments*

Commitment revealed only when:
- Transferring RGB assets (off-chain via consignment)
- Proving commitment exists (Merkle proof provided)
- Auditing (if required)

**Never** revealed on Bitcoin blockchain for normal operations.

## Privacy Advantages

### On-Chain Privacy

*To be expanded: Blockchain privacy benefits*

Tapret provides superior privacy:

**Indistinguishable transactions**:
- Looks like any Taproot transaction
- No OP_RETURN in outputs (visible)
- No protocol identification on-chain
- Same fee rate as normal transactions

**Hidden commitments**:
- Commitment in unused script leaf
- Never revealed for normal spending
- Only recipient/sender know it exists
- Full plausible deniability

### Comparison with Opret

*To be expanded: Privacy comparison*

| Aspect | Tapret | Opret |
|--------|--------|-------|
| On-chain visibility | Hidden | Obvious |
| Protocol identification | No | Yes (OP_RETURN tag) |
| Transaction type | Standard | Data carrier |
| Deniability | Plausible | None |
| Privacy level | High | Low |

### Data Minimization

*To be expanded: What's revealed*

Tapret reveals on-chain:
- ✓ Standard Taproot output
- ✗ No commitment data
- ✗ No protocol identification
- ✗ No RGB-specific information

Off-chain (to recipient only):
- ✓ Commitment data
- ✓ Script tree structure
- ✓ RGB state transitions
- ✓ Proof of commitment

## Efficiency Benefits

### Size Efficiency

*To be expanded: Space savings*

Tapret outputs:
- Same size as regular Taproot (32 bytes pubkey)
- No additional OP_RETURN output needed
- Smaller transactions
- Lower fees

**Comparison**:
```
Opret approach:
  - Regular output: 43-67 bytes
  - OP_RETURN output: ~40 bytes
  - Total: ~107 bytes

Tapret approach:
  - Taproot output: ~43 bytes
  - Total: ~43 bytes

Savings: ~60% smaller
```

### Cost Efficiency

*To be expanded: Fee savings*

Lower transaction size = lower fees:
- One less output
- Smaller serialized size
- Better fee efficiency
- Cost advantage for high-frequency users

### Batch Efficiency

*To be expanded: Batching multiple commitments*

Multiple RGB operations in one output:
- Single Tapret commitment
- Multiple state transitions
- Multiple contracts
- Amortized costs

## Multi-Protocol Support

### MPC Integration

*To be expanded: Multiple protocols in Tapret*

Tapret supports [Multi-Protocol Commitments](./multi-protocol-commitments.md):

```
Taproot Output (Tapret)
  └─ Commitment Leaf
     └─ MPC Tree
        ├─ RGB commitments
        ├─ Lightning commitments
        └─ Other protocol commitments
```

**Benefits**:
- Share single Taproot output
- Independent protocol operation
- Cost sharing across protocols
- Enhanced privacy (protocol agnostic)

## Compatibility Considerations

### Wallet Support

*To be expanded: Wallet compatibility*

**Requirements**:
- Taproot-capable wallet
- Script tree manipulation
- Key tweaking support

**Supported wallets**:
- Bitcoin Core (with descriptors)
- Modern hardware wallets (Taproot enabled)
- Custom RGB wallets
- Compatible Lightning wallets

### Taproot Activation

*To be expanded: Network requirements*

Tapret requires:
- Taproot activated network (mainnet: ✓ Nov 2021)
- Taproot-capable nodes
- Wallet software support

**Availability**:
- ✓ Bitcoin mainnet
- ✓ Bitcoin testnet
- ✓ Bitcoin signet
- ✓ Regtest

## Security Considerations

### Commitment Binding

*To be expanded: Cryptographic security*

Tapret commitments are:

**Cryptographically bound**:
- Commitment in script tree Merkle root
- Merkle root tweaks internal key
- Output key commits to entire tree
- Can't change commitment without changing key

**Tamper-proof**:
- Changing commitment changes Merkle root
- Changing Merkle root changes output key
- Changing output key invalidates transaction
- Bitcoin consensus enforces

### Key Security

*To be expanded: Private key considerations*

**Internal key privacy**:
- Internal key is user's actual key
- Tweak doesn't reveal key
- Can spend with key-path (no reveal)
- Standard Bitcoin key security applies

**Commitment security**:
- Commitment binding cryptographic
- No way to fake commitment
- Proof required to validate
- Inherits Bitcoin security

## Implementation Guidelines

### Best Practices

*To be expanded: Implementation recommendations*

**When to use Tapret**:
- ✓ New RGB implementations
- ✓ Privacy-sensitive applications
- ✓ High-frequency operations
- ✓ Professional deployments

**When to use Opret**:
- Legacy compatibility needed
- Simple implementation required
- Explicit protocol signaling desired

### Error Handling

*To be expanded: Handling edge cases*

Common issues:
- Missing script tree revelation
- Invalid Merkle proofs
- Key tweaking errors
- Non-Taproot outputs

**Mitigations**:
- Validate script tree before committing
- Generate and verify proofs
- Test key derivation
- Detect and reject non-Taproot

### Testing

*To be expanded: Testing Tapret implementations*

Test cases:
- Commitment creation
- Key tweaking
- Script tree construction
- Merkle proof generation
- Verification process
- Spending scenarios

## Tapret vs Alternatives

### vs Opret

*To be expanded: Detailed comparison*

See [Opret documentation](./opret.md) for Opret details.

**Tapret advantages**:
- Higher privacy (hidden commitment)
- Lower cost (smaller transactions)
- Better fungibility (looks standard)

**Opret advantages**:
- Simpler implementation
- Universal compatibility (pre-Taproot)
- Explicit protocol signaling

### vs Other Methods

*To be expanded: Alternative commitment methods*

Other potential methods:
- **Pay-to-contract**: Tweak key directly (no script tree)
- **Timelock**: Commitment in timelock values
- **Signature**: Commitment in signature data

**Why Tapret is preferred**:
- Standard approach
- Tool support
- Flexible (script tree)
- Compatible with other uses

## Future Enhancements

### Planned Improvements

*To be expanded: Future developments*

Potential enhancements:
- Optimized script tree construction
- Better batching algorithms
- Cross-input aggregation
- Advanced MPC schemes

### Research Directions

*To be expanded: Ongoing research*

Areas of research:
- Optimal tree structures
- Privacy enhancements
- Efficiency improvements
- Novel commitment schemes

## Related Documentation

- [Deterministic Commitments](./deterministic-commitments.md) - Overall commitment architecture
- [Opret](./opret.md) - Alternative commitment method
- [Multi-Protocol Commitments](./multi-protocol-commitments.md) - MPC details
- [Bitcoin Integration](../../guides/development/wallet-integration.md) - Wallet integration guide

## References

*Coming soon: BIP 341/342, Tapret specifications*

- BIP 341: Taproot validation
- BIP 342: Tapscript
- Tapret specification
- RGB commitment standards

---

**Status**: Draft outline - To be expanded with detailed implementation specifications and examples.
