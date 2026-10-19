import React, {useMemo, useState} from 'react';
import styles from './Playground.module.css';
import {
  ID_TYPES,
  RGB_TAGS,
  bytesToHex,
  decodeBaid64,
  encodeBase64,
  encodeBaid64,
  hexToBytes,
  parseInvoice,
  randomBytes,
  sha256,
  taggedHash,
} from './encodingUtils';

type Tool = 'baid64' | 'hash' | 'invoice';

export default function EncodingPlayground() {
  const [activeTool, setActiveTool] = useState<Tool>('baid64');
  const tab = (t: Tool, label: string) => (
    <button className={activeTool === t ? styles.active : ''} onClick={() => setActiveTool(t)}>
      {label}
    </button>
  );
  return (
    <div className={styles.playground}>
      <div className={styles.toolTabs}>
        {tab('baid64', 'Baid64 ids')}
        {tab('hash', 'Tagged hash')}
        {tab('invoice', 'Invoice parser')}
      </div>
      <div className={styles.toolContent}>
        {activeTool === 'baid64' && <Baid64Tool />}
        {activeTool === 'hash' && <HashTool />}
        {activeTool === 'invoice' && <InvoiceTool />}
      </div>
    </div>
  );
}

const lineName = (l: 'A' | 'B') => (l === 'B' ? 'v0.11' : 'v0.12');

function Output({label, value}: {label: string; value: string}) {
  return (
    <div className={styles.formatOutput}>
      <label>{label}</label>
      <code className={styles.codeBlock}>{value}</code>
      <button onClick={() => navigator.clipboard.writeText(value)} title="Copy">
        Copy
      </button>
    </div>
  );
}

