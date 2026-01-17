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

## Test Utilities and Mocking

### Mock RGB Node

```typescript
import { MockRgbNode, MockBitcoinNode } from '@rgbjs/testing';

class MockedTestEnvironment {
  private mockRgbNode: MockRgbNode;
  private mockBitcoinNode: MockBitcoinNode;

  constructor() {
    // Create mock Bitcoin node
    this.mockBitcoinNode = new MockBitcoinNode({
      network: 'regtest',
      blockHeight: 100,
      feeRate: 5
    });

    // Create mock RGB node
    this.mockRgbNode = new MockRgbNode({
      bitcoinNode: this.mockBitcoinNode,
      contracts: [],
      autoValidate: true
    });
  }

  // Mock contract creation
  async createMockContract(params: any): Promise<MockContract> {
    const contract = new MockContract({
      contractId: generateMockContractId(),
      schema: params.schema || 'RGB20',
      ticker: params.ticker,
      totalSupply: params.totalSupply,
      genesis: this.createMockGenesis(params)
    });

    this.mockRgbNode.addContract(contract);

    return contract;
  }

  // Mock transfer
  async createMockTransfer(params: {
    from: string;
    to: string;
    amount: bigint;
  }): Promise<MockTransfer> {
    const transfer = new MockTransfer({
      txid: generateMockTxid(),
      amount: params.amount,
      confirmations: 0,
      valid: true
    });

    // Add to mock mempool
    this.mockBitcoinNode.addToMempool(transfer);

    return transfer;
  }

  // Simulate block mining
  async mineBlocks(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const block = this.mockBitcoinNode.mineBlock();

      // Update confirmations for all transactions
      this.mockBitcoinNode.updateConfirmations();
    }
  }

  // Inject errors for testing error handling
  injectError(type: 'validation' | 'network' | 'consensus', error: Error): void {
    this.mockRgbNode.setNextError(type, error);
  }

  private createMockGenesis(params: any): MockGenesis {
    return {
      schemaId: params.schema,
      globalState: {
        ticker: params.ticker,
        name: params.name || params.ticker,
        precision: params.precision || 8,
        totalSupply: params.totalSupply
      },
      allocations: params.allocations || []
    };
  }
}

// Usage in tests
describe('Mocked RGB Tests', () => {
  let env: MockedTestEnvironment;

  beforeEach(() => {
    env = new MockedTestEnvironment();
  });

  it('should handle contract creation without real blockchain', async () => {
    const contract = await env.createMockContract({
      ticker: 'MOCK',
      totalSupply: 1000n
    });

    expect(contract.contractId).toBeDefined();
    expect(contract.ticker).toBe('MOCK');
  });

  it('should simulate network errors', async () => {
    const contract = await env.createMockContract({
      ticker: 'TEST',
      totalSupply: 1000n
    });

    // Inject network error
    env.injectError('network', new Error('Connection timeout'));

    await expect(
      env.createMockTransfer({
        from: 'alice',
        to: 'bob',
        amount: 100n
      })
    ).rejects.toThrow('Connection timeout');
  });
});
```

### Test Fixtures

