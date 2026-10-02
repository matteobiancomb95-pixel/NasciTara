import type { CSSProperties } from 'react';
import type { GarmentIcon } from '../lib/corredino';

/**
 * Illustrazioni del progetto Claude Design (29/09/2026): il bebe nel pancione, animato,
 * e le icone dei capi del corredino. Le animazioni sono in app.css (nt-sway, nt-kick, ...)
 * e si fermano con prefers-reduced-motion.
 */

const anim = (origin: string, animation: string): CSSProperties => ({ transformBox: 'view-box', transformOrigin: origin, animation });

export function Fetus({ size, boy = false, label }: { size: number; boy?: boolean; label: string }) {
  const pal = boy ? { womb: '#d9e8fb', inner: '#ebf3fd', ring: '#a9c8f0', cord: '#a9c8f0' } : { womb: '#ffd0d7', inner: '#ffe6ea', ring: '#ffa0ae', cord: '#ffa0ae' };
  const skin = '#ffcbbb', leg = '#ffbba7', arm = '#f7a894', line = '#d9786a';
  return (
    <svg className="nt-fetus" viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label} style={{ overflow: 'visible', display: 'block', maxWidth: '100%', height: 'auto' }}>
      <circle cx={100} cy={100} r={98} fill="none" stroke={pal.ring} strokeWidth={2} style={anim('100px 100px', 'nt-ring 3s ease-out infinite')} />
      <circle cx={100} cy={100} r={94} fill={pal.womb} />
      <circle cx={100} cy={100} r={80} fill={pal.inner} style={anim('100px 100px', 'nt-breathe 5s ease-in-out infinite')} />
      {[[48, 150, 3.5, 0], [152, 64, 2.5, 1.3], [142, 156, 2.5, 2.2], [58, 58, 2, 0.7]].map(([x, y, r, d]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#ffffff" style={{ opacity: 0, ...anim(`${x}px ${y}px`, `nt-bubble 4s ease-in ${d}s infinite`) }} />
      ))}
      <g style={anim('104px 110px', 'nt-sway 7s ease-in-out infinite')}>
        <path d="M108 140 C 130 176, 152 126, 178 150" fill="none" stroke={pal.cord} strokeWidth={6} strokeLinecap="round" />
        <ellipse cx={116} cy={126} rx={36} ry={45} transform="rotate(-30 116 126)" fill={skin} />
        <g style={anim('134px 156px', 'nt-kick 3.6s ease-in-out infinite')}>
          <path d="M134 156 Q110 164 88 146 Q80 160 100 176" fill="none" stroke={leg} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx={104} cy={178} rx={10} ry={6.5} fill={arm} />
        </g>
        <circle cx={120} cy={132} r={5} fill="#ff395c" style={anim('120px 132px', 'nt-beat 1.1s ease-in-out infinite')} />
        <g style={anim('112px 104px', 'nt-wave 4.2s ease-in-out infinite')}>
          <path d="M112 104 Q100 126 78 114" fill="none" stroke={arm} strokeWidth={11} strokeLinecap="round" />
          <circle cx={76} cy={112} r={6.5} fill={arm} />
        </g>
        <circle cx={86} cy={72} r={40} fill={skin} />
        <path d="M102 70 q7 5 0 12" fill="none" stroke={line} strokeWidth={2.5} strokeLinecap="round" />
        <path d="M64 72 q6 5 12 0" fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />
        <circle cx={70} cy={86} r={6} fill="#ff9fb0" opacity={0.55} />
      </g>
    </svg>
  );
}

