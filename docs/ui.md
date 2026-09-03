# AI Murdle — UI/UX Design System Specification

## 1. Overview & Aesthetic Vision

The **AI Murdle** user interface is modeled directly after the puzzle experience of **Murdle** ([murdle.com](https://murdle.com)). It rejects standard corporate dashboard layouts and modern rounded-card tropes in favor of an authentic, tangible **physical detective dossier** and **retro newsprint puzzle booklet**.

### Aesthetic Pillars
- **Genre**: Vintage detective dossier, retro newspaper puzzle booklet, mechanical typewriter print, and neo-brutalist microfilm noir.
- **Physicality**: Single-column vertical layout that reads like a handheld mystery publication.
- **Brutalism**: Heavy un-rounded borders (`2px` to `4px`), hard un-blurred drop shadows (`4px 4px 0px #000000`), tactile press depressions, and physical file-folder tabs.
- **Microfilm Noir Palette**: Deep charcoal ink canvas paired with typewriter white text, aged amber crime dockets, and high-visibility blood crimson accents.

---

## 2. Color System & Design Tokens

### Core Color Palette

| Token | Hex Code | Description & Usage |
|---|---|---|
| **Canvas / Background** | `#121316` | Deep Charcoal Ink page background |
| **Main Docket Card** | `#1b1d22` | Dark dossier card surface |
| **Amber Crime Scene Box** | `#24211a` | Aged dark amber parchment for incident briefings |
| **Sunken Slot / Input** | `#0d0e11` | Recessed black slot for form inputs and code grids |
| **Primary Text** | `#f5f4ef` | Stark Typewriter White for primary reading text |
| **Borders & Dividers** | `#f0eee6` | Crisp brutalist borders and double-line newspaper rules |
| **Subtitles / Carbon Meta** | `#9b9ba3` | Carbon ribbon gray for timestamps, volume markers, and labels |
| **Placeholder Text** | `#757987` | Faded ribbon gray for input placeholders |
| **Border Dim** | `#3d414d` | Subtle dividing lines and unselected badge borders |
| **Primary Action Crimson** | `#d90429` | Blood Crimson for primary action buttons & selected emblems |
| **Neon Accent Crimson** | `#ff4d6d` | High-visibility neon red for section titles and alert headers |
| **Murdle Wine Red (Alt)** | `#A30B37` | Classic dark crimson for secondary badges and stamps |

### Hard Drop Shadows
```css
/* Brutalist un-blurred box shadows */
box-shadow: 2px 2px 0px #000000; /* Sm - badges, tab pills */
box-shadow: 4px 4px 0px #000000; /* Standard - cards, action buttons */
box-shadow: 6px 6px 0px #000000; /* Lg - modals, floating dockets */
```

---

## 3. Typography Specification

### Font Family
The entire UI uses a fixed-width mechanical typewriter font stack:
```css
font-family: 'Courier Prime', 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
```
Google Font `'Courier Prime'` is imported via `@import url(...)` in `app/globals.css`.

### Typographic Rules
1. **Strict Monospace**: Every single character, timestamp, label, button, and table cell aligns along the monospace grid.
2. **Uppercase Heading Conventions**: All dockets, labels, badges, and tabs are set in bold uppercase with wide letter-spacing (`tracking-widest` / `letter-spacing: 0.1em`).
3. **Double Rules**: Sections and mastheads are framed using double horizontal lines:
   ```css
   .murdle-divider-double {
     border-top: 3px solid #f0eee6;
     border-bottom: 1px solid #f0eee6;
     height: 6px;
     width: 100%;
   }
   ```
4. **Leading**: Paragraph text uses generous line height (`1.6` to `1.8`) to replicate physical print legibility.

---

## 4. Layout & Structural Principles

### 1. Single-Column Booklet Format
The entire page layout is centered vertically with constrained booklet widths:
- **Landing / Registration**: `max-width: 620px; width: 94%; margin: 0 auto;`
- **Investigation Console**: `max-width: 720px; width: 94%; margin: 0 auto;`
- **Submitted / Verdict**: `max-width: 640px; width: 94%; margin: 0 auto;`
- **Admin Command Desk**: `max-width: 900px; width: 94%; margin: 0 auto;`

### 2. Strictly Zero Corner Radii
Rounded corners break the mechanical newspaper aesthetic. A global stylesheet override enforces 90-degree sharp corners across the entire DOM:
```css
* {
  border-radius: 0px !important;
}
```

### 3. Tactile Button Mechanics
Buttons do not use subtle fades or gentle scale transforms. Instead, they replicate physical typewriter keystrokes:
- **Default State**: Heavy `3px` solid border with `4px 4px 0px #000000` drop shadow.
- **Active / Pressed State**:
  ```css
  active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000000]
  ```

---

## 5. Screen & Component Architecture

### A. Landing Page (`app/page.tsx`)
1. **Newspaper Booklet Masthead**:
   - Case metadata ticker (`VOL. 1 // CASE #092`, `THE DAILY MYSTERY DOSSIER`).
   - Host Login toggle button (`[ HOST LOGIN ]`).
   - Heavy title banner (`MURDLE // SOLVE THE MURDER IN THE MODEL`).
2. **Crime Scene Report Box**:
   - `#24211a` dark aged amber background with `3px` ivory border.
   - `#ff4d6d` section title with case briefing summary.
3. **Squad Registration Docket**:
   - Team callsign input field set in sunken `#0d0e11` slot.
   - Vector squad emblem grid with category filter buttons (`ALL`, `DETECTIVE`, `TECH`, `TACTICAL`, `CYBER`).
   - Active emblem highlighted in Blood Crimson (`#d90429`).
4. **Primary Action**:
   - `START INVESTIGATION` block button triggering deterministic random case allotment (`/api/cases/random`).

### B. Investigation Console (`app/game/page.tsx`)
1. **Masthead & Chronometer**:
   - Unit badge indicator and team callsign.
   - Digital Typewriter Chronometer (`[ TIME: MM:SS ]`) syncing live with server config.
   - Chunky `[ ACCUSE ]` button in `#d90429` Blood Crimson.
2. **Folder Index Tabs**:
   - Styled as physical file tabs (`[ 1. DOSSIER ]`, `[ 2. SUSPECTS ]`, `[ 3. EVIDENCE ]`, `[ 4. NOTEBOOK ]`).
   - Active tab sits flush with content box; inactive tabs recede into carbon background.
3. **Suspect Cards**:
   - Square avatar portrait boxes.
   - Alibi vs. Motive breakdown tables.
4. **Evidence Locker**:
   - Filter tags (`ALL`, `PHYSICAL`, `DIGITAL`, `TESTIMONY`).
   - ASCII simulated audio waveform intercepts (`||||!||!||||!||`).
5. **Detective Notebook**:
   - Manila lined scratchpad autosaving to `localStorage` per team name.
6. **Accusation Terminal Modal**:
   - Interactive question blocks with square toggle options.
   - Verification confirmation docket before submission.

### C. Case Verdict & Submission (`app/submitted/page.tsx`)
1. **Sealed Archive State**:
   - Manila docket awaiting host unlock with animated spinning status indicator.
2. **Revealed State**:
   - High-contrast score banner displaying points earned and elapsed time.
   - **Deduction Verification Matrix**: Full-width monospace table comparing squad deductions against official answers, stamped with `[ ✓ CORRECT ]` or `[ ✗ WRONG ]`.

### D. Chief Inspector Command Center (`app/admin/page.tsx`)
1. **Incident Chronometer Controls**:
   - Start, Pause, Resume, Reset, and Add Time (+2m, +5m) buttons.
2. **Solution Key Reveal**:
   - Toggle button dispatching immediate answer-key reveals to all active squads.
3. **Live Squad Roster**:
   - Real-time scoring table with submission status, score breakdowns, and wipe actions.
4. **Fullscreen Projector Mode**:
   - High-contrast broadcast board designed for live event projectors, featuring a massive typewriter countdown clock and squad leaderboard podium.

---

## 6. Architecture & State Safeguards

- **Zero Logic Modification**: All React hooks (`useState`, `useEffect`, `useSWR`), event handlers, parameters, storage keys, and API calls are preserved 1:1.
- **Dynamic Case Allotment**: Supports team-specific random case allotment (`/api/cases/random?teamName=...`) with seamless localStorage fallback.
- **Normalized Solution Comparison**: Submissions are evaluated using whitespace- and punctuation-insensitive string normalization for bulletproof grading.
