---
sidebar_position: 2
title: Instruction Set
description: Complete reference for AluVM instruction set architecture
---

# AluVM Instruction Set

This document provides a comprehensive reference for the AluVM instruction set architecture (ISA). Each instruction is documented with its opcode, encoding, complexity cost, and usage examples.

## Architecture Overview

AluVM uses a **register-based RISC architecture** optimized for deterministic client-side validation. The ISA includes 16 core control flow instructions (opcodes 0x00-0x0F, 0x10 for STOP) plus extended instructions for arithmetic, cryptography, and data manipulation.

### Design Principles

- **Deterministic execution**: Identical results across all platforms
- **Complexity metering**: Every instruction has a fixed complexity cost
- **Resource bounds**: Cycle limits, complexity limits, and stack depth limits
- **Security**: No undefined behavior, bounds checking on all operations
- **Simplicity**: Minimal instruction set for formal verification

## Instruction Format

### Encoding Structure

AluVM instructions use variable-length encoding optimized for code density:

```
Variable-Length Instruction Encoding:

1-byte instructions (control):
┌─────────┐
│ Opcode  │
└─────────┘

2-byte instructions (relative jumps):
┌─────────┬─────────┐
│ Opcode  │  SHIFT  │
│ (8-bit) │  (i8)   │
└─────────┴─────────┘

3-byte instructions (absolute jumps, calls):
┌─────────┬─────────────────┐
│ Opcode  │      ADDR       │
│ (8-bit) │     (u16)       │
└─────────┴─────────────────┘

36-byte instructions (library calls):
┌─────────┬───────────────────┬─────────────────┐
│ Opcode  │     LIB (32B)     │   ADDR (u16)    │
│ (8-bit) │   (LibId hash)    │  (Position)     │
└─────────┴───────────────────┴─────────────────┘
```

### Operand Types

AluVM instructions operate on typed operands:

- **Register**: Register number (0-31) with type prefix (a8, a16, a32, a64, f16, f32, f64, r128, r256, r512, r1024)
- **Immediate Address**: 16-bit unsigned position (u16) for absolute jumps
- **Relative Offset**: 8-bit signed displacement (i8) for relative jumps
- **Library Reference**: 32-byte library identifier (LibId) plus 16-bit position
- **Flags**: CK (check), CO (carry/overflow), CH (halt), CF (failure counter)

### Byte Ordering

All multi-byte values use **little-endian** encoding for cross-platform determinism

## Core Control Flow Instructions (0x00-0x10)

These 17 fundamental instructions form the backbone of AluVM's control flow system. All control flow operations interact with the register state, particularly the flag registers.

### Register State

Before diving into instructions, understand the key registers:

- **CK** (Check Register, 1 bit): Failure status (true = failed, false = ok)
- **CO** (Carry/Overflow, 1 bit): Temporary test flag
- **CH** (Halt Register, 1 bit): Halt on CK failure flag
- **CF** (Failure Counter, 64 bits): Cumulative count of CK failures
- **CY** (Cycle Counter, 16 bits): Counts jumps (max 2^16 = 65,536)
- **CA** (Complexity Accumulator, 64 bits): Sum of instruction complexity costs
- **CL** (Complexity Limit, Optional): Maximum allowed complexity budget
- **CS** (Call Stack, 192 KB): Return addresses for subroutine calls
- **CP** (Call Stack Pointer, 16 bits): Current position in call stack

### 0x00: NOP - No Operation

```
Opcode: 0x00
Size: 1 byte
Complexity: 0
Encoding: [0x00]
```

**Syntax**: `nop`

**Description**: Performs no operation. Used for alignment, padding, or as a placeholder.

**Effects**: None - does not modify any registers or flags

**Example**:
```asm
    ; Align code to 8-byte boundary
    nop
    nop
    nop
```

**Use cases**:
- Code alignment for performance
- Placeholder during development
- Padding for fixed-size code blocks

---

### 0x01: NOT CO - Invert Carry/Overflow Flag

```
Opcode: 0x01
Size: 1 byte
Complexity: 2,000
Encoding: [0x01]
```

**Syntax**: `not CO`

**Description**: Inverts the CO (carry/overflow) flag: `CO = !CO`

**Effects**:
- Flips CO from false→true or true→false
- No other state changes

**Example**:
```asm
    chk     CO          ; Test some condition into CO
    not     CO          ; Invert the result
    jif     CO, ERROR   ; Jump if inverted condition true
```

**Use cases**:
- Inverting test results
- Implementing NOT logic
- Conditional logic inversion

**Complexity cost**: 2,000 units added to CA register

---

### 0x02: CHK CO - Test Carry/Overflow Flag

```
Opcode: 0x02
Size: 1 byte
Complexity: 2,000
Encoding: [0x02]
```

**Syntax**: `chk CO`

**Description**: Tests the CO flag. If CO is true (failed), sets CK to failed state.

**Effects**:
- If CO == true: CK = true (failed)
- If CO == false: no change
- Increments CF if CK becomes true

**Example**:
```asm
    ; Perform arithmetic that might overflow
    add     a64[0], a64[1], a64[2]
    chk     CO          ; Check if overflow occurred
    jif     CK, OVERFLOW_HANDLER
```

**Use cases**:
- Overflow detection after arithmetic
- Converting CO state to CK state
- Conditional validation checks

**Complexity cost**: 2,000 units

---

### 0x03: CHK CK - Test Check Register

```
Opcode: 0x03
Size: 1 byte
Complexity: 2,000
Encoding: [0x03]
```

**Syntax**: `chk CK`

**Description**: Tests the CK register. If CK is true (failed) AND CH (halt flag) is set, halts execution.

**Effects**:
- If CK == true AND CH == true: halt with failure
- Otherwise: continue execution
- Does not modify CK or CH

**Example**:
```asm
routine VALIDATE:
    ; Perform validation
    ; ... checks that may set CK ...
    chk     CK          ; Halt if validation failed
    ; Continue if validation passed
    ret
```

**Use cases**:
- Automatic failure handling
- Assertion-like behavior
- Early exit on validation failure

**Complexity cost**: 2,000 units

---

### 0x04: FAIL CK - Set Failure State

```
Opcode: 0x04
Size: 1 byte
Complexity: 2,000
Encoding: [0x04]
```

**Syntax**: `fail CK`

**Description**: Explicitly sets CK register to failed state (true).

**Effects**:
- CK = true (failed)
- CF += 1 (increments failure counter)
- If CH is true, halts execution

**Example**:
```asm
routine CHECK_AMOUNT:
    cmp     a64[0], a64[1]  ; Compare amount with max
    jg      .too_large       ; Jump if amount > max
    ret
.too_large:
    fail    CK               ; Explicit failure
    ret
```

**Use cases**:
- Explicit validation failure
- Error conditions
- Assertion failures
- Input validation failures

**Complexity cost**: 2,000 units

---

### 0x05: MOV CO,CK - Move CK to CO

```
Opcode: 0x05
Size: 1 byte
Complexity: 2,000
Encoding: [0x05]
```

**Syntax**: `mov CO, CK`

**Description**: Copies the CK flag to CO flag, then resets CK to ok (false).

**Effects**:
- CO = CK (copy current CK value)
- CK = false (reset to ok)
- Allows inspecting CK without modifying it permanently

**Example**:
```asm
    ; Save current error state
    mov     CO, CK      ; Copy CK to CO, reset CK
    ; Perform operation that might fail
    call    RISKY_OP
    ; Restore previous error if current is ok
    jif     CK, .keep_new_error
    mov     CK, CO      ; Would need reverse operation
.keep_new_error:
```