```typescript
// fixtures/contracts.ts
export const testContracts = {
  rgb20Basic: {
    contractId: 'rgb:qz3k5l2m...',
    ticker: 'TEST',
    name: 'Test Token',
    precision: 8,
    totalSupply: 1000000n,
    schema: 'RGB20'
  },

  rgb20WithMetadata: {
    contractId: 'rgb:7x9p4n8q...',
    ticker: 'META',
    name: 'Metadata Token',
    precision: 8,
    totalSupply: 500000n,
    metadata: {
      website: 'https://example.com',
      description: 'A token with rich metadata'
    }
  },

  rgb21NFT: {
    contractId: 'rgb:5r2m8k9l...',
    name: 'Test NFT Collection',
    schema: 'RGB21',
    totalSupply: 100n
  }
};

// fixtures/utxos.ts
export const testUtxos = {
  funded: {
    txid: 'abc123def456...',
    vout: 0,
    amount: 100000,
    script: Buffer.from('76a914...', 'hex'),
    confirmed: true,
    confirmations: 6
  },

  unconfirmed: {
    txid: 'xyz789uvw012...',
    vout: 1,
    amount: 50000,
    script: Buffer.from('76a914...', 'hex'),
    confirmed: false,
    confirmations: 0
  }
};

// fixtures/invoices.ts
export const testInvoices = {
  valid: 'rgb:qz3k5l2m.../100000/...',
  expired: 'rgb:qz3k5l2m.../100000/expired...',
  invalidFormat: 'invalid-invoice-string',
  zeroAmount: 'rgb:qz3k5l2m.../0/...'
};

// fixtures/consignments.ts
export const testConsignments = {
  valid: Buffer.from('...', 'base64'),
  invalidSignature: Buffer.from('...', 'base64'),
  missingHistory: Buffer.from('...', 'base64')
};

// Test fixture loader
class FixtureLoader {
  static loadContract(name: keyof typeof testContracts) {
    return testContracts[name];
  }

  static loadUtxo(name: keyof typeof testUtxos) {
    return testUtxos[name];
  }

  static loadInvoice(name: keyof typeof testInvoices) {
    return testInvoices[name];
  }

  static async createTestWalletWithFixtures(testkit: RgbTestkit) {
    const wallet = await testkit.createWallet();

    // Fund with test UTXOs
    await testkit.fundWallet(wallet, 10);

    // Create test contracts
    for (const contract of Object.values(testContracts).filter(c => c.schema === 'RGB20')) {
      await wallet.importContract(contract);
    }

    return wallet;
  }
}
```

### Property-Based Testing

```typescript
import fc from 'fast-check';

describe('Property-Based RGB Tests', () => {
  it('amount conservation holds for any valid transfer', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random amounts
        fc.bigUintN(64),  // total supply
        fc.array(fc.bigUintN(64), { minLength: 1, maxLength: 10 }),  // transfer amounts

        async (totalSupply, transferAmounts) => {
          // Ensure transfers don't exceed total supply
          const total = transferAmounts.reduce((sum, amount) => sum + amount, 0n);
          fc.pre(total <= totalSupply);

          const testkit = await RgbTestkit.create();
          const wallet = await testkit.createWallet();

          await testkit.fundWallet(wallet, 5);

          const token = await wallet.createToken({
            ticker: 'PROP',
            totalSupply: totalSupply
          });

          let remaining = totalSupply;

          for (const amount of transferAmounts) {
            if (amount === 0n || amount > remaining) continue;

            const recipient = await testkit.createWallet();
            await testkit.fundWallet(recipient, 0.1);

            const invoice = await recipient.createInvoice({
              contractId: token.contractId,
              amount: amount
            });

            const transfer = await wallet.transfer({
              invoice: invoice.toString()
            });

            await recipient.acceptTransfer(transfer.consignment);
            await testkit.mineBlocks(1);

            remaining -= amount;
          }

          // Verify total supply is conserved
          const finalBalance = await wallet.getBalance(token.contractId);

          // Total supply = remaining in original wallet + sum of all transfers
          expect(finalBalance).toBe(remaining);

          await testkit.cleanup();
        }
      ),
      { numRuns: 20 }  // Run 20 random test cases
    );
  });

  it('invoice parsing is bijective (parse . toString = id)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }),  // contract ID
        fc.bigUintN(64),  // amount
        fc.date(),  // expiry

        (contractId, amount, expiry) => {
          const invoice = new Invoice({
            contractId: contractId,
            amount: amount,
            beneficiary: 'blinded-utxo',
            expiry: expiry.getTime()
          });

          const str = invoice.toString();
          const parsed = Invoice.fromString(str);

          return (
            parsed.contractId === invoice.contractId &&
            parsed.amount === invoice.amount &&
            parsed.expiry === invoice.expiry
          );
        }
      )
    );
  });
});
```

### Fuzzing for Validation

