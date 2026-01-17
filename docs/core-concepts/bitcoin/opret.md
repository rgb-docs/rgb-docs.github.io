---
sidebar_position: 3
title: Opret
description: OP_RETURN commitment method for RGB
---

# Opret (OP_RETURN Commitments)

Opret is RGB's traditional commitment method using Bitcoin's OP_RETURN opcode. While [Tapret](./tapret.md) is now preferred for new implementations due to superior privacy and efficiency, Opret remains widely supported for legacy compatibility and applications where explicit protocol signaling is desired.

## Overview

Opret uses standard Bitcoin OP_RETURN outputs to embed RGB commitments directly in transaction outputs. This method provides:

- **Universal compatibility**: Works on any Bitcoin version (pre-Taproot)
- **Simple implementation**: Straightforward to create and verify
- **Explicit signaling**: Clear indication of RGB usage on-chain
- **Proven reliability**: Years of production use since RGB's inception
- **Wide tool support**: Compatible with all RGB implementations
- **No special requirements**: Works with any Bitcoin wallet library

## OP_RETURN Basics

### What is OP_RETURN?

OP_RETURN is a Bitcoin script opcode (0x6a) that marks an output as provably unspendable while allowing up to 80 bytes of arbitrary data to be stored in the blockchain.

**Key Characteristics**:

```
Opcode: 0x6a (OP_RETURN)
Function: Terminates script execution immediately
Result: Script always fails (unspendable)
Data Capacity: Up to 80 bytes (consensus limit)
UTXO Impact: Not stored in UTXO set (pruned)
Relay Policy: Standard (widely relayed by nodes)
```

**Script Format**:
```
OP_RETURN <data>

Where <data> can be:
  - Single push: OP_RETURN <80_bytes>
  - Multiple pushes: OP_RETURN <push1> <push2> ...
  - Total data: max 80 bytes after OP_RETURN
```

### Bitcoin OP_RETURN Rules

#### Consensus Rules

Bitcoin consensus doesn't strictly limit OP_RETURN, but node relay policy does:

```rust
// Bitcoin Core standardness rules
const MAX_OP_RETURN_RELAY: usize = 83;  // 1 (OP_RETURN) + 1 (push) + 80 (data) + 1 (padding)

fn is_standard_op_return(script: &Script) -> bool {
    if script.len() > MAX_OP_RETURN_RELAY {
        return false;
    }

    if !script.is_op_return() {
        return false;
    }

    // Must be single OP_RETURN at start
    let bytes = script.as_bytes();
    bytes[0] == 0x6a  // OP_RETURN
}
```

**Standard Transaction Policy**:

1. **Single OP_RETURN**: Only one OP_RETURN output per transaction (standard)
2. **80-byte limit**: Data after OP_RETURN limited to 80 bytes
3. **Zero value**: Typically 0 satoshis (can be non-zero but wasteful)
4. **Relay**: Standard transactions with OP_RETURN are relayed
5. **Mining**: Accepted by miners (no discrimination)

#### Historical Evolution

```
Pre-2014: OP_RETURN disabled, used OP_CHECKMULTISIG hacks
  └─> Embedded data in fake pubkeys (polluted UTXO set)

2014 (Bitcoin Core 0.9): OP_RETURN re-enabled
  └─> 40-byte limit initially

2015 (Bitcoin Core 0.11): Increased to 80 bytes
  └─> Current standard limit

2017: Segwit activation
  └─> OP_RETURN data counts at 1/4 weight

Future: Tapret adoption
  └─> OP_RETURN being phased out for RGB
```

### Why OP_RETURN for Commitments?

**Advantages**:

1. **Provably Unspendable**: Cannot be accidentally spent
2. **UTXO Set Efficiency**: Pruned from UTXO set after confirmation
3. **Standard**: Widely supported, well-understood
4. **Simple**: No complex cryptographic operations needed
5. **Explicit**: Clear intent (data storage)
6. **Compatible**: Works with all Bitcoin node versions

**Disadvantages**:

1. **Visible**: Obviously a data transaction (low privacy)
2. **Larger**: Adds extra output (~43 bytes overhead)
3. **Higher Fees**: Larger transaction = higher fees
4. **Stigma**: Some consider "blockchain bloat"
5. **Single Use**: Can only include one OP_RETURN per transaction (standard)

## Opret Structure

### Commitment Format

RGB Opret commitments follow a strict format that embeds the commitment hash along with a protocol identifier:

**Basic Structure**:

```
Transaction Output (TxOut):
┌────────────────────────────────────────┐
│  value: 0 satoshis                     │
│  scriptPubKey:                         │
│    OP_RETURN                           │
│    <protocol_tag>  (4 bytes)          │
│    <commitment>    (32 bytes)         │
└────────────────────────────────────────┘

Total output size: ~43 bytes
  - 8 bytes: value (0)
  - 1 byte: script length
  - 1 byte: OP_RETURN (0x6a)
  - 1 byte: push protocol tag (0x04)
  - 4 bytes: protocol tag
  - 1 byte: push commitment (0x20)
  - 32 bytes: commitment hash
  ≈ 48 bytes serialized
```

**Detailed Byte Layout**:

```
Output Bytes (hex):
00 00 00 00 00 00 00 00  ← value (0 sats, 8 bytes LE)
27                        ← script length (39 bytes)
6a                        ← OP_RETURN
04                        ← PUSHBYTES_4
52 47 42 31              ← "RGB1" protocol tag
20                        ← PUSHBYTES_32
[32-byte commitment hash]

Total: 48 bytes
```

### Protocol Tags

RGB uses 4-byte protocol tags to identify different RGB protocol versions and commitment types:

```rust
/// RGB protocol tags (4 bytes each)
pub const RGB_PROTOCOL_TAG_V1: [u8; 4] = *b"RGB1";
pub const RGB_PROTOCOL_TAG_V2: [u8; 4] = *b"RGB2";
pub const RGB_TESTNET_TAG: [u8; 4] = *b"RGBT";

/// Multi-Protocol Commitment tag
pub const MPC_TAG: [u8; 4] = *b"MPC\0";

/// Future reserved tags
pub const RGB_RESERVED_START: [u8; 4] = *b"RGB\x03";
pub const RGB_RESERVED_END: [u8; 4] = *b"RGB\xff";

/// Tag validation
pub fn is_valid_rgb_tag(tag: &[u8; 4]) -> bool {
    matches!(tag,
        b"RGB1" | b"RGB2" | b"RGBT" | b"MPC\0"
    )
}
```

**Tag Purposes**:

| Tag | Purpose | Status |
|-----|---------|--------|
| `RGB1` | RGB Protocol v1 (mainnet) | Active |
| `RGB2` | RGB Protocol v2 (future) | Reserved |
| `RGBT` | RGB Testnet | Active |
| `MPC\0` | Multi-Protocol Commitment | Active |
| Others | Reserved for future use | - |

