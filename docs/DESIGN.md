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

Declared with `@font-face` in `src/layouts/BaseLayout.astro` using Fontsource variable files. Both latin faces are preloaded and use `font-display: swap`, so the brand fonts are always applied instead of a size-different system fallback.

Fallbacks: `--font-primary` ends in system-ui; `--font-mono` ends in
`ui-monospace`, Menlo, Monaco, Consolas.

---

## Colors

Semantic CSS variables live in `src/styles/theme.css`. Light values are defined in
`:root`, dark values in `.dark`. Components use the mapped Tailwind tokens
(`--color-*`, via `@theme inline`), never raw hex values.

Both themes keep the same depth relationship: `--paper` is lighter than `--bg`,
and inset controls (hero tiles, inputs, ratio tracks) reuse `--bg` inside paper
cards. Depth comes from that layering plus hairlines, never shadows.

### Light

| Token           | Value                | Usage                         |
| --------------- | -------------------- | ----------------------------- |
| `--bg`          | `#f3eee3`            | Page canvas                   |
| `--paper`       | `#fdfaf2`            | Cards, header, footer         |
| `--tint`        | `#e7e0d2`            | Selected rows, subtle fills   |
| `--ink`         | `#3c3a39`            | Primary text, active controls |
| `--ink-muted`   | `#6a6660`            | Secondary text, icons         |
| `--ink-subtle`  | `#6f6b63`            | Placeholders, separators      |
| `--line`        | `rgba(11,9,7,.16)`   | Hairline borders              |
| `--line-strong` | `rgba(11,9,7,.42)`   | Emphasized borders            |
| `--invert`      | `#3c3a39`            | Inverted surfaces (Play)      |
| `--invert-fg`   | `#fdfaf2`            | Text on inverted surfaces     |
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
- Header height: one `56px` row at every width.
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
- Wordmark left from `sm` up, followed by the Battle Reports / Countdown /
  Simulator section links.
- UTC clock and theme toggle right; the clock is hidden below `sm`.
- Active section: ink text with a 2px ink underline flush with the header
  border. Inactive sections: muted text that darkens on hover.
- Hovering (or focusing) a section slides the single underline under it; it
  returns to the active section when the pointer/focus leaves. Clicking
  navigates immediately, with no click delay. Reduced-motion users get instant
  moves.
- On narrow/touch viewports the sticky header hides on scroll down
  (`translateY(-100%)`, 220ms) and returns on scroll up, near the top, or when
  a header control receives focus.
- Mobile: the wordmark is hidden (it duplicates Battle Reports); the section
  links and theme toggle share a single row. The wordmark returns from `sm` up
  and the clock appears with it. Below `360px` the links tighten slightly so
  the row never wraps.
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

### Segmented toggle

- Shared control (`src/components/segmented-toggle.ts`) built on native radios
  inside a `fieldset` with a visually hidden legend.
- Compact bordered track on `--background`, 4px radius and 2px inset, with
  equal-width segments. A single inverted thumb sits behind the labels and
  slides between them with the 180ms `cubic-bezier(0.22, 1, 0.36, 1)` motion.
  Selected labels use `--invert-fg`, the rest stay `--ink-muted`.
- Sizes: `default` uses 12px labels; `compact` uses 10px labels for the archive
  side rows. Reduced-motion users get instant moves.
- Used by the archive mode filter (Any / Rally / 1v1), the archive result
  toggle (Any / Attacker / Defender / Draw), the archive survivors toggle
  (Any / <50% / <25% / <10%), the archive hero and joiner side toggle (Any /
  Attacker / Defender / Both) and the simulator's Optimise Ratio Attacker /
  Defender switch.

### Caller panels

- Outlined --paper cards with a single text title.
- The Rally callers card carries a small secondary `Share config` action at
  the right edge of its title row; it copies the current rally and enemy
  configuration link and shows `Copied!` / `Copy failed` for 1.5s.
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
  loadout and hides newer heroes, and a credit line links Piddlyminx's sim and
  credits him and the WoS Nerds community.
- The trigger opens a paper `<dialog>` picker with a dark translucent backdrop,
  a close control and native Escape handling. Options are large buttons in a
  three-column grid, one per generation returned by the API, showing `Gen N`
  and its `T·FC`; the current generation is selected. Arrow keys, Home and End
  move through them. Presets come from the engine API; the trigger stays
  disabled while they load and the options show `Generation data unavailable.`
  if the request fails.