```typescript
import { Fuzzer } from '@rgbjs/fuzzer';

describe('Fuzz Testing', () => {
  it('should reject all invalid genesis structures', async () => {
    const fuzzer = new Fuzzer();

    for (let i = 0; i < 1000; i++) {
      // Generate random (likely invalid) genesis
      const fuzzedGenesis = fuzzer.generateGenesis({
        mutationRate: 0.8  // 80% chance to mutate each field
      });

      try {
        const validation = await validateGenesis(fuzzedGenesis);

        // If it passes validation, it must be structurally valid
        if (validation.valid) {
          expect(fuzzedGenesis).toMatchSchema(RGB20Schema);
        }
      } catch (error) {
        // Invalid structures should throw or fail validation
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle malformed consignments gracefully', async () => {
    const fuzzer = new Fuzzer();

    for (let i = 0; i < 500; i++) {
      const fuzzedConsignment = fuzzer.generateConsignment({
        corruptionRate: 0.5
      });

      // Should not crash, even with malformed input
      await expect(async () => {
        try {
          await validateConsignment(fuzzedConsignment);
        } catch (error) {
          // Errors are OK, crashes are not
          expect(error).toBeInstanceOf(Error);
        }
      }).not.toThrow('Segmentation fault');
    }
  });
});
```

## Performance Testing

### Load and Stress Testing

