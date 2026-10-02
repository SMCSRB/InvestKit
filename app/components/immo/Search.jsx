'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/app/components/ui/Icon';
import { Button, EmptyState, Segmented, Skeleton, Switch } from '@/app/components/ui/primitives';
import HelpTip from '@/app/components/HelpTip';
import { LazyListingArt } from './art';
import CityMap from './CityMap';
import { Dpe, Heart, Pill, Portal } from './bits';
import { CONDITION_LABEL, TYPE_LABEL, call, coins, eur, listingAlt, pct } from './api';

export const DEFAULT_SEARCH = { filters: {}, view: 'grid', sort: 'relevance', favOnly: false };
const SORTS = [['relevance', 'Pertinence'], ['price_asc', 'Prix croissant'], ['price_desc', 'Prix décroissant'], ['ppsqm_asc', 'Prix au m² croissant'], ['ppsqm_desc', 'Prix au m² décroissant'], ['yield_desc', 'Rendement décroissant'], ['newest', 'Plus récentes']];
const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const arr = (v) => (Array.isArray(v) ? v : v ? String(v).split(',') : []);
const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

// Filtres → paramètres d'URL (validés ensuite par le serveur : le navigateur n'est jamais cru).
const toQuery = (f, sort) => {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { const val = Array.isArray(v) ? v.join(',') : v; if (val !== '' && val !== undefined && val !== false && !(Array.isArray(v) && v.length === 0)) p.set(k, String(val)); });
  if (sort && sort !== 'relevance') p.set('sort', sort);
  return p.toString();
};

export function ListingCard({ l, city, favorite, onFavorite, onOpen, active, onActive, variant = 'grid', eurosPerCoin }) {
  return (
    <article className={`rp-card rp-card--${variant} ${active ? 'is-active' : ''}`} onMouseEnter={() => onActive?.(l.id)} onMouseLeave={() => onActive?.(null)} data-listing={l.id}>
      <div className="rp-card__media" onClick={() => onOpen(l.id)}>
        <LazyListingArt listing={l} alt={listingAlt(l, city)} badge={variant !== 'compact'} />
        <div className="rp-card__badges">
          {l.urgentSale && <Pill tone="hot">Vente pressée</Pill>}
          {l.needsWorks && <Pill tone="warn">Travaux à prévoir</Pill>}
        </div>
        <div className="rp-card__dpe"><Dpe cls={l.energyClass} /></div>
        <Heart on={favorite} onClick={() => onFavorite(l.id)} label={favorite ? `Retirer ${l.title} des favoris` : `Ajouter ${l.title} aux favoris`} />
      </div>
      <div className="rp-card__body">
        <div className="rp-card__price"><strong>{eur(l.price)}</strong><span title={eurosPerCoin ? `Prix en InvestCoins (1 InvestCoin = ${eurosPerCoin} €)` : 'Prix en InvestCoins'}>≈ {coins(l.priceCoins)}</span></div>
        <h3 className="rp-card__title"><button type="button" onClick={() => onOpen(l.id)}>{TYPE_LABEL[l.type]} · {l.neighborhoodName}</button></h3>
        <p className="rp-card__meta">{l.surfaceSqm} m² · {l.rooms} pièce{l.rooms > 1 ? 's' : ''} · {city?.name ?? l.cityId}</p>
        <p className="rp-card__meta rp-card__meta--soft">{eur(l.pricePerSqm)}/m² · rendement brut {pct(l.grossYieldPct)} · {CONDITION_LABEL[l.condition]}</p>
      </div>
    </article>
  );
}

