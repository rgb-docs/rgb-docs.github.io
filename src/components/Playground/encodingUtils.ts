/**
 * Encoding helpers for the playground.
 *
 * Baid64 is a port of the `baid64` crate 0.4.x (UBIDECO, `src/lib.rs`), used by both RGB lines
 * (Line A pins 0.4.2, Line B 0.4.1; the encoding is identical). The mnemonic suffix follows the
 * `mnemonic` crate 1.1.1. Tagged hashes follow `commit_verify` (BIP-340 style tagged SHA-256).
 */
import {MN_BASE, MN_WORDS} from './mnemonicWords';

// ---- bytes -------------------------------------------------------------------------------

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '').replace(/\s/g, '');
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('Not a hex string');
  if (clean.length % 2 !== 0) throw new Error('Hex string must have an even length');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(2 * i, 2 * i + 2), 16);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return bytes;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// ---- SHA-256 (synchronous, so ids can be computed while typing) ---------------------------

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(data: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + 4 * i);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = Array.from(h);
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(4 * i, h[i]);
  return out;
}

const utf8 = (s: string) => new TextEncoder().encode(s);

/** Tagged SHA-256, as in `commit_verify`: SHA-256(SHA-256(tag) ‖ SHA-256(tag) ‖ data). */
export function taggedHash(tag: string, data: Uint8Array): Uint8Array {
  const t = sha256(utf8(tag));
  return sha256(concat(t, t, data));
}

/** Tags used by RGB for ids and commitments (`const TAG` in the pinned crates). */
export const RGB_TAGS: {tag: string; use: string; line: 'A' | 'B' | 'both'}[] = [
  {tag: 'urn:lnp-bp:rgb:operation#2024-02-03', use: 'Operation id; the contract id is the genesis id', line: 'B'},
  {tag: 'urn:lnp-bp:rgb:bundle#2024-02-03', use: 'Transition bundle id', line: 'B'},
  {tag: 'urn:lnp-bp:rgb:schema#2024-02-03', use: 'Schema id', line: 'B'},
  {tag: 'urn:lnp-bp:seals:secret#2024-02-03', use: 'Blinded seal (SecretSeal)', line: 'B'},
  {tag: 'urn:ubideco:sonic:contract#2024-11-16', use: 'Contract id', line: 'A'},
  {tag: 'urn:ubideco:sonic:codex#2025-05-15', use: 'Codex id', line: 'A'},
  {tag: 'urn:ubideco:ultrasonic:operation#2024-11-14', use: 'Operation id', line: 'A'},
  {tag: 'urn:lnp-bp:mmb:bundle#2024-11-18', use: 'Multi-message bundle', line: 'A'},
  {tag: 'urn:ubideco:mpc:commitment#2024-01-31', use: 'MPC commitment', line: 'both'},
  {tag: 'urn:ubideco:merkle:node#2024-01-31', use: 'Merkle nodes and MPC leaves', line: 'both'},
];

// ---- Base64 with the Baid64 alphabet, no padding ------------------------------------------

export const BAID64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_~';
const STD64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64encode(bytes: Uint8Array, alphabet: string): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let j = 0; j < chars; j++) out += alphabet[(n >> (18 - 6 * j)) & 63];
  }
  return out;
}

function b64decode(s: string, alphabet: string): Uint8Array {
  if (s.length % 4 === 1) throw new Error('Invalid Base64 length');
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of s) {
    const v = alphabet.indexOf(ch);
    if (v < 0) throw new Error(`Invalid symbol '${ch}' (the Baid64 alphabet is A–Z a–z 0–9 _ ~)`);
    acc = ((acc << 6) | v) & 0xffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  if (bits > 0 && (acc & ((1 << bits) - 1)) !== 0) throw new Error('Invalid trailing bits');
  return Uint8Array.from(out);
}

/** Plain Base64 (RFC 4648, with padding), for comparison. */
export function encodeBase64(bytes: Uint8Array): string {
  const s = b64encode(bytes, STD64_ALPHABET);
  return s + '='.repeat((4 - (s.length % 4)) % 4);
}

// ---- mnemonic (`mnemonic` crate 1.1.1), used for the 4-byte checksum ----------------------