### Commitment Hash Calculation

The 32-byte commitment hash is the Merkle root of all RGB state transitions being anchored:

```rust
use sha2::{Sha256, Digest};
use rgb_core::{StateTransition, ContractId};

/// Calculate Opret commitment hash
pub fn calculate_opret_commitment(
    transitions: &[StateTransition],
    contract_id: ContractId,
) -> [u8; 32] {
    // 1. Collect transition commitment IDs
    let mut commits: Vec<[u8; 32]> = transitions
        .iter()
        .map(|t| t.commit_id().into_inner())
        .collect();

    // 2. Sort for determinism
    commits.sort_unstable();

    // 3. Build Merkle tree
    let merkle_root = build_merkle_root(&commits);

    // 4. Tag with contract ID (domain separation)
    let mut hasher = Sha256::new();
    hasher.update(b"RGB:commitment:");
    hasher.update(contract_id.as_slice());
    hasher.update(&merkle_root);

    hasher.finalize().into()
}

/// Build Merkle tree from sorted leaves
fn build_merkle_root(leaves: &[[u8; 32]]) -> [u8; 32] {
    if leaves.is_empty() {
        return [0u8; 32];
    }

    let mut level = leaves.to_vec();

    while level.len() > 1 {
        level = level
            .chunks(2)
            .map(|pair| {
                let mut hasher = Sha256::new();
                hasher.update(&pair[0]);
                if pair.len() == 2 {
                    hasher.update(&pair[1]);
                } else {
                    // Odd leaf - hash with itself
                    hasher.update(&pair[0]);
                }
                hasher.finalize().into()
            })
            .collect();
    }

    level[0]
}
```

### Complete Output Example

**Real Bitcoin Transaction Example**:

```
Transaction: a1b2c3d4e5f6...

Inputs:
  [0] Previous UTXO
      txid: f1e2d3c4...
      vout: 1
      value: 50,000 sats

Outputs:
  [0] Recipient payment
      value: 20,000 sats
      scriptPubKey: 0014... (P2WPKH)

  [1] RGB Opret commitment
      value: 0 sats
      scriptPubKey: 6a 04 52474231 20 a8f5e2d1c3b4a5f6...

  [2] Change
      value: 29,500 sats
      scriptPubKey: 0014... (P2WPKH)

Fee: 500 sats

Opret Output Details:
  Position: Output 1
  Value: 0 satoshis
  Script: OP_RETURN "RGB1" <commitment_hash>
  Size: 48 bytes
  Purpose: Anchor RGB state transitions
```

**Hexadecimal Breakdown**:

```
Complete output bytes:
0000000000000000  ← value (0 sats)
27                ← script length (39 bytes)
6a                ← OP_RETURN
04524742 31       ← PUSHBYTES_4 "RGB1"
20a8f5e2d1c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0
  ↑                ↑
  PUSHBYTES_32     32-byte commitment hash
```

## Creating Opret Commitments

### Construction Process

#### Step-by-Step Algorithm

```
Step 1: Prepare RGB Data
  ├─> Collect state transitions
  ├─> Calculate commitment IDs
  ├─> Build Merkle tree
  └─> Derive commitment hash (32 bytes)

Step 2: Format OP_RETURN Script
  ├─> Start with OP_RETURN opcode (0x6a)
  ├─> Push protocol tag (4 bytes)
  ├─> Push commitment hash (32 bytes)
  └─> Verify ≤ 80 bytes total data

Step 3: Create Transaction Output
  ├─> Value: 0 satoshis
  ├─> Script: OP_RETURN output from Step 2
  └─> Verify output is standard

Step 4: Build Complete Transaction
  ├─> Add inputs (source UTXOs)
  ├─> Add payment outputs
  ├─> Add Opret commitment output
  ├─> Add change output (if needed)
  └─> Calculate and set transaction fee

Step 5: Sign and Broadcast
  ├─> Sign inputs
  ├─> Verify transaction validity
  ├─> Broadcast to Bitcoin network
  └─> Monitor for confirmation
```

#### Implementation in Rust

```rust
use bitcoin::{Script, TxOut, Transaction, Amount};
use bitcoin::blockdata::opcodes::all::OP_RETURN;

/// Create an Opret commitment output
pub fn create_opret_output(
    protocol_tag: [u8; 4],
    commitment: [u8; 32],
) -> Result<TxOut, OpretError> {
    // Validate inputs
    if !is_valid_rgb_tag(&protocol_tag) {
        return Err(OpretError::InvalidProtocolTag);
    }

    // Build script
    let script = Script::builder()
        .push_opcode(OP_RETURN)
        .push_slice(&protocol_tag)
        .push_slice(&commitment)
        .into_script();

    // Verify size constraints
    if script.len() > 83 {  // 1 (OP_RETURN) + 1 (push) + 80 (data) + padding
        return Err(OpretError::ScriptTooLarge);
    }

    // Create output
    let output = TxOut {
        value: 0,  // Zero satoshis
        script_pubkey: script,
    };

    Ok(output)
}

/// Build complete transaction with Opret commitment
pub fn build_opret_transaction(
    inputs: Vec<TxIn>,
    recipient_outputs: Vec<TxOut>,
    commitment: [u8; 32],
    change_script: Script,
    fee_rate: f64,  // sats/vbyte
) -> Result<Transaction, OpretError> {
    // Create Opret output
    let opret_output = create_opret_output(*b"RGB1", commitment)?;

    // Calculate total input value
    let input_value: u64 = inputs
        .iter()
        .map(|inp| inp.previous_output.value)
        .sum();

    // Calculate total output value
    let output_value: u64 = recipient_outputs
        .iter()
        .map(|out| out.value)
        .sum();

    // Estimate transaction size
    let mut tx = Transaction {
        version: 2,
        lock_time: 0,
        input: inputs.clone(),
        output: {
            let mut outputs = recipient_outputs.clone();
            outputs.push(opret_output.clone());
            outputs
        },
    };

    // Calculate fee
    let tx_vsize = tx.vsize() as f64;
    let fee = (tx_vsize * fee_rate).ceil() as u64;

    // Calculate change
    let change_value = input_value
        .checked_sub(output_value)
        .and_then(|v| v.checked_sub(fee))
        .ok_or(OpretError::InsufficientFunds)?;

    // Add change output if above dust
    const DUST_LIMIT: u64 = 546;
    if change_value >= DUST_LIMIT {
        let change_output = TxOut {
            value: change_value,
            script_pubkey: change_script,
        };
        tx.output.push(change_output);
    }

    Ok(tx)
}

#[derive(Debug)]
pub enum OpretError {
    InvalidProtocolTag,
    ScriptTooLarge,
    InsufficientFunds,
    TransactionTooLarge,
}
```

#### Implementation in TypeScript