```typescript
import { performance } from 'perf_hooks';

describe('RGB Performance Tests', () => {
  let testkit: RgbTestkit;

  beforeAll(async () => {
    testkit = await RgbTestkit.create({
      network: 'regtest',
      autoMine: true
    });
  });

  afterAll(async () => {
    await testkit.cleanup();
  });

  it('should handle 1000 sequential transfers', async () => {
    const sender = await testkit.createWallet();
    const receiver = await testkit.createWallet();

    await testkit.fundWallet(sender, 100);  // Plenty of Bitcoin for fees
    await testkit.fundWallet(receiver, 10);

    const token = await sender.createToken({
      ticker: 'PERF',
      totalSupply: 1000000n
    });

    const startTime = performance.now();
    const transferCount = 1000;
    const amountPerTransfer = 100n;

    for (let i = 0; i < transferCount; i++) {
      const invoice = await receiver.createInvoice({
        contractId: token.contractId,
        amount: amountPerTransfer
      });

      const transfer = await sender.transfer({
        invoice: invoice.toString(),
        feeRate: 1
      });

      await receiver.acceptTransfer(transfer.consignment);

      // Mine every 10 transfers
      if (i % 10 === 0) {
        await testkit.mineBlocks(1);
      }
    }

    const duration = performance.now() - startTime;
    const avgTimePerTransfer = duration / transferCount;

    console.log(`Total time: ${duration}ms`);
    console.log(`Avg per transfer: ${avgTimePerTransfer}ms`);

    expect(duration).toBeLessThan(120000);  // 2 minutes total
    expect(avgTimePerTransfer).toBeLessThan(120);  // 120ms per transfer

    // Verify final balances
    const senderBalance = await sender.getBalance(token.contractId);
    const receiverBalance = await receiver.getBalance(token.contractId);

    expect(senderBalance).toBe(1000000n - (BigInt(transferCount) * amountPerTransfer));
    expect(receiverBalance).toBe(BigInt(transferCount) * amountPerTransfer);
  });

  it('should handle concurrent transfers efficiently', async () => {
    const sender = await testkit.createWallet();
    await testkit.fundWallet(sender, 100);

    const token = await sender.createToken({
      ticker: 'CONC',
      totalSupply: 100000n
    });

    // Create 10 recipients
    const recipients = await Promise.all(
      Array(10).fill(0).map(async () => {
        const w = await testkit.createWallet();
        await testkit.fundWallet(w, 1);
        return w;
      })
    );

    const startTime = performance.now();

    // Create all invoices concurrently
    const invoices = await Promise.all(
      recipients.map(r => r.createInvoice({
        contractId: token.contractId,
        amount: 1000n
      }))
    );

    // Send all transfers concurrently
    const transfers = await Promise.all(
      invoices.map(invoice => sender.transfer({
        invoice: invoice.toString(),
        feeRate: 5
      }))
    );

    // Accept all transfers concurrently
    await Promise.all(
      transfers.map((transfer, i) =>
        recipients[i].acceptTransfer(transfer.consignment)
      )
    );

    const duration = performance.now() - startTime;

    console.log(`Concurrent transfers time: ${duration}ms`);

    expect(duration).toBeLessThan(10000);  // 10 seconds

    // Verify all balances
    for (const recipient of recipients) {
      const balance = await recipient.getBalance(token.contractId);
      expect(balance).toBe(1000n);
    }
  });

  it('should measure consignment validation performance', async () => {
    const sender = await testkit.createWallet();
    const receiver = await testkit.createWallet();

    await testkit.fundWallet(sender, 10);
    await testkit.fundWallet(receiver, 1);

    const token = await sender.createToken({
      totalSupply: 100000n
    });

    // Create a chain of transfers
    let currentOwner = sender;
    const chainLength = 50;

    for (let i = 0; i < chainLength; i++) {
      const nextOwner = await testkit.createWallet();
      await testkit.fundWallet(nextOwner, 0.1);

      const invoice = await nextOwner.createInvoice({
        contractId: token.contractId,
        amount: 1000n
      });

      const transfer = await currentOwner.transfer({
        invoice: invoice.toString()
      });

      await nextOwner.acceptTransfer(transfer.consignment);
      await testkit.mineBlocks(1);

      currentOwner = nextOwner;
    }

    // Now measure validation time for final consignment
    const invoice = await receiver.createInvoice({
      contractId: token.contractId,
      amount: 500n
    });

    const transfer = await currentOwner.transfer({
      invoice: invoice.toString()
    });

    const startValidation = performance.now();
    const validation = await testkit.validateConsignment(transfer.consignment);
    const validationTime = performance.now() - startValidation;

    console.log(`Validation time for ${chainLength}-deep history: ${validationTime}ms`);

    expect(validation.valid).toBe(true);
    expect(validationTime).toBeLessThan(5000);  // 5 seconds even for long chain
  });

  it('should benchmark UTXO selection performance', async () => {
    const wallet = await testkit.createWallet();
    await testkit.fundWallet(wallet, 100);

    const token = await wallet.createToken({
      totalSupply: 1000000n
    });

    // Create many small allocations
    for (let i = 0; i < 100; i++) {
      const recipient = await testkit.createWallet();
      await testkit.fundWallet(recipient, 0.1);

      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: 100n
      });

      await wallet.transfer({
        invoice: invoice.toString()
      });

      // Send back to create many UTXOs
      const returnInvoice = await wallet.createInvoice({
        contractId: token.contractId,
        amount: 50n
      });

      await recipient.transfer({
        invoice: returnInvoice.toString()
      });
    }

    await testkit.mineBlocks(1);

    // Now benchmark UTXO selection
    const recipient = await testkit.createWallet();
    const invoice = await recipient.createInvoice({
      contractId: token.contractId,
      amount: 5000n
    });

    const startSelection = performance.now();
    const transfer = await wallet.transfer({
      invoice: invoice.toString()
    });
    const selectionTime = performance.now() - startSelection;

    console.log(`UTXO selection time with 100+ UTXOs: ${selectionTime}ms`);

    expect(selectionTime).toBeLessThan(1000);  // 1 second
  });
});
```

### Memory Profiling

```typescript
describe('Memory Usage Tests', () => {
  it('should not leak memory during repeated operations', async () => {
    const testkit = await RgbTestkit.create();
    const wallet = await testkit.createWallet();
    await testkit.fundWallet(wallet, 10);

    const token = await wallet.createToken({
      totalSupply: 100000n
    });

    // Measure initial memory
    if (global.gc) global.gc();
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform many operations
    for (let i = 0; i < 100; i++) {
      const recipient = await testkit.createWallet();
      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: 100n
      });

      await wallet.transfer({
        invoice: invoice.toString()
      });

      // Force garbage collection
      if (global.gc && i % 10 === 0) global.gc();
    }

    // Measure final memory
    if (global.gc) global.gc();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const finalMemory = process.memoryUsage().heapUsed;

    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;  // MB

    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    // Memory should not grow excessively
    expect(memoryIncrease).toBeLessThan(100);  // Less than 100MB growth

    await testkit.cleanup();
  });
});
```