const GARMENT: Record<GarmentIcon, string> = {
  bodyLs: '<path d="M9 3.5c.6 1.6 1.7 2.3 3 2.3s2.4-.7 3-2.3l3.5 1.7L21 10l-2.6 1.2-1.4-2.4V17l-2.2 3.5H9.2L7 17V8.8l-1.4 2.4L3 10l2.5-4.8z"/><path d="M10 17.5h4" fill="none"/>',
  bodySs: '<path d="M9 3.5c.6 1.6 1.7 2.3 3 2.3s2.4-.7 3-2.3l3.5 1.7L20 8.5l-3 1.3V17l-2.2 3.5H9.2L7 17V9.8L4 8.5l1.5-3.3z"/><path d="M10 17.5h4" fill="none"/>',
  tutina: '<path d="M9 2.5c.6 1.4 1.6 2 3 2s2.4-.6 3-2l3.5 1.6L21 9l-2.5 1.1L17 7.9v12.6a1 1 0 01-1 1h-2.8L12 15.5l-1.2 6H8a1 1 0 01-1-1V7.9l-1.5 2.2L3 9l2.5-4.9z"/><path d="M12 5v7" fill="none"/>',
  pagliaccetto: '<path d="M8.5 3h2c.3 1.2.8 1.8 1.5 1.8s1.2-.6 1.5-1.8h2l.5 4 1.5 2.5V15l-1.5 3.5H14l-2-2.5-2 2.5H7.5L6 15V9.5L7.5 7z"/>',
  ghettine: '<path d="M7 3h10l-.6 17.5a1 1 0 01-1 1h-2.3L12 10.5l-1.1 11H8.6a1 1 0 01-1-1z"/><path d="M7.1 6h9.8" fill="none"/>',
  completo: '<path d="M8 3c.5 1 1.3 1.5 2 1.5h4c.7 0 1.5-.5 2-1.5l3.5 1.8L21 8l-2.4 1-1.1-1.5V12h-11V7.5L5.4 9 3 8l1.5-3.2z"/><path d="M7.5 13.5h9l-.4 7.5h-2.8L12 16.5l-1.3 4.5H7.9z"/>',
  cardigan: '<path d="M9 3l3 5 3-5 3.5 1.8L21 10l-2.5 1v9a1 1 0 01-1 1h-11a1 1 0 01-1-1v-9L3 10l2.5-5.2z"/><path d="M12 8v13" fill="none"/><circle cx="13.7" cy="11.5" r=".8" fill="#ff395c" stroke="none"/><circle cx="13.7" cy="15" r=".8" fill="#ff395c" stroke="none"/><circle cx="13.7" cy="18.5" r=".8" fill="#ff395c" stroke="none"/>',
  calzine: '<path d="M9 3h6v8.5l3.3 3.2a3 3 0 01-2.1 5.3H12a3 3 0 01-3-3z"/><path d="M9 6.5h6" fill="none"/>',
  babbucce: '<path d="M8 6h6v6l4.5 2.3A3 3 0 0117 20H7.5A3.5 3.5 0 014 16.5c0-2.5 1.8-4.5 4-4.5z"/><path d="M8 9.5h6" fill="none"/>',
  esterna: '<path d="M12 2a4 4 0 014 4v.6l3.5 1.4L21 13l-2.4.8-1.6-2.3v9a1 1 0 01-1 1h-2.8L12 16l-1.2 5.5H8a1 1 0 01-1-1v-9l-1.6 2.3L3 13l1.5-5L8 6.6V6a4 4 0 014-4z"/><circle cx="12" cy="6.3" r="2.2"/>',
  sacco: '<path d="M9 3h6l4 3.5-2.3 1.4.3 12.1a1 1 0 01-1 1H8a1 1 0 01-1-1l.3-12.1L5 6.5z"/><path d="M12 7.5v11" fill="none"/>',
  cuffia: '<path d="M5 16.5a7 7 0 0114 0z"/><rect x="4" y="16.5" width="16" height="3.5" rx="1"/><circle cx="12" cy="7" r="1.8"/>',
  sole: '<path d="M7 15a5 5 0 0110 0z"/><path d="M2.5 16c2.5 2 16.5 2 19 0-1.5-1-3-1.2-4.5-1.2h-10C5.5 14.8 4 15 2.5 16z"/>',
  guantini: '<path d="M7 20.5V11a4.5 4.5 0 019 0v9.5z"/><path d="M16 13l1.6-1.5a1.6 1.6 0 012.2 2.3L16 17.5"/><path d="M7 17.5h9" fill="none"/>',
  bavaglino: '<path d="M5 7c0-2 1.8-3.5 3.8-3.5C8.8 5.4 10.2 7 12 7s3.2-1.6 3.2-3.5C17.2 3.5 19 5 19 7v6.5a7 7 0 01-14 0z"/><path d="M9 14.5c1.8 1.4 4.2 1.4 6 0" fill="none"/>',
  mussola: '<rect x="4" y="5" width="16" height="4.5" rx="1.2"/><rect x="4" y="10.5" width="16" height="4.5" rx="1.2"/><rect x="4" y="16" width="16" height="3.5" rx="1.2"/>',
  copertina: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15M15 4.5v15" fill="none" stroke-width="1"/>',
  asciugamano: '<path d="M3 10l9-6 9 6v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 19z"/><path d="M3 10h18" fill="none"/>',
};