**Use cases**:
- Saving error state
- Conditional error handling
- Error state composition

**Complexity cost**: 2,000 units

---

### 0x06: JMP ADDR - Absolute Jump

```
Opcode: 0x06
Size: 3 bytes
Complexity: 10,000
Encoding: [0x06, ADDR_LOW, ADDR_HIGH]
```

**Syntax**: `jmp ADDR`

**Description**: Unconditional jump to absolute position (16-bit unsigned address).

**Effects**:
- PC (program counter) = ADDR
- CY += 1 (increment cycle counter)
- CA += 10,000 (add complexity cost)
- If CY > 2^16 - 1: halt with cycle limit exceeded

**Example**:
```asm
    jmp     0x0100      ; Jump to position 256
    ; Unreachable code
    nop

LABEL_AT_0x0100:
    ; Execution continues here
```

**Bytecode example**:
```
jmp 0x0100 encodes as: [0x06, 0x00, 0x01]
                              ↑     ↑
                         low byte  high byte (little-endian)
```

**Use cases**:
- Unconditional control transfer
- Loop implementation
- Code organization
- Jump tables

**Complexity cost**: 10,000 units

---

### 0x07: JIF CO, ADDR - Jump If CO Failed

```
Opcode: 0x07
Size: 3 bytes
Complexity: 20,000
Encoding: [0x07, ADDR_LOW, ADDR_HIGH]
```

**Syntax**: `jif CO, ADDR`

**Description**: Conditional jump to absolute position if CO flag is true (failed).

**Effects**:
- If CO == true: PC = ADDR, CY += 1, CA += 20,000
- If CO == false: continue to next instruction, CA += 20,000
- Higher complexity cost than unconditional jump

**Example**:
```asm
    ; Test condition
    cmp     a64[0], a64[1]
    ; Assume comparison sets CO based on result
    jif     CO, ERROR_HANDLER   ; Jump if comparison failed
    ; Continue if comparison ok
    nop
```

**Use cases**:
- Conditional error handling
- Overflow checking
- Conditional validation logic

**Complexity cost**: 20,000 units (double that of unconditional jump)

---

### 0x08: JIF CK, ADDR - Jump If CK Failed

```
Opcode: 0x08
Size: 3 bytes
Complexity: 20,000
Encoding: [0x08, ADDR_LOW, ADDR_HIGH]
```

**Syntax**: `jif CK, ADDR`

**Description**: Conditional jump to absolute position if CK register is true (failed state).

**Effects**:
- If CK == true: PC = ADDR, CY += 1, CA += 20,000
- If CK == false: continue to next instruction, CA += 20,000

**Example**:
```asm
routine MAIN:
    call    VALIDATE_INPUT
    jif     CK, ERROR       ; Jump if validation failed
    call    PROCESS
    jif     CK, ERROR       ; Jump if processing failed
    ret

routine ERROR:
    ; Error handling
    stop
```

**Use cases**:
- Validation error checking
- Early exit on failure
- Error propagation
- Centralized error handling

**Complexity cost**: 20,000 units

---

### 0x09: JMP SHIFT - Relative Jump

```
Opcode: 0x09
Size: 2 bytes
Complexity: 10,000
Encoding: [0x09, SHIFT]
```

**Syntax**: `jmp SHIFT`

**Description**: Unconditional relative jump with signed 8-bit offset (-128 to +127 bytes).

**Effects**:
- PC = PC + SHIFT + 2 (offset is relative to instruction end)
- CY += 1
- CA += 10,000

**Example**:
```asm
    jmp     +10         ; Jump forward 10 bytes
    ; ... code ...
    jmp     -20         ; Jump backward 20 bytes (loop)
```

**Bytecode example**:
```
jmp +10  encodes as: [0x09, 0x0A]  (10 decimal = 0x0A)
jmp -20  encodes as: [0x09, 0xEC]  (-20 as signed i8)
```

**Use cases**:
- Short-range jumps (smaller bytecode)
- Local loops
- Skip over small code blocks
- More compact than absolute jumps

**Complexity cost**: 10,000 units

---

### 0x0A: JIF CO, SHIFT - Relative Jump If CO Failed

```
Opcode: 0x0A
Size: 2 bytes
Complexity: 20,000
Encoding: [0x0A, SHIFT]
```

**Syntax**: `jif CO, SHIFT`

**Description**: Conditional relative jump if CO flag is true.

**Effects**:
- If CO == true: PC = PC + SHIFT + 2, CY += 1
- CA += 20,000 (regardless of jump taken)

**Example**:
```asm
loop_start:
    ; ... loop body ...
    ; Test loop condition
    cmp     a32[0], a32[1]
    jif     CO, +loop_start  ; Continue loop if condition met
```

**Use cases**:
- Compact conditional loops
- Local error handling
- Short-range conditional branches

**Complexity cost**: 20,000 units

---

### 0x0B: JIF CK, SHIFT - Relative Jump If CK Failed

```
Opcode: 0x0B
Size: 2 bytes
Complexity: 20,000
Encoding: [0x0B, SHIFT]
```

**Syntax**: `jif CK, SHIFT`

**Description**: Conditional relative jump if CK register is true (failed).

**Effects**:
- If CK == true: PC = PC + SHIFT + 2, CY += 1
- CA += 20,000

**Example**:
```asm
    call    VALIDATE
    jif     CK, +error_nearby    ; Jump forward to nearby error handler
    ; Success path
    ret

error_nearby:
    fail    CK
    ret
```

**Use cases**:
- Compact error handling
- Local failure checking
- Validation result testing

**Complexity cost**: 20,000 units

---

### 0x0C: JMP LIB, ADDR - External Library Jump

```
Opcode: 0x0C
Size: 36 bytes (1 + 32 + 2 + 1 reserved)
Complexity: 20,000 + 32 bytes = 20,032
Encoding: [0x0C, LIB[0..31], ADDR_LOW, ADDR_HIGH]
```

**Syntax**: `jmp LIB, ADDR`

**Description**: Jumps to code in an external library identified by 32-byte LibId hash.

**Effects**:
- Validates library LIB exists and is accessible
- PC = ADDR within library LIB
- CY += 1
- CA += 20,000 + 32 (base cost plus per-byte cost for LibId)
- If library not found: sets CK = true, halts

**Encoding details**:
```
[0x0C][32 bytes: LibId hash][2 bytes: address][1 byte: reserved]
```

**Example**:
```asm
    ; Jump to standard validation library
    jmp     STD_LIB_HASH, 0x0000    ; Entry point of std lib
```

**Use cases**:
- Code reuse across contracts
- Standard library functions
- Modular contract design
- Shared validation logic

**Complexity cost**: 20,000 base + 32 bytes = 20,032 units

**Security**: Library hash must match exactly; prevents code injection

---

### 0x0D: CALL POS - Local Subroutine Call

```
Opcode: 0x0D
Size: 3 bytes
Complexity: 30,000
Encoding: [0x0D, POS_LOW, POS_HIGH]
```

**Syntax**: `call POS`

**Description**: Calls a subroutine at absolute position POS, saving return address on call stack.

**Effects**:
- Push current PC + 3 onto call stack (CS)
- PC = POS
- CP += 2 (increment call stack pointer by 2 bytes for u16 return address)
- CY += 1
- CA += 30,000
- If stack overflow (CP > stack limit): halt

**Example**:
```asm
routine MAIN:
    call    VALIDATE        ; Call subroutine at VALIDATE
    ; Execution returns here after VALIDATE's ret
    call    PROCESS
    stop

routine VALIDATE:
    ; Validation logic
    ret                     ; Returns to caller

routine PROCESS:
    ; Processing logic
    ret
```

