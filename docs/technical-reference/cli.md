---
sidebar_position: 2
title: CLI Reference
description: Command-line interface reference for RGB tools
---

# RGB CLI Reference

:::info Version
This reference targets **RGB v0.12.0-rc.3** (current production version). Commands verified against source code.
:::

Complete command-line reference for the RGB wallet and contract management tool.

## rgb-cli

Main RGB command-line interface for managing RGB smart contracts, wallets, and state transfers.

### Global Options

```bash
rgb [OPTIONS] <COMMAND>

Options:
  -d, --data-dir <DIR>           Location of the data directory
                                 [env: RGB_DATA_DIR]
                                 [default: ~/.local/share/rgb (Linux)]
                                 [default: ~/Library/Application Support/RGB Smart Contracts (macOS)]
                                 [default: ~\AppData\Local\RGB Smart Contracts (Windows)]

  -n, --network <NETWORK>        Bitcoin network to use
                                 [env: RGB_NETWORK]
                                 [default: testnet4]
                                 [possible values: bitcoin, testnet, testnet4, signet, regtest]

  --no-network-prefix            Do not add network name as a prefix to the data directory
                                 [env: RGB_NO_NETWORK_PREFIX]

  --min-confirmations <N>        Minimal number of confirmations to consider an operation final
                                 [default: 32]

  -h, --help                     Print help information
  -V, --version                  Print version information
```

#### Global Environment Variables

```bash
RGB_DATA_DIR=/path/to/data       # Override default data directory
RGB_NETWORK=testnet4             # Set network (bitcoin, testnet, testnet4, signet, regtest)
RGB_NO_NETWORK_PREFIX=1          # Disable network prefix in data directory path
RGB_WALLET=alice                 # Default wallet name for operations
RGB_COINSELECT_STRATEGY=aggregate # Coin selection strategy
RGB_PSBT_VER2=1                  # Use PSBT version 2 by default
ELECTRUM_SERVER=host:port        # Electrum server URL
ESPLORA_SERVER=https://...       # Esplora server URL
```

#### Data Directory Structure

```
~/.local/share/rgb/
├── bitcoin.testnet/              # Network-specific data
│   ├── default.wallet/           # Default wallet
│   │   ├── descriptor.toml       # Wallet descriptor
│   │   ├── utxos.dat            # UTXO cache
│   │   └── seals.dat            # RGB seal data
│   ├── alice.wallet/            # Named wallet
│   ├── bob.wallet/              # Another wallet
│   ├── contracts/               # Contract storage
│   │   ├── issuers/            # Contract issuers
│   │   └── state/              # Contract state
│   └── DemoToken.*.contract     # Individual contracts
```

---

## Command Categories

RGB CLI commands are organized into three main categories:

1. **Wallet Management** - Create and manage wallets, sync with blockchain
2. **Contract Management** - Import, issue, and manage contracts
3. **Combined Operations** - State queries, transfers, invoices, and payments

---

## I. Wallet Management Commands

### init

Initialize the RGB data directory.

```bash
rgb init [OPTIONS]

Options:
  -q, --quiet    Do not print error messages if directory already exists
```

**Description:**
Creates the data directory structure required for RGB operations. The command will fail if the directory already exists unless `--quiet` is specified.

**Examples:**

```bash
# Initialize with default directory
rgb init

# Initialize and ignore if already exists
rgb init --quiet

# Initialize with custom directory
rgb -d /custom/path init
```

**Output:**
```
Data directory initialized at ~/.local/share/rgb/bitcoin.testnet
```

**Error Handling:**
- If directory exists without `--quiet`: exits with error code 1
- If parent directory lacks write permissions: exits with error code 2
- Creates full directory structure including subdirectories

---

### wallets

List all known wallets in the data directory.

```bash
rgb wallets
```

**Description:**
Scans the data directory and lists all wallet names (directories ending with `.wallet`).

**Examples:**

```bash
# List all wallets
rgb wallets
```

**Output:**
```
alice
bob
default
```

**Notes:**
- If no wallets found, prints: "No wallets found"
- Only shows wallet names, not full paths
- Does not verify wallet integrity

---

### create

Create a new wallet from a descriptor.

```bash
rgb create [OPTIONS] <NAME> <DESCRIPTOR>

Options:
  --tapret-key-only    Use Tapret key-only descriptor
  --wpkh               Use witness public key hash (WPKH) descriptor

Arguments:
  <NAME>               Wallet name (used for file naming)
  <DESCRIPTOR>         Extended pubkey descriptor (xpub format)
```

**Description:**
Creates a new RGB wallet from an extended public key descriptor. You must specify either `--tapret-key-only` or `--wpkh` to define the wallet type.

**Examples:**

```bash
# Create WPKH wallet
rgb create --wpkh alice "xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5"

# Create Tapret key-only wallet
rgb create --tapret-key-only bob "xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt"
```

**Output:**
```
Wallet 'alice' created successfully
```

**Error Handling:**
- Invalid descriptor format: "Error: Invalid extended public key"
- Wallet already exists: "Error: Wallet file already exists"
- Both or neither wallet type specified: "Error: Specify either --tapret-key-only or --wpkh"

---

### sync

Synchronize wallet and contracts with the blockchain.

```bash
rgb sync [OPTIONS]

Options:
  -w, --wallet <NAME>         Wallet to use [env: RGB_WALLET]
  --electrum[=<URL>]          Electrum server [env: ELECTRUM_SERVER]
                              [default: mycitadel.io:50001]
  --esplora[=<URL>]           Esplora server [env: ESPLORA_SERVER]
                              [default: https://mempool.space/{network}/api]

Arguments:
  wallet                      Optional wallet name (defaults to 'default')
```

**Description:**
Synchronizes the wallet's UTXO set and contract state with the blockchain using either an Electrum or Esplora server.

**Examples:**

```bash
# Sync default wallet with default Electrum server
rgb sync

# Sync named wallet
rgb sync -w alice

# Sync with custom Electrum server
rgb sync -w alice --electrum=electrum.example.com:50001

# Sync with custom Esplora server
rgb sync -w bob --esplora=https://blockstream.info/testnet/api
```

**Output:**
```
Synchronizing wallet: ████████████████████ done
Updated 15 UTXOs
Confirmed 3 RGB operations
```

**Notes:**
- Scans for new UTXOs and updates their confirmation status
- Updates RGB contract state confirmations
- Requires network connectivity to indexer
- May take several minutes for wallets with many UTXOs

---

### fund

Get a receiving address for Bitcoin funding.

```bash
rgb fund [OPTIONS]

Options:
  -w, --wallet <NAME>    Wallet to use [env: RGB_WALLET]

Arguments:
  wallet                 Optional wallet name (defaults to 'default')
```

**Description:**
Generates the next unused Bitcoin address for receiving funds. These funds are needed for transaction fees when creating RGB transfers.

**Examples:**

```bash
# Get funding address for default wallet
rgb fund

# Get funding address for named wallet
rgb fund -w alice
```