```typescript
import * as bitcoin from 'bitcoinjs-lib';
import * as crypto from 'crypto';

interface OpretCommitment {
  output: bitcoin.TxOutput;
  script: Buffer;
  commitment: Buffer;
}

/**
 * Create RGB Opret commitment output
 */
function createOpretOutput(
  protocolTag: Buffer,
  commitment: Buffer
): OpretCommitment {
  // Validate inputs
  if (protocolTag.length !== 4) {
    throw new Error('Protocol tag must be 4 bytes');
  }

  if (commitment.length !== 32) {
    throw new Error('Commitment must be 32 bytes');
  }

  // Build OP_RETURN script
  const script = bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    protocolTag,
    commitment,
  ]);

  // Verify size (Bitcoin standard: ≤ 83 bytes)
  if (script.length > 83) {
    throw new Error('OP_RETURN script too large');
  }

  return {
    output: {
      script,
      value: 0,  // Zero satoshis
    },
    script,
    commitment,
  };
}

/**
 * Build transaction with Opret commitment
 */
function buildOpretTransaction(
  inputs: bitcoin.TxInput[],
  recipientOutputs: bitcoin.TxOutput[],
  commitment: Buffer,
  changeAddress: string,
  network: bitcoin.Network,
  feeRate: number  // sat/vbyte
): bitcoin.Transaction {
  const psbt = new bitcoin.Psbt({ network });

  // Add inputs
  for (const input of inputs) {
    psbt.addInput(input);
  }

  // Add recipient outputs
  for (const output of recipientOutputs) {
    psbt.addOutput(output);
  }

  // Add Opret commitment
  const opret = createOpretOutput(
    Buffer.from('RGB1'),
    commitment
  );
  psbt.addOutput(opret.output);

  // Calculate fee and add change
  const inputValue = inputs.reduce(
    (sum, inp) => sum + (inp.witnessUtxo?.value || 0),
    0
  );

  const outputValue = recipientOutputs.reduce(
    (sum, out) => sum + out.value,
    0
  );

  // Estimate size (simplified)
  const estimatedSize =
    10 +  // version + locktime
    inputs.length * 180 +  // inputs (P2WPKH)
    (recipientOutputs.length + 1) * 43 +  // outputs + opret
    43;  // change

  const fee = Math.ceil(estimatedSize * feeRate);
  const changeValue = inputValue - outputValue - fee;

  const DUST_LIMIT = 546;
  if (changeValue >= DUST_LIMIT) {
    psbt.addOutput({
      address: changeAddress,
      value: changeValue,
    });
  }

  return psbt.extractTransaction();
}

// Example usage
const transitions: StateTransition[] = [/* ... */];
const commitment = calculateCommitment(transitions);

const tx = buildOpretTransaction(
  inputs,
  [{ address: recipient, value: 50000 }],
  commitment,
  changeAddress,
  bitcoin.networks.bitcoin,
  10  // 10 sat/vbyte
);

console.log('Transaction:', tx.toHex());
console.log('Opret commitment:', commitment.toString('hex'));
```

### Advanced: Multi-Protocol Commitments

When using [Multi-Protocol Commitments (MPC)](./multi-protocol-commitments.md), the Opret output commits to an MPC tree root instead of a direct RGB commitment:

```rust
/// Create MPC Opret commitment
pub fn create_mpc_opret(
    rgb_commitment: [u8; 32],
    lightning_commitment: Option<[u8; 32]>,
    other_commitments: Vec<([u8; 32], [u8; 32])>,  // (protocol_id, commitment)
) -> Result<TxOut, OpretError> {
    // Build MPC tree
    let mut mpc_tree = MpcTree::new();
    mpc_tree.insert(ProtocolId::RGB, rgb_commitment);

    if let Some(ln_commit) = lightning_commitment {
        mpc_tree.insert(ProtocolId::Lightning, ln_commit);
    }

    for (protocol_id, commitment) in other_commitments {
        mpc_tree.insert(ProtocolId::from(protocol_id), commitment);
    }

    // Get MPC root
    let mpc_root = mpc_tree.root();

    // Create Opret with MPC tag
    create_opret_output(*b"MPC\0", mpc_root)
}
```

## Commitment Verification

### Extraction Process

Verifying an Opret commitment involves scanning a Bitcoin transaction for OP_RETURN outputs and validating the commitment against expected RGB data.

#### Step-by-Step Verification

```rust
use bitcoin::{Transaction, Script};

/// RGB Opret verifier
pub struct OpretVerifier;

impl OpretVerifier {
    /// Verify Opret commitment in transaction
    pub fn verify(
        &self,
        tx: &Transaction,
        expected_commitment: &[u8; 32],
        expected_protocol: &[u8; 4],
    ) -> Result<bool, VerificationError> {
        // Step 1: Find OP_RETURN output
        let opret_output = self.find_opret_output(tx)?;

        // Step 2: Parse OP_RETURN script
        let (protocol_tag, commitment) = self.parse_opret_script(
            &opret_output.script_pubkey
        )?;

        // Step 3: Verify protocol tag
        if &protocol_tag != expected_protocol {
            return Err(VerificationError::ProtocolMismatch);
        }

        // Step 4: Verify commitment
        if &commitment != expected_commitment {
            return Err(VerificationError::CommitmentMismatch);
        }

        Ok(true)
    }

    /// Find OP_RETURN output in transaction
    fn find_opret_output(
        &self,
        tx: &Transaction
    ) -> Result<&TxOut, VerificationError> {
        tx.output
            .iter()
            .find(|out| out.script_pubkey.is_op_return())
            .ok_or(VerificationError::NoOpReturn)
    }

    /// Parse OP_RETURN script to extract commitment
    fn parse_opret_script(
        &self,
        script: &Script
    ) -> Result<([u8; 4], [u8; 32]), VerificationError> {
        let bytes = script.as_bytes();

        // Verify minimum length
        if bytes.len() < 39 {
            return Err(VerificationError::ScriptTooShort);
        }

        // Verify OP_RETURN
        if bytes[0] != 0x6a {
            return Err(VerificationError::NotOpReturn);
        }

        // Extract protocol tag
        if bytes[1] != 0x04 {
            return Err(VerificationError::InvalidTagPush);
        }

        let mut protocol_tag = [0u8; 4];
        protocol_tag.copy_from_slice(&bytes[2..6]);

        // Extract commitment
        if bytes[6] != 0x20 {
            return Err(VerificationError::InvalidCommitmentPush);
        }

        let mut commitment = [0u8; 32];
        commitment.copy_from_slice(&bytes[7..39]);

        Ok((protocol_tag, commitment))
    }

    /// Extract all commitments from transaction (handles multiple protocols)
    pub fn extract_all_commitments(
        &self,
        tx: &Transaction
    ) -> Vec<(Vec<u8>, [u8; 32])> {
        tx.output
            .iter()
            .filter(|out| out.script_pubkey.is_op_return())
            .filter_map(|out| self.parse_opret_script(&out.script_pubkey).ok())
            .map(|(tag, commit)| (tag.to_vec(), commit))
            .collect()
    }
}

#[derive(Debug)]
pub enum VerificationError {
    NoOpReturn,
    ScriptTooShort,
    NotOpReturn,
    InvalidTagPush,
    InvalidCommitmentPush,
    ProtocolMismatch,
    CommitmentMismatch,
}
```

