# Study Schedule — Design System (`DESIGN.md`)

## 1. Visual Theme & Atmosphere
- **Product:** Study Schedule — an open-source, local-first academic command center and productivity workspace for students and developers (`https://study.vikashin.tech`).
- **Character:** Calm, exact, editorial, warm-graphite.
- **World:** Late-night study desk, ink on warm archival paper, precision mechanical timers, and clean code editors.
- **Core Rule (Impeccable + Unslop):** Quiet tinted-graphite chrome with zero purple/blue gradients, zero neon glows, zero floating orbs, zero cards-in-cards clutter, and zero status-chip soup. Richness belongs strictly inside the live product preview, meaningful comparison charts, and domain data series.

## 2. Color Palette & Roles (Dark Theme Default — Matching `app/src/index.css`)
All surfaces use Study Schedule's warm-graphite neutral ramp (never pure `#000000` or pure `#FFFFFF`):

- **Deepest Rail / Sidebar Surface:** `#0F1012`
- **Page Background (`--bg`):** `#131416` (`rgb(19 20 22)`)
- **Card / Panel Surface (`--surface`):** `#191A1D` (`rgb(25 26 29)`)
- **Elevated / Active Row / Input (`--elevated`):** `#222327` (`rgb(34 35 39)`)
- **Hairline Border (`--line`):** `#2D2F35` (`rgb(45 47 53)` — ~8% contrast hairline)
- **Primary Ink (`--ink`):** `#ECEAE4` (`rgb(236 234 228)` — warm off-white, high contrast)
- **Secondary Ink (`--muted`):** `#9A968D` (`rgb(154 150 141)`)
- **Muted / Meta Ink (`--faint`):** `#6C6860` (`rgb(108 104 96)`)
- **Signature Brand Accent (`--accent`):** `#E58B4A` (`rgb(229 139 74)` — warm amber; use `#131416` dark text on solid amber buttons for >= 4.5:1 contrast; reserve accent for primary action, active nav selection, and Study Schedule's highlight column/series)
- **Accent Soft Surface (`--accent-soft`):** `#2E241C` (`rgb(46 36 28)` — quiet amber wash for active navigation item and Study Schedule's comparison column)

### Semantic & Domain Data Accents (Strictly for Data Visualization & Status)
- **Study / Primary Series (`--c-study`):** `#E58B4A`
- **Coding / Developer Series (`--c-code`):** `#2DB4A0`
- **Positive / Verified (`--c-ok`):** `#4ABE78`
- **College / Schedule (`--c-college`):** `#EAA032`
- **Sleep / Rest (`--c-sleep`):** `#A082C8`
- **Warning (`--c-warn`):** `#EAB308`
- **Danger (`--c-danger`):** `#EF4444`

### Light Mode Companion Tokens (Optional Toggle Parity)
- Background `#F7F5F0`, Surface `#FEFDFA`, Elevated `#F0EDE6`, Border `#E0DCD3`, Ink `#1C1916`, Muted `#696258`, Accent `#D97706`, Accent Soft `#FEF3C7`.

## 3. Typography Rules
- **Display / Editorial Headlines:** `Newsreader` (serif), weights `400` and `500`, used ONLY for page titles (`32–36px`, line-height `1.15`, tracking `-0.02em`) and the hero headline (`48–56px`, line-height `1.06`, tracking `-0.025em`). Never italic for emphasis.
- **Interface & Body Copy:** `Instrument Sans` (sans-serif), weights `400`, `500`, rare `600`. Sentence case everywhere (NO ALL-CAPS tracked labels). Body `14–15px` (line-height `1.5`), nav rows `14px`, captions `13px`.
- **Figures, Code & Meta:** `JetBrains Mono` (monospace) with `font-variant-numeric: tabular-nums` for KPI figures (`28–32px`, weight `500`), cost comparisons, test counts, keyboard keycaps, and terminal commands (`12–13px`).
- **Copy Discipline:** Plain active-voice descriptions, zero hype words ("supercharge", "seamless", "revolutionize", "unlock"), zero exclamation marks, zero trailing periods on headings/labels/buttons, zero fabricated user counts.

## 4. Layout, Spacing & Elevation
- **Grid:** Strict `4px` spacing scale (`4, 8, 12, 16, 20, 24, 32, 48`).
- **Desktop Dashboard Shell:** Fixed left navigation rail (`240px`, `#0F1012` with `1px solid #2D2F35` right hairline) + `56px` quiet top bar + fluid main canvas (max-width `1440px`, `28px` padding).
- **Hierarchy & Rhythm:** Vary panel widths intentionally — never repeat identical card grids. Use a 2-column asymmetric hero split, 4 compact number-only stat cards in a row (no decorative mini sparklines), a 2/3 wide comparison matrix paired with a 1/3 cost & stack breakdown panel, and a 50/50 architecture + quick-start row.
- **Border Radius & Nesting:** Cards/panels `14px` (`rounded-card`), inputs/buttons/rows `10px` (`rounded-ctl`), keycaps/small badges `6px`. Inner radius = outer radius minus padding.
- **Elevation:** Dark mode relies on crisp surface steps (`#131416` → `#191A1D` → `#222327`) and `1px` `#2D2F35` hairlines rather than heavy drop shadows. Subtle `inset 0 1px 0 rgba(255,255,255,0.06)` highlight on raised controls.
- **Icons:** Lucide line icons, `16px` or `18px`, `1.5px` stroke, colored in `#9A968D` (or `#E58B4A` only on active nav item). No emojis anywhere in the UI.
- **Signature Detail:** Quiet live green status dot next to `study.vikashin.tech` / `Local JSON + Gist sync`, paired with clean keyboard keycaps (`Ctrl` `K`).
