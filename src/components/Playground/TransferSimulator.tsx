import React, { useState } from 'react';
import styles from './Playground.module.css';
import { generateExampleContractId } from './encodingUtils';

export default function TransferSimulator() {
  const [senderAmount, setSenderAmount] = useState('100');
  const [transferAmount, setTransferAmount] = useState('30');
  const [recipientAmount, setRecipientAmount] = useState('0');
  const [changeAmount, setChangeAmount] = useState('70');
  const [simulated, setSimulated] = useState(false);

  const simulate = () => {
    const sender = parseFloat(senderAmount);
    const transfer = parseFloat(transferAmount);

    if (transfer > sender) {
      alert('Transfer amount cannot exceed sender balance!');
      return;
    }

    setRecipientAmount(transfer.toString());
    setChangeAmount((sender - transfer).toString());
    setSimulated(true);
  };

  const reset = () => {
    setSenderAmount('100');
    setTransferAmount('30');
    setRecipientAmount('0');
    setChangeAmount('70');
    setSimulated(false);
  };

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>🔄 RGB State Transfer Simulator</h3>
      </div>

      <p className={styles.description}>
        Visualize how RGB transfers work: inputs (seals) → transition → outputs (new seals)
      </p>

      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label>Sender's Balance</label>
          <input
            type="number"
            value={senderAmount}
            onChange={(e) => setSenderAmount(e.target.value)}
            placeholder="100"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formField}>
          <label>Transfer Amount</label>
          <input
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="30"
            className={styles.formInput}
          />
        </div>
      </div>

      <button className={styles.primaryBtn} onClick={simulate}>
        ▶️ Simulate Transfer
      </button>

      {simulated && (
        <div className={styles.visualizer}>
          <h4 style={{textAlign: 'center', marginBottom: '2rem', color: '#667eea'}}>
            State Transition Flow
          </h4>

          <div className={styles.stateFlow}>
            {/* Input State */}
            <div className={styles.stateBox} style={{borderColor: '#f59e0b'}}>
              <h4>Input Seal</h4>
              <div className={styles.value}>{senderAmount}</div>
              <small style={{color: '#666'}}>Sender's UTXO</small>
            </div>

            <div className={styles.flowArrow}>→</div>

            {/* Transition */}
            <div className={styles.stateBox} style={{borderColor: '#8b5cf6', background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'}}>
              <h4>Transition</h4>
              <div className={styles.value} style={{fontSize: '1.2rem'}}>
                Transfer {transferAmount}
              </div>
              <small style={{color: '#666'}}>Close input seal<br/>Create output seals</small>
            </div>

            <div className={styles.flowArrow}>→</div>

            {/* Output States */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1}}>
              <div className={styles.stateBox} style={{borderColor: '#10b981'}}>
                <h4>Output Seal 1</h4>
                <div className={styles.value}>{recipientAmount}</div>
                <small style={{color: '#666'}}>Recipient's UTXO</small>
              </div>

              <div className={styles.stateBox} style={{borderColor: '#10b981'}}>
                <h4>Output Seal 2</h4>
                <div className={styles.value}>{changeAmount}</div>
                <small style={{color: '#666'}}>Sender's Change</small>
              </div>
            </div>
          </div>

          <div style={{marginTop: '2rem', padding: '1rem', background: 'white', borderRadius: '8px'}}>
            <h4 style={{marginTop: 0}}>🔐 Single-Use Seal Principle</h4>
            <ul style={{margin: '0.5rem 0', paddingLeft: '1.5rem', color: '#666'}}>
              <li>Input seal (UTXO) is <strong>closed</strong> and can never be used again</li>
              <li>Two new output seals are <strong>created</strong> for recipient and change</li>
              <li>State is preserved: {senderAmount} = {recipientAmount} + {changeAmount} ✓</li>
              <li>All verified client-side, nothing on Bitcoin blockchain</li>
            </ul>
          </div>

          <button onClick={reset} style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#94a3b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            🔄 Reset
          </button>
        </div>
      )}

      <div style={{marginTop: '2rem'}}>
        <h4>💡 How RGB Transfers Work</h4>
        <div style={{display: 'grid', gap: '1rem', marginTop: '1rem'}}>
          <ConceptCard
            number="1"
            title="Input Validation"
            description="Verify sender owns the input seal (UTXO) and has sufficient balance"
          />
          <ConceptCard
            number="2"
            title="State Transition"
            description="Create transition closing input seal and defining output seals with new amounts"
          />
          <ConceptCard
            number="3"
            title="Bitcoin Anchor"
            description="Commit transition hash to Bitcoin transaction (Tapret or Opret)"
          />
          <ConceptCard
            number="4"
            title="Consignment"
            description="Send state history + proofs to recipient for client-side validation"
          />
        </div>
      </div>
    </div>
  );
}

function ConceptCard({number, title, description}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '1rem',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px'
    }}>
      <div style={{
        width: '2.5rem',
        height: '2.5rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        flexShrink: 0
      }}>
        {number}
      </div>
      <div>
        <h5 style={{margin: '0 0 0.5rem 0', color: '#333'}}>{title}</h5>
        <p style={{margin: 0, color: '#666', fontSize: '0.9rem', lineHeight: '1.5'}}>{description}</p>
      </div>
    </div>
  );
}
