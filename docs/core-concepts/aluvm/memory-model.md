---
sidebar_position: 3
title: Memory Model
description: AluVM memory architecture and access patterns
---

# AluVM Memory Model

AluVM implements a carefully designed memory model that balances expressiveness with security and determinism. Unlike general-purpose VMs, AluVM's memory architecture is specifically optimized for client-side validation with strict isolation and predictable behavior.

## Overview

The AluVM memory model is fundamentally different from traditional VM architectures. It's designed for **register-based computing** with **no dynamic heap allocation** and **strict memory segmentation**.

### Core Principles

The AluVM memory model provides:

- **Deterministic access patterns**: Guaranteed identical behavior across all platforms and implementations
- **Memory safety**: Automatic bounds checking on all memory accesses
- **Complete isolation**: Total separation from host system memory (sandbox security)
- **Predictability**: No dynamic allocation, no garbage collection, no unpredictable behavior
- **Efficiency**: Optimized for validation workloads on embedded and constrained devices
- **Register-centric**: Most operations work directly on registers, not memory

### Key Characteristics

**No Heap**: AluVM has no heap memory. All allocation is static and determined at program load time.

**No Pointers**: No arbitrary pointer arithmetic. Memory access is controlled through register-based addressing.

**No Garbage Collection**: No runtime memory management overhead.

**Stack-based Calls**: Function calls use a managed call stack (CS) with automatic overflow protection.

**Segmented Memory**: Memory is divided into distinct regions with different access permissions

## Register-Centric Architecture

### Registers as Primary Storage

**Unlike traditional VMs that rely heavily on memory, AluVM is register-centric.** Most computation occurs directly in registers without memory access.

### Register Categories

AluVM provides **256 total registers** across multiple types:

```
General Purpose Arithmetic Registers (128 registers):
├─ a8[0..31]    : 32 × 8-bit registers   (256 bytes total)
├─ a16[0..31]   : 32 × 16-bit registers  (512 bytes total)
├─ a32[0..31]   : 32 × 32-bit registers  (1 KB total)
└─ a64[0..31]   : 32 × 64-bit registers  (2 KB total)

Floating Point Registers (96 registers):
├─ f16[0..31]   : 32 × 16-bit IEEE 754   (512 bytes total)
├─ f32[0..31]   : 32 × 32-bit IEEE 754   (1 KB total)
└─ f64[0..31]   : 32 × 64-bit IEEE 754   (2 KB total)

Cryptographic/Wide Registers (128 registers):
├─ r128[0..31]  : 32 × 128-bit registers (4 KB total)
├─ r256[0..31]  : 32 × 256-bit registers (8 KB total)
├─ r512[0..31]  : 32 × 512-bit registers (16 KB total)
└─ r1024[0..31] : 32 × 1024-bit registers (32 KB total)

Total register file size: ~68 KB
```

**This register-heavy architecture minimizes memory access**, improving both performance and determinism.

## Memory Regions

AluVM memory is divided into **six distinct segments**, each with specific access permissions and purposes.

### Complete Memory Layout

```
AluVM Memory Map (Conceptual - actual addresses may vary by implementation)

┌─────────────────────────────────┐ 0x00000000
│   CODE SEGMENT                  │
│   ─────────────────────────     │ Permissions: Execute-only (no R/W)
│   • Program bytecode            │ Size: Up to 64 KB
│   • Instruction fetch only      │ Loaded: At program initialization
│   • Immutable after load        │ Content: AluVM instructions
│                                 │
├─────────────────────────────────┤ 0x00010000 (64 KB offset)
│   CONSTANT SEGMENT              │
│   ─────────────────────────     │ Permissions: Read-only
│   • Immutable constants         │ Size: Up to 64 KB
│   • Protocol identifiers        │ Loaded: At program initialization
│   • Magic numbers               │ Content: Static data
│   • Schema hashes               │
│                                 │
├─────────────────────────────────┤ 0x00020000 (128 KB offset)
│   STATIC DATA SEGMENT           │
│   ─────────────────────────     │ Permissions: Read/Write
│   • Global variables            │ Size: Up to 64 KB
│   • Persistent state            │ Initialized: Zeroed at startup
│   • Intermediate results        │ Content: Mutable program data
│   • Computation workspace       │
│                                 │
├─────────────────────────────────┤ 0x00030000 (192 KB offset)
│   CALL STACK (CS)               │
│   ─────────────────────────     │ Permissions: Read/Write (managed)
│   • Return addresses            │ Size: 192 KB maximum
│   • Stack frames                │ Managed by: CP register
│   • Local variables             │ Growth: Downward (by convention)
│   • Temporary storage           │ Overflow: Automatic detection
│                                 │
├─────────────────────────────────┤ 0x00060000 (384 KB offset)
│   INPUT SEGMENT                 │
│   ─────────────────────────     │ Permissions: Read-only
│   • Contract inputs             │ Size: Up to 1 MB
│   • Previous state              │ Loaded: Before execution
│   • Transaction data            │ Content: External data
│   • Witness data                │
│   • Proofs & signatures         │
│                                 │
├─────────────────────────────────┤ 0x00160000 (1.375 MB offset)
│   OUTPUT SEGMENT                │
│   ─────────────────────────     │ Permissions: Write-only
│   • Validation results          │ Size: Up to 256 KB
│   • New state commitments       │ Initialized: Zeroed
│   • Error codes                 │ Read by: Host after execution
│   • Diagnostic data             │ Content: Execution results
│                                 │
└─────────────────────────────────┘ 0x001A0000 (1.625 MB offset)

Total maximum memory: ~1.625 MB per execution instance
```

### Memory Region Details

**Summary Table**:

| Region | Base | Max Size | Permissions | Purpose |
|--------|------|----------|-------------|---------|
| Code | 0x00000000 | 64 KB | X (Execute) | Program instructions |
| Constants | 0x00010000 | 64 KB | R (Read) | Immutable data |
| Static | 0x00020000 | 64 KB | RW (Read/Write) | Global variables |
| Stack | 0x00030000 | 192 KB | RW (Managed) | Call frames |
| Input | 0x00060000 | 1 MB | R | Contract inputs |
| Output | 0x00160000 | 256 KB | W (Write) | Contract outputs |

### Code Segment - Executable Instructions

