#!/usr/bin/env node
// Dumps the command tree of a pinned `rgb` binary to scripts/cli-help/<line>.json by walking
// `<bin> [sub...] --help`. Run it only against a binary built from the pin in scripts/rgb-lines.json,
// in a clean environment (CI does this). The binary is only asked for help, never run otherwise.
// Usage: node scripts/dump-cli-help.mjs <A|B> <path-to-binary>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [line, bin] = process.argv.slice(2);
const lines = JSON.parse(fs.readFileSync(path.join(root, 'scripts/rgb-lines.json'), 'utf8'));
if (!lines[line] || !bin) {
  console.error('Usage: dump-cli-help.mjs <A|B> <binary>');
  process.exit(2);
}

function help(words) {
  return execFileSync(bin, [...words, '--help'], {
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin', HOME: fs.mkdtempSync('/tmp/rgbhelp-') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parse(text) {
  const subs = {}, flags = new Set(), takes = new Set();
  let section = '';
  for (const l of text.split('\n')) {
    if (/^\S.*:\s*$/.test(l)) { section = l.trim().replace(/:$/, '').toLowerCase(); continue; }
    if (section === 'commands') {
      const m = l.match(/^\s{2}([a-z][a-z0-9-]*)(?:,\s*([a-z][a-z0-9-]*))?\s/);
      if (m && m[1] !== 'help') {
        const aliases = [m[2], ...[...l.matchAll(/\[aliases?: ([^\]]+)\]/g)].flatMap((a) => a[1].split(/,\s*/))].filter(Boolean);
        subs[m[1]] = aliases;
      }
    } else if (/options|arguments/.test(section) || section === '') {
      if (!/^\s+-/.test(l)) continue;
      const head = l.trim().split(/\s{2,}/)[0]; // e.g. "-d, --data-dir <DATA_DIR>"
      const valued = /<[^>]+>/.test(head);
      for (const m of head.matchAll(/(?:^|[\s,])(--?[A-Za-z0-9][A-Za-z0-9-]*)/g)) { flags.add(m[1]); if (valued) takes.add(m[1]); }
    }
  }
  return { subs, flags: [...flags].sort(), takes: [...takes].sort() };
}

const tree = {};
function walk(words) {
  const { subs, flags, takes } = parse(help(words));
  tree[words.join(' ')] = { flags, takes, subs: Object.keys(subs).sort(), aliases: subs };
  for (const s of Object.keys(subs)) walk([...words, s]);
}
walk([]);
// clap leaves `alias = "x"` out of --help; the pin file lists them from the source.
for (const [a, cmd] of Object.entries(lines[line].hidden_aliases || {})) tree[''].aliases[cmd] = [...(tree[''].aliases[cmd] || []), a];
let version = null; // Line A's rgb has no --version flag
try { version = execFileSync(bin, ['--version'], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin' }, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
const out = { line, pin: `${lines[line].crate} ${lines[line].version}`, version, commands: tree };
fs.writeFileSync(path.join(root, `scripts/cli-help/${line}.json`), JSON.stringify(out, null, 1) + '\n');
console.log(`${line}: ${Object.keys(tree).length} command paths (${version || 'no --version flag'})`);