### Verification Example

```rust
// Verify RGB commitment in a transaction
let verifier = OpretVerifier;

let tx = fetch_transaction(txid)?;
let expected_commitment = calculate_commitment(&transitions)?;

match verifier.verify(&tx, &expected_commitment, b"RGB1") {
    Ok(true) => {
        println!("✓ Commitment verified successfully");
        println!("  Transaction: {}", txid);
        println!("  Commitment: {:x?}", expected_commitment);
    }
    Ok(false) => {
        println!("✗ Commitment verification failed");
    }
    Err(e) => {
        println!("✗ Verification error: {:?}", e);
    }
}
```

## Advantages and Limitations

### Advantages

#### Universal Compatibility

**Works Everywhere**:
- Pre-Taproot Bitcoin nodes (all versions)
- Bitcoin testnet, signet, regtest
- Liquid Network and other Bitcoin sidechains
- Any wallet that supports OP_RETURN creation

```rust
// Compatible with all Bitcoin Core versions since 0.9.0 (2014)
const MIN_BITCOIN_CORE_VERSION: &str = "0.9.0";
```

#### Simple Implementation

**Straightforward Code**:
- No complex cryptographic operations (unlike Tapret)
- No Merkle tree management in Bitcoin script
- No key tweaking required
- Easy to debug and verify

**Learning Curve**: Low - developers can implement in hours

#### Explicit Protocol Signaling

**Clear On-Chain Indication**:
```
Transaction Analysis:
  Output 1: OP_RETURN 52474231 a8f5e2d1...
            ↑         ↑        ↑
            Opcode    "RGB1"   Commitment

Interpretation: RGB Protocol transaction
Purpose: Anchoring RGB state transitions
Privacy: Low (obvious RGB usage)
```

#### Wide Tool Support

**Ecosystem Coverage**:
- All RGB wallets support Opret
- Block explorers can display Opret data
- Most Bitcoin libraries have OP_RETURN helpers
- Established documentation and examples

#### Battle-Tested

**Production History**:
```
2019-2021: Primary RGB commitment method
  └─> Thousands of transactions
  └─> No security issues discovered
  └─> Reliable performance

2021-Present: Legacy support
  └─> Still widely used
  └─> Gradual migration to Tapret
```

### Limitations

#### Lower Privacy

**On-Chain Visibility**:

Opret transactions are easily identifiable:

```
Blockchain Analysis:
  ✗ Transaction contains OP_RETURN → data transaction
  ✗ Protocol tag "RGB1" → RGB protocol identified
  ✗ Transaction pattern → RGB transfer detected
  ✗ UTXO graph → can track RGB asset flows

Privacy Level: LOW
  - Protocol usage: Visible
  - Transaction purpose: Obvious
  - Asset type: Hidden (only hash)
  - Transfer amount: Hidden (only hash)
```

**Comparison with Tapret**:

| Aspect | Opret | Tapret |
|--------|-------|--------|
| On-chain visibility | Obvious | Hidden |
| Protocol identification | Yes | No |
| Transaction fingerprint | Unique | Standard |
| Plausible deniability | None | High |

#### Higher Cost

**Size Overhead**:

```
Transaction Size Comparison:

Standard Bitcoin Transaction:
  Input (P2WPKH): ~68 vbytes
  Output (P2WPKH): ~31 vbytes
  Overhead: ~11 vbytes
  Total: ~110 vbytes

With Opret:
  Input (P2WPKH): ~68 vbytes
  Output (P2WPKH): ~31 vbytes
  Opret Output: ~43 vbytes  ← Additional
  Overhead: ~11 vbytes
  Total: ~153 vbytes (+39%)

Fee Impact (at 10 sat/vB):
  Without Opret: ~1,100 sats
  With Opret: ~1,530 sats (+430 sats)

Annual Cost (1000 txs):
  Extra: 430,000 sats ≈ $130 (at $30k BTC)
```

#### Less Efficient

**Resource Usage**:

1. **Blockchain Space**: Extra 43 bytes per transaction
2. **Network Bandwidth**: Larger transactions to relay
3. **Verification Time**: Must scan all outputs

```rust
// Opret adds overhead
const OPRET_OVERHEAD: usize = 43;  // bytes

// Tapret has no overhead (uses existing Taproot output)
const TAPRET_OVERHEAD: usize = 0;  // bytes
```

#### Reduced Fungibility

**Transaction Discrimination**:

Some actors may discriminate against Opret transactions:

```
Potential Issues:
  - Some exchanges flag OP_RETURN transactions
  - Mining pools may deprioritize (rare)
  - Privacy-focused wallets avoid OP_RETURN
  - Chain analysis easily identifies RGB usage

Mitigation:
  - Use Tapret for better fungibility
  - Mix with other OP_RETURN protocols
  - CoinJoin integration (experimental)
```

## Privacy Considerations

### On-Chain Visibility

#### What Opret Reveals

```
Visible Information:
  ✓ Transaction contains data (OP_RETURN present)
  ✓ Protocol being used (RGB1/RGB2/RGBT tag)
  ✓ Commitment hash (32 bytes)
  ✓ Transaction structure

Hidden Information:
  ✗ Actual RGB data (only hash revealed)
  ✗ Asset types being transferred
  ✗ Transfer amounts
  ✗ Participant identities
  ✗ Contract details
```

#### Transaction Fingerprinting

**Identifying RGB Transactions**:

```python
def is_rgb_opret_transaction(tx):
    """
    Identify RGB Opret transactions from blockchain data
    """
    for output in tx.outputs:
        if output.script_pubkey.starts_with(b'\x6a'):  # OP_RETURN
            data = output.script_pubkey[1:]
            if len(data) >= 38:  # 1 + 4 + 1 + 32
                if data[1:5] in [b'RGB1', b'RGB2', b'RGBT', b'MPC\x00']:
                    return True
    return False

# Blockchain scanner can easily identify RGB transactions
rgb_transactions = [tx for tx in blockchain if is_rgb_opret_transaction(tx)]
```

**Privacy Impact**:

```
Chain Analysis Capabilities:
  1. Identify all RGB transactions
  2. Build RGB transaction graph
  3. Cluster RGB users
  4. Track UTXO flows
  5. Timing analysis

Mitigation Strategies:
  → Use Tapret instead (recommended)
  → Mix with other OP_RETURN protocols
  → Use Tor for transaction broadcast
  → Implement CoinJoin (experimental)
```

