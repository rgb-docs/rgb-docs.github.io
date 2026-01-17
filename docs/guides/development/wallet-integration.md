---
sidebar_position: 3
title: Wallet Integration
description: Integrating RGB into Bitcoin wallets and applications
---

# Wallet Integration

Learn how to integrate RGB smart contract support into Bitcoin wallets and applications.

## Integration Overview

RGB wallets extend Bitcoin wallets with smart contract capabilities. Unlike traditional Bitcoin wallets that only track UTXOs and balances, RGB wallets must manage:

- **Bitcoin Layer**: UTXOs, transactions, and blockchain state
- **RGB Layer**: Contract state, consignments, and client-side validation
- **Privacy Layer**: Blinded UTXOs and confidential transfers

### Key Responsibilities

1. **UTXO Management**: Track which UTXOs hold RGB assets
2. **State Management**: Maintain RGB stash (local contract state)
3. **Transfer Coordination**: Handle invoice creation, PSBT building, and consignment exchange
4. **Validation**: Verify all received transfers client-side
5. **Backup & Recovery**: Preserve both Bitcoin keys and RGB state

### Architecture Layers

```
┌─────────────────────────────────────┐
│         User Interface              │
│  (Balance, Send, Receive, History)  │
└─────────────────────────────────────┘
           │
┌─────────────────────────────────────┐
│      RGB Wallet Logic               │
│  (Invoice, Transfer, Consignment)   │
└─────────────────────────────────────┘
           │
┌──────────────────┬──────────────────┐
│   RGB Stash      │   Bitcoin Wallet │
│ (Contract State) │  (UTXOs, Keys)   │
└──────────────────┴──────────────────┘
           │
┌──────────────────┬──────────────────┐
│  RGB Node/Lib    │  Bitcoin Node    │
│  (Validation)    │  (Blockchain)    │
└──────────────────┴──────────────────┘
```

## Wallet Architecture

### Core Interface

Complete wallet interface that all RGB wallet implementations should follow:

```typescript
interface RgbWalletInterface {
  // Initialization
  initialize(): Promise<void>;
  sync(): Promise<void>;
  close(): Promise<void>;

  // Asset management
  listAssets(filter?: AssetFilter): Promise<Asset[]>;
  getAsset(contractId: ContractId): Promise<AssetInfo>;
  getBalance(contractId: ContractId): Promise<bigint>;
  getBalances(): Promise<Map<ContractId, bigint>>;

  // UTXO management
  listUtxos(filter?: UtxoFilter): Promise<Utxo[]>;
  getRgbAllocations(utxo: Utxo): Promise<Allocation[]>;
  getUtxoAllocations(contractId: ContractId): Promise<Map<Utxo, bigint>>;

  // Transfer operations
  createInvoice(params: InvoiceParams): Promise<Invoice>;
  parseInvoice(invoiceString: string): Promise<Invoice>;
  transfer(params: TransferParams): Promise<Transfer>;
  acceptTransfer(consignment: Consignment): Promise<void>;

  // Transaction building
  createTransferPsbt(params: TransferParams): Promise<{
    psbt: Psbt;
    consignment: Consignment;
  }>;
  finalizeTransfer(params: FinalizeParams): Promise<Transfer>;

  // History and monitoring
  getTransactionHistory(contractId?: ContractId): Promise<Transaction[]>;
  getTransfer(txid: Txid): Promise<TransferInfo | null>;
  watchTransfer(txid: Txid, callback: (status: TransferStatus) => void): void;

  // State management
  exportStash(): Promise<StashBackup>;
  importStash(backup: StashBackup): Promise<void>;
  validateStash(): Promise<ValidationResult>;

  // Events
  on(event: WalletEvent, handler: EventHandler): () => void;
  once(event: WalletEvent, handler: EventHandler): () => void;
  off(event: WalletEvent, handler: EventHandler): void;
}
```

### Implementation Patterns

```typescript
class RgbWallet implements RgbWalletInterface {
  private bitcoinWallet: BitcoinWallet;
  private stash: RgbStash;
  private utxoManager: UtxoManager;
  private eventEmitter: EventEmitter;

  constructor(config: WalletConfig) {
    this.bitcoinWallet = new BitcoinWallet(config.bitcoin);
    this.stash = new RgbStash(config.stashPath);
    this.utxoManager = new UtxoManager(this.bitcoinWallet, this.stash);
    this.eventEmitter = new EventEmitter();
  }

  async initialize(): Promise<void> {
    // Initialize Bitcoin wallet
    await this.bitcoinWallet.initialize();

    // Load RGB stash
    await this.stash.load();

    // Sync UTXO set with RGB allocations
    await this.sync();

    this.emit('initialized');
  }

  async sync(): Promise<void> {
    this.emit('sync_started');

    try {
      // Sync Bitcoin wallet
      await this.bitcoinWallet.sync();

      // Update RGB allocations
      await this.utxoManager.updateAllocations();

      // Validate stash consistency
      await this.stash.validate();

      this.emit('sync_completed');

    } catch (error) {
      this.emit('sync_error', error);
      throw error;
    }
  }

  async listAssets(filter?: AssetFilter): Promise<Asset[]> {
    const contracts = await this.stash.listContracts();

    const assets = await Promise.all(
      contracts.map(async (contract) => {
        const balance = await this.getBalance(contract.contractId);

        return {
          contractId: contract.contractId,
          schema: contract.schema,
          ticker: contract.ticker,
          name: contract.name,
          precision: contract.precision,
          balance: balance
        };
      })
    );

    // Apply filters
    if (filter) {
      return assets.filter(asset => {
        if (filter.schema && asset.schema !== filter.schema) {
          return false;
        }
        if (filter.minBalance && asset.balance < filter.minBalance) {
          return false;
        }
        return true;
      });
    }

    return assets;
  }

  private emit(event: string, data?: any) {
    this.eventEmitter.emit(event, data);
  }
}
```

## UTXO Management

### RGB-Aware Coin Selection

RGB assets are tied to specific UTXOs, requiring specialized coin selection:

