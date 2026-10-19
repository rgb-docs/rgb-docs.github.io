import React, {useState} from 'react';
import styles from './Playground.module.css';
import {ID_TYPES, encodeBaid64, randomBytes} from './encodingUtils';

type Kind = 'nia' | 'uda' | 'cfa';

const KINDS: Record<Kind, {tab: string; title: string; text: string; guide: string}> = {
  nia: {
    tab: 'Fungible token',
    title: 'Fungible token: NIA (v0.11) or RGB20-FNA issuer (v0.12)',
    text: 'A fixed-supply token. In v0.11 it uses the NIA schema; in v0.12 the RGB20-FNA issuer.',
    guide: '/guides/rgb20/creating-tokens',
  },
  uda: {
    tab: 'NFT',
    title: 'Unique digital asset: UDA (v0.11)',
    text: 'One NFT per contract, with an optional media attachment. UDA is a v0.11 schema.',
    guide: '/guides/rgb21/creating-nfts',
  },
  cfa: {
    tab: 'Collectible',
    title: 'Collectible fungible asset: CFA (v0.11)',
    text: 'A fungible token with an optional article string. CFA is a v0.11 schema.',
    guide: '/guides/rgb25/overview',
  },
};

export default function ContractBuilder() {
  const [kind, setKind] = useState<Kind>('nia');
  const [ticker, setTicker] = useState('DEMO');
  const [name, setName] = useState('Demo Asset');
  const [details, setDetails] = useState('');
  const [precision, setPrecision] = useState('0');
  const [supply, setSupply] = useState('1000');
  const [article, setArticle] = useState('');
  const [ids, setIds] = useState<{b: string; a: string} | null>(null);

  const generate = () => {
    const bytes = randomBytes(32);
    setIds({b: encodeBaid64(bytes, ID_TYPES[0].opts), a: encodeBaid64(bytes, ID_TYPES[5].opts)});
  };

  const globals: Record<string, unknown> =
    kind === 'cfa'
      ? {art: article || null, name, details: details || null, precision: Number(precision), issuedSupply: Number(supply)}
      : kind === 'uda'
        ? {spec: {ticker, name, details: details || null, precision: 0}, tokens: [{index: 0, ticker, name}]}
        : {spec: {ticker, name, details: details || null, precision: Number(precision)}, issuedSupply: Number(supply)};
  const owned = kind === 'uda' ? {assetOwner: {seal: '<txid>:<vout>', token: 0, fraction: 1}} : {assetOwner: {seal: '<txid>:<vout>', amount: Number(supply)}};
  const sketch = JSON.stringify({illustrative: true, kind: kind.toUpperCase(), globals, owned}, null, 2);

  const field = (label: string, value: string, set: (v: string) => void, type = 'text') => (
    <div className={styles.formField}>
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => set(e.target.value)} className={styles.formInput} />
    </div>
  );

  return (
    <div className={styles.playground}>
      <div className={styles.info} style={{marginBottom: '1rem'}}>
        <strong>Illustrative, not a real RGB format.</strong> This form shows which fields a contract of each kind has.
        It doesn't build or validate a contract, and the JSON below can't be issued. The ids are random bytes in each
        line's id format. To issue a real contract, follow the guide linked below.
      </div>

      <div className={styles.toolTabs}>
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button key={k} className={kind === k ? styles.active : ''} onClick={() => { setKind(k); setIds(null); }}>
            {KINDS[k].tab}
          </button>
        ))}
      </div>

      <div className={styles.toolContent}>
        <div className={styles.tool}>
          <div className={styles.toolHeader}>
            <h3>{KINDS[kind].title}</h3>
          </div>
          <p className={styles.description}>{KINDS[kind].text}</p>

          <div className={styles.formGrid}>
            {kind !== 'cfa' && field('Ticker', ticker, (v) => setTicker(v.toUpperCase()))}
            {field('Name', name, setName)}
            {field('Details (optional)', details, setDetails)}
            {kind !== 'uda' && field('Precision (decimal places)', precision, setPrecision, 'number')}
            {kind !== 'uda' && field('Issued supply (smallest units)', supply, setSupply, 'number')}
            {kind === 'cfa' && field('Article (optional)', article, setArticle)}
          </div>

          <button className={styles.primaryBtn} onClick={generate} disabled={!name}>
            Show sketch
          </button>

          {ids && (
            <div className={styles.generatedContract}>
              <div className={styles.contractPreview}>
                <div className={styles.previewField}>
                  <span>v0.11 id format:</span>
                  <code>{ids.b}</code>
                </div>
                {kind === 'nia' && (
                  <div className={styles.previewField}>
                    <span>v0.12 id format:</span>
                    <code>{ids.a}</code>
                  </div>
                )}
              </div>
              <div className={styles.exportSection}>
                <label>Field sketch (illustrative):</label>
                <pre className={styles.codeExport}>{sketch}</pre>
              </div>
              <div className={styles.info}>
                Field names follow the v0.11 <code>rgb-schemas</code> 0.11.1 schemas. A real contract id is a tagged hash
                of the genesis, and a seal is an outpoint of your wallet. Next step: the{' '}
                <a href={KINDS[kind].guide}>guide for this asset type</a>
                {kind === 'nia' && <> or, for v0.12, the <a href="/getting-started/quick-start">Quick Start</a></>}.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
