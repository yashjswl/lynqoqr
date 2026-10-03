---
name: LynqoQR
description: A fast, trustworthy link workspace at category-standard craft; the QR is the only expressive object.
colors:
  accent: "#2a5bd7"
  accent-hover: "#2349b0"
  accent-text: "#ffffff"
  accent-dark: "#6b93ff"
  accent-hover-dark: "#86a6ff"
  accent-text-dark: "#0b1020"
  ground: "#f6f7f9"
  surface: "#ffffff"
  surface-2: "#f1f2f5"
  text: "#111418"
  text-2: "#4b5360"
  text-3: "#6a7280"
  border: "#e3e6eb"
  border-strong: "#cdd2da"
  ok: "#17753c"
  bad: "#c0261d"
  bad-bg: "#fdecea"
  ground-dark: "#0d0f12"
  surface-dark: "#15181c"
  surface-2-dark: "#1c2025"
  text-dark: "#eef0f3"
  text-2-dark: "#aab1bc"
  text-3-dark: "#8b93a0"
  border-dark: "#262b32"
  border-strong-dark: "#38404a"
  ok-dark: "#4cc07a"
  bad-dark: "#ff7a70"
  bad-bg-dark: "#2a1614"
typography:
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  dialog: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  page-x: "20px"
  control-height: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.bad}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  chip-link:
    textColor: "{colors.accent}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  row:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.dialog}"
    padding: "24px"
---

# Design System: LynqoQR

## Overview

**Creative North Star: "The Plain Workbench"**

A link workspace played straight at the craft level of Dub.co and Bitly. A tinted-gray ground, white surfaces held by 1px borders, one blue accent, Geist with tabular numerals, and lucide icons. Nothing is decorative, so the QR code, the only object with its own colors, is the one expressive thing on screen. The product's standing preference (PRODUCT.md) is the category standard, conventional controls, no thematic world.

Density is operate-mode: a library of a few dozen rows found by title or slug, and one create page with the form beside a live QR preview. Light and dark are the same system from one token set; dark follows the OS (`prefers-color-scheme`) with no manual toggle.

**Key Characteristics:**
- Flat, bordered surfaces; depth is one quiet shadow reserved for floating layers.
- One accent (blue) carrying primary action, links, focus, and selection.
- 40px controls on desktop, 44px on phones.
- Tabular numerals globally; Geist for everything, system mono only for code.
- Reduced motion fully respected.

## Colors

A cool neutral ladder with a single saturated blue; semantic green and red appear only for status and destruction.