**Output:**
```
tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx
```

**Notes:**
- Each call generates a new address
- Address format depends on wallet descriptor type (WPKH vs Tapret)
- Funds sent to this address can be used for RGB operations

---

### seals

List available wallet seals (unspent outputs).

```bash
rgb seals [OPTIONS]

Options:
  -w, --wallet <NAME>         Wallet to use [env: RGB_WALLET]
  --sync                      Sync wallet before listing
  --electrum[=<URL>]          Electrum server
  --esplora[=<URL>]           Esplora server
```

**Description:**
Lists all unspent transaction outputs (UTXOs) controlled by the wallet. These UTXOs can be used as seals for RGB state assignments.

**Examples:**

```bash
# List seals for default wallet
rgb seals

# List seals for named wallet
rgb seals -w alice

# Sync and list seals
rgb seals -w alice --sync --electrum
```

**Output:**
```
bc1q...xpjzsx:0:1500000
bc1q...y8w4x2:1:2000000
bc1q...9rk4m3:0:500000
```

**Output Format:**
Each line shows: `<address>:<vout>:<amount_in_sats>`

**Notes:**
- Only shows confirmed UTXOs by default
- UTXOs with RGB state attached are marked
- Used for selecting seals when creating invoices

---

## II. Contract Management Commands

### contracts

List known contracts and issuers.

```bash
rgb contracts [OPTIONS]

Options:
  -i, --issuers    Include contract issuers in the list
```

**Description:**
Lists all contracts and optionally their issuers (schemas) known to the wallet.

**Examples:**

```bash
# List only contracts
rgb contracts

# List contracts and issuers
rgb contracts --issuers
```

**Output (with --issuers):**
```
Contract issuers:
Codex ID                                                                 Codex name                       Standard         Developer
7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8                         RGB20-FNA                        RGB-20           LNP/BP Standards Association

Contracts:
---
contractId: rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0
codexId: 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8
name: DemoToken
ticker: DEMO
precision: centiMilli
issued: 10000
```

**Output Format (contracts only):**
Shows detailed YAML for each contract including:
- Contract ID
- Codex ID (schema reference)
- Token metadata (name, ticker, precision)
- Issuance information

---

### import

Import a contract issuer (schema).

```bash
rgb import <FILE>...

Arguments:
  <FILE>...    One or more issuer files to import (supports wildcards)
```

**Description:**
Imports contract issuer definitions (schemas) that allow creating or accepting contracts of specific types (e.g., RGB20 tokens, RGB21 NFTs).

**Examples:**

```bash
# Import single issuer
rgb import RGB20-FNA.issuer

# Import multiple issuers
rgb import RGB20-FNA.issuer RGB21-FNA.issuer

# Import using wildcards
rgb import *.issuer
```

**Output:**
```
Processing 'RGB20-FNA.issuer' ... codex id 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8 ... success
Processing 'RGB21-FNA.issuer' ... codex id 8D26x4X2-M1U~aYy-Bfi6~lW-Arv{830-IYRGRLX-_6mY0P9 ... already known, skipping
```

**Notes:**
- Issuers define the smart contract schema (RGB20, RGB21, etc.)
- Must import issuers before issuing or accepting contracts
- Duplicate imports are safely skipped
- Issuers can be obtained from trusted sources like https://rgbex.io

---

### export

Export a contract issuer to a file.

```bash
rgb export [OPTIONS] <CODEX_ID> <FILE>

Options:
  -f, --force    Force overwrite if file already exists

Arguments:
  <CODEX_ID>     Codex ID of the issuer to export
  <FILE>         Target file to save the issuer
```

**Description:**
Exports a contract issuer (schema) to a file for sharing or backup.

**Examples:**

```bash
# Export issuer
rgb export 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8 RGB20-FNA.issuer

# Force overwrite existing file
rgb export -f 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8 RGB20-FNA.issuer
```

**Error Handling:**
- File exists without `--force`: "Error: File already exists"
- Unknown codex ID: "Error: unknown issuer '\{codex\}'"

---

### issue

Issue a new RGB contract.

```bash
rgb issue [OPTIONS] [PARAMS]

Options:
  -q, --quiet             Do not print error messages if something goes wrong
  -w, --wallet <NAME>     Wallet to use [env: RGB_WALLET]

Arguments:
  [PARAMS]                YAML file with contract parameters
```

**Description:**
Issues (creates) a new RGB contract. Without parameters, lists available issuers. With parameters, creates the contract.

**Examples:**

```bash
# List available issuers
rgb issue

# Issue a contract with parameters
rgb issue -w alice DemoToken.yaml

# Issue quietly (suppress errors)
rgb issue -q -w alice DemoToken.yaml
```

**Parameter File Format (DemoToken.yaml):**
```yaml
consensus: bitcoin
testnet: true
issuer:
  codexId: 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8
  version: 0
  checksum: AYkSrg
name: DemoToken
method: issue
timestamp: "2024-12-18T10:32:00-02:00"

global:
  - name: ticker
    verified: DEMO
  - name: name
    verified: Demo Token
  - name: precision
    verified: centiMilli
  - name: issued
    verified: 10000

owned:
  - name: balance
    seal: b7116550736fbe5d3e234d0141c6bc8d1825f94da78514a3cede5674e9a5eae9:1
    data: 10000
```

**Output:**
```
A new contract issued with ID rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0
```

**Notes:**
- The seal in the parameters must reference a UTXO controlled by the wallet
- Issuance is immediate and doesn't require blockchain confirmation
- Contract ID is deterministic based on parameters

---

### purge

Remove a contract and purge all its data.

```bash
rgb purge <CONTRACT_ID>

Arguments:
  <CONTRACT_ID>    Contract ID to remove
```

**Description:**
Permanently removes a contract and all associated state from local storage. Use with extreme caution.

**Examples:**

```bash
# Purge a contract
rgb purge rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0
```

**Warning:**
- This action is irreversible
- All contract history and state will be lost
- Assets associated with the contract will become inaccessible
- Only use if you're certain you no longer need the contract

---

### backup

Backup a contract as a consignment.

```bash
rgb backup [OPTIONS] <CONTRACT> <FILE>

Options:
  -f, --force          Force overwrite if file already exists

Arguments:
  <CONTRACT>           Contract ID or name to backup
  <FILE>               Path to save the consignment
```

**Description:**
Exports a complete contract consignment including all history and state. Useful for backup or sharing the entire contract with another party.

**Examples:**

```bash
# Backup contract by ID
rgb backup rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0 backup.rgb

# Backup contract by name
rgb backup DemoToken DemoToken.rgb

# Force overwrite
rgb backup -f DemoToken DemoToken.rgb
```

**Use Cases:**
- Sharing full contract history with a new party
- Creating backups before purging old data
- Migrating contracts between systems
- Archiving contract state

---

## III. Combined Contract/Wallet Operations

### state

Display contract state information.

