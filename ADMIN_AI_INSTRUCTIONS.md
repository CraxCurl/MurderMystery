# Instructions for AI Agent: Admin Panel Development

> **ROLE & PURPOSE**: You are an AI Coding Agent assigned to extend and maintain the **Admin Panel** of the AIMurdle system (`admin/index.html`, `admin/css/admin.css`, `admin/js/admin.js`).

---

## ⛔ CRITICAL BOUNDARY RULES (DO NOT BREAK)

1. **SAFE ZONE (Your Workspace)**:
   - `admin/index.html`
   - `admin/css/admin.css`
   - `admin/js/admin.js`
   - Any new files added inside the `admin/` directory.

2. **NO-TOUCH ZONE (Team View Files — DO NOT EDIT)**:
   - ❌ `index.html` (Main team player screen)
   - ❌ `js/app.js` (Main team game engine)
   - ❌ `css/styles.css` (Team website styling)
   - ❌ `cases/*.json` (Case file definitions)

---

## 📡 DATA CONTRACT & ARCHITECTURE

The Admin Panel operates by reading submissions produced by the Team View.

### 1. LocalStorage Keys

| Key | Type | Description |
|---|---|---|
| `aimurdle_submissions` | `Array<Submission>` | List of all completed team submissions |
| `aimurdle_timer_minutes` | `number` | Active timer duration in minutes set by admin |

### 2. Submission Object Schema

```typescript
interface Submission {
  teamName: string;          // e.g. "Team Null Pointer"
  caseId: string;            // e.g. "ghost-in-the-model"
  answers: Record<string, string>; // { "q1": "q1-c", "q2": "q2-b", "q3": "q3-b" }
  correctCount: number;      // Number of correct answers (0 to 3)
  totalQuestions: number;    // Usually 3
  elapsedSeconds: number;    // Time taken in seconds
  submittedAt: string;       // ISO 8601 Timestamp
  forced: boolean;           // true if submitted automatically on timer timeout
}
```

### 3. Real-Time Events

- **BroadcastChannel**: Listening on channel `aimurdle_channel` for `{ type: 'submission', payload }`.
- **Storage Event**: Listening for window `storage` event on key `aimurdle_submissions`.
- **Polling Fallback**: `setInterval` polling `fetchSubmissions()` every 2000ms.

---

## 🛠️ ADMIN PANEL FUNCTIONS REFERENCE (`admin/js/admin.js`)

Modify these functions directly when replacing `localStorage` with a custom backend database API (Node.js, Express, Firebase, Supabase, MongoDB, etc.):

```javascript
// 1. Fetch all submissions for leaderboard
function fetchSubmissions() { ... }

// 2. Clear all submissions for a new game round
function clearAllSubmissions() { ... }

// 3. Save timer configuration
function saveTimerConfig(minutes) { ... }
```

---

## 🎯 POTENTIAL TASKS FOR YOU (THE ADMIN AI)

When requested by the user, here are features you can safely implement within `admin/`:

1. **Final Reveal Control**:
   - Add a "Trigger Final Answer Reveal" button.
   - Show a cinematic presentation modal displaying the killer, motive, method, and fix from the case JSON to the audience.

2. **Search & Filter Leaderboard**:
   - Add search box to filter teams by name.
   - Filter by status (`Submitted` vs `Timeout`).

3. **Backend / Database Integration**:
   - Replace `localStorage` calls with `fetch()` requests to your backend endpoints.
   - Add WebSocket connection for multi-device real-time sync across different physical laptops.

4. **Multi-Case Manager**:
   - Allow admin to select which case JSON in `cases/` is active for upcoming rounds.

---

## 🧪 HOW TO TEST YOUR CHANGES

1. Start local server:
   ```bash
   python -m http.server 3000
   ```
2. Open `http://localhost:3000` in browser.
3. Open `http://localhost:3000/admin/index.html` (Password: `androidclub11`).
4. In another tab or incognito window, submit answers as a team and watch the Admin Panel leaderboard update live!
