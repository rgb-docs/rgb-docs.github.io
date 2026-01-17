---
sidebar_position: 4
title: Testing RGB Applications
description: Testing strategies and tools for RGB smart contracts and applications
---

# Testing RGB Applications

Comprehensive guide to testing RGB contracts, transfers, and applications.

## Test Environments

### Regtest Setup (Recommended for Development)

Bitcoin regtest (regression test mode) provides a controlled environment for RGB development:

```bash
# Start Bitcoin Core in regtest mode
bitcoind -regtest \
  -daemon \
  -server \
  -rpcuser=rgbtest \
  -rpcpassword=rgbtest123 \
  -rpcport=18443 \
  -fallbackfee=0.00001 \
  -txindex=1

# Verify it's running
bitcoin-cli -regtest -rpcuser=rgbtest -rpcpassword=rgbtest123 getblockchaininfo

# Create initial wallet
bitcoin-cli -regtest -rpcuser=rgbtest -rpcpassword=rgbtest123 createwallet "testwallet"

# Generate some blocks for initial funding
bitcoin-cli -regtest -rpcuser=rgbtest -rpcpassword=rgbtest123 generatetoaddress 101 $(bitcoin-cli -regtest -rpcuser=rgbtest -rpcpassword=rgbtest123 getnewaddress)
```

### Automated Regtest Setup Script

```bash
#!/bin/bash
# setup-rgb-regtest.sh

# Configuration
RPC_USER="rgbtest"
RPC_PASS="rgbtest123"
RPC_PORT="18443"
DATA_DIR="$HOME/.bitcoin-regtest"

# Start Bitcoin regtest
echo "Starting Bitcoin regtest..."
bitcoind -regtest \
  -datadir=$DATA_DIR \
  -daemon \
  -server \
  -rpcuser=$RPC_USER \
  -rpcpassword=$RPC_PASS \
  -rpcport=$RPC_PORT \
  -fallbackfee=0.00001 \
  -txindex=1 \
  -debug=1

sleep 3

# Create wallet
echo "Creating wallet..."
bitcoin-cli -regtest -rpcuser=$RPC_USER -rpcpassword=$RPC_PASS createwallet "testwallet" || true

# Generate initial blocks
echo "Generating 101 initial blocks..."
ADDRESS=$(bitcoin-cli -regtest -rpcuser=$RPC_USER -rpcpassword=$RPC_PASS getnewaddress)
bitcoin-cli -regtest -rpcuser=$RPC_USER -rpcpassword=$RPC_PASS generatetoaddress 101 $ADDRESS

# Get balance
BALANCE=$(bitcoin-cli -regtest -rpcuser=$RPC_USER -rpcpassword=$RPC_PASS getbalance)
echo "Wallet balance: $BALANCE BTC"

echo "Regtest setup complete!"
echo "RPC URL: http://localhost:$RPC_PORT"
echo "RPC User: $RPC_USER"
echo "RPC Password: $RPC_PASS"
```

### Docker-based Test Environment

```yaml
# docker-compose.yml
version: '3.8'

services:
  bitcoind:
    image: ruimarinho/bitcoin-core:latest
    command:
      - -regtest
      - -server
      - -rpcuser=rgbtest
      - -rpcpassword=rgbtest123
      - -rpcallowip=0.0.0.0/0
      - -rpcbind=0.0.0.0
      - -txindex=1
      - -fallbackfee=0.00001
    ports:
      - "18443:18443"
      - "18444:18444"
    volumes:
      - bitcoin-data:/home/bitcoin/.bitcoin

  rgb-node:
    image: rgb/rgb-node:latest
    depends_on:
      - bitcoind
    environment:
      - BITCOIN_RPC_URL=http://bitcoind:18443
      - BITCOIN_RPC_USER=rgbtest
      - BITCOIN_RPC_PASSWORD=rgbtest123
      - RGB_NETWORK=regtest
    ports:
      - "3000:3000"
    volumes:
      - rgb-data:/data

volumes:
  bitcoin-data:
  rgb-data:
```

```bash
# Start test environment
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop environment
docker-compose down
```

### Testnet Setup

For testing with real network conditions:

```bash
# Start Bitcoin testnet
bitcoind -testnet \
  -daemon \
  -server \
  -rpcuser=rgbtest \
  -rpcpassword=rgbtest123 \
  -rpcport=18332 \
  -txindex=1

# Get testnet coins from faucet
# https://testnet-faucet.mempool.co/
# https://bitcoinfaucet.uo1.net/

# Verify connection
bitcoin-cli -testnet getblockchaininfo
```

