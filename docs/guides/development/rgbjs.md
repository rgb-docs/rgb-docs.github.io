---
sidebar_position: 2
title: RGB.js SDK
description: Building RGB applications with JavaScript and TypeScript
---

# RGB.js SDK

RGB.js brings RGB smart contracts to JavaScript and TypeScript. Build web applications, mobile apps, and Node.js services with RGB.

## Installation

### Package Manager Setup

RGB.js is distributed as a collection of npm packages. Install them based on your needs:

```bash
# Core package (required)
npm install @rgbjs/core

# Wallet utilities
npm install @rgbjs/wallet

# React hooks and components
npm install @rgbjs/react

# TypeScript types (included automatically)
npm install --save-dev @types/rgbjs
```

Using yarn:

```bash
yarn add @rgbjs/core @rgbjs/wallet @rgbjs/react
```

Using pnpm:

```bash
pnpm add @rgbjs/core @rgbjs/wallet @rgbjs/react
```

### Monorepo Workspace Setup

For monorepo projects using npm workspaces:

```json
{
  "workspaces": [
    "packages/*"
  ],
  "dependencies": {
    "@rgbjs/core": "^0.12.0",
    "@rgbjs/wallet": "^0.12.0"
  }
}
```

### Version Compatibility

| RGB.js Version | rgb-std | Node.js | TypeScript |
|----------------|---------|---------|------------|
| 0.12.x         | 0.12.x  | ≥18.0   | ≥5.0       |
| 0.11.x         | 0.11.x  | ≥16.0   | ≥4.7       |

## Package Architecture

RGB.js is modular, allowing you to import only what you need:

### @rgbjs/core

Core RGB functionality and contract operations:

```typescript
import {
  RgbWallet,
  RgbConfig,
  Rgb20Contract,
  Rgb21Contract,
  Schema,
  ContractId,
  Invoice,
  Consignment
} from '@rgbjs/core';
```

**Features:**
- Contract creation and management
- Transfer operations
- Invoice generation
- Consignment handling
- Schema parsing
- Validation logic

### @rgbjs/wallet

Wallet integration utilities:

```typescript
import {
  UtxoManager,
  CoinSelector,
  StateManager,
  BackupManager
} from '@rgbjs/wallet';
```

**Features:**
- UTXO selection and management
- RGB state synchronization
- Backup and recovery
- Multi-wallet support

### @rgbjs/react

React hooks and components:

```typescript
import {
  useRgbWallet,
  useRgbBalance,
  useRgbTransfer,
  RgbProvider,
  AssetList,
  TransferForm
} from '@rgbjs/react';
```

**Features:**
- Wallet context provider
- Balance and asset hooks
- Transfer components
- QR code integration

### Optional Packages

```bash
# React Native support
npm install @rgbjs/react-native

# Electron integration
npm install @rgbjs/electron

# Testing utilities
npm install --save-dev @rgbjs/testing

# CLI tools
npm install -g @rgbjs/cli
```

## Quick Start

### Basic Wallet Setup

```typescript
import { RgbWallet, RgbConfig } from '@rgbjs/core';

const config: RgbConfig = {
  network: 'bitcoin',  // 'bitcoin', 'testnet', or 'regtest'
  stashPath: './rgb-stash',  // Local storage for RGB state
  bitcoinRpc: {
    url: 'http://localhost:8332',
    username: 'user',
    password: 'pass'
  }
};

const wallet = new RgbWallet(config);
await wallet.initialize();
```

### Complete Initialization Example

```typescript
import { RgbWallet, RgbConfig, Network } from '@rgbjs/core';
import { WalletDescriptor } from '@rgbjs/wallet';

async function setupWallet() {
  // Configuration
  const config: RgbConfig = {
    network: Network.Bitcoin,
    stashPath: './rgb-data',

    // Bitcoin node connection
    bitcoinRpc: {
      url: process.env.BITCOIN_RPC_URL || 'http://localhost:8332',
      username: process.env.BITCOIN_RPC_USER,
      password: process.env.BITCOIN_RPC_PASSWORD
    },

    // Optional: Electrum server
    electrum: {
      url: 'ssl://electrum.blockstream.info:50002'
    },

    // Optional: Custom indexer
    indexer: {
      url: 'https://mempool.space/api'
    }
  };

  // Create wallet
  const wallet = new RgbWallet(config);

  // Initialize (loads existing state or creates new)
  await wallet.initialize();

  // Optional: Import wallet descriptor
  const descriptor = WalletDescriptor.fromString(
    'wpkh([d34db33f/84h/0h/0h]xpub6CqE...)'
  );
  await wallet.importDescriptor(descriptor);

  return wallet;
}

// Usage
const wallet = await setupWallet();
console.log('Wallet initialized:', await wallet.getAddress());
```

### WebAssembly Initialization

RGB.js uses WebAssembly for performance-critical operations:

```typescript
import { initWasm } from '@rgbjs/core';

// Initialize WASM before using RGB
await initWasm();

// Now safe to create wallets
const wallet = new RgbWallet(config);
```

For bundler integration:

```javascript
// webpack.config.js
module.exports = {
  experiments: {
    asyncWebAssembly: true
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'webassembly/async'
      }
    ]
  }
};
```

```javascript
// vite.config.js
export default {
  optimizeDeps: {
    exclude: ['@rgbjs/core']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
};
```

## Complete API Reference

### RgbWallet Class

The main entry point for RGB operations:

```typescript
class RgbWallet {
  constructor(config: RgbConfig);

  // Initialization
  initialize(): Promise<void>;
  sync(): Promise<void>;

  // Asset management
  listAssets(): Promise<AssetInfo[]>;
  getBalance(contractId: ContractId): Promise<bigint>;
  getAssetInfo(contractId: ContractId): Promise<AssetDetails>;

  // Transfer operations
  createInvoice(params: InvoiceParams): Promise<Invoice>;
  transfer(params: TransferParams): Promise<TransferResult>;
  acceptTransfer(consignment: Consignment): Promise<void>;

  // UTXO management
  listUtxos(filter?: UtxoFilter): Promise<Utxo[]>;
  getRgbAllocations(utxo: Utxo): Promise<Allocation[]>;

  // History
  getTransactionHistory(contractId?: ContractId): Promise<Transaction[]>;

  // Backup and recovery
  exportStash(): Promise<StashBackup>;
  importStash(backup: StashBackup): Promise<void>;
}
```

### Rgb20Contract Class

Fungible token operations:

```typescript
class Rgb20Contract {
  // Static methods
  static create(params: Rgb20Params): Promise<Rgb20Contract>;
  static fromContractId(id: ContractId, wallet: RgbWallet): Promise<Rgb20Contract>;

  // Properties
  readonly contractId: ContractId;
  readonly ticker: string;
  readonly name: string;
  readonly precision: number;
  readonly totalSupply: bigint;

  // Methods
  getBalance(owner?: string): Promise<bigint>;
  transfer(params: TransferParams): Promise<Transfer>;
  getAllocations(): Promise<Allocation[]>;
  getMetadata(): Promise<TokenMetadata>;
}
```

### Rgb21Contract Class

NFT operations:

```typescript
class Rgb21Contract {
  static create(params: Rgb21Params): Promise<Rgb21Contract>;
  static fromContractId(id: ContractId, wallet: RgbWallet): Promise<Rgb21Contract>;

  readonly contractId: ContractId;
  readonly name: string;

  mint(params: NftMintParams): Promise<TokenId>;
  transfer(tokenId: TokenId, params: TransferParams): Promise<Transfer>;
  getToken(tokenId: TokenId): Promise<NftToken>;
  listTokens(owner?: string): Promise<NftToken[]>;
  getMetadata(tokenId: TokenId): Promise<NftMetadata>;
}
```

## Creating RGB20 Tokens

### Basic Token Creation

```typescript
import { Rgb20Contract, RgbWallet } from '@rgbjs/core';

async function createToken(wallet: RgbWallet) {
  // Prepare blinded UTXO for initial allocation
  const utxo = await wallet.getChangeUtxo();
  const blindedUtxo = await wallet.blindUtxo(utxo);

  // Create token contract
  const token = await Rgb20Contract.create({
    ticker: 'TKN',
    name: 'My Token',
    precision: 8,  // Decimal places (like Bitcoin's satoshis)
    totalSupply: 1000000n,  // Total tokens (in smallest unit)
    allocations: [
      {
        owner: blindedUtxo,
        amount: 1000000n  // All tokens to creator
      }
    ]
  });

  console.log('Contract ID:', token.contractId);
  console.log('Ticker:', token.ticker);
  console.log('Total Supply:', token.totalSupply);

  return token;
}
```

