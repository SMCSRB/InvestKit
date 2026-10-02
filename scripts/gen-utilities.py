#!/usr/bin/env python3
"""Génère app/styles/utilities.css : un petit sous-ensemble d'utilitaires « à la Tailwind » (Tailwind n'est pas installé),
uniquement pour les classes réellement utilisées par les pages (profil, amis, quiz final…), avec des COULEURS DU THÈME
(clair/sombre). Relancer après avoir ajouté une classe : python3 scripts/gen-utilities.py"""
import re, glob, sys

FILES = glob.glob('app/profile/page.jsx') + glob.glob('app/friends/page.jsx') + glob.glob('app/education/**/page.jsx', recursive=True) \
    + glob.glob('app/guild/**/page.jsx', recursive=True) + glob.glob('app/admin/page.jsx') + glob.glob('app/mes-donnees/page.jsx') + glob.glob('app/onboarding/page.jsx')
used = set()
for f in FILES:
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r'className=(?:"([^"]*)"|\{`([^`]*)`\}|\{[^}]*\})', s):
        t = (m.group(1) or m.group(2) or m.group(0))
        t = re.sub(r'\$\{[^}]*\}', ' ', t)
        for c in re.findall(r"[A-Za-z0-9:/\.\[\]_%#\-]+", t):
            used.add(c)

NAMED = {'gray': 'n', 'slate': 'n', 'blue': 'primary', 'purple': 'orchid', 'pink': 'orchid', 'green': 'positive', 'red': 'negative',
         'yellow': 'warning', 'orange': 'warning', 'amber': 'warning'}
TOKEN = {'primary': '--ik-primary', 'orchid': '--ik-orchid', 'positive': '--ik-positive', 'negative': '--ik-negative', 'warning': '--ik-warning'}
TEXT_ACCENT = {'primary': '--ik-accent'}

def mix(var, pct): return f"color-mix(in srgb, {var} {pct}%, transparent)"

def color(kind, name, shade, alpha):
    """Valeur CSS d'une couleur Tailwind (kind: text|bg|border|from|via|to) vers les jetons."""
    a = int(alpha) if alpha else None
    if name == 'white': return 'var(--ik-text)' if kind == 'text' else ('#fff' if a is None else mix('#fff', a))
    if name == 'black': return mix('#000', a if a is not None else 100)
    fam = NAMED.get(name)
    if fam is None: return None
    sh = int(shade or 500)
    if fam == 'n':
        if kind == 'text': return 'var(--ik-text-2)' if sh <= 300 else 'var(--ik-text-3)'
        base = {900: 'var(--ik-surface-1)', 800: 'var(--ik-surface-2)', 700: 'var(--ik-surface-3)', 600: mix('var(--ik-text)', 22)}.get(sh, mix('var(--ik-text)', 14))
        if kind in ('bg', 'from', 'via', 'to'):
            if a is not None and base.startswith('var(--ik-surface'): return mix(base, a)
            return base
        if kind == 'border': return mix('var(--ik-text)', 16 if a is None or a >= 50 else 10)
    v = TOKEN[fam]
    if kind == 'text': return f"color-mix(in srgb, var({TEXT_ACCENT.get(fam, v)}) 78%, var(--ik-text))"
    if kind == 'border': return mix(f"var({v})", a if a is not None else 60)
    if sh >= 800 or (a is not None and a <= 40): return mix(f"var({v})", max(8, min(a if a is not None else 100, 100)) if a is not None and a > 20 else 16)
    return mix(f"var({v})", a) if a is not None else f"var({v})"

SP = lambda n: f"{float(n) * 0.25:g}rem"
TXT = {'xs': .75, 'sm': .875, 'base': 1, 'lg': 1.125, 'xl': 1.25, '2xl': 1.5, '3xl': 1.875, '4xl': 2.25, '5xl': 3, '6xl': 3.75, '7xl': 4.5, '8xl': 6, '9xl': 8}
MAXW = {'md': '28rem', '2xl': '42rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem'}
RAD = {'': '.25rem', 'lg': '.5rem', 'xl': '.75rem', '2xl': '1rem', 'full': '9999px'}