```typescript
class RgbUtxoManager {
  constructor(
    private bitcoinWallet: BitcoinWallet,
    private stash: RgbStash
  ) {}

  /**
   * Select UTXOs for RGB transfer
   * Must ensure selected UTXOs contain sufficient RGB assets
   */
  async selectUtxosForTransfer(params: {
    contractId: ContractId;
    amount: bigint;
    feeRate: number;
  }): Promise<UtxoSelection> {
    // Get all UTXOs with this asset
    const rgbUtxos = await this.getUtxosWithAsset(params.contractId);

    // Sort by amount (largest first for efficiency)
    rgbUtxos.sort((a, b) => {
      return Number(b.rgbAmount - a.rgbAmount);
    });

    const selected: RgbUtxo[] = [];
    let totalRgb = 0n;
    let totalSats = 0;

    // Select UTXOs until we have enough RGB assets
    for (const utxo of rgbUtxos) {
      selected.push(utxo);
      totalRgb += utxo.rgbAmount;
      totalSats += utxo.bitcoinAmount;

      if (totalRgb >= params.amount) {
        break;
      }
    }

    if (totalRgb < params.amount) {
      throw new RgbError(
        'Insufficient RGB assets',
        RgbErrorCode.InsufficientFunds,
        { required: params.amount, available: totalRgb }
      );
    }

    // Calculate required Bitcoin for fees
    const estimatedSize = this.estimateTransactionSize(selected.length, 2);
    const requiredFee = estimatedSize * params.feeRate;

    // Add Bitcoin-only UTXOs if needed for fees
    if (totalSats < requiredFee) {
      const additionalSats = requiredFee - totalSats;
      const bitcoinUtxos = await this.selectBitcoinUtxos(additionalSats);
      selected.push(...bitcoinUtxos);
      totalSats += bitcoinUtxos.reduce((sum, u) => sum + u.bitcoinAmount, 0);
    }

    return {
      inputs: selected,
      totalRgbAmount: totalRgb,
      totalBitcoinAmount: totalSats,
      fee: requiredFee,
      rgbChange: totalRgb - params.amount
    };
  }

  /**
   * Get all UTXOs containing a specific RGB asset
   */
  private async getUtxosWithAsset(contractId: ContractId): Promise<RgbUtxo[]> {
    const allUtxos = await this.bitcoinWallet.listUtxos();
    const rgbUtxos: RgbUtxo[] = [];

    for (const utxo of allUtxos) {
      const allocations = await this.stash.getAllocations(utxo);
      const allocation = allocations.find(a => a.contractId === contractId);

      if (allocation) {
        rgbUtxos.push({
          ...utxo,
          rgbAmount: allocation.amount,
          contractId: contractId
        });
      }
    }

    return rgbUtxos;
  }

  /**
   * Select Bitcoin-only UTXOs for fees
   */
  private async selectBitcoinUtxos(amount: number): Promise<Utxo[]> {
    const allUtxos = await this.bitcoinWallet.listUtxos();
    const selected: Utxo[] = [];
    let total = 0;

    for (const utxo of allUtxos) {
      // Skip UTXOs with RGB allocations (preserve them)
      const hasRgb = await this.hasRgbAllocations(utxo);
      if (hasRgb) continue;

      selected.push(utxo);
      total += utxo.amount;

      if (total >= amount) break;
    }

    if (total < amount) {
      throw new RgbError(
        'Insufficient Bitcoin for fees',
        RgbErrorCode.InsufficientFunds
      );
    }

    return selected;
  }

  private async hasRgbAllocations(utxo: Utxo): Promise<boolean> {
    const allocations = await this.stash.getAllocations(utxo);
    return allocations.length > 0;
  }

  private estimateTransactionSize(inputs: number, outputs: number): number {
    // Rough estimation: 180 bytes per input + 34 bytes per output + 10 bytes overhead
    return inputs * 180 + outputs * 34 + 10;
  }
}
```

### UTXO Tracking and Indexing

```typescript
class UtxoIndex {
  private rgbIndex: Map<ContractId, Map<string, Allocation>> = new Map();
  private utxoCache: Map<string, Utxo> = new Map();

  /**
   * Build index of RGB allocations
   */
  async rebuild(wallet: RgbWallet) {
    this.rgbIndex.clear();
    this.utxoCache.clear();

    const utxos = await wallet.listUtxos();

    for (const utxo of utxos) {
      const utxoKey = `${utxo.txid}:${utxo.vout}`;
      this.utxoCache.set(utxoKey, utxo);

      const allocations = await wallet.getRgbAllocations(utxo);

      for (const allocation of allocations) {
        if (!this.rgbIndex.has(allocation.contractId)) {
          this.rgbIndex.set(allocation.contractId, new Map());
        }

        this.rgbIndex.get(allocation.contractId)!.set(utxoKey, allocation);
      }
    }
  }

  /**
   * Get all UTXOs for a contract
   */
  getUtxosForContract(contractId: ContractId): Utxo[] {
    const allocations = this.rgbIndex.get(contractId);
    if (!allocations) return [];

    return Array.from(allocations.keys())
      .map(key => this.utxoCache.get(key)!)
      .filter(Boolean);
  }

  /**
   * Get total balance for a contract
   */
  getBalance(contractId: ContractId): bigint {
    const allocations = this.rgbIndex.get(contractId);
    if (!allocations) return 0n;

    return Array.from(allocations.values())
      .reduce((sum, alloc) => sum + alloc.amount, 0n);
  }

  /**
   * Update index when UTXO is spent
   */
  markSpent(txid: string, vout: number) {
    const key = `${txid}:${vout}`;

    // Remove from all contract indexes
    for (const contractMap of this.rgbIndex.values()) {
      contractMap.delete(key);
    }

    this.utxoCache.delete(key);
  }

  /**
   * Add new UTXO with RGB allocation
   */
  async addUtxo(utxo: Utxo, allocations: Allocation[]) {
    const key = `${utxo.txid}:${utxo.vout}`;
    this.utxoCache.set(key, utxo);

    for (const allocation of allocations) {
      if (!this.rgbIndex.has(allocation.contractId)) {
        this.rgbIndex.set(allocation.contractId, new Map());
      }

      this.rgbIndex.get(allocation.contractId)!.set(key, allocation);
    }
  }
}
```

## State Synchronization

### RGB Stash Management

The stash stores all RGB contract state locally:

