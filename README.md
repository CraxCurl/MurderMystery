# AIMurdle — AI Murder Mystery Website

## Project Structure

```
aimurdle/
├── index.html              ← Main website (team view)
├── css/
│   └── styles.css          ← All styles (dark cyberpunk noir theme)
├── js/
│   └── app.js              ← Game logic, timer, case loading, submission
└── cases/
    └── ghost-in-the-model.json   ← Case data (add new cases here!)
```

## How to Run

Simply open `index.html` in a browser, or serve from a local server:

```bash
# Python
python -m http.server 3000

# Node (npx serve)
npx serve .

# Node (npx live-server)
npx live-server
```

Then open: `http://localhost:3000`

> **Note:** The case JSON is loaded via `fetch()`, so you need a local server (not just opening the HTML file directly) to avoid CORS issues in most browsers.

---

## Adding a New Case

1. Create a new file in the `cases/` folder, e.g. `cases/my-new-case.json`
2. Follow the same JSON schema as `ghost-in-the-model.json`
3. Change the `loadCase()` call in `app.js` (line ~68) to point to your new file, or extend the landing screen to let admins select a case.

### Case JSON Schema

```json
{
  "id": "unique-case-id",
  "round": "Round X — Theme",
  "title": "CASE TITLE",
  "subtitle": "A Murder Mystery Challenge",
  "tagline": "...",
  "timer_minutes": 15,

  "case_file": {
    "victim": "...",
    "real_name": "...",
    "date": "...",
    "time_found": "...",
    "location": "...",
    "status": "HOMICIDE",
    "about": "...",
    "mission": "...",
    "call_to_action": "..."
  },

  "evidences": [
    {
      "id": "evidence-1",
      "label": "Evidence 1",
      "title": "Title",
      "icon": "📄",
      "type": "diary | chat | log",
      "content": [ ... ]
    }
  ],

  "hidden_clues": [ ... ],

  "suspects": [
    {
      "id": "suspect-id",
      "name": "Full Name",
      "role": "Role",
      "icon": "👤",
      "color": "#e74c3c",
      "clues": ["Clue 1", "Clue 2", "Clue 3"]
    }
  ],

  "questions": [
    {
      "id": "q1",
      "question": "WHO is the killer?",
      "icon": "🔍",
      "options": [
        { "id": "q1-a", "label": "Option A" },
        ...
      ],
      "correct": "q1-c"
    }
  ],

  "final_reveal": {
    "killer": "Name",
    "root_cause": "...",
    "motive": "...",
    "method": "...",
    "the_fix": ["..."],
    "closing": "TRUTH RENDERS JUSTICE."
  }
}
```

---

## Backend Integration

On submission, the app fires a browser event your backend can hook into:

```js
window.addEventListener('aimurdle:submitted', (e) => {
  const { teamName, caseId, answers, correctCount, totalQuestions, elapsedSeconds, submittedAt } = e.detail;
  // POST to your leaderboard API
});
```

Also stores submission locally at `localStorage.getItem('aimurdle_submission_<teamName>')`.

---

## Flow

```
Landing (enter team name)
  ↓ fetch case JSON
Case View (case file + 3 evidence tiles + suspects) ← 15-min countdown starts
  ↓ "Submit Your Verdict"
Questions (3 questions: WHO / WHY / HOW)
  → Select answers → Lock In → Change? → Submit
  ↓
Submitted screen (time elapsed, answers locked, waiting for admin reveal)
```