- Choosing a generation applies a complete era preset: total troops, tier/FC,
  the meta counter attack lineup on the left, the meta defense lineup on the
  right, their ratios, and the Stats Bonuses panel. No joiners are preset. The
  preset overwrites manual values every time the generation changes.
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
- Joiners only apply their S1 skill, so heroes whose S1 is identical are grouped
  into one `Same S1` pack card with the shared effect in its header; every member
  stays individually selectable. Epics come first, then legendaries from oldest
  to newest generation. Searching for one member shows the full pack. A selected
  slot shows a small `=` badge in the tile, and hovering or focusing a slot with
  a pack opens the same floating `Same S1` card as the report detail, with the
  effect and the interchangeable heroes.

### Troop Power

- Outlined --paper card with a centered “Troop Power” title.
- Two symmetric sides, each headed by a centered “Attacker Total Troops” /
  “Defender Total Troops” label over its input, then three square INF/LAN/MAR
  tiles in the hero-slot style. The whole tile selects the
  troop tier (T1–T12); a grayscale hexagon badge overlapping its top-right corner
  selects the fire crystal level (FC0–FC10) and shows the number inside. The
  troop count sits below the tile in an editable field (a dash until data is
  entered). With one row, editing a count makes the total the sum of the three
  and derives the ratio; editing the total or ratio reallocates the counts.
- A full-width dashed `+ Add different troops` button below the tiles adds another
  row to that side, up to as many mixed groups as needed. Each extra row repeats
  the three tier/FC/count cells and gets a `Row N` / `Remove` header separated
  by a hairline; the first row cannot be removed. T12 boxes are never duplicated:
  they stay on the first row.
- With more than one row, the total input becomes the read-only sum of every row
  and the ratio bar derives itself from the aggregate class counts. Its handles
  and Lancer segment are hidden and inert, and a muted `Ratio follows the troop
  rows.` caption sits below the bar. Removing the extra rows restores the
  editable total and ratio.
- Tier and FC are chosen in paper `<dialog>` pickers with dark translucent
  backdrops, a close control and native Escape handling. Options are large
  buttons in a four-column grid, with the current value selected.
- A compact `Lv N` box directly below the first row's tile edits that class's
  T12 skill. It opens the T12 skill picker, titled with the troop's skill name
  (Indomitable Wall, Meridian Phalanx or Starfire) and current level, with
  options from 0 to 24 in a five-column grid. The box shows when any row of that
  class is T12, because the engine gates the class's T12 level globally.
- Below the rows, one horizontal ratio bar is split into three monochrome tinted
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
  centered in the middle, and right-side values centered in their column. The
  Attacker/Defender headers sit centered over their columns, not at the cell edges.
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
  above the two side values and the metric headers shorten to `Trig.`; above
  `12rem` they use the left-value / centered-label / right-value layout and the
  full `Triggered` header. Both widths keep `Kills` under the triggered label.
- `Battle Overview`: centered section title, then a compact winrate split with
  each side's label and percentage at its end of a two-segment monochrome bar,
  followed by Total Troops and average-survivor rows in three centered columns
  like Stats Bonuses.
- `Battle Details`: centered title with the Joiners-style chevron button at the
  right. It starts collapsed and expands with the same height animation into a
  five-column table with a narrow spacer between the two metric columns. Each
  side's metric cell stacks the mean triggered activations above the game's mean
  kills, so both values stay visible without widening the sidebar. Each troop
  class keeps its three fixed hero-skill slots (missing hero/skill slots stay in
  place with a dash), then lists that class's troop skills from the API, aligned
  across both sides by skill name; a skill missing on one side leaves the
  opposite cell empty with a dash. A dash marks an empty slot, a skill the
  engine did not report, or a kill value the game does not expose. The API's
  `source_kind` separates a kill-counter skill with zero kills (shows `0`) from
  a normal/untyped extra or buff without one (shows `–`). Reported activations
  show one decimal only when needed (a whole mean such as 1.0 renders as `1`)
  and kills are rounded to whole numbers (compact notation from one million),
  all as means over seeds. Three mirrored rows below show average survivors for
  INF, LAN and MAR. The bottom of the card shows the mean rounds with the
  min/max, then the seeds/elapsed metadata.
- The winrate bar uses neutral ink tints only and mono numerals for the
  percentages. Run metadata (seeds and elapsed time) and warnings sit below the
  sections in small muted text.

### Optimise Ratio

- Outlined --paper card directly below the Simulation card in the right
  sidebar: a centered inverted `Optimise Ratio` button and a two-segment
  Attacker / Defender toggle beneath it. Attacker is selected by default.
- The toggle is the shared segmented control at its default size, 10rem wide.
  It uses native radios and the sliding inverted thumb described above; the
  selection moves only when it changes. Pressing the button posts the current
  engine case to `/v1/optimize-ratio` for the selected side. Results stay hidden
  until a run succeeds, then expand from the button with the same 220ms height
  motion as the Simulation card. Repeat runs update the panel in place;
  switching sides collapses it.
