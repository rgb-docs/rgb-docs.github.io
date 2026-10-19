#!/usr/bin/env node
// Reports newer releases of the crates each RGB line is pinned to (scripts/rgb-lines.json),
// so a pin bump can be planned. Run it locally: node scripts/release-watch.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const lines = JSON.parse(fs.readFileSync(path.join(root, 'scripts/rgb-lines.json'), 'utf8'));
// Crates whose releases matter for each line, besides the pinned CLI crate.
const watch = { A: ['rgb-wallet', 'rgb-std', 'rgb-core'], B: ['rgb-cmd', 'rgb-ops', 'rgb-consensus', 'rgb-lib'] };

let newer = 0;
for (const [line, crates] of Object.entries(watch)) {
  console.log(`${line}: ${lines[line].label} (pinned ${lines[line].crate} ${lines[line].version})`);
  for (const name of crates) {
    const r = await fetch(`https://crates.io/api/v1/crates/${name}/versions`, { headers: { 'User-Agent': 'rgb-docs-release-watch (github.com/rgb-docs)' } });
    const versions = (await r.json()).versions.filter((v) => !v.yanked);
    const latest = versions[0];
    const stable = versions.find((v) => !v.num.includes('-'));
    const pinned = name === lines[line].crate ? lines[line].version : null;
    let flag = '';
    if (pinned && latest.num !== pinned) {
      // A newer stable means bump the pin; a newer pre-release means add a "coming next" callout.
      if (stable && stable.num !== pinned && !(pinned.includes('-') && stable.created_at < versions.find((v) => v.num === pinned)?.created_at)) { flag = `  <-- new stable ${stable.num}: bump the pin`; newer++; }
      else flag = '  (pre-release: "coming next" callout)';
    }
    console.log(`  ${name.padEnd(14)} ${latest.num.padEnd(16)} ${latest.created_at.slice(0, 10)}${flag}`);
    await new Promise((res) => setTimeout(res, 1000)); // crates.io asks for at most 1 request per second
  }
}
process.exit(newer ? 1 : 0);
