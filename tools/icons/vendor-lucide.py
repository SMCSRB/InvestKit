#!/usr/bin/env python3
"""Copie une liste FIXE d'icônes Lucide (licence ISC) dans app/components/ui/lucideIcons.js, sous forme de listes de chemins SVG (un chemin par élément d'origine).

Usage : python3 tools/icons/vendor-lucide.py /chemin/vers/lucide-static/icons
(version utilisée : lucide-static 1.49.0 ; téléchargée avec « npm pack lucide-static@1.49.0 », rien n'est ajouté aux dépendances du site)
"""
import re, sys, os

ICONS = """trending-up trending-down chart-column banknote rocket target graduation-cap user book-open house lock-keyhole sparkles lock lightbulb
party-popper clipboard-list pencil-line shield users landmark drama settings credit-card palette crown gem zap message-circle medal ban thumbs-up
thumbs-down flag bell arrow-left-right megaphone flame sun moon newspaper award mail shield-check calendar handshake gift hand bot wrench
circle-check circle-x triangle-alert timer piggy-bank scale leaf waves trees sunset baby droplet heart eye bug receipt-text monitor lock-open
refresh-cw trash-2 log-out download upload circle-dot gamepad-2 search brain flower-2 snowflake globe sprout signal radio-tower battery-medium
package pin map-pin hand-metal coins bitcoin info circle-alert check x star cake clock""".split()

def num(s): return float(s)
def fmt(v): return ('%.4f' % v).rstrip('0').rstrip('.')

def conv(el, attrs):
    a = dict(re.findall(r'([\w-]+)="([^"]*)"', attrs))
    if el == 'path': return a['d']
    if el == 'circle':
        cx, cy, r = num(a['cx']), num(a['cy']), num(a['r'])
        return f"M{fmt(cx-r)} {fmt(cy)}a{fmt(r)} {fmt(r)} 0 1 0 {fmt(2*r)} 0a{fmt(r)} {fmt(r)} 0 1 0 {fmt(-2*r)} 0"
    if el == 'line': return f"M{a['x1']} {a['y1']}L{a['x2']} {a['y2']}"
    if el in ('polyline', 'polygon'):
        pts = re.findall(r'-?[\d.]+', a['points']); pairs = list(zip(pts[0::2], pts[1::2]))
        return 'M' + 'L'.join(f'{x} {y}' for x, y in pairs) + ('Z' if el == 'polygon' else '')
    if el == 'rect':
        x, y, w, h = (num(a.get(k, '0')) for k in ('x', 'y', 'width', 'height')); rx = num(a.get('rx', a.get('ry', '0')))
        if rx <= 0: return f"M{fmt(x)} {fmt(y)}h{fmt(w)}v{fmt(h)}h{fmt(-w)}z"
        return (f"M{fmt(x+rx)} {fmt(y)}h{fmt(w-2*rx)}a{fmt(rx)} {fmt(rx)} 0 0 1 {fmt(rx)} {fmt(rx)}v{fmt(h-2*rx)}a{fmt(rx)} {fmt(rx)} 0 0 1 {fmt(-rx)} {fmt(rx)}"
                f"h{fmt(-(w-2*rx))}a{fmt(rx)} {fmt(rx)} 0 0 1 {fmt(-rx)} {fmt(-rx)}v{fmt(-(h-2*rx))}a{fmt(rx)} {fmt(rx)} 0 0 1 {fmt(rx)} {fmt(-rx)}z")
    if el == 'ellipse':
        cx, cy, rx, ry = (num(a[k]) for k in ('cx', 'cy', 'rx', 'ry'))
        return f"M{fmt(cx-rx)} {fmt(cy)}a{fmt(rx)} {fmt(ry)} 0 1 0 {fmt(2*rx)} 0a{fmt(rx)} {fmt(ry)} 0 1 0 {fmt(-2*rx)} 0"
    raise ValueError(el)

def camel(n): return re.sub(r'-(\w)', lambda m: m.group(1).upper(), n)

src = sys.argv[1]; out = {}
for n in ICONS:
    svg = open(os.path.join(src, n + '.svg'), encoding='utf8').read()
    body = svg.split('>', 2)[-1] if False else svg[svg.index('>', svg.index('<svg')) + 1:]
    parts = [conv(m.group(1), m.group(2)) for m in re.finditer(r'<(path|circle|line|polyline|polygon|rect|ellipse)\b([^>]*?)/?>', body, re.S)]
    out[camel(n)] = [p.strip() for p in parts]  # un <path> par élément : un « m » relatif initial ne dépend alors pas du précédent
dst = os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'components', 'ui', 'lucideIcons.js')
with open(dst, 'w', encoding='utf8') as f:
    f.write("// Icônes copiées de Lucide (https://lucide.dev), version lucide-static 1.49.0, licence ISC (voir lucide-LICENSE.txt et docs/licences-icones.md).\n")
    f.write("// Fichier GÉNÉRÉ par tools/icons/vendor-lucide.py : ne pas modifier à la main. Trait 2 sur grille 24 px (dessinées avec stroke-width via <Icon>).\n")
    f.write("export const LUCIDE = {\n")
    for k, v in out.items(): f.write(f"  {k}: [" + ', '.join("'" + x + "'" for x in v) + "],\n")
    f.write("};\n")
print(len(out), 'icônes')
