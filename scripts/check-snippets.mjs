#!/usr/bin/env node
// Checks docs snippets against the two pinned RGB lines (scripts/rgb-lines.json):
//   command  `rgb <sub> [--flag]` lines must exist in the pinned CLI's help tree (scripts/cli-help/<line>.json).
//            A page's front matter `rgb_line: A | B | both` picks the line(s); a fence can override it
//            with `line=A` or `line=B` in its info string. Unlabelled pages are checked against either.
//   binary   other RGB tool names at the start of a command line must be in install-allowlist.json `binaries`
//   install  cargo install / npm / npx / pip / docker / git clone targets must be in install-allowlist.json
//   crate    dependencies in toml fences must be allowlisted crates, at a version published on crates.io
//            (scripts/crates-cache.json, refreshed by scripts/refresh-crates.mjs)
// Opt out per fence with `{/* snippet:skip: reason */}` or `<!-- snippet:skip: reason -->` on the line before it.
// Usage: node scripts/check-snippets.mjs [--json] [--strict]
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict') || process.env.SNIPPETS_STRICT === '1';

// ---- ground truth -------------------------------------------------------
const lines = read('scripts/rgb-lines.json');
const trees = {};
for (const l of ['A', 'B']) trees[l] = read(`scripts/cli-help/${l}.json`).commands;
const allow = read('scripts/install-allowlist.json');
const crates = read('scripts/crates-cache.json').crates;

// Resolve `rgb a b --x` against one tree: the longest known command path, then its flags (plus globals from parents).
function checkCommand(tree, words) {
  let cur = '', flags = new Set(tree[''].flags), takes = new Set(tree[''].takes);
  const positional = [];
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    if (w === 'help' && !positional.length) return null; // clap's built-in help
    if (/^-[A-Za-z0-9]{2,}$/.test(w)) { // bundled short flags, e.g. -go
      const bad = [...w.slice(1)].find((c) => !flags.has('-' + c));
      if (bad) return `no flag -${bad} on \`rgb${cur ? ' ' + cur : ''}\``;
      continue;
    }
    if (w.startsWith('-') && w.length > 1) {
      const f = w.replace(/=.*$/, '');
      if (!flags.has(f)) return `no flag ${f} on \`rgb${cur ? ' ' + cur : ''}\``;
      if (takes.has(f) && !w.includes('=')) k++; // skip the flag's value
      continue;
    }
    positional.push(w);
    const node = tree[cur];
    if (positional.length === 1 || (node.subs.length && positional.length === cur.split(' ').length + 1)) {
      if (!node.subs.length) continue; // an argument, not a subcommand
      if (/[<>$\[]/.test(w)) return null; // a placeholder where a subcommand goes
      const sub = node.subs.find((s) => s === w || (node.aliases[s] || []).includes(w));
      if (!sub) return `no subcommand \`${w}\` under \`rgb${cur ? ' ' + cur : ''}\``;
      cur = cur ? `${cur} ${sub}` : sub;
      for (const f of tree[cur].flags) flags.add(f);
      for (const f of tree[cur].takes) takes.add(f);
    }
  }
  return null;
}

// ---- scan ---------------------------------------------------------------
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.mdx?$/.test(e.name)) yield p;
  }
}

const findings = [];
const unlabelled = [];
const unverified = [];
const add = (file, line, kind, what, why) => findings.push({ file: path.relative(root, file), line, kind, what, why });
const shellLang = /^(bash|sh|shell|console|zsh|)$/;
const placeholder = /[<>$]|YOUR_|\.\.\./;