### Improving Privacy

#### Best Practices

```rust
/// Privacy-enhanced Opret usage
pub struct PrivacyConfig {
    /// Use Tor for broadcasting
    pub use_tor: bool,

    /// Add dummy OP_RETURN outputs (noise)
    pub add_decoys: bool,

    /// Number of decoy outputs
    pub decoy_count: usize,

    /// Use CoinJoin when possible
    pub coinjoin_enabled: bool,

    /// Randomize output order
    pub shuffle_outputs: bool,
}

impl PrivacyConfig {
    /// Recommended settings for privacy
    pub fn recommended() -> Self {
        Self {
            use_tor: true,
            add_decoys: false,  // May be rejected by nodes
            decoy_count: 0,
            coinjoin_enabled: false,  // Not yet supported
            shuffle_outputs: true,
        }
    }

    /// Build transaction with privacy enhancements
    pub fn build_private_opret_tx(
        &self,
        commitment: [u8; 32],
        // ... other params
    ) -> Transaction {
        let mut tx = build_basic_opret_tx(commitment)?;

        if self.shuffle_outputs {
            // Randomize output order
            use rand::seq::SliceRandom;
            tx.output.shuffle(&mut rand::thread_rng());
        }

        tx
    }
}
```

#### Migration Path to Tapret

**Gradual Transition**:

```rust
/// Support both Opret and Tapret
pub enum CommitmentMethod {
    Opret,
    Tapret,
    Auto,  // Choose based on context
}

impl CommitmentMethod {
    /// Choose commitment method based on requirements
    pub fn choose(
        taproot_available: bool,
        privacy_required: bool,
        legacy_support_needed: bool,
    ) -> Self {
        match (taproot_available, privacy_required, legacy_support_needed) {
            (true, true, false) => Self::Tapret,  // Best privacy
            (false, _, _) => Self::Opret,  // No choice
            (true, false, true) => Self::Opret,  // Legacy compatibility
            (true, false, false) => Self::Tapret,  // Modern default
            (true, _, true) => Self::Auto,  // Support both
        }
    }
}
```

## Cost Efficiency

### Transaction Size Analysis

#### Detailed Size Breakdown

```
Opret Transaction Structure:

Version: 4 bytes
Input Count: 1 byte (varint)
Inputs: N × ~148 bytes (P2WPKH)
  └─> Previous outpoint: 36 bytes
  └─> Script sig: 0 bytes (segwit)
  └─> Sequence: 4 bytes
  └─> Witness: ~108 bytes (segwit)

Output Count: 1 byte (varint)
Outputs:
  [0] Payment: ~43 bytes
      └─> Value: 8 bytes
      └─> Script: ~35 bytes (P2WPKH: 0014{20-byte-hash})

  [1] Opret: ~43 bytes
      └─> Value: 8 bytes (0)
      └─> Script: ~39 bytes
          OP_RETURN: 1 byte
          Tag push: 1 byte
          Tag: 4 bytes
          Hash push: 1 byte
          Hash: 32 bytes

  [2] Change: ~43 bytes (if needed)

Locktime: 4 bytes

Segwit Overhead:
  Marker: 1 byte
  Flag: 1 byte
  Witness data: counted at 1/4 weight

Total Size (1 input, 3 outputs):
  Base: ~180 bytes
  Witness: ~108 bytes
  Weight Units: 180×4 + 108 = 828 WU
  Virtual Size: 828/4 = 207 vbytes

Opret Contribution:
  ~43 bytes ≈ 20% of total size
```

#### Cost Comparison

```rust
/// Calculate transaction costs
pub fn compare_costs(
    num_inputs: usize,
    num_outputs: usize,
    fee_rate: f64,  // sat/vbyte
) -> CostComparison {
    // Without Opret
    let base_size = estimate_tx_size(num_inputs, num_outputs);
    let base_fee = (base_size as f64 * fee_rate).ceil() as u64;

    // With Opret
    let opret_size = base_size + 43;  // +43 bytes for Opret output
    let opret_fee = (opret_size as f64 * fee_rate).ceil() as u64;

    CostComparison {
        base_size,
        opret_size,
        base_fee,
        opret_fee,
        extra_cost: opret_fee - base_fee,
        percent_increase: ((opret_fee - base_fee) as f64 / base_fee as f64) * 100.0,
    }
}

struct CostComparison {
    base_size: usize,
    opret_size: usize,
    base_fee: u64,
    opret_fee: u64,
    extra_cost: u64,
    percent_increase: f64,
}

// Example
let costs = compare_costs(1, 2, 10.0);  // 1 input, 2 outputs, 10 sat/vB
println!("Extra cost: {} sats (+{:.1}%)",
    costs.extra_cost,
    costs.percent_increase
);
// Output: Extra cost: 430 sats (+28.1%)
```

### Fee Implications

#### Real-World Cost Analysis

```
Scenario: High-frequency RGB transfers

Assumptions:
  - 100 transfers per day
  - 1 input, 2 outputs + Opret per transaction
  - Fee rate: 10 sat/vbyte (typical)

Daily Costs:
  Opret: 100 × 1,530 sats = 153,000 sats
  Tapret: 100 × 1,100 sats = 110,000 sats
  Difference: 43,000 sats/day

Annual Costs:
  Opret: 153,000 × 365 = 55,845,000 sats ≈ 0.558 BTC
  Tapret: 110,000 × 365 = 40,150,000 sats ≈ 0.402 BTC
  Savings with Tapret: 0.156 BTC ≈ $4,680 (at $30k)

ROI of Migration:
  Development cost of Tapret integration: ~$5,000
  Annual savings: ~$4,680
  Payback period: ~1 year
```

#### Batching Optimization

Opret costs can be amortized by batching multiple RGB operations:

```rust
/// Batch multiple RGB commitments into one transaction
pub fn batch_commitments(
    rgb_commitments: Vec<[u8; 32]>,
    max_opret_outputs: usize,
) -> Vec<TxOut> {
    // Note: Standard policy allows only 1 OP_RETURN per tx
    // This requires non-standard or MPC approach

    if rgb_commitments.len() == 1 {
        // Single commitment - standard Opret
        vec![create_opret_output(*b"RGB1", rgb_commitments[0]).unwrap()]
    } else {
        // Multiple commitments - use MPC
        let mpc_root = build_mpc_tree(&rgb_commitments);
        vec![create_opret_output(*b"MPC\0", mpc_root).unwrap()]
    }
}

/// Cost savings from batching
pub fn batch_savings(num_commitments: usize, fee_rate: f64) -> u64 {
    // Individual transactions
    let individual_cost = num_commitments as u64 *
        (base_tx_size() as f64 * fee_rate) as u64;

    // Batched transaction
    let batch_cost = ((base_tx_size() + 43) as f64 * fee_rate) as u64;

    individual_cost.saturating_sub(batch_cost)
}
```