```bash
rgb state [OPTIONS] [CONTRACT]

Options:
  -w, --wallet <NAME>         Wallet to use [env: RGB_WALLET]
  --sync                      Sync wallet before querying state
  --electrum[=<URL>]          Electrum server
  --esplora[=<URL>]           Esplora server
  -a, --all                   Show all state, not just wallet-owned
  -g, --global                Display global state entries
  -o, --owned                 Display owned state entries

Arguments:
  [CONTRACT]                  Optional contract ID or name (shows all if omitted)
```

**Description:**
Queries and displays contract state. Can show global state, owned state, or both. Can filter by wallet ownership or show all state.

**Examples:**

```bash
# Show owned state for all contracts
rgb state -o -w alice

# Show global and owned state for specific contract
rgb state -go -w alice DemoToken

# Show all state (including not owned by wallet)
rgb state -goa -w alice DemoToken

# Sync before querying
rgb state -go -w alice --sync --electrum DemoToken
```

**Output (Global State):**
```
rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0    DemoToken
Global: State name       Conf. height    Verifiable state            Unverifiable state          RGB output
        ticker           32              DEMO                        ~                           ...
        name             32              Demo Token                  ~                           ...
        precision        32              centiMilli                  ~                           ...
        issued           32              10000                       ~                           ...
Aggr.:  # no known aggregated state
```

**Output (Owned State):**
```
Owned:  State name       Conf. height    Value                       RGB output                                      Bitcoin outpoint
        balance          32              10000                       rgb:tapret1st:b711655073...                     b711655073...e9a5eae9:1
```

**State Types:**
- **Global**: Immutable state visible to all (e.g., token metadata)
- **Aggregated**: Computed aggregate values
- **Owned**: State assigned to specific seals (e.g., token balances)

---

### invoice

Generate an RGB invoice for receiving assets.

```bash
rgb invoice [OPTIONS] [CONTRACT] [VALUE]

Options:
  -w, --wallet <NAME>         Wallet to use [env: RGB_WALLET]
  --seal-only                 Generate only a single-use seal, not full invoice
  --wout                      Use witness-output-based seal instead of token
  --nonce <N>                 Nonce number to use for seal generation
  -a, --api <NAME>            API name to interface the contract
  -m, --method <NAME>         Method name to call
  -s, --state <NAME>          State name for the invoice

Arguments:
  [CONTRACT]                  Contract ID or name
  [VALUE]                     Amount to receive
```

**Description:**
Creates an RGB invoice for receiving assets. The invoice encodes the contract, amount, and a UTXO identifier where the assets will be received.

**Examples:**

```bash
# Generate seal only (useful for debugging)
rgb invoice -w bob --nonce 0 --seal-only DemoToken

# Generate invoice for receiving 100 tokens
rgb invoice -w bob --nonce 0 DemoToken 100

# Generate witness-output based invoice
rgb invoice -w bob --wout --nonce 1 DemoToken 50

# Invoice with custom API and method
rgb invoice -w bob -a RGB20 -m transfer --nonce 2 DemoToken 25
```

**Output (seal only):**
```
rgb:utxo:b711655073...e9a5eae9:1
```

**Output (full invoice):**
```
rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W/RGB20/transfer+balance/100
    @rgb:utxo:b711655073...e9a5eae9:1
```

**Invoice Format:**
```
rgb:<contract_id>/<api>/<method>+<state>/<value>@<seal>
```

**Notes:**
- Nonce ensures different seals on each invocation
- `--wout` creates seals not tied to specific UTXOs (more flexible)
- Token-based seals require the wallet to have UTXOs
- Invoices can be shared as plain text or QR codes

---

### pay

Pay an RGB invoice, creating PSBT and consignment.

```bash
rgb pay [OPTIONS] <INVOICE> <CONSIGNMENT> [PSBT]

Options:
  -w, --wallet <NAME>             Wallet to use [env: RGB_WALLET]
  --sync                          Sync wallet before paying
  --electrum[=<URL>]              Electrum server
  --esplora[=<URL>]               Esplora server
  -s, --strategy <STRATEGY>       Coin selection strategy
                                  [env: RGB_COINSELECT_STRATEGY]
                                  [default: aggregate]
                                  [possible values: aggregate, minimal, random]
  --sats <AMOUNT>                 Sats to send to pay-to-address invoice
  --fee <SATS>                    Transaction fees [default: 1000]
  -2, --psbt2                     Use PSBT version 2 [env: RGB_PSBT_VER2]
  -p, --print                     Print PSBT to stdout
  -f, --force                     Force overwrite existing files

Arguments:
  <INVOICE>                       RGB invoice to fulfill
  <CONSIGNMENT>                   Path to save the consignment file
  [PSBT]                          Path to save PSBT (defaults to <consignment>.psbt)
```

**Description:**
Processes an RGB invoice, selects appropriate coins, constructs a Bitcoin transaction (PSBT), and creates a consignment for the recipient.

**Examples:**

```bash
# Pay invoice with default options
rgb pay -w alice "$INVOICE" transfer.rgb

# Pay with custom fee and explicit PSBT path
rgb pay -w alice --fee 2000 "$INVOICE" transfer.rgb transfer.psbt

# Pay with minimal coin selection
rgb pay -w alice --strategy minimal "$INVOICE" transfer.rgb

# Pay and print PSBT
rgb pay -w alice --print "$INVOICE" transfer.rgb

# Force overwrite existing files
rgb pay -w alice -f "$INVOICE" transfer.rgb
```

**Workflow:**
1. Parse invoice to determine contract, amount, and destination seal
2. Select UTXOs with sufficient RGB state (using strategy)
3. Create Bitcoin transaction inputs/outputs
4. Assign RGB state to outputs per invoice
5. Generate PSBT for signing
6. Create consignment with state proof for recipient

**Output:**
```
Selected 1 input(s) with 10000 tokens
Created change output with 9900 tokens
PSBT saved to transfer.psbt
Consignment saved to transfer.rgb
```

**Coin Selection Strategies:**
- `aggregate`: Combine multiple UTXOs to satisfy payment
- `minimal`: Use fewest UTXOs possible
- `random`: Random selection for privacy

**Files Created:**
- **Consignment (.rgb)**: Cryptographic proof for recipient
- **PSBT (.psbt)**: Unsigned Bitcoin transaction

**Next Steps:**
After `pay`, you must:
1. Sign the PSBT with your Bitcoin wallet
2. Use `complete` or `finalize` to finish the transaction
3. Send the consignment to the recipient

---

### script

Create a payment script from an invoice.

```bash
rgb script [OPTIONS] <INVOICE> <OUTPUT>

Options:
  -w, --wallet <NAME>         Wallet to use [env: RGB_WALLET]
  --sync                      Sync wallet before creating script
  --electrum[=<URL>]          Electrum server
  --esplora[=<URL>]           Esplora server
  --sats <AMOUNT>             Sats to send to pay-to-address invoice
  -s, --strategy <STRATEGY>   Coin selection strategy [default: aggregate]

Arguments:
  <INVOICE>                   RGB invoice to process
  <OUTPUT>                    Path to save the payment script YAML
```

