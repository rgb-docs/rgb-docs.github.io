---
sidebar_position: 10
title: Glossary
description: RGB terms for both RGB lines, with the line each term belongs to.
rgb_line: both
verified_with: rgb-wallet 0.12.0-rc.3; rgb-cmd 0.11.1
last_update:
  date: 2026-10-21
---

# Glossary

:::info Applies to both RGB lines
Most terms are shared. Terms tagged **(v0.11)** exist only in Line B and terms tagged **(v0.12)** only in Line A. See [Two RGB lines](/getting-started/two-rgbs).
:::

**Allocation.** A piece of owned state assigned to a seal, such as 100 units of a token on one UTXO.

**AluVM.** The register-based virtual machine that runs RGB validation scripts. Line B uses `rgb-aluvm`, a fork of AluVM 0.11. Line A uses zk-AluVM 0.12. See [AluVM](/core-concepts/aluvm/overview).

**Anchor.** The proof that ties an RGB operation to a Bitcoin transaction: the MPC proof plus the tapret or opret proof.

**API (v0.12).** The non-consensus part of a v0.12 contract type. It says how state is read and written, names the methods and computes derived values. See [Interfaces, schemas and codexes](./interfaces.md).

**Auth token (v0.12).** A seal reference in a v0.12 invoice, printed as `at:…`. It is derived from a wallet UTXO and doesn't reveal it. v0.12 has no blinded seals; the auth token takes their place in invoices.

**Baid64.** The text encoding for RGB ids: Base64 with the alphabet `A–Za–z0–9_~`, an optional prefix such as `rgb:` or `contract:`, `-` chunking and an optional checksum. See [Encoding formats](./encodings.md).

**Blinded UTXO, `utxob` (v0.11).** A UTXO hidden behind a hash with a secret blinding factor, used as the seal in v0.11 invoices (`utxob:…`). Only the receiver knows which outpoint it is.

**CFA (v0.11).** Collectible Fungible Asset, a [schema](/guides/contracts/schemas): a fungible token with an optional article string.

**Client-side validation.** Each party validates the history of the state it receives, instead of the whole network validating everything. Bitcoin only orders the commitments and prevents double spends. See [Client-side validation](/core-concepts/client-side-validation).

**Codex (v0.12).** The consensus part of a v0.12 contract type: the zk-AluVM verifiers for each call, plus the VM settings. A codex id prints like `7C15w3W1-…#heavy-cactus-quiet`.

**Consignment.** The package of contract history one party sends another, for the receiver to validate. It is binary and strict-encoded. See [Consignments](./consignments.md).

**Contract.** One RGB contract: a genesis and the operations after it, all under one schema (v0.11) or codex (v0.12).

**Contract id.** The id of a contract, derived from its genesis. It prints as `rgb:…` in v0.11 and `contract:…` in v0.12.

**Contractum.** A contract language proposed by RGB-WG. Neither pinned CLI accepts Contractum source.

**DBC.** Deterministic Bitcoin commitment: a commitment placed in a transaction so that only one value can be committed. Tapret and opret are the two kinds. See [Deterministic commitments](/core-concepts/bitcoin/deterministic-commitments).

**Genesis.** The first operation of a contract. It sets the initial global state and the first allocations.

**Global state.** Contract-wide data that anyone holding the contract can read, such as the ticker or issued supply. See [Global state](/core-concepts/state/global-state).