### Test Environment Manager

```typescript
class TestEnvironmentManager {
  private bitcoind: ChildProcess | null = null;
  private rgbNode: ChildProcess | null = null;

  async start(): Promise<void> {
    // Start bitcoind
    this.bitcoind = spawn('bitcoind', [
      '-regtest',
      '-daemon',
      '-rpcuser=rgbtest',
      '-rpcpassword=rgbtest123',
      '-rpcport=18443',
      '-fallbackfee=0.00001',
      '-txindex=1'
    ]);

    // Wait for bitcoind to be ready
    await this.waitForBitcoind();

    // Create wallet
    await this.createWallet();

    // Generate initial blocks
    await this.generateBlocks(101);

    console.log('Test environment ready');
  }

  async stop(): Promise<void> {
    if (this.rgbNode) {
      this.rgbNode.kill();
    }

    if (this.bitcoind) {
      execSync('bitcoin-cli -regtest stop');
    }

    console.log('Test environment stopped');
  }

  async cleanup(): Promise<void> {
    await this.stop();

    // Clean data directories
    const dataDir = path.join(os.homedir(), '.bitcoin-regtest');
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true });
    }
  }

  private async waitForBitcoind(): Promise<void> {
    for (let i = 0; i < 30; i++) {
      try {
        execSync('bitcoin-cli -regtest getblockchaininfo', { stdio: 'ignore' });
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Bitcoind failed to start');
  }

  private async createWallet(): Promise<void> {
    try {
      execSync('bitcoin-cli -regtest createwallet "testwallet"', { stdio: 'ignore' });
    } catch {
      // Wallet might already exist
    }
  }

  async generateBlocks(count: number): Promise<void> {
    const address = execSync('bitcoin-cli -regtest getnewaddress')
      .toString()
      .trim();

    execSync(`bitcoin-cli -regtest generatetoaddress ${count} ${address}`);
  }

  async fundAddress(address: string, amount: number): Promise<void> {
    execSync(`bitcoin-cli -regtest sendtoaddress ${address} ${amount}`);
    await this.generateBlocks(1);
  }
}
```

## Unit Testing

### RGB Test Kit

Complete test kit for RGB development:

```typescript
import { RgbTestkit, TestWallet } from '@rgbjs/testing';
import { Rgb20Contract, ContractId } from '@rgbjs/core';

describe('RGB20 Token Tests', () => {
  let testkit: RgbTestkit;
  let wallet: TestWallet;

  beforeEach(async () => {
    // Initialize test environment
    testkit = await RgbTestkit.create({
      network: 'regtest',
      autoMine: true,  // Automatically mine blocks
      verbose: false
    });

    // Create test wallet
    wallet = await testkit.createWallet();

    // Fund wallet with Bitcoin
    await testkit.fundWallet(wallet, 10);  // 10 BTC
  });

  afterEach(async () => {
    await testkit.cleanup();
  });

  describe('Token Creation', () => {
    it('should create token with valid parameters', async () => {
      const token = await testkit.createToken({
        ticker: 'TEST',
        name: 'Test Token',
        precision: 8,
        totalSupply: 1000000n
      });

      expect(token.contractId).toBeDefined();
      expect(token.ticker).toBe('TEST');
      expect(token.totalSupply).toBe(1000000n);
    });

    it('should fail with invalid ticker', async () => {
      await expect(
        testkit.createToken({
          ticker: '',  // Invalid: empty ticker
          totalSupply: 1000n
        })
      ).rejects.toThrow('Invalid ticker');
    });

    it('should fail with zero supply', async () => {
      await expect(
        testkit.createToken({
          ticker: 'ZERO',
          totalSupply: 0n  // Invalid: zero supply
        })
      ).rejects.toThrow('Total supply must be positive');
    });

    it('should create token with multiple allocations', async () => {
      const utxo1 = await wallet.getUtxo();
      const utxo2 = await wallet.getUtxo();

      const token = await testkit.createToken({
        ticker: 'MULTI',
        totalSupply: 1000n,
        allocations: [
          { owner: utxo1, amount: 600n },
          { owner: utxo2, amount: 400n }
        ]
      });

      expect(token.contractId).toBeDefined();

      // Verify allocations
      const balance1 = await wallet.getBalance(token.contractId, utxo1);
      const balance2 = await wallet.getBalance(token.contractId, utxo2);

      expect(balance1).toBe(600n);
      expect(balance2).toBe(400n);
    });
  });

  describe('Token Transfers', () => {
    let token: Rgb20Contract;

    beforeEach(async () => {
      token = await testkit.createToken({
        ticker: 'XFER',
        totalSupply: 1000n
      });
    });

    it('should transfer tokens successfully', async () => {
      const recipient = await testkit.createWallet();

      // Create invoice
      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: 100n
      });

      // Send transfer
      const transfer = await wallet.transfer({
        invoice: invoice.toString(),
        feeRate: 1
      });

      expect(transfer.txid).toBeDefined();

      // Accept transfer
      await recipient.acceptTransfer(transfer.consignment);

      // Verify balances
      const senderBalance = await wallet.getBalance(token.contractId);
      const recipientBalance = await recipient.getBalance(token.contractId);

      expect(senderBalance).toBe(900n);
      expect(recipientBalance).toBe(100n);
    });

    it('should fail transfer with insufficient balance', async () => {
      const recipient = await testkit.createWallet();

      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: 2000n  // More than available
      });

      await expect(
        wallet.transfer({
          invoice: invoice.toString()
        })
      ).rejects.toThrow('Insufficient balance');
    });

    it('should handle transfer with exact balance', async () => {
      const recipient = await testkit.createWallet();

      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: 1000n  // Exact balance
      });

      const transfer = await wallet.transfer({
        invoice: invoice.toString()
      });

      await recipient.acceptTransfer(transfer.consignment);

      const senderBalance = await wallet.getBalance(token.contractId);
      const recipientBalance = await recipient.getBalance(token.contractId);

      expect(senderBalance).toBe(0n);
      expect(recipientBalance).toBe(1000n);
    });

    it('should create valid consignment', async () => {
      const recipient = await testkit.createWallet();

      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: 100n
      });

      const transfer = await wallet.transfer({
        invoice: invoice.toString()
      });

      // Validate consignment structure
      expect(transfer.consignment.contractId).toBe(token.contractId);
      expect(transfer.consignment.genesis).toBeDefined();
      expect(transfer.consignment.transitions.length).toBeGreaterThan(0);

      // Validate consignment
      const validation = await testkit.validateConsignment(transfer.consignment);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Amount Conservation', () => {
    it('should conserve amounts in transfers', async () => {
      const token = await testkit.createToken({
        totalSupply: 1000n
      });

      const recipient1 = await testkit.createWallet();
      const recipient2 = await testkit.createWallet();

      // Transfer 1
      const invoice1 = await recipient1.createInvoice({
        contractId: token.contractId,
        amount: 300n
      });

      await wallet.transfer({
        invoice: invoice1.toString()
      });

      // Transfer 2
      const invoice2 = await recipient2.createInvoice({
        contractId: token.contractId,
        amount: 500n
      });

      await wallet.transfer({
        invoice: invoice2.toString()
      });

      // Verify total supply is conserved
      const balance0 = await wallet.getBalance(token.contractId);
      const balance1 = await recipient1.getBalance(token.contractId);
      const balance2 = await recipient2.getBalance(token.contractId);

      expect(balance0 + balance1 + balance2).toBe(1000n);
    });
  });

  describe('UTXO Management', () => {
    it('should track RGB allocations on UTXOs', async () => {
      const token = await testkit.createToken({
        totalSupply: 1000n
      });

      const utxos = await wallet.listUtxos();
      const rgbUtxos = utxos.filter(async (utxo) => {
        const allocations = await wallet.getRgbAllocations(utxo);
        return allocations.length > 0;
      });

      expect(rgbUtxos.length).toBeGreaterThan(0);
    });

    it('should update allocations after transfer', async () => {
      const token = await testkit.createToken({
        totalSupply: 1000n
      });

      const initialUtxos = await wallet.listUtxos();
      const initialRgbUtxos = initialUtxos.filter(async (utxo) => {
        const allocations = await wallet.getRgbAllocations(utxo);
        return allocations.some(a => a.contractId === token.contractId);
      });

      const recipient = await testkit.createWallet();
      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: 500n
      });

      await wallet.transfer({
        invoice: invoice.toString()
      });

      const finalUtxos = await wallet.listUtxos();
      const finalRgbUtxos = finalUtxos.filter(async (utxo) => {
        const allocations = await wallet.getRgbAllocations(utxo);
        return allocations.some(a => a.contractId === token.contractId);
      });

      // UTXOs should have changed
      expect(finalRgbUtxos).not.toEqual(initialRgbUtxos);
    });
  });
});
```