**Description:**
Generates a payment script (YAML) that describes the RGB operation without immediately creating a PSBT. Useful for complex multi-step workflows or payjoin scenarios.

**Examples:**

```bash
# Create payment script
rgb script -w alice "$INVOICE" payment.yaml

# Create script with custom strategy
rgb script -w alice --strategy minimal "$INVOICE" payment.yaml
```

**Output File (payment.yaml):**
```yaml
contract: rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0
beneficiary:
  seal: rgb:utxo:b711655073...e9a5eae9:1
  amount: 100
inputs:
  - outpoint: a5e9...e9:1
    amount: 10000
outputs:
  - assignment: transfer
    seal: rgb:utxo:b711655073...e9a5eae9:1
    amount: 100
  - assignment: transfer
    seal: rgb:utxo:c621766184...f6b6fbf0:0
    amount: 9900
```

**Use Cases:**
- Reviewing operation before execution
- Modifying operations programmatically
- Coordinating payjoin or coinjoin transactions
- Debugging payment logic

---

### exec

Execute a payment script, producing prefabricated bundle and PSBT.

```bash
rgb exec [OPTIONS] <SCRIPT> <BUNDLE> <FEE> [PSBT]

Options:
  -w, --wallet <NAME>     Wallet to use [env: RGB_WALLET]
  -2, --psbt2             Use PSBT version 2 [env: RGB_PSBT_VER2]
  -p, --print             Print PSBT to stdout

Arguments:
  <SCRIPT>                YAML file with payment script
  <BUNDLE>                Path to save prefabricated operation bundle
  <FEE>                   Transaction fees in satoshis
  [PSBT]                  Path to save PSBT (defaults to <bundle>.psbt)
```

**Description:**
Executes a payment script, creating a prefabricated operation bundle and PSBT. The bundle contains RGB-specific data that will be used later in the `complete` step.

**Examples:**

```bash
# Execute script
rgb exec -w alice payment.yaml bundle.yaml 1000

# Execute with custom PSBT path
rgb exec -w alice payment.yaml bundle.yaml 1000 tx.psbt

# Execute and print PSBT
rgb exec -w alice --print payment.yaml bundle.yaml 1000
```

**Output:**
```
Prefabricated bundle saved to bundle.yaml
PSBT saved to bundle.psbt
```

**Workflow:**
1. `script` - Generate payment script from invoice
2. `exec` - Create bundle and PSBT from script
3. Sign PSBT externally
4. `complete` - Finalize with signed PSBT
5. `finalize` - Extract and optionally broadcast transaction

**Notes:**
- The bundle contains RGB witness data
- PSBT can be signed by external wallets
- Supports payjoin: multiple parties can add inputs/outputs to PSBT before signing

---

### complete

Complete and finalize PSBT with prefabricated bundle.

```bash
rgb complete [OPTIONS] <BUNDLE> <PSBT>

Options:
  -w, --wallet <NAME>     Wallet to use [env: RGB_WALLET]

Arguments:
  <BUNDLE>                Prefabricated operation bundle
  <PSBT>                  Signed PSBT file
```

**Description:**
Completes the RGB operation by combining the signed PSBT with the prefabricated bundle. Updates PSBT with RGB witness information.

**Examples:**

```bash
# Complete operation
rgb complete -w alice bundle.yaml signed.psbt
```

**Workflow Position:**
1. `exec` creates bundle.yaml and unsigned.psbt
2. **External signing** of unsigned.psbt → signed.psbt
3. `complete` merges bundle.yaml + signed.psbt
4. `finalize` extracts final transaction

**Output:**
```
PSBT updated with RGB witness data
Ready for finalization
```

**Notes:**
- PSBT must be fully signed before completion
- Updates the PSBT file in-place
- Adds RGB-specific witness commitments
- After this step, use `finalize` to extract the transaction

---

### consign

Create a consignment transferring contract state.

```bash
rgb consign [OPTIONS] <CONTRACT> <OUTPUT>

Options:
  -t, --terminals <TOKEN>...    Authority tokens serving as terminals

Arguments:
  <CONTRACT>                    Contract ID or name
  <OUTPUT>                      Path to save consignment
```

**Description:**
Creates a consignment file containing contract state and proofs for specific terminals (endpoints). Used for custom state transfers beyond simple payments.

**Examples:**

```bash
# Create consignment for specific terminals
rgb consign --terminals rgb:utxo:a5e9...e9:1 DemoToken custom.rgb

# Multiple terminals
rgb consign -t rgb:utxo:a5e9...e9:1 -t rgb:utxo:b6f0...f0:0 DemoToken multi.rgb
```

**Use Cases:**
- Custom state transfers
- Partial contract disclosure
- Multi-party consignments
- Advanced RGB protocols

---

### finalize

Finalize signed PSBT and optionally broadcast.

```bash
rgb finalize [OPTIONS] <PSBT> [TX]

Options:
  -w, --wallet <NAME>         Wallet to use [env: RGB_WALLET]
  --sync                      Sync wallet after finalization
  --electrum[=<URL>]          Electrum server
  --esplora[=<URL>]           Esplora server
  -b, --broadcast             Broadcast the transaction

Arguments:
  <PSBT>                      PSBT file to finalize
  [TX]                        File to save extracted transaction
```

**Description:**
Finalizes a signed PSBT, extracts the raw Bitcoin transaction, and optionally broadcasts it to the network.

**Examples:**

```bash
# Finalize and extract transaction
rgb finalize -w alice transfer.psbt transfer.tx

# Finalize and broadcast immediately
rgb finalize -w alice --broadcast transfer.psbt

# Finalize with Esplora broadcast
rgb finalize -w alice --broadcast --esplora transfer.psbt

# Just finalize, print transaction
rgb finalize -w alice transfer.psbt
```

**Output:**
```
3 of 3 inputs were finalized, transaction is ready for extraction
Extracting signed transaction ... success
Transaction: 02000000...
```

**Output (with broadcast):**
```
3 of 3 inputs were finalized, transaction is ready for extraction
Extracting signed transaction ... success
Broadcasting transaction ... success
TxID: a5e9f1d2b3c4a5e9f1d2b3c4a5e9f1d2b3c4a5e9f1d2b3c4a5e9f1d2b3c4a5e9
```

**Notes:**
- PSBT must be fully signed
- Without `--broadcast`, only extracts transaction
- With `[TX]` argument, saves raw transaction to file
- Broadcasting requires indexer connection (Electrum/Esplora)

---

### accept

Verify and accept a contract or transfer consignment.

```bash
rgb accept [OPTIONS] <INPUT>

Options:
  -u, --unknown           Allow accepting unknown contracts
  -w, --wallet <NAME>     Wallet to use [env: RGB_WALLET]

Arguments:
  <INPUT>                 Consignment file to accept
```

