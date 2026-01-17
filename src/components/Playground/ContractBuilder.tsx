import React, { useState } from 'react';
import styles from './Playground.module.css';
import { generateExampleContractId, bytesToHex } from './encodingUtils';

type ContractType = 'rgb20' | 'rgb21' | 'rgb25';

export default function ContractBuilder() {
  const [contractType, setContractType] = useState<ContractType>('rgb20');

  return (
    <div className={styles.playground}>
      <div className={styles.toolTabs}>
        <button
          className={contractType === 'rgb20' ? styles.active : ''}
          onClick={() => setContractType('rgb20')}>
          RGB20 Token
        </button>
        <button
          className={contractType === 'rgb21' ? styles.active : ''}
          onClick={() => setContractType('rgb21')}>
          RGB21 NFT
        </button>
        <button
          className={contractType === 'rgb25' ? styles.active : ''}
          onClick={() => setContractType('rgb25')}>
          RGB25 Collectible
        </button>
      </div>

      <div className={styles.toolContent}>
        {contractType === 'rgb20' && <RGB20Builder />}
        {contractType === 'rgb21' && <RGB21Builder />}
        {contractType === 'rgb25' && <RGB25Builder />}
      </div>
    </div>
  );
}

function RGB20Builder() {
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [supply, setSupply] = useState('1000000');
  const [precision, setPrecision] = useState('8');
  const [description, setDescription] = useState('');
  const [generated, setGenerated] = useState(false);
  const [contractId, setContractId] = useState('');

  const generate = () => {
    setContractId(generateExampleContractId());
    setGenerated(true);
  };

  const exportJSON = () => {
    const contract = {
      contract_type: 'RGB20',
      version: '0.12.0',
      metadata: {
        name,
        ticker,
        description,
      },
      genesis: {
        total_supply: supply,
        precision: parseInt(precision),
        timestamp: new Date().toISOString(),
        contract_id: contractId,
      },
    };
    return JSON.stringify(contract, null, 2);
  };

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>🪙 RGB20 Fungible Token Builder</h3>
      </div>

      <p className={styles.description}>
        Create a fungible token like stablecoins, utility tokens, or securities
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label>Token Name*</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Token"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label>Ticker Symbol*</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="MTK"
            maxLength={10}
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label>Total Supply*</label>
          <input
            type="number"
            value={supply}
            onChange={(e) => setSupply(e.target.value)}
            placeholder="1000000"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label>Precision (decimals)*</label>
          <select
            value={precision}
            onChange={(e) => setPrecision(e.target.value)}
            className={styles.formInput}>
            <option value="0">0 - Whole numbers only</option>
            <option value="2">2 - 0.01 (cents)</option>
            <option value="8">8 - 0.00000001 (satoshi-like)</option>
            <option value="18">18 - 0.000000000000000001 (ether-like)</option>
          </select>
        </div>

        <div className={styles.formField} style={{gridColumn: '1 / -1'}}>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A description of your token..."
            rows={3}
            className={styles.formInput}
          />
        </div>
      </div>

      <button
        className={styles.primaryBtn}
        onClick={generate}
        disabled={!name || !ticker || !supply}>
        🚀 Generate Contract
      </button>

      {generated && (
        <div className={styles.generatedContract}>
          <h4>✅ Contract Generated</h4>

          <div className={styles.contractPreview}>
            <div className={styles.previewField}>
              <span>Contract ID:</span>
              <code>{contractId}</code>
            </div>
            <div className={styles.previewField}>
              <span>Type:</span>
              <code>RGB20 Fungible Token</code>
            </div>
            <div className={styles.previewField}>
              <span>Name:</span>
              <code>{name} ({ticker})</code>
            </div>
            <div className={styles.previewField}>
              <span>Supply:</span>
              <code>{parseInt(supply).toLocaleString()} (precision: {precision})</code>
            </div>
          </div>

          <div className={styles.exportSection}>
            <label>Contract JSON:</label>
            <pre className={styles.codeExport}>{exportJSON()}</pre>
            <button onClick={() => navigator.clipboard.writeText(exportJSON())}>
              📋 Copy JSON
            </button>
          </div>

          <div className={styles.info}>
            💡 This is a demo contract. In production, use the RGB CLI or SDK to create actual contracts with proper validation.
          </div>
        </div>
      )}
    </div>
  );
}

