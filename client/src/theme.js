import { createTheme } from '@mantine/core';

// ─── Civic Green ramp ───────────────────────────────────────────────────────
// Index 6 is the primary shade (#00FF41 — matrix green).
// Lighter shades toward index 0, darker toward index 9.
const civic = [
  '#e6fff0',   // 0 – near-white tint
  '#b3ffcd',   // 1
  '#80ffa9',   // 2
  '#4dff86',   // 3
  '#26ff63',   // 4
  '#0dff4e',   // 5
  '#00FF41',   // 6 ← PRIMARY  (the "matrix" green)
  '#00cc34',   // 7
  '#009927',   // 8
  '#006619',   // 9 – deepest shade
];

const theme = createTheme({
  // ── Color palette ──────────────────────────────────────────────────────────
  colors: { civic },
  primaryColor: 'civic',
  primaryShade: { light: 6, dark: 5 },

  // ── Default scheme ─────────────────────────────────────────────────────────
  defaultColorScheme: 'dark',

  // ── Black canvas ───────────────────────────────────────────────────────────
  // Used by Mantine for the AppShell / Paper dark backgrounds
  black: '#0d0d0d',

  // ── Typography ─────────────────────────────────────────────────────────────
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  headings: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.75rem', lineHeight: '1.1' },
      h2: { fontSize: '2rem',    lineHeight: '1.15' },
      h3: { fontSize: '1.5rem',  lineHeight: '1.2' },
    },
  },

  // ── Radius ─────────────────────────────────────────────────────────────────
  radius: {
    xs: '3px',
    sm: '4px',
    md: '6px',   // ← spec requirement
    lg: '10px',
    xl: '16px',
  },
  defaultRadius: 'md',

  // ── Component overrides ────────────────────────────────────────────────────
  components: {
    Button: {
      defaultProps: { radius: 'md' },
      styles: {
        root: {
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.01em',
          transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        },
      },
    },
    Card: {
      defaultProps: { radius: 'md' },
      styles: {
        root: {
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: '6px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.875rem',
          fontWeight: 500,
          transition: 'background 0.15s ease',
        },
      },
    },
    Badge: {
      defaultProps: { radius: 'sm' },
    },
    Input: {
      styles: {
        input: {
          fontFamily: "'Inter', sans-serif",
        },
      },
    },
    Modal: {
      defaultProps: { radius: 'md' },
    },
    Drawer: {
      defaultProps: { radius: 0 },
    },
    Notification: {
      styles: {
        root: { borderRadius: '6px' },
      },
    },
  },

  // ── Other design tokens ────────────────────────────────────────────────────
  lineHeights: { md: '1.6' },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
});

export default theme;