**Description:**
Validates and accepts a consignment file, importing it into local contract storage. Performs cryptographic verification of all state transitions and proofs.

**Examples:**

```bash
# Accept transfer consignment
rgb accept -w bob transfer.rgb

# Accept new contract (backup/full consignment)
rgb accept -w bob -u DemoToken.rgb

# Accept with default wallet
rgb accept transfer.rgb
```

**Validation Steps:**
1. Verify consignment structure and encoding
2. Validate all state transition proofs
3. Check RGB commitment in Bitcoin blockchain
4. Verify seal validity and spent status
5. Import contract state if valid

**Output (success):**
```
Validating consignment ... success
Verifying proofs ... success
Checking blockchain anchors ... success
Consignment accepted
Contract: rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0
Received: 100 tokens
```

**Output (failure):**
```
Validating consignment ... failed
Error: Invalid state transition proof at output 1
```

**Notes:**
- Always validate before accepting
- Unknown contracts require `-u` flag for safety
- Acceptance is atomic: either fully succeeds or fails
- Failed validation never modifies local state

---

## Complete Workflow Examples

### Example 1: Token Issuance and Transfer

This example demonstrates issuing a token and transferring it between two parties.

**Step 1: Initialize both parties**
```bash
# Alice initializes
rgb init
rgb -w alice create --wpkh alice "xpub6D4BDPc..."

# Bob initializes
rgb init
rgb -w bob create --wpkh bob "xpub6FnCn6nS..."
```

**Step 2: Import contract issuer**
```bash
# Both parties import the RGB20 issuer
rgb import RGB20-FNA.issuer
```

**Step 3: Alice issues token**
```bash
# Create issue parameters
cat > DemoToken.yaml <<EOF
consensus: bitcoin
testnet: true
issuer:
  codexId: 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8
  version: 0
  checksum: AYkSrg
name: DemoToken
method: issue
timestamp: "2024-12-18T10:32:00-02:00"

global:
  - name: ticker
    verified: DEMO
  - name: name
    verified: Demo Token
  - name: precision
    verified: centiMilli
  - name: issued
    verified: 10000

owned:
  - name: balance
    seal: <alice_utxo>:0
    data: 10000
EOF

# Issue the contract
rgb issue -w alice DemoToken.yaml
```

**Step 4: Share contract with Bob**
```bash
# Alice creates backup
rgb backup -f DemoToken DemoToken.rgb

# Alice sends DemoToken.rgb to Bob

# Bob accepts
rgb accept -w bob -u DemoToken.rgb
```

**Step 5: Bob creates invoice**
```bash
# Bob generates invoice for 100 tokens
INVOICE=$(rgb invoice -w bob --nonce 0 DemoToken 100)
echo $INVOICE
# Output: rgb:2cVP0Kc-TbcEPtAh.../RGB20/transfer+balance/100@rgb:utxo:b711...
```

**Step 6: Alice pays invoice**
```bash
# Alice creates payment
rgb pay -w alice "$INVOICE" transfer.rgb transfer.psbt

# Alice signs PSBT (using external wallet)
bitcoin-cli walletprocesspsbt $(cat transfer.psbt)

# Alice finalizes and broadcasts
rgb finalize -w alice --broadcast transfer.psbt
```

**Step 7: Bob accepts transfer**
```bash
# Bob validates and accepts consignment
rgb accept -w bob transfer.rgb

# Bob checks balance
rgb state -o -w bob DemoToken
# Shows: balance = 100
```

---

### Example 2: Advanced Payment Flow with Scripts

**Step 1: Create payment script**
```bash
# Alice creates script from invoice
INVOICE=$(rgb invoice -w bob --nonce 5 DemoToken 250)
rgb script -w alice "$INVOICE" payment.yaml
```

**Step 2: Review and modify script (optional)**
```bash
# Examine script
cat payment.yaml

# Optionally modify for custom logic
# (e.g., adjust change outputs, add payjoin inputs)
```

**Step 3: Execute script**
```bash
# Create bundle and PSBT
rgb exec -w alice payment.yaml bundle.yaml 1500
```

**Step 4: External signing**
```bash
# Sign PSBT with hardware wallet or external signer
# This step happens outside RGB CLI
# Result: signed.psbt
```

**Step 5: Complete operation**
```bash
# Merge bundle with signed PSBT
rgb complete -w alice bundle.yaml signed.psbt
```

**Step 6: Finalize**
```bash
# Extract and broadcast
rgb finalize -w alice --broadcast signed.psbt

# Create consignment for recipient
# (automatically created during pay, or use consign command)
```

---

## Troubleshooting

### Common Issues

**Issue: "Wallet has no unspent outputs"**
```bash
# Solution: Fund wallet first
rgb fund -w alice
# Send Bitcoin to displayed address
# Wait for confirmation
rgb sync -w alice --electrum
```

**Issue: "Unknown contract"**
```bash
# Solution: Import contract issuer or accept consignment
rgb import RGB20-FNA.issuer
# or
rgb accept -u contract.rgb
```

**Issue: "Invalid state transition proof"**
```bash
# Cause: Corrupted consignment or validation failure
# Solution: Request new consignment from sender
# Ensure blockchain is synced
rgb sync -w bob --electrum
```

**Issue: "File already exists"**
```bash
# Solution: Use --force flag
rgb backup -f DemoToken backup.rgb
rgb pay -f -w alice "$INVOICE" transfer.rgb
```

**Issue: "Unable to connect to indexing server"**
```bash
# Solution: Specify working Electrum or Esplora server
rgb sync -w alice --electrum=electrum.example.com:50001
# or
rgb sync -w alice --esplora=https://blockstream.info/testnet/api
```

---

## Exit Codes

```
0   Success - Command completed successfully
1   General error - Check error message for details
2   Invalid arguments - Review command syntax
3   Validation failed - State transition or proof validation failed
4   Network error - Unable to connect to indexer or broadcast
5   State error - Inconsistent or corrupted state
```

---

## Advanced Topics

### PSBT Versions

RGB supports both PSBT v0 and v2:

```bash
# Use PSBT v2 (recommended for complex transactions)
rgb pay -2 -w alice "$INVOICE" transfer.rgb

# Set as default via environment
export RGB_PSBT_VER2=1
```

### Coin Selection Strategies

**Aggregate** (default):
- Combines multiple UTXOs
- Minimizes number of transactions
- May reduce privacy

**Minimal**:
- Uses fewest UTXOs possible
- Optimizes for fee efficiency
- Best for large balances

**Random**:
- Random UTXO selection
- Maximizes privacy
- May be less fee-efficient

```bash
# Use specific strategy
rgb pay -s minimal -w alice "$INVOICE" transfer.rgb
```

### Seal Types

**Token-based seals** (default):
- Tied to specific UTXOs
- Requires UTXO ownership
- Better privacy