## Security Testing

### Vulnerability and Attack Testing

```typescript
describe('Security Tests', () => {
  let testkit: RgbTestkit;

  beforeEach(async () => {
    testkit = await RgbTestkit.create();
  });

  afterEach(async () => {
    await testkit.cleanup();
  });

  describe('Amount Overflow Protection', () => {
    it('should prevent integer overflow in token supply', async () => {
      const wallet = await testkit.createWallet();

      await expect(
        wallet.createToken({
          ticker: 'OVER',
          totalSupply: BigInt('0xFFFFFFFFFFFFFFFF') + 1n  // u64::MAX + 1
        })
      ).rejects.toThrow('Integer overflow');
    });

    it('should prevent overflow in transfers', async () => {
      const wallet = await testkit.createWallet();
      await testkit.fundWallet(wallet, 10);

      const token = await wallet.createToken({
        totalSupply: 1000n
      });

      const recipient = await testkit.createWallet();
      const invoice = await recipient.createInvoice({
        contractId: token.contractId,
        amount: BigInt('0xFFFFFFFFFFFFFFFF')  // Huge amount
      });

      await expect(
        wallet.transfer({
          invoice: invoice.toString()
        })
      ).rejects.toThrow();
    });
  });

  describe('Double-Spend Protection', () => {
    it('should prevent RGB double-spend', async () => {
      const alice = await testkit.createWallet();
      const bob1 = await testkit.createWallet();
      const bob2 = await testkit.createWallet();

      await testkit.fundWallet(alice, 10);

      const token = await alice.createToken({
        totalSupply: 1000n
      });

      // Create two invoices for same amount
      const invoice1 = await bob1.createInvoice({
        contractId: token.contractId,
        amount: 800n
      });

      const invoice2 = await bob2.createInvoice({
        contractId: token.contractId,
        amount: 800n
      });

      // First transfer should succeed
      const transfer1 = await alice.transfer({
        invoice: invoice1.toString()
      });

      await bob1.acceptTransfer(transfer1.consignment);
      await testkit.mineBlocks(1);

      // Second transfer should fail (insufficient balance)
      await expect(
        alice.transfer({
          invoice: invoice2.toString()
        })
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Seal Reuse Detection', () => {
    it('should reject transitions reusing seals', async () => {
      const seal = await testkit.createSeal();

      const transition1 = await testkit.createTransition({
        inputs: [{ seal: seal, amount: 100n }],
        outputs: [{ amount: 100n }]
      });

      const transition2 = await testkit.createTransition({
        inputs: [{ seal: seal, amount: 100n }],  // Same seal!
        outputs: [{ amount: 100n }]
      });

      const validation = await testkit.validateStateSequence([
        transition1,
        transition2
      ]);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({ type: 'SealReuse' })
      );
    });
  });

  describe('Consignment Tampering Detection', () => {
    it('should detect modified consignments', async () => {
      const alice = await testkit.createWallet();
      const bob = await testkit.createWallet();

      await testkit.fundWallet(alice, 10);

      const token = await alice.createToken({
        totalSupply: 1000n
      });

      const invoice = await bob.createInvoice({
        contractId: token.contractId,
        amount: 100n
      });

      const transfer = await alice.transfer({
        invoice: invoice.toString()
      });

      // Tamper with consignment
      const tamperedConsignment = testkit.tamperConsignment(
        transfer.consignment,
        { modifyAmount: true }
      );

      // Validation should fail
      const validation = await testkit.validateConsignment(tamperedConsignment);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Replay Attack Protection', () => {
    it('should prevent consignment replay', async () => {
      const alice = await testkit.createWallet();
      const bob = await testkit.createWallet();

      await testkit.fundWallet(alice, 10);

      const token = await alice.createToken({
        totalSupply: 1000n
      });

      const invoice = await bob.createInvoice({
        contractId: token.contractId,
        amount: 100n
      });

      const transfer = await alice.transfer({
        invoice: invoice.toString()
      });

      // Accept once
      await bob.acceptTransfer(transfer.consignment);
      await testkit.mineBlocks(1);

      // Try to accept again (replay)
      await expect(
        bob.acceptTransfer(transfer.consignment)
      ).rejects.toThrow('Consignment already processed');
    });
  });
});
```