- The panel starts with the optimised side, then a three-column table with the
  ranked ratios (mono `inf:lan:mar`), the percentage of seeds won (`Win %`) and
  the mean survivor-rate difference (`Margin`, signed). The ratios stay on the
  left and the two metrics stay right-aligned; every cell keeps a small inline
  inset from the row edges. The best row is tinted and the other values stay
  muted; a short legend explains both columns and that rows are clickable. No
  separate `Current` line. The run metadata (`256 seeds · 830 ms`) sits centered
  at the bottom, like the Simulation card.
- Rows are hairline-separated buttons; clicking one writes the three troop counts
  to that side's Troop Power inputs and confirms it in the status line. When the
  side has mixed rows, each class total is split across its rows in proportion
  to their current counts (evenly when all are empty), mirroring the engine. No
  new colors or shadows.
- While the request runs the button is disabled and reads `Optimising...`; no
  progress copy is shown. The small live status line below the toggle reports
  any API error or confirms an applied ratio, and stays empty during a run.

### Battle Reports filters

- Outlined --paper sidebar card with a `Filters` heading and a muted `Clear`
  action. The first control is a full-width `Mode` toggle (`Any` / `Rally` /
  `1v1`, Any by default) using the shared segmented control. `Rally` requires a
  joiner on either side; `1v1` requires none.
- The next control is a full-width generation trigger (`All gens` by
  default or `Gen N or older`) that opens the same paper `<dialog>` picker as the
  simulator: a full-width `All gens` option followed by a three-column grid of
  `Gen 1–N` buttons, with the current bound selected. Picking a generation is an
  upper bound: every main hero and joiner in the report must be that generation
  or older, so newer heroes exclude the report. Choosing a lower generation
  clears any selected hero or joiner that no longer fits.
- Hero and Joiner are stacks of full-width trigger rows. Hero allows up to 6
  selected heroes; Joiner allows up to 8 selected joiners. Each selected row
  shows the portrait and name plus a four-segment `Any` / `Attacker` /
  `Defender` / `Both` toggle (Any by default) built from the shared segmented
  control that constrains which side must hold that hero. `Both` requires the
  hero on the attacker and defender sides.
  An empty `Any hero` / `Any joiner` row appears below while there is room,
  so every selection adds another slot. A selected row has an X control next to
  the picker chevron that removes that filter directly. All selected entries are
  ANDed; missing entries exclude the report.
- A row opens the shared paper `<dialog>` with a search field and the same hero
  rows used by the simulator (portrait, name and `Gen N` / `Epic`). Options are
  ordered newest generation first, epics last, hide heroes newer than the
  selected generation, and hide heroes already used by another row. A leading
  `Any hero` / `Any joiner` row clears that selection. Both pickers are disabled
  until `/v1/meta` returns the archive's hero lists. Joiner options sort epics
  first, then legendaries from oldest to newest generation, and group heroes with
  the same S1 into `Same S1` pack cards. In the report detail, hovering or
  focusing a joiner opens a floating `Same S1` card with its effect and the
  interchangeable heroes.
- Tier and FC use two side-by-side range controls (`Min` and `Max`), each a
  square tier tile with an overlapping FC hexagon in the simulator's Troop Power
  style. All four values start at `Any`; clicking a tile or hexagon opens a paper
  `<dialog>` picker with an `Any tier` / `Any FC level` option followed by the
  T1-T12 or FC0-FC10 grid. Choosing a value fills the control, and choosing
  `Any` clears that bound. The FC hexagon keeps the simulator's inverted fill and
  reads `Any` when unset, so both pages render the same badge from
  `src/components/fc-hex.ts`. Both controls come from
  `src/components/troop-level-control.ts`. The API compares the report's highest
  tier and that tier's FC - the values shown on the cards - so `FC0` keeps
  meaning troops with no fire crystal.
- Result is a four-segment `Any` / `Attacker` / `Defender` / `Draw` toggle
  (Any by default) using the shared segmented control at compact size. A result
  with no reports in `/v1/meta` resets the filter to `Any`; `No wipe` is not an
  option.
- Survivors sits directly below Result: a four-segment `Any` / `<50%` / `<25%` /
  `<10%` toggle. It keeps fights where the surviving army ends under that share
  of its own troops. One side always ends wiped, so this is also the battle's
  survivor total. `Any` clears the cap.
- The `Has T12 skill` checkbox closes the card.
- Report cards show `FC0` when the report has troops but no fire crystal level,
  and Gen `—` only when no main hero or joiner is recognized.

### Battle Reports detail

- The detail dialog opens with a right-aligned action row above the cards and
  outside them: primary inverted `Simulate`, outlined `Copy link`, then outlined
  `Download JSON` (no CSV). `Simulate` opens the simulator with the battle
  loaded for editing.

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