**Base Address**: 0x00000000 (conceptual)
**Maximum Size**: 64 KB (65,536 bytes)
**Permissions**: **Execute-only** (no read or write from program)
**Initialization**: Loaded at program start, immutable thereafter

#### Characteristics

- **Immutable**: Cannot be modified after program loading
- **Execute-only**: CPU fetches instructions; programs cannot read code as data
- **W^X enforced**: Writable XOR executable - code cannot be written to
- **No self-modifying code**: Security guarantee
- **Fixed at load**: Size determined when program is loaded

#### Contents

The code segment contains:
- AluVM bytecode instructions
- Jump target addresses
- Subroutine entry points
- Main program entry (typically at offset 0)

#### Usage Pattern

```asm
; Code segment is implicitly accessed during execution
; Program Counter (PC) points into this segment

routine MAIN:           ; Entry point at some offset
    call VALIDATE       ; Jump within code segment
    jif CK, ERROR      ; Conditional branch in code segment
    stop

routine VALIDATE:       ; Another offset in code segment
    ; ... validation logic ...
    ret

routine ERROR:
    fail CK
    stop
```

#### Security Properties

**No code injection**: Code cannot be modified at runtime, preventing:
- Return-oriented programming (ROP) attacks
- Code injection exploits
- Self-modifying malware

**Deterministic execution**: Identical code segment across all validators ensures consensus-free validation.

#### Size Limits

**64 KB maximum** is sufficient because:
- Most validation scripts are small (1-16 KB typical)
- Complex logic can use library calls
- Encourages modular design
- Prevents code bloat
- Ensures fast loading and validation

### Constant Segment - Immutable Data

**Base Address**: 0x00010000 (after code segment)
**Maximum Size**: 64 KB
**Permissions**: **Read-only**
**Initialization**: Loaded at program start with predefined values

#### Characteristics

- **Read-only**: Programs can read but never write
- **Initialized at load**: Values set when program loads
- **Shared constant pool**: Same constants available to all execution instances
- **No runtime allocation**: All constants defined statically
- **Deterministic**: Identical across all validators

#### Contents

Typical constant data:

```
Offset   | Type        | Example Value           | Purpose
─────────|─────────────|─────────────────────────|─────────────────────
0x0000   | u32         | 0x00524742 ("RGB\0")    | Magic number
0x0004   | r256        | [32-byte schema hash]   | Schema identifier
0x0024   | u64         | 21000000                | Max supply constant
0x002C   | r160        | [20-byte address]       | Treasury address
0x0040   | a32[8]      | [...threshold values]   | Validation thresholds
...      | ...         | ...                     | ...
```

#### Usage Examples

```asm
; Load RGB magic number for validation
load a32[0], const[0x0000]
; Compare with expected value
; (Assume comparison instruction)
; Sets CO if not equal
chk CO
jif CK, invalid_magic

; Load maximum supply
load a64[1], const[0x0024]
; Use in validation
; Compare amount with max supply

; Load schema hash for verification
load r256[0], const[0x0004]
; Verify against commitment
```

#### Typical Constants

**Protocol Identifiers**:
```
Magic numbers (4-8 bytes):
- Protocol version identifiers
- Network identifiers (mainnet/testnet)
- Contract type identifiers
```

**Cryptographic Constants**:
```
Hashes (32 bytes):
- Genesis hash
- Schema commitment hashes
- Standard library hashes

Public keys (32 bytes):
- Treasury keys
- Governance keys
- Standard validation keys
```

**Numeric Constants**:
```
Limits and thresholds:
- Maximum supply values
- Minimum/maximum amounts
- Fee constants
- Time constants (block heights, timestamps)
```

**Configuration Data**:
```
Contract parameters:
- Decimal precision
- Transfer limits
- Validation parameters
```

#### Benefits

1. **Code reuse**: Common constants shared across contract instances
2. **Smaller code**: Constants not embedded in instructions
3. **Easy updates**: Constants can be changed without recompiling logic
4. **Clarity**: Named constant offsets more readable than magic numbers
5. **Security**: Read-only prevents accidental or malicious modification

### Static Data Segment - Global Variables

**Base Address**: 0x00020000 (after constants)
**Maximum Size**: 64 KB
**Permissions**: **Read/Write**
**Initialization**: **Zero-filled** at program start

#### Characteristics

- **Read/write**: Full read and write access from program
- **Persistent across calls**: Survives function calls (unlike stack locals)
- **Zero-initialized**: Always starts as all zeros (security property)
- **Fixed size**: Allocated at load time, no dynamic growth
- **Global scope**: Accessible from any part of the program

#### Purpose

Static data serves as:
- **Global variables**: Shared state across functions
- **Computation workspace**: Temporary storage for complex calculations
- **Intermediate results**: Multi-step computation storage
- **Validation state**: Accumulating validation results
- **Counters and flags**: Loop counters, state flags

#### Usage Examples

**Counter Management**:
```asm
; Increment global counter
; Offset 0x0000 = iteration_counter (8 bytes)

load a64[0], static[0x0000]      ; Load current counter
add a64[0], a64[0], a64[1]       ; Add increment
store static[0x0000], a64[0]     ; Store back
```

**Validation State Accumulation**:
```asm
; Track validation results
; Offset 0x0010 = validation_flags (1 byte)

load a8[0], static[0x0010]       ; Load current flags
or a8[0], a8[0], a8[1]           ; Combine with new flag
store static[0x0010], a8[0]      ; Store updated flags
```

**Multi-Step Computation**:
```asm
; Calculate complex value across multiple steps
; Offset 0x0020 = intermediate_result (32 bytes)

; Step 1: Calculate partial result
sha256 r256[0], r256[1], 32
store static[0x0020], r256[0]    ; Store intermediate

; ... other operations ...

; Step 2: Load and continue computation
load r256[0], static[0x0020]     ; Load intermediate
; Continue calculation
```

**Accumulator Pattern**:
```asm
; Sum values in loop
; Offset 0x0100 = accumulator (8 bytes)

; Initialize accumulator to 0 (already zero at start)

loop:
    load a64[5], static[0x0100]  ; Load current sum
    add a64[5], a64[5], a64[6]   ; Add new value
    store static[0x0100], a64[5] ; Store sum
    ; ... loop logic ...
    jif CO, +loop

; Final sum in static[0x0100]
```

