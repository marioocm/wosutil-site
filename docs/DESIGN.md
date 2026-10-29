# WoS Util — Design System

A small, editorial interface for a rally countdown. Warm paper surfaces, warm ink,
hairline borders, tight typography and deliberately minimal chrome.

---

## Principles

1. **Monochrome.** Ink, paper and neutral tints only. No decorative color accents
   in the current build. If a future feature needs semantic color (success, danger),
   add it as a token and use it only for that meaning.
2. **Warm, printed feel.** The canvas is warm cream, not pure white; text is warm
   near-black, not pure black.
3. **Quiet structure.** Cards are defined by 1px hairlines, not shadows.
4. **Small radii.** Slightly rounded corners: 8px on cards, 4px on controls and rows.
5. **Minimal labels.** Only functional titles. No decorative dots, eyebrow labels or
   slash-prefixed metadata.
6. **Mono only when it means something.** Monospace is reserved for times, UTC and
   numeric fields — never for decorative labels.
7. **Fluid type.** Headings scale with `clamp()`; no abrupt breakpoint jumps.

---

## Fonts

| Role    | Family          | Source       |
| ------- | --------------- | ------------ |
| UI      | Instrument Sans | Google Fonts |
| Numeric | Geist Mono      | Google Fonts |

Loaded from Google Fonts in `countdown/index.html`.

Fallbacks: `--font-primary` ends in system-ui; `--font-mono` ends in
`ui-monospace`, Menlo, Monaco, Consolas.

---

## Colors

Semantic CSS variables live in `src/styles/theme.css`. Light values are defined in
`:root`, dark values in `.dark`. Components use the mapped Tailwind tokens
(`--color-*`, via `@theme inline`), never raw hex values.

### Light

| Token           | Value                | Usage                         |
| --------------- | -------------------- | ----------------------------- |
| `--bg`          | `#fefcf5`            | Page canvas                   |
| `--paper`       | `#fffcf6`            | Cards, header, footer         |
| `--tint`        | `#eaeae2`            | Selected rows, subtle fills   |
| `--ink`         | `#3c3a39`            | Primary text, active controls |
| `--ink-muted`   | `#6f6b67`            | Secondary text, icons         |
| `--ink-subtle`  | `#767169`            | Placeholders, separators      |
| `--line`        | `rgba(11,9,7,.12)`   | Hairline borders              |
| `--line-strong` | `rgba(11,9,7,.38)`   | Emphasized borders            |
| `--invert`      | `#3c3a39`            | Inverted surfaces (Play)      |
| `--invert-fg`   | `#fefcf5`            | Text on inverted surfaces     |

### Dark

| Token           | Value                  |
| --------------- | ---------------------- |
| `--bg`          | `#151311`              |
| `--paper`       | `#1d1a17`              |
| `--tint`        | `#2a2521`              |
| `--ink`         | `#f4f0e6`              |
| `--ink-muted`   | `#b8b1a7`              |
| `--ink-subtle`  | `#8a847c`              |
| `--line`        | `rgba(255,252,246,.12)`|
| `--line-strong` | `rgba(255,252,246,.35)`|
| `--invert`      | `#f4f0e6`              |
| `--invert-fg`   | `#171412`              |

Both themes must keep body text at WCAG AA contrast. The current values pass for
normal text; verify again if tokens change.

### Optional semantic accents

The system does not use accent colors today. If one becomes necessary (e.g. a
destructive action), add a dedicated token and scope it to that semantic meaning
instead of reintroducing a palette. Keep it rare.

---

## Typography

### Families

```css
--font-primary: "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "Geist Mono", ui-monospace, Menlo, Monaco, Consolas, monospace;
```

### Scale (fluid)