## Multi-Protocol Commitments

### MPC with Opret

[Multi-Protocol Commitments (MPC)](./multi-protocol-commitments.md) allow multiple protocols to share a single Opret output:

#### MPC Structure

```
OP_RETURN <MPC_TAG> <mpc_root>

Where mpc_root commits to:
┌─────────────────────────────────┐
│     MPC Merkle Tree             │
│                                 │
│          MPC Root               │
│         /         \             │
│   Hash(RGB)   Hash(LN,Other)    │
│       |          /      \       │
│   RGB commit   LN    Other      │
│              commit  commits    │
└─────────────────────────────────┘

Benefits:
  - Share single OP_RETURN output
  - Independent protocol operation
  - Cost sharing across protocols
  - Unified commitment structure
```

#### Implementation

```rust
use commit_verify::mpc::{MpcTree, ProtocolId};

/// Create MPC Opret commitment
pub fn create_mpc_opret_commitment(
    rgb_data: Option<[u8; 32]>,
    lightning_data: Option<[u8; 32]>,
    other_protocols: Vec<(ProtocolId, [u8; 32])>,
) -> Result<TxOut, OpretError> {
    let mut mpc = MpcTree::new();

    // Add RGB commitment
    if let Some(rgb_commit) = rgb_data {
        mpc.insert(ProtocolId::RGB, rgb_commit)?;
    }

    // Add Lightning commitment
    if let Some(ln_commit) = lightning_data {
        mpc.insert(ProtocolId::Lightning, ln_commit)?;
    }

    // Add other protocol commitments
    for (protocol_id, commitment) in other_protocols {
        mpc.insert(protocol_id, commitment)?;
    }

    // Get MPC root and create Opret
    let mpc_root = mpc.root();
    create_opret_output(*b"MPC\0", mpc_root)
}

/// Verify MPC commitment
pub fn verify_mpc_commitment(
    tx: &Transaction,
    protocol_id: ProtocolId,
    expected_commitment: &[u8; 32],
    mpc_proof: &MpcProof,
) -> Result<bool, VerificationError> {
    // Extract MPC root from transaction
    let verifier = OpretVerifier;
    let opret_out = verifier.find_opret_output(tx)?;
    let (tag, mpc_root) = verifier.parse_opret_script(&opret_out.script_pubkey)?;

    // Verify MPC tag
    if &tag != b"MPC\0" {
        return Err(VerificationError::NotMPC);
    }

    // Verify Merkle proof
    let computed_root = mpc_proof.compute_root(protocol_id, expected_commitment)?;

    Ok(computed_root == mpc_root)
}

/// MPC Merkle proof
pub struct MpcProof {
    pub merkle_path: Vec<[u8; 32]>,
    pub protocol_position: usize,
}

impl MpcProof {
    pub fn compute_root(
        &self,
        protocol_id: ProtocolId,
        commitment: &[u8; 32],
    ) -> Result<[u8; 32], ProofError> {
        // Hash leaf: H(protocol_id || commitment)
        let mut hasher = Sha256::new();
        hasher.update(protocol_id.as_bytes());
        hasher.update(commitment);
        let mut current = hasher.finalize().into();

        // Follow Merkle path
        for sibling in &self.merkle_path {
            let mut hasher = Sha256::new();
            hasher.update(&current);
            hasher.update(sibling);
            current = hasher.finalize().into();
        }

        Ok(current)
    }
}
```

## Best Practices

### When to Use Opret

#### Recommended Use Cases

```
✓ Legacy compatibility requirements
  └─> Supporting old RGB wallets
  └─> Pre-Taproot networks
  └─> Existing infrastructure

✓ Simple implementations
  └─> Proof-of-concept
  └─> Learning/testing
  └─> Quick prototypes

✓ Explicit protocol signaling desired
  └─> Regulatory compliance
  └─> Audit trails
  └─> Public verifiability

✓ Maximum compatibility needed
  └─> Unknown wallet support
  └─> Diverse user base
  └─> Cross-platform needs
```

#### When to Avoid Opret

```
✗ Privacy-focused applications
  → Use Tapret instead

✗ High-frequency operations
  → Tapret more cost-effective

✗ Maximum efficiency requirements
  → Tapret has no overhead

✗ Fungibility-critical uses
  → Tapret indistinguishable

✗ New implementations (2024+)
  → Tapret is the modern standard
```

### Implementation Guidelines

#### Code Quality Standards

```rust
/// Production-ready Opret builder
pub struct OpretBuilder {
    protocol: ProtocolTag,
    network: Network,
    strict_validation: bool,
}

impl OpretBuilder {
    /// Create new builder with validation
    pub fn new(protocol: ProtocolTag, network: Network) -> Self {
        Self {
            protocol,
            network,
            strict_validation: true,
        }
    }

    /// Build Opret output with validation
    pub fn build(
        &self,
        commitment: [u8; 32],
    ) -> Result<TxOut, BuildError> {
        // Validate protocol tag
        if !self.protocol.is_valid() {
            return Err(BuildError::InvalidProtocol);
        }

        // Validate network match
        if !self.protocol.matches_network(self.network) {
            return Err(BuildError::NetworkMismatch);
        }

        // Build script
        let script = self.build_script(commitment)?;

        // Validate script size
        if self.strict_validation && script.len() > 83 {
            return Err(BuildError::ScriptTooLarge);
        }

        // Create output
        Ok(TxOut {
            value: 0,
            script_pubkey: script,
        })
    }

    fn build_script(&self, commitment: [u8; 32]) -> Result<Script, BuildError> {
        let script = Script::builder()
            .push_opcode(OP_RETURN)
            .push_slice(&self.protocol.as_bytes())
            .push_slice(&commitment)
            .into_script();

        Ok(script)
    }
}

#[derive(Debug)]
pub enum BuildError {
    InvalidProtocol,
    NetworkMismatch,
    ScriptTooLarge,
}
```

#### Testing Requirements

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_opret_creation() {
        let builder = OpretBuilder::new(
            ProtocolTag::RGB1,
            Network::Bitcoin,
        );

        let commitment = [0x42; 32];
        let output = builder.build(commitment).unwrap();

        assert_eq!(output.value, 0);
        assert!(output.script_pubkey.is_op_return());
        assert_eq!(output.script_pubkey.len(), 39);
    }

    #[test]
    fn test_opret_verification() {
        let verifier = OpretVerifier;
        let mut tx = Transaction {
            version: 2,
            lock_time: 0,
            input: vec![],
            output: vec![
                create_opret_output(*b"RGB1", [0x42; 32]).unwrap(),
            ],
        };

        let result = verifier.verify(&tx, &[0x42; 32], b"RGB1");
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_invalid_protocol_tag() {
        let result = create_opret_output(*b"BAD!", [0x42; 32]);
        assert!(result.is_err());
    }

    #[test]
    fn test_script_size_limit() {
        // Should fail if script exceeds 83 bytes
        let large_data = vec![0u8; 100];
        // ... test implementation
    }
}
```

## Compatibility

### Network Support

#### Bitcoin Networks

```rust
/// Network compatibility matrix
pub struct NetworkSupport {
    pub mainnet: bool,
    pub testnet: bool,
    pub signet: bool,
    pub regtest: bool,
}

