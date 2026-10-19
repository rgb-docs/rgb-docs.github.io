#!/usr/bin/env node
// Refreshes scripts/crates-cache.json: the published versions of every allowlisted crate, newest first.
// Usage: node scripts/refresh-crates.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const allow = JSON.parse(fs.readFileSync(path.join(root, 'scripts/install-allowlist.json'), 'utf8'));
const names = Object.keys(allow.allowed).filter((k) => k.startsWith('crate:')).map((k) => k.slice(6)).sort();
const crates = {};
for (const name of names) {
  const r = await fetch(`https://crates.io/api/v1/crates/${name}/versions`, { headers: { 'User-Agent': 'rgb-docs-gate (github.com/rgb-docs)' } });
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  crates[name] = (await r.json()).versions.filter((v) => !v.yanked).map((v) => v.num);
  await new Promise((res) => setTimeout(res, 1000)); // crates.io asks for at most 1 request per second
}
fs.writeFileSync(path.join(root, 'scripts/crates-cache.json'), JSON.stringify({ refreshed: new Date().toISOString().slice(0, 10), crates }, null, 1) + '\n');
console.log(`${names.length} crates refreshed`);