export function mnemonicEncode(checksum: Uint8Array): string {
  const x = (checksum[0] | (checksum[1] << 8) | (checksum[2] << 16) | (checksum[3] << 24)) >>> 0;
  return [x % MN_BASE, Math.floor(x / MN_BASE) % MN_BASE, Math.floor(x / (MN_BASE * MN_BASE)) % MN_BASE]
    .map((i) => MN_WORDS[i])
    .join('-');
}

export function mnemonicDecode(s: string): Uint8Array {
  const words = s.split(/[^a-z]+/i).filter(Boolean).map((w) => w.toLowerCase());
  if (words.length !== 3) throw new Error('The mnemonic suffix must have three words');
  const idx = words.map((w) => {
    const i = MN_WORDS.indexOf(w);
    if (i < 0 || i >= MN_BASE) throw new Error(`Unknown mnemonic word '${w}'`);
    return i;
  });
  const x = idx[0] + idx[1] * MN_BASE + idx[2] * MN_BASE * MN_BASE;
  if (x > 0xffffffff) throw new Error('Invalid mnemonic encoding');
  return Uint8Array.from([x & 0xff, (x >>> 8) & 0xff, (x >>> 16) & 0xff, (x >>> 24) & 0xff]);
}

// ---- Baid64 --------------------------------------------------------------------------------

export interface Baid64Options {
  hri: string;
  chunking: boolean;
  chunkFirst: number;
  chunkLen: number;
  prefix: boolean;
  embedChecksum: boolean;
  mnemonic: boolean;
}

/** The 4-byte checksum: h = SHA-256(SHA-256(hri) ‖ payload), then h[0] h[1] h[1] h[2]. */
export function baid64Checksum(hri: string, payload: Uint8Array): Uint8Array {
  const h = sha256(concat(sha256(utf8(hri)), payload));
  return Uint8Array.from([h[0], h[1], h[1], h[2]]);
}

export function encodeBaid64(payload: Uint8Array, o: Baid64Options): string {
  const checksum = baid64Checksum(o.hri, payload);
  const s = b64encode(o.embedChecksum ? concat(payload, checksum) : payload, BAID64_ALPHABET);
  let body = s;
  if (o.chunking) {
    const parts = [s.slice(0, o.chunkFirst)];
    for (let i = o.chunkFirst; i < s.length; i += o.chunkLen) parts.push(s.slice(i, i + o.chunkLen));
    body = parts.join('-');
  }
  return (o.prefix ? `${o.hri}:` : '') + body + (o.mnemonic ? `#${mnemonicEncode(checksum)}` : '');
}

export interface Baid64Decoded {
  hri: string | null;
  payload: Uint8Array;
  /** The checksum carried by the string (embedded or mnemonic), if any. */
  checksum: Uint8Array | null;
  checksumSource: 'embedded' | 'mnemonic' | null;
  /** Whether the carried checksum matches; null if the string carries none. */
  checksumValid: boolean | null;
}

/**
 * Parse like `FromBaid64Str`: an optional `<hri>:` prefix (split at the last colon), an optional
 * `#mnemonic`, `-` separators removed, and an optional embedded checksum (payload length + 4).
 */
export function decodeBaid64(str: string, hri: string, len: number): Baid64Decoded {
  let s = str.trim();
  let foundHri: string | null = null;
  const colon = s.lastIndexOf(':');
  if (colon >= 0) {
    foundHri = s.slice(0, colon);
    if (foundHri !== hri) throw new Error(`Invalid prefix '${foundHri}:' ('${hri}:' is expected)`);
    s = s.slice(colon + 1);
  }
  let checksum: Uint8Array | null = null;
  let checksumSource: Baid64Decoded['checksumSource'] = null;
  const hash = s.indexOf('#');
  if (hash >= 0) {
    checksum = mnemonicDecode(s.slice(hash + 1));
    checksumSource = 'mnemonic';
    s = s.slice(0, hash);
  }
  const data = b64decode(s.replace(/-/g, ''), BAID64_ALPHABET);
  if (data.length !== len && data.length !== len + 4) {
    throw new Error(`Invalid length: ${data.length} bytes (expected ${len}, or ${len + 4} with a checksum)`);
  }
  const payload = data.slice(0, len);
  if (data.length === len + 4) {
    checksum = data.slice(len);
    checksumSource = 'embedded';
  }
  const expected = baid64Checksum(hri, payload);
  const checksumValid = checksum ? checksum.every((b, i) => b === expected[i]) : null;
  return {hri: foundHri, payload, checksum, checksumSource, checksumValid};
}