#### Layout Convention

Typical static data organization:

```
Static Segment Layout Example:

0x0000-0x000F : Counters (16 bytes)
  ├─ 0x0000: iteration_count (u64)
  └─ 0x0008: failure_count (u64)

0x0010-0x001F : Flags (16 bytes)
  ├─ 0x0010: validation_flags (u8)
  ├─ 0x0011: processing_stage (u8)
  └─ 0x0012-0x001F: reserved

0x0020-0x00FF : Intermediate results (224 bytes)
  ├─ 0x0020: temp_hash (r256, 32 bytes)
  ├─ 0x0040: temp_signature (r512, 64 bytes)
  └─ 0x0080: calculation_buffer (128 bytes)

0x0100-0x01FF : Accumulators (256 bytes)
  ├─ 0x0100: total_amount (u64)
  ├─ 0x0108: total_fees (u64)
  └─ 0x0110: other accumulators

0x0200-0xFFFF : Application-specific data
```

#### Benefits

1. **No heap management**: Static allocation eliminates GC overhead
2. **Deterministic**: Fixed layout ensures reproducibility
3. **Fast access**: Direct addressing, no indirection
4. **Zero-initialized**: Prevents uninitialized data exploits
5. **Bounded**: 64 KB limit prevents memory exhaustion

#### Security Considerations

**Zero initialization** prevents:
- Information leakage from previous executions
- Uninitialized variable exploits
- Non-deterministic behavior from random memory contents

**Fixed size** prevents:
- Denial-of-service through memory exhaustion
- Unbounded memory growth
- Resource exhaustion attacks

**Bounds checking** prevents:
- Buffer overflow attacks
- Out-of-bounds writes
- Memory corruption

### Call Stack Segment (CS) - Function Calls

**Base Address**: 0x00030000 (after static data)
**Maximum Size**: **192 KB** (196,608 bytes)
**Permissions**: **Read/Write** (managed by VM)
**Management**: Automatic via **CP** (Call Pointer) register

#### Characteristics

- **LIFO structure**: Last In, First Out (stack semantics)
- **Automatic management**: VM manages push/pop on call/ret
- **Overflow protection**: Automatic halt if stack exceeds 192 KB
- **Underflow protection**: Automatic halt if return from empty stack
- **Growth direction**: Typically downward (high→low addresses)
- **Frame-based**: Each function call creates a stack frame

#### Purpose

The call stack manages:
- **Return addresses**: Where to return after function call
- **Stack frames**: Function call context
- **Library context**: Tracking cross-library calls
- **Call depth**: Prevents infinite recursion

#### Stack Frame Structure

```
Stack Frame Layout (per function call):

High Address (older frames)
┌───────────────────────────┐
│  Previous Stack Frame     │
├───────────────────────────┤ ← Frame boundary
│  Return Address (2 bytes) │  u16 position in code
├───────────────────────────┤
│  Return Library (32 bytes)│  LibId hash (if external call)
│  (optional)                │  Only for cross-library calls
├───────────────────────────┤
│  Saved Registers          │  (if needed by convention)
│  (variable size)           │
├───────────────────────────┤
│  Local Variables          │  Function-specific data
│  (variable size)           │
├───────────────────────────┤
│  Temporary Space          │  Intermediate calculations
│  (variable size)           │
└───────────────────────────┘ ← CP (Call Pointer)
Low Address (current frame)
```

#### Call Stack Operations

**CALL Instruction** (local):
```asm
; Before call:
; CP = 0x0050 (current stack position)
; PC = 0x0100 (current instruction position)

call 0x0200         ; Call subroutine at 0x0200

; VM operations (automatic):
; 1. stack[CP] = PC + 3 (return address = 0x0103)
; 2. CP = CP + 2 (increment pointer by 2 bytes)
; 3. PC = 0x0200 (jump to subroutine)

; After call:
; CP = 0x0052
; PC = 0x0200
; stack[0x0050:0x0051] = 0x0103 (return address)
```

**CALL Instruction** (library):
```asm
; Call external library
call LIB_HASH, 0x0000

; VM operations:
; 1. stack[CP:CP+1] = return_position (2 bytes)
; 2. stack[CP+2:CP+33] = current_library_id (32 bytes)
; 3. CP = CP + 34
; 4. Switch to library LIB_HASH
; 5. PC = 0x0000 (in new library)

; Total stack frame: 34 bytes for library call
```

**RET Instruction**:
```asm
; Before ret:
; CP = 0x0052
; stack[0x0050:0x0051] = 0x0103 (return address)

ret

; VM operations:
; 1. return_addr = stack[CP-2:CP-1]
; 2. If library call: restore library context
; 3. CP = CP - frame_size
; 4. PC = return_addr

; After ret:
; CP = 0x0050
; PC = 0x0103
```

#### Usage Patterns

**Simple Function Call**:
```asm
routine MAIN:
    ; Setup arguments in registers
    ; a64[0] = argument 1
    ; a64[1] = argument 2

    call CALCULATE      ; Push return address, jump

    ; Execution resumes here after CALCULATE returns
    ; Result in a64[0] (by convention)
    stop

routine CALCULATE:
    ; Function body
    ; Perform calculation
    ; Store result in a64[0]

    ret                 ; Pop return address, jump back
```

**Nested Calls**:
```asm
routine MAIN:
    call LEVEL1
    stop

routine LEVEL1:
    call LEVEL2         ; Nested call
    ret

routine LEVEL2:
    call LEVEL3         ; Deeper nesting
    ret

routine LEVEL3:
    ; Deepest level
    ret                 ; Unwind begins here
```

**Stack Depth Example**:
```
After MAIN calls LEVEL1 calls LEVEL2 calls LEVEL3:

Stack contents:
0x0050: return_to_MAIN (from LEVEL1's call)
0x0052: return_to_LEVEL1 (from LEVEL2's call)
0x0054: return_to_LEVEL2 (from LEVEL3's call)
CP = 0x0056

Maximum nesting with 192 KB stack:
192 KB / 2 bytes per return = 98,304 possible call frames
```

#### Stack Limits

**Maximum Size**: 192 KB