### Testing Validation Logic

```typescript
describe('RGB Validation', () => {
  let testkit: RgbTestkit;

  beforeEach(async () => {
    testkit = await RgbTestkit.create();
  });

  afterEach(async () => {
    await testkit.cleanup();
  });

  describe('Genesis Validation', () => {
    it('should validate correct genesis', async () => {
      const genesis = await testkit.createGenesis({
        schema: 'RGB20',
        ticker: 'TEST',
        totalSupply: 1000n
      });

      const validation = await testkit.validateGenesis(genesis);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid schema', async () => {
      const genesis = await testkit.createGenesis({
        schema: 'INVALID',
        ticker: 'TEST',
        totalSupply: 1000n
      });

      const validation = await testkit.validateGenesis(genesis);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Unknown schema');
    });

    it('should reject mismatched allocation sum', async () => {
      const genesis = await testkit.createGenesis({
        schema: 'RGB20',
        ticker: 'TEST',
        totalSupply: 1000n,
        allocations: [
          { amount: 500n },  // Only 500, not 1000
        ]
      });

      const validation = await testkit.validateGenesis(genesis);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Allocation sum mismatch');
    });
  });

  describe('Transition Validation', () => {
    it('should validate amount conservation', async () => {
      const transition = await testkit.createTransition({
        inputs: [
          { amount: 100n },
          { amount: 200n }
        ],
        outputs: [
          { amount: 300n }
        ]
      });

      const validation = await testkit.validateTransition(transition);
      expect(validation.valid).toBe(true);
    });

    it('should reject amount inflation', async () => {
      const transition = await testkit.createTransition({
        inputs: [
          { amount: 100n }
        ],
        outputs: [
          { amount: 200n }  // More than input!
        ]
      });

      const validation = await testkit.validateTransition(transition);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Amount conservation violated');
    });

    it('should reject seal reuse', async () => {
      const seal = await testkit.createSeal();

      const transition1 = await testkit.createTransition({
        inputs: [{ seal: seal, amount: 100n }],
        outputs: [{ amount: 100n }]
      });

      const transition2 = await testkit.createTransition({
        inputs: [{ seal: seal, amount: 100n }],  // Reusing same seal!
        outputs: [{ amount: 100n }]
      });

      const validation1 = await testkit.validateTransition(transition1);
      expect(validation1.valid).toBe(true);

      const validation2 = await testkit.validateStateSequence([transition1, transition2]);
      expect(validation2.valid).toBe(false);
      expect(validation2.errors).toContain('Seal reuse detected');
    });
  });

  describe('Consignment Validation', () => {
    it('should validate complete transfer flow', async () => {
      const wallet1 = await testkit.createWallet();
      const wallet2 = await testkit.createWallet();

      const token = await testkit.createToken({
        owner: wallet1,
        totalSupply: 1000n
      });

      const invoice = await wallet2.createInvoice({
        contractId: token.contractId,
        amount: 500n
      });

      const transfer = await wallet1.transfer({
        invoice: invoice.toString()
      });

      const validation = await testkit.validateConsignment(transfer.consignment);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject consignment with missing history', async () => {
      const consignment = await testkit.createIncompleteConsignment();

      const validation = await testkit.validateConsignment(consignment);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing transitions in history');
    });

    it('should reject consignment with invalid witness', async () => {
      const consignment = await testkit.createConsignmentWithInvalidWitness();

      const validation = await testkit.validateConsignment(consignment);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid Bitcoin witness');
    });
  });
});
```

### Rust Validation Tests