### Advanced Token Creation

```typescript
import { Rgb20Contract, AttachmentType } from '@rgbjs/core';

async function createAdvancedToken(wallet: RgbWallet) {
  // Multiple UTXOs for allocation
  const utxo1 = await wallet.blindUtxo(await wallet.getUtxo());
  const utxo2 = await wallet.blindUtxo(await wallet.getUtxo());

  const token = await Rgb20Contract.create({
    // Basic info
    ticker: 'ADVT',
    name: 'Advanced Token',
    details: 'A token with advanced features and metadata',
    precision: 8,

    // Supply
    totalSupply: 21000000n * 100000000n,  // 21M tokens

    // Multiple allocations
    allocations: [
      {
        owner: utxo1,
        amount: 18900000n * 100000000n  // 90% to treasury
      },
      {
        owner: utxo2,
        amount: 2100000n * 100000000n  // 10% to initial distribution
      }
    ],

    // Token metadata
    metadata: {
      website: 'https://mytoken.example',
      description: 'An advanced RGB20 token with rich metadata',
      logo: await fs.readFile('./logo.png'),  // Embedded logo

      // Custom fields
      extra: {
        category: 'DeFi',
        social: {
          twitter: '@mytoken',
          discord: 'discord.gg/mytoken'
        }
      }
    },

    // Inflation control (optional)
    inflationCap: {
      maxSupply: 42000000n * 100000000n,
      inflationRate: 200  // 2% per year in basis points
    }
  });

  // Save contract data
  await wallet.saveContract(token);

  return token;
}
```

### Token Issuance with Genesis UTXO

```typescript
async function issueTokenWithGenesis(wallet: RgbWallet) {
  // Create a specific UTXO for genesis
  const genesisUtxo = await wallet.createGenesisUtxo({
    amount: 10000  // sats for the UTXO
  });

  await wallet.mineBlocks(1);  // Confirm UTXO (regtest only)

  const blindedGenesis = await wallet.blindUtxo(genesisUtxo);

  const token = await Rgb20Contract.create({
    ticker: 'GEN',
    name: 'Genesis Token',
    precision: 8,
    totalSupply: 1000000n,
    allocations: [{
      owner: blindedGenesis,
      amount: 1000000n
    }],
    genesis: {
      utxo: genesisUtxo,
      // Optional: attach proof of reserves
      reserveProof: await generateReserveProof(genesisUtxo)
    }
  });

  return token;
}
```

### Querying Token Information

```typescript
async function getTokenInfo(contractId: ContractId, wallet: RgbWallet) {
  const token = await Rgb20Contract.fromContractId(contractId, wallet);

  // Basic info
  console.log('Ticker:', token.ticker);
  console.log('Name:', token.name);
  console.log('Precision:', token.precision);
  console.log('Total Supply:', token.totalSupply);

  // Balance
  const balance = await token.getBalance();
  console.log('Your Balance:', balance);

  // All allocations
  const allocations = await token.getAllocations();
  console.log('Allocations:', allocations);

  // Metadata
  const metadata = await token.getMetadata();
  console.log('Metadata:', metadata);

  // Contract state
  const state = await wallet.getContractState(contractId);
  console.log('Contract State:', state);

  return {
    token,
    balance,
    allocations,
    metadata
  };
}
```

### Error Handling

```typescript
import { RgbError, RgbErrorCode } from '@rgbjs/core';

async function createTokenSafely(wallet: RgbWallet) {
  try {
    const token = await Rgb20Contract.create({
      ticker: 'SAFE',
      name: 'Safe Token',
      precision: 8,
      totalSupply: 1000000n,
      allocations: [{
        owner: await wallet.blindUtxo(await wallet.getUtxo()),
        amount: 1000000n
      }]
    });

    return { success: true, token };

  } catch (error) {
    if (error instanceof RgbError) {
      switch (error.code) {
        case RgbErrorCode.InsufficientFunds:
          console.error('Not enough Bitcoin for transaction fees');
          break;

        case RgbErrorCode.InvalidAllocation:
          console.error('Allocation amounts do not sum to total supply');
          break;

        case RgbErrorCode.ValidationFailed:
          console.error('Contract validation failed:', error.details);
          break;

        case RgbErrorCode.UtxoNotFound:
          console.error('Specified UTXO does not exist');
          break;

        default:
          console.error('RGB Error:', error.message);
      }
    } else {
      console.error('Unexpected error:', error);
    }

    return { success: false, error };
  }
}

## Transferring Assets

### Complete Transfer Workflow

The RGB transfer process involves three parties and four steps:
1. **Receiver** creates a blinded invoice
2. **Sender** creates transfer and consignment
3. **Sender** broadcasts Bitcoin transaction
4. **Receiver** accepts consignment and validates

### Creating Invoices (Receiver Side)

```typescript
import { Invoice, RgbWallet } from '@rgbjs/core';

async function createInvoice(wallet: RgbWallet, contractId: ContractId) {
  // Get a fresh UTXO to receive funds
  const receiveUtxo = await wallet.getReceiveUtxo();
  const blindedUtxo = await wallet.blindUtxo(receiveUtxo);

  // Create invoice
  const invoice = await wallet.createInvoice({
    contractId: contractId,
    amount: 1000n,  // Amount to receive
    seal: blindedUtxo,

    // Optional parameters
    expiry: Date.now() + 3600000,  // 1 hour
    description: 'Payment for services'
  });

  // Invoice as string (for QR codes, etc.)
  const invoiceString = invoice.toString();
  console.log('Invoice:', invoiceString);

  // Invoice breakdown
  console.log('Contract ID:', invoice.contractId);
  console.log('Amount:', invoice.amount);
  console.log('Blinded UTXO:', invoice.beneficiary);

  return invoiceString;
}
```

### Parsing Invoices

```typescript
async function parseInvoice(invoiceString: string) {
  try {
    const invoice = Invoice.fromString(invoiceString);

    console.log('Valid invoice:');
    console.log('- Contract:', invoice.contractId);
    console.log('- Amount:', invoice.amount);
    console.log('- Expiry:', new Date(invoice.expiry));

    // Validate expiry
    if (invoice.isExpired()) {
      throw new Error('Invoice has expired');
    }

    return invoice;

  } catch (error) {
    console.error('Invalid invoice:', error);
    throw new RgbError('Invalid invoice format', RgbErrorCode.InvalidInvoice);
  }
}
```

### Sending Transfers (Sender Side)

```typescript
async function sendTransfer(
  wallet: RgbWallet,
  invoiceString: string,
  options?: TransferOptions
) {
  // Parse invoice
  const invoice = Invoice.fromString(invoiceString);

  // Prepare transfer
  const transfer = await wallet.transfer({
    invoice: invoiceString,

    // Fee configuration
    feeRate: options?.feeRate || 5,  // sats/vbyte

    // Optional: manual coin selection
    inputs: options?.inputs,

    // Optional: change address
    changeAddress: options?.changeAddress || await wallet.getChangeAddress()
  });

  console.log('Transfer prepared:');
  console.log('- TXID:', transfer.txid);
  console.log('- Fee:', transfer.fee, 'sats');
  console.log('- Consignment size:', transfer.consignment.length, 'bytes');

  // Get consignment for receiver
  const consignment = transfer.consignment;

  // Broadcast Bitcoin transaction
  await transfer.broadcast();

  console.log('Transaction broadcast:', transfer.txid);

  // Return consignment to send to receiver
  return {
    txid: transfer.txid,
    consignment: consignment.toBase64()
  };
}
```

### Advanced Transfer with PSBT

```typescript
import { Psbt } from 'bitcoinjs-lib';