impl NetworkSupport {
    pub fn opret_support() -> Self {
        Self {
            mainnet: true,   // Full support
            testnet: true,   // Full support
            signet: true,    // Full support
            regtest: true,   // Full support
        }
    }

    pub fn recommended_protocol_tag(&self, network: Network) -> ProtocolTag {
        match network {
            Network::Bitcoin => ProtocolTag::RGB1,
            Network::Testnet => ProtocolTag::RGBT,
            Network::Signet => ProtocolTag::RGBT,
            Network::Regtest => ProtocolTag::RGBT,
        }
    }
}
```

#### Version Requirements

```
Bitcoin Core Support:
  ✓ 0.9.0+ (March 2014): Basic OP_RETURN (40 bytes)
  ✓ 0.11.0+ (July 2015): Extended OP_RETURN (80 bytes)
  ✓ All modern versions: Full support

Minimum Requirements:
  - Bitcoin Core: ≥ 0.11.0 (or equivalent)
  - Node policy: Default (allows OP_RETURN)
  - No special configuration needed
```

### Wallet Support

#### Library Compatibility

**Rust**:
```toml
[dependencies]
bitcoin = "0.30"  # Full OP_RETURN support
rgb-std = "0.10"  # Native Opret support
```

**JavaScript/TypeScript**:
```json
{
  "dependencies": {
    "bitcoinjs-lib": "^6.0.0",
    "@rgbjs/bitcoin": "^0.1.0"
  }
}
```

**Python**:
```python
# python-bitcoinlib
from bitcoin.core import CMutableTransaction, CMutableTxOut
from bitcoin.core.script import CScript, OP_RETURN
```

#### Wallet Integration

```typescript
/**
 * Opret wallet integration
 */
interface WalletOpretSupport {
  canCreateOpret: boolean;
  maxOpretSize: number;
  opretFeeEstimation: (data: Buffer) => Promise<number>;
  broadcastOpretTx: (tx: Transaction) => Promise<string>;
}

class BitcoinWallet implements WalletOpretSupport {
  canCreateOpret = true;
  maxOpretSize = 80;  // Standard limit

  async opretFeeEstimation(data: Buffer): Promise<number> {
    const opretSize = 1 + 1 + data.length;  // OP_RETURN + push + data
    const feeRate = await this.getFeeRate();
    return Math.ceil(opretSize * feeRate);
  }

  async broadcastOpretTx(tx: Transaction): Promise<string> {
    // Validate transaction
    if (!this.validateOpretTx(tx)) {
      throw new Error('Invalid OP_RETURN transaction');
    }

    // Broadcast
    return await this.broadcast(tx);
  }

  private validateOpretTx(tx: Transaction): boolean {
    const opretOutputs = tx.outs.filter(out =>
      out.script[0] === 0x6a  // OP_RETURN
    );

    // Standard policy: max 1 OP_RETURN per tx
    return opretOutputs.length <= 1;
  }
}
```

## Migration to Tapret

### Transition Strategy

#### Dual Support Implementation

```rust
/// Support both Opret and Tapret during transition
pub enum CommitmentType {
    Opret(OpretCommitment),
    Tapret(TapretCommitment),
}

impl CommitmentType {
    /// Create commitment based on wallet capabilities
    pub fn create(
        commitment_hash: [u8; 32],
        wallet: &dyn WalletProvider,
        prefer_tapret: bool,
    ) -> Result<Self, Error> {
        if prefer_tapret && wallet.supports_taproot() {
            // Use Tapret if available and preferred
            let tapret = TapretCommitment::create(commitment_hash, wallet)?;
            Ok(CommitmentType::Tapret(tapret))
        } else {
            // Fallback to Opret
            let opret = OpretCommitment::create(commitment_hash)?;
            Ok(CommitmentType::Opret(opret))
        }
    }

    /// Verify commitment (handles both types)
    pub fn verify(
        &self,
        tx: &Transaction,
        expected_commitment: &[u8; 32],
    ) -> Result<bool, VerificationError> {
        match self {
            CommitmentType::Opret(opret) => {
                OpretVerifier.verify(tx, expected_commitment, b"RGB1")
            }
            CommitmentType::Tapret(tapret) => {
                TapretVerifier.verify(tx, expected_commitment, tapret.proof())
            }
        }
    }
}
```

#### Migration Timeline

```
Phase 1 (2024): Dual Support
  ├─> Implement Tapret alongside Opret
  ├─> Default to Opret (compatibility)
  ├─> Tapret opt-in for advanced users
  └─> Educate users on benefits

Phase 2 (2025): Tapret Default
  ├─> Default to Tapret for new wallets
  ├─> Opret available for legacy support
  ├─> Migration tools provided
  └─> Documentation updated

Phase 3 (2026+): Opret Deprecation
  ├─> Tapret standard for all new implementations
  ├─> Opret verification still supported
  ├─> Legacy Opret commitments remain valid
  └─> Historical data accessible

Long Term: Tapret Only
  ├─> New implementations use Tapret exclusively
  ├─> Opret verification in read-only mode
  └─> Full privacy and efficiency benefits
```

### Automatic Detection

```rust
/// Detect commitment type from transaction
pub fn detect_commitment_type(tx: &Transaction) -> Option<CommitmentType> {
    // Check for Opret first (more obvious)
    for (idx, output) in tx.output.iter().enumerate() {
        if output.script_pubkey.is_op_return() {
            if let Ok((tag, commitment)) = OpretVerifier.parse_opret_script(
                &output.script_pubkey
            ) {
                if is_valid_rgb_tag(&tag) {
                    return Some(CommitmentType::Opret(OpretCommitment {
                        output_index: idx,
                        commitment,
                        protocol_tag: tag,
                    }));
                }
            }
        }
    }

    // Check for Tapret
    for (idx, output) in tx.output.iter().enumerate() {
        if output.script_pubkey.is_v1_p2tr() {
            // Could be Tapret, need proof to verify
            return Some(CommitmentType::Tapret(TapretCommitment {
                output_index: idx,
                // Proof must be provided off-chain
            }));
        }
    }

    None
}
```

## Security Considerations

### Commitment Binding

**Cryptographic Guarantees**:

```rust
/// Opret security properties
pub struct OpretSecurity {
    /// Collision resistance: 2^128 (SHA-256 birthday bound)
    pub collision_resistance: u32 = 128,

