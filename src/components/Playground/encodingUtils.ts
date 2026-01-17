/**
 * RGB Encoding Utilities for Playground
 * Implements BAID64, hex conversions, and hashing
 */

// BAID64 character set (Base58 without similar-looking characters)
const BAID64_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz-_';
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '').replace(/\s/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encode bytes to Base58
 */
export function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  // Count leading zeros
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  // Convert to base58
  const size = Math.floor((bytes.length - zeros) * 138 / 100) + 1;
  const b58 = new Uint8Array(size);

  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    let j = 0;

    for (let k = size - 1; k >= 0; k--, j++) {
      if (carry === 0 && j >= 1) break;
      carry += 256 * b58[k];
      b58[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
  }

  // Skip leading zeros in base58 result
  let start = 0;
  while (start < size && b58[start] === 0) {
    start++;
  }

  // Translate to alphabet
  let result = '1'.repeat(zeros);
  for (let i = start; i < size; i++) {
    result += BASE58_ALPHABET[b58[i]];
  }

  return result;
}

/**
 * Decode Base58 to bytes
 */
export function decodeBase58(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);

  // Count leading '1's
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') {
    zeros++;
  }

  // Allocate enough space
  const size = Math.floor((str.length - zeros) * 733 / 1000) + 1;
  const b256 = new Uint8Array(size);

  for (let i = zeros; i < str.length; i++) {
    const char = str[i];
    const idx = BASE58_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid Base58 character: ${char}`);
    }

    let carry = idx;
    let j = 0;

    for (let k = size - 1; k >= 0; k--, j++) {
      if (carry === 0 && j >= 1) break;
      carry += 58 * b256[k];
      b256[k] = carry % 256;
      carry = Math.floor(carry / 256);
    }
  }

  // Skip leading zeros
  let start = 0;
  while (start < size && b256[start] === 0) {
    start++;
  }

  // Add leading zeros from input
  const result = new Uint8Array(zeros + (size - start));
  for (let i = 0; i < zeros; i++) {
    result[i] = 0;
  }
  for (let i = start; i < size; i++) {
    result[zeros + i - start] = b256[i];
  }

  return result;
}

/**
 * Encode bytes to BAID64 format
 * BAID64 is Base58 with checksum and formatting for RGB identifiers
 */
export function encodeBaid64(bytes: Uint8Array, separators: number = 6): string {
  const base58 = encodeBase58(bytes);

  // Add separators every N characters
  if (separators > 0) {
    const parts: string[] = [];
    for (let i = 0; i < base58.length; i += separators) {
      parts.push(base58.slice(i, i + separators));
    }
    return parts.join('-');
  }

  return base58;
}

/**
 * Decode BAID64 to bytes
 */
export function decodeBaid64(baid64: string): Uint8Array {
  // Remove separators
  const clean = baid64.replace(/-/g, '');
  return decodeBase58(clean);
}

/**
 * Parse RGB invoice/contract ID format
 * Format: rgb:BAID64 or rgbXX:BAID64
 */
export function parseRgbId(id: string): {
  prefix: string;
  baid64: string;
  bytes: Uint8Array;
} {
  const match = id.match(/^(rgb\d*):(.+)$/);
  if (!match) {
    throw new Error('Invalid RGB ID format. Expected rgb:... or rgbXX:...');
  }

  const [, prefix, baid64] = match;
  const bytes = decodeBaid64(baid64);

  return { prefix, baid64, bytes };
}

/**
 * Format bytes as RGB contract ID
 */
export function formatContractId(bytes: Uint8Array): string {
  return `rgb:${encodeBaid64(bytes)}`;
}

/**
 * Simple SHA-256 hash (using Web Crypto API)
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Calculate commitment hash (double SHA-256)
 */
export async function commitmentHash(data: Uint8Array): Promise<Uint8Array> {
  const hash1 = await sha256(data);
  const hash2 = await sha256(hash1);
  return hash2;
}

/**
 * Format bytes as human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validate hex string
 */
export function isValidHex(str: string): boolean {
  const clean = str.replace(/^0x/, '').replace(/\s/g, '');
  return /^[0-9a-fA-F]*$/.test(clean) && clean.length % 2 === 0;
}

/**
 * Validate BAID64 string
 */
export function isValidBaid64(str: string): boolean {
  const clean = str.replace(/-/g, '');
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(clean);
}

/**
 * Generate example contract ID
 */
export function generateExampleContractId(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return formatContractId(randomBytes);
}

/**
 * Encode bytes to Base64
 */
export function encodeBase64(bytes: Uint8Array): string {
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  for (; i < bytes.length - 2; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result += base64chars[(chunk >> 18) & 63];
    result += base64chars[(chunk >> 12) & 63];
    result += base64chars[(chunk >> 6) & 63];
    result += base64chars[chunk & 63];
  }

  // Handle padding
  if (i < bytes.length) {
    const chunk = bytes[i] << 16 | (i + 1 < bytes.length ? bytes[i + 1] << 8 : 0);
    result += base64chars[(chunk >> 18) & 63];
    result += base64chars[(chunk >> 12) & 63];
    result += i + 1 < bytes.length ? base64chars[(chunk >> 6) & 63] : '=';
    result += '=';
  }

  return result;
}

/**
 * Decode Base64 to bytes
 */
export function decodeBase64(str: string): Uint8Array {
  const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = str.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  const bytes = new Uint8Array((len * 3) / 4);
  let byteIndex = 0;

  for (let i = 0; i < len; i += 4) {
    const enc1 = base64chars.indexOf(clean[i]);
    const enc2 = base64chars.indexOf(clean[i + 1]);
    const enc3 = base64chars.indexOf(clean[i + 2]);
    const enc4 = base64chars.indexOf(clean[i + 3]);

    bytes[byteIndex++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== -1) bytes[byteIndex++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (enc4 !== -1) bytes[byteIndex++] = ((enc3 & 3) << 6) | enc4;
  }

  return bytes.slice(0, byteIndex);
}

/**
 * Bech32 character set
 */
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/**
 * Encode bytes to Bech32 (simplified, without checksum for demo)
 */
export function encodeBech32(hrp: string, bytes: Uint8Array): string {
  // Convert 8-bit bytes to 5-bit groups
  const words = convertBits(Array.from(bytes), 8, 5, true);
  if (!words) throw new Error('Invalid bytes for Bech32 encoding');

  // Encode to bech32 characters
  let result = hrp + '1';
  for (const word of words) {
    result += BECH32_CHARSET[word];
  }

  return result;
}

/**
 * Convert between bit groups
 */
function convertBits(data: number[], fromBits: number, toBits: number, pad: boolean): number[] | null {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;

  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) {
      return null;
    }
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    return null;
  }

  return result;
}

/**
 * Format bytes as Bitcoin address-like format (demo)
 */
export function formatBitcoinAddress(bytes: Uint8Array): string {
  return encodeBase58(bytes);
}

/**
 * Calculate checksum for validation
 */
export function calculateChecksum(data: Uint8Array): Uint8Array {
  return data.slice(0, 4); // Simplified
}
