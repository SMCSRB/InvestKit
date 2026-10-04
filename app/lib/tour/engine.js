// Visite guidée : calculs PURS (aucun DOM, aucune horloge) pour pouvoir les tester à fond.

export const PAD = 8;               // marge autour de l'élément mis en lumière
export const MARGIN = 12;           // marge minimale entre la bulle et le bord de l'écran
export const MOBILE_MAX = 640;      // en dessous : la bulle devient un panneau fixé en bas de l'écran

export const isUsableRect = (r) => !!r && Number.isFinite(r.width) && Number.isFinite(r.height) && r.width > 1 && r.height > 1;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Zone mise en lumière : le rectangle de l'élément, élargi, ramené dans l'écran.
export const holeOf = (rect, vw, vh, pad = PAD) => {
  const left = clamp(rect.left - pad, 0, vw);
  const top = clamp(rect.top - pad, 0, vh);
  const right = clamp(rect.left + rect.width + pad, 0, vw);
  const bottom = clamp(rect.top + rect.height + pad, 0, vh);
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
};

// Où poser la bulle. Téléphone : panneau en bas (jamais sur l'élément, qu'on fait défiler au-dessus). Sinon : du côté préféré s'il y a la place, sinon du côté qui en a le plus ;
// la flèche pointe le centre de l'élément. Retourne { mode, left, top, placement, arrow } (arrow = décalage en pixels le long du bord de la bulle).
export const placePopover = ({ hole, size, viewport, prefer = 'bottom', margin = MARGIN, gap = 14 }) => {
  const { w: vw, h: vh } = viewport;
  if (vw <= MOBILE_MAX) return { mode: 'sheet', left: margin, top: null, placement: 'sheet', arrow: null };
  const width = Math.min(size.w, vw - 2 * margin);
  if (!hole) return { mode: 'center', left: Math.round((vw - width) / 2), top: Math.max(margin, Math.round((vh - size.h) / 2)), placement: 'center', arrow: null };
  const room = {
    bottom: vh - (hole.top + hole.height) - gap - margin,
    top: hole.top - gap - margin,
    right: vw - (hole.left + hole.width) - gap - margin,
    left: hole.left - gap - margin,
  };
  const fits = (side) => (side === 'top' || side === 'bottom' ? room[side] >= size.h : room[side] >= width);
  const order = [prefer, 'bottom', 'top', 'right', 'left'].filter((s, i, a) => a.indexOf(s) === i);
  const side = order.find(fits) ?? order.slice().sort((a, b) => room[b] - room[a])[0];
  let left; let top;
  if (side === 'top' || side === 'bottom') {
    left = clamp(hole.left + hole.width / 2 - width / 2, margin, vw - width - margin);
    top = side === 'bottom' ? hole.top + hole.height + gap : hole.top - gap - size.h;
  } else {
    top = clamp(hole.top + hole.height / 2 - size.h / 2, margin, vh - size.h - margin);
    left = side === 'right' ? hole.left + hole.width + gap : hole.left - gap - width;
  }
  top = clamp(top, margin, Math.max(margin, vh - size.h - margin));
  left = clamp(left, margin, Math.max(margin, vw - width - margin));
  const cx = hole.left + hole.width / 2; const cy = hole.top + hole.height / 2;
  const arrow = side === 'top' || side === 'bottom' ? clamp(cx - left, 18, width - 18) : clamp(cy - top, 18, size.h - 18);
  return { mode: 'bubble', left: Math.round(left), top: Math.round(top), placement: side, arrow: Math.round(arrow), width };
};

// Étape suivante (dir = 1) ou précédente (dir = -1) en sautant les étapes déjà écartées ; null s'il n'y en a plus.
export const stepIndexFrom = (steps, from, dir, skipped = new Set()) => {
  for (let i = from + dir; i >= 0 && i < steps.length; i += dir) if (!skipped.has(steps[i].id)) return i;
  return null;
};

// Compteur « Étape n sur N » : les étapes de déplacement (le guide clique le menu) ne comptent pas, ni les étapes écartées.
export const progressOf = (steps, index, skipped = new Set()) => {
  const counted = steps.filter((s) => s.kind !== 'travel' && !skipped.has(s.id));
  const cur = steps[index];
  const n = cur && cur.kind !== 'travel' ? counted.findIndex((s) => s.id === cur.id) + 1 : counted.filter((s) => steps.indexOf(s) < index).length;
  return { n: Math.max(1, n), total: Math.max(1, counted.length) };
};

// Premier sélecteur de la liste qui désigne un élément réellement visible (la liste permet des replis : Bitcoin, sinon n'importe quelle ligne).
export const resolveTarget = (selectors, query, isVisible) => {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    let nodes;
    try { nodes = query(sel); } catch { continue; }          // sélecteur invalide : on passe au suivant, jamais d'erreur
    for (const n of nodes) if (isVisible(n)) return n;
  }
  return null;
};

// L'étape doit-elle être proposée sur cette page ? (elle appartient à une page précise, ou à toutes)
export const pathMatches = (stepPage, pathname) => !stepPage || pathname === stepPage || pathname.startsWith(`${stepPage}/`);

// Où reprendre : l'étape mémorisée si elle existe encore dans cette visite, sinon le début.
export const resumeIndex = (steps, stepId) => { const i = steps.findIndex((s) => s.id === stepId); return i >= 0 ? i : 0; };

// Une visite est-elle à proposer sur cette page ? (jamais lancée, pas de visite en cours, rubrique pas déjà vue pendant la visite complète)
export const shouldInvite = ({ pageTour, tours, seen, running, section }) => !!pageTour && !running && tours?.[pageTour]?.status === 'new' && tours?.main?.status !== 'running' && !(seen || []).includes(section ?? pageTour);