```rust
#[cfg(test)]
mod validation_tests {
    use rgb_std::validation::*;
    use rgb_std::contract::*;

    #[test]
    fn test_amount_conservation() {
        let mut builder = TransitionBuilder::new();

        builder.add_input(StateInput {
            prev_out: OutPoint::new(Txid::from_slice(&[0; 32]), 0),
            amount: 100
        });

        builder.add_input(StateInput {
            prev_out: OutPoint::new(Txid::from_slice(&[1; 32]), 0),
            amount: 200
        });

        builder.add_output(StateOutput {
            amount: 300,
            seal: Seal::new(Txid::from_slice(&[2; 32]), 0)
        });

        let transition = builder.build();
        let result = validate_amount_conservation(&transition);

        assert!(result.is_ok());
    }

    #[test]
    fn test_amount_inflation_rejected() {
        let mut builder = TransitionBuilder::new();

        builder.add_input(StateInput {
            prev_out: OutPoint::new(Txid::from_slice(&[0; 32]), 0),
            amount: 100
        });

        builder.add_output(StateOutput {
            amount: 200,  // Inflation!
            seal: Seal::new(Txid::from_slice(&[1; 32]), 0)
        });

        let transition = builder.build();
        let result = validate_amount_conservation(&transition);

        assert!(result.is_err());
        assert_eq!(result.unwrap_err().kind(), ValidationErrorKind::AmountInflation);
    }

    #[test]
    fn test_seal_uniqueness() {
        let seal = Seal::new(Txid::from_slice(&[0; 32]), 0);

        let mut validator = StateValidator::new();

        // First use is OK
        assert!(validator.check_seal(&seal).is_ok());

        // Second use should fail
        assert!(validator.check_seal(&seal).is_err());
    }

    #[test]
    fn test_schema_compliance() {
        let schema = Schema::rgb20();
        let genesis = Genesis::builder()
            .with_schema(schema.schema_id())
            .add_global_state("ticker", "TEST")
            .add_global_state("name", "Test Token")
            .add_global_state("precision", 8u8)
            .build();

        let result = validate_schema_compliance(&genesis, &schema);
        assert!(result.is_ok());
    }

    #[test]
    fn test_bitcoin_witness_validation() {
        let transition = create_test_transition();
        let bitcoin_tx = create_test_bitcoin_tx();

        let result = validate_witness(&transition, &bitcoin_tx);
        assert!(result.is_ok());
    }
}
```

## Integration Testing

### Complete End-to-End Transfer Flow