async function createTransferPsbt(
  wallet: RgbWallet,
  invoice: Invoice
) {
  // Create unsigned PSBT
  const { psbt, consignment } = await wallet.createTransferPsbt({
    invoice: invoice.toString(),
    feeRate: 5
  });

  // Sign with external signer
  const signedPsbt = await externalSigner.sign(psbt);

  // Finalize transfer
  const transfer = await wallet.finalizeTransfer({
    psbt: signedPsbt,
    consignment: consignment
  });

  // Broadcast
  await wallet.broadcastPsbt(signedPsbt);

  return transfer;
}
```

### Accepting Transfers (Receiver Side)

```typescript
async function acceptTransfer(
  wallet: RgbWallet,
  consignmentBase64: string
) {
  try {
    // Decode consignment
    const consignment = Consignment.fromBase64(consignmentBase64);

    console.log('Consignment received:');
    console.log('- Contract:', consignment.contractId);
    console.log('- Amount:', consignment.amount);

    // Validate consignment
    const validation = await wallet.validateConsignment(consignment);

    if (!validation.valid) {
      console.error('Validation failed:', validation.errors);
      throw new RgbError('Invalid consignment', RgbErrorCode.ValidationFailed);
    }

    // Accept transfer (adds to stash)
    await wallet.acceptTransfer(consignment);

    console.log('Transfer accepted successfully');

    // Wait for confirmation
    await wallet.waitForConfirmation(consignment.txid, 1);

    console.log('Transfer confirmed');

    // Check new balance
    const balance = await wallet.getBalance(consignment.contractId);
    console.log('New balance:', balance);

    return {
      success: true,
      balance: balance
    };

  } catch (error) {
    console.error('Failed to accept transfer:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Batch Transfers

```typescript
async function batchTransfer(
  wallet: RgbWallet,
  transfers: Array<{ invoice: string, amount: bigint }>
) {
  // Prepare batch transfer
  const batch = await wallet.createBatchTransfer({
    transfers: transfers.map(t => ({
      invoice: Invoice.fromString(t.invoice),
      amount: t.amount
    })),
    feeRate: 5
  });

  console.log('Batch transfer:');
  console.log('- Recipients:', batch.outputs.length);
  console.log('- Total fee:', batch.fee);

  // Broadcast
  await batch.broadcast();

  // Return individual consignments
  return batch.consignments.map((c, i) => ({
    recipient: transfers[i].invoice,
    consignment: c.toBase64()
  }));
}
```

### Transfer with RGB and Bitcoin

Some transfers might need to send both RGB assets and Bitcoin:

```typescript
async function transferWithBitcoin(
  wallet: RgbWallet,
  invoice: Invoice,
  bitcoinAmount?: bigint
) {
  const transfer = await wallet.transfer({
    invoice: invoice.toString(),

    // RGB transfer
    rgbAmount: invoice.amount,

    // Optional Bitcoin to same recipient
    bitcoinAmount: bitcoinAmount,

    feeRate: 5
  });

  await transfer.broadcast();

  return transfer;
}
```

### Monitoring Transfer Status

```typescript
async function monitorTransfer(wallet: RgbWallet, txid: string) {
  // Check mempool
  let status = await wallet.getTransactionStatus(txid);
  console.log('In mempool:', status.inMempool);

  // Wait for confirmation
  const confirmed = await wallet.waitForConfirmation(txid, 1);
  console.log('Confirmed in block:', confirmed.blockHeight);

  // Subscribe to confirmations
  wallet.on('confirmation', (event) => {
    if (event.txid === txid) {
      console.log('Confirmations:', event.confirmations);
    }
  });
}
```

## Working with NFTs (RGB21)

### Creating NFT Collections

```typescript
import { Rgb21Contract, NftMetadata } from '@rgbjs/core';
import fs from 'fs/promises';

async function createNftCollection(wallet: RgbWallet) {
  // Prepare owner UTXO
  const ownerUtxo = await wallet.getUtxo();
  const ownerSeal = await wallet.blindUtxo(ownerUtxo);

  // Create RGB21 contract
  const collection = await Rgb21Contract.create({
    name: 'My NFT Collection',
    description: 'A collection of unique digital artworks',

    // Collection metadata
    collectionMeta: {
      creator: 'Artist Name',
      website: 'https://nfts.example',
      royalties: 500,  // 5% in basis points
      totalSupply: 100  // Maximum NFTs in collection
    },

    // Initial owner
    owner: ownerSeal
  });

  console.log('Collection created:', collection.contractId);

  return collection;
}
```

### Minting Individual NFTs

```typescript
async function mintNft(
  collection: Rgb21Contract,
  wallet: RgbWallet
) {
  // Prepare metadata
  const metadata: NftMetadata = {
    name: 'Artwork #1',
    description: 'First piece in the collection',

    // Image (embedded or IPFS)
    image: await fs.readFile('./artwork1.png'),
    // Or use IPFS:
    // imageUrl: 'ipfs://QmX...',

    // Attributes
    attributes: [
      { trait_type: 'Rarity', value: 'Legendary' },
      { trait_type: 'Color', value: 'Gold' },
      { trait_type: 'Edition', value: '1/100' }
    ],

    // Additional metadata
    properties: {
      artist: 'Artist Name',
      created: new Date().toISOString(),
      edition: 1,
      totalEditions: 100
    }
  };

  // Owner for this NFT
  const ownerUtxo = await wallet.getUtxo();
  const ownerSeal = await wallet.blindUtxo(ownerUtxo);

  // Mint NFT
  const tokenId = await collection.mint({
    metadata: metadata,
    owner: ownerSeal
  });

  console.log('NFT minted:', tokenId);

  return {
    tokenId,
    contractId: collection.contractId
  };
}
```

### Batch Minting

```typescript
async function batchMintNfts(
  collection: Rgb21Contract,
  wallet: RgbWallet,
  count: number
) {
  const minted = [];

  for (let i = 1; i <= count; i++) {
    const metadata: NftMetadata = {
      name: `Artwork #${i}`,
      description: `Piece ${i} in the collection`,
      image: await fs.readFile(`./artworks/artwork${i}.png`),
      attributes: [
        { trait_type: 'Edition', value: `${i}/${count}` },
        { trait_type: 'Rarity', value: getRarity(i, count) }
      ]
    };

    const ownerSeal = await wallet.blindUtxo(await wallet.getUtxo());

    const tokenId = await collection.mint({
      metadata: metadata,
      owner: ownerSeal
    });

    minted.push({ tokenId, edition: i });

    console.log(`Minted ${i}/${count}`);
  }

  return minted;
}

function getRarity(edition: number, total: number): string {
  const percent = (edition / total) * 100;
  if (percent <= 1) return 'Legendary';
  if (percent <= 10) return 'Epic';
  if (percent <= 30) return 'Rare';
  return 'Common';
}
```

### Querying NFT Data

```typescript
async function getNftInfo(
  contractId: ContractId,
  tokenId: TokenId,
  wallet: RgbWallet
) {
  const collection = await Rgb21Contract.fromContractId(contractId, wallet);

  // Get NFT token
  const token = await collection.getToken(tokenId);

  console.log('Token:', token.tokenId);
  console.log('Owner:', token.owner);

  // Get metadata
  const metadata = await collection.getMetadata(tokenId);

  console.log('Name:', metadata.name);
  console.log('Description:', metadata.description);
  console.log('Attributes:', metadata.attributes);

  // Get image
  if (metadata.image) {
    await fs.writeFile('./downloaded-nft.png', metadata.image);
  }

  return { token, metadata };
}
```

### Transferring NFTs

```typescript
async function transferNft(
  contractId: ContractId,
  tokenId: TokenId,
  wallet: RgbWallet,
  recipientInvoice: string
) {
  const collection = await Rgb21Contract.fromContractId(contractId, wallet);

  // Create transfer
  const transfer = await collection.transfer(tokenId, {
    invoice: recipientInvoice,
    feeRate: 5
  });

  console.log('NFT transfer created');
  console.log('- TXID:', transfer.txid);
  console.log('- Consignment:', transfer.consignment.toBase64());

  // Broadcast
  await transfer.broadcast();

  return transfer;
}
```

### Listing NFTs by Owner

```typescript
async function listOwnedNfts(
  wallet: RgbWallet,
  ownerAddress?: string
) {
  // Get all RGB21 contracts
  const collections = await wallet.listAssets({
    schema: 'RGB21'
  });

  const ownedNfts = [];

  for (const collection of collections) {
    const rgb21 = await Rgb21Contract.fromContractId(
      collection.contractId,
      wallet
    );

    // Get tokens owned by address (or wallet's default)
    const tokens = await rgb21.listTokens(ownerAddress);

    for (const token of tokens) {
      const metadata = await rgb21.getMetadata(token.tokenId);

      ownedNfts.push({
        collectionId: collection.contractId,
        collectionName: collection.name,
        tokenId: token.tokenId,
        metadata: metadata
      });
    }
  }

  return ownedNfts;
}
```

### NFT Marketplace Integration

```typescript
interface NftListing {
  contractId: ContractId;
  tokenId: TokenId;
  price: bigint;
  seller: string;
}

