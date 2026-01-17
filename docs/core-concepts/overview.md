---
sidebar_position: 1
title: Core Concepts Overview
description: Understanding the fundamental concepts of RGB Protocol
---

# Core Concepts Overview

RGB is built on revolutionary distributed computing concepts that enable smart contracts on Bitcoin without modifying the blockchain itself. This section introduces the core architectural principles.

## The RGB Paradigm

RGB fundamentally reverses traditional blockchain validation through three key concepts:

### 1. Client-Side Validation

Unlike traditional blockchains where every node validates every transaction, RGB uses **client-side validation**:

- Only parties involved in a transaction validate its history
- Validation data is transferred off-chain via consignments
- Bitcoin blockchain contains only cryptographic commitments
- Privacy is preserved as others can't see your transactions

[Learn more about Client-Side Validation →](/core-concepts/client-side-validation)

### 2. Bitcoin UTXO Binding

RGB prevents double-spending by binding state to Bitcoin UTXOs:

- Each RGB state is bound to a specific Bitcoin UTXO
- Spending the UTXO commits the new RGB state
- Bitcoin consensus prevents double-spending UTXOs
- Therefore: RGB state cannot be double-spent
- No RGB-specific consensus needed (Bitcoin handles it)

[Learn more about UTXO binding →](/core-concepts/single-use-seals)

### 3. PRISM Computing

RGB implements **Partially-Replicated Infinite State Machines** (PRISM):

- Not all participants replicate the entire state
- Each party maintains only their relevant state fragment
- State evolves as a directed acyclic graph (DAG)
- Enables massive scalability

[Learn more about PRISM Computing →](/core-concepts/prism-computing)

## RGB Architecture Layers

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#667eea','primaryTextColor':'#fff','primaryBorderColor':'#764ba2','lineColor':'#764ba2','secondaryColor':'#f8f9fa','tertiaryColor':'#fff'}}}%%
graph TB
    subgraph layer7[" "]
        A["<b>Contractum Smart Contract Language</b><br/>High-level contract definition"]
    end
    subgraph layer6[" "]
        B["<b>RGB Schema & Interfaces</b><br/>Contract templates & APIs<br/>(RGB20, RGB21, RGB22, ...)"]
    end
    subgraph layer5[" "]
        C["<b>zk-AluVM Virtual Machine</b><br/>Contract execution & validation<br/>(40 instructions, non-von-Neumann)"]
    end
    subgraph layer4[" "]
        D["<b>Client-Side Validation</b><br/>State validation logic<br/>(Consignments, State Transitions)"]
    end
    subgraph layer3[" "]
        E["<b>UTXO Binding</b><br/>Ownership & double-spend prevention<br/>(Bitcoin UTXOs)"]
    end
    subgraph layer2[" "]
        F["<b>Deterministic Bitcoin Commitments</b><br/>Commitment layer<br/>(Tapret, Opret, MPC)"]
    end
    subgraph layer1[" "]
        G["<b>Bitcoin & Lightning Network</b><br/>Settlement & publication layer"]
    end

    A --> B --> C --> D --> E --> F --> G

    style layer7 fill:#667eea,stroke:#764ba2,stroke-width:2px,color:#fff
    style layer6 fill:#7c8ff0,stroke:#764ba2,stroke-width:2px,color:#fff
    style layer5 fill:#92a0f3,stroke:#764ba2,stroke-width:2px,color:#fff
    style layer4 fill:#a8b1f6,stroke:#764ba2,stroke-width:2px,color:#fff
    style layer3 fill:#bec2f9,stroke:#764ba2,stroke-width:2px,color:#fff
    style layer2 fill:#d4d3fc,stroke:#764ba2,stroke-width:2px,color:#333
    style layer1 fill:#eae4ff,stroke:#764ba2,stroke-width:2px,color:#333
    style A fill:transparent,stroke:none,color:#fff
    style B fill:transparent,stroke:none,color:#fff
    style C fill:transparent,stroke:none,color:#fff
    style D fill:transparent,stroke:none,color:#fff
    style E fill:transparent,stroke:none,color:#333
    style F fill:transparent,stroke:none,color:#333
    style G fill:transparent,stroke:none,color:#333