**Practical Limits**:
- **Simple calls**: 2 bytes per frame → ~98,000 max call depth
- **Library calls**: 34 bytes per frame → ~5,800 max call depth
- **Mixed calls**: Varies based on call type distribution

**Overflow Detection**:
```
On each CALL:
  if (CP + frame_size > STACK_MAX):
    halt with "stack overflow"
```

**Underflow Detection**:
```
On each RET:
  if (CP < STACK_BASE):
    halt with "stack underflow"
```

#### Security Properties

**Automatic management** prevents:
- Stack smashing attacks
- Return address corruption
- Arbitrary code execution via stack

**Bounds checking** prevents:
- Stack overflow exploits
- Stack underflow bugs
- Unbounded recursion

**Deterministic behavior**:
- Same stack layout across all validators
- Reproducible execution traces
- Consensus-free validation

### Input Segment - Contract Inputs

**Base Address**: 0x00060000 (after stack)
**Maximum Size**: **1 MB** (1,048,576 bytes)
**Permissions**: **Read-only** (from program perspective)
**Initialization**: Loaded by host before execution

#### Characteristics

- **Read-only**: Programs can only read, never write
- **External data**: Populated by host/caller before VM execution
- **Validation source**: Contains all data needed for validation
- **Large capacity**: 1 MB accommodates complex contracts
- **Structured data**: Typically organized by schema

#### Purpose

The input segment contains all external data required for validation:
- **Previous state**: State commitments from prior transitions
- **Transaction data**: Transfer amounts, recipients, etc.
- **Witness data**: Proofs, signatures, auxiliary data
- **Context**: Block height, timestamp, etc.
- **Contract-specific**: Custom input data per contract type

#### Contents Structure

Typical input segment organization for RGB contract:

```
Input Segment Layout (Example):

0x0000-0x001F : Contract metadata (32 bytes)
  ├─ 0x0000: schema_id (32 bytes, r256)

0x0020-0x003F : State commitments (32 bytes)
  ├─ 0x0020: previous_state_hash (32 bytes)

0x0040-0x0047 : Transfer data (8 bytes)
  ├─ 0x0040: amount (u64)

0x0048-0x0067 : Sender data (32 bytes)
  ├─ 0x0048: sender_pubkey (32 bytes, secp256k1 x-only)

0x0068-0x00A7 : Signature (64 bytes)
  ├─ 0x0068: signature (64 bytes, r512)

0x00A8-0x00C7 : Message hash (32 bytes)
  ├─ 0x00A8: msg_hash (32 bytes)

0x00C8-... : Additional data
  ├─ Merkle proofs
  ├─ Multi-signature data
  ├─ Contract-specific fields
  └─ ... (up to 1 MB total)
```

#### Usage Examples

**Reading Transfer Amount**:
```asm
; Load 64-bit transfer amount from input offset 0x0040
load a64[0], input[0x0040]

; Validate amount > 0
; (Comparison logic)
chk CO
jif CK, invalid_amount
```

**Loading Signature Data**:
```asm
; Load public key (32 bytes at offset 0x0048)
load r256[0], input[0x0048]

; Load signature (64 bytes at offset 0x0068)
load r512[1], input[0x0068]

; Load message hash (32 bytes at offset 0x00A8)
load r256[2], input[0x00A8]

; Verify signature
secp256k1_verify r256[0], r512[1], r256[2]
jif CK, invalid_signature
```

**Reading State Commitment**:
```asm
; Load previous state hash for verification
load r256[10], input[0x0020]

; Compare with expected value
; (Comparison and validation logic)
```

**Multi-Value Reading**:
```asm
; Read multiple related values
load a64[0], input[0x0100]   ; Value 1
load a64[1], input[0x0108]   ; Value 2
load a64[2], input[0x0110]   ; Value 3

; Sum values
add a64[0], a64[0], a64[1]
add a64[0], a64[0], a64[2]

; Validate total
```

#### Schema-Driven Layout

RGB contracts use schemas to define input layout:

```rust
// Example schema definition (conceptual)
schema TokenTransfer {
    // Offset 0x0000
    schema_id: [u8; 32],

    // Offset 0x0020
    previous_state: CommitmentHash,

    // Offset 0x0040
    amount: u64,

    // Offset 0x0048
    sender_pubkey: Secp256k1Point,

    // Offset 0x0068
    signature: Signature,

    // Offset 0x00A8
    message: [u8; 32],
}
```

AluVM code accesses fields by known offsets.

#### Benefits

**Large capacity** (1 MB) supports:
- Complex contracts with many inputs
- Large Merkle proofs
- Multi-signature schemes (many keys)
- Rich witness data
- Batched operations

**Read-only semantics** ensure:
- Inputs cannot be tampered with during execution
- Deterministic validation (same inputs → same result)
- No feedback loops or mutations
- Security against input modification attacks

**Structured access** enables:
- Type-safe field access (via schemas)
- Efficient validation
- Clear separation of concerns
- Reusable validation patterns

#### Security Considerations

**Input validation** is critical:
```asm
; Always validate input bounds and formats
; Example: Validate amount is not zero

load a64[0], input[0x0040]
; Check amount > 0 (implementation specific)
jif CK, error_zero_amount
```

**No trust assumptions**:
- All input data is untrusted
- Must validate all fields
- Must check bounds
- Must verify signatures
- Must validate proofs

**Deterministic parsing**:
- Same input bytes must parse identically on all validators
- No platform-specific parsing
- No undefined behavior on malformed inputs

### Output Segment - Contract Outputs

**Base Address**: 0x00160000 (after input segment)
**Maximum Size**: **256 KB** (262,144 bytes)
**Permissions**: **Write-only** (from program perspective)
**Initialization**: Zero-filled at program start
**Read by**: Host environment after execution completes

#### Characteristics

- **Write-only**: Programs can only write, cannot read back
- **Zero-initialized**: Starts as all zeros (security)
- **Results storage**: Where execution results are placed
- **Host-readable**: Host reads after execution to get results
- **Bounded size**: 256 KB maximum

#### Purpose

The output segment is where programs write:
- **Validation results**: Success/failure indicators
- **New state commitments**: Updated state hashes
- **Error codes**: Detailed failure reasons
- **Output values**: Transfer amounts, new balances, etc.
- **Diagnostic data**: Debug information (if enabled)
- **State transitions**: New state data

