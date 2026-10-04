// Lecteur CSV en continu (aucun fichier n'est jamais chargé en entier) + détection du séparateur et de l'encodage.
export const detectSep = (headerLine: string): string => {
  let best = ','; let bestN = -1;
  for (const sep of [',', ';', '|', '\t']) {
    let n = 0; let q = false;
    for (const c of headerLine) { if (c === '"') q = !q; else if (!q && c === sep) n++; }
    if (n > bestN) { best = sep; bestN = n; }
  }
  return best;
};

// Encodage : UTF-8 si le début du fichier est de l'UTF-8 valide, sinon Windows-1252 (latin1). Le BOM est ignoré.
export const detectEncoding = (head: Buffer): 'utf8' | 'latin1' => {
  let end = head.length;
  // On ne juge pas un caractère coupé en fin d'échantillon.
  for (let back = 0; back < 4 && end - back > 0; back++) {
    try { new TextDecoder('utf-8', { fatal: true }).decode(head.subarray(0, end - back)); return 'utf8'; } catch { /* essai plus court */ }
  }
  return 'latin1';
};
// Décodeur adaptatif : UTF-8 tant que chaque morceau est de l'UTF-8 valide ; dès qu'un morceau ne l'est pas, tout le reste est lu en latin1 (Windows-1252).
// (Un fichier dont le début est purement ASCII ne trahit pas son encodage tout de suite : on ne tranche donc jamais sur le seul premier morceau.)
export class AdaptiveDecoder {
  private mode: 'utf8' | 'latin1' = 'utf8';
  private carry: Buffer = Buffer.alloc(0);
  get encoding(): 'utf8' | 'latin1' { return this.mode; }
  write(buf: Buffer): string {
    const b = this.carry.length ? Buffer.concat([this.carry, buf]) : buf;
    this.carry = Buffer.alloc(0);
    if (this.mode === 'latin1') return b.toString('latin1');
    let end = b.length;
    for (let k = 1; k <= Math.min(3, b.length); k++) {            // séquence UTF-8 coupée à la fin du morceau : on la garde pour le morceau suivant
      const byte = b[b.length - k];
      if ((byte & 0xc0) === 0x80) continue;
      if (byte >= 0xc0) { const need = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : 2; if (k < need) end = b.length - k; }
      break;
    }
    try { const s = new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(0, end)); this.carry = Buffer.from(b.subarray(end)); return s; }
    catch { this.mode = 'latin1'; return b.toString('latin1'); }
  }
  end(): string { const s = this.carry.length ? this.carry.toString(this.mode) : ''; this.carry = Buffer.alloc(0); return s; }
}
export const decodeText = (buf: Buffer): string => { const d = new AdaptiveDecoder(); return d.write(buf) + d.end(); };

// Analyseur par morceaux : push(texte) renvoie les enregistrements terminés ; end() renvoie le dernier. Guillemets, séparateurs et sauts de ligne dans les champs, guillemets doublés.
export class CsvStream {
  private row: string[] = []; private field = ''; private quoted = false; private pendingQuote = false; private pendingCr = false; private first = true;
  private sep: string | null;
  private buffered = '';
  constructor(sep?: string) { this.sep = sep ?? null; }
  get separator(): string { return this.sep ?? ','; }

  push(chunk: string): string[][] {
    let text = chunk;
    if (this.first) { this.first = false; if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); }
    if (this.sep === null) {
      this.buffered += text;
      const nl = this.buffered.search(/[\r\n]/);
      if (nl < 0) return [];
      this.sep = detectSep(this.buffered.slice(0, nl));
      text = this.buffered; this.buffered = '';
    }
    const out: string[][] = [];
    const sep = this.sep;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (this.pendingCr) { this.pendingCr = false; if (c === '\n') continue; }
      if (this.pendingQuote) {
        this.pendingQuote = false;
        if (c === '"') { this.field += '"'; continue; }
        this.quoted = false;                       // le guillemet fermait le champ : on traite le caractère courant normalement
      }
      if (this.quoted) { if (c === '"') this.pendingQuote = true; else this.field += c; continue; }
      if (c === '"' && this.field === '') this.quoted = true;
      else if (c === sep) { this.row.push(this.field); this.field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r') this.pendingCr = true;
        this.row.push(this.field); this.field = '';
        if (this.row.length > 1 || this.row[0] !== '') out.push(this.row);
        this.row = [];
      } else this.field += c;
    }
    return out;
  }
  end(): string[][] {
    const out: string[][] = [];
    if (this.sep === null && this.buffered) { this.sep = detectSep(this.buffered); const t = this.buffered; this.buffered = ''; out.push(...this.push(t)); }
    if (this.pendingQuote) { this.pendingQuote = false; this.quoted = false; }
    if (this.field !== '' || this.row.length) { this.row.push(this.field); if (this.row.length > 1 || this.row[0] !== '') out.push(this.row); }
    this.field = ''; this.row = [];
    return out;
  }
}
