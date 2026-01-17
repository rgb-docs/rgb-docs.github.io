---
sidebar_position: 1
title: RGB API Reference
description: Complete API reference for RGB v0.12
---

# RGB API Reference

Complete API documentation for RGB v0.12 core libraries and interfaces.

## Core API

### Contract

```typescript
interface Contract {
  contractId: ContractId;
  schema: SchemaId;

  // State queries
  getGlobalState(): GlobalState;
  getOwnedState(owner?: Owner): OwnedState[];
  getHistory(): StateHistory[];

  // Operations
  createTransition(params: TransitionParams): Transition;
  validate(): ValidationResult;
}
```

*Contract API to be expanded*

### Wallet

```typescript
interface RgbWallet {
  // Asset management
  listAssets(): Promise<Asset[]>;
  getBalance(contractId: ContractId): Promise<Balance>;

  // Transfers
  createInvoice(params: InvoiceParams): Promise<Invoice>;
  transfer(params: TransferParams): Promise<Transfer>;
  acceptConsignment(consignment: Consignment): Promise<void>;

  // UTXO management
  listUtxos(): Promise<Utxo[]>;
  selectUtxos(params: CoinSelection): Promise<Utxo[]>;
}
```

*Wallet API to be expanded*

## RGB20 API

```typescript
class Rgb20Contract extends Contract {
  static create(params: Rgb20Params): Promise<Rgb20Contract>;

  getTicker(): string;
  getName(): string;
  getPrecision(): number;
  getTotalSupply(): bigint;

  transfer(to: Invoice, amount: bigint): Promise<Transfer>;
  issue(amount: bigint): Promise<Transition>;
  burn(amount: bigint): Promise<Transition>;
}
```

*RGB20 API to be expanded*

## RGB21 API

```typescript
class Rgb21Contract extends Contract {
  static create(params: Rgb21Params): Promise<Rgb21Contract>;

  getMetadata(): NftMetadata;
  getTokenData(tokenId: TokenId): TokenData;

  mint(params: MintParams): Promise<Transition>;
  transfer(to: Invoice, tokenId: TokenId): Promise<Transfer>;
}
```

*RGB21 API to be expanded*

## State API

```typescript
interface GlobalState {
  [key: string]: StateValue;
}

interface OwnedState {
  seal: Seal;
  amount: bigint;
  data?: AttachmentId;
  rights?: Right[];
}

interface StateTransition {
  transitionId: TransitionId;
  transitionType: string;
  inputs: OwnedState[];
  outputs: OwnedState[];
  globals: GlobalState;
}
```

*State API to be expanded*

## Validation API

```typescript
interface Validator {
  validate(item: Validatable): ValidationResult;
  validateSchema(schema: Schema): SchemaValidation;
  validateTransition(transition: Transition): TransitionValidation;
  validateConsignment(consignment: Consignment): ConsignmentValidation;
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}
```

*Validation API to be expanded*

## Consignment API

```typescript
interface Consignment {
  contractId: ContractId;
  transfer: Transition;
  history: StateHistory;
  proofs: Proof[];

  serialize(): Uint8Array;
  static deserialize(data: Uint8Array): Consignment;

  validate(): ValidationResult;
  extract(): ExtractedState;
}
```

*Consignment API to be expanded*

## Invoice API

```typescript
interface Invoice {
  assetId: ContractId;
  amount: bigint;
  recipient: BlindedUtxo;
  expiry?: Date;

  toString(): string;
  static parse(invoice: string): Invoice;

  verify(): boolean;
}
```

*Invoice API to be expanded*

## Schema API

```typescript
interface Schema {
  schemaId: SchemaId;
  name: string;
  version: string;

  globalState: StateSchema;
  ownedState: StateSchema;
  transitions: TransitionSchema[];

  validate(contract: Contract): ValidationResult;
  compile(): CompiledSchema;
}
```

*Schema API to be expanded*

## Error Handling

```typescript
enum RgbError {
  InvalidContract,
  InvalidTransition,
  InvalidConsignment,
  ValidationFailed,
  InsufficientBalance,
  UtxoNotFound,
  NetworkError
}

class RgbException extends Error {
  code: RgbError;
  details: string;
}
```

*Error types to be expanded*

## Events

```typescript
interface RgbEvents {
  on(event: 'transfer_received', listener: (transfer: Transfer) => void): void;
  on(event: 'transfer_confirmed', listener: (transfer: Transfer) => void): void;
  on(event: 'contract_created', listener: (contract: Contract) => void): void;
  on(event: 'state_updated', listener: (state: StateUpdate) => void): void;
}
```

*Events to be expanded*

## Configuration

```typescript
interface RgbConfig {
  network: 'bitcoin' | 'testnet' | 'regtest';
  stashPath: string;

  bitcoin: {
    rpcUrl: string;
    rpcUser?: string;
    rpcPassword?: string;
  };

  rgb?: {
    nodeUrl?: string;
    contracts?: ContractId[];
  };
}
```

*Configuration to be expanded*

## Related Documentation

- [CLI Reference](./cli.md)
- [Interfaces](./interfaces.md)
- [Rust SDK](../guides/development/rust-sdk.md)
- [RGB.js SDK](../guides/development/rgbjs.md)