**Witness-output seals**:
- Not tied to specific UTXO
- More flexible
- Generated on-demand

```bash
# Create witness-output invoice
rgb invoice -w bob --wout --nonce 1 DemoToken 100
```

---

## Command Reference Quick Guide

### Initialization & Setup
| Command | Purpose | Example |
|---------|---------|---------|
| `init` | Initialize data directory | `rgb init` |
| `create` | Create new wallet | `rgb create --wpkh alice "xpub..."` |
| `import` | Import contract issuer | `rgb import RGB20-FNA.issuer` |

### Wallet Operations
| Command | Purpose | Example |
|---------|---------|---------|
| `wallets` | List wallets | `rgb wallets` |
| `sync` | Sync with blockchain | `rgb sync -w alice --electrum` |
| `fund` | Get funding address | `rgb fund -w alice` |
| `seals` | List available seals | `rgb seals -w alice` |

### Contract Management
| Command | Purpose | Example |
|---------|---------|---------|
| `contracts` | List contracts | `rgb contracts --issuers` |
| `issue` | Issue new contract | `rgb issue -w alice params.yaml` |
| `backup` | Backup contract | `rgb backup DemoToken backup.rgb` |
| `export` | Export issuer | `rgb export <codex-id> file.issuer` |
| `purge` | Remove contract | `rgb purge <contract-id>` |

### State & Transfers
| Command | Purpose | Example |
|---------|---------|---------|
| `state` | View contract state | `rgb state -go -w alice` |
| `invoice` | Create invoice | `rgb invoice -w bob DemoToken 100` |
| `pay` | Pay invoice | `rgb pay -w alice "$INVOICE" tx.rgb` |
| `accept` | Accept consignment | `rgb accept -w bob transfer.rgb` |

### Advanced Workflows
| Command | Purpose | Example |
|---------|---------|---------|
| `script` | Create payment script | `rgb script -w alice "$INVOICE" script.yaml` |
| `exec` | Execute script | `rgb exec -w alice script.yaml bundle.yaml 1000` |
| `complete` | Complete with bundle | `rgb complete -w alice bundle.yaml signed.psbt` |
| `consign` | Create consignment | `rgb consign -t <token> DemoToken out.rgb` |
| `finalize` | Finalize and broadcast | `rgb finalize -w alice --broadcast tx.psbt` |

---

## Environment Variables Reference

### Core Settings

```bash
# Data directory location
RGB_DATA_DIR=/custom/path/to/rgb
# Default: ~/.local/share/rgb (Linux)
# Default: ~/Library/Application Support/RGB Smart Contracts (macOS)
# Default: ~\AppData\Local\RGB Smart Contracts (Windows)

# Network selection
RGB_NETWORK=testnet4
# Options: bitcoin, testnet, testnet4, signet, regtest

# Disable network prefix in data directory path
RGB_NO_NETWORK_PREFIX=1
# When set, uses RGB_DATA_DIR directly without appending network name

# Default wallet name
RGB_WALLET=alice
# Used when -w/--wallet is not specified

# Coin selection strategy
RGB_COINSELECT_STRATEGY=aggregate
# Options: aggregate, minimal, random

# PSBT version preference
RGB_PSBT_VER2=1
# When set, uses PSBT version 2 by default
```

### Blockchain Indexer Settings

```bash
# Electrum server URL
ELECTRUM_SERVER=electrum.example.com:50001
# Default: mycitadel.io:50001

# Esplora server URL
ESPLORA_SERVER=https://blockstream.info/testnet/api
# Default: https://mempool.space/{network}/api
# {network} is replaced with: "" (mainnet), "testnet", "signet"
```

### Development & Debugging

```bash
# Rust backtrace (for debugging crashes)
RUST_BACKTRACE=1
# Options: 0 (off), 1 (simple), full (detailed)

# Rust log level
RUST_LOG=debug
# Options: error, warn, info, debug, trace

# XDG data directory (Linux)
XDG_DATA_HOME=/custom/xdg/data
# RGB will use $XDG_DATA_HOME/rgb if set
```

### Usage Examples

```bash
# Development environment setup
export RGB_NETWORK=testnet4
export RGB_DATA_DIR=~/rgb-dev
export RGB_WALLET=dev-wallet
export ELECTRUM_SERVER=localhost:50001
export RUST_BACKTRACE=1

# Production environment
export RGB_NETWORK=bitcoin
export RGB_DATA_DIR=/var/lib/rgb
export ESPLORA_SERVER=https://mempool.space/api
export RGB_COINSELECT_STRATEGY=minimal

# Privacy-focused setup
export RGB_COINSELECT_STRATEGY=random
export RGB_PSBT_VER2=1
```

---

## Configuration Files

### Wallet Descriptor (descriptor.toml)

Located at: `<data-dir>/<wallet-name>.wallet/descriptor.toml`

```toml
[descriptor]
type = "wpkh"  # or "tapret-key-only"

[xpub]
fingerprint = "a1b2c3d4"
derivation = "m/84'/1'/0'"
xpub = "tpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM..."

[rgb]
noise = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"

[network]
network = "testnet4"
```

### Issue Parameters (YAML)

Contract issuance parameters file:

```yaml
consensus: bitcoin        # Consensus layer (always bitcoin)
testnet: true            # Network flag
issuer:
  codexId: 7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8
  version: 0
  checksum: AYkSrg

name: MyToken           # Contract name
method: issue           # Method to call
timestamp: "2024-12-18T10:32:00-02:00"

# Global (immutable) state
global:
  - name: ticker
    verified: MTKN
  - name: name
    verified: My Token Name
  - name: precision
    verified: centiMilli  # 0.00001 precision
  - name: issued
    verified: 1000000     # Total supply

# Owned (assignable) state
owned:
  - name: balance
    seal: bc1q...abc:0    # UTXO where tokens are assigned
    data: 1000000         # Amount
```

### Payment Script (YAML)

Generated by `rgb script` command:

```yaml
contract: rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0
method: transfer
api: RGB20

# Payment beneficiary
beneficiary:
  seal: rgb:utxo:b711655073...e9a5eae9:1
  amount: 100
  state: balance

# Inputs (source of RGB state)
inputs:
  - seal: rgb:tapret1st:a5e9...e9:1
    contract: rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0
    state: balance
    amount: 10000

# Outputs (destinations)
outputs:
  - seal: rgb:utxo:b711655073...e9a5eae9:1  # Payment
    assignment: balance
    amount: 100
  - seal: rgb:utxo:c621766184...f6b6fbf0:0  # Change
    assignment: balance
    amount: 9900

# Bitcoin transaction parameters
bitcoin:
  fee: 1500
  inputs:
    - outpoint: a5e9f1d2b3c4a5e9f1d2b3c4a5e9f1d2b3c4:1
      amount: 50000
  outputs:
    - address: tb1q...xyz
      amount: 48500
```

---

## RGB Invoice Format

### Structure

```
rgb:<contract>/<api>/<method>+<state>/<value>@<seal>
```