### Rust Security Tests

```rust
#[cfg(test)]
mod security_tests {
    use super::*;

    #[test]
    fn test_overflow_protection() {
        let max = Amount::MAX;
        let result = max.checked_add(Amount::from(1));
        assert!(result.is_none());
    }

    #[test]
    fn test_underflow_protection() {
        let zero = Amount::ZERO;
        let result = zero.checked_sub(Amount::from(1));
        assert!(result.is_none());
    }

    #[test]
    fn test_amount_conservation_strict() {
        let inputs = vec![Amount::from(100), Amount::from(200)];
        let outputs = vec![Amount::from(150), Amount::from(151)];

        let result = validate_amount_conservation(&inputs, &outputs);
        assert!(result.is_err());

        match result.unwrap_err() {
            ValidationError::AmountMismatch { input_sum, output_sum } => {
                assert_eq!(input_sum, Amount::from(300));
                assert_eq!(output_sum, Amount::from(301));
            }
            _ => panic!("Wrong error type"),
        }
    }

    #[test]
    fn test_seal_uniqueness() {
        let mut used_seals = HashSet::new();
        let seal = Seal::new(Txid::from_slice(&[0; 32]), 0);

        assert!(used_seals.insert(seal.clone()));
        assert!(!used_seals.insert(seal.clone()));  // Second insert fails
    }

    #[test]
    fn test_schema_validation_strict() {
        let schema = Schema::rgb20();

        // Missing required field
        let mut genesis = Genesis::builder()
            .with_schema(schema.schema_id())
            .add_global_state("ticker", "TEST")
            // Missing "name" and "precision"
            .build();

        let result = validate_schema_compliance(&genesis, &schema);
        assert!(result.is_err());
    }
}
```

## Continuous Integration & Deployment

### Complete GitHub Actions Workflow

```yaml
# .github/workflows/rgb-tests.yml
name: RGB Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  BITCOIN_VERSION: '25.0'
  RUST_VERSION: '1.75.0'
  NODE_VERSION: '20.x'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier
        run: npm run format:check

      - name: TypeScript check
        run: npm run type-check

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/unit/lcov.info
          flags: unit

  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest

    services:
      bitcoind:
        image: ruimarinho/bitcoin-core:${{ env.BITCOIN_VERSION }}
        ports:
          - 18443:18443
        options: >-
          --health-cmd "bitcoin-cli -regtest getblockchaininfo"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: ${{ env.RUST_VERSION }}
          override: true

      - name: Cache Rust dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Install dependencies
        run: npm ci

      - name: Wait for Bitcoin
        run: |
          timeout 60 sh -c 'until bitcoin-cli -regtest -rpcuser=test -rpcpassword=test getblockchaininfo 2>/dev/null; do sleep 1; done'

      - name: Setup Bitcoin wallet
        run: |
          bitcoin-cli -regtest -rpcuser=test -rpcpassword=test createwallet "test"
          bitcoin-cli -regtest -rpcuser=test -rpcpassword=test generatetoaddress 101 $(bitcoin-cli -regtest -rpcuser=test -rpcpassword=test getnewaddress)

      - name: Run integration tests
        run: npm run test:integration
        env:
          BITCOIN_RPC_URL: http://localhost:18443
          BITCOIN_RPC_USER: test
          BITCOIN_RPC_PASSWORD: test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/integration/lcov.info
          flags: integration

  test-e2e:
    name: End-to-End Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 10

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Collect logs on failure
        if: failure()
        run: |
          docker-compose -f docker-compose.test.yml logs > test-logs.txt

      - name: Upload logs
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-logs
          path: test-logs.txt

      - name: Cleanup
        if: always()
        run: docker-compose -f docker-compose.test.yml down -v

  test-rust:
    name: Rust Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: ${{ env.RUST_VERSION }}
          override: true
          components: rustfmt, clippy

      - name: Cache Rust dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Run Clippy
        uses: actions-rs/cargo@v1
        with:
          command: clippy
          args: --all-targets --all-features -- -D warnings

      - name: Run tests
        uses: actions-rs/cargo@v1
        with:
          command: test
          args: --all-features --no-fail-fast

      - name: Generate coverage
        uses: actions-rs/tarpaulin@v0.1
        with:
          args: '--out Xml --all-features'

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./cobertura.xml
          flags: rust

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: npm audit
        run: npm audit --audit-level=moderate

      - name: Rust audit
        uses: actions-rs/audit-check@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test-unit, test-integration]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

### GitLab CI/CD Pipeline

```yaml
# .gitlab-ci.yml
image: node:20

