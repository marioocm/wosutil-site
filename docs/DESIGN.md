# WoS Util — Design System

A small, editorial interface for Whiteout Survival utilities: a rally countdown
and a battle simulator. Warm paper surfaces, warm ink, hairline borders, tight
typography and deliberately minimal chrome.

---

## Principles

1. **Monochrome by default.** Ink, paper and neutral tints only. Semantic color is
   reserved for the Stats Bonuses comparison: green for the higher side, red for the
   lower side, through `--positive` / `--negative`. No decorative accents.
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

| Role    | Family                   | Source                          |
| ------- | ------------------------ | ------------------------------- |
| UI      | Instrument Sans Variable | Fontsource (self-hosted)        |
| Numeric | Geist Mono Variable      | Fontsource (self-hosted)        |

Declared with `@font-face` in `src/layouts/BaseLayout.astro` using Fontsource variable files and `font-display: optional` (no FOUT).

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
| `--positive`    | `#2e6b4f`            | Higher stat bonus             |
| `--negative`    | `#a13b35`            | Lower stat bonus              |

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
| `--positive`    | `#86c9a0`              |
| `--negative`    | `#f0a19b`              |

Both themes must keep body text at WCAG AA contrast. The current values pass for
normal text; verify again if tokens change.

### Semantic accents

Green and red are the only accents in the system. They are limited to the Stats
Bonuses comparison: `--positive` marks the higher value and `--negative` the lower
one. Ties, empty sides and invalid input stay neutral. Do not reuse these tokens for
unrelated actions, labels or backgrounds.

---

## Typography

### Families