```typescript
describe('E2E Transfer Integration', () => {
  let testkit: RgbTestkit;
  let alice: TestWallet;
  let bob: TestWallet;

  beforeEach(async () => {
    testkit = await RgbTestkit.create({
      network: 'regtest',
      autoMine: true
    });

    // Create two test wallets
    alice = await testkit.createWallet('Alice');
    bob = await testkit.createWallet('Bob');

    // Fund both wallets with Bitcoin
    await testkit.fundWallet(alice, 5);  // 5 BTC
    await testkit.fundWallet(bob, 1);    // 1 BTC
  });

  afterEach(async () => {
    await testkit.cleanup();
  });

  it('should complete full RGB20 transfer flow', async () => {
    // Step 1: Alice creates a token
    console.log('Step 1: Creating token...');
    const token = await alice.createToken({
      ticker: 'ALICE',
      name: 'Alice Token',
      precision: 8,
      totalSupply: 1000000n
    });

    console.log('Token created:', token.contractId);

    // Verify Alice's initial balance
    let aliceBalance = await alice.getBalance(token.contractId);
    expect(aliceBalance).toBe(1000000n);

    // Step 2: Bob creates an invoice
    console.log('Step 2: Bob creating invoice...');
    const invoice = await bob.createInvoice({
      contractId: token.contractId,
      amount: 100000n,
      expiry: Date.now() + 3600000  // 1 hour
    });

    console.log('Invoice created:', invoice.toString());

    // Verify invoice is valid
    expect(invoice.contractId).toBe(token.contractId);
    expect(invoice.amount).toBe(100000n);
    expect(invoice.isExpired()).toBe(false);

    // Step 3: Alice sends transfer
    console.log('Step 3: Alice sending transfer...');
    const transfer = await alice.transfer({
      invoice: invoice.toString(),
      feeRate: 5
    });

    console.log('Transfer created:', transfer.txid);

    // Verify transfer structure
    expect(transfer.txid).toBeDefined();
    expect(transfer.consignment).toBeDefined();
    expect(transfer.fee).toBeGreaterThan(0);

    // Step 4: Validate consignment
    console.log('Step 4: Validating consignment...');
    const validation = await testkit.validateConsignment(transfer.consignment);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Step 5: Bob accepts transfer
    console.log('Step 5: Bob accepting transfer...');
    await bob.acceptTransfer(transfer.consignment);

    // Step 6: Wait for confirmation
    console.log('Step 6: Waiting for confirmation...');
    await testkit.mineBlocks(1);

    // Step 7: Verify final balances
    console.log('Step 7: Verifying balances...');
    aliceBalance = await alice.getBalance(token.contractId);
    const bobBalance = await bob.getBalance(token.contractId);

    expect(aliceBalance).toBe(900000n);
    expect(bobBalance).toBe(100000n);

    // Verify amount conservation
    expect(aliceBalance + bobBalance).toBe(1000000n);

    console.log('Transfer complete!');
    console.log('Alice balance:', aliceBalance);
    console.log('Bob balance:', bobBalance);
  });

  it('should handle multiple sequential transfers', async () => {
    const token = await alice.createToken({
      totalSupply: 1000n
    });

    // Transfer 1: Alice -> Bob (300)
    const invoice1 = await bob.createInvoice({
      contractId: token.contractId,
      amount: 300n
    });

    const transfer1 = await alice.transfer({
      invoice: invoice1.toString()
    });

    await bob.acceptTransfer(transfer1.consignment);
    await testkit.mineBlocks(1);

    // Transfer 2: Alice -> Bob (200)
    const invoice2 = await bob.createInvoice({
      contractId: token.contractId,
      amount: 200n
    });

    const transfer2 = await alice.transfer({
      invoice: invoice2.toString()
    });

    await bob.acceptTransfer(transfer2.consignment);
    await testkit.mineBlocks(1);

    // Transfer 3: Bob -> Alice (100)
    const invoice3 = await alice.createInvoice({
      contractId: token.contractId,
      amount: 100n
    });

    const transfer3 = await bob.transfer({
      invoice: invoice3.toString()
    });

    await alice.acceptTransfer(transfer3.consignment);
    await testkit.mineBlocks(1);

    // Verify final balances
    const aliceBalance = await alice.getBalance(token.contractId);
    const bobBalance = await bob.getBalance(token.contractId);

    expect(aliceBalance).toBe(600n);  // 1000 - 300 - 200 + 100
    expect(bobBalance).toBe(400n);    // 300 + 200 - 100
    expect(aliceBalance + bobBalance).toBe(1000n);
  });

  it('should handle circular transfers (A -> B -> C -> A)', async () => {
    const charlie = await testkit.createWallet('Charlie');
    await testkit.fundWallet(charlie, 1);

    const token = await alice.createToken({
      totalSupply: 1000n
    });

    // Alice -> Bob (500)
    let invoice = await bob.createInvoice({
      contractId: token.contractId,
      amount: 500n
    });

    let transfer = await alice.transfer({ invoice: invoice.toString() });
    await bob.acceptTransfer(transfer.consignment);
    await testkit.mineBlocks(1);

    // Bob -> Charlie (300)
    invoice = await charlie.createInvoice({
      contractId: token.contractId,
      amount: 300n
    });

    transfer = await bob.transfer({ invoice: invoice.toString() });
    await charlie.acceptTransfer(transfer.consignment);
    await testkit.mineBlocks(1);

    // Charlie -> Alice (200)
    invoice = await alice.createInvoice({
      contractId: token.contractId,
      amount: 200n
    });

    transfer = await charlie.transfer({ invoice: invoice.toString() });
    await alice.acceptTransfer(transfer.consignment);
    await testkit.mineBlocks(1);

    // Verify balances
    const aliceBalance = await alice.getBalance(token.contractId);
    const bobBalance = await bob.getBalance(token.contractId);
    const charlieBalance = await charlie.getBalance(token.contractId);

    expect(aliceBalance).toBe(700n);    // 1000 - 500 + 200
    expect(bobBalance).toBe(200n);      // 500 - 300
    expect(charlieBalance).toBe(100n);  // 300 - 200

    // Total conservation
    expect(aliceBalance + bobBalance + charlieBalance).toBe(1000n);
  });

  it('should handle batch transfers', async () => {
    const token = await alice.createToken({
      totalSupply: 10000n
    });

    // Create multiple recipients
    const recipients = await Promise.all([
      testkit.createWallet('Recipient1'),
      testkit.createWallet('Recipient2'),
      testkit.createWallet('Recipient3')
    ]);

    // Fund recipients
    for (const recipient of recipients) {
      await testkit.fundWallet(recipient, 0.1);
    }

    // Create invoices
    const invoices = await Promise.all(
      recipients.map(r => r.createInvoice({
        contractId: token.contractId,
        amount: 1000n
      }))
    );

    // Send batch transfer
    const transfers = await alice.batchTransfer(
      invoices.map(inv => ({
        invoice: inv.toString(),
        feeRate: 5
      }))
    );

    expect(transfers).toHaveLength(3);

    // Accept all transfers
    for (let i = 0; i < recipients.length; i++) {
      await recipients[i].acceptTransfer(transfers[i].consignment);
    }

    await testkit.mineBlocks(1);

    // Verify balances
    for (const recipient of recipients) {
      const balance = await recipient.getBalance(token.contractId);
      expect(balance).toBe(1000n);
    }

    const aliceBalance = await alice.getBalance(token.contractId);
    expect(aliceBalance).toBe(7000n);  // 10000 - 3000
  });
});
```