function RGB21Builder() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creator, setCreator] = useState('');
  const [royalty, setRoyalty] = useState('5');
  const [generated, setGenerated] = useState(false);
  const [contractId, setContractId] = useState('');

  const generate = () => {
    setContractId(generateExampleContractId());
    setGenerated(true);
  };

  const exportJSON = () => {
    const contract = {
      contract_type: 'RGB21',
      version: '0.12.0',
      metadata: {
        name,
        description,
        creator,
      },
      genesis: {
        royalty_rate: parseFloat(royalty),
        timestamp: new Date().toISOString(),
        contract_id: contractId,
      },
    };
    return JSON.stringify(contract, null, 2);
  };

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>🖼️ RGB21 NFT Builder</h3>
      </div>

      <p className={styles.description}>
        Create unique non-fungible tokens for digital art, collectibles, and unique assets
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formField} style={{gridColumn: '1 / -1'}}>
          <label>NFT Name*</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Unique NFT"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField} style={{gridColumn: '1 / -1'}}>
          <label>Description*</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A unique digital artwork representing..."
            rows={4}
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label>Creator</label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder="Artist name"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label>Royalty Rate (%)</label>
          <input
            type="number"
            value={royalty}
            onChange={(e) => setRoyalty(e.target.value)}
            placeholder="5"
            min="0"
            max="100"
            step="0.1"
            className={styles.formInput}
          />
        </div>
      </div>

      <button
        className={styles.primaryBtn}
        onClick={generate}
        disabled={!name || !description}>
        🚀 Generate NFT Contract
      </button>

      {generated && (
        <div className={styles.generatedContract}>
          <h4>✅ NFT Contract Generated</h4>

          <div className={styles.contractPreview}>
            <div className={styles.previewField}>
              <span>Contract ID:</span>
              <code>{contractId}</code>
            </div>
            <div className={styles.previewField}>
              <span>Type:</span>
              <code>RGB21 Non-Fungible Token</code>
            </div>
            <div className={styles.previewField}>
              <span>Name:</span>
              <code>{name}</code>
            </div>
            <div className={styles.previewField}>
              <span>Royalty:</span>
              <code>{royalty}% on secondary sales</code>
            </div>
          </div>

          <div className={styles.exportSection}>
            <label>Contract JSON:</label>
            <pre className={styles.codeExport}>{exportJSON()}</pre>
            <button onClick={() => navigator.clipboard.writeText(exportJSON())}>
              📋 Copy JSON
            </button>
          </div>

          <div className={styles.info}>
            💡 This is a demo contract. Add media attachments and metadata using RGB CLI or SDK.
          </div>
        </div>
      )}
    </div>
  );
}

function RGB25Builder() {
  const [collectionName, setCollectionName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [items, setItems] = useState([
    { name: 'Common Card', supply: 1000, rarity: 'Common' },
    { name: 'Rare Card', supply: 100, rarity: 'Rare' },
    { name: 'Ultra Rare Card', supply: 10, rarity: 'Ultra Rare' },
  ]);
  const [generated, setGenerated] = useState(false);
  const [contractId, setContractId] = useState('');

  const generate = () => {
    setContractId(generateExampleContractId());
    setGenerated(true);
  };

  const exportJSON = () => {
    const contract = {
      contract_type: 'RGB25',
      version: '0.12.0',
      metadata: {
        collection_name: collectionName,
        symbol,
      },
      genesis: {
        items: items.map((item, idx) => ({
          item_id: `item-${idx}`,
          name: item.name,
          total_supply: item.supply,
          rarity: item.rarity,
        })),
        timestamp: new Date().toISOString(),
        contract_id: contractId,
      },
    };
    return JSON.stringify(contract, null, 2);
  };

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>🎮 RGB25 Collectible Builder</h3>
      </div>

      <p className={styles.description}>
        Create collectible fungible assets like trading cards, game items, or limited editions
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label>Collection Name*</label>
          <input
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="Crypto Legends"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label>Symbol*</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="CLGD"
            maxLength={10}
            className={styles.formInput}
          />
        </div>
      </div>

      <div className={styles.itemsList}>
        <h4>Collection Items ({items.length})</h4>
        {items.map((item, idx) => (
          <div key={idx} className={styles.itemCard}>
            <div className={styles.itemInfo}>
              <strong>{item.name}</strong>
              <span>{item.supply.toLocaleString()} copies • {item.rarity}</span>
            </div>
          </div>
        ))}
        <div className={styles.info}>
          💡 Edit items in the exported JSON to customize your collection
        </div>
      </div>

      <button
        className={styles.primaryBtn}
        onClick={generate}
        disabled={!collectionName || !symbol}>
        🚀 Generate Collection
      </button>

      {generated && (
        <div className={styles.generatedContract}>
          <h4>✅ Collection Generated</h4>

          <div className={styles.contractPreview}>
            <div className={styles.previewField}>
              <span>Contract ID:</span>
              <code>{contractId}</code>
            </div>
            <div className={styles.previewField}>
              <span>Type:</span>
              <code>RGB25 Collectible Fungibles</code>
            </div>
            <div className={styles.previewField}>
              <span>Collection:</span>
              <code>{collectionName} ({symbol})</code>
            </div>
            <div className={styles.previewField}>
              <span>Total Items:</span>
              <code>{items.length} item types</code>
            </div>
            <div className={styles.previewField}>
              <span>Total Supply:</span>
              <code>{items.reduce((sum, item) => sum + item.supply, 0).toLocaleString()} copies</code>
            </div>
          </div>

          <div className={styles.exportSection}>
            <label>Contract JSON:</label>
            <pre className={styles.codeExport}>{exportJSON()}</pre>
            <button onClick={() => navigator.clipboard.writeText(exportJSON())}>
              📋 Copy JSON
            </button>
          </div>

          <div className={styles.info}>
            💡 This is a demo contract. Use RGB CLI or SDK to add media and attributes to items.
          </div>
        </div>
      )}
    </div>
  );
}