for (const file of walk(path.join(root, 'docs'))) {
  const src = fs.readFileSync(file, 'utf8');
  const fm = (src.match(/^---\n([\s\S]*?)\n---/) || [, ''])[1];
  const pageLine = (fm.match(/^rgb_line:\s*(\S+)/m) || [])[1];
  if (!pageLine) unlabelled.push(path.relative(root, file));
  if (!/^verified_with:/m.test(fm)) unverified.push(path.relative(root, file));
  const linesOf = (l) => (l === 'A' || l === 'B' ? [l] : l === 'both' ? ['A', 'B'] : null);

  const text = src.split('\n');
  let inFence = false, skip = false, lang = '', fenceLine = null, section = '';
  for (let i = 0; i < text.length; i++) {
    const t = text[i], n = i + 1;
    const fence = t.match(/^\s*(```|~~~)(\S*)\s*(.*)$/);
    if (fence) {
      if (!inFence) {
        inFence = true; lang = fence[2]; section = '';
        skip = /snippet:skip/.test(text[i - 1] || '');
        fenceLine = (fence[3].match(/\bline=(A|B|both)\b/) || [])[1] || null;
      } else inFence = false;
      continue;
    }
    if (!inFence || skip || lang === 'mermaid') continue;

    // toml dependencies
    if (lang === 'toml') {
      const h = t.match(/^\s*\[([^\]]+)\]/);
      if (h) { section = h[1]; continue; }
      if (/(^|\.)(dev-|build-)?dependencies$/.test(section)) {
        const m = t.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|\{(.*)\})/);
        if (m) {
          const name = (m[3] && (m[3].match(/package\s*=\s*"([^"]+)"/) || [])[1]) || m[1];
          const ver = m[2] ?? (m[3] && (m[3].match(/version\s*=\s*"([^"]+)"/) || [])[1]);
          const key = 'crate:' + name;
          if (key in allow.denied) add(file, n, 'crate', name, 'DENIED: ' + allow.denied[key]);
          else if (!(key in allow.allowed)) add(file, n, 'crate', name, 'not in scripts/install-allowlist.json');
          else if (ver && !/git|path/.test(m[3] || '')) {
            const vs = crates[name] || [];
            const want = ver.replace(/^[=^~]/, '');
            // Cargo only matches a pre-release when the requirement itself names one.
            const pool = want.includes('-') ? vs : vs.filter((v) => !v.includes('-'));
            if (!pool.some((v) => v === want || v.startsWith(want + '.') || v.startsWith(want + '-')))
              add(file, n, 'crate', `${name} ${ver}`, `no matching version on crates.io (latest: ${vs[0] || 'none'}${want.includes('-') ? '' : '; pre-releases need an exact requirement'})`);
          }
        }
      }
      continue;
    }
    if (!shellLang.test(lang)) continue;

    // join continuation lines, strip prompts and comments
    let cmd = t;
    while (/\\\s*$/.test(cmd) && i + 1 < text.length) cmd = cmd.replace(/\\\s*$/, ' ') + text[++i];
    cmd = cmd.replace(/^\s*(\$|#|>)\s+(?=\S)/, '').replace(/\s+#\s.*$/, '');
    if (/^\s*#/.test(cmd)) continue;

    for (const part of cmd.split(/\s*(?:&&|\|\||;|\|)\s*/)) {
      const words = part.trim().replace(/^(sudo|env\s+\S+=\S+|[A-Z_]+=\S+)\s+/, '').split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      const [bin, ...rest] = words;

      // install targets
      const targets = [];
      if (bin === 'cargo' && rest[0] === 'install') {
        const r = rest.slice(1);
        for (let k = 0; k < r.length; k++) {
          if (['--version', '--git', '--branch', '--tag', '--root', '--features', '-F', '--bin', '--path'].includes(r[k])) {
            if (r[k] === '--git') targets.push('git:' + r[k + 1]);
            k++;
            continue;
          }
          if (r[k].startsWith('-')) continue;
          targets.push('crate:' + r[k].replace(/@.*$/, ''));
        }
      }
      if (/^(npm|yarn|pnpm)$/.test(bin) && /^(i|install|add)$/.test(rest[0] || ''))
        for (const w of rest.slice(1)) if (!w.startsWith('-')) targets.push('npm:' + w.replace(/(.)@.*$/, '$1'));
      if (bin === 'npx') { const w = rest.find((x) => !x.startsWith('-')); if (w) targets.push('npm:' + w.replace(/(.)@.*$/, '$1')); }
      if (/^pip3?$/.test(bin) && rest[0] === 'install') for (const w of rest.slice(1)) if (!w.startsWith('-')) targets.push('pip:' + w);
      if (bin === 'git' && rest[0] === 'clone') { const w = rest.slice(1).find((x) => !x.startsWith('-') && !/^\d+$/.test(x)); if (w) targets.push('git:' + w.replace(/\.git$/, '')); }
      if (bin === 'docker' && rest[0] === 'pull') targets.push('docker:' + rest[1].replace(/:.*$/, ''));
      for (const tg of targets) {
        if (placeholder.test(tg)) continue;
        if (tg in allow.denied) add(file, n, 'install', tg, 'DENIED: ' + allow.denied[tg]);
        else if (!(tg in allow.allowed)) add(file, n, 'install', tg, 'not in scripts/install-allowlist.json');
      }

      // rgb commands
      if (bin === 'rgb') {
        const want = linesOf(fenceLine) || linesOf(pageLine) || ['A', 'B'];
        const either = !fenceLine && !linesOf(pageLine);
        const errs = want.map((l) => [l, checkCommand(trees[l], rest)]);
        const bad = either ? (errs.every(([, e]) => e) ? errs : []) : errs.filter(([, e]) => e);
        for (const [l, e] of bad) add(file, n, 'command', ('rgb ' + rest.join(' ')).slice(0, 80), `${e} (line ${l}: ${lines[l].crate} ${lines[l].version})`);
      } else if (/^(rgb-|rgb\d|lnp-|bp-|aluvm|contractum|rgbx|rgbp|btc-)/.test(bin) && !(bin in allow.binaries)) {
        add(file, n, 'binary', bin, 'not a binary any pinned release ships (install-allowlist.json `binaries`)');
      }
    }
  }
}

// ---- report ---------------------------------------------------------------
const byKind = findings.reduce((a, f) => ((a[f.kind] = (a[f.kind] || 0) + 1), a), {});
const pins = `A=${lines.A.crate} ${lines.A.version}, B=${lines.B.crate} ${lines.B.version}`;
if (args.has('--json')) {
  console.log(JSON.stringify({ pins, counts: byKind, unlabelled, unverified, findings }, null, 2));
} else {
  let last = '';
  for (const f of findings) {
    if (f.file !== last) console.log('\n' + f.file), (last = f.file);
    console.log(`  L${f.line}  [${f.kind}] ${f.what} — ${f.why}`);
  }
  console.log(`\n${unlabelled.length} pages without rgb_line, ${unverified.length} without verified_with front matter`);
  console.log(`\n${findings.length} findings ${JSON.stringify(byKind)} (${pins})`);
}
process.exit(strict && (findings.length || unlabelled.length) ? 1 : 0);