function Chip({ on, onClick, children, color }) {
  return <button type="button" className={`rp-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={onClick} style={color && on ? { background: color.bg, color: color.fg, borderColor: color.bg } : undefined}>{children}</button>;
}

function NumberField({ label, value, onChange, placeholder, suffix, id }) {
  return (
    <label className="rp-field" htmlFor={id}>
      <span>{label}</span>
      <span className="rp-field__box"><input id={id} className="ik-input" type="number" inputMode="numeric" min="0" value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />{suffix && <em>{suffix}</em>}</span>
    </label>
  );
}

function FilterPanel({ f, set, onClose, count, onReset }) {
  const energyColors = { A: ['#2f9e5b', '#06210f'], B: ['#5fb04a', '#0c2208'], C: ['#a6c13a', '#1d2406'], D: ['#e6c52b', '#2a2305'], E: ['#f0a229', '#2e1c03'], F: ['#e8742a', '#2e1403'], G: ['#d6453d', '#fff'] };
  return (
    <div className="rp-filters" role="dialog" aria-label="Filtres de recherche">
      <div className="rp-filters__head"><strong>Filtres</strong><Button size="sm" variant="ghost" icon="x" aria-label="Fermer les filtres" onClick={onClose} /></div>
      <div className="rp-filters__grid">
        <fieldset><legend>Type de bien</legend>
          <div className="rp-chips">{Object.entries(TYPE_LABEL).map(([k, v]) => <Chip key={k} on={arr(f.types).includes(k)} onClick={() => set({ types: toggleIn(arr(f.types), k) })}>{v}</Chip>)}</div>
          <p className="rp-hint">Parkings et immeubles entiers n’existent pas encore dans le catalogue.</p>
        </fieldset>
        <fieldset><legend>Budget</legend>
          <div className="rp-pair"><NumberField id="f-minp" label="Min" value={f.minPrice} onChange={(v) => set({ minPrice: v })} suffix="€" /><NumberField id="f-maxp" label="Max" value={f.maxPrice} onChange={(v) => set({ maxPrice: v })} suffix="€" /></div>
        </fieldset>
        <fieldset><legend>Surface</legend>
          <div className="rp-pair"><NumberField id="f-mins" label="Min" value={f.minSurface} onChange={(v) => set({ minSurface: v })} suffix="m²" /><NumberField id="f-maxs" label="Max" value={f.maxSurface} onChange={(v) => set({ maxSurface: v })} suffix="m²" /></div>
        </fieldset>
        <fieldset><legend>Pièces (minimum)</legend>
          <div className="rp-chips">{[1, 2, 3, 4].map((n) => <Chip key={n} on={Number(f.minRooms) === n} onClick={() => set({ minRooms: Number(f.minRooms) === n ? '' : n })}>{n === 4 ? '4 et +' : n === 1 ? '1 et +' : `${n} et +`}</Chip>)}</div>
        </fieldset>
        <fieldset><legend>État</legend>
          <div className="rp-chips">{Object.entries(CONDITION_LABEL).map(([k, v]) => <Chip key={k} on={arr(f.conditions).includes(k)} onClick={() => set({ conditions: toggleIn(arr(f.conditions), k) })}>{v}</Chip>)}</div>
        </fieldset>
        <fieldset><legend>Classe DPE<HelpTip term="dpe" /></legend>
          <div className="rp-chips rp-chips--dpe">{ENERGY.map((c) => <Chip key={c} on={arr(f.energy).includes(c)} color={{ bg: energyColors[c][0], fg: energyColors[c][1] }} onClick={() => set({ energy: toggleIn(arr(f.energy), c) })}>{c}</Chip>)}</div>
        </fieldset>
        <fieldset><legend>Rendement brut minimum<HelpTip term="rendement-brut" /></legend>
          <div className="rp-chips">{[4, 5, 6, 7, 8].map((n) => <Chip key={n} on={Number(f.minYieldPct) === n} onClick={() => set({ minYieldPct: Number(f.minYieldPct) === n ? '' : n })}>{n} %</Chip>)}</div>
        </fieldset>
        <fieldset><legend>Options</legend>
          <div className="rp-switches">
            <div className="rp-switch"><Switch checked={f.urgentOnly === true} onChange={(v) => set({ urgentOnly: v })} label="Ventes pressées seulement" /><span>Ventes pressées seulement</span></div>
            <div className="rp-switch"><Switch checked={f.worksOnly === true} onChange={(v) => set({ worksOnly: v })} label="Travaux à prévoir" /><span>Travaux à prévoir</span></div>
          </div>
        </fieldset>
      </div>
      <div className="rp-filters__foot"><Button variant="ghost" onClick={onReset}>Effacer</Button><Button variant="primary" onClick={onClose}>Voir {count} annonce{count > 1 ? 's' : ''}</Button></div>
    </div>
  );
}

const FILTER_LABELS = (f, cities) => {
  const out = [];
  const c = cities.find((x) => x.id === f.cityId);
  if (c) out.push(['cityId', c.name]);
  if (f.q) out.push(['q', `« ${f.q} »`]);
  arr(f.types).forEach((t) => out.push([`types:${t}`, TYPE_LABEL[t]]));
  if (f.minPrice) out.push(['minPrice', `dès ${eur(f.minPrice)}`]);
  if (f.maxPrice) out.push(['maxPrice', `jusqu’à ${eur(f.maxPrice)}`]);
  if (f.minSurface) out.push(['minSurface', `≥ ${f.minSurface} m²`]);
  if (f.maxSurface) out.push(['maxSurface', `≤ ${f.maxSurface} m²`]);
  if (f.minRooms) out.push(['minRooms', `${f.minRooms}+ pièces`]);
  arr(f.conditions).forEach((x) => out.push([`conditions:${x}`, CONDITION_LABEL[x]]));
  arr(f.energy).forEach((x) => out.push([`energy:${x}`, `DPE ${x}`]));
  if (f.minYieldPct) out.push(['minYieldPct', `rendement ≥ ${f.minYieldPct} %`]);
  if (f.urgentOnly) out.push(['urgentOnly', 'Ventes pressées']);
  if (f.worksOnly) out.push(['worksOnly', 'Travaux à prévoir']);
  return out;
};

export default function Search({ state, setState, onOpen, notify, game }) {
  const { filters, view, sort, favOnly } = state;
  const [data, setData] = useState(null);
  const [all, setAll] = useState([]);             // toutes les annonces de l'année (carte des prix, archipel)
  const [loading, setLoading] = useState(true);
  const [favIds, setFavIds] = useState(new Set());
  const [saved, setSaved] = useState([]);
  const [panel, setPanel] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [mobileMap, setMobileMap] = useState(false);
  const [qText, setQText] = useState(filters.q ?? '');
  const [filterError, setFilterError] = useState('');
  const reqRef = useRef(0);
  const savedRef = useRef(null);
  // Menu « Mes recherches » : se ferme avec Échap ou en cliquant ailleurs.
  useEffect(() => {
    if (!savedOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSavedOpen(false); };
    const onDown = (e) => { if (savedRef.current && !savedRef.current.contains(e.target)) setSavedOpen(false); };
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [savedOpen]);
  const set = (patch) => setState((s) => ({ ...s, filters: { ...s.filters, ...patch } }));

  // Recherche texte : la saisie est déportée de 300 ms pour ne pas interroger le serveur à chaque lettre.
  useEffect(() => { const t = setTimeout(() => { if ((filters.q ?? '') !== qText.trim()) set({ q: qText.trim() }); }, 300); return () => clearTimeout(t); }, [qText]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    const id = ++reqRef.current;
    setLoading(true);
    try {
      const r = await call(`/listings?${toQuery(filters, sort)}`);
      if (id === reqRef.current) { setData(r); setFilterError(''); }
    } catch (e) {
      // Saisie en cours (ex. budget minimum > maximum) : message discret sur place, pas de fenêtre d'erreur à chaque touche.
      if (id === reqRef.current) { if (e.status === 400) setFilterError(e.message); else notify(e.message, true); }
    }
    if (id === reqRef.current) setLoading(false);
  }, [filters, sort, notify]);
  useEffect(() => { const t = setTimeout(load, 120); return () => clearTimeout(t); }, [load, game.year]);

  // Toutes les annonces de l'année ne servent qu'à la carte (teinte des quartiers, archipel) : on ne les charge que dans cette vue.
  useEffect(() => { if (view === 'map') call('/listings').then((r) => setAll(r.listings)).catch(() => {}); }, [view, game.year]);
  const loadWatch = useCallback(async () => {
    try { const [f, s] = await Promise.all([call('/favorites'), call('/saved-searches')]); setFavIds(new Set(f.ids)); setSaved(s.searches); } catch { /* non bloquant */ }
  }, []);
  useEffect(() => { loadWatch(); }, [loadWatch, game.year]);

  const cities = data?.cities ?? [];
  const cityOf = useMemo(() => Object.fromEntries(cities.map((c) => [c.id, c])), [cities]);
  const shown = useMemo(() => (data?.listings ?? []).filter((l) => !favOnly || favIds.has(l.id)), [data, favOnly, favIds]);

  const toggleFav = async (id) => {
    const had = favIds.has(id);
    setFavIds((s) => { const n = new Set(s); if (had) n.delete(id); else n.add(id); return n; });
    try { await call(`/favorites/${encodeURIComponent(id)}`, had ? 'DELETE' : 'PUT'); }
    catch (e) { setFavIds((s) => { const n = new Set(s); if (had) n.add(id); else n.delete(id); return n; }); notify(e.message, true); }
  };

  const labels = FILTER_LABELS(filters, cities);
  const removeFilter = (key) => {
    const [k, v] = key.split(':');
    if (v !== undefined) set({ [k]: arr(filters[k]).filter((x) => x !== v) });
    else { set({ [k]: ['urgentOnly', 'worksOnly'].includes(k) ? false : '' }); if (k === 'q') setQText(''); }
  };
  const reset = () => { setState((s) => ({ ...s, filters: {}, favOnly: false })); setQText(''); };

  const saveSearch = async () => {
    const name = window.prompt('Nom de cette recherche (60 caractères max) :', labels.map((l) => l[1]).join(', ').slice(0, 60) || 'Ma recherche');
    if (!name) return;
    try { await call('/saved-searches', 'POST', { name, filters: { ...filters, sort } }); notify('Recherche enregistrée : tu seras prévenu des nouvelles annonces.'); await loadWatch(); } catch (e) { notify(e.message, true); }
  };
  const applySaved = async (s) => {
    setState((st) => ({ ...st, filters: { ...s.filters, sort: undefined }, sort: s.filters.sort ?? 'relevance', favOnly: false })); setQText(s.filters.q ?? ''); setSavedOpen(false);
    try { await call(`/saved-searches/${s.id}/seen`, 'POST'); await loadWatch(); } catch { /* ignore */ }
  };
  const removeSaved = async (id) => { try { await call(`/saved-searches/${id}`, 'DELETE'); await loadWatch(); } catch (e) { notify(e.message, true); } };
  const newTotal = saved.reduce((n, s) => n + s.newCount, 0);

  const cityPicked = filters.cityId;
  const mapNode = (
    <CityMap cityId={cityPicked} cities={cities} listings={shown} allListings={all} activeId={activeId} onActive={setActiveId} onOpen={onOpen} favorites={favIds}
      onCity={(id) => set({ cityId: id })} />
  );

  return (
    <div className="rp-search">

      <div className="rp-searchbar" role="search">
        <label className="rp-searchbar__input">
          <Icon name="search" size={20} />
          <span className="ik-sr-only">Ville, quartier ou région</span>
          <input className="ik-input" type="search" list="rp-cities" placeholder="Ville, quartier ou région (ex. Marvelle, Centre, Bassin Minier)" value={qText} maxLength={60} onChange={(e) => setQText(e.target.value)} autoComplete="off" />
          <datalist id="rp-cities">{cities.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </label>
        <select className="ik-select rp-searchbar__city" value={filters.cityId ?? ''} onChange={(e) => set({ cityId: e.target.value })} aria-label="Ville">
          <option value="">Toutes les villes</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button variant="primary" icon="filter" onClick={() => setPanel((p) => !p)} aria-expanded={panel}>Filtres{labels.length ? ` (${labels.length})` : ''}</Button>
      </div>

      <div className="rp-quick">
        {Object.entries(TYPE_LABEL).map(([k, v]) => <Chip key={k} on={arr(filters.types).includes(k)} onClick={() => set({ types: toggleIn(arr(filters.types), k) })}>{v}</Chip>)}
        <Chip on={filters.urgentOnly === true} onClick={() => set({ urgentOnly: !filters.urgentOnly })}>Ventes pressées</Chip>
        <Chip on={favOnly} onClick={() => setState((s) => ({ ...s, favOnly: !s.favOnly }))}>♥ Favoris ({favIds.size})</Chip>
      </div>

      {panel && (
        <Portal>
          <div className="rp-backdrop" onClick={() => setPanel(false)} aria-hidden="true" />
          <FilterPanel f={filters} set={set} onClose={() => setPanel(false)} count={shown.length} onReset={reset} />
        </Portal>
      )}

      {filterError && <p className="ik-error" role="status">Ces filtres ne vont pas ensemble ({filterError}). Les résultats affichés sont ceux de la recherche précédente.</p>}
      {labels.length > 0 && (
        <ul className="rp-active" aria-label="Filtres actifs">
          {labels.map(([k, label]) => <li key={k}><button type="button" onClick={() => removeFilter(k)} aria-label={`Retirer le filtre ${label}`}>{label} <span aria-hidden="true">×</span></button></li>)}
          <li><button type="button" className="rp-active__clear" onClick={reset}>Tout effacer</button></li>
        </ul>
      )}

      <div className="rp-toolbar">
        <p className="rp-count" aria-live="polite">{loading && !data ? 'Recherche…' : `${shown.length} annonce${shown.length > 1 ? 's' : ''}${data && data.total !== shown.length ? ` sur ${data.total}` : ''}`}</p>
        <div className="rp-toolbar__right">
          <div className="rp-saved" ref={savedRef}>
            <Button size="sm" icon="bell" onClick={() => setSavedOpen((o) => !o)} aria-expanded={savedOpen}>Mes recherches{newTotal > 0 && <span className="rp-badge" aria-label={`${newTotal} nouvelle${newTotal > 1 ? 's' : ''} annonce${newTotal > 1 ? 's' : ''}`}>{newTotal}</span>}</Button>
            {savedOpen && (
              <div className="rp-saved__menu" role="group" aria-label="Mes recherches enregistrées">
                <Button size="sm" variant="primary" onClick={saveSearch} disabled={labels.length === 0 && sort === 'relevance'}>＋ Enregistrer cette recherche</Button>
                {saved.length === 0 && <p className="rp-hint">Aucune recherche enregistrée. Enregistre-en une pour être prévenu des nouvelles annonces (au changement d’année de jeu).</p>}
                {saved.map((s) => (
                  <div className="rp-saved__item" key={s.id}>
                    <button type="button" onClick={() => applySaved(s)}><strong>{s.name}</strong><span>{s.invalid ? 'Filtres obsolètes : supprime cette recherche' : <>{s.count} annonce{s.count > 1 ? 's' : ''}</>}{s.newCount > 0 && <em> · {s.newCount} nouvelle{s.newCount > 1 ? 's' : ''}</em>}</span></button>
                    <Button size="sm" variant="ghost" icon="trash" aria-label={`Supprimer la recherche ${s.name}`} onClick={() => removeSaved(s.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="rp-sort"><span className="ik-sr-only">Trier par</span>
            <select className="ik-select" value={sort} onChange={(e) => setState((s) => ({ ...s, sort: e.target.value }))}>{SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <Segmented ariaLabel="Affichage" value={view} onChange={(v) => setState((s) => ({ ...s, view: v }))} options={[{ value: 'grid', label: 'Grille' }, { value: 'list', label: 'Liste' }, { value: 'map', label: 'Carte' }]} />
        </div>
      </div>

      <h2 className="ik-sr-only">Résultats de la recherche</h2>
      {loading && !data ? <div className="rp-grid">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={335} />)}</div>
        : shown.length === 0 ? (
          <EmptyState icon="search" title="Aucune annonce ne correspond" action={<Button onClick={reset}>Effacer les filtres</Button>}>Élargis ton budget, retire un filtre ou change de ville.</EmptyState>
        ) : view === 'map' ? (
          <div className={`rp-split ${mobileMap ? 'is-map' : ''}`}>
            <div className="rp-split__list">
              {shown.map((l) => <ListingCard key={l.id} l={l} city={cityOf[l.cityId]} favorite={favIds.has(l.id)} onFavorite={toggleFav} onOpen={onOpen} active={activeId === l.id} onActive={setActiveId} variant="compact" eurosPerCoin={data?.eurosPerCoin} />)}
            </div>
            <div className="rp-split__map">{mapNode}{!cityPicked && <p className="rp-hint">Choisis une ville sur la carte pour voir ses quartiers et ses annonces.</p>}</div>
            <Portal><div className="rp-mapswitch"><Segmented ariaLabel="Liste ou carte" value={mobileMap ? 'map' : 'list'} onChange={(v) => setMobileMap(v === 'map')} options={[{ value: 'list', label: 'Liste' }, { value: 'map', label: 'Carte' }]} /></div></Portal>
          </div>
        ) : (
          <div className={view === 'list' ? 'rp-list' : 'rp-grid'}>
            {shown.map((l, i) => <div key={l.id} className="rp-appear" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}><ListingCard l={l} city={cityOf[l.cityId]} favorite={favIds.has(l.id)} onFavorite={toggleFav} onOpen={onOpen} variant={view} eurosPerCoin={data?.eurosPerCoin} /></div>)}
          </div>
        )}
    </div>
  );
}