### Primary
- **Workbench Blue** (accent, #2a5bd7; dark #6b93ff): primary buttons, short-URL chips (as 9% tint, 16% on hover), preview URL, focus ring and border, selection, range accent, brand mark. Hover is the deeper #2349b0 (dark: lighter #86a6ff). Text on it is white (dark: #0b1020).

### Neutral
- **Cool Ground** (#f6f7f9; dark #0d0f12): page background and the translucent top bar.
- **Paper** (surface #ffffff; dark #15181c): rows, cards, inputs, menus, dialogs.
- **Wash** (surface-2 #f1f2f5; dark #1c2025): hover fill, input add-on prefix, empty-state icon tile, skeleton sheen.
- **Ink** (text #111418; dark #eef0f3): headings and primary text. **Ink 2** (#4b5360; dark #aab1bc) for labels and secondary buttons. **Ink 3** (#6a7280; dark #8b93a0) for hints, dates, destinations, placeholders.
- **Hairline** (border #e3e6eb; dark #262b32) for resting rows and cards; **Hairline Strong** (#cdd2da; dark #38404a) for controls, menus, dashed empty states, row hover.

### Semantic
- **OK** (#17753c; dark #4cc07a) for slug availability. **Bad** (#c0261d; dark #ff7a70) for errors and delete, on **Bad Wash** (#fdecea; dark #2a1614) for alerts.

### Named Rules
**The One Blue Rule.** Blue is the only chromatic UI color. Status colors never decorate; QR colors belong to the user's QR, not the interface.
**The Token Pair Rule.** Every color is a custom property with a light and a dark value; no component hardcodes a hue (QR frames and thumbnails stay #fff because a QR needs a light ground).

## Typography

**Display/Body Font:** Geist Variable (fallback ui-sans-serif, system-ui, Segoe UI, sans-serif)
**Mono Font:** ui-monospace, SF Mono, Menlo (code only)

**Character:** One neutral sans at a tight, small ramp; hierarchy by weight and gray step, not size.

### Hierarchy
- **Headline** (600, 24px, 1.2, -0.02em, balanced wrap): page title ("Links", create page).
- **Title** (600, 15px): card headings, row titles, preview title.
- **Body** (400, 15px, 1.5, tabular figures): default text.
- **Label** (500, 14px): buttons, menu items, back link. Form field labels are 13px 500 in Ink 2.
- **Caption** (400, 13px): hints, dates, destinations, chips (500).

### Named Rules
**The Weight-Not-Size Rule.** Stay within 13 to 24px; separate levels with weight (400/500/600) and the Ink 1/2/3 steps.

## Layout

Single column, 960px max, centered, 20px side padding (16px under 760px), 28px top, 80px bottom. Sticky 56px top bar with wordmark left and primary action right. Rows are a 4-column grid (56px QR thumb, flexible text, date, actions) with a 16px gap; on phones they collapse to thumb plus text, with full-width actions below and the date hidden. Create is a two-column grid (form fluid, 320px sticky preview at 76px top, 24px gap); on phones it stacks with the preview first. Spacing steps in use: 4, 8, 12, 16, 20, 24. Breakpoint: 760px.

## Elevation & Depth

Flat by default: surfaces are separated by 1px borders, not shadow. One shadow token exists, `0 1px 2px rgba(16,24,40,.05), 0 8px 24px -12px rgba(16,24,40,.12)` (dark: black at .4 and .6), used only on floating layers: menu, dialog, toast. The top bar uses an 88% ground blur (`backdrop-filter: blur(12px)`) with a bottom border. Dialog backdrop is rgba(8,10,14,.55).

### Named Rules
**The Flat-Until-Floating Rule.** Resting content never gets a shadow; only layers that overlay content do.

## Shapes

Quiet rounded rectangles: 8px for controls and QR frames, 10px for rows, cards, menus and the empty state, 6px for chips and menu items, 12px for icon tiles, 14px for dialogs, 7px for the brand mark. All borders 1px; the empty state and empty logo slot use a dashed border. Icons are lucide line icons, 16px typical.

## Components

### Buttons
- **Shape:** 8px radius, 40px high (44px on phones), 14px 500 label, 8px icon gap, 0 14px padding; icon-only is 40px square.
- **Primary:** Workbench Blue fill, hover to deeper blue. **Secondary (default):** Paper with Hairline Strong border, hover Wash. **Ghost:** transparent, Ink 2. **Danger solid:** Bad fill, white text, for confirm-delete only. Disabled is 50% opacity.
- **Focus:** 2px accent outline, 2px offset, on all focusable elements.

### Chips
- Short-URL chip: 13px 500 accent text on a 9% accent tint, 6px radius, click to copy; hover 16% tint. 32px tall on phones.

### Cards / Containers
- 10px radius, Paper, Hairline border, 20px padding, no shadow. Library rows: same shape at 12px 14px, border darkens to Hairline Strong on hover.

### Inputs / Fields
- 40px, Paper, Hairline Strong border, 8px radius, 12px padding. Focus: accent border plus a 3px ring (accent at 35% light, 45% dark). Invalid: Bad border. Slug field uses a joined prefix add-on on Wash with a status slot.

### Navigation
- Sticky top bar, wordmark with a 26px blue rounded mark, one primary button. No tabs; sub-pages use a quiet back link (14px 500, Ink 2).

### Menu, Dialog, Toast
- Menu: Paper, Hairline Strong border, 10px radius, floating shadow, 38px items, danger item separated by a divider; pops in over 140ms. Dialog: 14px radius, 24px padding, max 420px. Toast: inverted (Ink on Ground), 10px radius, rises 220ms.

## Do's and Don'ts

### Do:
- **Do** use the custom properties for every color so dark theme works unchanged.
- **Do** keep controls at 40px (44px on phones) and rows at 56px thumbs.
- **Do** separate surfaces with 1px borders and reserve the shadow token for floating layers.
- **Do** keep the QR on a white frame in both themes.
- **Do** use the ring + accent border for field focus and a 2px outline for everything else.

### Don't:
- **Don't** add a second chromatic color or gradients; the skeleton sheen is the only gradient.
- **Don't** put shadows on resting rows or cards.
- **Don't** use sizes outside the 13 to 24px ramp for UI text.
- **Don't** make destructive actions single-step; delete goes through the confirm dialog with the danger button.
- **Don't** animate beyond short state transitions (150 to 220ms) and honor reduced motion.
