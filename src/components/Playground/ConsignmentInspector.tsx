import React, { useState } from 'react';
import styles from './Playground.module.css';
import { hexToBytes, bytesToHex, parseRgbId } from './encodingUtils';

export default function ConsignmentInspector() {
  const [consignmentData, setConsignmentData] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [error, setError] = useState('');

  const loadExample = () => {
    const example = {
      version: '0.12.0',
      contract_id: 'rgb:2Ky4xDT-VyLmtp9Y-XmKinHXG-utaq8UBu-qjfqDiUM-8bHNdBb',
      genesis: {
        timestamp: '2026-01-17T08:00:00Z',
        metadata: {
          name: 'Example Token',
          ticker: 'EXMPL',
        },
      },
      history: [
        {
          type: 'genesis',
          operation_id: 'op:genesis',
          timestamp: '2026-01-17T08:00:00Z',
          state: { supply: 1000000 },
        },
        {
          type: 'transition',
          operation_id: 'op:tx001',
          timestamp: '2026-01-17T08:05:00Z',
          inputs: [{ seal: 'btc:outpoint1', amount: 1000000 }],
          outputs: [
            { seal: 'btc:outpoint2', amount: 500000 },
            { seal: 'btc:outpoint3', amount: 500000 },
          ],
        },
        {
          type: 'transition',
          operation_id: 'op:tx002',
          timestamp: '2026-01-17T08:10:00Z',
          inputs: [{ seal: 'btc:outpoint2', amount: 500000 }],
          outputs: [
            { seal: 'btc:outpoint4', amount: 300000 },
            { seal: 'btc:outpoint5', amount: 200000 },
          ],
        },
      ],
      anchors: [
        { txid: 'a1b2c3d4...', method: 'tapret', commitment: '0xabcd...' },
        { txid: 'e5f6g7h8...', method: 'tapret', commitment: '0xef12...' },
      ],
    };

    setConsignmentData(JSON.stringify(example, null, 2));
  };

  const parseConsignment = () => {
    setError('');
    setParsed(null);

    try {
      const data = JSON.parse(consignmentData);

      // Validate basic structure
      if (!data.contract_id || !data.history) {
        throw new Error('Invalid consignment format: missing contract_id or history');
      }

      setParsed(data);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>📦 Consignment Inspector</h3>
        <button className={styles.exampleBtn} onClick={loadExample}>
          Load Example
        </button>
      </div>

      <p className={styles.description}>
        Inspect RGB consignments: view state history, transitions, and Bitcoin anchors
      </p>

      <div className={styles.ioSection}>
        <div className={styles.inputSection}>
          <label>Consignment JSON:</label>
          <textarea
            value={consignmentData}
            onChange={(e) => setConsignmentData(e.target.value)}
            placeholder='{"contract_id": "rgb:...", "history": [...], ...}'
            rows={8}
            style={{fontFamily: 'monospace', fontSize: '0.85rem'}}
          />
        </div>

        <button className={styles.primaryBtn} onClick={parseConsignment}>
          🔍 Inspect Consignment
        </button>

        {error && (
          <div className={styles.error}>❌ {error}</div>
        )}

        {parsed && (
          <div style={{marginTop: '2rem'}}>
            {/* Contract Info */}
            <div className={styles.parsedOutput}>
              <h4>✅ Consignment Valid</h4>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Contract ID:</span>
                <code>{parsed.contract_id}</code>
              </div>

              {parsed.genesis && (
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Genesis:</span>
                  <code>{parsed.genesis.timestamp}</code>
                </div>
              )}

              {parsed.genesis?.metadata && (
                <>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Name:</span>
                    <code>{parsed.genesis.metadata.name || 'N/A'}</code>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Ticker:</span>
                    <code>{parsed.genesis.metadata.ticker || 'N/A'}</code>
                  </div>
                </>
              )}
            </div>

            {/* State History DAG */}
            <div style={{marginTop: '2rem'}}>
              <h4>📊 State History (DAG)</h4>
              <div style={{
                background: '#f8f9fa',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '2px solid #e0e0e0'
              }}>
                {parsed.history && parsed.history.map((op: any, idx: number) => (
                  <OperationNode
                    key={idx}
                    operation={op}
                    index={idx}
                    isLast={idx === parsed.history.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* Bitcoin Anchors */}
            {parsed.anchors && parsed.anchors.length > 0 && (
              <div style={{marginTop: '2rem'}}>
                <h4>⚓ Bitcoin Anchors</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  {parsed.anchors.map((anchor: any, idx: number) => (
                    <div key={idx} style={{
                      background: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                        <strong>Anchor #{idx + 1}</strong>
                        <span style={{
                          background: '#667eea',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem'
                        }}>
                          {anchor.method.toUpperCase()}
                        </span>
                      </div>
                      <div style={{fontSize: '0.85rem', color: '#666'}}>
                        <div><strong>TX ID:</strong> {anchor.txid}</div>
                        <div><strong>Commitment:</strong> <code style={{fontSize: '0.75rem'}}>{anchor.commitment}</code></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem',
              textAlign: 'center'
            }}>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea'}}>
                  {parsed.history ? parsed.history.length : 0}
                </div>
                <div style={{fontSize: '0.9rem', color: '#666'}}>Operations</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea'}}>
                  {parsed.anchors ? parsed.anchors.length : 0}
                </div>
                <div style={{fontSize: '0.9rem', color: '#666'}}>Bitcoin Anchors</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea'}}>
                  {parsed.version || '0.12.0'}
                </div>
                <div style={{fontSize: '0.9rem', color: '#666'}}>RGB Version</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{marginTop: '2rem'}}>
        <h4>💡 What is a Consignment?</h4>
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          lineHeight: '1.6',
          color: '#666'
        }}>
          <p style={{margin: '0 0 1rem 0'}}>
            A <strong>consignment</strong> is a package containing the complete state history
            needed for a recipient to validate an RGB transfer.
          </p>
          <p style={{margin: '0 0 1rem 0'}}>It includes:</p>
          <ul style={{margin: '0', paddingLeft: '1.5rem'}}>
            <li><strong>Genesis</strong> - Initial contract creation</li>
            <li><strong>State transitions</strong> - All transfers leading to current state</li>
            <li><strong>Bitcoin anchors</strong> - Proof of commitment to blockchain</li>
            <li><strong>Merkle proofs</strong> - Cryptographic verification data</li>
          </ul>
          <p style={{margin: '1rem 0 0 0'}}>
            Recipients validate consignments <strong>client-side</strong> without querying
            the blockchain or any third party.
          </p>
        </div>
      </div>
    </div>
  );
}

function OperationNode({operation, index, isLast}: {
  operation: any;
  index: number;
  isLast: boolean;
}) {
  const typeColors = {
    genesis: '#10b981',
    transition: '#667eea',
    extension: '#f59e0b',
  };

  const color = typeColors[operation.type as keyof typeof typeColors] || '#94a3b8';

  return (
    <div style={{position: 'relative'}}>
      <div style={{
        background: 'white',
        border: `2px solid ${color}`,
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: isLast ? 0 : '1.5rem'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <span style={{
              background: color,
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {operation.type}
            </span>
            <strong style={{color: '#333'}}>{operation.operation_id}</strong>
          </div>
          <span style={{fontSize: '0.85rem', color: '#666'}}>
            {new Date(operation.timestamp).toLocaleString()}
          </span>
        </div>

        {operation.inputs && (
          <div style={{marginTop: '0.75rem', fontSize: '0.9rem'}}>
            <strong style={{color: '#666'}}>Inputs:</strong>
            {operation.inputs.map((input: any, idx: number) => (
              <div key={idx} style={{
                marginTop: '0.25rem',
                paddingLeft: '1rem',
                color: '#666'
              }}>
                • {input.seal}: {input.amount.toLocaleString()}
              </div>
            ))}
          </div>
        )}

        {operation.outputs && (
          <div style={{marginTop: '0.75rem', fontSize: '0.9rem'}}>
            <strong style={{color: '#666'}}>Outputs:</strong>
            {operation.outputs.map((output: any, idx: number) => (
              <div key={idx} style={{
                marginTop: '0.25rem',
                paddingLeft: '1rem',
                color: '#666'
              }}>
                • {output.seal}: {output.amount.toLocaleString()}
              </div>
            ))}
          </div>
        )}

        {operation.state && (
          <div style={{marginTop: '0.75rem', fontSize: '0.9rem', color: '#666'}}>
            <strong>State:</strong> {JSON.stringify(operation.state)}
          </div>
        )}
      </div>

      {!isLast && (
        <div style={{
          width: '2px',
          height: '1rem',
          background: color,
          margin: '0 auto'
        }} />
      )}
    </div>
  );
}
