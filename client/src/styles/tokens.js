// ─── CivicResolve dark-theme design tokens ───────────────────────────────────
// Single source of truth. Import from here instead of re-declaring per file.
// These values mirror the CSS custom properties in index.css — keep in sync.

export const BG        = '#0d0d0d';
export const CARD_BG   = 'rgba(255,255,255,0.03)';
export const BORDER    = 'rgba(255,255,255,0.07)';

export const GREEN     = '#00FF41';
export const GREEN_DIM = 'rgba(0,255,65,0.10)';
export const GREEN_BDR = 'rgba(0,255,65,0.25)';
export const GREEN_GLW = 'rgba(0,255,65,0.35)';

export const TEXT      = '#e5e5e5';
export const TEXT_DIM  = '#888888';

export const STATUS_COLOR = {
  Open:        'yellow',
  Assigned:    'blue',
  'In Progress': 'orange',
  Resolved:    'teal',
};

export const PRIO_COLOR = (score) =>
  score >= 4 ? '#ef4444' : score >= 2 ? '#f59e0b' : '#6b7280';

export const inputStyles = {
  input: {
    background:  'rgba(255,255,255,0.04)',
    border:      `1px solid ${BORDER}`,
    color:       TEXT,
    fontFamily:  "'Inter', sans-serif",
  },
  label: { color: '#aaa', fontSize: '0.82rem', fontWeight: 500, marginBottom: 6 },
};