**Call stack structure**:
```
Before call:           After call VALIDATE:
CS: [...]             CS: [..., return_addr]
CP: X                 CP: X + 2
```

**Use cases**:
- Function calls
- Code organization
- Subroutine abstraction
- Reusable code blocks

**Complexity cost**: 30,000 units (higher than jump due to stack operations)

**Stack limit**: Maximum 192 KB call stack

---

### 0x0E: CALL LIB, ADDR - External Library Call

```
Opcode: 0x0E
Size: 36 bytes
Complexity: 20,000 + 32 bytes = 20,032
Encoding: [0x0E, LIB[0..31], ADDR_LOW, ADDR_HIGH]
```

**Syntax**: `call LIB, ADDR`

**Description**: Calls a subroutine in external library LIB at position ADDR.

**Effects**:
- Push return address (current library + PC + 36) onto call stack
- Switch to library LIB
- PC = ADDR within LIB
- CP += stack frame size
- CY += 1
- CA += 20,032
- Validates library exists; sets CK and halts if not found

**Example**:
```asm
    ; Call SHA256 function from crypto library
    call    CRYPTO_LIB_HASH, SHA256_ENTRY
    ; Result returned in designated registers
```

**Use cases**:
- Calling standard library functions
- Cryptographic operations
- Shared utility functions
- Cross-contract code reuse

**Complexity cost**: 20,032 units

**Security**:
- Library hash verification prevents malicious code injection
- Return address includes library ID for proper return context

---

### 0x0F: RET - Return from Subroutine

```
Opcode: 0x0F
Size: 1 byte
Complexity: 20,000
Encoding: [0x0F]
```

**Syntax**: `ret`

**Description**: Returns from current subroutine to the caller.

**Effects**:
- Pop return address from call stack (CS)
- If return address includes library ID: switch to that library
- PC = return address
- CP -= stack frame size
- CY += 1 (counts as a jump)
- CA += 20,000
- If stack underflow (CP < 0): halt with error

**Example**:
```asm
routine CALCULATE:
    ; Perform calculation
    ; Store result in a64[0]
    ret         ; Return to caller

routine MAIN:
    call    CALCULATE
    ; a64[0] contains result here
```

**Stack operations**:
```
Before ret:               After ret:
CS: [..., return_addr]    CS: [...]
CP: X                     CP: X - 2
PC: in CALCULATE          PC: return_addr (after call instruction)
```

**Use cases**:
- Returning from functions
- Completing subroutines
- Multi-level call stack unwinding

**Complexity cost**: 20,000 units

**Error conditions**:
- Stack underflow if ret without matching call
- Corrupted stack if stack was manually modified

---

### 0x10: STOP - Halt Execution

```
Opcode: 0x10
Size: 1 byte
Complexity: 0
Encoding: [0x10]
```

**Syntax**: `stop`

**Description**: Immediately halts program execution with success status.

**Effects**:
- Execution stops
- Program terminates normally
- Return success to host environment
- Final register state preserved
- No complexity cost (program ending)

**Example**:
```asm
routine MAIN:
    call    VALIDATE
    jif     CK, ERROR

    ; Success path
    ; Store success result
    stop            ; Normal termination

routine ERROR:
    ; Store error code
    stop            ; Error termination (CK will be true)
```

**Use cases**:
- Normal program termination
- Explicit halt after validation complete
- End of main execution flow

**Complexity cost**: 0 (no cost for ending execution)

**Final state**: All registers, flags, and counters are preserved and returned to host

---

## Control Flow Patterns

### Error Handling Pattern

```asm
routine MAIN:
    chk     CO              ; Test overflow from previous op
    jif     CK, ERROR       ; Jump to error handler if failed
    call    VALIDATE        ; Call validation subroutine
    jif     CK, ERROR       ; Check validation result
    call    PROCESS         ; Process data
    jif     CK, ERROR       ; Check processing result
    stop                    ; Success exit

routine ERROR:
    fail    CK              ; Ensure CK is set
    stop                    ; Error exit
```

### Loop Pattern

```asm
routine LOOP_EXAMPLE:
    ; Initialize loop counter
    ; Loop body
loop_start:
    ; ... loop operations ...
    ; Test continuation condition
    jif     CO, loop_start  ; Continue if condition true
    ret                     ; Exit loop
```

### Conditional Validation

```asm
routine VALIDATE:
    ; Test condition 1
    chk     CO
    jif     CK, .fail

    ; Test condition 2
    chk     CO
    jif     CK, .fail

    ; All tests passed
    ret

.fail:
    fail    CK
    ret
```

## Complexity and Resource Limits

### Complexity Budget

Every instruction adds to the Complexity Accumulator (CA). If a Complexity Limit (CL) is set:

```
After each instruction:
  CA += instruction_complexity
  if CL is set AND CA > CL:
    halt with "complexity limit exceeded"
```

**Typical complexity costs**:
- `nop`: 0
- Flag operations (`not CO`, `chk`, `fail`, `mov`): 2,000 each
- Unconditional jumps (`jmp`): 10,000
- Conditional jumps (`jif`): 20,000
- Calls (`call`): 20,000-30,000
- Returns (`ret`): 20,000
- Library operations: +32 per byte of LibId

### Cycle Limit

The Cycle Counter (CY) increments on every jump, call, or return. Maximum cycles: **65,536** (2^16).

```
Execution halts if: CY > 65,535
```

This prevents infinite loops and ensures termination.

### Stack Limit

Call Stack (CS) maximum size: **192 KB**

```
Maximum call depth ≈ 98,304 calls (192KB / 2 bytes per return address)
```

In practice, each call frame may use additional stack space for local variables.

## Bytecode Examples

### Simple Program

```asm
; Validate amount is positive
routine MAIN:
    ; Load amount from input (assume loaded into a64[0])
    ; Check if amount > 0 (logic simplified)
    chk     CO          ; Test result
    jif     CK, ERROR   ; Jump if failed
    stop                ; Success

routine ERROR:
    fail    CK
    stop
```

**Bytecode** (with addresses):
```
0x0000: [0x02]                    ; chk CO
0x0001: [0x08, 0x05, 0x00]        ; jif CK, 0x0005 (ERROR)
0x0004: [0x10]                    ; stop
0x0005: [0x04]                    ; fail CK (ERROR routine)
0x0006: [0x10]                    ; stop
```

### Loop Example

```asm
; Count down loop
routine COUNTDOWN:
    ; a32[0] = counter (starts at 10)
loop:
    ; Decrement counter (assume dec instruction exists)
    ; Test if counter > 0
    jif     CO, +loop   ; Relative jump back
    ret
```

**Bytecode**:
```
loop:
0x0100: [...]                      ; counter operations
0x0105: [0x0A, 0xF9]              ; jif CO, -7 (jump to 0x0100)
                                   ; 0x0107 + (-7) = 0x0100
0x0107: [0x0F]                    ; ret
```

## Arithmetic Instructions

Beyond the core 17 control instructions, AluVM includes arithmetic operations (extended instruction set)

### Integer Arithmetic

Integer arithmetic operations work on signed and unsigned integers across multiple register sizes.

#### ADD - Addition

**Syntax**: `add destReg, srcReg1, srcReg2`

**Description**: Adds two register values, storing result in destination.

**Overflow**: Sets CO flag on overflow

**Example**:
```asm
add a64[0], a64[1], a64[2]  ; a64[0] = a64[1] + a64[2]
add a32[5], a32[5], a32[6]  ; a32[5] += a32[6]
```