### Components

- **contract**: Contract ID or contract query string
- **api**: API name (e.g., RGB20, RGB21)
- **method**: Method to invoke (e.g., transfer)
- **state**: State name being transferred (e.g., balance)
- **value**: Amount or data value
- **seal**: UTXO identifier for receiving

### Examples

**Full invoice:**
```
rgb:2cVP0Kc-TbcEPtAh-6GKSmI5W-0Mv4nYWd-fHSqzlJk-0mfqKJ0/RGB20/transfer+balance/100@rgb:utxo:b711655073...e9a5eae9:1
```

**Seal-only (no contract specified):**
```
rgb:utxo:b711655073...e9a5eae9:1
```

**Witness-output seal:**
```
rgb:wout:0123456789abcdef
```

### Seal Types

**UTXO-based (token):**
- Format: `rgb:utxo:<txid>:<vout>`
- Tied to specific Bitcoin UTXO
- More private, requires UTXO ownership
- Example: `rgb:utxo:a5e9f1d2...b3c4:1`

**Tapret (Taproot):**
- Format: `rgb:tapret1st:<txid>:<vout>`
- Uses Taproot commitment
- Example: `rgb:tapret1st:b711655073...e9a5eae9:1`

**Witness-output:**
- Format: `rgb:wout:<nonce>`
- Not tied to specific UTXO
- More flexible, generated on demand
- Example: `rgb:wout:0123456789abcdef`

---

## File Formats

### Consignment Files (.rgb)

Binary format containing:
- Contract genesis or partial history
- State transitions
- Merkle proofs
- Bitcoin transaction witnesses
- Seal definitions

**Usage:**
- Created by: `pay`, `backup`, `consign`
- Consumed by: `accept`
- Transmitted to: Recipients of transfers

**Properties:**
- Self-contained cryptographic proof
- Can be validated offline
- Deterministic (same inputs = same output)

### PSBT Files (.psbt)

Partially Signed Bitcoin Transaction format:
- Standard Bitcoin PSBT (BIP-174)
- May include RGB-specific metadata
- Supports both v0 and v2

**Usage:**
- Created by: `pay`, `exec`
- Modified by: `complete`
- Consumed by: `finalize`
- Signed by: External Bitcoin wallets

### Bundle Files (.yaml)

Prefabricated operation bundle:
- RGB operation metadata
- Input/output mappings
- Seal assignments
- Used in multi-step workflows

**Usage:**
- Created by: `exec`
- Consumed by: `complete`

### Issuer Files (.issuer)

Contract schema definitions:
- Schema structure
- Global state definitions
- Owned state definitions
- Method definitions
- Validation rules

**Usage:**
- Created by: Schema developers
- Distributed via: Trusted sources (rgbex.io)
- Imported by: `import`
- Exported by: `export`

---

## Error Messages and Solutions

### Validation Errors

**"Invalid state transition proof"**
- **Cause**: Consignment contains invalid cryptographic proof
- **Solution**: Request new consignment from sender

**"Unknown contract"**
- **Cause**: Contract issuer not imported
- **Solution**: `rgb import <issuer.issuer>` or use `--unknown` flag

**"Seal already spent"**
- **Cause**: UTXO was spent in another transaction
- **Solution**: Generate new invoice with fresh seal

### Network Errors

**"Unable to connect to indexing server"**
- **Cause**: Electrum/Esplora server unreachable
- **Solution**: Check network, try different server

**"Transaction broadcast failed"**
- **Cause**: Invalid transaction or network issue
- **Solution**: Verify transaction validity, check fees

### File Errors

**"File already exists"**
- **Cause**: Output file exists
- **Solution**: Use `--force` flag or remove file

**"Unable to open PSBT"**
- **Cause**: PSBT file corrupted or wrong format
- **Solution**: Regenerate PSBT from beginning

### State Errors

**"Insufficient RGB balance"**
- **Cause**: Not enough tokens for payment
- **Solution**: Receive more tokens or reduce payment amount

**"Wallet has no unspent outputs"**
- **Cause**: No UTXOs for creating token-based seals
- **Solution**: `rgb fund` and send Bitcoin to address

---

## Performance Optimization

### Sync Optimization

```bash
# Sync only when needed (use --sync flag on operations)
rgb state --sync -w alice DemoToken

# Batch operations without intermediate syncs
rgb pay -w alice "$INVOICE1" tx1.rgb
rgb pay -w alice "$INVOICE2" tx2.rgb
rgb sync -w alice  # Sync once at end
```

### Coin Selection

```bash
# Use minimal strategy for fewer inputs (lower fees)
rgb pay -s minimal -w alice "$INVOICE" transfer.rgb

# Use aggregate for better UTXO consolidation
rgb pay -s aggregate -w alice "$INVOICE" transfer.rgb
```

### PSBT Version

```bash
# PSBT v2 for complex transactions (payjoin, coinjoin)
rgb pay -2 -w alice "$INVOICE" transfer.rgb

# PSBT v0 for better compatibility
rgb pay -w alice "$INVOICE" transfer.rgb
```

---

## Security Best Practices

### Wallet Management

1. **Backup descriptors**: Store wallet descriptor securely
2. **Separate wallets**: Use different wallets for different purposes
3. **Key security**: Never share extended private keys
4. **Descriptor validation**: Verify descriptors before creating wallets

### Contract Operations

1. **Verify issuers**: Only import issuers from trusted sources
2. **Validate consignments**: Always validate before accepting
3. **Review operations**: Check state changes before finalizing
4. **Backup contracts**: Regular backups of important contracts

### Transfer Security

1. **Verify invoices**: Confirm invoice details before paying
2. **Check amounts**: Review all amounts in state output
3. **Validate seals**: Ensure seals are fresh and unspent
4. **Secure transmission**: Use encrypted channels for consignments

### Network Security

1. **Use TLS**: Prefer HTTPS for Esplora, TLS for Electrum
2. **Trusted indexers**: Use reliable blockchain indexers
3. **Tor support**: Consider Tor for enhanced privacy
4. **Rate limiting**: Be aware of indexer rate limits

---

## Debugging

### Enable Verbose Logging

```bash
# Set Rust log level
export RUST_LOG=debug
export RUST_BACKTRACE=1

# Run command
rgb state -w alice DemoToken
```

### Inspect Files

```bash
# View PSBT details
bitcoin-cli decodepsbt $(cat transfer.psbt)

# Check consignment structure (if tools available)
# RGB consignments are binary, require special tools

# Examine YAML files
cat payment.yaml
cat bundle.yaml
```

### Common Debugging Commands

```bash
# Check wallet status
rgb seals -w alice
rgb sync -w alice --electrum

# Verify contract presence
rgb contracts
rgb contracts --issuers

# Review state
rgb state -goa -w alice DemoToken

# Test invoice generation
rgb invoice -w bob --seal-only DemoToken
```

---

## Integration Examples

### Shell Script Integration