async function createListing(
  nft: { contractId: ContractId, tokenId: TokenId },
  price: bigint,
  wallet: RgbWallet
): Promise<NftListing> {
  // Create listing invoice
  const invoice = await wallet.createInvoice({
    contractId: nft.contractId,
    amount: 1n,  // NFTs are single units
    metadata: {
      type: 'nft_sale',
      price: price.toString(),
      tokenId: nft.tokenId
    }
  });

  return {
    contractId: nft.contractId,
    tokenId: nft.tokenId,
    price: price,
    seller: invoice.toString()
  };
}

async function purchaseNft(
  listing: NftListing,
  wallet: RgbWallet
) {
  // Pay for NFT
  const transfer = await wallet.transfer({
    invoice: listing.seller,
    feeRate: 5
  });

  await transfer.broadcast();

  // Wait for confirmation
  await wallet.waitForConfirmation(transfer.txid, 1);

  console.log('NFT purchased successfully');

  return transfer;
}
```

## React Integration

### RgbProvider Setup

```typescript
import { RgbProvider, RgbConfig } from '@rgbjs/react';
import { ReactNode } from 'react';

function App() {
  const config: RgbConfig = {
    network: 'bitcoin',
    stashPath: './rgb-stash',
    bitcoinRpc: {
      url: process.env.REACT_APP_BITCOIN_RPC_URL,
      username: process.env.REACT_APP_BITCOIN_RPC_USER,
      password: process.env.REACT_APP_BITCOIN_RPC_PASSWORD
    }
  };

  return (
    <RgbProvider config={config}>
      <YourApp />
    </RgbProvider>
  );
}
```

### useRgbWallet Hook

```typescript
import { useRgbWallet } from '@rgbjs/react';

function WalletInfo() {
  const {
    wallet,
    connected,
    connecting,
    error,
    connect,
    disconnect
  } = useRgbWallet();

  if (connecting) {
    return <div>Connecting to RGB wallet...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!connected) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return (
    <div>
      <p>Wallet connected</p>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

### useRgbBalance Hook

```typescript
import { useRgbBalance } from '@rgbjs/react';

function TokenBalance({ contractId }: { contractId: string }) {
  const {
    balance,
    loading,
    error,
    refresh
  } = useRgbBalance(contractId);

  if (loading) {
    return <div>Loading balance...</div>;
  }

  if (error) {
    return <div>Error loading balance: {error.message}</div>;
  }

  return (
    <div>
      <p>Balance: {balance?.toString()}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### useRgbAssets Hook

```typescript
import { useRgbAssets } from '@rgbjs/react';

function AssetList() {
  const { assets, loading, error } = useRgbAssets();

  if (loading) return <div>Loading assets...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {assets.map(asset => (
        <li key={asset.contractId}>
          <strong>{asset.ticker}</strong>: {asset.balance}
          <br />
          <small>{asset.contractId}</small>
        </li>
      ))}
    </ul>
  );
}
```

### useRgbTransfer Hook

```typescript
import { useRgbTransfer } from '@rgbjs/react';
import { useState } from 'react';

function TransferForm({ contractId }: { contractId: string }) {
  const [invoice, setInvoice] = useState('');
  const {
    transfer,
    loading,
    error,
    success,
    reset
  } = useRgbTransfer();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = await transfer({
      invoice: invoice,
      feeRate: 5
    });

    if (result.success) {
      console.log('Transfer successful:', result.txid);
      setInvoice('');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={invoice}
        onChange={(e) => setInvoice(e.target.value)}
        placeholder="RGB Invoice"
        disabled={loading}
      />

      <button type="submit" disabled={loading || !invoice}>
        {loading ? 'Sending...' : 'Send'}
      </button>

      {error && <div className="error">{error.message}</div>}
      {success && <div className="success">Transfer successful!</div>}
    </form>
  );
}
```

### useRgbInvoice Hook

```typescript
import { useRgbInvoice } from '@rgbjs/react';
import QRCode from 'qrcode.react';

function ReceiveForm({ contractId }: { contractId: string }) {
  const {
    invoice,
    createInvoice,
    loading,
    error
  } = useRgbInvoice();

  const [amount, setAmount] = useState('');

  async function handleCreate() {
    await createInvoice({
      contractId: contractId,
      amount: BigInt(amount)
    });
  }

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />

      <button onClick={handleCreate} disabled={loading}>
        Create Invoice
      </button>

      {invoice && (
        <div>
          <QRCode value={invoice.toString()} />
          <p>{invoice.toString()}</p>
        </div>
      )}

      {error && <div>{error.message}</div>}
    </div>
  );
}
```

### Complete Wallet Component

```typescript
import {
  useRgbWallet,
  useRgbAssets,
  useRgbTransfer,
  useRgbInvoice
} from '@rgbjs/react';
import { useState } from 'react';