/** Identifier types and their `DisplayBaid64` settings in the pinned crates. */
export interface IdType {
  key: string;
  label: string;
  line: 'A' | 'B';
  len: number;
  opts: Baid64Options;
  example: string;
  source: string;
}

const opt = (
  hri: string,
  chunking: boolean,
  prefix: boolean,
  embedChecksum: boolean,
  mnemonic: boolean,
  chunkFirst = 8,
  chunkLen = 7,
): Baid64Options => ({hri, chunking, chunkFirst, chunkLen, prefix, embedChecksum, mnemonic});

export const ID_TYPES: IdType[] = [
  {
    key: 'b-contract', label: 'Contract id', line: 'B', len: 32, opts: opt('rgb', true, true, false, false),
    example: 'rgb:Ca0d5l5K-Cr4Wm6I-owUkn6t-2NHrgjk-R1KRreF-tVBhAR0',
    source: 'rgb-consensus 0.11.1 src/operation/commit.rs',
  },
  {
    key: 'b-schema', label: 'Schema id', line: 'B', len: 32, opts: opt('rgb:sch', false, true, false, true),
    example: 'rgb:sch:RWhwUfTMpuP2Zfx1~j4nswCANGeJrYOqDcKelaMV4zU#remote-digital-pegasus',
    source: 'rgb-consensus 0.11.1 src/schema/schema.rs',
  },
  {
    key: 'b-utxob', label: 'Blinded seal (utxob)', line: 'B', len: 32, opts: opt('utxob', true, true, true, false),
    example: 'utxob:4vm1CX2Z-K8hMo59-e7dgGBS-Jka7mYn-Xe~yP85-yUiHHxr-aVlYa',
    source: 'rgb-consensus 0.11.1 src/seals/secret.rs',
  },
  {
    key: 'b-wvout', label: 'Witness output (wvout)', line: 'B', len: 33, opts: opt('wvout', true, true, true, false),
    example: 'wvout:A8cJ7Ww3-NIzADo3-Tzp_5aD-7CTBWmA-AAAAAAA-AAAAAAA-ALSQkcw',
    source: 'rgb-invoicing 0.11.1 invoice/src/parse.rs',
  },
  {
    key: 'b-alu', label: 'AluVM library', line: 'B', len: 32, opts: opt('alu', true, true, false, true),
    example: 'alu:q~CZ0ovt-UN9eBlc-VMn86mz-Kfd3ywu-f7~9jTB-k6A8tiY#japan-nylon-center',
    source: 'rgb-aluvm 0.11.1 src/library/lib.rs',
  },
  {
    key: 'a-contract', label: 'Contract id', line: 'A', len: 32, opts: opt('contract', true, true, false, false),
    example: 'contract:XgHwkqS4-RcYeRtr-Mizxpov-FobureK-sx0~AD5-xAt5jV4',
    source: 'ultrasonic 0.12.0 src/issue.rs',
  },
  {
    key: 'a-codex', label: 'Codex id', line: 'A', len: 32, opts: opt('codex', true, false, false, true),
    example: '7C15w3W1-L0T~zXw-Aeh5~kV-Zquz729-HXQFKQW-_5lX9O8#heavy-cactus-quiet',
    source: 'ultrasonic 0.12.0 src/codex.rs',
  },
  {
    key: 'a-opid', label: 'Operation id', line: 'A', len: 32, opts: opt('usop', false, false, false, false),
    example: 'rtVWyitimkZyM4bDei2AcftvX0HKur8kfdf~0Ku2Ry8',
    source: 'ultrasonic 0.12.0 src/operation.rs',
  },
  {
    key: 'a-at', label: 'Auth token (at)', line: 'A', len: 30, opts: opt('at', true, true, true, false, 8, 8),
    example: 'at:VbJYsl3B-FccP_ZkJ-Yi49U0M6-DLNra14f-SyXj7URN-pmdnfQ',
    source: 'ultrasonic 0.12.0 src/state.rs',
  },
];