#### SUB - Subtraction

**Syntax**: `sub destReg, srcReg1, srcReg2`

**Description**: Subtracts second operand from first.

**Underflow**: Sets CO flag on underflow

**Example**:
```asm
sub a64[0], a64[1], a64[2]  ; a64[0] = a64[1] - a64[2]
```

#### MUL - Multiplication

**Syntax**: `mul destReg, srcReg1, srcReg2`

**Description**: Multiplies two values.

**Overflow**: Sets CO flag if result doesn't fit in destination register size

**Example**:
```asm
mul a32[0], a32[1], a32[2]  ; 32-bit multiplication
```

#### DIV - Division

**Syntax**: `div quotientReg, dividendReg, divisorReg`

**Description**: Integer division with truncation toward zero.

**Division by zero**: Sets CK flag and halts if divisor is zero

**Example**:
```asm
div a64[0], a64[1], a64[2]  ; a64[0] = a64[1] / a64[2]
chk CK                       ; Check for division by zero
```

### Floating-Point Arithmetic

Floating-point operations follow IEEE 754 standard for deterministic results.

#### FADD - Floating-Point Addition

**Syntax**: `fadd destReg, srcReg1, srcReg2`

**Description**: IEEE 754 compliant floating-point addition.

**Precision**: Available for f16, f32, f64 registers

**Example**:
```asm
fadd f64[0], f64[1], f64[2]  ; 64-bit float addition
fadd f32[0], f32[0], f32[1]  ; 32-bit float addition
```

**Special values**: Handles NaN, infinity, and denormals per IEEE 754

#### FSUB - Floating-Point Subtraction

**Syntax**: `fsub destReg, srcReg1, srcReg2`

**Description**: IEEE 754 compliant subtraction.

#### FMUL - Floating-Point Multiplication

**Syntax**: `fmul destReg, srcReg1, srcReg2`

**Description**: IEEE 754 compliant multiplication.

#### FDIV - Floating-Point Division

**Syntax**: `fdiv destReg, srcReg1, srcReg2`

**Description**: IEEE 754 compliant division.

**Division by zero**: Produces infinity (not an error)

### Multi-Precision Arithmetic

Wide arithmetic for cryptographic operations on 128, 256, 512, 1024-bit values.

#### ADDW - Wide Addition

**Syntax**: `addw destReg, srcReg1, srcReg2`

**Description**: Addition for wide registers (r128, r256, r512, r1024).

**Example**:
```asm
addw r256[0], r256[1], r256[2]  ; 256-bit addition
addw r512[0], r512[0], r512[1]  ; 512-bit addition
```

**Use case**: Cryptographic computations, large number arithmetic

#### SUBW - Wide Subtraction

**Syntax**: `subw destReg, srcReg1, srcReg2`

**Description**: Subtraction for wide registers.

#### MULW - Wide Multiplication

**Syntax**: `mulw destReg, srcReg1, srcReg2`

**Description**: Multiplication for wide registers.

**Note**: May have higher complexity cost due to computational intensity

## Logical Instructions

Logical operations for bitwise manipulation and boolean logic.

### Bitwise Operations

#### AND - Bitwise AND

**Syntax**: `and destReg, srcReg1, srcReg2`

**Description**: Performs bitwise AND on each bit pair.

**Example**:
```asm
and a64[0], a64[1], a64[2]  ; a64[0] = a64[1] & a64[2]
; If a64[1] = 0b1100, a64[2] = 0b1010
; Result: a64[0] = 0b1000
```

**Use cases**:
- Masking bits
- Testing flags
- Clearing specific bits

#### OR - Bitwise OR

**Syntax**: `or destReg, srcReg1, srcReg2`

**Description**: Performs bitwise OR on each bit pair.

**Example**:
```asm
or a32[0], a32[1], a32[2]   ; a32[0] = a32[1] | a32[2]
```

**Use cases**:
- Setting flags
- Combining bitmasks
- Merging values

#### XOR - Bitwise XOR

**Syntax**: `xor destReg, srcReg1, srcReg2`

**Description**: Performs bitwise exclusive OR.

**Example**:
```asm
xor a64[0], a64[1], a64[2]  ; a64[0] = a64[1] ^ a64[2]
xor a64[0], a64[0], a64[0]  ; Clear register (a64[0] = 0)
```

**Use cases**:
- Toggling bits
- Comparing equality (zero if equal)
- Clearing registers efficiently

#### NOT - Bitwise NOT

**Syntax**: `not destReg, srcReg`

**Description**: Inverts all bits (bitwise complement).

**Example**:
```asm
not a32[0], a32[1]  ; a32[0] = ~a32[1]
; If a32[1] = 0x00FF00FF
; Result: a32[0] = 0xFF00FF00
```

**Use cases**:
- Bit inversion
- Creating inverse masks
- Bitwise negation

### Shift Operations

#### SHL - Shift Left

**Syntax**: `shl destReg, srcReg, shiftAmount`

**Description**: Shifts bits left, filling right with zeros. Equivalent to multiplication by 2^shiftAmount.

**Example**:
```asm
; Multiply by 8 (2^3)
shl a32[0], a32[1], 3   ; a32[0] = a32[1] << 3
```

**Overflow**: Shifted-out bits are lost; CO flag set if any non-zero bits lost

**Use cases**:
- Fast multiplication by powers of 2
- Bit field manipulation
- Encoding data

#### SHR - Logical Shift Right

**Syntax**: `shr destReg, srcReg, shiftAmount`

**Description**: Shifts bits right, filling left with zeros. Unsigned division by 2^shiftAmount.

**Example**:
```asm
; Divide by 4 (2^2) - unsigned
shr a32[0], a32[1], 2   ; a32[0] = a32[1] >> 2
```

**Use cases**:
- Unsigned division by powers of 2
- Extracting high-order bits
- Bit field extraction

#### SAR - Arithmetic Shift Right

**Syntax**: `sar destReg, srcReg, shiftAmount`

**Description**: Shifts bits right, preserving sign bit (sign extension). Signed division by 2^shiftAmount.

**Example**:
```asm
; Divide by 2 - signed
sar a32[0], a32[1], 1   ; a32[0] = a32[1] >> 1 (arithmetic)
; If a32[1] = -8 (0xFFFFFFF8)
; Result: a32[0] = -4 (0xFFFFFFFC)
```

**Use cases**:
- Signed division by powers of 2
- Preserving sign in shifts
- Fixed-point arithmetic

#### ROTL - Rotate Left

**Syntax**: `rotl destReg, srcReg, rotateAmount`

**Description**: Rotates bits left circularly (wraparound).

**Example**:
```asm
rotl a8[0], a8[1], 3
; If a8[1] = 0b10110011
; Result: a8[0] = 0b10011101
;         ^^^-------- wrapped around
```

**Use cases**:
- Cryptographic operations
- Circular buffers
- Hash functions

#### ROTR - Rotate Right

**Syntax**: `rotr destReg, srcReg, rotateAmount`

**Description**: Rotates bits right circularly.

**Example**:
```asm
rotr a32[0], a32[1], 8  ; Rotate right by 8 bits
```

**Use cases**:
- Cryptographic primitives
- Endianness conversion
- Bit permutations

## Comparison Instructions

### Integer Comparison

#### CMP - Compare

*To be expanded: Integer comparison*

**Syntax**: `cmp reg1, reg2`

**Description**: Compares two values and sets flags.

**Flags Set**:
- Zero flag (Z): reg1 == reg2
- Sign flag (S): reg1 < reg2
- Overflow flag (O): Computation overflow