stages:
  - setup
  - test
  - build
  - deploy

variables:
  BITCOIN_VERSION: '25.0'
  DOCKER_DRIVER: overlay2

cache:
  paths:
    - node_modules/
    - .npm/

setup:
  stage: setup
  script:
    - npm ci
  artifacts:
    paths:
      - node_modules/

lint:
  stage: test
  needs: [setup]
  script:
    - npm run lint
    - npm run format:check
    - npm run type-check

test:unit:
  stage: test
  needs: [setup]
  script:
    - npm run test:unit
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/unit/cobertura-coverage.xml

test:integration:
  stage: test
  needs: [setup]
  services:
    - name: ruimarinho/bitcoin-core:${BITCOIN_VERSION}
      alias: bitcoind
  variables:
    BITCOIN_RPC_URL: http://bitcoind:18443
    BITCOIN_RPC_USER: test
    BITCOIN_RPC_PASSWORD: test
  before_script:
    - apt-get update && apt-get install -y curl
    - |
      timeout 60 sh -c '
        until curl -u test:test --data-binary "{\"jsonrpc\":\"1.0\",\"id\":\"test\",\"method\":\"getblockchaininfo\",\"params\":[]}" -H "content-type: text/plain;" http://bitcoind:18443/ 2>/dev/null; do
          sleep 1
        done
      '
  script:
    - npm run test:integration

build:
  stage: build
  needs: [lint, test:unit, test:integration]
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
```

## Test Coverage Reporting

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.{ts,tsx}'
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/core/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'cobertura'
  ],

  coverageDirectory: 'coverage'
};
```

### Generating Coverage Reports

```bash
# Generate coverage for TypeScript/JavaScript
npm run test:coverage

# View HTML report
open coverage/index.html

# Generate coverage for Rust
cargo tarpaulin --out Html --out Xml --all-features

# View Rust HTML report
open tarpaulin-report.html

# Combined coverage script
#!/bin/bash
# scripts/coverage.sh

echo "Running TypeScript coverage..."
npm run test:coverage

echo "Running Rust coverage..."
cd rust && cargo tarpaulin --out Xml --all-features && cd ..

echo "Uploading to Codecov..."
bash <(curl -s https://codecov.io/bash)

echo "Coverage reports generated!"
```

## Debugging Techniques

### Debug Logging

```typescript
import debug from 'debug';

const log = debug('rgb:tests');
const logWallet = debug('rgb:tests:wallet');
const logTransfer = debug('rgb:tests:transfer');

describe('Debug Logging Example', () => {
  it('should debug transfer flow', async () => {
    log('Starting test');

    const testkit = await RgbTestkit.create();
    logWallet('Testkit created');

    const wallet = await testkit.createWallet();
    logWallet('Wallet created: %o', wallet.address);

    await testkit.fundWallet(wallet, 10);
    logWallet('Wallet funded: %d BTC', 10);

    const token = await wallet.createToken({
      ticker: 'DBG',
      totalSupply: 1000n
    });
    logTransfer('Token created: %s', token.contractId);

    // Enable with: DEBUG=rgb:tests:* npm test
  });
});
```

### Snapshot Testing

```typescript
describe('Snapshot Tests', () => {
  it('should match contract structure snapshot', async () => {
    const testkit = await RgbTestkit.create();
    const wallet = await testkit.createWallet();

    const token = await wallet.createToken({
      ticker: 'SNAP',
      name: 'Snapshot Token',
      precision: 8,
      totalSupply: 1000000n
    });

    const contractState = await wallet.getContractState(token.contractId);

    // Redact non-deterministic fields
    const sanitized = {
      ...contractState,
      contractId: '<CONTRACT_ID>',
      genesis: {
        ...contractState.genesis,
        timestamp: '<TIMESTAMP>'
      }
    };

    expect(sanitized).toMatchSnapshot();
  });
});
```

