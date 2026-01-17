import React, { useState, useEffect } from 'react';
import styles from './Playground.module.css';
import {
  hexToBytes,
  bytesToHex,
  encodeBaid64,
  decodeBaid64,
  parseRgbId,
  formatContractId,
  commitmentHash,
  isValidHex,
  isValidBaid64,
  generateExampleContractId,
  encodeBase64,
  encodeBech32,
  encodeBase58,
} from './encodingUtils';

type Tool = 'baid64' | 'hex' | 'hash' | 'invoice';

export default function EncodingPlayground() {
  const [activeTool, setActiveTool] = useState<Tool>('baid64');

  return (
    <div className={styles.playground}>
      <div className={styles.toolTabs}>
        <button
          className={activeTool === 'baid64' ? styles.active : ''}
          onClick={() => setActiveTool('baid64')}>
          BAID64 Encoder
        </button>
        <button
          className={activeTool === 'hex' ? styles.active : ''}
          onClick={() => setActiveTool('hex')}>
          Hex Converter
        </button>
        <button
          className={activeTool === 'hash' ? styles.active : ''}
          onClick={() => setActiveTool('hash')}>
          Hash Calculator
        </button>
        <button
          className={activeTool === 'invoice' ? styles.active : ''}
          onClick={() => setActiveTool('invoice')}>
          Invoice Parser
        </button>
      </div>

      <div className={styles.toolContent}>
        {activeTool === 'baid64' && <Baid64Tool />}
        {activeTool === 'hex' && <HexTool />}
        {activeTool === 'hash' && <HashTool />}
        {activeTool === 'invoice' && <InvoiceTool />}
      </div>
    </div>
  );
}