```typescript
class RgbStash {
  private contracts: Map<ContractId, ContractState> = new Map();
  private consignments: Map<Txid, Consignment> = new Map();
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
  }

  async load(): Promise<void> {
    // Load from filesystem or database
    const data = await fs.readFile(path.join(this.storagePath, 'stash.rgb'));
    const parsed = this.deserializeStash(data);

    this.contracts = parsed.contracts;
    this.consignments = parsed.consignments;
  }

  async save(): Promise<void> {
    const serialized = this.serializeStash();
    await fs.writeFile(
      path.join(this.storagePath, 'stash.rgb'),
      serialized
    );
  }

  /**
   * Add contract genesis
   */
  async addContract(genesis: Genesis): Promise<void> {
    const contractId = genesis.contractId();

    if (this.contracts.has(contractId)) {
      throw new RgbError('Contract already exists');
    }

    this.contracts.set(contractId, {
      contractId: contractId,
      genesis: genesis,
      schema: genesis.schema,
      transitions: [],
      globalState: genesis.globalState,
      ownedStates: new Map()
    });

    await this.save();
  }

  /**
   * Add state transition
   */
  async addTransition(
    contractId: ContractId,
    transition: Transition
  ): Promise<void> {
    const state = this.contracts.get(contractId);
    if (!state) {
      throw new RgbError('Contract not found');
    }

    // Validate transition
    await this.validateTransition(state, transition);

    // Update state
    state.transitions.push(transition);
    this.updateOwnedStates(state, transition);

    await this.save();
  }

  /**
   * Get contract state
   */
  async getContractState(contractId: ContractId): Promise<ContractState | null> {
    return this.contracts.get(contractId) || null;
  }

  /**
   * Get allocations for a UTXO
   */
  async getAllocations(utxo: Utxo): Promise<Allocation[]> {
    const allocations: Allocation[] = [];

    for (const [contractId, state] of this.contracts) {
      const ownedState = state.ownedStates.get(`${utxo.txid}:${utxo.vout}`);

      if (ownedState) {
        allocations.push({
          contractId: contractId,
          amount: ownedState.amount,
          utxo: utxo
        });
      }
    }

    return allocations;
  }

  /**
   * Import consignment
   */
  async importConsignment(consignment: Consignment): Promise<void> {
    // Validate consignment
    const validation = await this.validateConsignment(consignment);
    if (!validation.valid) {
      throw new RgbError('Invalid consignment', RgbErrorCode.ValidationFailed, {
        errors: validation.errors
      });
    }

    // Extract genesis if new contract
    if (!this.contracts.has(consignment.contractId)) {
      await this.addContract(consignment.genesis);
    }

    // Add all transitions
    for (const transition of consignment.transitions) {
      await this.addTransition(consignment.contractId, transition);
    }

    // Store consignment
    this.consignments.set(consignment.txid, consignment);

    await this.save();
  }

  /**
   * Validate entire stash
   */
  async validate(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (const [contractId, state] of this.contracts) {
      try {
        // Validate genesis
        await this.validateGenesis(state.genesis);

        // Validate all transitions
        for (const transition of state.transitions) {
          await this.validateTransition(state, transition);
        }

      } catch (error) {
        errors.push({
          contractId: contractId,
          error: error.message
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  private async validateTransition(
    state: ContractState,
    transition: Transition
  ): Promise<void> {
    // Implement RGB validation rules
    // - Check input seals are valid
    // - Verify amount conservation
    // - Validate state transitions according to schema
    // - Check Bitcoin transaction witnesses
  }

  private updateOwnedStates(state: ContractState, transition: Transition) {
    // Close old seals
    for (const input of transition.inputs) {
      state.ownedStates.delete(`${input.txid}:${input.vout}`);
    }

    // Create new seals
    for (const output of transition.outputs) {
      state.ownedStates.set(
        `${output.seal.txid}:${output.seal.vout}`,
        {
          amount: output.amount,
          seal: output.seal
        }
      );
    }
  }

  private serializeStash(): Buffer {
    // Serialize stash data
    // Use RGB-specific encoding or standard serialization
  }

  private deserializeStash(data: Buffer): any {
    // Deserialize stash data
  }

  private async validateGenesis(genesis: Genesis): Promise<void> {
    // Validate genesis according to schema
  }

  private async validateConsignment(consignment: Consignment): Promise<ValidationResult> {
    // Full consignment validation
  }
}

## Invoice Generation and Parsing

### Creating Invoices

```typescript
class InvoiceManager {
  constructor(private wallet: RgbWallet) {}

  async createInvoice(params: InvoiceParams): Promise<Invoice> {
    // Get fresh receive UTXO
    const receiveUtxo = await this.wallet.getReceiveUtxo();

    // Blind the UTXO (privacy layer)
    const blindedUtxo = await this.blindUtxo(receiveUtxo);

    // Create invoice
    const invoice = new Invoice({
      contractId: params.contractId,
      amount: params.amount,
      beneficiary: blindedUtxo,
      expiry: params.expiry || (Date.now() + 3600000), // 1 hour default
      metadata: params.metadata
    });

    // Store invoice for tracking
    await this.storeInvoice(invoice);

    return invoice;
  }

  /**
   * Blind UTXO for privacy
   */
  private async blindUtxo(utxo: Utxo): Promise<BlindedUtxo> {
    // Generate blinding factor
    const blindingFactor = await this.generateBlindingFactor();

    // Create blinded seal
    const blindedSeal = await rgbBlind({
      txid: utxo.txid,
      vout: utxo.vout,
      blindingFactor: blindingFactor
    });

    // Store blinding secret for later
    await this.storeBlindingSecret(utxo, blindingFactor);

    return blindedSeal;
  }

  /**
   * Parse and validate received invoice
   */
  async parseInvoice(invoiceString: string): Promise<Invoice> {
    try {
      const invoice = Invoice.fromString(invoiceString);

      // Validate format
      if (!invoice.contractId || !invoice.amount || !invoice.beneficiary) {
        throw new Error('Invalid invoice format');
      }

      // Check expiry
      if (invoice.expiry && invoice.expiry < Date.now()) {
        throw new Error('Invoice expired');
      }

      // Validate amount
      if (invoice.amount <= 0n) {
        throw new Error('Invalid amount');
      }

      // Check if we have the contract
      const contract = await this.wallet.getAsset(invoice.contractId);
      if (!contract) {
        throw new Error('Unknown contract');
      }

      return invoice;

    } catch (error) {
      throw new RgbError(
        `Invalid invoice: ${error.message}`,
        RgbErrorCode.InvalidInvoice
      );
    }
  }

  private async storeInvoice(invoice: Invoice) {
    // Store in database for history/tracking
  }

  private async generateBlindingFactor(): Promise<Buffer> {
    return crypto.randomBytes(32);
  }