```css
--font-primary: "Instrument Sans Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "Geist Mono Variable", ui-monospace, Menlo, Monaco, Consolas, monospace;
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
- Header height: two rows on mobile (44px brand row + 40px nav row); one
  `56px` row from `sm`.
- Countdown main grid on desktop: two columns, callers left, timer/queue right.
- Simulator on desktop: a centered three-column grid with a flexible left
  column holding the sticky generation card, the 34rem card column in the
  center and the sticky Simulation + Optimise Ratio cards on the right, so the
  cards stay visually centered. Below `lg` it stacks with the generation card
  first and the Simulation cards last.
- Mobile order: timer and controls first, callers below.
- Vertical rhythm: `gap-8`/`gap-10`; panels use `gap-4`.

---

## Components

### Header

- Sticky, warm paper background with hairline bottom border.
- Wordmark left, followed by the Simulator / Countdown section links.
- UTC clock, theme toggle and Share action (countdown only) right.
- Active section: ink text with a 2px ink underline flush with the header
  border. Inactive sections: muted text that darkens on hover.
- Hovering (or focusing) a section slides the single underline under it; it
  returns to the active section when the pointer/focus leaves. Clicking
  navigates immediately, with no click delay. Reduced-motion users get instant
  moves.
- The Share action belongs to the countdown page. When leaving it, the
  destination page renders a visual-only Share and slides it behind the right
  edge of its slot (320ms, linear) while UTC/theme move to that page's
  positions; countdown load plays the reverse. The click itself is immediate.
- On narrow/touch viewports the sticky header hides on scroll down
  (`translateY(-100%)`, 220ms) and returns on scroll up, near the top, or when
  a header control receives focus.
- Mobile: brand + actions share the first row; the section links move to a
  second row separated by a hairline. From `sm` up it is one row.
- No logo mark, tagline, hamburger or extra navigation.

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

### Generation preset

- Outlined --paper card in a left sidebar (sticky on desktop): the `For
  simplicity:` heading, a muted `Choose your current Generation` label and a
  full-width outlined trigger showing `All Gens` by default or the chosen
  `Gen N` with a chevron. A short muted line explains that it loads the era
  loadout and hides newer heroes.
- The trigger opens a paper `<dialog>` picker with a dark translucent backdrop,
  a close control and native Escape handling. Options are large buttons in a
  three-column grid, one per Gen 1–17, showing `Gen N` and its `T·FC`; the
  current generation is selected. Arrow keys, Home and End move through them.
- Choosing a generation applies a complete era preset: total troops, tier/FC,
  the best counter attack lineup on the left, the best worst-case defense
  lineup on the right, their ratios, and the Stats Bonuses panel. No joiners
  are preset. The preset overwrites manual values every time the generation
  changes.
- Both hero pickers hide heroes newer than the selected generation; epics stay
  selectable. Joiners from newer generations are cleared.

### Hero Comparison

- Outlined --paper card with a centered “Hero Comparison” title.
- Three symmetric rows with square slots pinned to the left and right card sides.
  There is no center label: each slot shows its troop-type abbreviation — INF, LAN
  or MAR — with a small bare plus/initials indicator beneath.
- Empty slots show the plus and a muted “Select” caption. Selected slots fill the
  tile with the hero's portrait, keep the troop-type abbreviation in a small paper
  chip and show the hero name below. Portraits are hotlinked from the Whiteout
  Survival Wiki; if they fail to load, the hero's initials remain.
- Clicking a slot opens a native `<dialog>` picker filtered to that troop type
  and to the selected generation. A leading None option clears the slot. Heroes
  are ordered newest generation first, with epics last. Each option shows a small
  portrait avatar, the hero name and `Gen N` / `Epic`.
- The picker is a paper panel with a hairline border, a dark translucent backdrop,
  a close control and native Escape handling. No shadows.

### Joiners

- Outlined --paper card with a centered “Joiners” title and a small outlined
  chevron button at the right. The card starts collapsed, showing only the title
  row; the button expands or collapses the content and updates
  `aria-expanded` / `aria-label`. The height animates over 220ms; reduced-motion
  users get an instant toggle.
- Two symmetric 2×2 grids of smaller square slots, one per side. Empty slots show
  a plus and a muted “Select” caption; selected slots fill with the hero portrait,
  a small INF/LAN/MAR chip and the hero name.
- Clicking a slot opens a native `<dialog>` picker with a search field and a
  scrollable list of every combat hero available at the selected generation. With
  no query the list stays ordered by generation, newest first and epics last; the
  search filters by name. A leading None option clears the slot. The picker uses
  the same paper panel, backdrop and close control as Hero Comparison.

### Troop Power

- Outlined --paper card with a centered “Troop Power” title.
- Two symmetric sides. Each side has a centered “Total Troops” input, then three
  square INF/LAN/MAR tiles in the hero-slot style. The whole tile selects the
  troop tier (T1–T12); a grayscale hexagon badge overlapping its top-right corner
  selects the fire crystal level (FC0–FC10) and shows the number inside. The
  troop count sits below the tile in an editable field (a dash until data is
  entered). Editing a count makes the total the sum of the three and derives the
  ratio; editing the total or ratio reallocates the counts.
- Tier and FC are chosen in paper `<dialog>` pickers with dark translucent
  backdrops, a close control and native Escape handling. Options are large
  buttons in a four-column grid, with the current value selected.
- A T12 troop also shows a compact `Lv N` box directly below its tile. It opens
  the T12 skill picker, titled with the troop's skill name (Indomitable Wall,
  Meridian Phalanx or Starfire) and current level, with options from 0 to 24 in a
  five-column grid. The box hides again for T1–T11 troops.
- Below the tiles, one horizontal ratio bar is split into three monochrome tinted
  segments and shows each troop type's share as a percentage inside its third.
  Two dividers adjust Infantry/Lancer and Lancer/Marksman; dragging the middle
  Lancer segment transfers troops between Infantry and Marksman while keeping
  Lancer fixed. Dragging is relative, so a click focuses without changing the
  ratio; arrow keys step 1%.
- Handles use ink bars with a soft ink ring on hover/focus. Segment fills use
  neutral tints only; no semantic accent color is introduced.

### Stats Bonuses table

- Outlined --paper card with a centered “Stats Bonuses” title.
- Three-column table: left-side values centered in their column, the stat name
  centered in the middle, and right-side values centered in their column.
- The twelve rows follow the game order: Infantry / Lancer / Marksman × Attack /
  Defense / Lethality / Health.
- Values are percentage inputs with at most two decimals; extra decimals are blocked
  while typing and values are normalized to two decimals on blur. The number and its
  `%` suffix stay together, centered as one unit. The field is borderless by default
  (hover/focus adds a tint and an ink ring).
- The higher side is `--positive`, the lower side `--negative`. Equal values or rows
  with a missing side stay in `--ink`.
- Selecting a generation fills the twelve rows for both sides with that era's
  base plus the meta lineup contributions and side-gated widgets. Values remain
  editable afterwards.
- Rows are separated by hairlines, never zebra stripes.

### Simulation

- Outlined --paper card in the right sidebar (sticky on desktop): a centered
  inverted `Simulate` button and a muted status line. Results stay hidden until
  a run succeeds. Below `lg` the card follows Stats Bonuses.
- The results render inside the Simulation card below the status line, with a
  smooth scroll on the first success. The first result expands from the Simulate
  button with the same 220ms height motion as Joiners; repeat runs leave the
  panel and the Battle Details state in place, tween the overview numbers and
  slide the winrate bar over 240ms. Reduced-motion users get instant updates.
  The card drops its sticky behavior once a result exists so the full report can
  scroll.
- Container queries keep the report legible in the narrow sidebar: under
  `12rem` the Total Troops and average-survivor rows stack their centered label
  above the two side values and the triggered headers shorten to `Trig.`;
  above `12rem` they use the left-value / centered-label / right-value layout
  and the full `Triggered` header.
- `Battle Overview`: centered section title, then a compact winrate split with
  each side's label and percentage at its end of a two-segment monochrome bar,
  followed by Total Troops and average-survivor rows in three centered columns
  like Stats Bonuses.
- `Battle Details`: centered title with the Joiners-style chevron button at the
  right. It starts collapsed and expands with the same height animation into a
  five-column table with a narrow spacer between the two triggered columns.
  Each troop class keeps its three fixed hero-skill slots (missing hero/skill
  slots stay in place with a dash), then lists that class's troop skills from
  the API, aligned across both sides by skill name; a skill missing on one side
  leaves the opposite cell empty with a dash. A dash marks an empty slot or a
  skill the engine did not report, which is distinct from a reported zero.
  Reported activations show one decimal (the mean over seeds). Three mirrored
  rows below show average survivors for INF, LAN and MAR. The bottom of the card
  shows the mean rounds with the min/max, then the seeds/elapsed metadata.
- The winrate bar uses neutral ink tints only and mono numerals for the
  percentages. Run metadata (seeds and elapsed time) and warnings sit below the
  sections in small muted text.

### Optimise Ratio

- Outlined --paper card directly below the Simulation card in the right
  sidebar: a centered inverted `Optimise Ratio` button and a two-segment
  Left / Right toggle beneath it. Left is selected by default.
- The toggle is a compact bordered track on `--background` (smaller than the
  button, 12px labels) with 4px radius and two equal segments. A single white
  thumb sits behind the labels and slides between them with the same 180ms
  `cubic-bezier(0.22, 1, 0.36, 1)` motion as the header underline, moving only
  when the selection changes. Native radios provide keyboard and
  screen-reader behavior. Reduced-motion users get instant moves.
- Both controls are visual placeholders for now; they trigger no action.

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

- Dark is the default; the system `prefers-color-scheme` is ignored.
- Only the top-right toggle switches to light, and it persists to
  `localStorage` (`wosutil:theme`).
- Every page runs a tiny inline script before CSS to set the initial class and
  `color-scheme`, avoiding a flash of the wrong theme.
- `src/lib/theme.ts` owns resolution, persistence and the toggle listener. The
  shared header mounts it on every page.

---

## Avoid

- Large radii, pill buttons or rounded-full chrome.
- Decorative color accents or color-coded rows outside the Stats Bonuses comparison.
- Shadows on cards; use hairline borders.
- Extra labels, slash-prefixed eyebrows, taglines or repeated titles.
- New proprietary fonts or copied brand assets.
- Raw hex colors in components; use semantic tokens.