### Visual Debugging with State Inspector

```typescript
class StateInspector {
  static async inspect(wallet: RgbWallet, contractId: ContractId) {
    console.log('\n=== Contract State Inspector ===\n');

    const state = await wallet.getContractState(contractId);

    console.log('Contract ID:', contractId);
    console.log('Schema:', state.schema);
    console.log('\nGlobal State:');
    for (const [key, value] of Object.entries(state.globalState)) {
      console.log(`  ${key}: ${value}`);
    }

    console.log('\nTransitions:', state.transitions.length);
    for (const [i, transition] of state.transitions.entries()) {
      console.log(`  ${i}: ${transition.txid} (${transition.inputs.length} -> ${transition.outputs.length})`);
    }

    console.log('\nOwned States:');
    for (const [seal, ownedState] of state.ownedStates) {
      console.log(`  ${seal}: ${ownedState.amount}`);
    }

    console.log('\n===========================\n');
  }
}

// Usage in tests
it('should debug state', async () => {
  await StateInspector.inspect(wallet, token.contractId);
});
```

## Testing Best Practices

### Test Organization

```typescript
// Good test organization
describe('RgbWallet', () => {
  describe('Token Operations', () => {
    describe('createToken', () => {
      it('should create token with valid parameters', async () => {
        // Test implementation
      });

      it('should reject invalid ticker', async () => {
        // Test implementation
      });
    });

    describe('transfer', () => {
      it('should transfer tokens successfully', async () => {
        // Test implementation
      });

      it('should fail with insufficient balance', async () => {
        // Test implementation
      });
    });
  });

  describe('Invoice Operations', () => {
    // Invoice tests
  });
});
```

### Test Data Builders

```typescript
class TokenBuilder {
  private params: Partial<TokenParams> = {};

  withTicker(ticker: string): this {
    this.params.ticker = ticker;
    return this;
  }

  withTotalSupply(supply: bigint): this {
    this.params.totalSupply = supply;
    return this;
  }

  withPrecision(precision: number): this {
    this.params.precision = precision;
    return this;
  }

  async build(wallet: TestWallet): Promise<Rgb20Contract> {
    const defaults = {
      ticker: 'TEST',
      name: 'Test Token',
      precision: 8,
      totalSupply: 1000000n
    };

    return await wallet.createToken({
      ...defaults,
      ...this.params
    });
  }
}

// Usage
it('should create custom token', async () => {
  const token = await new TokenBuilder()
    .withTicker('CUSTOM')
    .withTotalSupply(500000n)
    .build(wallet);

  expect(token.ticker).toBe('CUSTOM');
});
```

### Cleanup and Teardown

```typescript
describe('Proper Cleanup', () => {
  let testkit: RgbTestkit;
  let wallets: TestWallet[] = [];

  beforeEach(async () => {
    testkit = await RgbTestkit.create();
  });

  afterEach(async () => {
    // Cleanup all wallets
    for (const wallet of wallets) {
      await wallet.close();
    }
    wallets = [];

    // Cleanup testkit
    await testkit.cleanup();
  });

  it('should track all created wallets', async () => {
    const wallet1 = await testkit.createWallet();
    const wallet2 = await testkit.createWallet();

    wallets.push(wallet1, wallet2);

    // Test logic...
  });
});
```

## Related Documentation

- [RGB.js SDK](./rgbjs.md) - JavaScript/TypeScript development
- [Rust SDK](./rust-sdk.md) - Rust RGB implementation
- [Wallet Integration](./wallet-integration.md) - Building RGB wallets
- [RGB20 Tokens](../rgb20/creating-tokens.md) - Fungible token testing
- [RGB21 NFTs](../rgb21/nft-basics.md) - NFT testing

---

*Last updated: 2025-01-17*

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