```

## Key Components

### AluVM Virtual Machine

RGB uses **zk-AluVM**, a revolutionary VM designed for zk-STARK compatibility:

- **40 instructions** total (vs thousands in traditional VMs)
- **Non-von-Neumann** architecture
- **Read-once memory** compatible with single-use seals
- **Turing-complete** despite simplicity
- **Formally verifiable** code analysis

[Explore AluVM →](/core-concepts/aluvm/overview)

### State Management

RGB v0.12 unified all state into a single type of finite field elements:

- **Owned State**: Rights controlled by Bitcoin script
- **Global State**: Public information accessible to all
- **Metadata**: Additional contract-specific data

[Learn about State Management →](/core-concepts/state/unified-state)

### Bitcoin Integration

RGB leverages Bitcoin through deterministic commitments:

- **Tapret**: Taproot-based commitments (preferred)
- **Opret**: OP_RETURN-based commitments (fallback)
- **MPC**: Multi-Protocol Commitments for efficiency

[Understand Bitcoin Integration →](/core-concepts/bitcoin/deterministic-commitments)

## Data Flow

### Contract Issuance

```mermaid
graph LR
    A[Issuer] -->|Creates Genesis| B[Contract]
    B -->|Commits to Bitcoin| C[Blockchain]
    B -->|Distributes| D[Recipients]
```

### Asset Transfer

```mermaid
graph LR
    A[Recipient] -->|Creates Invoice| B[Sender]
    B -->|Creates Consignment| C[Transfer Data]
    C -->|Validates| A
    B -->|Commits to Bitcoin| D[Blockchain]
```

## Design Principles

### Privacy by Design

- Original transaction details are never published
- Only cryptographic hashes visible on-chain
- State distributed only to relevant parties
- Optional blinding for UTXO allocations

### Scalability

- Validation complexity grows with personal history, not global state
- Parallel validation across different assets
- No blockchain bloat from smart contract execution
- Lightning Network integration for instant transfers

### Simplicity

RGB v0.12 achieved dramatic simplification:

- **4x reduction** in codebase size
- **Single unified state type**
- **40-instruction VM**
- Easier to audit and verify

### Bitcoin-Native

- No altcoins or separate consensus
- Leverages Bitcoin's security
- Compatible with Lightning Network
- Uses existing Bitcoin primitives

## RGB vs Traditional Smart Contracts

| Aspect | Traditional (Ethereum) | RGB |
|--------|----------------------|-----|
| Validation | Global (all nodes) | Client-side (parties only) |
| State Storage | On-chain (public) | Off-chain (private) |
| Privacy | Minimal | Strong |
| Scalability | Limited | Massive |
| Fees | Variable, often high | Bitcoin TX fees only |
| Execution | On-chain | Off-chain |
| Blockchain | Purpose-built | Bitcoin |

## Understanding RGB Through Use Cases

### Fungible Tokens (RGB20)

```
Issue stablecoins, securities, utility tokens
↓
Transfer instantly on Lightning
↓
Maintain complete privacy
↓
Pay only Bitcoin transaction fees
```

### Non-Fungible Tokens (RGB21)

```
Create unique digital assets
↓
Attach rich metadata
↓
Transfer ownership via Bitcoin
↓
Prove authenticity through validation
```

### Complex Contracts

```
Write in Contractum language
↓
Compile to AluVM bytecode
↓
Execute validation logic
↓
Enforce rules via single-use seals
```

## zk-STARK Future

RGB v0.12 was designed for future zk-STARK integration:

```
Current: ~100 lines of validation code
↓
Future: Single zk-STARK proof
↓
Result: Constant-size validation
+ Ultimate privacy
+ Instant verification
```

## Key Takeaways

1. **Client-side validation** keeps data off-chain and private
2. **Bitcoin UTXO binding** leverages existing double-spend prevention
3. **PRISM computing** enables massive scalability
4. **AluVM** provides Turing-complete contract execution
5. **Bitcoin-native** design leverages existing security
6. **zk-ready** architecture prepares for zero-knowledge future

## Next Steps

Dive deeper into specific concepts:

- [**Client-Side Validation**](/core-concepts/client-side-validation) - How RGB validates without blockchain
- [**UTXO Binding**](/core-concepts/single-use-seals) - Using Bitcoin's UTXO model
- [**AluVM**](/core-concepts/aluvm/overview) - The RGB virtual machine
- [**State Management**](/core-concepts/state/unified-state) - How RGB manages state
- [**Bitcoin Integration**](/core-concepts/bitcoin/deterministic-commitments) - RGB's Bitcoin layer

## Additional Resources

- [RGB Blueprint](https://rgb-org.github.io/) - Comprehensive technical specification
- [RGB FAQ](https://www.rgbfaq.com) - Common questions answered
- [Academic Papers](https://rgb.tech/research) - Research publications