def base_rule(c):
    """(selector-suffix, declarations) pour une classe sans variante, ou None."""
    m = re.fullmatch(r'-?(p|m)([trblxy]?)-(\d+(?:\.\d+)?|auto)', c)
    if m:
        side = {'t': ['top'], 'b': ['bottom'], 'l': ['left'], 'r': ['right'], 'x': ['left', 'right'], 'y': ['top', 'bottom'], '': [None]}[m.group(2)]
        kind = 'padding' if m.group(1) == 'p' else 'margin'
        val = 'auto' if m.group(3) == 'auto' else SP(m.group(3))
        return ';'.join(f"{kind}{'-' + s if s else ''}:{val}" for s in side)
    m = re.fullmatch(r'gap-(\d+)', c)
    if m: return f"gap:{SP(m.group(1))}"
    m = re.fullmatch(r'(w|h)-(\d+)', c)
    if m: return f"{'width' if m.group(1) == 'w' else 'height'}:{SP(m.group(2))}"
    if c == 'w-full': return 'width:100%'
    if c == 'h-full': return 'height:100%'
    if c == 'min-h-screen': return 'min-height:100vh'
    m = re.fullmatch(r'max-w-(\w+)', c)
    if m and m.group(1) in MAXW: return f"max-width:{MAXW[m.group(1)]}"
    m = re.fullmatch(r'text-(xs|sm|base|lg|xl|[2-9]xl)', c)
    if m: return f"font-size:{TXT[m.group(1)]:g}rem;line-height:1.4"
    m = re.fullmatch(r'rounded(?:-(lg|xl|2xl|full))?', c)
    if m: return f"border-radius:{RAD[m.group(1) or '']}"
    m = re.fullmatch(r'grid-cols-(\d+)', c)
    if m: return f"grid-template-columns:repeat({m.group(1)},minmax(0,1fr))"
    m = re.fullmatch(r'md:col-span-(\d+)|col-span-(\d+)', c)
    simple = {'flex': 'display:flex', 'inline-flex': 'display:inline-flex', 'grid': 'display:grid', 'block': 'display:block', 'inline-block': 'display:inline-block', 'hidden': 'display:none',
              'flex-col': 'flex-direction:column', 'flex-wrap': 'flex-wrap:wrap', 'flex-1': 'flex:1 1 0%', 'items-center': 'align-items:center', 'items-start': 'align-items:flex-start',
              'justify-between': 'justify-content:space-between', 'justify-center': 'justify-content:center', 'text-center': 'text-align:center', 'font-bold': 'font-weight:700',
              'font-semibold': 'font-weight:600', 'font-mono': 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace', 'relative': 'position:relative', 'absolute': 'position:absolute', 'fixed': 'position:fixed',
              'overflow-hidden': 'overflow:hidden', 'cursor-pointer': 'cursor:pointer', 'border': 'border-width:1px;border-style:solid', 'border-2': 'border-width:2px;border-style:solid',
              'border-b': 'border-bottom-width:1px;border-bottom-style:solid', 'border-t': 'border-top-width:1px;border-top-style:solid', 'border-b-2': 'border-bottom-width:2px;border-bottom-style:solid',
              'mx-auto': 'margin-left:auto;margin-right:auto', 'transition': 'transition:all var(--ik-dur-fast) var(--ik-ease)', 'transition-all': 'transition:all var(--ik-dur-fast) var(--ik-ease)',
              'duration-300': 'transition-duration:300ms', 'duration-500': 'transition-duration:500ms', 'z-50': 'z-index:50', 'top-1': 'top:.25rem', 'left-1': 'left:.25rem', 'left-7': 'left:1.75rem',
              'animate-pulse': 'animation:ik-fade 1.4s ease-in-out infinite alternate', 'focus:outline-none': 'outline:none', 'bg-gradient-to-r': 'background-image:linear-gradient(to right,var(--tw-from,transparent),var(--tw-via,var(--tw-to,transparent)),var(--tw-to,transparent))',
              'bg-gradient-to-br': 'background-image:linear-gradient(to bottom right,var(--tw-from,transparent),var(--tw-via,var(--tw-to,transparent)),var(--tw-to,transparent))', 'sm:flex-row': 'flex-direction:row',
              'ml-15': 'margin-left:3.75rem', 'hover:translate-y-[-4px]': 'transform:translateY(-4px)', 'last:border-b-0': 'border-bottom-width:0'}
    if c in simple: return simple[c]
    if m: return f"grid-column:span {m.group(1) or m.group(2)} / span {m.group(1) or m.group(2)}"
    m = re.fullmatch(r'(text|bg|border|from|via|to)-([a-z]+)(?:-(\d{2,3}))?(?:/(\d+))?', c)
    if m and m.group(2) not in ('xs', 'sm', 'base', 'lg', 'xl', 'center', 'gradient', 'b', 't'):
        v = color(m.group(1), m.group(2), m.group(3), m.group(4))
        if v is None: return None
        k = m.group(1)
        if k == 'text': return f"color:{v}"
        if k == 'bg': return f"background-color:{v}"
        if k == 'border': return f"border-color:{v}"
        return f"--tw-{k}:{v}"
    m = re.fullmatch(r'placeholder-([a-z]+)-(\d+)', c)
    if m: return 'color:var(--ik-text-3)'
    return None