function Baid64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleConvert = () => {
    setError('');
    try {
      if (mode === 'encode') {
        const bytes = hexToBytes(input);
        const baid64 = encodeBaid64(bytes);
        setOutput(baid64);
      } else {
        const bytes = decodeBaid64(input);
        const hex = bytesToHex(bytes);
        setOutput(hex);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const loadExample = () => {
    if (mode === 'encode') {
      setInput('4a2b3c4d5e6f7081920a3b4c5d6e7f8091a2b3c4d5e6f7081920a3b4c5d6e7f80');
      setError('');
    } else {
      setInput('2Ky4xDT-VyLmtp9Y-XmKinHXG-utaq8UBu-qjfqDiUM-8bHNdBb');
      setError('');
    }
  };

  useEffect(() => {
    if (input) handleConvert();
  }, [input, mode]);

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>BAID64 Encoder/Decoder</h3>
        <div className={styles.modeSwitch}>
          <button
            className={mode === 'encode' ? styles.active : ''}
            onClick={() => setMode('encode')}>
            Encode
          </button>
          <button
            className={mode === 'decode' ? styles.active : ''}
            onClick={() => setMode('decode')}>
            Decode
          </button>
        </div>
      </div>

      <p className={styles.description}>
        {mode === 'encode'
          ? 'Convert hex bytes to BAID64 format (Base58 with separators)'
          : 'Decode BAID64 back to hex bytes'}
      </p>

      <div className={styles.ioSection}>
        <div className={styles.inputSection}>
          <label>
            Input {mode === 'encode' ? '(Hex)' : '(BAID64)'}:
            <button className={styles.exampleBtn} onClick={loadExample}>
              Load Example
            </button>
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'encode'
                ? '4a2b3c4d5e6f708192...'
                : '2Ky4xDT-VyLmtp9Y-XmKinHXG-...'
            }
            rows={4}
          />
        </div>

        <div className={styles.arrow}>↓</div>

        <div className={styles.outputSection}>
          <label>Output {mode === 'encode' ? '(BAID64)' : '(Hex)'}:</label>
          {error ? (
            <div className={styles.error}>❌ {error}</div>
          ) : (
            <div className={styles.outputBox}>
              {output || <span className={styles.placeholder}>Result will appear here...</span>}
            </div>
          )}
          {output && !error && (
            <button
              className={styles.copyBtn}
              onClick={() => navigator.clipboard.writeText(output)}>
              📋 Copy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HexTool() {
  const [input, setInput] = useState('');
  const [hexOutput, setHexOutput] = useState('');
  const [baid64Output, setBaid64Output] = useState('');
  const [rgbIdOutput, setRgbIdOutput] = useState('');
  const [base64Output, setBase64Output] = useState('');
  const [base58Output, setBase58Output] = useState('');
  const [bech32Output, setBech32Output] = useState('');
  const [error, setError] = useState('');

  const handleConvert = () => {
    setError('');
    try {
      const bytes = hexToBytes(input);
      setHexOutput(bytesToHex(bytes));
      setBaid64Output(encodeBaid64(bytes));
      setRgbIdOutput(formatContractId(bytes));
      setBase64Output(encodeBase64(bytes));
      setBase58Output(encodeBase58(bytes));
      setBech32Output(encodeBech32('rgb', bytes));
    } catch (e) {
      setError(e.message);
      setHexOutput('');
      setBaid64Output('');
      setRgbIdOutput('');
      setBase64Output('');
      setBase58Output('');
      setBech32Output('');
    }
  };

  const generateRandom = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setInput(bytesToHex(bytes));
  };

  useEffect(() => {
    if (input) handleConvert();
  }, [input]);

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>Hex to All Formats</h3>
        <button className={styles.exampleBtn} onClick={generateRandom}>
          🎲 Generate Random 32 bytes
        </button>
      </div>

      <p className={styles.description}>
        Convert hex bytes to all RGB encoding formats
      </p>

      <div className={styles.ioSection}>
        <div className={styles.inputSection}>
          <label>Hex Input (32 bytes for Contract ID):</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="4a2b3c4d5e6f7081920a3b4c5d6e7f8091a2b3c4d5e6f7081920a3b4c5d6e7f80"
            rows={3}
          />
        </div>

        {error ? (
          <div className={styles.error}>❌ {error}</div>
        ) : (
          hexOutput && (
            <>
              <div className={styles.formatOutput}>
                <label>Formatted Hex:</label>
                <code className={styles.codeBlock}>{hexOutput}</code>
                <button onClick={() => navigator.clipboard.writeText(hexOutput)}>
                  📋
                </button>
              </div>

              <div className={styles.formatOutput}>
                <label>BAID64:</label>
                <code className={styles.codeBlock}>{baid64Output}</code>
                <button onClick={() => navigator.clipboard.writeText(baid64Output)}>
                  📋
                </button>
              </div>

              <div className={styles.formatOutput}>
                <label>RGB Contract ID:</label>
                <code className={styles.codeBlock}>{rgbIdOutput}</code>
                <button onClick={() => navigator.clipboard.writeText(rgbIdOutput)}>
                  📋
                </button>
              </div>

              <div className={styles.formatOutput}>
                <label>Base64:</label>
                <code className={styles.codeBlock}>{base64Output}</code>
                <button onClick={() => navigator.clipboard.writeText(base64Output)}>
                  📋
                </button>
              </div>

              <div className={styles.formatOutput}>
                <label>Base58:</label>
                <code className={styles.codeBlock}>{base58Output}</code>
                <button onClick={() => navigator.clipboard.writeText(base58Output)}>
                  📋
                </button>
              </div>

              <div className={styles.formatOutput}>
                <label>Bech32 (rgb prefix):</label>
                <code className={styles.codeBlock}>{bech32Output}</code>
                <button onClick={() => navigator.clipboard.writeText(bech32Output)}>
                  📋
                </button>
              </div>

              <div className={styles.info}>
                ℹ️ Length: {hexOutput.length / 2} bytes | All formats represent the same data
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

function HashTool() {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'text' | 'hex'>('text');
  const [hash, setHash] = useState('');
  const [doubleHash, setDoubleHash] = useState('');

  const calculateHash = async () => {
    try {
      const bytes = inputType === 'hex' ? hexToBytes(input) : new TextEncoder().encode(input);
      const hashBytes = await commitmentHash(bytes);
      const hashHex = bytesToHex(hashBytes);
      setDoubleHash(hashHex);
      setHash(hashHex);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (input) {
      calculateHash();
    }
  }, [input, inputType]);

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>Commitment Hash Calculator</h3>
        <div className={styles.modeSwitch}>
          <button
            className={inputType === 'text' ? styles.active : ''}
            onClick={() => setInputType('text')}>
            Text
          </button>
          <button
            className={inputType === 'hex' ? styles.active : ''}
            onClick={() => setInputType('hex')}>
            Hex
          </button>
        </div>
      </div>

      <p className={styles.description}>
        Calculate SHA-256 commitment hash (double SHA-256) used in RGB
      </p>

      <div className={styles.ioSection}>
        <div className={styles.inputSection}>
          <label>Input Data:</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputType === 'text' ? 'Enter text...' : 'Enter hex...'}
            rows={4}
          />
        </div>

        {hash && (
          <>
            <div className={styles.arrow}>↓ SHA-256 ↓ SHA-256</div>
            <div className={styles.formatOutput}>
              <label>Commitment Hash:</label>
              <code className={styles.codeBlock}>{doubleHash}</code>
              <button onClick={() => navigator.clipboard.writeText(doubleHash)}>
                📋
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InvoiceTool() {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<{
    prefix: string;
    baid64: string;
    hex: string;
    bytes: number;
  } | null>(null);
  const [error, setError] = useState('');

  const handleParse = () => {
    setError('');
    setParsed(null);
    try {
      const result = parseRgbId(input);
      setParsed({
        prefix: result.prefix,
        baid64: result.baid64,
        hex: bytesToHex(result.bytes),
        bytes: result.bytes.length,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const loadExample = () => {
    setInput(generateExampleContractId());
  };

  useEffect(() => {
    if (input) handleParse();
  }, [input]);

  return (
    <div className={styles.tool}>
      <div className={styles.toolHeader}>
        <h3>RGB Invoice/ID Parser</h3>
        <button className={styles.exampleBtn} onClick={loadExample}>
          Load Example
        </button>
      </div>

      <p className={styles.description}>
        Parse RGB contract IDs, invoices, and other RGB-prefixed identifiers
      </p>

      <div className={styles.ioSection}>
        <div className={styles.inputSection}>
          <label>RGB ID:</label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="rgb:2Ky4xDT-VyLmtp9Y-XmKinHXG-utaq8UBu-qjfqDiUM-8bHNdBb"
            className={styles.largeInput}
          />
        </div>

        {error ? (
          <div className={styles.error}>❌ {error}</div>
        ) : (
          parsed && (
            <div className={styles.parsedOutput}>
              <h4>✅ Parsed Successfully</h4>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Prefix:</span>
                <code>{parsed.prefix}</code>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>BAID64:</span>
                <code className={styles.codeBlock}>{parsed.baid64}</code>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Hex:</span>
                <code className={styles.codeBlock}>{parsed.hex}</code>
                <button onClick={() => navigator.clipboard.writeText(parsed.hex)}>
                  📋
                </button>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Size:</span>
                <code>{parsed.bytes} bytes</code>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