**IFA (v0.11).** Inflatable Fungible Asset, a schema with secondary issuance, burn and link. Its README says it is not production-ready, and `rgb-lib` 0.3.0-beta.7 refuses it on mainnet (`Error::CannotUseIfaOnMainnet`). Line B 0.11.2 changes it so that IFA contracts issued with the old schema become invalid ([rgb.info, 2026-10-15](https://rgb.info/rgb-protocol-v0-11-2-rc1-update/)).

**Indexer.** An Electrum, Esplora or Mempool server that the wallet asks for Bitcoin transactions. Neither CLI uses Bitcoin Core RPC. Validation asks the indexer whether each witness transaction is mined and trusts its answer, so use an indexer you trust. Line B 0.11.2-rc.1 adds optional SPV proofs to reduce this dependence ([rgb.info, 2026-10-15](https://rgb.info/rgb-protocol-v0-11-2-rc1-update/)).

**Invoice.** A request for an RGB payment: the contract, the amount and the seal to pay to. See [Invoices](./invoices.md).

**Issuer.** In v0.12, a `.issuer` file holding a codex and its APIs, which `rgb issue` creates contracts from. In v0.11, the identity string of whoever issues a contract (`rgb issue <ISSUER> …`).

**Kit (v0.11).** A strict-encoded file bundling schemas, their types and scripts, for import into a wallet (`rgb:kit:…`, magic `KIT`).

**Line A, Line B.** This site's names for the two incompatible RGB implementations: Line A is RGB-WG's v0.12 and Line B is the RGB Protocol Association's v0.11. See [Two RGB lines](/getting-started/two-rgbs).

**MMB (v0.12).** Multi-message bundle. In v0.12, the structure that puts several operations of one contract under a single MPC commitment, each tied to the witness transaction inputs it spends (`bp-core` `seals/src/txout.rs`).

**MPC.** Multi-protocol commitment: a Merkle tree that lets one Bitcoin commitment cover many contracts, with the contract id as the protocol id. See [Multi-protocol commitments](/core-concepts/bitcoin/multi-protocol-commitments).

**NIA (v0.11).** Non-Inflatable Asset, the fixed-supply fungible token schema.

**Opret.** A DBC in an `OP_RETURN` output: `OP_RETURN` followed by the 32-byte MPC commitment. See [Opret](/core-concepts/bitcoin/opret).

**Owned state.** State assigned to a seal and controlled by whoever can spend that seal, such as a token balance. See [Owned state](/core-concepts/state/owned-state).

**PFA (v0.11).** Permissioned Fungible Asset: a fixed-supply token where the issuer signs every transfer. Not production-ready according to its README.

**Schema (v0.11).** The template a v0.11 contract follows: its state types, transitions and validation scripts. v0.12 has no schemas. See [Schemas](/guides/contracts/schemas).

**Seal, single-use seal.** A Bitcoin transaction output that owned state is assigned to. Spending the output closes the seal, and the spending transaction must commit to the operation that moves the state on. See [Single-use seals](/core-concepts/single-use-seals).

**Stash.** The wallet's local store of contract data: genesis, operations, witnesses and, in v0.11, schemas. Back it up: a wallet seed alone doesn't restore RGB assets.

**Stock (v0.11).** The `rgb-ops` type that combines the stash with the computed contract state and its index.

**Strict encoding.** RGB's deterministic binary encoding, with no type tags and length prefixes whose width follows from each type's maximum size. See [Strict types](./strict-types.md).

**Tapret.** A DBC inside a taproot output, as a tapscript leaf of 29 padding opcodes, `OP_RETURN` and the commitment. The padding opcode differs between the lines, so a tapret made by one doesn't verify in the other. See [Tapret](/core-concepts/bitcoin/tapret).

**Terminal.** A seal at the end of the history in a consignment: the seal the receiver now owns.

**Transition.** An operation that spends existing seals and assigns state to new ones. In v0.11, transitions of one contract in one transaction are grouped into a **transition bundle**.

**UDA (v0.11).** Unique Digital Asset, the schema for a single NFT per contract.

**Witness transaction.** The Bitcoin transaction that closes the input seals of an operation and carries its commitment.

**`wout` (v0.12), `wvout` (v0.11).** A seal on an output of the payer's own witness transaction, used in invoices when the receiver gives an address instead of a UTXO.

**zk-AluVM, UltraSONIC (v0.12).** The v0.12 VM, which works on field elements, and the v0.12 contract layer built on it.

## Further reading

- [Glossary](https://docs.rgb.info/annexes/glossary) in the Line B official docs
- [FAQ](./faq.md)