def esc(c): return re.sub(r'([:/\.\[\]%#])', r'\\\1', c)
BP = {'sm': 640, 'md': 768, 'lg': 1024}
rules = []; miss = []
for c in sorted(used):
    m = re.fullmatch(r'((?:(?:sm|md|lg|hover|focus|last):)*)(.+)', c)
    prefix, core = m.group(1), m.group(2)
    if not re.match(r'^-?[a-z]', core): continue
    variants = [v for v in prefix.split(':') if v]
    decl = base_rule(core) if not variants else base_rule(core)
    if decl is None and variants and c in ('hover:translate-y-[-4px]', 'focus:outline-none', 'last:border-b-0', 'sm:flex-row'): decl = base_rule(c)
    if decl is None:
        if re.match(r'^(space-y-\d+)$', core):
            n = core.split('-')[2]; rules.append((variants, f".{esc(c)} > :not([hidden]) ~ :not([hidden])", f"margin-top:{SP(n)}")); continue
        if re.match(r'^(text|bg|border|p|m|px|py|pt|pb|gap|flex|grid|rounded|w|h|font|space|items|justify|hover|from|to|via|placeholder|max|min)\b', core): miss.append(c)
        continue
    sel = f".{esc(c)}"
    for v in variants:
        if v == 'hover': sel += ':hover'
        elif v == 'focus': sel += ':focus'
        elif v == 'last': sel += ':last-child'
    if core.startswith('placeholder-'): sel += '::placeholder'
    rules.append(([v for v in variants if v in BP], sel, decl))

out = ['/* GÉNÉRÉ par scripts/gen-utilities.py : ne pas modifier à la main. Utilitaires (sous-ensemble) aux couleurs du thème. */', '@layer utilities {']
base = [r for r in rules if not r[0]]
out.append('  .border,.border-2,.border-t,.border-b,.border-b-2{border-color:var(--ik-border-strong)}')
out += [f"  {s}{{{d}}}" for _, s, d in base]
# texte blanc sur fonds pleins : texte « sur primaire / positif / négatif » (jamais blanc sur blanc en mode clair)
out += ['  :is(.bg-blue-500,.bg-blue-600,.bg-purple-600,.hover\\:bg-blue-600,.hover\\:bg-blue-700,.hover\\:bg-purple-700).text-white{color:var(--ik-text-on-primary)}',
        '  :is(.bg-green-500,.bg-green-600,.hover\\:bg-green-600,.hover\\:bg-green-700).text-white{color:var(--ik-text-on-positive)}',
        '  :is(.bg-red-500).text-white{color:var(--ik-text-on-negative)}',
        '  :is(.bg-gradient-to-r,.bg-gradient-to-br).text-white{color:#fff}']
for bp in ('sm', 'md', 'lg'):
    rs = [r for r in rules if r[0] == [bp]]
    if rs:
        out.append(f"  @media (min-width:{BP[bp]}px){{")
        out += [f"    {s}{{{d}}}" for _, s, d in rs]
        out.append('  }')
out.append('}')
text = '\n'.join(out) + '\n'
if '--check' in sys.argv:
    # Vérification (utilisée par les tests) : le fichier committé doit être identique à la sortie du générateur
    sys.exit(0 if open('app/styles/utilities.css', encoding='utf-8').read() == text else 1)
open('app/styles/utilities.css', 'w', encoding='utf-8').write(text)
print('classes', len(used), 'règles', len(rules), 'non couvertes', sorted(set(miss)))
