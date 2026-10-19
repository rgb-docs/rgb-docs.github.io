import React, {useState} from 'react';
import styles from './Playground.module.css';
import {sniffRgbFile} from './encodingUtils';

interface Op {
  type: 'genesis' | 'transition';
  id: string;
  inputs?: {seal: string; amount: number}[];
  outputs: {seal: string; amount: number}[];
  witness?: string;
}

/** A teaching model of a transfer consignment's history. Not a real RGB format. */
const EXAMPLE: {contract: string; history: Op[]} = {
  contract: 'rgb:Ca0d5l5K-Cr4Wm6I-owUkn6t-2NHrgjk-R1KRreF-tVBhAR0',
  history: [
    {type: 'genesis', id: 'genesis', outputs: [{seal: 'aaaa…:0', amount: 1000}]},
    {
      type: 'transition', id: 'transition 1', witness: 'bbbb… (tapret)',
      inputs: [{seal: 'aaaa…:0', amount: 1000}],
      outputs: [{seal: 'blinded utxob:… (receiver 1)', amount: 600}, {seal: 'bbbb…:1 (change)', amount: 400}],
    },
    {
      type: 'transition', id: 'transition 2', witness: 'cccc… (opret)',
      inputs: [{seal: 'bbbb…:1', amount: 400}],
      outputs: [{seal: 'blinded utxob:… (you)', amount: 100}, {seal: 'cccc…:1 (change)', amount: 300}],
    },
  ],
};

export default function ConsignmentInspector() {
  const [fileInfo, setFileInfo] = useState('');

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const head = new Uint8Array(await f.slice(0, 64).arrayBuffer());
    setFileInfo(`${f.name}, ${f.size} bytes: ${sniffRgbFile(head)}`);
  };

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>Consignments</h3>
      </div>

      <h4>Identify a file</h4>
      <p className={styles.description}>
        Pick an RGB file to see what it is from its first bytes: v0.11 files start with <code>RGB\0</code> and{' '}
        <code>CON</code>, <code>TFR</code> or <code>KIT</code>; v0.12 consignments start with <code>RGBCNSGN</code>.
        The file is read in your browser and never uploaded.
      </p>
      <input type="file" onChange={onFile} />
      {fileInfo && <div className={styles.info} style={{marginTop: '1rem'}}>{fileInfo}</div>}

      <h4 style={{marginTop: '2rem'}}>What a transfer consignment proves</h4>
      <div className={styles.info} style={{marginBottom: '1rem'}}>
        <strong>Illustrative, not a real RGB format.</strong> Real consignments are binary strict-encoded files, not
        JSON. This diagram only shows the chain of operations a receiver checks.
      </div>
      <p className={styles.description}>
        Contract <code>{EXAMPLE.contract}</code>. The receiver checks every operation from genesis to their own seal,
        and that each witness transaction spent the input seals and commits to the operation.
      </p>
      <div style={{background: 'var(--ifm-background-surface-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--ifm-color-emphasis-300)'}}>
        {EXAMPLE.history.map((op, i) => (
          <OperationNode key={op.id} op={op} isLast={i === EXAMPLE.history.length - 1} />
        ))}
      </div>

      <ul style={{marginTop: '1.5rem'}}>
        <li>A consignment contains the genesis, the operations leading to the receiver's seals, and for each one the
          witness transaction and the MPC and tapret or opret proofs. v0.11 also includes the schema and its types and
          scripts; v0.12 includes the codex and APIs.</li>
        <li>It reveals this history to the receiver, including earlier amounts and outpoints.</li>
        <li>Send it before you broadcast the transaction, and keep a copy.</li>
      </ul>
      <p>
        Details per line: <a href="/technical-reference/consignments">Consignments</a>.
      </p>
    </div>
  );
}

function OperationNode({op, isLast}: {op: Op; isLast: boolean}) {
  const color = op.type === 'genesis' ? '#10b981' : '#667eea';
  return (
    <div>
      <div style={{border: `2px solid ${color}`, borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: isLast ? 0 : '0.5rem'}}>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <span style={{background: color, color: 'white', padding: '0.1rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', textTransform: 'uppercase'}}>
            {op.type}
          </span>
          <strong>{op.id}</strong>
          {op.witness && <small>witness tx {op.witness}</small>}
        </div>
        {op.inputs && (
          <div style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>
            Spends: {op.inputs.map((x) => `${x.seal} (${x.amount})`).join(', ')}
          </div>
        )}
        <div style={{fontSize: '0.9rem', marginTop: '0.25rem'}}>
          Assigns: {op.outputs.map((x) => `${x.seal} (${x.amount})`).join(', ')}
        </div>
      </div>
      {!isLast && <div style={{width: '2px', height: '0.75rem', background: color, margin: '0 auto 0.5rem'}} />}
    </div>
  );
}
