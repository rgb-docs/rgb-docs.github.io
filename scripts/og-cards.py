#!/usr/bin/env python3
# Generates the 1200x630 social cards (Open Graph / Twitter) for every doc page and the site default,
# and sets `image:` in each page's front matter. Run after changing a page title or description:
#   python3 scripts/og-cards.py        (needs Pillow; font: scripts/og-fonts/Inter.ttf, SIL OFL)
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / 'scripts/og-fonts/Inter.ttf'
OUT = ROOT / 'static/img/og'
W, H, PAD = 1200, 630, 72

BG_TOP, BG_BOTTOM = (15, 13, 26), (30, 27, 75)
WHITE, MUTED, ACCENT, FAINT = (255, 255, 255), (196, 193, 217), (167, 139, 250), (139, 135, 168)
STRIPE = [(239, 68, 68), (250, 204, 21), (34, 197, 94), (59, 130, 246)]  # the logo's colours
LINE_COLOUR = {'B': (45, 212, 191), 'A': (251, 191, 36)}
SECTIONS = {'getting-started': 'Getting started', 'core-concepts': 'Core concepts',
            'guides': 'Guides', 'technical-reference': 'Reference'}

lines = json.loads((ROOT / 'scripts/rgb-lines.json').read_text())
BADGE = {k: f"RGB v{'0.12' if k == 'A' else '0.11'} · {lines[k]['crate']} {lines[k]['version']}" for k in 'AB'}


def font(size, weight):
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_name(weight)
    return f


def wrap(draw, text, f, width, max_lines):
    words, out, cur = text.split(), [], ''
    for w in words:
        trial = f'{cur} {w}'.strip()
        if draw.textlength(trial, font=f) <= width:
            cur = trial
        else:
            out.append(cur)
            cur = w
    out.append(cur)
    if len(out) > max_lines:
        out = out[:max_lines]
        while draw.textlength(out[-1] + '…', font=f) > width:
            out[-1] = out[-1].rsplit(' ', 1)[0]
        out[-1] = out[-1].rstrip(',.;:') + '…'
    return out


def pill(draw, x, y, text, colour):
    f = font(26, b'SemiBold')
    w = draw.textlength(text, font=f)
    draw.rounded_rectangle((x, y, x + w + 40, y + 50), radius=25, outline=colour, width=3)
    draw.text((x + 20, y + 25), text, font=f, fill=colour, anchor='lm')
    return x + w + 40


def card(title, description, section, line, dest):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line((0, y, W, y), fill=tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3)))

    seg = W / len(STRIPE)
    for i, c in enumerate(STRIPE):
        d.rectangle((round(i * seg), H - 10, round((i + 1) * seg), H), fill=c)

    logo = Image.open(ROOT / 'static/img/logo.png').convert('RGB').resize((64, 64), Image.LANCZOS)
    mask = Image.new('L', logo.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 63, 63), radius=14, fill=255)
    img.paste(logo, (PAD, PAD - 8), mask)
    d.text((PAD + 84, PAD + 24), 'RGB Docs', font=font(34, b'SemiBold'), fill=WHITE, anchor='lm')
    if section:
        f = font(24, b'SemiBold')
        d.text((W - PAD, PAD + 24), section.upper(), font=f, fill=ACCENT, anchor='rm')

    size = 76
    while True:
        tf = font(size, b'Bold')
        tl = wrap(d, title, tf, W - 2 * PAD, 3)
        if len(tl) <= 2 or size <= 56:
            break
        size -= 4
    y = 190
    for ln in tl:
        d.text((PAD, y), ln, font=tf, fill=WHITE)
        y += round(size * 1.15)

    if description:
        df = font(30, b'Regular')
        y += 18
        for ln in wrap(d, description, df, W - 2 * PAD, {1: 3, 2: 2}.get(len(tl), 1)):
            d.text((PAD, y), ln, font=df, fill=MUTED)
            y += 42

    by = H - PAD - 50
    if line in ('A', 'B'):
        pill(d, PAD, by, BADGE[line], LINE_COLOUR[line])
    elif line == 'both':
        x = pill(d, PAD, by, 'v0.11', LINE_COLOUR['B'])
        x = pill(d, x + 14, by, 'v0.12', LINE_COLOUR['A'])
        d.text((x + 20, by + 25), 'both RGB lines', font=font(26, b'Medium'), fill=MUTED, anchor='lm')
    d.text((W - PAD, by + 25), 'rgb-docs.github.io', font=font(26, b'Medium'), fill=FAINT, anchor='rm')

    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, optimize=True)


def front_matter(text):
    m = re.match(r'---\n(.*?)\n---\n', text, re.S)
    return m, (m.group(1) if m else '')


def field(fm, key):
    m = re.search(rf'^{key}:\s*(.+)$', fm, re.M)
    return m.group(1).strip().strip('"\'') if m else ''


n = 0
for md in sorted((ROOT / 'docs').rglob('*.md*')):
    text = md.read_text()
    m, fm = front_matter(text)
    if not m:
        continue
    rel = md.relative_to(ROOT / 'docs').with_suffix('')
    card(field(fm, 'title') or rel.name, field(fm, 'description'), SECTIONS.get(rel.parts[0], ''),
         field(fm, 'rgb_line'), OUT / f'{rel}.png')
    image = f'image: /img/og/{rel.as_posix()}.png'
    new_fm = re.sub(r'^image:.*$', image, fm, flags=re.M) if 'image:' in fm else f'{fm}\n{image}'
    if new_fm != fm:
        md.write_text(text.replace(fm, new_fm, 1))
    n += 1

card('Documentation for both RGB lines',
     'Client-side-validated assets and contracts on Bitcoin. Every page says whether it applies to '
     'v0.11 (RGB Protocol Association) or v0.12 (RGB-WG).', '', 'both', ROOT / 'static/img/rgb-social-card.png')
print(f'{n} page cards + site card written to static/img/')