/** Icona di un capo: disegno fisso del progetto, nessun contenuto esterno. */
export function GarmentGlyph({ icon }: { icon: GarmentIcon }) {
  return (
    <svg viewBox="0 0 24 24" fill="#ffffff" stroke="#ff395c" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GARMENT[icon] }} />
  );
}

/** Cassettiera del corredino (card nella Home). */
export function DresserIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="#ff395c" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M7 11v9h50v-9" />
      <rect x={7} y={18} width={50} height={7} rx={2.5} fill="#ffd0d7" />
      <rect x={10} y={25} width={44} height={29} rx={3} fill="#ffffff" />
      <path d="M10 34.5h44M10 44h44" />
      <circle cx={32} cy={29.8} r={1.5} fill="#ff395c" />
      <circle cx={32} cy={39.3} r={1.5} fill="#ff395c" />
      <circle cx={32} cy={49} r={1.5} fill="#ff395c" />
      <path d="M14 54v5M50 54v5" />
      <path d="M40 18v-3.5c0-1.2 1-2 2.2-2h5.6c1.2 0 2.2.8 2.2 2V18" fill="#ffffff" />
    </svg>
  );
}

/** Gruccia del pulsante "Esplora il suo primo guardaroba". */
export function HangerIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M10 6.5a2 2 0 113 1.8c-.6.3-1 .9-1 1.5V11" />
      <path d="M12 11l-8.6 6.1A1 1 0 004 19h16a1 1 0 00.6-1.9z" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 14V3.5" />
      <path d="M7.5 8L12 3.5 16.5 8" />
      <path d="M5 12.5v6A2.5 2.5 0 007.5 21h9a2.5 2.5 0 002.5-2.5v-6" />
    </svg>
  );
}

/** Icone della barra di navigazione (mockup v2). */
export function NavIcon({ name }: { name: 'bebe' | 'mamma' | 'voce' }) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'bebe' ? (
        <>
          <circle cx={12} cy={13} r={8} />
          <path d="M12 5c0-1.6 1.1-2.6 2.6-2.6" />
          <path d="M9.5 16c1.4 1 3.6 1 5 0" />
          <circle cx={9} cy={12} r={0.9} fill="currentColor" stroke="none" />
          <circle cx={15} cy={12} r={0.9} fill="currentColor" stroke="none" />
        </>
      ) : name === 'mamma' ? (
        <path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0112 7.6a4.1 4.1 0 017.5 2.5c0 5.8-7.5 10.4-7.5 10.4z" />
      ) : (
        <>
          <path d="M4.5 5.5h15a1 1 0 011 1v9a1 1 0 01-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 01-1-1v-9a1 1 0 011-1z" />
          <path d="M8 10h8M8 13h5" />
        </>
      )}
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx={11} cy={11} r={6.5} />
      <path d="M16 16l4 4" />
    </svg>
  );
}
