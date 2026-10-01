// Jeu d'icônes SVG maison (trait 1,8, 24x24). Remplace les emojis dans l'interface.
const P = {
  dashboard: 'M4 4h7v9H4z M13 4h7v5h-7z M13 11h7v9h-7z M4 15h7v5H4z',
  chart: 'M4 19V5 M4 19h16 M8 15l3-4 3 2 5-7',
  candles: 'M7 4v3 M7 17v3 M5 7h4v10H5z M17 3v4 M17 15v4 M15 7h4v8h-4z',
  building: 'M5 21V5a1 1 0 011-1h8a1 1 0 011 1v16 M15 10h3a1 1 0 011 1v10 M3 21h18 M9 8h2 M9 12h2 M9 16h2',
  coins: 'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7 M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5',
  bank: 'M3 10l9-6 9 6 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 20h18',
  book: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4z M5 17a3 3 0 013-3h10',
  bookOpen: 'M12 7c-1.5-1.6-3.8-2.5-7-2.5v12c3.2 0 5.5.9 7 2.5 1.5-1.6 3.8-2.5 7-2.5v-12c-3.2 0-5.5.9-7 2.5z M12 7v12',
  trophy: 'M8 4h8v5a4 4 0 01-8 0V4z M8 6H5v1a3 3 0 003 3 M16 6h3v1a3 3 0 01-3 3 M12 13v4 M8.5 20h7 M10 17h4',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M3 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M16.5 14.2A6 6 0 0121 20',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 13a7.6 7.6 0 000-2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 00-1.7-1L15 3.5h-4l-.4 2.6a7.5 7.5 0 00-1.7 1l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 000 2l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 001.7 1l.4 2.6h4l.4-2.6a7.5 7.5 0 001.7-1l2.3 1 2-3.4z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18z M9.6 9.4a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.1 M12 17h.01',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z M10 20a2 2 0 004 0',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14z M21 21l-4.8-4.8',
  plus: 'M12 5v14 M5 12h14',
  arrowUpRight: 'M7 17L17 7 M8 7h9v9',
  arrowDownRight: 'M7 7l10 10 M17 8v9H8',
  swap: 'M4 8h13 M14 4l4 4-4 4 M20 16H7 M10 12l-4 4 4 4',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronsLeft: 'M11 7l-5 5 5 5 M18 7l-5 5 5 5',
  chevronsRight: 'M6 7l5 5-5 5 M13 7l5 5-5 5',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z',
  share: 'M16 8a3 3 0 100-6 3 3 0 000 6z M6 15a3 3 0 100-6 3 3 0 000 6z M16 22a3 3 0 100-6 3 3 0 000 6z M8.6 10.5l4.8-2.9 M8.6 13.5l4.8 2.9',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4V8z M12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  expand: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  crown: 'M3.5 8l4.5 4 4-7 4 7 4.5-4-1.5 11h-14L3.5 8z',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4.5 20a7.5 7.5 0 0115 0',
  logout: 'M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4 M15 8l4 4-4 4 M19 12H9',
  lock: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 017 0v3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12 M18 6L6 18',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 11v5 M12 8h.01',
  wallet: 'M4 7a2 2 0 012-2h12v4 M4 7v11a2 2 0 002 2h13a1 1 0 001-1v-9a1 1 0 00-1-1H6a2 2 0 01-2-2z M16 14.5h.01',
  flame: 'M12 21c-3.9 0-6.5-2.6-6.5-6 0-2.6 1.5-4.4 3-6 .8-.9 1.3-2 1.3-3.5 2.6 1.4 4 3.4 4.4 5.5.6-.6 1-1.4 1.1-2.4 1.5 1.7 2.7 3.6 2.7 6.4 0 3.4-2.6 6-6 6z',
  gift: 'M4 11h16v9H4z M3 8h18v3H3z M12 8v12 M12 8c-1.5-3-5.5-3.5-5.5-1S9 8 12 8zm0 0c1.5-3 5.5-3.5 5.5-1S15 8 12 8z',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z M12 13a1 1 0 100-2 1 1 0 000 2z',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.1 8.2-7.5 9.5-4.4-1.3-7.5-4.9-7.5-9.5V6L12 3z M9 12l2.2 2.2L15.5 10',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18z M3.5 12h17 M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z',
  layout: 'M4 4h16v16H4z M4 10h16 M10 10v10',
  trendUp: 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  trendDown: 'M3 7l6 6 4-4 8 8 M15 17h6v-6',
  pie: 'M12 3v9h9 M12 3a9 9 0 109 9',
  alert: 'M12 3.5l9.5 16.5h-19L12 3.5z M12 10v4.5 M12 17.5h.01',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2',
  file: 'M6 3h8l5 5v13H6z M14 3v5h5 M9 13h7 M9 17h7',
  filter: 'M4 5h16l-6 8v6l-4-2v-4L4 5z',
  pen: 'M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19l-4 1z',
  ruler: 'M3 17L17 3l4 4L7 21l-4-4z M8 12l2 2 M11 9l2 2 M14 6l2 2',
  text: 'M5 6V4h14v2 M12 4v16 M9 20h6',
  zoom: 'M11 18a7 7 0 100-14 7 7 0 000 14z M21 21l-4.8-4.8 M11 8v6 M8 11h6',
  cursor: 'M12 3v18 M3 12h18 M12 3l-2.5 2.5 M12 3l2.5 2.5 M12 21l-2.5-2.5 M12 21l2.5-2.5 M3 12l2.5-2.5 M3 12l2.5 2.5 M21 12l-2.5-2.5 M21 12l-2.5 2.5',
  bars: 'M6 20V10 M12 20V4 M18 20v-7',
  discord: 'M8.5 7.5c2.2-.8 4.8-.8 7 0 M7 17.5c3 1.3 7 1.3 10 0 M8 7.5L6 17.5 M16 7.5l2 10 M9.5 12.5h.01 M14.5 12.5h.01',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  copy: 'M9 9h10v11H9z M5 15V4h10',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  trash: 'M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13',
};

export default function Icon({ name, size = 20, className = '', label, strokeWidth, ...rest }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg
      className={`ik-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth={strokeWidth}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(P);