| Token          | Range       | Usage                       |
| -------------- | ----------- | --------------------------- |
| `--text-h0`    | 70 → 100px  | Display                     |
| `--text-h1`    | 55 → 75px   | Page display                |
| `--text-h2`    | 40 → 64px   | Large headings              |
| `--text-h3`    | 32 → 42px   | Section headings            |
| `--text-h4`    | 24 → 32px   | Panel headings              |
| `--text-p1`    | 17 → 22px   | Panel titles, body large    |
| `--text-p2`    | 14 → 18px   | Body, row text              |
| `--text-p3`    | 12 → 15px   | Empty states, captions      |
| `--text-eyebrow` | 15px      | Reserved for small metadata |
| `--text-button` | 14px       | Buttons                     |
| `--text-caption` | 13px      | Fine print                  |
| `--text-micro`  | 12px       | UTC clock, row micro-meta   |

Weights: 400 regular, 500 medium. Display headings use tight tracking
(`-0.01em` to `-0.06em` in the timer) and line-height near 1.

---

## Layout

- Max content width: `1440px`.
- Horizontal padding: `px-4` mobile → `px-[100px]` at `xl`.
- Header height: `72px` mobile, `80px` desktop.
- Main grid on desktop: two columns, callers left, timer/queue right.
- Mobile order: timer and controls first, callers below.
- Vertical rhythm: `gap-8`/`gap-10`; panels use `gap-4`.

---

## Components

### Header

- Sticky, warm paper background with hairline bottom border.
- Wordmark left; UTC clock, theme toggle and Share action right.
- No logo mark, tagline or extra navigation.

### Timer

- Two outlined cards, one per unit, with the colon between them.
- Digits: Instrument Sans, tabular numerals, fluid `clamp()` size, tight tracking.
- No “MIN” / “SEC” labels; the units are obvious from the layout.
- Card: `--paper` background, 1px `--line` border, 8px radius.

### Inputs

- Numeric duration fields, monospace, centered.
- `--paper` background, 1px border, 4px radius.
- Focus: border becomes `--ink`, 2px ink-tinted ring.
- Disabled: 40% opacity.

### Buttons

- Primary: inverted surface (`--invert` / `--invert-fg`), 4px radius.
- Secondary: transparent with `--line-strong` border.
- Ghost: no border, muted text that darkens on hover.
- Disabled primary: `--tint` background with muted text (no opacity wash).

### Caller panels

- Outlined --paper cards with a single text title.
- Rows: outlined sub-cards on the page background, 4px radius.
- Row hover: border darkens and background picks up a light `--tint` wash.
- Selected row: `--tint` background with an `--ink` border and square check.
- Remove action: neutral icon that darkens on hover; no red accent.
- Empty state: one short sentence in muted text.

### Call queue

- Outlined --paper card titled “Up next”.
- Buffer actions are small outlined controls.
- Rows show name, time and a copy button.
- When a call is due while the timer runs, the row inverts to `--ink` /
  `--background`. No color-coded flash.

### Footer

- Centered GitHub link only. No secondary tagline.

---

## Interaction

- **Hover:** outlines darken, subtle `--tint` fills appear, ghost text darkens.
- **Active:** primary controls drop to 70% opacity; outlined controls fill with
  a stronger tint. No scale or bounce.
- **Focus:** 2px ink outline with 2px offset; inputs use an ink border plus a soft
  ink ring.
- No parallax, spotlight effects, decorative arrows or cursor-following motion.

---

## Theme behavior

- Default follows `prefers-color-scheme`.
- The top-right toggle overrides and persists to `localStorage`
  (`wosutil:theme`).
- `countdown/index.html` runs a tiny inline script before CSS to set the initial
  class and `color-scheme`, avoiding a flash of the wrong theme.
- `src/theme.ts` owns resolution, persistence and the toggle listener.

---

## Avoid

- Large radii, pill buttons or rounded-full chrome.
- Colored accents, decorative dots or color-coded rows.
- Shadows on cards; use hairline borders.
- Extra labels, slash-prefixed eyebrows, taglines or repeated titles.
- New proprietary fonts or copied brand assets.
- Raw hex colors in components; use semantic tokens.