// ---- invoices --------------------------------------------------------------------------------

/** Line B invoice amounts: little-endian bytes in base32 without digits (rgb-invoicing amount.rs). */
const B32_NODIGIT = 'abcdefghkmnABCDEFGHKMNPQRSTVWXYZ';

export function decodeInvoiceAmount(s: string): bigint {
  let acc = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const ch of s) {
    const v = B32_NODIGIT.indexOf(ch);
    if (v < 0) throw new Error(`'${ch}' is not in the amount alphabet`);
    acc = ((acc << 5) | v) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  if (bytes.length > 8) throw new Error('Amount is longer than 8 bytes');
  return bytes.reduceRight((n, b) => (n << BigInt(8)) | BigInt(b), BigInt(0));
}

export function encodeInvoiceAmount(amount: bigint): string {
  const bytes: number[] = [];
  let n = amount;
  do {
    bytes.push(Number(n & BigInt(0xff)));
    n >>= BigInt(8);
  } while (n > BigInt(0));
  let out = '';
  let acc = 0;
  let bits = 0;
  for (const b of bytes) {
    acc = ((acc << 8) | b) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += B32_NODIGIT[(acc >> bits) & 31];
    }
  }
  if (bits > 0) out += B32_NODIGIT[(acc << (5 - bits)) & 31];
  return out;
}

export interface InvoiceField {
  name: string;
  value: string;
  note?: string;
}

export interface ParsedInvoice {
  line: 'A' | 'B';
  fields: InvoiceField[];
}

const B_CHAINS: Record<string, string> = {
  bc: 'Bitcoin mainnet', tb3: 'Bitcoin testnet3', tb4: 'Bitcoin testnet4', sb: 'Bitcoin signet',
  sbc: 'Bitcoin custom signet', bcrt: 'Bitcoin regtest', lq: 'Liquid mainnet', tl: 'Liquid testnet',
};

const A_LAYER1: Record<string, string> = {
  bc: 'Bitcoin mainnet', tb: 'Bitcoin test network', lq: 'Liquid', tl: 'Liquid testnet',
};

function checkId(type: string, s: string): string {
  const t = ID_TYPES.find((x) => x.key === type)!;
  const d = decodeBaid64(s, t.opts.hri, t.len);
  const ck = d.checksumValid === null ? 'no checksum' : d.checksumValid ? 'checksum OK' : 'CHECKSUM WRONG';
  return `${bytesToHex(d.payload)} (${ck})`;
}