  private async storeBlindingSecret(utxo: Utxo, secret: Buffer) {
    // Securely store blinding secret
  }
}
```

## Consignment Handling

### Creating Consignments

```typescript
class ConsignmentBuilder {
  async buildConsignment(params: {
    contractId: ContractId;
    inputs: Utxo[];
    outputs: TransferOutput[];
    bitcoinTx: Transaction;
  }): Promise<Consignment> {
    const contract = await this.stash.getContractState(params.contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Collect all necessary state
    const genesis = contract.genesis;
    const transitions: Transition[] = [];

    // Build state transition
    const transition = await this.buildTransition({
      contractId: params.contractId,
      inputs: params.inputs,
      outputs: params.outputs,
      witness: params.bitcoinTx
    });

    transitions.push(transition);

    // Include all history needed for validation
    const history = await this.collectHistory(
      params.contractId,
      params.inputs
    );

    transitions.push(...history);

    // Build consignment
    const consignment = new Consignment({
      version: 1,
      contractId: params.contractId,
      genesis: genesis,
      transitions: transitions,
      supplements: await this.collectSupplements(transitions)
    });

    return consignment;
  }

  private async buildTransition(params: any): Promise<Transition> {
    // Create RGB state transition
    return new Transition({
      contractId: params.contractId,
      inputs: params.inputs.map(utxo => ({
        previousOutput: {
          txid: utxo.txid,
          vout: utxo.vout
        }
      })),
      outputs: params.outputs,
      metadata: {},
      witness: {
        txid: params.witness.txid,
        // Additional witness data
      }
    });
  }

  private async collectHistory(
    contractId: ContractId,
    inputs: Utxo[]
  ): Promise<Transition[]> {
    // Collect all transitions in the history of these UTXOs
    const history: Transition[] = [];
    const contract = await this.stash.getContractState(contractId);

    // BFS to collect complete history
    const visited = new Set<string>();
    const queue = [...inputs];

    while (queue.length > 0) {
      const utxo = queue.shift()!;
      const key = `${utxo.txid}:${utxo.vout}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Find transition that created this UTXO
      const transition = contract.transitions.find(t =>
        t.outputs.some(o => o.seal.txid === utxo.txid && o.seal.vout === utxo.vout)
      );

      if (transition) {
        history.push(transition);

        // Add inputs to queue
        for (const input of transition.inputs) {
          queue.push({
            txid: input.previousOutput.txid,
            vout: input.previousOutput.vout
          } as Utxo);
        }
      }
    }

    return history;
  }

  private async collectSupplements(transitions: Transition[]): Promise<any[]> {
    // Collect additional data needed for validation
    // (schemas, witnesses, etc.)
    return [];
  }
}
```

### Validating Consignments

```typescript
class ConsignmentValidator {
  async validate(consignment: Consignment): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    try {
      // 1. Validate genesis
      await this.validateGenesis(consignment.genesis);

      // 2. Validate all transitions
      for (const transition of consignment.transitions) {
        await this.validateTransition(consignment, transition);
      }

      // 3. Validate witness chain
      await this.validateWitnessChain(consignment);

      // 4. Validate amount conservation
      await this.validateAmountConservation(consignment);

      // 5. Validate seals
      await this.validateSeals(consignment);

    } catch (error) {
      errors.push({
        type: error.type || 'ValidationError',
        message: error.message,
        details: error.details
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  private async validateGenesis(genesis: Genesis): Promise<void> {
    // Validate genesis according to schema
    const schema = await this.getSchema(genesis.schemaId);

    // Check all global states are defined
    for (const [key, value] of genesis.globalState) {
      if (!schema.globalStates.has(key)) {
        throw new ValidationError('Unknown global state: ' + key);
      }
    }

    // Validate initial allocations
    for (const allocation of genesis.allocations) {
      if (allocation.amount <= 0n) {
        throw new ValidationError('Invalid initial allocation amount');
      }
    }
  }

  private async validateTransition(
    consignment: Consignment,
    transition: Transition
  ): Promise<void> {
    const schema = await this.getSchema(consignment.genesis.schemaId);

    // Check transition type is valid
    if (!schema.transitions.has(transition.transitionType)) {
      throw new ValidationError('Unknown transition type');
    }

    // Validate according to schema rules
    const transitionDef = schema.transitions.get(transition.transitionType)!;

    // Check required inputs/outputs
    if (transition.inputs.length < transitionDef.minInputs) {
      throw new ValidationError('Insufficient inputs');
    }

    // Validate state updates
    // ...
  }

  private async validateWitnessChain(consignment: Consignment): Promise<void> {
    // Verify all Bitcoin transactions are valid
    for (const transition of consignment.transitions) {
      const tx = await this.getBitcoinTransaction(transition.witness.txid);

      if (!tx) {
        throw new ValidationError('Bitcoin transaction not found');
      }

      // Verify inputs match
      // Verify transaction is confirmed (if required)
    }
  }

  private async validateAmountConservation(consignment: Consignment): Promise<void> {
    for (const transition of consignment.transitions) {
      const inputSum = transition.inputs.reduce(
        (sum, input) => sum + input.amount,
        0n
      );

      const outputSum = transition.outputs.reduce(
        (sum, output) => sum + output.amount,
        0n
      );

      if (inputSum !== outputSum) {
        throw new ValidationError(
          'Amount conservation violated',
          { inputSum, outputSum }
        );
      }
    }
  }

  private async validateSeals(consignment: Consignment): Promise<void> {
    // Validate all seals are single-use
    const usedSeals = new Set<string>();

    for (const transition of consignment.transitions) {
      for (const input of transition.inputs) {
        const sealKey = `${input.previousOutput.txid}:${input.previousOutput.vout}`;

        if (usedSeals.has(sealKey)) {
          throw new ValidationError('Seal reuse detected');
        }

        usedSeals.add(sealKey);
      }
    }
  }

  private async getSchema(schemaId: string): Promise<Schema> {
    // Retrieve schema
  }

  private async getBitcoinTransaction(txid: string): Promise<Transaction | null> {
    // Query Bitcoin node
  }
}
```

### Accepting Transfers

```typescript
class TransferAcceptor {
  constructor(
    private wallet: RgbWallet,
    private validator: ConsignmentValidator
  ) {}

  async acceptTransfer(consignmentData: string | Buffer): Promise<void> {
    // Parse consignment
    const consignment = typeof consignmentData === 'string'
      ? Consignment.fromBase64(consignmentData)
      : Consignment.fromBytes(consignmentData);

    // Validate consignment
    const validation = await this.validator.validate(consignment);

    if (!validation.valid) {
      throw new RgbError(
        'Consignment validation failed',
        RgbErrorCode.ValidationFailed,
        { errors: validation.errors }
      );
    }

    // Check if we're the recipient
    const ourReceive = await this.findOurReceive(consignment);
    if (!ourReceive) {
      throw new Error('Consignment not intended for this wallet');
    }

    // Import into stash
    await this.wallet.stash.importConsignment(consignment);

    // Update UTXO index
    await this.wallet.utxoIndex.rebuild(this.wallet);

    // Emit event
    this.wallet.emit('transfer_received', {
      contractId: consignment.contractId,
      amount: ourReceive.amount,
      txid: consignment.txid
    });

    // Wait for Bitcoin confirmation
    await this.watchConfirmation(consignment.txid);
  }

  private async findOurReceive(consignment: Consignment): Promise<any | null> {
    // Check if any outputs are for our wallet
    const lastTransition = consignment.transitions[consignment.transitions.length - 1];

    for (const output of lastTransition.outputs) {
      const isOurs = await this.wallet.isOurBlindedUtxo(output.seal);
      if (isOurs) {
        return output;
      }
    }

    return null;
  }

  private async watchConfirmation(txid: string) {
    // Monitor Bitcoin transaction for confirmation
    // Update transfer status accordingly
  }
}
```

## User Interface Patterns

### Comprehensive Balance Display

```typescript
import { useState, useEffect } from 'react';
import { RgbWallet, AssetInfo } from '@rgbjs/core';

function AssetList({ wallet }: { wallet: RgbWallet }) {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'fungible' | 'nft'>('all');

  useEffect(() => {
    loadAssets();

    // Subscribe to balance changes
    const unsubscribe = wallet.on('balance_changed', () => {
      loadAssets();
    });

    return () => unsubscribe();
  }, [wallet, filter]);

  async function loadAssets() {
    setLoading(true);
    try {
      const allAssets = await wallet.listAssets({
        schema: filter === 'all' ? undefined : filter === 'fungible' ? 'RGB20' : 'RGB21'
      });
      setAssets(allAssets);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading assets...</div>;
  }

  return (
    <div className="asset-list">
      <div className="filters">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
          All
        </button>
        <button onClick={() => setFilter('fungible')} className={filter === 'fungible' ? 'active' : ''}>
          Tokens
        </button>
        <button onClick={() => setFilter('nft')} className={filter === 'nft' ? 'active' : ''}>
          NFTs
        </button>
      </div>

      <ul className="assets">
        {assets.map(asset => (
          <AssetCard key={asset.contractId} asset={asset} wallet={wallet} />
        ))}
      </ul>
    </div>
  );
}

function AssetCard({ asset, wallet }: { asset: AssetInfo; wallet: RgbWallet }) {
  const [showDetails, setShowDetails] = useState(false);

  const formattedBalance = formatAmount(asset.balance, asset.precision);

  return (
    <li className="asset-card">
      <div className="asset-header" onClick={() => setShowDetails(!showDetails)}>
        <div className="asset-icon">
          {asset.ticker?.substring(0, 2) || 'RGB'}
        </div>
        <div className="asset-info">
          <h3>{asset.name}</h3>
          <p className="ticker">{asset.ticker}</p>
        </div>
        <div className="asset-balance">
          <span className="amount">{formattedBalance}</span>
          <span className="ticker">{asset.ticker}</span>
        </div>
      </div>

      {showDetails && (
        <AssetDetails asset={asset} wallet={wallet} />
      )}
    </li>
  );
}

function AssetDetails({ asset, wallet }: { asset: AssetInfo; wallet: RgbWallet }) {
  return (
    <div className="asset-details">
      <div className="detail-row">
        <span>Contract ID:</span>
        <code>{asset.contractId}</code>
      </div>
      <div className="detail-row">
        <span>Schema:</span>
        <span>{asset.schema}</span>
      </div>
      <div className="detail-row">
        <span>Precision:</span>
        <span>{asset.precision}</span>
      </div>

      <div className="actions">
        <button>Send</button>
        <button>Receive</button>
        <button>History</button>
      </div>
    </div>
  );
}

function formatAmount(amount: bigint, precision: number): string {
  const str = amount.toString().padStart(precision + 1, '0');
  const intPart = str.slice(0, -precision) || '0';
  const decPart = str.slice(-precision);

  // Remove trailing zeros
  const trimmedDec = decPart.replace(/0+$/, '');

  return trimmedDec ? `${intPart}.${trimmedDec}` : intPart;
}
```

### Send Transfer UI

```typescript
function SendTransferForm({ wallet, asset }: {
  wallet: RgbWallet;
  asset: AssetInfo;
}) {
  const [invoice, setInvoice] = useState('');
  const [amount, setAmount] = useState('');
  const [feeRate, setFeeRate] = useState(5);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSend() {
    if (!invoice || !amount) return;

    setSending(true);
    setResult(null);

    try {
      // Parse invoice
      const parsedInvoice = await wallet.parseInvoice(invoice);

      // Validate amount
      const amountValue = parseAmountInput(amount, asset.precision);
      const balance = await wallet.getBalance(asset.contractId);

      if (amountValue > balance) {
        throw new Error('Insufficient balance');
      }

      // Create transfer
      const transfer = await wallet.transfer({
        invoice: invoice,
        feeRate: feeRate
      });

      // Broadcast
      await transfer.broadcast();

      setResult({
        success: true,
        txid: transfer.txid,
        consignment: transfer.consignment.toBase64()
      });

      // Clear form
      setInvoice('');
      setAmount('');

    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="send-form">
      <h2>Send {asset.ticker}</h2>

      <div className="form-group">
        <label>Invoice</label>
        <textarea
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          placeholder="rgb:..."
          rows={3}
        />
        <button onClick={() => scanQRCode(setInvoice)}>
          Scan QR Code
        </button>
      </div>

      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step={`0.${'0'.repeat(asset.precision - 1)}1`}
        />
        <span className="ticker">{asset.ticker}</span>
      </div>

      <div className="form-group">
        <label>Fee Rate (sats/vbyte)</label>
        <input
          type="number"
          value={feeRate}
          onChange={(e) => setFeeRate(parseInt(e.target.value))}
          min={1}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={sending || !invoice || !amount}
        className="send-button"
      >
        {sending ? 'Sending...' : 'Send'}
      </button>

      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <p>Transfer sent successfully!</p>
              <p className="txid">TXID: {result.txid}</p>
              <button onClick={() => copyToClipboard(result.consignment)}>
                Copy Consignment
              </button>
            </>
          ) : (
            <p>Error: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function parseAmountInput(input: string, precision: number): bigint {
  const [intPart, decPart = ''] = input.split('.');
  const paddedDec = decPart.padEnd(precision, '0').slice(0, precision);
  return BigInt(intPart + paddedDec);
}

async function scanQRCode(callback: (data: string) => void) {
  // Implement QR code scanning
  // Using device camera or screen scanner
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
```

### Receive/Invoice Generation UI

```typescript
function ReceiveForm({ wallet, asset }: {
  wallet: RgbWallet;
  asset: AssetInfo;
}) {
  const [amount, setAmount] = useState('');
  const [invoice, setInvoice] = useState<string | null>(null);
  const [expiry, setExpiry] = useState(60); // minutes

  async function handleCreateInvoice() {
    if (!amount) return;

    const amountValue = parseAmountInput(amount, asset.precision);

    const inv = await wallet.createInvoice({
      contractId: asset.contractId,
      amount: amountValue,
      expiry: Date.now() + (expiry * 60 * 1000)
    });

    setInvoice(inv.toString());
  }

  return (
    <div className="receive-form">
      <h2>Receive {asset.ticker}</h2>

      {!invoice ? (
        <>
          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label>Expiry (minutes)</label>
            <input
              type="number"
              value={expiry}
              onChange={(e) => setExpiry(parseInt(e.target.value))}
              min={1}
            />
          </div>

          <button onClick={handleCreateInvoice} disabled={!amount}>
            Create Invoice
          </button>
        </>
      ) : (
        <InvoiceDisplay
          invoice={invoice}
          onClose={() => setInvoice(null)}
        />
      )}
    </div>
  );
}

function InvoiceDisplay({ invoice, onClose }: {
  invoice: string;
  onClose: () => void;
}) {
  return (
    <div className="invoice-display">
      <QRCodeSVG value={invoice} size={300} />

      <div className="invoice-string">
        <input
          type="text"
          value={invoice}
          readOnly
          onClick={(e) => e.currentTarget.select()}
        />
        <button onClick={() => copyToClipboard(invoice)}>Copy</button>
      </div>

      <button onClick={onClose}>Create New Invoice</button>
    </div>
  );
}
```

## QR Code Integration

```typescript
import QRCode from 'qrcode';
import jsQR from 'jsqr';

class QRCodeManager {
  /**
   * Generate QR code for invoice
   */
  async generateQR(invoice: string): Promise<string> {
    // Generate as data URL
    const qrDataUrl = await QRCode.toDataURL(invoice, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrDataUrl;
  }

  /**
   * Scan QR code from camera or image
   */
  async scanQR(imageData: ImageData): Promise<string | null> {
    const code = jsQR(
      imageData.data,
      imageData.width,
      imageData.height
    );

    return code?.data || null;
  }

  /**
   * Start camera scanning
   */
  async startCameraScanner(onScan: (data: string) => void): Promise<() => void> {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    video.srcObject = stream;
    video.play();

    let scanning = true;

    // Scan loop
    const scan = () => {
      if (!scanning) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = this.scanQR(imageData);

        if (result) {
          onScan(result);
          return; // Stop scanning
        }
      }

      requestAnimationFrame(scan);
    };

    scan();

    // Return cleanup function
    return () => {
      scanning = false;
      stream.getTracks().forEach(track => track.stop());
    };
  }
}
```

## Transaction History Management

```typescript
class TransactionHistoryManager {
  constructor(private wallet: RgbWallet) {}

  async getHistory(params: {
    contractId?: ContractId;
    limit?: number;
    offset?: number;
    direction?: 'sent' | 'received' | 'all';
  }): Promise<TransactionRecord[]> {
    const history = await this.wallet.getTransactionHistory(params.contractId);

    // Filter by direction
    let filtered = history;
    if (params.direction && params.direction !== 'all') {
      filtered = history.filter(tx =>
        params.direction === 'sent' ? tx.isSent : tx.isReceived
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    return filtered.slice(offset, offset + limit);
  }

  async getTransactionDetails(txid: Txid): Promise<TransactionDetails> {
    const transfer = await this.wallet.getTransfer(txid);
    if (!transfer) {
      throw new Error('Transaction not found');
    }

    // Get Bitcoin transaction
    const bitcoinTx = await this.wallet.getBitcoinTransaction(txid);

    // Get confirmations
    const confirmations = await this.wallet.getConfirmations(txid);

    return {
      txid: txid,
      contractId: transfer.contractId,
      amount: transfer.amount,
      direction: transfer.isSent ? 'sent' : 'received',
      timestamp: transfer.timestamp,
      confirmations: confirmations,
      fee: transfer.fee,
      bitcoinTx: bitcoinTx,
      consignment: transfer.consignment
    };
  }

  async exportHistory(contractId?: ContractId, format: 'csv' | 'json' = 'csv'): Promise<string> {
    const history = await this.getHistory({ contractId });

    if (format === 'json') {
      return JSON.stringify(history, null, 2);
    }

    // CSV format
    const headers = ['Date', 'Direction', 'Amount', 'TXID', 'Confirmations'];
    const rows = history.map(tx => [
      new Date(tx.timestamp).toISOString(),
      tx.isSent ? 'Sent' : 'Received',
      tx.amount.toString(),
      tx.txid,
      tx.confirmations.toString()
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return csv;
  }
}
```

## Mobile Wallet Implementation

### React Native Integration

```typescript
import { RgbWallet } from '@rgbjs/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

class MobileRgbWallet {
  private wallet: RgbWallet;

  async initialize() {
    const config = {
      network: 'bitcoin',

      // Use device storage
      stashPath: RNFS.DocumentDirectoryPath + '/rgb-stash',

      // Async storage for metadata
      storage: AsyncStorage,

      // Mobile-specific options
      lowMemoryMode: true,
      backgroundSync: false
    };

    this.wallet = new RgbWallet(config);
    await this.wallet.initialize();

    // Setup background tasks
    this.setupBackgroundSync();
  }

  private setupBackgroundSync() {
    // Register background task for periodic sync
    // Platform-specific implementation
  }

  async handleDeepLink(url: string) {
    // Handle rgb:// URLs
    if (url.startsWith('rgb:')) {
      return this.handleInvoice(url);
    }
  }

  private async handleInvoice(invoice: string) {
    // Navigate to send screen with pre-filled invoice
  }
}
```

### Storage Optimization for Mobile

```typescript
class MobileStorageManager {
  private cache: Map<string, any> = new Map();
  private cacheSize = 0;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB

  async getData(key: string): Promise<any> {
    // Check memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Load from disk
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data);

    // Add to cache if room
    const size = data.length;
    if (this.cacheSize + size < this.maxCacheSize) {
      this.cache.set(key, parsed);
      this.cacheSize += size;
    }

    return parsed;
  }

  async setData(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);

    // Save to disk
    await AsyncStorage.setItem(key, serialized);

    // Update cache
    this.cache.set(key, value);
    this.cacheSize += serialized.length;

    // Evict if over limit
    if (this.cacheSize > this.maxCacheSize) {
      await this.evictCache();
    }
  }

  private async evictCache() {
    // LRU eviction
    const entries = Array.from(this.cache.entries());
    const toRemove = entries.slice(0, entries.length / 2);

    for (const [key] of toRemove) {
      this.cache.delete(key);
    }

    // Recalculate size
    this.cacheSize = 0;
    for (const [, value] of this.cache) {
      this.cacheSize += JSON.stringify(value).length;
    }
  }
}
```

## Desktop Wallet Integration

### Electron Application

```typescript
import { app, BrowserWindow } from 'electron';
import { RgbWallet } from '@rgbjs/core';
import path from 'path';

class DesktopRgbWallet {
  private wallet: RgbWallet;
  private window: BrowserWindow;

  async initialize() {
    // User data directory
    const userDataPath = app.getPath('userData');
    const rgbDataPath = path.join(userDataPath, 'rgb');

    const config = {
      network: 'bitcoin',
      stashPath: rgbDataPath,
      bitcoinRpc: {
        url: 'http://localhost:8332',
        username: process.env.BITCOIN_RPC_USER,
        password: process.env.BITCOIN_RPC_PASSWORD
      }
    };

    this.wallet = new RgbWallet(config);
    await this.wallet.initialize();

    // Setup IPC handlers
    this.setupIPC();
  }

  private setupIPC() {
    const { ipcMain } = require('electron');

    ipcMain.handle('rgb:listAssets', async () => {
      return await this.wallet.listAssets();
    });

    ipcMain.handle('rgb:createInvoice', async (event, params) => {
      const invoice = await this.wallet.createInvoice(params);
      return invoice.toString();
    });

    ipcMain.handle('rgb:transfer', async (event, params) => {
      const transfer = await this.wallet.transfer(params);
      await transfer.broadcast();
      return {
        txid: transfer.txid,
        consignment: transfer.consignment.toBase64()
      };
    });
  }
}
```

### Multi-Window State Management

```typescript
import { EventEmitter } from 'events';

class WalletStateManager extends EventEmitter {
  private state: WalletState;

  constructor() {
    super();
    this.state = {
      assets: [],
      balances: new Map(),
      pendingTransfers: []
    };
  }

  async updateState() {
    const assets = await wallet.listAssets();
    this.state.assets = assets;

    for (const asset of assets) {
      const balance = await wallet.getBalance(asset.contractId);
      this.state.balances.set(asset.contractId, balance);
    }

    // Notify all windows
    this.emit('state_updated', this.state);
  }

  getState(): WalletState {
    return { ...this.state };
  }

  // Subscribe to state changes
  onStateChange(callback: (state: WalletState) => void) {
    this.on('state_updated', callback);
    return () => this.off('state_updated', callback);
  }
}
```

## Hardware Wallet Support

### Ledger Integration

```typescript
import Transport from '@ledgerhq/hw-transport-webusb';
import AppBtc from '@ledgerhq/hw-app-btc';

class LedgerRgbSigner {
  private transport: Transport;
  private btcApp: AppBtc;

  async connect() {
    this.transport = await Transport.create();
    this.btcApp = new AppBtc(this.transport);
  }

  async signPsbt(psbt: Psbt): Promise<Psbt> {
    // Get inputs to sign
    const inputsToSign = psbt.data.inputs.map((input, index) => ({
      index: index,
      publicKey: input.bip32Derivation[0].pubkey,
      path: this.derivationPathFromPubkey(input.bip32Derivation[0])
    }));

    // Sign each input
    for (const input of inputsToSign) {
      const signature = await this.btcApp.signP2SHTransaction({
        inputs: [[psbt.txInputs[input.index], 0]],
        associatedKeysets: [input.path],
        outputScriptHex: psbt.txOutputs[input.index].script.toString('hex')
      });

      psbt.updateInput(input.index, {
        partialSig: [{
          pubkey: input.publicKey,
          signature: Buffer.from(signature, 'hex')
        }]
      });
    }

    return psbt;
  }

  private derivationPathFromPubkey(derivation: any): string {
    // Convert BIP32 derivation to path string
    return `m/84'/0'/0'/0/${derivation.index}`;
  }
}
```

### Trezor Integration

```typescript
import TrezorConnect from '@trezor/connect-web';

class TrezorRgbSigner {
  async initialize() {
    await TrezorConnect.init({
      lazyLoad: true,
      manifest: {
        email: 'developer@example.com',
        appUrl: 'https://example.com'
      }
    });
  }

  async signPsbt(psbt: Psbt): Promise<Psbt> {
    // Convert PSBT to Trezor format
    const inputs = psbt.data.inputs.map((input, index) => ({
      address_n: this.getDerivationPath(input),
      prev_hash: psbt.txInputs[index].hash.reverse().toString('hex'),
      prev_index: psbt.txInputs[index].index,
      amount: input.witnessUtxo.value.toString()
    }));

    const outputs = psbt.txOutputs.map(output => ({
      address: output.address,
      amount: output.value.toString(),
      script_type: 'PAYTOWITNESS'
    }));

    // Sign with Trezor
    const result = await TrezorConnect.signTransaction({
      inputs: inputs,
      outputs: outputs,
      coin: 'btc'
    });

    if (!result.success) {
      throw new Error(result.payload.error);
    }

    // Apply signatures to PSBT
    result.payload.signatures.forEach((sig, index) => {
      psbt.updateInput(index, {
        partialSig: [{
          pubkey: inputs[index].publicKey,
          signature: Buffer.from(sig, 'hex')
        }]
      });
    });

    return psbt;
  }

  private getDerivationPath(input: any): number[] {
    // Extract derivation path from input
    return input.bip32Derivation[0].path;
  }
}
```

### RGB Transfer with Hardware Wallet

```typescript
class HardwareWalletTransfer {
  constructor(
    private wallet: RgbWallet,
    private signer: LedgerRgbSigner | TrezorRgbSigner
  ) {}

  async transfer(params: {
    invoice: string;
    feeRate: number;
  }): Promise<Transfer> {
    // Create unsigned PSBT
    const { psbt, consignment } = await this.wallet.createTransferPsbt(params);

    // Sign with hardware wallet
    const signedPsbt = await this.signer.signPsbt(psbt);

    // Finalize transfer
    const transfer = await this.wallet.finalizeTransfer({
      psbt: signedPsbt,
      consignment: consignment
    });

    // Broadcast
    await this.wallet.broadcastPsbt(signedPsbt);

    return transfer;
  }
}
```

## Backup and Recovery

### Comprehensive Backup

```typescript
class WalletBackupManager {
  constructor(private wallet: RgbWallet) {}

  async createBackup(password: string): Promise<EncryptedBackup> {
    // Export RGB stash
    const stash = await this.wallet.exportStash();

    // Export Bitcoin wallet data
    const bitcoinBackup = await this.wallet.exportBitcoinWallet();

    // Combine backups
    const backup = {
      version: 1,
      timestamp: Date.now(),
      network: this.wallet.getNetwork(),
      stash: stash,
      bitcoin: bitcoinBackup,
      metadata: {
        assets: await this.wallet.listAssets(),
        balances: await this.exportBalances()
      }
    };

    // Encrypt
    const encrypted = await this.encryptBackup(backup, password);

    return encrypted;
  }

  async restoreBackup(
    encryptedBackup: EncryptedBackup,
    password: string
  ): Promise<void> {
    // Decrypt
    const backup = await this.decryptBackup(encryptedBackup, password);

    // Validate backup
    if (backup.network !== this.wallet.getNetwork()) {
      throw new Error('Network mismatch');
    }

    // Restore RGB stash
    await this.wallet.importStash(backup.stash);

    // Restore Bitcoin wallet
    await this.wallet.importBitcoinWallet(backup.bitcoin);

    // Sync state
    await this.wallet.sync();
  }

  private async encryptBackup(backup: any, password: string): Promise<EncryptedBackup> {
    const salt = crypto.randomBytes(16);
    const key = await this.deriveKey(password, salt);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const serialized = JSON.stringify(backup);
    const encrypted = Buffer.concat([
      cipher.update(serialized, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      version: 1,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted.toString('hex')
    };
  }

  private async decryptBackup(
    encrypted: EncryptedBackup,
    password: string
  ): Promise<any> {
    const salt = Buffer.from(encrypted.salt, 'hex');
    const key = await this.deriveKey(password, salt);

    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const data = Buffer.from(encrypted.data, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  }

  private async exportBalances(): Promise<Map<ContractId, bigint>> {
    const assets = await this.wallet.listAssets();
    const balances = new Map<ContractId, bigint>();

    for (const asset of assets) {
      const balance = await this.wallet.getBalance(asset.contractId);
      balances.set(asset.contractId, balance);
    }

    return balances;
  }
}
```

### Seed Phrase Recovery

```typescript
class SeedPhraseManager {
  /**
   * Generate new mnemonic
   */
  generateMnemonic(wordCount: 12 | 24 = 24): string {
    const entropy = crypto.randomBytes(wordCount === 12 ? 16 : 32);
    return bip39.entropyToMnemonic(entropy);
  }

  /**
   * Recover wallet from mnemonic
   */
  async recoverFromMnemonic(
    mnemonic: string,
    network: 'bitcoin' | 'testnet'
  ): Promise<RgbWallet> {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }

    // Derive seed
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // Create HD wallet
    const root = bip32.fromSeed(seed);

    // Derive Bitcoin wallet (BIP84)
    const account = root.derivePath("m/84'/0'/0'");

    // Create wallet config
    const config = {
      network: network,
      seed: account.toBase58(),
      stashPath: './recovered-rgb-stash'
    };

    const wallet = new RgbWallet(config);
    await wallet.initialize();

    // Rescan blockchain for RGB state
    await wallet.rescan();

    return wallet;
  }
}
```

## Security Best Practices

### Secure Key Storage

```typescript
class SecureKeyManager {
  private keychain: any; // Platform-specific keychain

  async storeKey(identifier: string, key: Buffer): Promise<void> {
    // Use platform keychain
    // - macOS: Keychain Access
    // - Windows: Credential Manager
    // - Linux: Secret Service API

    await this.keychain.setPassword('rgb-wallet', identifier, key.toString('hex'));
  }

  async retrieveKey(identifier: string): Promise<Buffer> {
    const hex = await this.keychain.getPassword('rgb-wallet', identifier);
    return Buffer.from(hex, 'hex');
  }

  async deleteKey(identifier: string): Promise<void> {
    await this.keychain.deletePassword('rgb-wallet', identifier);
  }
}
```

### Privacy Considerations

1. **Blinded UTXOs**: Always use blinded seals for receiving
2. **Change Addresses**: Never reuse addresses
3. **UTXO Selection**: Avoid combining UTXOs from different sources
4. **Network Privacy**: Use Tor or VPN for node connections

```typescript
class PrivacyManager {
  async createPrivateInvoice(params: InvoiceParams): Promise<Invoice> {
    // Use fresh UTXO
    const utxo = await this.wallet.getFreshUtxo();

    // Blind with strong randomness
    const blindingFactor = crypto.randomBytes(32);
    const blindedUtxo = await this.blindUtxo(utxo, blindingFactor);

    // Create invoice
    const invoice = await this.wallet.createInvoice({
      ...params,
      seal: blindedUtxo
    });

    // Don't reuse this UTXO for Bitcoin
    await this.wallet.markUtxoReserved(utxo);

    return invoice;
  }
}
```

## Testing Wallet Implementations

```typescript
describe('Wallet Integration Tests', () => {
  let wallet: RgbWallet;
  let testkit: RgbTestkit;

  beforeEach(async () => {
    testkit = await RgbTestkit.create();
    wallet = await testkit.createWallet();
  });

  test('should sync UTXO set with RGB allocations', async () => {
    const token = await testkit.createToken();

    await wallet.sync();

    const balance = await wallet.getBalance(token.contractId);
    expect(balance).toBeGreaterThan(0n);
  });

  test('should handle concurrent transfers', async () => {
    const token = await testkit.createToken();

    const invoices = await Promise.all([
      testkit.createInvoice({ amount: 100n }),
      testkit.createInvoice({ amount: 200n }),
      testkit.createInvoice({ amount: 300n })
    ]);

    const transfers = await Promise.all(
      invoices.map(inv => wallet.transfer({ invoice: inv.toString() }))
    );

    expect(transfers).toHaveLength(3);
  });

  test('should recover from backup', async () => {
    const token = await testkit.createToken();
    const originalBalance = await wallet.getBalance(token.contractId);

    // Create backup
    const backup = await wallet.exportStash();

    // Create new wallet
    const newWallet = await testkit.createWallet();

    // Restore backup
    await newWallet.importStash(backup);
    await newWallet.sync();

    const restoredBalance = await newWallet.getBalance(token.contractId);
    expect(restoredBalance).toBe(originalBalance);
  });

  afterEach(async () => {
    await testkit.cleanup();
  });
});
```

## Related Documentation

- [RGB.js SDK](./rgbjs.md) - JavaScript/TypeScript RGB development
- [Rust SDK](./rust-sdk.md) - Core RGB Rust implementation
- [Testing Guide](./testing.md) - Testing RGB applications
- [RGB20 Transfers](../rgb20/transferring-assets.md) - Token transfer workflow
- [Privacy Guide](../advanced/privacy.md) - RGB privacy best practices

---

*Last updated: 2025-01-17*

## Best Practices

### Security

- Store RGB stash securely
- Backup consignments
- Validate all received transfers
- Use blinded UTXOs for privacy

*Security practices to be expanded*

### Performance

- Cache contract state
- Batch UTXO queries
- Lazy load transaction history
- Use indexing for large wallets

*Performance optimization to be expanded*

### User Experience

- Show pending transfers
- Indicate confirmation status
- Handle errors gracefully
- Provide clear feedback

*UX guidelines to be expanded*

## Testing

```typescript
import { WalletTestSuite } from '@rgbjs/testing';

describe('Wallet Integration', () => {
  it('should send and receive assets', async () => {
    const suite = new WalletTestSuite();
    await suite.testTransferFlow();
  });
});
```

*Testing to be expanded*

## Related Documentation

- [Rust SDK](./rust-sdk.md)
- [RGB.js SDK](./rgbjs.md)
- [Testing](./testing.md)
- [RGB20 Transfers](../rgb20/transferring-assets.md)