```bash
#!/bin/bash
set -e

WALLET="alice"
INVOICE="$1"

if [ -z "$INVOICE" ]; then
    echo "Usage: $0 <invoice>"
    exit 1
fi

# Sync wallet
echo "Syncing wallet..."
rgb sync -w "$WALLET" --electrum

# Create payment
echo "Creating payment..."
rgb pay -w "$WALLET" "$INVOICE" /tmp/transfer.rgb /tmp/transfer.psbt

# Sign PSBT (assuming bitcoin-cli integration)
echo "Signing transaction..."
SIGNED=$(bitcoin-cli -rpcwallet="$WALLET" walletprocesspsbt $(cat /tmp/transfer.psbt) | jq -r '.psbt')
echo "$SIGNED" > /tmp/signed.psbt

# Finalize and broadcast
echo "Broadcasting..."
rgb finalize -w "$WALLET" --broadcast /tmp/signed.psbt

echo "Payment complete!"
```

### Python Integration

```python
import subprocess
import json

def create_invoice(wallet, contract, amount, nonce=0):
    """Create RGB invoice"""
    result = subprocess.run(
        ['rgb', 'invoice', '-w', wallet, '--nonce', str(nonce), contract, str(amount)],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout.strip()

def pay_invoice(wallet, invoice, consignment_path):
    """Pay RGB invoice"""
    subprocess.run(
        ['rgb', 'pay', '-w', wallet, invoice, consignment_path],
        check=True
    )

# Usage
invoice = create_invoice('bob', 'DemoToken', 100, nonce=5)
print(f"Invoice: {invoice}")

pay_invoice('alice', invoice, '/tmp/transfer.rgb')
```

---

## Migration and Compatibility

### Upgrading from v0.11

Key changes in v0.12:
1. New command structure (wallet management separated)
2. Improved PSBT support (v2)
3. Enhanced coin selection
4. Script-based workflows

**Migration steps:**
```bash
# Backup old data
cp -r ~/.rgb ~/.rgb.v0.11.backup

# Import old contracts (if needed)
rgb import old-contracts/*.issuer

# Recreate wallets with new format
rgb create --wpkh wallet-name "xpub..."
```

### Cross-platform Compatibility

Data directory locations:
- **Linux**: `~/.local/share/rgb` (or `$XDG_DATA_HOME/rgb`)
- **macOS**: `~/Library/Application Support/RGB Smart Contracts`
- **Windows**: `~\AppData\Local\RGB Smart Contracts`

**Portable setup:**
```bash
# Use custom directory for portability
export RGB_DATA_DIR=/portable/drive/rgb
export RGB_NO_NETWORK_PREFIX=1
rgb init
```

---

## Quick Reference Cheat Sheet

### Complete Transfer Workflow
```bash
# Bob creates invoice
INVOICE=$(rgb invoice -w bob --nonce 0 DemoToken 100)

# Alice pays
rgb pay -w alice "$INVOICE" transfer.rgb
# Sign PSBT externally, then:
rgb finalize -w alice --broadcast transfer.psbt

# Bob accepts
rgb accept -w bob transfer.rgb
```

### Essential Commands
```bash
# Setup
rgb init
rgb create --wpkh alice "xpub..."
rgb import RGB20-FNA.issuer

# Issue token
rgb issue -w alice params.yaml

# Check state
rgb state -go -w alice DemoToken

# Transfer
rgb invoice -w bob DemoToken 100
rgb pay -w alice "$INVOICE" tx.rgb
rgb accept -w bob tx.rgb
```

### Useful One-liners
```bash
# List all contracts with details
rgb contracts | grep -A5 "contractId"

# Check specific contract state
rgb state -go -w alice DemoToken | grep balance

# Generate invoice and copy to clipboard
rgb invoice -w bob DemoToken 100 | xclip -selection clipboard

# Backup all contracts
for contract in $(rgb contracts | grep contractId | awk '{print $2}'); do
    rgb backup -f "$contract" "backup_$contract.rgb"
done
```

---

## Glossary

**Consignment**: Cryptographic proof of RGB state transfer, containing contract history and proofs.

**Contract**: RGB smart contract instance with associated state and rules.

**Issuer**: Contract schema definition (e.g., RGB20 for tokens, RGB21 for NFTs).

**Seal**: Single-use commitment to Bitcoin UTXO where RGB state is assigned.

**PSBT**: Partially Signed Bitcoin Transaction, standard format for multi-party signing.

**Codex**: Contract schema identifier and metadata.

**Terminal**: Endpoint in contract state graph, used for consignments.

**Bundle**: Prefabricated operation containing RGB-specific transaction data.

**Auth Token**: Authority token representing ownership claim.

**Witness Output**: Output type for seals not tied to specific UTXOs.

---

## Related Documentation

### Technical References
- [RGB Protocol Specification](https://rgb.tech)
- [API Reference](./api.md) - Programmatic RGB interfaces
- [Interfaces](./interfaces.md) - RGB interface standards
- [Schema Documentation](./schemas.md) - RGB20, RGB21 schemas

### Guides and Tutorials
- [Getting Started](../guides/getting-started.md) - First steps with RGB
- [Token Issuance](../guides/token-issuance.md) - Creating RGB tokens
- [NFT Guide](../guides/nfts.md) - Working with RGB21 NFTs
- [Advanced Workflows](../guides/advanced-workflows.md) - Complex operations

### Troubleshooting and Support
- [Troubleshooting Guide](./troubleshooting.md) - Common issues and solutions
- [FAQ](../faq.md) - Frequently asked questions
- [Community Resources](../community.md) - Support channels

### Development Resources
- [RGB Repository](https://github.com/RGB-WG/rgb) - Source code
- [Integration Guide](../guides/integration.md) - Integrate RGB in apps
- [Testing Guide](../guides/testing.md) - Testing RGB applications

### External Resources
- [RGB.tech](https://rgb.tech) - Official website
- [RGB Black Paper](https://blackpaper.rgb.tech) - Protocol specification
- [LNP/BP Standards](https://lnp-bp.org) - Standards organization
- [rgbex.io](https://rgbex.io) - Contract issuer repository

---

## Version History

### v0.12 (Current)
- Enhanced wallet management commands
- PSBT v2 support
- Improved coin selection strategies
- Script-based payment workflows
- Advanced consignment handling

### v0.11
- Initial stable release
- Basic contract operations
- PSBT v0 support
- Simple transfer workflows

---

## Credits and License

RGB CLI is developed by the RGB Working Group and LNP/BP Standards Association.

**License**: Apache-2.0

**Copyright**:
- 2019-2024 LNP/BP Standards Association, Switzerland
- 2024-2025 LNP/BP Laboratories, Institute for Distributed and Cognitive Systems (InDCS), Switzerland
- 2025 RGB Consortium, Switzerland
- 2019-2025 Dr Maxim Orlovsky

For more information, visit [RGB.tech](https://rgb.tech)