### Cross-Schema Integration Tests

```typescript
describe('Multi-Schema Integration', () => {
  let testkit: RgbTestkit;
  let wallet: TestWallet;

  beforeEach(async () => {
    testkit = await RgbTestkit.create();
    wallet = await testkit.createWallet();
    await testkit.fundWallet(wallet, 10);
  });

  afterEach(async () => {
    await testkit.cleanup();
  });

  it('should handle RGB20 and RGB21 in same wallet', async () => {
    // Create RGB20 token
    const fungible = await wallet.createToken({
      ticker: 'FT',
      totalSupply: 1000n
    });

    // Create RGB21 NFT collection
    const nft = await wallet.createNftCollection({
      name: 'NFT Collection'
    });

    // Mint NFT
    const tokenId = await nft.mint({
      metadata: {
        name: 'NFT #1',
        description: 'First NFT'
      }
    });

    // Verify both assets in wallet
    const assets = await wallet.listAssets();
    expect(assets).toHaveLength(2);

    const ftAsset = assets.find(a => a.schema === 'RGB20');
    const nftAsset = assets.find(a => a.schema === 'RGB21');

    expect(ftAsset).toBeDefined();
    expect(nftAsset).toBeDefined();

    expect(ftAsset!.balance).toBe(1000n);
    expect(nftAsset!.balance).toBe(1n);
  });

  it('should transfer different asset types simultaneously', async () => {
    const recipient = await testkit.createWallet();
    await testkit.fundWallet(recipient, 1);

    // Create both asset types
    const ft = await wallet.createToken({
      ticker: 'FT',
      totalSupply: 1000n
    });

    const nft = await wallet.createNftCollection({
      name: 'NFT'
    });

    const tokenId = await nft.mint({
      metadata: { name: 'Token #1' }
    });

    // Create invoices
    const ftInvoice = await recipient.createInvoice({
      contractId: ft.contractId,
      amount: 500n
    });

    const nftInvoice = await recipient.createInvoice({
      contractId: nft.contractId,
      amount: 1n  // NFT
    });

    // Send both transfers
    const ftTransfer = await wallet.transfer({
      invoice: ftInvoice.toString()
    });

    const nftTransfer = await wallet.transfer({
      invoice: nftInvoice.toString()
    });

    // Accept both
    await recipient.acceptTransfer(ftTransfer.consignment);
    await recipient.acceptTransfer(nftTransfer.consignment);

    await testkit.mineBlocks(1);

    // Verify balances
    const ftBalance = await recipient.getBalance(ft.contractId);
    const nftBalance = await recipient.getBalance(nft.contractId);

    expect(ftBalance).toBe(500n);
    expect(nftBalance).toBe(1n);
  });
});
```

### Network Condition Simulation

