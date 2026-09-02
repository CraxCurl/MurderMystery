# AIMurdle — Project Brief for AI/Dev Handoff

> **This document is the single source of truth for the AIMurdle codebase.**
> Feed this entire file to an AI assistant to get it fully up to speed.

---

## 📦 What is AIMurdle?

AIMurdle is a **team-based murder mystery web game** inspired by [Murdle](https://murdle.com), themed around AI. Teams receive a case file, read evidence, review suspects, then submit their verdict (who, why, how) before the timer runs out. An admin panel tracks submissions in real-time and displays a leaderboard.

---

## 🗂️ Complete File Structure

```
e:\aimurdle\
│
├── index.html                    ← TEAM WEBSITE (main game)
├── README.md                     ← Quick-start guide
├── PROJECT.md                    ← Main project brief
├── ADMIN_AI_INSTRUCTIONS.md      ← Handoff guide for Admin Panel AI
│
├── css/
│   └── styles.css                ← All team-facing styles
│
├── js/
│   └── app.js                    ← All game logic (team view)
│
├── cases/
│   └── ghost-in-the-model.json   ← Case 1 data file
│   └── [future-case.json]        ← Add new cases here
│
└── admin/
    ├── index.html                ← ADMIN PANEL (leaderboard + controls)
    ├── css/
    │   └── admin.css             ← Admin panel styles
    └── js/
        └── admin.js              ← Admin panel logic
```

---

## 🎮 Team Website Flow (`index.html` + `js/app.js`)

```
1. Landing Screen
   └── Team enters their name → clicks "Begin Investigation"
   └── Admin login button (top right) → password modal → opens admin/index.html

2. Case View Screen
   └── Timer starts immediately (countdown from configured minutes)
   └── Shows: Case File paper | Evidence 1 | Evidence 2 | Evidence 3 | Suspects
   └── "Submit Your Verdict" button → goes to Questions screen

3. Questions Screen
   └── 3 multiple-choice questions: WHO / WHY / HOW
   └── Select answers → "Lock In" button → confirm
   └── Can "Change Answers" to unlock and re-select
   └── "Submit Verdict" button (only visible after locking in)
   └── Timer runs out → auto-submits after 2s warning

4. Submitted Screen
   └── Shows: elapsed time, answers locked, waiting for admin reveal message
   └── Does NOT reveal correct answers (admin controls reveal)
```

---

## 🛡️ Admin Panel Flow (`admin/index.html` + `admin/js/admin.js`)

```
Access: From index.html landing page → click "🔐 Admin" top right → password: androidclub11
        Opens admin/index.html in new tab

Admin Panel Features:
├── Stats row: Teams submitted | Avg correct | Fastest time | Active timer
├── Leaderboard table: Rank | Team | Score | Time | Answer dots | Status | When
│   └── Sort by Score (default) or Sort by Time
│   └── Updates in real-time via BroadcastChannel + localStorage polling
├── Timer Control (sidebar): Edit minutes → Save → new teams pick it up
├── Clear Data button: Wipes all submissions (for new rounds)
├── Live Feed (sidebar): Real-time submission arrival log
└── Export CSV button: Downloads leaderboard as CSV
```

---

## 🔄 Data Architecture (Current: localStorage)

### How submissions flow:

```
Team submits verdict
  │
  ├─► localStorage['aimurdle_submissions']   ← Shared array (admin reads this)
  │     Format: Array of submission objects
  │
  ├─► localStorage['aimurdle_submission_<TeamName>']  ← Per-team key
  │
  └─► BroadcastChannel('aimurdle_channel')
        └─► Admin panel receives { type: 'submission', payload }
              └─► Re-renders leaderboard instantly
```

### How timer config flows:

```
Admin saves timer
  │
  └─► localStorage['aimurdle_timer_minutes']  ← Number (minutes)
        └─► Next team to start their game reads this value
```

### Submission Object Schema:

```json
{
  "teamName":       "Team Null Pointer",
  "caseId":         "ghost-in-the-model",
  "answers": {
    "q1": "q1-c",
    "q2": "q2-b",
    "q3": "q3-b"
  },
  "correctCount":   3,
  "totalQuestions": 3,
  "elapsedSeconds": 423,
  "submittedAt":    "2025-07-28T01:17:32.000Z",
  "forced":         false
}
```

---

## 🔌 Backend Integration Points

The codebase is designed so the backend team can **replace localStorage calls with real API calls** in exactly two files:

### In `admin/js/admin.js`:

```js
// REPLACE THIS:
function fetchSubmissions() {
  const raw = localStorage.getItem('aimurdle_submissions');
  return raw ? JSON.parse(raw) : [];
}

// WITH THIS (example):
async function fetchSubmissions() {
  const res = await fetch('/api/submissions');
  return res.ok ? res.json() : [];
}
```

```js
// REPLACE THIS:
function clearAllSubmissions() {
  localStorage.removeItem('aimurdle_submissions');
}

// WITH THIS:
async function clearAllSubmissions() {
  await fetch('/api/submissions', { method: 'DELETE' });
}
```

```js
// REPLACE THIS:
function saveTimerConfig(minutes) {
  localStorage.setItem('aimurdle_timer_minutes', String(minutes));
}

// WITH THIS:
async function saveTimerConfig(minutes) {
  await fetch('/api/config/timer', {
    method: 'POST',
    body: JSON.stringify({ minutes }),
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### In `js/app.js` (team view):

```js
// On submission, a CustomEvent is fired:
window.addEventListener('aimurdle:submitted', (e) => {
  const payload = e.detail;
  // POST payload to your backend here
  fetch('/api/submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### For real-time (WebSocket alternative):

The admin panel uses `BroadcastChannel` for same-browser real-time updates and
`setInterval` polling (every 2s) as fallback. If you add a WebSocket server,
you can add a listener in `admin.js`:

```js
const ws = new WebSocket('wss://your-server/admin');
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'submission') syncSubmissions();
};
```

---

## 📝 Case JSON Schema (add new cases)

Create a new file in `cases/` and change the `loadCase()` URL in `js/app.js` line ~67:

```json
{
  "id":             "unique-kebab-id",
  "round":          "Round X — Theme Name",
  "title":          "CASE TITLE IN CAPS",
  "subtitle":       "A Murder Mystery Challenge",
  "tagline":        "Multi-line tagline...",
  "timer_minutes":  15,

  "case_file": {
    "victim":       "Name (Role)",
    "real_name":    "Real Name",
    "date":         "DD Month, YYYY",
    "time_found":   "H:MM AM/PM",
    "location":     "Place, Floor, Building",
    "status":       "HOMICIDE",
    "about":        "Description of victim and context.",
    "mission":      "What teams need to do.",
    "call_to_action": "WHO DID X AND WHY?"
  },

  "evidences": [
    {
      "id":    "evidence-1",
      "label": "Evidence 1",
      "title": "Evidence Title",
      "icon":  "📄",
      "type":  "diary",          // "diary" | "chat" | "log"
      "timestamp": "28/07 00:35",
      "content": ["Line 1", "Line 2"]
    },
    {
      "type": "chat",
      "content": [
        { "speaker": "Alice", "message": "..." },
        { "speaker": "Bob",   "message": "..." }
      ]
    },
    {
      "type": "log",
      "content": [
        { "time": "27/07 22:11", "level": "INFO", "user": "User.X", "event": "login success" }
      ],
      "extra_clue": {
        "title": "Extra Clue",
        "description": "...",
        "cipher": "...",
        "hint": "A=1 B=2..."
      }
    }
  ],

  "hidden_clues": [
    { "title": "Hidden Clue", "icon": "📌", "content": "Text here." },
    { "title": "Voice Memo",  "icon": "🎙️", "duration": "0:18", "content": "Quote here." }
  ],

  "suspects": [
    {
      "id":    "suspect-id",
      "name":  "Full Name",
      "role":  "Job Title",
      "icon":  "👤",
      "color": "#e74c3c",
      "clues": ["Clue 1", "Clue 2", "Clue 3"]
    }
  ],

  "questions": [
    {
      "id":       "q1",
      "question": "WHO is the killer?",
      "icon":     "🔍",
      "options":  [
        { "id": "q1-a", "label": "Option A" },
        { "id": "q1-b", "label": "Option B" },
        { "id": "q1-c", "label": "Option C" },
        { "id": "q1-d", "label": "Option D" }
      ],
      "correct": "q1-c"
    }
  ],

  "final_reveal": {
    "killer":     "Name",
    "root_cause": "...",
    "motive":     "...",
    "method":     "...",
    "the_fix":    ["Step 1", "Step 2"],
    "closing":    "TRUTH RENDERS JUSTICE."
  }
}
```

---

## 🔑 Auth / Access

| Role  | Access Method                                                             |
|-------|---------------------------------------------------------------------------|
| Team  | Open `index.html`, enter any team name                                    |
| Admin | Click "🔐 Admin" on landing page top-right → password: **androidclub11** |

> Password is hardcoded in `index.html` inline script. To change it, search for `ADMIN_PASSWORD` in that file.

---

## 🚀 Running Locally

```bash
# Python (built-in)
python -m http.server 3000

# Node
npx serve e:\aimurdle

# npx live-server (auto-reload)
npx live-server e:\aimurdle
```

> **Must use a server** — not file:// — because the JSON case file is loaded via fetch().

Open `http://localhost:3000` for team view.
Admin opens automatically in a new tab when password is entered on landing page.

---

## 🎨 Design System

| Token           | Value            | Usage                        |
|-----------------|------------------|------------------------------|
| `--bg-dark`     | `#0a0a0f`        | Page background              |
| `--bg-card`     | `#0f0f1a`        | Card/panel background        |
| `--accent-red2` | `#e74c3c`        | Primary action, homicide red |
| `--accent-cyan` | `#00d4ff`        | Interactive, selections      |
| `--accent-gold` | `#f39c12`        | Timer, warnings              |
| `--accent-green`| `#00ff88`        | Success, live indicators     |
| `--font-mono`   | `'Courier New'`  | Labels, code, UI chrome      |
| `--font-sans`   | `'Segoe UI'`     | Body text                    |

Theme: **Dark Cyberpunk Noir Detective** — scanlines overlay, glitch title effects, terminal-style evidence blocks.

---

## ✅ What's Done

- [x] Landing page with team name entry
- [x] Admin login button (top-right) with hardcoded password + modal
- [x] Case JSON loader (`cases/ghost-in-the-model.json`)
- [x] Case view: case file paper, 3 evidence tiles (diary / chat / log), suspect cards
- [x] Hidden clue + voice memo tiles
- [x] 15-minute countdown timer (configurable by admin)
- [x] Questions screen: 3 questions, 4 options each, progress bar
- [x] Lock in → change → submit flow
- [x] Auto-submit on timer expiry
- [x] Submitted screen (no answer reveal — admin controls that)
- [x] Admin panel: leaderboard table (score + time sort)
- [x] Admin panel: stat cards (teams, avg correct, fastest, timer)
- [x] Admin panel: live feed of incoming submissions
- [x] Admin panel: timer editor (saves to localStorage, team reads on start)
- [x] Admin panel: clear all data button
- [x] Admin panel: export CSV
- [x] Real-time sync: BroadcastChannel + localStorage storage event + polling
- [x] Submission payload includes: teamName, answers, correctCount, elapsedSeconds

## 🔲 What's Left / TODO

- [ ] Backend API (replace localStorage in `admin/js/admin.js` + `js/app.js`)
- [ ] WebSocket for true multi-machine real-time sync
- [ ] Final reveal panel in admin (show correct answers to audience)
- [ ] Multiple case selector on landing page
- [ ] Team verification / prevent duplicate team names
- [ ] Admin session persistence (currently re-asks password on refresh)

---

## 📞 Team Handoff Notes

**Main team website**: `index.html`, `css/styles.css`, `js/app.js` — **DO NOT MODIFY** unless fixing bugs.

**Admin panel**: `admin/index.html`, `admin/css/admin.css`, `admin/js/admin.js` — **This is your workspace.**

**To connect your backend**: 
1. Edit the three functions at the top of `admin/js/admin.js` (`fetchSubmissions`, `clearAllSubmissions`, `saveTimerConfig`)
2. Add a `window.addEventListener('aimurdle:submitted', ...)` listener in `js/app.js` to POST to your API

**Shared data key**: `localStorage['aimurdle_submissions']` — JSON array of submission objects.

---

*Last updated: 2026-09-02 | AIMurdle v1.0*