#### TEST - Bitwise Test

*To be expanded: Bitwise test operation*

**Syntax**: `test reg1, reg2`

**Description**: Performs AND and sets flags without storing result.

### Conditional Operations

#### EQ - Equal

*To be expanded: Equality comparison*

**Syntax**: `eq destReg, srcReg1, srcReg2`

**Description**: Sets destReg to 1 if equal, 0 otherwise.

#### NE - Not Equal

*To be expanded: Inequality comparison*

#### LT - Less Than

*To be expanded: Less than comparison*

#### GT - Greater Than

*To be expanded: Greater than comparison*

#### LE - Less or Equal

*To be expanded: Less or equal comparison*

#### GE - Greater or Equal

*To be expanded: Greater or equal comparison*

## Control Flow Instructions

### Unconditional Jumps

#### JMP - Jump

*To be expanded: Unconditional jump*

**Syntax**: `jmp target`

**Description**: Transfers control to target address.

**Example**:
```asm
jmp loop_start  ; Jump to label
```

#### CALL - Call Subroutine

*To be expanded: Subroutine call*

**Syntax**: `call target`

**Description**: Calls subroutine and saves return address.

#### RET - Return

*To be expanded: Return from subroutine*

**Syntax**: `ret`

**Description**: Returns from subroutine to saved address.

### Conditional Jumps

#### JZ - Jump if Zero

*To be expanded: Conditional jump on zero*

**Syntax**: `jz target`

**Description**: Jumps if zero flag is set.

#### JNZ - Jump if Not Zero

*To be expanded: Conditional jump on non-zero*

**Syntax**: `jnz target`

#### JG - Jump if Greater

*To be expanded: Conditional jump on greater*

**Syntax**: `jg target`

#### JL - Jump if Less

*To be expanded: Conditional jump on less*

**Syntax**: `jl target`

#### JGE - Jump if Greater or Equal

*To be expanded: Conditional jump on greater/equal*

#### JLE - Jump if Less or Equal

*To be expanded: Conditional jump on less/equal*

## Data Movement Instructions

### Register Operations

#### MOV - Move

*To be expanded: Register to register move*

**Syntax**: `mov destReg, srcReg`

**Description**: Copies value from source to destination.

**Example**:
```asm
mov a64[0], a64[1]  ; Copy a64[1] to a64[0]
```

#### SWAP - Swap

*To be expanded: Register swap*

**Syntax**: `swap reg1, reg2`

**Description**: Exchanges values of two registers.

#### CLR - Clear

*To be expanded: Register clear*

**Syntax**: `clr reg`

**Description**: Sets register to zero.

### Memory Operations

#### LOAD - Load from Memory

*To be expanded: Memory load operation*

**Syntax**: `load destReg, [memoryAddr]`

**Description**: Loads value from memory into register.

**Example**:
```asm
load a64[0], [0x1000]  ; Load from address 0x1000
```

#### STORE - Store to Memory

*To be expanded: Memory store operation*

**Syntax**: `store [memoryAddr], srcReg`

**Description**: Stores register value to memory.

#### LOADIMM - Load Immediate

*To be expanded: Load constant*

**Syntax**: `loadimm destReg, immediateValue`

**Description**: Loads constant value into register.

**Example**:
```asm
loadimm a64[0], 1000000  ; Load constant 1000000
```

### Stack Operations

#### PUSH - Push to Stack

*To be expanded: Stack push*

**Syntax**: `push srcReg`

**Description**: Pushes register value onto stack.

#### POP - Pop from Stack

*To be expanded: Stack pop*

**Syntax**: `pop destReg`

**Description**: Pops value from stack into register.

## Cryptographic Instructions

AluVM provides built-in cryptographic primitives for Bitcoin and RGB operations. These operations have higher complexity costs due to computational intensity.

### Hash Functions

#### SHA256 - SHA-256 Hash

**Syntax**: `sha256 destReg, srcReg, length`

**Description**: Computes SHA-256 cryptographic hash of data.

**Registers**:
- `destReg`: r256 register for 32-byte (256-bit) hash output
- `srcReg`: Source data register (any wide register)
- `length`: Number of bytes to hash

**Example**:
```asm
; Hash 32 bytes of data
sha256 r256[0], r256[1], 32
; r256[0] now contains SHA-256 hash of r256[1]
```

**Complexity**: High (typically 10,000+ units depending on length)

**Use cases**:
- Transaction hashing
- Commitment schemes
- Data integrity verification

#### HASH256 - Double SHA-256

**Syntax**: `hash256 destReg, srcReg, length`

**Description**: Computes SHA-256(SHA-256(data)) as used in Bitcoin protocol.

**Example**:
```asm
; Bitcoin-style double hash
hash256 r256[0], r256[1], 32
; Equivalent to: sha256(sha256(data))
```

**Use cases**:
- Bitcoin transaction IDs
- Bitcoin block hashing
- Bitcoin address derivation (partial)

#### HASH160 - RIPEMD-160(SHA-256)

**Syntax**: `hash160 destReg, srcReg, length`

**Description**: Computes RIPEMD-160(SHA-256(data)) for Bitcoin address generation.

**Registers**:
- `destReg`: r160 register for 20-byte hash output
- `srcReg`: Source data (typically public key)

**Example**:
```asm
; Generate Bitcoin address hash
hash160 r160[0], r256[1], 33  ; 33 bytes for compressed pubkey
```

**Output**: 160-bit (20-byte) hash used in P2PKH addresses

**Use cases**:
- Bitcoin address generation
- Bitcoin script hash addresses
- Compact commitments

### Signature Verification

#### SECP256K1_VERIFY - Verify SECP256k1 Signature

**Syntax**: `secp256k1_verify pubkeyReg, sigReg, msgReg`