```typescript
describe('Network Condition Testing', () => {
  let testkit: RgbTestkit;

  beforeEach(async () => {
    testkit = await RgbTestkit.create();
  });

  afterEach(async () => {
    await testkit.cleanup();
  });

  it('should handle block reorganization', async () => {
    const alice = await testkit.createWallet();
    const bob = await testkit.createWallet();

    await testkit.fundWallet(alice, 5);
    await testkit.fundWallet(bob, 1);

    const token = await alice.createToken({
      totalSupply: 1000n
    });

    // Create and send transfer
    const invoice = await bob.createInvoice({
      contractId: token.contractId,
      amount: 500n
    });

    const transfer = await alice.transfer({
      invoice: invoice.toString()
    });

    await bob.acceptTransfer(transfer.consignment);

    // Mine 3 blocks
    await testkit.mineBlocks(3);

    // Verify transfer is confirmed
    let bobBalance = await bob.getBalance(token.contractId);
    expect(bobBalance).toBe(500n);

    // Simulate reorg (invalidate last 2 blocks)
    await testkit.invalidateBlock(2);

    // Balance should still be correct after reorg
    bobBalance = await bob.getBalance(token.contractId);
    expect(bobBalance).toBe(500n);
  });

  it('should handle mempool conflicts', async () => {
    const alice = await testkit.createWallet();
    const bob = await testkit.createWallet();

    await testkit.fundWallet(alice, 5);

    const token = await alice.createToken({
      totalSupply: 1000n
    });

    // Create two conflicting transfers (double-spend attempt)
    const invoice1 = await bob.createInvoice({
      contractId: token.contractId,
      amount: 600n
    });

    const invoice2 = await bob.createInvoice({
      contractId: token.contractId,
      amount: 700n
    });

    const transfer1 = await alice.transfer({
      invoice: invoice1.toString(),
      broadcast: false  // Don't auto-broadcast
    });

    const transfer2 = await alice.transfer({
      invoice: invoice2.toString(),
      broadcast: false
    });

    // Broadcast first transfer
    await testkit.broadcastTransaction(transfer1.bitcoinTx);

    // Try to broadcast second (should fail or be rejected)
    await expect(
      testkit.broadcastTransaction(transfer2.bitcoinTx)
    ).rejects.toThrow();

    await testkit.mineBlocks(1);

    // Only first transfer should be confirmed
    const bobBalance = await bob.getBalance(token.contractId);
    expect(bobBalance).toBe(600n);
  });

  it('should handle high fee environment', async () => {
    const alice = await testkit.createWallet();
    const bob = await testkit.createWallet();

    await testkit.fundWallet(alice, 5);

    const token = await alice.createToken({
      totalSupply: 1000n
    });

    const invoice = await bob.createInvoice({
      contractId: token.contractId,
      amount: 500n
    });

    // Try with different fee rates
    const lowFeeTransfer = await alice.transfer({
      invoice: invoice.toString(),
      feeRate: 1,
      broadcast: false
    });

    const highFeeTransfer = await alice.transfer({
      invoice: invoice.toString(),
      feeRate: 100,
      broadcast: false
    });

    expect(highFeeTransfer.fee).toBeGreaterThan(lowFeeTransfer.fee);

    // High fee should confirm faster in congested mempool
    await testkit.simulateMempoolCongestion();

    await testkit.broadcastTransaction(highFeeTransfer.bitcoinTx);
    await testkit.mineBlocks(1);

    // Verify high fee transfer confirmed
    const bobBalance = await bob.getBalance(token.contractId);
    expect(bobBalance).toBe(500n);
  });
});
```

## Test Utilities

### Mocking

```typescript
import { MockRgbNode } from '@rgbjs/testing';

const mockNode = new MockRgbNode({
  contracts: [mockContract],
  utxos: [mockUtxo]
});

const wallet = new RgbWallet({
  node: mockNode
});
```

*Mocking to be expanded*

### Fixtures

```typescript
// Test fixtures
export const testContract = {
  contractId: 'rgb:test123...',
  ticker: 'TEST',
  totalSupply: 1000000n
};

export const testUtxo = {
  txid: 'abc123...',
  vout: 0,
  amount: 10000n
};
```

*Fixtures to be expanded*

## Performance Testing

### Load Testing

```typescript
describe('Performance', () => {
  it('should handle 1000 transfers', async () => {
    const kit = new RgbTestkit();
    const wallet = await kit.createWallet();

    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      await wallet.transfer({
        amount: 1n,
        recipient: kit.randomInvoice()
      });
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(60000); // 1 minute
  });
});
```

*Performance testing to be expanded*

## Security Testing

### Vulnerability Checks

```rust
#[test]
fn test_overflow_protection() {
    let max = u64::MAX;
    let result = safe_add(max, 1);
    assert!(result.is_err());
}

#[test]
fn test_amount_conservation() {
    let inputs = vec![100, 200];
    let outputs = vec![150, 151];
    assert!(validate_amounts(inputs, outputs).is_err());
}
```

*Security testing to be expanded*

## Continuous Integration

### GitHub Actions

```yaml
name: RGB Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Bitcoin
        run: |
          # Install bitcoind
          # Start regtest

      - name: Setup RGB
        run: |
          cargo install rgb-node
          rgbd --network regtest &

      - name: Run Tests
        run: |
          npm test
```

*CI setup to be expanded*

## Test Coverage

```bash
# Rust coverage
cargo tarpaulin --out Html

# TypeScript coverage
npm run test:coverage
```

*Coverage reporting to be expanded*

## Best Practices

### Test Organization

- Separate unit, integration, and e2e tests
- Use descriptive test names
- Test edge cases
- Mock external dependencies

*Best practices to be expanded*

### Cleanup

```typescript
afterEach(async () => {
  await testkit.cleanup();
  await stopBitcoind();
});
```

*Cleanup patterns to be expanded*

## Related Documentation

- [Rust SDK](./rust-sdk.md)
- [RGB.js SDK](./rgbjs.md)
- [Wallet Integration](./wallet-integration.md)