#### Contents Structure

Typical output segment layout:

```
Output Segment Layout (Example):

0x0000-0x0000 : Validation result (1 byte)
  └─ 0x0000: result (u8: 0=success, 1=failure)

0x0001-0x0001 : Error code (1 byte)
  └─ 0x0001: error_code (u8: specific error if failed)

0x0002-0x0021 : New state commitment (32 bytes)
  └─ 0x0002: new_state_hash (r256)

0x0022-0x0029 : Output amount (8 bytes)
  └─ 0x0022: output_amount (u64)

0x002A-0x0049 : Recipient data (32 bytes)
  └─ 0x002A: recipient_pubkey (r256)

0x004A-... : Additional outputs
  └─ Contract-specific output data
```

#### Usage Examples

**Writing Validation Result**:
```asm
routine MAIN:
    call VALIDATE
    jif CK, .failure

    ; Success case
    ; Store success result (0) at offset 0x0000
    ; (Using immediate load and store - simplified)
    ; Actual implementation would use proper instructions
    ; store output[0x0000], 0x00

    stop

.failure:
    ; Failure case
    ; Store failure result (1) at offset 0x0000
    ; store output[0x0000], 0x01

    ; Store error code at offset 0x0001
    ; store output[0x0001], error_code

    stop
```

**Writing State Commitment**:
```asm
; Calculate new state hash
sha256 r256[0], r256[1], 64    ; Hash new state data

; Write to output segment at offset 0x0002
store output[0x0002], r256[0]
```

**Writing Multiple Outputs**:
```asm
; Write transfer outputs
; Recipient 1
store output[0x0100], a64[10]  ; Amount
store output[0x0108], r256[11] ; Recipient address

; Recipient 2
store output[0x0150], a64[12]  ; Amount
store output[0x0158], r256[13] ; Recipient address
```

**Error Code Reporting**:
```asm
; Define error codes as constants
; ERROR_INVALID_AMOUNT = 0x01
; ERROR_INVALID_SIGNATURE = 0x02
; ERROR_INSUFFICIENT_BALANCE = 0x03

routine ERROR_HANDLER:
    ; Assume error code in a8[31]

    ; Store error code
    store output[0x0001], a8[31]

    ; Set failure flag
    ; store output[0x0000], 0x01

    fail CK
    stop
```

#### Output Processing by Host

After execution completes, the host reads the output segment:

```rust
// Pseudo-code for host processing
fn process_execution_result(vm: &AluVM) -> Result<ContractState> {
    let output = vm.read_output_segment();

    // Read validation result
    let success = output[0] == 0;

    if !success {
        // Read error code
        let error_code = output[1];
        return Err(ValidationError::from_code(error_code));
    }

    // Read new state commitment
    let new_state = output[2..34].try_into()?;

    // Read output amount
    let amount = u64::from_le_bytes(output[34..42].try_into()?);

    // Create new state object
    Ok(ContractState {
        commitment: new_state,
        amount,
        // ... other fields
    })
}
```

#### Benefits

**Write-only semantics** provide:
- **No read-back**: Programs cannot read their own outputs (prevents feedback loops)
- **Unidirectional data flow**: Clear input → processing → output
- **Security**: Outputs cannot influence execution
- **Determinism**: No state-dependent writes

**Structured output** enables:
- **Schema-driven**: Outputs follow defined schemas
- **Type-safe**: Host can safely parse outputs
- **Extensible**: New fields can be added
- **Versioned**: Schema versions support evolution

#### Common Output Patterns

**Success/Failure Pattern**:
```asm
; Standard result format
; output[0] = 0 (success) or 1 (failure)
; output[1] = error_code (if failure)
; output[2..] = data (if success)

success:
    ; store output[0], 0
    ; ... write success data ...
    stop

failure:
    ; store output[0], 1
    ; store output[1], error_code
    stop
```

**State Transition Pattern**:
```asm
; Write new state after validation
routine FINALIZE:
    ; Calculate new state hash
    sha256 r256[0], r256[10], 128

    ; Write state commitment
    store output[STATE_OFFSET], r256[0]

    ; Write success
    ; store output[0], 0

    stop
```

**Multi-Output Pattern**:
```asm
; Multiple outputs (e.g., UTXO-style)
; Output 1: offset 0x0100
; Output 2: offset 0x0200
; Output 3: offset 0x0300

    store output[0x0100], a64[0]  ; Amount 1
    store output[0x0200], a64[1]  ; Amount 2
    store output[0x0300], a64[2]  ; Amount 3
```

#### Security Considerations

**Zero initialization** prevents:
- Information leakage from previous executions
- Uninitialized output exploits
- Non-deterministic output data

**Write-only access** prevents:
- Output-dependent execution paths
- Feedback attacks
- Non-deterministic behavior

**Bounded size** prevents:
- Output flooding attacks
- Resource exhaustion
- DoS via large outputs

**Host validation** ensures:
- Outputs match expected schema
- All required fields present
- No malformed data
- Type safety maintained

## Memory Access

### Load Operations

*To be expanded: Reading from memory*

**Syntax**: `load destReg, [address]`

**Behavior**:
1. Check address bounds
2. Check read permission
3. Load value into register
4. Set error flag on violation

**Example**:
```asm
load a64[0], [0x1000]      ; Load 64-bit value
load a32[1], [static+0x10] ; Load with offset
```

**Alignment**: No alignment requirements (handles unaligned access).

### Store Operations

*To be expanded: Writing to memory*

**Syntax**: `store [address], srcReg`

**Behavior**:
1. Check address bounds
2. Check write permission
3. Store register value
4. Set error flag on violation

**Example**:
```asm
store [0x2000], a64[0]     ; Store 64-bit value
store [static+0x20], a32[1] ; Store with offset
```

### Indexed Access

*To be expanded: Array-style access*

**Syntax**: `load destReg, [base + index * size]`

**Example**:
```asm
; Access array element
loadimm a32[0], 5           ; Index 5
loadimm a32[1], 8           ; Element size 8 bytes
mul a32[2], a32[0], a32[1] ; Calculate offset
load a64[3], [array_base + a32[2]]
```

### Bounds Checking

*To be expanded: Memory safety guarantees*

All memory accesses are bounds-checked:

```
if (address < segment_start ||
    address + size > segment_end) {
    set_error_flag();
    halt();
}
```

**No buffer overruns**: Impossible by design
**No wild pointers**: All addresses validated
**Deterministic errors**: Same behavior on all platforms

## Memory Permissions

### Permission Model

*To be expanded: Access control system*

Each memory region has permissions:

| Region | Read | Write | Execute |
|--------|------|-------|---------|
| Code | ✗ | ✗ | ✓ |
| Constant | ✓ | ✗ | ✗ |
| Static | ✓ | ✓ | ✗ |
| Stack | ✓ | ✓ | ✗ |
| Input | ✓ | ✗ | ✗ |
| Output | ✗ | ✓ | ✗ |

**W^X (Write XOR Execute)**: Memory is either writable or executable, never both.

### Permission Violations

*To be expanded: Handling permission errors*

Attempting invalid access:
1. Sets error flag
2. Optionally logs violation
3. Halts execution
4. Returns error to host

No undefined behavior - all violations are caught.

## Stack Management

### Stack Operations

*To be expanded: Stack manipulation*

#### Push Operation

```asm
push srcReg
```

**Behavior**:
1. Decrement stack pointer
2. Store register value at stack pointer
3. Check for stack overflow

#### Pop Operation

```asm
pop destReg
```

**Behavior**:
1. Load value at stack pointer into register
2. Increment stack pointer
3. Check for stack underflow

### Call Frames

*To be expanded: Function call convention*

**Frame creation** (on CALL):
1. Push return address
2. Push previous frame pointer
3. Set new frame pointer
4. Allocate local variables

**Frame destruction** (on RET):
1. Restore previous frame pointer
2. Restore return address
3. Jump to return address
4. Deallocate frame

**Example**:
```asm
function:
    ; Prologue
    push fp          ; Save frame pointer
    mov fp, sp       ; New frame pointer
    sub sp, sp, 32   ; Allocate 32 bytes for locals

    ; Function body
    ; ...

    ; Epilogue
    mov sp, fp       ; Deallocate locals
    pop fp           ; Restore frame pointer
    ret              ; Return
```

### Stack Limits

*To be expanded: Preventing stack overflow*

- Maximum depth: 256 frames
- Maximum size: 16 KB
- Overflow detection: Automatic
- Recursion limit: Enforced by depth

## Memory Initialization

### Startup State

*To be expanded: Initial memory state*

Before execution begins:

1. **Code segment**: Loaded with bytecode
2. **Constant segment**: Loaded with constants
3. **Static segment**: Zeroed
4. **Stack**: Empty (pointer at top)
5. **Input**: Loaded with contract inputs
6. **Output**: Zeroed

### Zero Initialization

*To be expanded: Default initialization*

All writable memory starts as zeros:
- Prevents information leakage
- Deterministic initial state
- No uninitialized reads
- Security hardening

## Memory Limits

### Size Constraints

*To be expanded: Maximum sizes*

| Region | Maximum Size | Typical Size |
|--------|--------------|--------------|
| Code | 64 KB | 4-16 KB |
| Constants | 64 KB | 1-4 KB |
| Static | 64 KB | 1-8 KB |
| Stack | 16 KB | 2-4 KB |
| Input | 1 MB | 1-100 KB |
| Output | 256 KB | 1-10 KB |

**Total**: ~1.5 MB maximum per execution

### Rationale

*To be expanded: Why these limits*

- **Embedded devices**: Must run on constrained hardware
- **Determinism**: Fixed limits ensure predictability
- **DoS prevention**: Prevents memory exhaustion attacks
- **Validation speed**: Smaller memory = faster validation

## Memory Safety Features

### Buffer Overflow Prevention

*To be expanded: Preventing buffer overruns*

- All accesses bounds-checked
- Array indexing validated
- Pointer arithmetic controlled
- No unchecked writes

**Result**: Buffer overflows are impossible.

### Use-After-Free Prevention

*To be expanded: Preventing dangling pointers*

- No dynamic allocation (no free operation)
- No pointers to deallocated memory
- Stack frames automatically managed
- Lifetime management by design

**Result**: Use-after-free is impossible.

### Type Safety

*To be expanded: Type-safe memory access*

- Strict typing enforced
- No type punning
- Controlled type conversions
- Size-aware operations

**Result**: Type confusion attacks prevented.

## Determinism Guarantees

### Cross-Platform Consistency

*To be expanded: Ensuring identical behavior*

Memory behavior is identical across:
- Different CPU architectures (x86, ARM, etc.)
- Different operating systems
- Different implementations
- Different compiler versions

**Achieved through**:
- Fixed memory layout
- Defined byte ordering (little-endian)
- Explicit alignment rules
- No platform-specific features

### Reproducibility

*To be expanded: Repeatable execution*

Same inputs always produce:
- Same memory state
- Same execution path
- Same outputs
- Same error conditions

**Required for**:
- Client-side validation
- Independent verification
- Audit and compliance
- Consensus-free operation

## Performance Optimization

### Access Patterns

*To be expanded: Efficient memory usage*

**Best practices**:
- Sequential access preferred
- Locality of reference
- Minimize memory operations
- Register allocation

**Avoiding**:
- Random access patterns
- Sparse data structures
- Excessive indirection
- Unnecessary loads/stores

### Caching Considerations

*To be expanded: Cache-friendly code*

While AluVM doesn't expose caches, efficient patterns:
- Access data in order
- Reuse loaded values in registers
- Group related data
- Minimize working set size

## Security Considerations

### Isolation

*To be expanded: Memory isolation guarantees*

AluVM memory is completely isolated from:
- Host process memory
- Other AluVM instances
- File system
- Network
- System calls

**Sandbox escape**: Impossible by design.

### Side Channels

*To be expanded: Side-channel resistance*

**Timing attacks**:
- Constant-time cryptographic operations
- Predictable instruction timing
- No data-dependent branches in sensitive code

**Memory access patterns**:
- No information leakage via access patterns
- Controlled observable behavior

### Information Leakage

*To be expanded: Preventing data leakage*

- Output segment write-only from script
- Input segment can't be reflected to output (must be processed)
- Zero initialization prevents residual data
- No debugging interfaces in production

## Usage Examples

### Example: Array Processing

*To be expanded: Working with arrays*