function RgbWallet() {
  const { wallet, connected } = useRgbWallet();
  const { assets, loading: assetsLoading } = useRgbAssets();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [view, setView] = useState<'assets' | 'send' | 'receive'>('assets');

  if (!connected) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div className="rgb-wallet">
      <nav>
        <button onClick={() => setView('assets')}>Assets</button>
        <button onClick={() => setView('send')}>Send</button>
        <button onClick={() => setView('receive')}>Receive</button>
      </nav>

      {view === 'assets' && (
        <div>
          <h2>Your Assets</h2>
          {assetsLoading ? (
            <div>Loading...</div>
          ) : (
            <ul>
              {assets.map(asset => (
                <li
                  key={asset.contractId}
                  onClick={() => setSelectedAsset(asset.contractId)}
                  className={selectedAsset === asset.contractId ? 'selected' : ''}
                >
                  <div>
                    <strong>{asset.ticker}</strong> - {asset.name}
                  </div>
                  <div>Balance: {asset.balance.toString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view === 'send' && selectedAsset && (
        <SendView contractId={selectedAsset} />
      )}

      {view === 'receive' && selectedAsset && (
        <ReceiveView contractId={selectedAsset} />
      )}
    </div>
  );
}

function SendView({ contractId }: { contractId: string }) {
  const { transfer, loading, error } = useRgbTransfer();
  const [invoice, setInvoice] = useState('');

  async function handleSend() {
    const result = await transfer({
      invoice: invoice,
      feeRate: 5
    });

    if (result.success) {
      alert('Transfer sent!');
      setInvoice('');
    }
  }

  return (
    <div>
      <h2>Send Asset</h2>
      <textarea
        value={invoice}
        onChange={(e) => setInvoice(e.target.value)}
        placeholder="Paste RGB invoice"
      />
      <button onClick={handleSend} disabled={loading || !invoice}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}

function ReceiveView({ contractId }: { contractId: string }) {
  const { invoice, createInvoice, loading } = useRgbInvoice();
  const [amount, setAmount] = useState('');

  async function handleCreate() {
    await createInvoice({
      contractId: contractId,
      amount: BigInt(amount)
    });
  }

  return (
    <div>
      <h2>Receive Asset</h2>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <button onClick={handleCreate} disabled={loading}>
        Create Invoice
      </button>

      {invoice && (
        <div className="invoice">
          <QRCode value={invoice.toString()} size={256} />
          <input
            type="text"
            value={invoice.toString()}
            readOnly
            onClick={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
}
```

### Custom Hooks

```typescript
import { useRgbWallet } from '@rgbjs/react';
import { useState, useEffect } from 'react';

// Custom hook for transaction history
function useRgbHistory(contractId: string) {
  const { wallet } = useRgbWallet();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!wallet) return;

      setLoading(true);
      try {
        const txs = await wallet.getTransactionHistory(contractId);
        setHistory(txs);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [wallet, contractId]);

  return { history, loading };
}

// Usage
function TransactionHistory({ contractId }: { contractId: string }) {
  const { history, loading } = useRgbHistory(contractId);

  if (loading) return <div>Loading history...</div>;

  return (
    <ul>
      {history.map(tx => (
        <li key={tx.txid}>
          {tx.amount} - {tx.timestamp}
        </li>
      ))}
    </ul>
  );
}
```

## Node.js Backend Integration

### Express.js API Server

```typescript
import express from 'express';
import { RgbWallet, RgbConfig, Invoice } from '@rgbjs/core';
import { body, validationResult } from 'express-validator';

const app = express();
app.use(express.json());

// Initialize wallet
const config: RgbConfig = {
  network: process.env.NETWORK || 'bitcoin',
  stashPath: process.env.RGB_STASH_PATH || './rgb-stash',
  bitcoinRpc: {
    url: process.env.BITCOIN_RPC_URL,
    username: process.env.BITCOIN_RPC_USER,
    password: process.env.BITCOIN_RPC_PASSWORD
  }
};

const wallet = new RgbWallet(config);

// Initialize on startup
wallet.initialize().then(() => {
  console.log('RGB wallet initialized');
});

// Get wallet balance
app.get('/api/balance/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const balance = await wallet.getBalance(contractId);

    res.json({
      contractId,
      balance: balance.toString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all assets
app.get('/api/assets', async (req, res) => {
  try {
    const assets = await wallet.listAssets();

    res.json({
      assets: assets.map(a => ({
        contractId: a.contractId,
        ticker: a.ticker,
        name: a.name,
        balance: a.balance.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
app.post('/api/invoice',
  [
    body('contractId').isString(),
    body('amount').isString(),
    body('expiry').optional().isInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { contractId, amount, expiry } = req.body;

      const invoice = await wallet.createInvoice({
        contractId: contractId,
        amount: BigInt(amount),
        expiry: expiry ? Date.now() + expiry : undefined
      });

      res.json({
        invoice: invoice.toString(),
        contractId: contractId,
        amount: amount,
        expiry: invoice.expiry
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Send transfer
app.post('/api/transfer',
  [
    body('invoice').isString(),
    body('feeRate').optional().isInt()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { invoice, feeRate } = req.body;

      // Validate invoice
      const invoiceObj = Invoice.fromString(invoice);

      // Create transfer
      const transfer = await wallet.transfer({
        invoice: invoice,
        feeRate: feeRate || 5
      });

      // Broadcast
      await transfer.broadcast();

      res.json({
        success: true,
        txid: transfer.txid,
        consignment: transfer.consignment.toBase64(),
        fee: transfer.fee
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Accept consignment
app.post('/api/accept',
  [body('consignment').isString()],
  async (req, res) => {
    try {
      const { consignment } = req.body;

      await wallet.acceptTransfer(
        Consignment.fromBase64(consignment)
      );

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get transaction history
app.get('/api/history/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await wallet.getTransactionHistory(contractId);

    res.json({
      transactions: history.slice(offset, offset + limit),
      total: history.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('RGB API server running on port 3000');
});
```

### WebSocket Support for Real-time Updates

```typescript
import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'
  }
});

// Listen to wallet events
wallet.on('transfer_received', (transfer) => {
  io.emit('transfer', {
    type: 'received',
    contractId: transfer.contractId,
    amount: transfer.amount.toString(),
    txid: transfer.txid
  });
});

wallet.on('transfer_confirmed', (transfer) => {
  io.emit('confirmation', {
    txid: transfer.txid,
    confirmations: transfer.confirmations
  });
});

// Client subscription
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (contractId: string) => {
    socket.join(`contract:${contractId}`);
  });

  socket.on('unsubscribe', (contractId: string) => {
    socket.leave(`contract:${contractId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(3000);
```

### GraphQL API

```typescript
import { ApolloServer, gql } from 'apollo-server-express';

const typeDefs = gql`
  type Asset {
    contractId: String!
    ticker: String!
    name: String!
    balance: String!
  }

  type Transfer {
    txid: String!
    amount: String!
    fee: Int!
    consignment: String!
  }

  type Invoice {
    invoice: String!
    contractId: String!
    amount: String!
    expiry: String
  }

  type Query {
    assets: [Asset!]!
    balance(contractId: String!): String!
    history(contractId: String!, limit: Int, offset: Int): [Transaction!]!
  }

  type Mutation {
    createInvoice(
      contractId: String!
      amount: String!
      expiry: Int
    ): Invoice!

    transfer(
      invoice: String!
      feeRate: Int
    ): Transfer!

    acceptTransfer(consignment: String!): Boolean!
  }

  type Transaction {
    txid: String!
    amount: String!
    timestamp: String!
    confirmations: Int!
  }
`;

const resolvers = {
  Query: {
    assets: async () => {
      const assets = await wallet.listAssets();
      return assets.map(a => ({
        ...a,
        balance: a.balance.toString()
      }));
    },

    balance: async (_: any, { contractId }: { contractId: string }) => {
      const balance = await wallet.getBalance(contractId);
      return balance.toString();
    },

    history: async (
      _: any,
      { contractId, limit = 50, offset = 0 }: any
    ) => {
      const history = await wallet.getTransactionHistory(contractId);
      return history.slice(offset, offset + limit);
    }
  },

  Mutation: {
    createInvoice: async (
      _: any,
      { contractId, amount, expiry }: any
    ) => {
      const invoice = await wallet.createInvoice({
        contractId: contractId,
        amount: BigInt(amount),
        expiry: expiry ? Date.now() + expiry : undefined
      });

      return {
        invoice: invoice.toString(),
        contractId: contractId,
        amount: amount,
        expiry: invoice.expiry
      };
    },

    transfer: async (
      _: any,
      { invoice, feeRate = 5 }: any
    ) => {
      const transfer = await wallet.transfer({
        invoice: invoice,
        feeRate: feeRate
      });

      await transfer.broadcast();

      return {
        txid: transfer.txid,
        amount: transfer.amount.toString(),
        fee: transfer.fee,
        consignment: transfer.consignment.toBase64()
      };
    },

    acceptTransfer: async (
      _: any,
      { consignment }: { consignment: string }
    ) => {
      await wallet.acceptTransfer(Consignment.fromBase64(consignment));
      return true;
    }
  }
};

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers
});

await apolloServer.start();
apolloServer.applyMiddleware({ app });
```

### Background Jobs with Bull

```typescript
import Queue from 'bull';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// Transfer processing queue
const transferQueue = new Queue('rgb-transfers', {
  redis: redis
});

// Add job
app.post('/api/transfer/async', async (req, res) => {
  const { invoice, feeRate } = req.body;

  const job = await transferQueue.add({
    invoice: invoice,
    feeRate: feeRate || 5
  });

  res.json({
    jobId: job.id,
    status: 'pending'
  });
});

// Process jobs
transferQueue.process(async (job) => {
  const { invoice, feeRate } = job.data;

  try {
    const transfer = await wallet.transfer({
      invoice: invoice,
      feeRate: feeRate
    });

    await transfer.broadcast();

    return {
      success: true,
      txid: transfer.txid,
      consignment: transfer.consignment.toBase64()
    };
  } catch (error) {
    throw new Error(`Transfer failed: ${error.message}`);
  }
});

// Check job status
app.get('/api/transfer/status/:jobId', async (req, res) => {
  const job = await transferQueue.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const result = job.returnvalue;

  res.json({
    jobId: job.id,
    state: state,
    result: result
  });
});
```

### Database Integration

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Track transfers in database
async function recordTransfer(transfer: Transfer) {
  await prisma.rgbTransfer.create({
    data: {
      txid: transfer.txid,
      contractId: transfer.contractId,
      amount: transfer.amount.toString(),
      fee: transfer.fee,
      status: 'pending',
      consignment: transfer.consignment.toBase64(),
      createdAt: new Date()
    }
  });
}

// Update on confirmation
wallet.on('transfer_confirmed', async (transfer) => {
  await prisma.rgbTransfer.update({
    where: { txid: transfer.txid },
    data: {
      status: 'confirmed',
      confirmations: transfer.confirmations,
      confirmedAt: new Date()
    }
  });
});
```

## WebAssembly Integration Details

### WASM Module Loading

RGB.js uses WebAssembly for cryptographic operations and validation:

```typescript
import { initWasm, WasmConfig } from '@rgbjs/core';

// Basic initialization
await initWasm();

// Advanced configuration
await initWasm({
  // Custom WASM file path
  wasmUrl: '/static/rgb.wasm',

  // Memory configuration (in pages, 1 page = 64KB)
  initialMemory: 256,  // 16MB
  maximumMemory: 1024, // 64MB

  // Thread pool size (for multi-threading)
  threads: navigator.hardwareConcurrency || 4
});
```

### Browser Integration

```typescript
// Check WASM support
if (!WebAssembly) {
  console.error('WebAssembly not supported');
  // Fallback to pure JS implementation (slower)
}

// Initialize with progress tracking
const wasmLoader = initWasm({
  onProgress: (loaded, total) => {
    const percent = (loaded / total) * 100;
    console.log(`Loading WASM: ${percent.toFixed(1)}%`);
  }
});

await wasmLoader;
```

### Memory Management

```typescript
import { releaseWasmMemory } from '@rgbjs/core';

// Long-running application
setInterval(() => {
  // Manually trigger garbage collection
  releaseWasmMemory();
}, 60000); // Every minute

// Before unload
window.addEventListener('beforeunload', () => {
  releaseWasmMemory();
});
```

## Browser Wallet Integration

### MetaMask-style Integration

```typescript
// Injected window object
declare global {
  interface Window {
    rgb?: RgbProvider;
  }
}

class RgbProvider {
  async connect(): Promise<void> {
    // Request wallet connection
    const accounts = await this.request({
      method: 'rgb_requestAccounts'
    });

    this.emit('connect', { accounts });
  }

  async request(args: {
    method: string;
    params?: any[];
  }): Promise<any> {
    switch (args.method) {
      case 'rgb_requestAccounts':
        return this.getAccounts();

      case 'rgb_createInvoice':
        return this.createInvoice(args.params![0]);

      case 'rgb_transfer':
        return this.transfer(args.params![0]);

      default:
        throw new Error(`Unknown method: ${args.method}`);
    }
  }

  private async getAccounts(): Promise<string[]> {
    // Return connected wallet addresses
    return this.wallet.getAddresses();
  }

  private async createInvoice(params: any): Promise<string> {
    const invoice = await this.wallet.createInvoice(params);
    return invoice.toString();
  }

  private async transfer(params: any): Promise<string> {
    const transfer = await this.wallet.transfer(params);
    await transfer.broadcast();
    return transfer.txid;
  }
}

// Usage in dApp
async function connectWallet() {
  if (typeof window.rgb === 'undefined') {
    alert('Please install an RGB wallet');
    return;
  }

  try {
    await window.rgb.connect();
    console.log('Wallet connected');
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

### WalletConnect Integration

```typescript
import WalletConnect from '@walletconnect/client';
import QRCodeModal from '@walletconnect/qrcode-modal';

const connector = new WalletConnect({
  bridge: 'https://bridge.walletconnect.org',
  qrcodeModal: QRCodeModal
});

// Subscribe to connection events
connector.on('connect', (error, payload) => {
  if (error) throw error;

  const { accounts, chainId } = payload.params[0];
  console.log('Connected:', accounts);
});

// Create session
if (!connector.connected) {
  await connector.createSession();
}

// Send RGB transfer via WalletConnect
async function sendViaWalletConnect(invoice: string) {
  const result = await connector.sendCustomRequest({
    method: 'rgb_transfer',
    params: [{
      invoice: invoice,
      feeRate: 5
    }]
  });

  return result;
}
```

## Advanced Features

### Custom Schema Development

```typescript
import { Schema, SchemaBuilder } from '@rgbjs/core';

// Define custom schema using Contractum language
const customSchema = Schema.fromContractum(`
  contract NFTMarketplace
    interface RGB21
  {
    global {
      name: String<256>
      description: String<4096>
      marketplace_fee: U16  -- basis points (e.g., 250 = 2.5%)
    }

    assignments owned {
      nft: Rights
      listing: Amount
    }

    valencies {
      saleContract: AnyData
    }

    genesis {
      name: String<256>
      description: String<4096>
      marketplace_fee: U16
    }

    transitions {
      create_listing {
        closes owned { nft }
        defines owned { listing }
        default saleContract
      }

      complete_sale {
        closes owned { listing }
        defines owned { nft }
      }

      cancel_listing {
        closes owned { listing }
        defines owned { nft }
      }
    }
  }
`);

// Use custom schema
async function createMarketplace(wallet: RgbWallet) {
  const contract = await wallet.createContract({
    schema: customSchema,
    genesis: {
      name: 'My NFT Marketplace',
      description: 'A decentralized NFT marketplace',
      marketplace_fee: 250  // 2.5%
    }
  });

  return contract;
}
```

### Programmatic Schema Building

```typescript
const builder = new SchemaBuilder();

builder
  .setName('CustomToken')
  .addGlobalState('name', 'String<256>')
  .addGlobalState('total_supply', 'U64')
  .addOwnedState('balance', 'Amount')
  .addTransition('transfer', {
    closes: ['balance'],
    defines: ['balance']
  });

const schema = builder.build();
```

### Event System and Subscriptions

```typescript
import { RgbWallet, EventType } from '@rgbjs/core';

const wallet = new RgbWallet(config);

// Subscribe to all events
wallet.on('*', (event) => {
  console.log('Event:', event.type, event.data);
});

// Transfer events
wallet.on('transfer_created', (transfer) => {
  console.log('Transfer created:', transfer.txid);
});

wallet.on('transfer_broadcast', (transfer) => {
  console.log('Transfer broadcast:', transfer.txid);
});

wallet.on('transfer_received', (transfer) => {
  console.log('Received:', {
    amount: transfer.amount,
    from: transfer.sender,
    contractId: transfer.contractId
  });
});

wallet.on('transfer_confirmed', (transfer) => {
  console.log('Confirmed:', transfer.txid);
  console.log('Confirmations:', transfer.confirmations);
});

// Asset events
wallet.on('asset_created', (asset) => {
  console.log('New asset:', asset.contractId);
});

wallet.on('balance_changed', ({ contractId, oldBalance, newBalance }) => {
  console.log(`Balance changed: ${oldBalance} -> ${newBalance}`);
});

// Error events
wallet.on('error', (error) => {
  console.error('Wallet error:', error);
});

// Sync events
wallet.on('sync_started', () => {
  console.log('Syncing...');
});

wallet.on('sync_progress', ({ current, total }) => {
  console.log(`Sync progress: ${current}/${total}`);
});

wallet.on('sync_completed', () => {
  console.log('Sync complete');
});

// Unsubscribe
const handler = (transfer) => console.log(transfer);
wallet.on('transfer_received', handler);
wallet.off('transfer_received', handler);

// Once
wallet.once('transfer_confirmed', (transfer) => {
  console.log('First confirmation:', transfer.txid);
});
```

### Filtered Event Subscriptions

```typescript
// Subscribe to events for specific contract
wallet.on('transfer_received', (transfer) => {
  if (transfer.contractId === myContractId) {
    console.log('Transfer for my token:', transfer.amount);
  }
});

// Helper method for contract-specific events
wallet.onContract(contractId, 'transfer_received', (transfer) => {
  console.log('Transfer received for this contract');
});
```

### Error Handling Patterns

```typescript
import { RgbError, RgbErrorCode, ValidationError } from '@rgbjs/core';

async function handleRgbOperation() {
  try {
    const transfer = await wallet.transfer({
      invoice: invoice,
      feeRate: 5
    });

    await transfer.broadcast();

  } catch (error) {
    if (error instanceof RgbError) {
      switch (error.code) {
        case RgbErrorCode.InsufficientFunds:
          console.error('Not enough funds');
          console.error('Required:', error.details.required);
          console.error('Available:', error.details.available);
          break;

        case RgbErrorCode.ValidationFailed:
          if (error instanceof ValidationError) {
            console.error('Validation errors:');
            error.validationErrors.forEach(e => {
              console.error(`- ${e.field}: ${e.message}`);
            });
          }
          break;

        case RgbErrorCode.InvalidInvoice:
          console.error('Invalid invoice format');
          break;

        case RgbErrorCode.ConsignmentRejected:
          console.error('Consignment validation failed');
          console.error('Reasons:', error.details.reasons);
          break;

        case RgbErrorCode.NetworkError:
          console.error('Network error:', error.details.message);
          // Retry logic
          break;

        case RgbErrorCode.UtxoAlreadySpent:
          console.error('UTXO already spent');
          // Refresh UTXO set
          await wallet.sync();
          break;

        default:
          console.error('RGB error:', error.message);
      }
    } else {
      // Non-RGB error
      console.error('Unexpected error:', error);
    }
  }
}
```

### Retry Logic

```typescript
async function transferWithRetry(
  wallet: RgbWallet,
  invoice: string,
  maxRetries = 3
): Promise<Transfer> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transfer = await wallet.transfer({
        invoice: invoice,
        feeRate: 5
      });

      await transfer.broadcast();

      return transfer;

    } catch (error) {
      lastError = error;

      if (error instanceof RgbError) {
        // Don't retry on certain errors
        if (error.code === RgbErrorCode.InvalidInvoice ||
            error.code === RgbErrorCode.InsufficientFunds) {
          throw error;
        }

        // Sync and retry on UTXO errors
        if (error.code === RgbErrorCode.UtxoNotFound ||
            error.code === RgbErrorCode.UtxoAlreadySpent) {
          await wallet.sync();
        }
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Transfer failed after ${maxRetries} attempts: ${lastError.message}`);
}

## TypeScript Type Definitions

### Core Types

```typescript
import type {
  ContractId,
  TokenId,
  Utxo,
  Txid,
  Address,
  Amount,
  Timestamp
} from '@rgbjs/core';

// Contract ID (Bech32m format)
type ContractId = string;  // 'rgb:...'

// Token ID for NFTs
type TokenId = string;

// Bitcoin UTXO
interface Utxo {
  txid: Txid;
  vout: number;
  amount: Amount;
  script: Buffer;
}

// Asset information
interface AssetInfo {
  contractId: ContractId;
  ticker: string;
  name: string;
  precision: number;
  balance: bigint;
  schema: string;
}

// Invoice
interface Invoice {
  contractId: ContractId;
  amount: bigint;
  beneficiary: string;  // Blinded UTXO
  expiry?: Timestamp;
  metadata?: Record<string, any>;

  toString(): string;
  isExpired(): boolean;
}

// Transfer result
interface Transfer {
  txid: Txid;
  contractId: ContractId;
  amount: bigint;
  fee: number;
  consignment: Consignment;

  broadcast(): Promise<void>;
  wait(confirmations?: number): Promise<void>;
}

// Consignment
interface Consignment {
  contractId: ContractId;
  amount: bigint;
  txid?: Txid;

  toBase64(): string;
  toBytes(): Uint8Array;
  validate(): Promise<ValidationResult>;
}
```

### Generic Type Helpers

```typescript
// Result type for operations
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// Example usage
async function safeTransfer(
  wallet: RgbWallet,
  invoice: string
): Promise<Result<Transfer, RgbError>> {
  try {
    const transfer = await wallet.transfer({ invoice });
    return { success: true, value: transfer };
  } catch (error) {
    return { success: false, error: error as RgbError };
  }
}

// Option type
type Option<T> = T | null | undefined;

// Asset balance map
type BalanceMap = Map<ContractId, bigint>;

// Event handler type
type EventHandler<T> = (event: T) => void | Promise<void>;
```

## Build Configuration

### Webpack Configuration

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async'
      }
    ]
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      // Polyfills for Node.js modules
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/')
    }
  },

  experiments: {
    asyncWebAssembly: true
  },

  // Development server
  devServer: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
};
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],

  optimizeDeps: {
    exclude: ['@rgbjs/core'],
    esbuildOptions: {
      target: 'esnext'
    }
  },

  build: {
    target: 'esnext'
  },

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    fs: {
      allow: ['..']
    }
  },

  worker: {
    format: 'es'
  }
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",

    "types": ["@rgbjs/core"],

    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    };

    // Polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/')
      };
    }

    return config;
  },

  // Required headers for SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

## Performance Optimization

### Lazy Loading

```typescript
// Lazy load RGB wallet
const RgbWallet = lazy(() =>
  import('@rgbjs/core').then(module => ({ default: module.RgbWallet }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading RGB...</div>}>
      <RgbWallet config={config} />
    </Suspense>
  );
}
```

### Caching Strategies

```typescript
import { LRUCache } from 'lru-cache';

// Cache for contract state
const stateCache = new LRUCache<ContractId, ContractState>({
  max: 500,
  ttl: 1000 * 60 * 5  // 5 minutes
});

async function getContractState(contractId: ContractId): Promise<ContractState> {
  // Check cache first
  const cached = stateCache.get(contractId);
  if (cached) return cached;

  // Fetch from wallet
  const state = await wallet.getContractState(contractId);

  // Cache result
  stateCache.set(contractId, state);

  return state;
}
```

### UTXO Set Optimization

```typescript
// Index UTXOs by contract
class UtxoIndex {
  private index = new Map<ContractId, Set<Utxo>>();

  async rebuild(wallet: RgbWallet) {
    const utxos = await wallet.listUtxos();

    for (const utxo of utxos) {
      const allocations = await wallet.getRgbAllocations(utxo);

      for (const allocation of allocations) {
        if (!this.index.has(allocation.contractId)) {
          this.index.set(allocation.contractId, new Set());
        }
        this.index.get(allocation.contractId)!.add(utxo);
      }
    }
  }

  getUtxos(contractId: ContractId): Utxo[] {
    return Array.from(this.index.get(contractId) || []);
  }
}
```

### Worker Thread for Heavy Operations

```typescript
// rgb-worker.ts
import { RgbWallet } from '@rgbjs/core';

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'validate':
      const result = await validateConsignment(data.consignment);
      self.postMessage({ type: 'validation_result', result });
      break;

    case 'sign':
      const signed = await signTransfer(data.psbt);
      self.postMessage({ type: 'signed', signed });
      break;
  }
});

// Main thread
const worker = new Worker(new URL('./rgb-worker.ts', import.meta.url));

worker.postMessage({
  type: 'validate',
  data: { consignment: consignmentData }
});

worker.addEventListener('message', (event) => {
  if (event.data.type === 'validation_result') {
    console.log('Validation result:', event.data.result);
  }
});
```

## Common Use Cases and Examples

### Payment Processor

```typescript
class RgbPaymentProcessor {
  constructor(private wallet: RgbWallet) {}

  async createPayment(
    contractId: ContractId,
    amount: bigint,
    description?: string
  ): Promise<string> {
    const invoice = await this.wallet.createInvoice({
      contractId: contractId,
      amount: amount,
      expiry: Date.now() + 3600000,  // 1 hour
      metadata: { description }
    });

    // Store invoice
    await this.storeInvoice(invoice);

    return invoice.toString();
  }

  async processPayment(consignment: string): Promise<boolean> {
    try {
      await this.wallet.acceptTransfer(
        Consignment.fromBase64(consignment)
      );

      // Mark invoice as paid
      await this.markInvoicePaid(consignment);

      return true;
    } catch (error) {
      console.error('Payment failed:', error);
      return false;
    }
  }

  private async storeInvoice(invoice: Invoice) {
    // Store in database
  }

  private async markInvoicePaid(consignment: string) {
    // Update database
  }
}
```

### Escrow Service

```typescript
class RgbEscrow {
  async createEscrow(params: {
    buyer: string;
    seller: string;
    contractId: ContractId;
    amount: bigint;
    timeout: number;
  }) {
    // Buyer sends to escrow
    const escrowInvoice = await this.wallet.createInvoice({
      contractId: params.contractId,
      amount: params.amount
    });

    // Store escrow details
    await this.storeEscrow({
      ...params,
      invoice: escrowInvoice.toString(),
      status: 'awaiting_payment',
      createdAt: Date.now()
    });

    return escrowInvoice.toString();
  }

  async releaseToSeller(escrowId: string) {
    const escrow = await this.getEscrow(escrowId);

    // Create invoice for seller
    const sellerInvoice = escrow.seller;

    // Transfer from escrow to seller
    const transfer = await this.wallet.transfer({
      invoice: sellerInvoice,
      feeRate: 5
    });

    await transfer.broadcast();

    // Update escrow status
    await this.updateEscrow(escrowId, {
      status: 'released',
      releasedAt: Date.now()
    });
  }

  async refundToBuyer(escrowId: string) {
    // Similar to releaseToSeller but sends back to buyer
  }
}
```

### Token Swap/Exchange

```typescript
class RgbSwap {
  async createSwapOffer(params: {
    offerAsset: ContractId;
    offerAmount: bigint;
    requestAsset: ContractId;
    requestAmount: bigint;
    expiry: number;
  }) {
    // Create invoice for requested asset
    const invoice = await this.wallet.createInvoice({
      contractId: params.requestAsset,
      amount: params.requestAmount,
      expiry: params.expiry
    });

    // Store swap offer
    const offer = {
      ...params,
      invoice: invoice.toString(),
      status: 'open',
      createdAt: Date.now()
    };

    await this.storeSwapOffer(offer);

    return offer;
  }

  async acceptSwapOffer(offerId: string) {
    const offer = await this.getSwapOffer(offerId);

    // Send requested asset
    const transfer = await this.wallet.transfer({
      invoice: offer.invoice,
      feeRate: 5
    });

    await transfer.broadcast();

    // Receive offered asset
    // (counterparty sends consignment)

    return transfer;
  }
}
```

## Troubleshooting

### Common Issues

#### WASM Loading Errors

```typescript
// Issue: WASM module fails to load
// Solution: Check CORS headers and MIME type

// Ensure server serves .wasm files correctly
// Content-Type: application/wasm

// For webpack dev server:
devServer: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
  },
  static: {
    mimeTypes: {
      wasm: 'application/wasm'
    }
  }
}
```

#### BigInt Serialization

```typescript
// Issue: JSON.stringify doesn't support BigInt
// Solution: Use custom serializer

function serializeRgbData(data: any): string {
  return JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

function deserializeRgbData(json: string): any {
  return JSON.parse(json, (key, value) => {
    // Known bigint fields
    if (key === 'amount' || key === 'balance' || key === 'totalSupply') {
      return BigInt(value);
    }
    return value;
  });
}
```

#### Memory Leaks

```typescript
// Issue: Memory grows over time
// Solution: Properly cleanup subscriptions

class RgbComponent {
  private subscriptions: Array<() => void> = [];

  componentDidMount() {
    const unsubscribe1 = wallet.on('transfer_received', this.handleTransfer);
    const unsubscribe2 = wallet.on('balance_changed', this.handleBalance);

    this.subscriptions.push(unsubscribe1, unsubscribe2);
  }

  componentWillUnmount() {
    // Cleanup all subscriptions
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
  }
}
```

#### UTXO Not Found

```typescript
// Issue: Transfer fails with "UTXO not found"
// Solution: Sync wallet before operations

async function syncBeforeTransfer(wallet: RgbWallet, invoice: string) {
  try {
    // Sync UTXO set
    await wallet.sync();

    // Now attempt transfer
    const transfer = await wallet.transfer({ invoice, feeRate: 5 });
    return transfer;

  } catch (error) {
    if (error.code === RgbErrorCode.UtxoNotFound) {
      // Force full rescan
      await wallet.rescan();
      // Retry
      return wallet.transfer({ invoice, feeRate: 5 });
    }
    throw error;
  }
}
```

#### Consignment Validation Failed

```typescript
// Issue: Received consignment fails validation
// Solution: Check consignment integrity and sync state

async function debugConsignment(consignment: Consignment) {
  const validation = await wallet.validateConsignment(consignment);

  if (!validation.valid) {
    console.error('Validation errors:');

    for (const error of validation.errors) {
      console.error(`- ${error.type}: ${error.message}`);

      switch (error.type) {
        case 'MissingGenesis':
          console.log('Need to import contract genesis');
          break;

        case 'InvalidTransition':
          console.log('State transition validation failed');
          console.log('Details:', error.details);
          break;

        case 'AmountMismatch':
          console.log('Amount conservation failed');
          break;

        case 'InvalidWitness':
          console.log('Bitcoin transaction witness invalid');
          break;
      }
    }
  }

  return validation;
}
```

### Debugging Tips

```typescript
// Enable debug logging
import { setLogLevel, LogLevel } from '@rgbjs/core';

setLogLevel(LogLevel.Debug);

// Log all wallet operations
wallet.on('*', (event) => {
  console.log('[RGB]', event.type, event.data);
});

// Inspect contract state
async function inspectContract(contractId: ContractId) {
  const state = await wallet.getContractState(contractId);

  console.log('Contract State:');
  console.log('- Schema:', state.schema);
  console.log('- Genesis:', state.genesis);
  console.log('- Transitions:', state.transitions.length);
  console.log('- Owned States:', state.ownedStates);
  console.log('- Global State:', state.globalState);

  return state;
}

// Validate entire stash
async function validateStash(wallet: RgbWallet) {
  const validation = await wallet.validateStash();

  console.log('Stash Validation:');
  console.log('- Total Contracts:', validation.totalContracts);
  console.log('- Valid:', validation.validContracts);
  console.log('- Invalid:', validation.invalidContracts);

  if (validation.errors.length > 0) {
    console.error('Validation Errors:');
    validation.errors.forEach(e => {
      console.error(`- ${e.contractId}: ${e.error}`);
    });
  }

  return validation;
}
```

### Performance Profiling

```typescript
// Measure operation performance
async function profileOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - start;

    console.log(`[Profile] ${name}: ${duration.toFixed(2)}ms`);

    return result;

  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Profile] ${name} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}

// Usage
await profileOperation('Create Invoice', () =>
  wallet.createInvoice({ contractId, amount: 1000n })
);

await profileOperation('Send Transfer', () =>
  wallet.transfer({ invoice, feeRate: 5 })
);
```

## Best Practices

### Security

1. **Never expose private keys in client-side code**
   ```typescript
   // BAD
   const wallet = new RgbWallet({
     privateKey: 'xprv...'  // Never do this
   });

   // GOOD - Use hardware wallet or secure enclave
   const wallet = new RgbWallet({
     signer: hardwareWalletSigner
   });
   ```

2. **Validate all inputs**
   ```typescript
   function validateInvoice(invoiceString: string): boolean {
     try {
       const invoice = Invoice.fromString(invoiceString);

       // Check expiry
       if (invoice.isExpired()) {
         throw new Error('Invoice expired');
       }

       // Validate amount
       if (invoice.amount <= 0n) {
         throw new Error('Invalid amount');
       }

       return true;
     } catch {
       return false;
     }
   }
   ```

3. **Secure consignment storage**
   ```typescript
   // Encrypt consignments before storage
   import { encrypt, decrypt } from '@rgbjs/crypto';

   async function storeConsignment(consignment: Consignment, password: string) {
     const encrypted = await encrypt(
       consignment.toBytes(),
       password
     );

     await storage.save(consignment.txid, encrypted);
   }
   ```

### Code Organization

```typescript
// Recommended project structure
src/
├── rgb/
│   ├── wallet/
│   │   ├── RgbWalletProvider.tsx
│   │   ├── useRgbWallet.ts
│   │   └── types.ts
│   ├── contracts/
│   │   ├── Rgb20Contract.ts
│   │   ├── Rgb21Contract.ts
│   │   └── CustomContract.ts
│   ├── services/
│   │   ├── TransferService.ts
│   │   ├── InvoiceService.ts
│   │   └── ConsignmentService.ts
│   └── utils/
│       ├── formatting.ts
│       ├── validation.ts
│       └── serialization.ts
├── components/
│   ├── AssetList.tsx
│   ├── TransferForm.tsx
│   └── InvoiceDisplay.tsx
└── config/
    └── rgb.config.ts
```

### Testing Strategy

```typescript
// Unit tests for utilities
describe('RGB Utils', () => {
  test('formats amount correctly', () => {
    expect(formatAmount(100000000n, 8)).toBe('1.00000000');
  });

  test('validates invoice format', () => {
    expect(isValidInvoice('rgb:...')).toBe(true);
  });
});

// Integration tests for transfers
describe('RGB Transfers', () => {
  let wallet: RgbWallet;
  let testkit: RgbTestkit;

  beforeEach(async () => {
    testkit = await RgbTestkit.create();
    wallet = await testkit.createWallet();
  });

  test('complete transfer flow', async () => {
    const token = await testkit.createToken();
    const invoice = await testkit.createInvoice({ amount: 100n });

    const transfer = await wallet.transfer({ invoice: invoice.toString() });

    expect(transfer.txid).toBeDefined();
  });

  afterEach(async () => {
    await testkit.cleanup();
  });
});
```

### Documentation

```typescript
/**
 * Creates an RGB20 fungible token
 *
 * @param params - Token creation parameters
 * @param params.ticker - Token ticker symbol (max 8 chars)
 * @param params.name - Full token name (max 256 chars)
 * @param params.precision - Decimal places (0-18)
 * @param params.totalSupply - Total token supply in smallest unit
 * @param params.allocations - Initial token allocations
 *
 * @returns Promise<Rgb20Contract> The created token contract
 *
 * @throws {RgbError} If validation fails
 * @throws {RgbError} If insufficient Bitcoin for fees
 *
 * @example
 * ```typescript
 * const token = await Rgb20Contract.create({
 *   ticker: 'TKN',
 *   name: 'My Token',
 *   precision: 8,
 *   totalSupply: 1000000n,
 *   allocations: [{ owner: blindedUtxo, amount: 1000000n }]
 * });
 * ```
 */
async function createToken(params: Rgb20Params): Promise<Rgb20Contract> {
  // Implementation
}
```

## Related Documentation

- [Rust SDK](./rust-sdk.md) - Core RGB Rust implementation
- [Wallet Integration](./wallet-integration.md) - Building RGB-enabled wallets
- [Testing Guide](./testing.md) - Testing RGB applications
- [RGB20 Fungible Tokens](../rgb20/creating-tokens.md)
- [RGB21 NFTs](../rgb21/nft-basics.md)
- [Transfer Workflow](../rgb20/transferring-assets.md)

## Further Resources

- [RGB.js GitHub Repository](https://github.com/RGB-Tools/rgb.js)
- [RGB Specification](https://rgb.tech)
- [RGB Developer Community](https://t.me/rgbtelegram)
- [Example Applications](https://github.com/RGB-Tools/rgb-examples)

---

*Last updated: 2025-01-17*