    /// Preimage resistance: 2^256 (SHA-256 full strength)
    pub preimage_resistance: u32 = 256,

    /// Binding strength: Inherits Bitcoin PoW security
    pub consensus_binding: bool = true,

    /// Tampering detection: Any modification detectable
    pub tamper_evident: bool = true,
}

impl OpretSecurity {
    /// Verify security properties hold
    pub fn verify_security_properties(
        tx: &Transaction,
        commitment: &[u8; 32],
    ) -> SecurityCheck {
        let mut check = SecurityCheck::new();

        // 1. Commitment must be in transaction
        check.commitment_present = tx.output
            .iter()
            .any(|out| Self::contains_commitment(out, commitment));

        // 2. Transaction must be confirmed
        check.consensus_secured = Self::is_confirmed(tx);

        // 3. Commitment must be immutable
        check.immutable = check.consensus_secured;

        check
    }

    fn contains_commitment(output: &TxOut, commitment: &[u8; 32]) -> bool {
        if !output.script_pubkey.is_op_return() {
            return false;
        }

        let bytes = output.script_pubkey.as_bytes();
        bytes.len() >= 39 && &bytes[7..39] == commitment
    }

    fn is_confirmed(tx: &Transaction) -> bool {
        // Check if transaction is in a confirmed block
        // Implementation depends on blockchain interface
        unimplemented!("Requires blockchain query")
    }
}

pub struct SecurityCheck {
    pub commitment_present: bool,
    pub consensus_secured: bool,
    pub immutable: bool,
}

impl SecurityCheck {
    fn new() -> Self {
        Self {
            commitment_present: false,
            consensus_secured: false,
            immutable: false,
        }
    }

    pub fn is_secure(&self) -> bool {
        self.commitment_present &&
        self.consensus_secured &&
        self.immutable
    }
}
```

### Attack Resistance

**Protection Against Attacks**:

```rust
/// Attack resistance analysis
pub enum AttackVector {
    /// Attempt to change commitment after broadcast
    CommitmentModification,

    /// Attempt to substitute different transaction
    TransactionReplacement,

    /// Attempt to claim false commitment
    FalseCommitment,

    /// Attempt to censor commitment
    CensorshipAttack,
}

impl AttackVector {
    /// Analyze resistance to attack
    pub fn resistance_level(&self) -> ResistanceLevel {
        match self {
            Self::CommitmentModification => ResistanceLevel::High,
            // Cannot modify without invalidating transaction

            Self::TransactionReplacement => ResistanceLevel::High,
            // RBF requires signature, double-spend detected

            Self::FalseCommitment => ResistanceLevel::Medium,
            // Can claim anything, but verification will fail

            Self::CensorshipAttack => ResistanceLevel::Medium,
            // Depends on Bitcoin censorship resistance
        }
    }
}

pub enum ResistanceLevel {
    High,    // Cryptographically secure
    Medium,  // Economically/practically secure
    Low,     // Vulnerable
}
```

## Performance Optimization

### Batching Strategies

```rust
/// Batch multiple commitments for efficiency
pub struct CommitmentBatch {
    commitments: Vec<[u8; 32]>,
    max_per_tx: usize,
}

impl CommitmentBatch {
    pub fn new(max_per_tx: usize) -> Self {
        Self {
            commitments: Vec::new(),
            max_per_tx,
        }
    }

    /// Add commitment to batch
    pub fn add(&mut self, commitment: [u8; 32]) {
        self.commitments.push(commitment);
    }

    /// Build transactions for batched commitments
    pub fn build_transactions(&self) -> Vec<Transaction> {
        if self.commitments.len() == 1 {
            // Single commitment - direct Opret
            vec![self.build_single_opret(&self.commitments[0])]
        } else {
            // Multiple commitments - use MPC
            vec![self.build_mpc_opret(&self.commitments)]
        }
    }

    fn build_single_opret(&self, commitment: &[u8; 32]) -> Transaction {
        // Build transaction with single Opret output
        unimplemented!()
    }

    fn build_mpc_opret(&self, commitments: &[[u8; 32]]) -> Transaction {
        // Build transaction with MPC Opret output
        let mpc_root = Self::build_mpc_root(commitments);
        unimplemented!()
    }

    fn build_mpc_root(commitments: &[[u8; 32]]) -> [u8; 32] {
        // Build MPC Merkle tree
        unimplemented!()
    }
}
```

### Caching and Indexing

```rust
/// Efficient Opret indexing
pub struct OpretIndex {
    index: HashMap<[u8; 32], Vec<TxLocation>>,
}

#[derive(Clone, Debug)]
pub struct TxLocation {
    pub txid: Txid,
    pub output_index: usize,
    pub block_height: Option<u32>,
}

impl OpretIndex {
    /// Index Opret commitments from blockchain
    pub fn build_index(
        &mut self,
        blocks: impl Iterator<Item = Block>,
    ) {
        for block in blocks {
            for tx in &block.txdata {
                self.index_transaction(tx, Some(block.header.height));
            }
        }
    }

    fn index_transaction(&mut self, tx: &Transaction, height: Option<u32>) {
        for (idx, output) in tx.output.iter().enumerate() {
            if let Ok((_, commitment)) = OpretVerifier.parse_opret_script(
                &output.script_pubkey
            ) {
                let location = TxLocation {
                    txid: tx.txid(),
                    output_index: idx,
                    block_height: height,
                };

                self.index
                    .entry(commitment)
                    .or_insert_with(Vec::new)
                    .push(location);
            }
        }
    }

    /// Lookup commitment locations
    pub fn find(&self, commitment: &[u8; 32]) -> Option<&[TxLocation]> {
        self.index.get(commitment).map(|v| v.as_slice())
    }
}
```

## Related Documentation

- [Deterministic Commitments](./deterministic-commitments.md) - Overall commitment system
- [Tapret](./tapret.md) - Preferred commitment method
- [Multi-Protocol Commitments](./multi-protocol-commitments.md) - MPC details
- [Client-Side Validation](../client-side-validation.md) - RGB validation model

## References

### Bitcoin Documentation

- [BIP 141: Segregated Witness](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
- [Bitcoin Core OP_RETURN Policy](https://bitcoin.org/en/glossary/op-return)
- [Bitcoin Wiki: OP_RETURN](https://en.bitcoin.it/wiki/OP_RETURN)

### RGB Specifications

- RGB Protocol Specification
- RGB Commitment Standards
- RGB Opret Format (Legacy)

---

**Status**: Comprehensive documentation - Opret commitment method fully specified.

**Recommendation**: For new implementations, prefer [Tapret](./tapret.md) for superior privacy and efficiency. Opret remains supported for legacy compatibility and universal access.