/** Parse the structure of a Line B (`rgb:`) or Line A (`contract:`) invoice. */
export function parseInvoice(input: string): ParsedInvoice {
  const s = input.trim();
  const q = s.indexOf('?');
  const path = q >= 0 ? s.slice(0, q) : s;
  const params = q >= 0 ? s.slice(q + 1).split('&').map((p) => p.split('=', 2)) : [];
  if (s.startsWith('rgb:')) {
    const parts = path.slice(4).split('/');
    if (parts.length !== 4) throw new Error('A v0.11 invoice has four parts: contract/schema/state/beneficiary');
    const [cid, schema, state, beneficiary] = parts;
    const fields: InvoiceField[] = [];
    fields.push({
      name: 'Contract id', value: cid === '~' ? '~ (any)' : `rgb:${cid}`,
      note: cid === '~' ? undefined : checkId('b-contract', `rgb:${cid}`),
    });
    fields.push({
      name: 'Schema id', value: schema === '~' ? '~ (not given)' : schema,
      note: schema === '~' ? undefined : checkId('b-schema', schema),
    });
    let stateNote: string | undefined;
    if (state !== '~' && state.includes('@')) {
      const [fraction, index] = state.split('@');
      stateNote = `UDA allocation: fraction ${fraction} of token ${index}`;
    } else if (state !== '~') stateNote = `amount ${decodeInvoiceAmount(state).toString()}`;
    fields.push({name: 'State', value: state, note: stateNote});
    const c = beneficiary.indexOf(':');
    if (c < 0) throw new Error('The beneficiary needs a chain prefix, e.g. bc:utxob:…');
    const chain = beneficiary.slice(0, c);
    const seal = beneficiary.slice(c + 1);
    fields.push({name: 'Chain', value: chain, note: B_CHAINS[chain] ?? 'unknown chain prefix'});
    if (seal.startsWith('utxob:')) {
      fields.push({name: 'Seal', value: seal, note: `blinded UTXO, ${checkId('b-utxob', seal)}`});
    } else if (seal.startsWith('wvout:')) {
      const [vout, ipk] = seal.split('+');
      fields.push({name: 'Seal', value: vout, note: `witness output, ${checkId('b-wvout', vout)}`});
      if (ipk) fields.push({name: 'Internal key', value: ipk});
    } else fields.push({name: 'Seal', value: seal, note: 'unknown seal type'});
    for (const [k, v] of params) {
      fields.push({
        name: `?${k}`, value: decodeURIComponent(v ?? ''),
        note: k === 'expiry' && /^\d+$/.test(v ?? '') ? new Date(Number(v) * 1000).toISOString() : undefined,
      });
    }
    return {line: 'B', fields};
  }
  if (s.startsWith('contract:')) {
    const m = path.match(/^contract:([a-z]+)@(.*)$/);
    if (!m) throw new Error('A v0.12 invoice starts with contract:<layer1>@');
    const [, layer1, rest] = m;
    const parts = rest.replace(/\/$/, '').split('/');
    const fields: InvoiceField[] = [{name: 'Layer 1', value: layer1, note: A_LAYER1[layer1] ?? 'unknown'}];
    const scope = parts.shift() ?? '';
    fields.push({
      name: 'Contract', value: scope,
      note: scope.length > 'contract:'.length ? checkId('a-contract', scope) : 'no contract id',
    });
    const last = parts.pop() ?? '';
    const names = [[], ['API or method'], ['API or method', 'Method or state'], ['API', 'Method', 'State']][parts.length] ?? [];
    parts.forEach((p, i) => fields.push({name: names[i] ?? 'Path', value: p}));
    const at = last.lastIndexOf('@');
    const value = at >= 0 ? last.slice(0, at) : null;
    const seal = at >= 0 ? last.slice(at + 1) : last;
    if (value !== null) fields.push({name: 'Value', value});
    if (seal.startsWith('at:')) fields.push({name: 'Seal', value: seal, note: `auth token, ${checkId('a-at', seal)}`});
    else if (seal.startsWith('wout:')) fields.push({name: 'Seal', value: seal, note: 'witness output (its own checksum format, not checked here)'});
    else fields.push({name: 'Seal', value: seal, note: 'unknown seal type'});
    for (const [k, v] of params) fields.push({name: `?${k}`, value: decodeURIComponent(v ?? '')});
    return {line: 'A', fields};
  }
  throw new Error('Not an RGB invoice: v0.11 invoices start with rgb:, v0.12 invoices with contract:');
}

// ---- files -----------------------------------------------------------------------------------

/** Identify an RGB file from its first bytes (rgb-ops 0.11.1 file.rs; rgb-std 0.12.0-rc.3 binfile). */
export function sniffRgbFile(head: Uint8Array): string {
  const ascii = String.fromCharCode(...Array.from(head.slice(0, 8)));
  if (ascii.startsWith('RGB\u0000')) {
    const kind = ascii.slice(4, 7);
    const names: Record<string, string> = {
      CON: 'contract consignment', TFR: 'transfer consignment', KIT: 'kit (schemas, types and scripts)',
    };
    return names[kind] ? `RGB v0.11 (Line B) ${names[kind]}` : `RGB v0.11 file of unknown type '${kind}'`;
  }
  if (ascii === 'RGBCNSGN') {
    const ver = head.length >= 10 ? (head[8] << 8) | head[9] : NaN;
    return `RGB v0.12 (Line A) consignment, version ${ver}`;
  }
  if (new TextDecoder().decode(head).includes('-----BEGIN RGB')) return 'ASCII-armoured RGB data (RGB v0.11)';
  return 'Not a recognised RGB file';
}
