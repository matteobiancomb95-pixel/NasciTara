/**
 * Icone a tratto (24×24, tratto 2, angoli arrotondati) nello stile del mockup v2.
 * Colore dal testo (currentColor): dentro `.nt-ico` diventano rosa su fondo tinta.
 */
export type IconName =
  | 'scale' | 'ruler' | 'calendar' | 'clock' | 'gift' | 'camera' | 'scan' | 'chart' | 'chevron' | 'check' | 'plus'
  | 'pill' | 'stethoscope' | 'note' | 'book' | 'run' | 'play' | 'smile' | 'sparkle' | 'bell' | 'mail' | 'star'
  | 'washer' | 'dryer' | 'sun' | 'snow' | 'leaf' | 'flower' | 'info' | 'heart' | 'footprints' | 'mood' | 'search'
  | 'hanger' | 'baby' | 'trash' | 'phone' | 'users' | 'arrow';

const PATHS: Record<IconName, string> = {
  scale: '<path d="M5 8h14l-1.5 11a2 2 0 01-2 1.7h-7a2 2 0 01-2-1.7z"/><path d="M9 8a3 3 0 016 0"/><path d="M12 12v3"/>',
  ruler: '<rect x="2.5" y="8" width="19" height="8" rx="2"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  gift: '<rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M3 9h18M12 9v11.5"/><path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
  camera: '<path d="M4 8.5h3l1.7-2.5h6.6L17 8.5h3a1 1 0 011 1V18a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18V9.5a1 1 0 011-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  scan: '<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16"/><path d="M8 15c1.2-4 6.8-4 8 0"/><circle cx="12" cy="9.5" r="1.6"/>',
  chart: '<path d="M4 20h16"/><path d="M5 16l4.5-4.5 3.5 3 6-6.5"/><path d="M15 8h4v4"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.9 8.9l4.2 6"/>',
  stethoscope: '<path d="M6 3.5v5a4 4 0 008 0v-5"/><path d="M10 12.5v2a4.5 4.5 0 009 0v-1.5"/><circle cx="19" cy="11" r="2"/>',
  note: '<path d="M6 3.5h9l4 4V19a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19V5a1.5 1.5 0 011-1.5z"/><path d="M14.5 3.5V8h4.5M8.5 12h7M8.5 15.5h5"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5z"/><path d="M20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5z"/>',
  run: '<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-6 3 2.5V21M6 11l3-3.5 4 1 2.5 3.5 3 .5"/><path d="M11 15l2-6.5"/>',
  play: '<circle cx="12" cy="12" r="8.5"/><path d="M10 8.5l5.5 3.5-5.5 3.5z"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1.8 2 5.2 2 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  sparkle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 7.5l8 6 8-6"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.8-5 2.8 1-5.6L3.9 9.7l5.6-.7z"/>',
  washer: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="13" r="4.5"/><path d="M7.5 6.5h.01M10.5 6.5h3"/>',
  dryer: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="13" r="4.5"/><path d="M10 12c1-1 3 1 4 0M10 14.5c1-1 3 1 4 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5"/>',
  leaf: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
  flower: '<circle cx="12" cy="10" r="2.5"/><path d="M12 7.5c0-3 4-3 3 0M14.5 10c3 0 3 4 0 3M12 12.5c0 3-4 3-3 0M9.5 10c-3 0-3-4 0-3"/><path d="M12 13v8M12 17c2-2 4-2 5-1.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5h.01"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0112 7.6a4.1 4.1 0 017.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/>',
  footprints: '<path d="M7 4c2 0 3 2 3 4.5S9 13 7 13 4 11 4 8.5 5 4 7 4zM5 15.5c.5 2 1.5 3 2.8 2.7 1.3-.3 1.5-1.6 1.2-3"/><path d="M16 8c2 0 3 2 3 4.5S18 17 16 17s-3-2-3-4.5S14 8 16 8z"/>',
  mood: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 15.5c1.8-1.3 5.2-1.3 7 0"/><path d="M9 10h.01M15 10h.01"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  hanger: '<path d="M10 6.5a2 2 0 113 1.8c-.6.3-1 .9-1 1.5V11"/><path d="M12 11l-8.6 6.1A1 1 0 004 19h16a1 1 0 00.6-1.9z"/>',
  baby: '<circle cx="12" cy="13" r="7.5"/><path d="M12 5.5c0-1.6 1.1-2.6 2.6-2.6"/><path d="M9.5 16c1.4 1 3.6 1 5 0"/><path d="M9 12h.01M15 12h.01"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 005.5 5.5l1.5-2 4.5 1.5v3a2 2 0 01-2 2A16 16 0 014.5 5.5a2 2 0 012-2z"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5"/><path d="M16 5.5a3.5 3.5 0 010 6.5M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PATHS[name] }} style={{ flex: 'none' }} />
  );
}

/** Icona in un cerchio colorato: il modo standard di aprire una card. */
export function IconBubble({ name, tone = 'tint', size = 44 }: { name: IconName; tone?: 'tint' | 'brand' | 'white' | 'dark'; size?: number }) {
  return (
    <span className={`nt-ico nt-ico--${tone}`} style={{ width: size, height: size }}>
      <Icon name={name} size={Math.round(size * 0.5)} />
    </span>
  );
}