function Baid64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [typeKey, setTypeKey] = useState('b-contract');
  const [hex, setHex] = useState('09ad1de65e4a0abe169ba228c14927eadd8d1eb823911d4a46b785b55061011d');
  const [text, setText] = useState(ID_TYPES[0].example);
  const type = ID_TYPES.find((t) => t.key === typeKey)!;

  const encoded = useMemo(() => {
    try {
      const bytes = hexToBytes(hex);
      if (bytes.length !== type.len) throw new Error(`A ${type.label.toLowerCase()} is ${type.len} bytes; this is ${bytes.length}`);
      return {bytes, error: ''};
    } catch (e) {
      return {bytes: null, error: (e as Error).message};
    }
  }, [hex, type]);

  const decoded = useMemo(() => {
    try {
      return {d: decodeBaid64(text, type.opts.hri, type.len), error: ''};
    } catch (e) {
      return {d: null, error: (e as Error).message};
    }
  }, [text, type]);

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>Baid64 encoder and decoder</h3>
        <div className={styles.modeSwitch}>
          <button className={mode === 'encode' ? styles.active : ''} onClick={() => setMode('encode')}>Encode</button>
          <button className={mode === 'decode' ? styles.active : ''} onClick={() => setMode('decode')}>Decode</button>
        </div>
      </div>

      <p className={styles.description}>
        A port of the <code>baid64</code> crate 0.4.x used by both RGB lines: Base64 with the alphabet{' '}
        <code>A–Z a–z 0–9 _ ~</code>, an optional prefix, <code>-</code> chunks (8 characters, then 7), and a
        4-byte checksum <code>h[0] h[1] h[1] h[2]</code> of <code>h = SHA-256(SHA-256(prefix) ‖ payload)</code>,
        embedded or shown as three words after <code>#</code>. See{' '}
        <a href="/technical-reference/encodings">Encoding formats</a>.
      </p>

      <div className={styles.inputSection}>
        <label>Id type</label>
        <select className={styles.formInput} value={typeKey} onChange={(e) => {
          const t = ID_TYPES.find((x) => x.key === e.target.value)!;
          setTypeKey(t.key);
          setText(t.example);
        }}>
          {ID_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {lineName(t.line)}: {t.label} ({t.opts.prefix ? `${t.opts.hri}:` : `HRI ${t.opts.hri}, no prefix`})
            </option>
          ))}
        </select>
        <small>Settings from {type.source}.</small>
      </div>

      {mode === 'encode' ? (
        <div className={styles.ioSection}>
          <div className={styles.inputSection}>
            <label>
              Payload ({type.len} bytes, hex)
              <button className={styles.exampleBtn} onClick={() => setHex(bytesToHex(randomBytes(type.len)))}>
                Random bytes
              </button>
            </label>
            <textarea value={hex} onChange={(e) => setHex(e.target.value)} rows={2} />
          </div>
          {encoded.error ? (
            <div className={styles.error}>{encoded.error}</div>
          ) : (
            encoded.bytes && (
              <>
                <Output label={`${lineName(type.line)} ${type.label}`} value={encodeBaid64(encoded.bytes, type.opts)} />
                {type.len === 32 && (
                  <>
                    <Output label="Same bytes as a v0.11 contract id" value={encodeBaid64(encoded.bytes, ID_TYPES[0].opts)} />
                    <Output label="Same bytes as a v0.12 contract id" value={encodeBaid64(encoded.bytes, ID_TYPES[5].opts)} />
                  </>
                )}
                <Output label="Plain Base64, for comparison" value={encodeBase64(encoded.bytes)} />
                <div className={styles.info}>
                  The same bytes print differently per id type, and the checksum depends on the prefix, so an id
                  from one type or line doesn't parse as another. Random bytes give a well-formed string, not an id
                  of anything that exists.
                </div>
              </>
            )
          )}
        </div>
      ) : (
        <div className={styles.ioSection}>
          <div className={styles.inputSection}>
            <label>
              Baid64 string
              <button className={styles.exampleBtn} onClick={() => setText(type.example)}>Real example</button>
            </label>
            <input type="text" className={styles.largeInput} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          {decoded.error ? (
            <div className={styles.error}>{decoded.error}</div>
          ) : (
            decoded.d && (
              <div className={styles.parsedOutput}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Prefix:</span>
                  <code>{decoded.d.hri === null ? '(none)' : `${decoded.d.hri}:`}</code>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Payload:</span>
                  <code className={styles.codeBlock}>{bytesToHex(decoded.d.payload)}</code>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Checksum:</span>
                  <code>
                    {decoded.d.checksum
                      ? `${bytesToHex(decoded.d.checksum)} (${decoded.d.checksumSource}) ${decoded.d.checksumValid ? 'valid' : 'WRONG'}`
                      : 'none carried, so typos are not detected'}
                  </code>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function HashTool() {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'text' | 'hex'>('text');
  const [tag, setTag] = useState(RGB_TAGS[0].tag);

  const result = useMemo(() => {
    try {
      const bytes = inputType === 'hex' ? hexToBytes(input) : new TextEncoder().encode(input);
      return {plain: bytesToHex(sha256(bytes)), tagged: bytesToHex(taggedHash(tag, bytes)), error: ''};
    } catch (e) {
      return {plain: '', tagged: '', error: (e as Error).message};
    }
  }, [input, inputType, tag]);

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>Tagged SHA-256</h3>
        <div className={styles.modeSwitch}>
          <button className={inputType === 'text' ? styles.active : ''} onClick={() => setInputType('text')}>Text</button>
          <button className={inputType === 'hex' ? styles.active : ''} onClick={() => setInputType('hex')}>Hex</button>
        </div>
      </div>

      <p className={styles.description}>
        RGB ids and commitments are tagged hashes, <code>SHA-256(SHA-256(tag) ‖ SHA-256(tag) ‖ data)</code>, where
        the data is the strict encoding of the object. RGB doesn't use Bitcoin's double SHA-256 for its own ids.
        Hashing your own text here shows the construction; it doesn't produce a real RGB id.
      </p>

      <div className={styles.ioSection}>
        <div className={styles.inputSection}>
          <label>Tag</label>
          <select className={styles.formInput} value={tag} onChange={(e) => setTag(e.target.value)}>
            {RGB_TAGS.map((t) => (
              <option key={t.tag} value={t.tag}>
                {t.tag} ({t.use}; {t.line === 'both' ? 'both lines' : lineName(t.line)})
              </option>
            ))}
          </select>
        </div>
        <div className={styles.inputSection}>
          <label>Data</label>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={inputType === 'text' ? 'Enter text…' : 'Enter hex…'} rows={3} />
        </div>
        {result.error ? (
          <div className={styles.error}>{result.error}</div>
        ) : (
          <>
            <Output label="Tagged hash" value={result.tagged} />
            <Output label="Plain SHA-256, for comparison" value={result.plain} />
          </>
        )}
      </div>
    </div>
  );
}

const INVOICE_EXAMPLES = [
  {
    label: 'v0.11, 100 units to a blinded UTXO (rgb-invoicing tests)',
    value: 'rgb:eIbQx5Am-XRDjj01-RM~5eo7-rv2nluD-OnBJRAy-S9~Yfts/XvmU3d4_nQQ8S7oagbXi07x5vjMm7P~ERukQNX6SC4M/BF/bc:utxob:4vm1CX2Z-K8hMo59-e7dgGBS-Jka7mYn-Xe~yP85-yUiHHxr-aVlYa',
  },
  {
    label: 'v0.11, regtest (rgb-sandbox README)',
    value: 'rgb:Tk3d0h5w-8v4XYCg-7e~Sc0o-Lu6rp~X-~Jt7VHS-jqgzFD8/~/BF/bcrt:utxob:MSLQCKkW-w6caphB-12do1nJ-HNfgxvv-WE3zOOC-s8yZyHq-Ihoa5',
  },
  {
    label: 'v0.12, auth-token seal (rgb-wallet 0.12.0-rc.3 output)',
    value: 'contract:tb@contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y/10@at:VbJYsl3B-FccP_ZkJ-Yi49U0M6-DLNra14f-SyXj7URN-pmdnfQ/',
  },
  {
    label: 'v0.12, witness-output seal with API, method and state',
    value: 'contract:tb@contract:nztjpjRX-_NVDDgd-EHENsqL-AKsGsyV-F6LzljB-X4WTv0Y/RGB20/transfer/amount/10@wout:AgAAAAAA-AAAQBDa8-5gLBB7Ak-ElBtuHev-bIGANisj-eXkg/',
  },
];

function InvoiceTool() {
  const [input, setInput] = useState(INVOICE_EXAMPLES[0].value);
  const parsed = useMemo(() => {
    if (!input.trim()) return {p: null, error: ''};
    try {
      return {p: parseInvoice(input), error: ''};
    } catch (e) {
      return {p: null, error: (e as Error).message};
    }
  }, [input]);

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>Invoice parser</h3>
      </div>
      <p className={styles.description}>
        Splits a v0.11 (<code>rgb:…</code>) or v0.12 (<code>contract:…</code>) invoice into its parts, decodes
        the v0.11 base32 amount, and checks the Baid64 checksums of the ids and seals. It checks the structure only,
        not whether the contract exists. See <a href="/technical-reference/invoices">Invoices</a>.
      </p>
      <div className={styles.ioSection}>
        <div className={styles.inputSection}>
          <label>Examples</label>
          <select className={styles.formInput} onChange={(e) => setInput(e.target.value)} value="">
            <option value="" disabled>Load a real example…</option>
            {INVOICE_EXAMPLES.map((x) => (
              <option key={x.value} value={x.value}>{x.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.inputSection}>
          <label>Invoice</label>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} />
        </div>
        {parsed.error ? (
          <div className={styles.error}>{parsed.error}</div>
        ) : (
          parsed.p && (
            <div className={styles.parsedOutput}>
              <h4>{parsed.p.line === 'B' ? 'RGB v0.11 (Line B) invoice' : 'RGB v0.12 (Line A) invoice'}</h4>
              {parsed.p.fields.map((f) => (
                <div className={styles.field} key={f.name + f.value}>
                  <span className={styles.fieldLabel}>{f.name}:</span>
                  <code className={styles.codeBlock}>{f.value}</code>
                  {f.note && <small style={{display: 'block'}}>{f.note}</small>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
