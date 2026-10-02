#!/usr/bin/env python3
"""Assemble des images PNG en GIF animé, SANS aucune bibliothèque (Python standard seulement).
Usage : gif.py sortie.gif durée_ms image1.png image2.png ...
Palette commune (découpe « median cut »), 64 couleurs ; chaque image n'enregistre que la zone qui change : fichier léger (< 500 Ko)."""
import struct, sys, zlib

def read_png(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, chunks = 8, []
    while pos < len(data):
        n, t = struct.unpack('>I4s', data[pos:pos + 8]); chunks.append((t, data[pos + 8:pos + 8 + n])); pos += 12 + n
    w, h, depth, ctype, _, _, inter = struct.unpack('>IIBBBBB', chunks[0][1])
    assert depth == 8 and inter == 0 and ctype in (2, 6), 'PNG 8 bits RGB/RGBA sans entrelacement attendu'
    bpp = 3 if ctype == 2 else 4
    raw = zlib.decompress(b''.join(c for t, c in chunks if t == b'IDAT'))
    stride = w * bpp; rows = []; prev = bytearray(stride); p = 0
    for _ in range(h):
        f = raw[p]; line = bytearray(raw[p + 1:p + 1 + stride]); p += 1 + stride
        if f == 1:
            for i in range(bpp, stride): line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride): line[i] = (line[i] + (((line[i - bpp] if i >= bpp else 0) + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0; b = prev[i]; c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    px = []
    for line in rows:
        px.append([(line[i], line[i + 1], line[i + 2]) for i in range(0, stride, bpp)])
    return w, h, px

def median_cut(colors, n):
    boxes = [colors]
    while len(boxes) < n:
        boxes.sort(key=lambda b: len(b), reverse=True)
        b = boxes.pop(0)
        if len(b) < 2: boxes.append(b); break
        ranges = [max(c[i] for c in b) - min(c[i] for c in b) for i in range(3)]
        ch = ranges.index(max(ranges)); b.sort(key=lambda c: c[ch]); m = len(b) // 2
        boxes += [b[:m], b[m:]]
    return [tuple(sum(c[i] for c in b) // len(b) for i in range(3)) for b in boxes if b]

def lzw(indices, min_code):
    clear, end = 1 << min_code, (1 << min_code) + 1
    out = bytearray(); buf = 0; nbits = 0
    def emit(code, size):
        nonlocal buf, nbits
        buf |= code << nbits; nbits += size
        while nbits >= 8: out.append(buf & 255); buf >>= 8; nbits -= 8
    size = min_code + 1; table = {}; nxt = end + 1
    emit(clear, size); cur = None
    for k in indices:
        if cur is None: cur = (k,); key = None
        nk = cur + (k,) if len(cur) < 1 else None
        # dictionnaire par couples (préfixe, symbole) pour rester rapide
        break
    table = {}; nxt = end + 1; size = min_code + 1; prefix = indices[0]
    for k in indices[1:]:
        key = (prefix, k)
        if key in table: prefix = table[key]; continue
        emit(prefix, size)
        if nxt < 4096:
            table[key] = nxt; nxt += 1
            if nxt - 1 == (1 << size) and size < 12: size += 1
        else:
            emit(clear, size); table = {}; nxt = end + 1; size = min_code + 1
        prefix = k
    emit(prefix, size); emit(end, size)
    if nbits: out.append(buf & 255)
    return bytes(out)

def blocks(b):
    return b''.join(bytes([len(b[i:i + 255])]) + b[i:i + 255] for i in range(0, len(b), 255)) + b'\x00'

def main():
    out_path, delay_ms, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
    imgs = [read_png(f) for f in files]; w, h = imgs[0][0], imgs[0][1]
    sample = []
    for _, _, px in imgs:
        for y in range(0, h, 3):
            sample += px[y][::3]
    # Les pièces dorées occupent très peu de pixels : sans précaution, la palette les perd (elles deviendraient beige). On réserve donc
    # 16 couleurs aux tons chauds (or) et 48 au reste (fond violet, lettres).
    warm = [c for c in sample if c[0] > c[2] + 40]; cool = [c for c in sample if c[0] <= c[2] + 40]
    pal = median_cut(cool, 48) + (median_cut(warm, 16) if len(warm) > 16 else [])
    pal += [(0, 0, 0)] * (64 - len(pal))
    cache = {}
    def nearest(c):
        i = cache.get(c)
        if i is None:
            i = min(range(len(pal)), key=lambda j: (pal[j][0] - c[0]) ** 2 + (pal[j][1] - c[1]) ** 2 + (pal[j][2] - c[2]) ** 2); cache[c] = i
        return i
    idx = [[[nearest(c) for c in row] for row in px] for _, _, px in imgs]
    gct = b''.join(bytes(c) for c in pal)
    out = bytearray(b'GIF89a' + struct.pack('<HHBBB', w, h, 0xF0 | 5, 0, 0) + gct)
    out += b'\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00'            # boucle infinie
    prev = None
    for n, fr in enumerate(idx):
        x0, y0, x1, y1 = 0, 0, w - 1, h - 1
        if prev is not None:
            diff = [(x, y) for y in range(h) for x in range(w) if fr[y][x] != prev[y][x]]
            if not diff: x0 = y0 = x1 = y1 = 0
            else: xs = [d[0] for d in diff]; ys = [d[1] for d in diff]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        sub = [fr[y][x] for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
        d = delay_ms // 10 if n < len(idx) - 1 else delay_ms // 10
        out += b'\x21\xF9\x04' + bytes([0x04]) + struct.pack('<H', d) + b'\x00\x00'   # disposition 1 : on garde l'image précédente
        out += b'\x2C' + struct.pack('<HHHHB', x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0)
        out += bytes([6]) + blocks(lzw(sub, 6)); prev = fr
    out += b'\x3B'
    open(out_path, 'wb').write(out)
    print('✓ %s : %d images, %d Ko' % (out_path, len(files), len(out) // 1024))

main()