```asm
; Sum array of 10 elements
    loadimm a32[0], 0      ; sum = 0
    loadimm a32[1], 0      ; i = 0
    loadimm a32[2], 10     ; count = 10
    loadimm a64[3], array_base  ; array pointer

.loop:
    cmp a32[1], a32[2]     ; i < count?
    jge .done

    ; Calculate offset: i * 8
    loadimm a32[4], 8
    mul a32[5], a32[1], a32[4]

    ; Load array[i]
    add a64[6], a64[3], a32[5]
    load a32[7], [a64[6]]

    ; sum += array[i]
    add a32[0], a32[0], a32[7]

    ; i++
    inc a32[1]
    jmp .loop

.done:
    ; Store result
    store [output], a32[0]
    ret
```

### Example: Stack-Based Calculation

*To be expanded: Using the stack*

```asm
; Calculate factorial using stack
factorial:
    ; Save registers
    push a64[0]
    push a64[1]

    ; Base case: n <= 1
    loadimm a64[1], 1
    cmp a64[0], a64[1]
    jle .base_case

    ; Recursive case: n * factorial(n-1)
    dec a64[0]
    call factorial
    inc a64[0]
    mul a64[0], a64[0], a64[1]
    jmp .done

.base_case:
    loadimm a64[0], 1

.done:
    ; Restore registers
    pop a64[1]
    pop a64[0]
    ret
```

## Memory Access Patterns

### Safe Memory Access

All memory access in AluVM is bounds-checked and permission-checked.

#### Load Operation

```asm
; Syntax: load destReg, segment[offset]

; Example: Load from input segment
load a64[0], input[0x0040]

; VM checks (automatic):
; 1. Is offset within input segment bounds?
; 2. Does input segment have read permission? (yes)
; 3. Is register size compatible with loaded data?
; If any check fails: set CK, halt execution
```

#### Store Operation

```asm
; Syntax: store segment[offset], srcReg

; Example: Store to static segment
store static[0x0100], a64[5]

; VM checks (automatic):
; 1. Is offset within static segment bounds?
; 2. Does static segment have write permission? (yes)
; 3. Is register size compatible?
; If any check fails: set CK, halt execution
```

### Permission Matrix

Complete permission table for all segments:

| Segment | Read | Write | Execute | From Program | From Host |
|---------|------|-------|---------|--------------|-----------|
| Code | ✗ | ✗ | ✓ | Execute only | Load/Read |
| Constants | ✓ | ✗ | ✗ | Read only | Load/Read |
| Static | ✓ | ✓ | ✗ | Read/Write | Read after exec |
| Stack | ✓ | ✓ | ✗ | Managed RW | Read after exec |
| Input | ✓ | ✗ | ✗ | Read only | Write before exec |
| Output | ✗ | ✓ | ✗ | Write only | Read after exec |

**W^X Enforcement**: Memory is either writable or executable, never both (prevents code injection).

### Memory Access Examples

**Cross-Segment Access**:
```asm
; Load constant, process, store to output

load a64[0], const[0x0000]      ; Read from constants
; Process value
; ...
store output[0x0100], a64[0]    ; Write to output
```

**Input Processing Pipeline**:
```asm
; Read input → validate → write output

routine PROCESS:
    ; Read from input
    load r256[0], input[0x0000]

    ; Validate (hash check)
    sha256 r256[1], r256[0], 32
    load r256[2], const[EXPECTED_HASH]
    ; Compare r256[1] with r256[2]
    ; (comparison logic)
    chk CO
    jif CK, invalid

    ; Write result to output
    store output[0x0000], r256[1]
    ret

routine invalid:
    fail CK
    ret
```

## Memory Safety Guarantees

### Automatic Bounds Checking

Every memory access is automatically bounds-checked:

```rust
// Pseudo-code for VM memory access
fn load_memory(segment: Segment, offset: usize, size: usize) -> Result<Value> {
    // Check bounds
    if offset + size > segment.size() {
        return Err(MemoryError::OutOfBounds);
    }

    // Check permissions
    if !segment.permissions().read {
        return Err(MemoryError::PermissionDenied);
    }

    // Perform load
    Ok(segment.read(offset, size))
}
```

**Result**: Buffer overflows are impossible.

### No Use-After-Free

**No dynamic allocation** means:
- No `malloc`/`free` operations
- No heap memory
- No memory deallocation during execution
- No dangling pointers

**Result**: Use-after-free bugs are impossible.

### No Uninitialized Reads

All writable segments are **zero-initialized**:
- Static segment: Zeroed at program start
- Stack: Zeroed before first use
- Output segment: Zeroed at program start

**Result**: No undefined behavior from uninitialized memory.

### Type Safety

Registers have explicit types (a8, a16, a32, a64, r256, etc.). The VM enforces:
- **Size matching**: Cannot load 64-bit value into 8-bit register
- **Type consistency**: Float and integer registers are distinct
- **No type punning**: No reinterpreting bytes as different types

**Result**: Type confusion attacks prevented.

## Determinism Guarantees

### Cross-Platform Consistency

Memory behavior is identical across all platforms:

**Little-endian byte order**: All multi-byte values use little-endian encoding
**Fixed layout**: Memory map is identical on x86, ARM, RISC-V, etc.
**No padding**: Structures have no platform-specific padding
**No undefined behavior**: All operations fully specified

**Result**: Same bytecode produces same result on any platform.

### Reproducible Execution

Same inputs always produce:
- Same memory state at each step
- Same execution trace
- Same outputs
- Same error conditions

**Critical for**:
- Client-side validation (all validators must agree)
- Audit and compliance
- Independent verification
- Consensus-free operation

## Performance Optimization

### Register-First Programming

**Best practice**: Keep frequently used values in registers, not memory.

```asm
; GOOD: Register-based
routine SUM_VALUES:
    ; Keep running total in register
    ; a64[0] = accumulator
    ; Loop and accumulate in register
    ; Only store final result
    ret

; BAD: Memory-based
routine SUM_VALUES_SLOW:
    ; Load from memory
    ; Add
    ; Store to memory
    ; (Repeat in loop - very slow)
    ret
```

**Benefit**: Register access is ~100x faster than memory access.

### Sequential Access

**Preferred**: Sequential memory access (better cache utilization).

