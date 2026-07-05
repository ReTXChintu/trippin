# Trippin' — Brand Guidelines
**Smart AI Travel Planner**  
Version 1.0 · June 2026

---

## 1. Logo Concept

### The Mark
The Trippin' icon is a **geometric route-path T** — a single cohesive mark that simultaneously reads as:

- The letter **"T"** (for Trippin') in its overall silhouette
- A **travel route with waypoints**: a vertical journey stem ending in a destination dot, crossed by a horizontal path with two hollow ring waypoints at each end
- A **modern map pin** abstracted and elevated — no literal teardrops or cheesy location clichés

The three circular elements (top cap, left ring, right ring, base dot) create a natural reading rhythm: **origin → route → destination**, reflecting the core product promise of smart itinerary planning.

### Why it works at every size
- At 1024 px: rich detail, rings clearly separate from fill
- At 48 px: bold T silhouette with strong contrast
- At 16 px: solid geometric shape, instantly recognisable

---

## 2. Color Palette

| Role | Name | Hex | RGB |
|---|---|---|---|
| Primary | Sky Blue | `#0EA5E9` | 14, 165, 233 |
| Accent | Emerald | `#10B981` | 16, 185, 129 |
| Dark neutral | Midnight | `#0F172A` | 15, 23, 42 |
| Light neutral | White | `#FFFFFF` | 255, 255, 255 |
| Tagline text | Slate | `#64748B` | 100, 116, 139 |
| Dark mode tagline | Cool Grey | `#94A3B8` | 148, 163, 184 |

### Colour usage rules
- **Sky Blue** is the hero app icon background and primary brand colour. Use it for CTAs, primary buttons, and active states.
- **Emerald** is the accent: waypoint rings, success states, AI-generated highlights. Never use as the primary background.
- **Midnight** is the dark neutral: text, dark backgrounds, dark icon variant. Avoid pure black (`#000`) — Midnight is richer.
- The primary logo on a white background uses **Sky Blue icon + Midnight wordmark**.
- On dark backgrounds: **Sky Blue icon + White wordmark**.

---

## 3. Typography

### Primary Typeface — Poppins
Poppins (Google Fonts, open licence) is the Trippin' brand typeface. Its geometric structure, friendly rounded forms, and excellent weight range make it ideal for both UI and brand applications.

| Usage | Weight | Size guidance |
|---|---|---|
| App name / Wordmark | Bold (700) | 48 px+ display |
| Tagline | Medium (500) | ~29% of wordmark size |
| UI headings | SemiBold (600) | H1–H3 |
| UI body | Regular (400) | 14–16 px |
| UI captions | Light (300) | 11–13 px |

### Fallback stack
```css
font-family: 'Poppins', 'Inter', 'Manrope', system-ui, -apple-system, sans-serif;
```

### Typographic rules
- **Wordmark** uses sentence case: "Trippin'" — the apostrophe is part of the brand name, never omit it.
- Letter-spacing on the wordmark: `0` (no tracking — Poppins Bold already has balanced spacing).
- Minimum wordmark size: 120 px wide (digital), 25 mm (print).

---

## 4. Logo Variants & Files

| File | Size | Usage |
|---|---|---|
| `app_icon.png` | 1024×1024 | App stores (iOS, Android, Web), primary icon |
| `favicon.png` | 512×512 | Browser tabs, PWA, social previews |
| `full_logo.png` | 3000×1000 | Website headers, presentations (transparent bg) |
| `app_icon_dark.png` | 1024×1024 | Dark UI surfaces, OLED themes |
| `app_icon_light.png` | 1024×1024 | Light UI surfaces, white card contexts |
| `monochrome_logo.png` | 3000×1000 | Single-colour print (dark ink, transparent bg) |
| `monochrome_logo_white.png` | 3000×1000 | White on dark surfaces, embossed / engraved |

---

## 5. Spacing & Clear Space

The minimum clear space around the icon is **1× the width of the vertical stem** on all four sides.

For the full horizontal logo, minimum clear space is **half the icon height** on all sides.

```
          ┌─────────────────────────────────┐
          │  ←───  clear space  ───→        │
          │    ┌───────────────────────┐    │
  clear   │    │   [icon] Trippin'     │    │  clear
  space   │    └───────────────────────┘    │  space
          │                                 │
          └─────────────────────────────────┘
```

Never place the logo closer than the clear space boundary to other elements, edges, or competing type.

---

## 6. Dark Mode Recommendations

Trippin' is designed dark-mode-first.

| Context | Icon bg | Icon mark | Wordmark | Tagline |
|---|---|---|---|---|
| Light UI | `#0EA5E9` | White + Emerald | `#0F172A` | `#64748B` |
| Dark UI | `#0EA5E9` | White + Emerald | `#FFFFFF` | `#94A3B8` |
| Pure dark (OLED) | `#0F172A` | Sky + Emerald | `#FFFFFF` | `#94A3B8` |
| Monochrome (light) | `#0F172A` | White | `#0F172A` | `#64748B` |
| Monochrome (dark) | `#FFFFFF` | `#0F172A` | `#FFFFFF` | `#94A3B8` |

The icon's Sky Blue background works on both light and dark surfaces — it is always the "anchor" of the brand across contexts.

---

## 7. Incorrect Usage

❌ **Do not** recolour the icon fill with gradients  
❌ **Do not** stretch or distort the mark  
❌ **Do not** place the icon on a busy photographic background without a colour-block backing  
❌ **Do not** remove the apostrophe from "Trippin'"  
❌ **Do not** use the wordmark without the icon in primary brand positions  
❌ **Do not** use the light icon variant on light backgrounds (insufficient contrast)  
❌ **Do not** resize the icon below 24 × 24 px on screen  
❌ **Do not** change the Sky Blue icon background to any other hue  

---

## 8. Icon Grid & Construction

The icon fits within a **100-unit square** (conceptual grid):

```
  ←──────── 76 units ────────→
  ·    ○────────────────○    ·   ← crossbar at ~24u from top
  ·    │       ┃        │    ·
  ·         ┌───┐            ·   ← top of stem
  ·         │   │            ·
  ·         │   │            ·   stem: 12u wide × 55u tall
  ·         │   │            ·
  ·         │   │            ·
  ·         └─●─┘            ·   ← destination dot
  ·                          ·
```

The two waypoint rings (○) on the crossbar and the destination dot (●) at the base of the stem are the three "stops" on the journey.

---

## 9. Brand Voice (brief)

- **Tone**: Friendly + confident. Never corporate, never cheesy travel-brochure.
- **Writing style**: Conversational, short sentences, active verbs.
- **Product voice examples**: "Your route, sorted." / "Three cities. Zero headaches." / "AI picked the best route. You pick the vibes."

---

*Trippin' Brand Guidelines v1.0 — maintained by the Trippin' Design team.*