**Description**: Verifies ECDSA signature on SECP256k1 elliptic curve (Bitcoin's signature algorithm).

**Registers**:
- `pubkeyReg`: r256 register containing 32-byte public key (x-coordinate for compressed)
- `sigReg`: r512 register containing 64-byte signature (r, s values)
- `msgReg`: r256 register containing 32-byte message hash

**Effects**:
- If signature is valid: CK = false (ok)
- If signature is invalid: CK = true (failed)

**Example**:
```asm
; Load public key, signature, and message hash
; (assume already loaded into registers)
secp256k1_verify r256[0], r512[1], r256[2]
jif CK, signature_invalid  ; Jump if verification failed

; Signature valid - continue
ret

signature_invalid:
    fail CK
    ret
```

**Complexity**: Very high (typically 50,000+ units)

**Use cases**:
- Bitcoin transaction validation
- RGB state transition authorization
- Multi-signature schemes
- Authentication

#### SCHNORR_VERIFY - Verify Schnorr Signature

**Syntax**: `schnorr_verify pubkeyReg, sigReg, msgReg`

**Description**: Verifies Schnorr signature (BIP-340) on SECP256k1 curve.

**Registers**:
- `pubkeyReg`: r256 register with 32-byte x-only public key
- `sigReg`: r512 register with 64-byte Schnorr signature
- `msgReg`: r256 register with 32-byte message

**Effects**: Sets CK flag based on verification result

**Example**:
```asm
; Verify Schnorr signature (Taproot)
schnorr_verify r256[0], r512[1], r256[2]
chk CK
```

**Advantages**:
- Smaller signatures than ECDSA
- Batch verification support
- Better security proofs
- Used in Bitcoin Taproot

**Complexity**: Very high (similar to ECDSA)

### Merkle Proofs

#### MERKLE_VERIFY - Verify Merkle Proof

**Syntax**: `merkle_verify rootReg, leafReg, proofReg`

**Description**: Verifies Merkle tree inclusion proof.

**Registers**:
- `rootReg`: r256 register with Merkle root hash
- `leafReg`: r256 register with leaf data hash
- `proofReg`: Wide register containing serialized proof path

**Effects**:
- If proof valid: CK = false
- If proof invalid: CK = true

**Example**:
```asm
; Verify data is in Merkle tree
merkle_verify r256[0], r256[1], r512[2]
jif CK, not_in_tree

; Data verified in tree
ret

not_in_tree:
    fail CK
    ret
```

**Use cases**:
- Light client verification
- Efficient set membership proofs
- Compact proofs of inclusion
- RGB state commitment verification

**Complexity**: Variable (depends on proof depth)

### Cryptographic Patterns

#### Signature Validation Flow

```asm
routine VALIDATE_SIGNATURE:
    ; Inputs:
    ;   r256[0] = public key
    ;   r512[1] = signature
    ;   r256[2] = message hash

    ; Verify signature
    secp256k1_verify r256[0], r512[1], r256[2]

    ; Check result
    jif CK, .invalid

    ; Valid signature
    ret

.invalid:
    fail CK
    ret
```

#### Multi-Signature Validation

```asm
routine VALIDATE_MULTISIG:
    ; Validate first signature
    secp256k1_verify r256[0], r512[1], r256[2]
    jif CK, .failed

    ; Validate second signature
    secp256k1_verify r256[3], r512[4], r256[2]
    jif CK, .failed

    ; Both valid
    ret

.failed:
    fail CK
    ret
```

#### Hash Chain Verification

```asm
routine VERIFY_HASH_CHAIN:
    ; Verify hash(data) == commitment
    sha256 r256[10], r256[0], 32    ; Hash the data
    ; Compare with commitment (assume comparison instruction)
    ; If not equal, fail
    ret
```

## Type Conversion Instructions

### Integer Conversions

#### EXTEND - Zero Extend

*To be expanded: Zero extension*

**Syntax**: `extend destReg, srcReg`

**Description**: Extends smaller integer to larger size with zeros.

**Example**:
```asm
extend a64[0], a32[1]  ; 32-bit to 64-bit
```

#### SEXTEND - Sign Extend

*To be expanded: Sign extension*

**Syntax**: `sextend destReg, srcReg`

**Description**: Extends smaller integer preserving sign.

#### TRUNC - Truncate

*To be expanded: Truncation*

**Syntax**: `trunc destReg, srcReg`

**Description**: Truncates larger integer to smaller size.

### Floating-Point Conversions

#### I2F - Integer to Float

*To be expanded: Integer to floating-point conversion*

**Syntax**: `i2f destFloatReg, srcIntReg`

#### F2I - Float to Integer

*To be expanded: Floating-point to integer conversion*

**Syntax**: `f2i destIntReg, srcFloatReg`

**Rounding**: Uses round-to-zero (truncation).

#### FCONV - Float Conversion

*To be expanded: Float precision conversion*

**Syntax**: `fconv destReg, srcReg`

**Description**: Converts between f16, f32, f64 precisions.

## Special Instructions

### System Operations

#### NOP - No Operation

*To be expanded: No-op instruction*

**Syntax**: `nop`

**Description**: Does nothing, can be used for alignment.

#### HALT - Halt Execution

*To be expanded: Stop execution*

**Syntax**: `halt`

**Description**: Terminates program execution.

#### FAIL - Validation Failure

*To be expanded: Explicit failure*

**Syntax**: `fail errorCode`

**Description**: Signals validation failure with error code.

### Debugging Instructions

#### BREAK - Breakpoint

*To be expanded: Debugger breakpoint*

**Syntax**: `break`

**Description**: Triggers debugger breakpoint (if debugging).

#### TRACE - Execution Trace

*To be expanded: Trace point*

**Syntax**: `trace traceId`

**Description**: Records execution trace point.

## Instruction Reference Table

### Quick Reference

*To be expanded: Complete instruction table*

| Opcode | Mnemonic | Operands | Description | Flags |
|--------|----------|----------|-------------|-------|
| 0x00 | NOP | - | No operation | - |
| 0x01 | MOV | dest, src | Move data | - |
| 0x02 | ADD | dest, src1, src2 | Addition | ZSOC |
| 0x03 | SUB | dest, src1, src2 | Subtraction | ZSOC |
| ... | ... | ... | ... | ... |

*Table continues for all 256+ instructions*

## Instruction Encoding

### Opcode Map

*To be expanded: Opcode allocation*

```
0x00-0x1F: Data movement
0x20-0x3F: Arithmetic operations
0x40-0x5F: Logical operations
0x60-0x7F: Comparison operations
0x80-0x9F: Control flow
0xA0-0xBF: Cryptographic operations
0xC0-0xDF: Type conversions
0xE0-0xFF: Special/Reserved
```

### Encoding Examples

*To be expanded: Instruction encoding examples*

```
ADD a64[0], a64[1], a64[2]
┌────┬────┬────┬────┐
│0x02│0x00│0x01│0x02│
└────┴────┴────┴────┘
```

## Performance Characteristics

### Instruction Timing

*To be expanded: Execution time characteristics*

| Instruction Class | Typical Cycles | Notes |
|-------------------|----------------|-------|
| Data movement | 1 | Register-to-register |
| Arithmetic | 1-2 | Integer operations |
| Floating-point | 2-4 | Varies by precision |
| Cryptographic | 100-1000 | Hash/signature ops |
| Control flow | 1-2 | Jump/branch |

### Optimization Guidelines

*To be expanded: Performance optimization tips*

- Minimize memory access
- Use appropriate register sizes
- Batch cryptographic operations
- Avoid unnecessary type conversions
- Leverage instruction pipelining

## Complete Usage Examples

### Example 1: Token Transfer Validation

Complete RGB token transfer validation with amount checking and signature verification:

```asm
; RGB Token Transfer Validation
; Inputs (from contract state):
;   - a64[0]: transfer amount
;   - a64[1]: sender balance
;   - r256[10]: sender public key
;   - r512[11]: transfer signature
;   - r256[12]: transfer message hash
;
; Outputs:
;   - CK: validation result (false = success, true = failed)

routine VALIDATE_TRANSFER:
    ; === Step 1: Validate amount > 0 ===
    ; (Simplified - assume comparison sets CO)
    ; In real implementation, would use explicit comparison
    ; For this example, assume amount check logic sets CO if amount <= 0

    chk     CO                  ; Check if amount validation failed
    jif     CK, ERROR_AMOUNT    ; Jump to error if failed

    ; === Step 2: Check balance >= amount ===
    ; (Simplified - real implementation would use SUB and check underflow)
    ; Assume balance check logic sets CO if insufficient

    chk     CO                  ; Check balance validation
    jif     CK, ERROR_BALANCE   ; Jump to error if insufficient

    ; === Step 3: Verify cryptographic signature ===
    secp256k1_verify r256[10], r512[11], r256[12]
    jif     CK, ERROR_SIGNATURE ; Jump if signature invalid

    ; === All checks passed - Success ===
    ; CK is false (ok state)
    ret

; === Error Handlers ===
routine ERROR_AMOUNT:
    ; Invalid amount (0 or negative)
    fail    CK                  ; Set explicit failure
    ; Could store error code in output register
    ret

routine ERROR_BALANCE:
    ; Insufficient balance
    fail    CK
    ret

routine ERROR_SIGNATURE:
    ; Invalid signature
    fail    CK
    ret
```

**Bytecode breakdown** (approximate addresses):
```
0x0000: chk CO                          [0x02]
0x0001: jif CK, 0x000A (ERROR_AMOUNT)  [0x08, 0x0A, 0x00]
0x0004: chk CO                          [0x02]
0x0005: jif CK, 0x000D (ERROR_BALANCE) [0x08, 0x0D, 0x00]
0x0008: secp256k1_verify ...            [opcode + args]
0x00XX: jif CK, 0x0010 (ERROR_SIG)     [0x08, 0x10, 0x00]
0x00XX: ret                             [0x0F]
0x000A: fail CK                         [0x04] ; ERROR_AMOUNT
0x000B: ret                             [0x0F]
0x000C: fail CK                         [0x04] ; ERROR_BALANCE
0x000D: ret                             [0x0F]
0x000E: fail CK                         [0x04] ; ERROR_SIGNATURE
0x000F: ret                             [0x0F]
```

### Example 2: Recursive Hash Chain Validation

Validates a chain of hashes (e.g., for time-locked commitments):

```asm
; Hash Chain Validation
; Validates that hash^n(preimage) == final_commitment
; Inputs:
;   - a16[0]: chain length (n)
;   - r256[0]: preimage
;   - r256[1]: expected final hash
;   - r256[2]: working register

routine VALIDATE_HASH_CHAIN:
    ; Initialize loop counter
    ; a16[1] = current iteration (starts at 0)

loop_start:
    ; Check if we've done n iterations
    ; (Simplified comparison logic)
    ; If a16[1] >= a16[0], exit loop

    ; Hash current value: r256[2] = sha256(r256[0])
    sha256  r256[2], r256[0], 32

    ; Move result back to r256[0] for next iteration
    ; (Assume mov instruction for wide registers)

    ; Increment counter
    ; a16[1]++

    ; Loop back
    jmp     +loop_start

loop_exit:
    ; Compare final hash r256[0] with expected r256[1]
    ; (Assume comparison instruction exists)
    ; Sets CO if not equal

    chk     CO
    jif     CK, hash_mismatch

    ; Hash chain valid
    ret

routine hash_mismatch:
    fail    CK
    ret
```

### Example 3: Multi-Signature Threshold (2-of-3)

Validates that at least 2 of 3 signatures are valid:

```asm
; 2-of-3 Multi-Signature Validation
; Inputs:
;   - r256[0..2]: three public keys
;   - r512[3..5]: three signatures
;   - r256[6]: message hash
;   - a8[7]: valid signature counter

routine VALIDATE_MULTISIG_2_OF_3:
    ; Initialize counter
    ; a8[7] = 0

    ; === Verify signature 1 ===
    secp256k1_verify r256[0], r512[3], r256[6]
    jif     CK, .sig1_invalid

    ; Signature 1 valid - increment counter
    ; a8[7]++
    ; Reset CK for next check
    mov     CO, CK      ; Move CK to CO (resets CK)

.sig1_invalid:
    ; Continue regardless

    ; === Verify signature 2 ===
    secp256k1_verify r256[1], r512[4], r256[6]
    jif     CK, .sig2_invalid

    ; Signature 2 valid - increment counter
    ; a8[7]++

.sig2_invalid:

    ; === Verify signature 3 ===
    secp256k1_verify r256[2], r512[5], r256[6]
    jif     CK, .sig3_invalid

    ; Signature 3 valid - increment counter
    ; a8[7]++

.sig3_invalid:

    ; === Check if we have at least 2 valid signatures ===
    ; Compare a8[7] with 2
    ; (Assume comparison sets CO if a8[7] < 2)

    chk     CO
    jif     CK, insufficient_signatures

    ; Threshold met
    ret

routine insufficient_signatures:
    fail    CK
    ret
```

### Example 4: Merkle Proof Verification

Verifies inclusion of data in a Merkle tree:

```asm
; Merkle Inclusion Proof Verification
; Inputs:
;   - r256[0]: Merkle root (expected)
;   - r256[1]: leaf data hash
;   - r512[2]: proof path (simplified - real proof would be larger)
;   - a8[3]: proof length (number of hashes in path)
;
; This is a simplified example - real Merkle proofs require
; iterating through proof path and hashing at each level

routine VERIFY_MERKLE_PROOF:
    ; Use built-in merkle_verify instruction
    merkle_verify r256[0], r256[1], r512[2]

    ; Check result
    jif     CK, proof_invalid

    ; Proof valid - data is in tree
    ret

routine proof_invalid:
    fail    CK
    ret
```

**Alternative manual implementation**:
```asm
; Manual Merkle proof verification (iterative)
routine VERIFY_MERKLE_MANUAL:
    ; Current hash = leaf hash
    ; Copy r256[1] to r256[10] (working hash)

    ; Loop through proof path
    ; For each sibling hash in proof:
    ;   1. Concatenate current_hash + sibling (or sibling + current_hash)
    ;   2. Hash the concatenation
    ;   3. Result becomes new current_hash

    ; After all iterations, compare current_hash with root
    ; (Detailed implementation omitted for brevity)

    ret
```

### Example 5: Complexity Budget Enforcement

Demonstrates complexity-aware programming:

```asm
; Complexity-Aware Operation
; Demonstrates checking remaining complexity budget

routine EXPENSIVE_OPERATION:
    ; Assume we can read CA (complexity accumulator)
    ; and CL (complexity limit)

    ; Check if we have enough budget for expensive op
    ; (Simplified - would need actual register access)

    ; Perform expensive cryptographic operation
    sha256  r256[0], r256[1], 1024  ; Hash 1KB

    ; Check if we exceeded limit
    ; (VM automatically halts if CA > CL)

    ; If we're here, we're within budget
    ret
```

### Example 6: Library Call Pattern

Demonstrates calling external library functions:

```asm
; Main contract code
routine MAIN:
    ; Prepare arguments for library function
    ; (Load data into designated registers)

    ; Call standard library function
    call    STD_CRYPTO_LIB, SHA256_ENTRY

    ; Library function returns with result in r256[0]
    ; Continue processing
    ret

; In standard library (STD_CRYPTO_LIB):
routine SHA256_ENTRY:
    ; Perform SHA256 operation
    ; Input in r256[1], output in r256[0]
    sha256  r256[0], r256[1], 32
    ret
```

### Example 7: Error Code Propagation

Comprehensive error handling with error codes:

```asm
; Contract with detailed error codes
; Error codes stored in a8[31] (designated error register)

routine MAIN:
    call    VALIDATE_INPUTS
    jif     CK, .error_exit

    call    VALIDATE_SIGNATURES
    jif     CK, .error_exit

    call    VALIDATE_AMOUNTS
    jif     CK, .error_exit

    ; All validations passed
    ; a8[31] = 0 (success)
    stop

.error_exit:
    ; Error code already set by sub-routine
    ; CK is true
    stop

routine VALIDATE_INPUTS:
    ; Validate input format
    ; If invalid, set error code and fail
    ; a8[31] = 1 (ERROR_INVALID_INPUT)
    ; fail CK
    ret

routine VALIDATE_SIGNATURES:
    ; Validate signatures
    ; If invalid, set error code
    ; a8[31] = 2 (ERROR_INVALID_SIGNATURE)
    ret

routine VALIDATE_AMOUNTS:
    ; Validate amounts
    ; If invalid, set error code
    ; a8[31] = 3 (ERROR_INVALID_AMOUNT)
    ret
```

## Instruction Reference Quick Table

Complete quick reference for all core control flow instructions:

| Opcode | Mnemonic | Size | Complexity | Description |
|--------|----------|------|------------|-------------|
| 0x00 | `nop` | 1 | 0 | No operation |
| 0x01 | `not CO` | 1 | 2,000 | Invert carry/overflow flag |
| 0x02 | `chk CO` | 1 | 2,000 | Test CO; set CK if failed |
| 0x03 | `chk CK` | 1 | 2,000 | Test CK; halt if failed |
| 0x04 | `fail CK` | 1 | 2,000 | Set CK to failed state |
| 0x05 | `mov CO,CK` | 1 | 2,000 | Copy CK→CO, reset CK |
| 0x06 | `jmp ADDR` | 3 | 10,000 | Absolute jump (u16) |
| 0x07 | `jif CO, ADDR` | 3 | 20,000 | Jump if CO failed |
| 0x08 | `jif CK, ADDR` | 3 | 20,000 | Jump if CK failed |
| 0x09 | `jmp SHIFT` | 2 | 10,000 | Relative jump (i8) |
| 0x0A | `jif CO, SHIFT` | 2 | 20,000 | Relative jump if CO failed |
| 0x0B | `jif CK, SHIFT` | 2 | 20,000 | Relative jump if CK failed |
| 0x0C | `jmp LIB, ADDR` | 36 | 20,032 | External library jump |
| 0x0D | `call POS` | 3 | 30,000 | Local subroutine call |
| 0x0E | `call LIB, ADDR` | 36 | 20,032 | External library call |
| 0x0F | `ret` | 1 | 20,000 | Return from call |
| 0x10 | `stop` | 1 | 0 | Halt execution |

## Register Summary

### Flag Registers
- **CK** (Check, 1 bit): Validation failure flag
- **CO** (Carry/Overflow, 1 bit): Temporary test flag
- **CH** (Halt, 1 bit): Auto-halt on CK failure

### Counter Registers
- **CF** (Failure Counter, 64 bits): Count of CK failures
- **CY** (Cycle Counter, 16 bits): Jump counter (max 65,536)
- **CA** (Complexity Accumulator, 64 bits): Cumulative complexity
- **CL** (Complexity Limit, 64 bits, optional): Maximum complexity budget

### General Purpose Registers
- **a8[0..31]**: 8-bit arithmetic (32 registers)
- **a16[0..31]**: 16-bit arithmetic (32 registers)
- **a32[0..31]**: 32-bit arithmetic (32 registers)
- **a64[0..31]**: 64-bit arithmetic (32 registers)

### Floating Point Registers
- **f16[0..31]**: IEEE 754 half precision
- **f32[0..31]**: IEEE 754 single precision
- **f64[0..31]**: IEEE 754 double precision

### Cryptographic Registers
- **r128[0..31]**: 128-bit wide operations
- **r256[0..31]**: 256-bit wide operations (hashes, keys)
- **r512[0..31]**: 512-bit wide operations (signatures)
- **r1024[0..31]**: 1024-bit wide operations

### Special Registers
- **CS** (Call Stack, 192 KB): Return addresses
- **CP** (Call Pointer, 16 bits): Stack pointer

## Programming Guidelines

### Best Practices

1. **Always check CK after critical operations**:
   ```asm
   secp256k1_verify r256[0], r512[1], r256[2]
   jif CK, error_handler  ; Don't skip this!
   ```

2. **Use relative jumps for local branches** (smaller bytecode):
   ```asm
   jif CO, +error_nearby   ; 2 bytes
   ; vs
   jif CO, 0x00FF          ; 3 bytes
   ```

3. **Minimize complexity costs**:
   - Prefer simple operations over complex ones
   - Batch operations when possible
   - Avoid unnecessary jumps

4. **Structure code with clear error paths**:
   ```asm
   call VALIDATE
   jif CK, error
   call PROCESS
   jif CK, error
   stop
   error:
       fail CK
       stop
   ```

5. **Document complexity budgets**:
   ```asm
   ; Complexity budget: ~100,000 units
   ; - Signature verification: ~50,000
   ; - Hash operations: ~30,000
   ; - Control flow: ~20,000
   ```

### Common Pitfalls

1. **Forgetting to check CK after operations**:
   ```asm
   ; BAD:
   secp256k1_verify r256[0], r512[1], r256[2]
   ; Continuing without checking CK!

   ; GOOD:
   secp256k1_verify r256[0], r512[1], r256[2]
   jif CK, signature_invalid
   ```

2. **Infinite loops** (exceeds cycle limit):
   ```asm
   ; BAD - will hit 65,536 cycle limit:
   loop:
       jmp loop  ; Infinite loop

   ; GOOD - bounded loop:
   loop:
       ; ... operations ...
       ; decrement counter
       jif CO, loop  ; Exit condition
   ```

3. **Stack overflow** (too many nested calls):
   ```asm
   ; BAD - unbounded recursion:
   recursive:
       call recursive

   ; GOOD - bounded recursion with depth check:
   recursive:
       ; Check depth limit
       jif CK, too_deep
       call recursive
   ```

4. **Not resetting CK between independent checks**:
   ```asm
   ; BAD:
   call CHECK1
   call CHECK2  ; If CHECK1 failed, this is skipped by behavior

   ; GOOD:
   call CHECK1
   jif CK, error
   call CHECK2
   jif CK, error
   ```

### Performance Optimization

1. **Instruction selection**:
   - Use `jmp SHIFT` (2 bytes) instead of `jmp ADDR` (3 bytes) when possible
   - Batch similar operations together
   - Minimize calls (30,000 complexity) vs inline code

2. **Register allocation**:
   - Reuse registers to minimize memory access
   - Keep frequently used values in registers
   - Use appropriate register sizes (don't use a64 for small values)

3. **Complexity management**:
   - Profile complexity usage
   - Optimize hot paths
   - Consider complexity budget early in design

## Bytecode Encoding Reference

### Encoding Rules

1. **Little-endian** byte order for all multi-byte values
2. **Variable-length** instructions (1 to 36 bytes)
3. **Opcode first**, then arguments

### Example Encodings

```
nop:
  [0x00]

not CO:
  [0x01]

jmp 0x0100:
  [0x06, 0x00, 0x01]
   opcode ^^^^^ ^^^^^
          low   high

jmp +10:
  [0x09, 0x0A]
   opcode ^^^^
          shift (10 decimal)

jmp -20:
  [0x09, 0xEC]
   opcode ^^^^
          shift (-20 as i8)

call 0x0200:
  [0x0D, 0x00, 0x02]

ret:
  [0x0F]

stop:
  [0x10]
```

## Related Documentation

- [AluVM Overview](./overview.md) - VM architecture and design philosophy
- [Memory Model](./memory-model.md) - Memory organization and access patterns
- [Prism Computing](../prism-computing.md) - RGB computing model
- [Contractum Guide](../../guides/contracts/contractum.md) - High-level contract programming

## References

### Specifications
- AluVM ISA Specification (Rust implementation)
- RGB Protocol Specification
- Bitcoin Script Reference

### Research Papers
- Client-Side Validation: A New Paradigm for Blockchain Computing
- Deterministic VM Design for Consensus-Free Validation

### External Resources
- [SECP256k1 Curve Specification](https://www.secg.org/sec2-v2.pdf)
- [BIP-340: Schnorr Signatures](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [SHA-256 Specification (FIPS 180-4)](https://csrc.nist.gov/publications/detail/fips/180/4/final)

---

**Document Status**: Comprehensive reference - Core control flow instructions (0x00-0x10) fully documented with examples. Extended instruction set (arithmetic, data movement, etc.) in summary form.

**Last Updated**: 2026-01-17

**Version**: 1.0