```asm
; GOOD: Sequential access
    load a64[0], input[0x0000]
    load a64[1], input[0x0008]
    load a64[2], input[0x0010]
    load a64[3], input[0x0018]

; POOR: Random access
    load a64[0], input[0x1000]
    load a64[1], input[0x0100]
    load a64[2], input[0x5000]
    load a64[3], input[0x0200]
```

### Minimize Memory Operations

```asm
; GOOD: Compute in registers
    load a64[0], input[0x0000]
    load a64[1], input[0x0008]
    add a64[2], a64[0], a64[1]
    mul a64[3], a64[2], a64[2]
    ; ... more register operations ...
    store output[0x0000], a64[3]

; BAD: Intermediate memory stores
    load a64[0], input[0x0000]
    load a64[1], input[0x0008]
    add a64[2], a64[0], a64[1]
    store static[0x0000], a64[2]  ; Unnecessary
    load a64[2], static[0x0000]   ; Unnecessary
    mul a64[3], a64[2], a64[2]
```

## Security Hardening

### Sandbox Isolation

AluVM memory is completely isolated from:
- **Host process memory**: Cannot access VM host memory
- **Other AluVM instances**: Each execution has separate memory
- **File system**: No file I/O capabilities
- **Network**: No network access
- **System calls**: No syscall interface

**Result**: Sandbox escape is impossible.

### Side-Channel Resistance

**Constant-time operations**: Cryptographic instructions use constant-time implementations to prevent timing attacks.

**No data-dependent branches** in security-critical code:
```asm
; GOOD: Constant-time (simplified)
    ; Always perform same operations
    ; regardless of secret data

; BAD: Data-dependent
    ; if secret_bit:
    ;     do_expensive_operation()
    ; else:
    ;     do_cheap_operation()
    ; (Timing difference leaks information)
```

### Memory Zeroing

**Zero on initialize**: All writable segments start zeroed.
**Zero on allocate**: Stack frames zeroed before use.

**Prevents**:
- Information leakage between executions
- Uninitialized data exploits
- Residual data exposure

## Practical Examples

### Example: Token Balance Validation

```asm
; Validate token transfer
; Inputs:
;   input[0x0000] = sender_balance (u64)
;   input[0x0008] = transfer_amount (u64)
; Outputs:
;   output[0x0000] = new_balance (u64)
;   output[0x0008] = validation_result (u8)

routine VALIDATE_TRANSFER:
    ; Load sender balance
    load a64[0], input[0x0000]

    ; Load transfer amount
    load a64[1], input[0x0008]

    ; Check balance >= amount
    ; (Simplified - would use SUB and check underflow)
    ; Assume comparison sets CO if insufficient

    chk CO
    jif CK, insufficient_balance

    ; Calculate new balance
    sub a64[2], a64[0], a64[1]

    ; Write new balance to output
    store output[0x0000], a64[2]

    ; Write success (0) to output
    ; store output[0x0008], 0

    ret

routine insufficient_balance:
    ; Write failure (1) to output
    ; store output[0x0008], 1

    fail CK
    ret
```

### Example: Merkle Root Calculation

```asm
; Calculate Merkle root from leaves
; Demonstrates working memory usage

routine CALCULATE_MERKLE_ROOT:
    ; Use static segment as working memory
    ; static[0x0000-0x01FF] = leaf hashes (16 leaves × 32 bytes)
    ; static[0x0200-0x03FF] = intermediate hashes

    ; Load leaves from input to static
    ; (Loop to load 16 leaves - simplified)

    ; Level 1: Hash pairs of leaves
    ; Hash static[0x0000:0x003F] → static[0x0200]
    sha256 r256[0], static[0x0000], 64
    store static[0x0200], r256[0]

    ; ... (Hash remaining pairs)

    ; Level 2: Hash pairs of level 1
    ; ...

    ; Level 3: Hash pairs of level 2
    ; ...

    ; Level 4: Final hash (root)
    sha256 r256[0], static[0x02C0], 64

    ; Write root to output
    store output[0x0000], r256[0]

    ret
```

## Memory Model Summary

### Key Takeaways

1. **Register-centric**: Most operations use registers, not memory
2. **No heap**: No dynamic allocation, all memory static
3. **Segmented**: Six distinct memory regions with different permissions
4. **Sandboxed**: Complete isolation from host environment
5. **Deterministic**: Identical behavior across all platforms
6. **Safe**: Automatic bounds checking, no buffer overflows
7. **Efficient**: Optimized for validation workloads

### Memory Limits Quick Reference

| Component | Size Limit | Purpose |
|-----------|------------|---------|
| Registers | ~68 KB | Fast computation |
| Code | 64 KB | Program instructions |
| Constants | 64 KB | Immutable data |
| Static | 64 KB | Global variables |
| Stack | 192 KB | Function calls |
| Input | 1 MB | External data |
| Output | 256 KB | Results |
| **Total** | **~1.7 MB** | **Per execution** |

### Design Philosophy

AluVM's memory model embodies:
- **Security first**: Sandbox isolation, permission enforcement
- **Determinism**: Reproducible execution across all platforms
- **Simplicity**: No complex memory management
- **Efficiency**: Optimized for validation, not general computing
- **Verifiability**: Simple model enables formal verification

## Related Documentation

- [AluVM Overview](./overview.md) - Virtual machine architecture and design philosophy
- [Instruction Set](./instruction-set.md) - Complete instruction reference including memory access instructions
- [Prism Computing](../prism-computing.md) - RGB's client-side validation computing model
- [Development Guide](../../guides/development/rust-sdk.md) - Practical guide to programming AluVM

## References

### Specifications
- AluVM Memory Model Specification (Rust reference implementation)
- RGB Protocol Memory Requirements
- Client-Side Validation Architecture

### Academic Resources
- Memory Safety in Deterministic VMs
- Sandbox Security for Blockchain VMs
- Formal Verification of VM Memory Models

### Standards
- W^X (Write XOR Execute) Security Model
- IEEE 754 Floating Point Standard
- Little-Endian Byte Ordering

---

**Document Status**: Comprehensive reference - Complete memory model documentation with detailed segment descriptions, access patterns, safety guarantees, and practical examples.

**Last Updated**: 2026-01-17

**Version**: 1.0
