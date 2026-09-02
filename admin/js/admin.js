/**
 * AIMurdle — Admin Panel Logic
 *
 * Data flow (localStorage-based, no backend needed):
 *   Team page writes:  localStorage['aimurdle_submissions']  (JSON array of submission objects)
 *   Admin page reads:  same key, polls every 2s + listens for storage events
 *   Admin page writes: localStorage['aimurdle_timer_minutes']  →  team page reads on start
 *
 * To connect a real backend later, replace the localStorage calls below
 * with fetch() POST/GET calls to your API.
 */

'use strict';

// ============================================================
//  CONSTANTS
// ============================================================
const STORAGE_KEY_SUBMISSIONS = 'aimurdle_submissions';
const STORAGE_KEY_TIMER       = 'aimurdle_timer_minutes';
const DEFAULT_TIMER_MINS      = 15;
const POLL_INTERVAL_MS        = 2000; // real-time polling fallback

// ============================================================
//  STATE
// ============================================================
const Admin = {
  submissions: [],  // array of submission objects
  sortMode: 'score', // 'score' | 'time'
  pollTimer: null,
  channel: null,    // BroadcastChannel if available
};

// ============================================================
//  UTILITY
// ============================================================
function $(id) { return document.getElementById(id); }

function toast(msg, type = 'info', duration = 3000) {
  const c = $('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'info' ? ` ${type}` : '');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 350);
  }, duration);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

// ============================================================
//  DATA LAYER
//  Replace these functions to connect your real backend API
// ============================================================

/**
 * Load all submissions from localStorage.
 * BACKEND TEAM: Replace with fetch('/api/submissions') or equivalent.
 */
function fetchSubmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Clear all submissions (admin action).
 * BACKEND TEAM: Replace with DELETE /api/submissions or equivalent.
 */
function clearAllSubmissions() {
  localStorage.removeItem(STORAGE_KEY_SUBMISSIONS);
  Admin.submissions = [];
}

/**
 * Save the timer config (minutes) so the team page picks it up.
 * BACKEND TEAM: Also POST to /api/config/timer if you want server-side storage.
 */
function saveTimerConfig(minutes) {
  localStorage.setItem(STORAGE_KEY_TIMER, String(minutes));
}

// ============================================================
//  SUBMISSION SYNC
// ============================================================
function syncSubmissions() {
  const fresh = fetchSubmissions();

  // Detect new arrivals for the live feed
  const existingIds = new Set(Admin.submissions.map(s => `${s.teamName}|${s.submittedAt}`));
  const newOnes = fresh.filter(s => !existingIds.has(`${s.teamName}|${s.submittedAt}`));

  Admin.submissions = fresh;

  if (newOnes.length > 0) {
    newOnes.forEach(s => {
      addFeedItem(s);
      toast(`📥 ${s.teamName} submitted!`, 'ok', 3000);
    });
  }

  renderLeaderboard();
  updateStats();
}

// ============================================================
//  LEADERBOARD RENDER
// ============================================================
function sortedSubmissions() {
  const copy = [...Admin.submissions];

  if (Admin.sortMode === 'score') {
    // Primary: more correct answers first; secondary: less time used
    copy.sort((a, b) => {
      const scoreDiff = (b.correctCount || 0) - (a.correctCount || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.elapsedSeconds || 0) - (b.elapsedSeconds || 0);
    });
  } else {
    // Time only: fastest first
    copy.sort((a, b) => (a.elapsedSeconds || 0) - (b.elapsedSeconds || 0));
  }

  return copy;
}

function renderLeaderboard() {
  const tbody = $('lb-tbody');
  const empty = $('lb-empty');
  const sorted = sortedSubmissions();

  if (sorted.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = '';

  sorted.forEach((entry, idx) => {
    const rank = idx + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const rankIcon  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

    const total = entry.totalQuestions || 3;
    const correct = entry.correctCount || 0;

    // Answer dots — we don't know which ones are correct from here without case data
    // Show green dots = correctCount, red = wrong, grey = skipped
    const answered = Object.keys(entry.answers || {}).length;
    let dotsHtml = '';
    for (let i = 0; i < total; i++) {
      if (i < correct)                  dotsHtml += '<span class="answer-dot dot-correct"></span>';
      else if (i < answered)            dotsHtml += '<span class="answer-dot dot-wrong"></span>';
      else                              dotsHtml += '<span class="answer-dot dot-skipped"></span>';
    }

    const badgeClass  = entry.forced ? 'badge-timeout' : 'badge-submitted';
    const badgeLabel  = entry.forced ? 'Timeout' : 'Submitted';
    const submittedAt = entry.submittedAt ? timeAgo(entry.submittedAt) : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-cell ${rankClass}">${rankIcon}</td>
      <td class="team-cell">${escHTML(entry.teamName || '—')}</td>
      <td class="score-cell">${correct}/${total}</td>
      <td class="time-cell">${formatTime(entry.elapsedSeconds || 0)}</td>
      <td class="answers-cell">${dotsHtml}</td>
      <td><span class="status-badge ${badgeClass}">${badgeLabel}</span></td>
      <td class="time-cell" style="font-size:10px;color:var(--text-dim)">${submittedAt}</td>
    `;
    tbody.appendChild(tr);
  });
}

function escHTML(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
//  STATS
// ============================================================
function updateStats() {
  const subs = Admin.submissions;
  $('stat-teams').textContent   = subs.length;
  $('stat-correct').textContent = subs.length > 0
    ? Math.round(subs.reduce((acc, s) => acc + (s.correctCount || 0), 0) / subs.length * 10) / 10
    : '—';

  const fastest = subs.reduce((min, s) => (!min || (s.elapsedSeconds < min.elapsedSeconds)) ? s : min, null);
  $('stat-fastest').textContent = fastest ? formatTime(fastest.elapsedSeconds) : '—';

  const timerMins = localStorage.getItem(STORAGE_KEY_TIMER) || DEFAULT_TIMER_MINS;
  $('stat-timer').textContent = `${timerMins}m`;
}

// ============================================================
//  LIVE FEED
// ============================================================
function addFeedItem(submission) {
  const list = $('feed-list');
  const item = document.createElement('div');
  item.className = 'feed-item';
  const correct = submission.correctCount || 0;
  const total   = submission.totalQuestions || 3;
  const t       = formatTime(submission.elapsedSeconds || 0);
  const when    = submission.submittedAt ? new Date(submission.submittedAt).toLocaleTimeString() : '';
  item.innerHTML = `
    <div class="feed-item-team">${escHTML(submission.teamName)}</div>
    <div class="feed-item-meta">
      ${correct}/${total} correct · ${t} elapsed
      ${submission.forced ? '· <span style="color:var(--accent-gold)">Timeout</span>' : ''}
    </div>
    <div class="feed-time-stamp">${when}</div>
  `;
  list.prepend(item);
}

function rebuildFeed() {
  const list = $('feed-list');
  list.innerHTML = '';
  const sorted = [...Admin.submissions].sort(
    (a,b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  );
  sorted.forEach(addFeedItem);
}

// ============================================================
//  TIMER CONTROL
// ============================================================
function initTimerControl() {
  const saved = localStorage.getItem(STORAGE_KEY_TIMER);
  const input = $('timer-input');
  input.value = saved ? parseInt(saved) : DEFAULT_TIMER_MINS;

  $('btn-save-timer').addEventListener('click', () => {
    const val = parseInt(input.value);
    if (isNaN(val) || val < 1 || val > 120) {
      toast('Enter a value between 1 and 120 minutes.', 'error');
      return;
    }
    saveTimerConfig(val);
    updateStats();
    toast(`✓ Timer set to ${val} minutes. New teams will use this.`, 'ok', 4000);
  });

  $('btn-reset-timer').addEventListener('click', () => {
    input.value = DEFAULT_TIMER_MINS;
    saveTimerConfig(DEFAULT_TIMER_MINS);
    updateStats();
    toast(`Timer reset to ${DEFAULT_TIMER_MINS} minutes.`, 'info');
  });
}

// ============================================================
//  SORT TOGGLE
// ============================================================
function initSortButtons() {
  $('sort-score').addEventListener('click', () => {
    Admin.sortMode = 'score';
    $('sort-score').classList.add('active');
    $('sort-time').classList.remove('active');
    renderLeaderboard();
  });

  $('sort-time').addEventListener('click', () => {
    Admin.sortMode = 'time';
    $('sort-time').classList.add('active');
    $('sort-score').classList.remove('active');
    renderLeaderboard();
  });
}

// ============================================================
//  CLEAR DATA
// ============================================================
function initClearButton() {
  $('btn-clear-data').addEventListener('click', () => {
    if (!confirm('Clear ALL submission data? This cannot be undone.')) return;
    clearAllSubmissions();
    $('feed-list').innerHTML = '';
    renderLeaderboard();
    updateStats();
    toast('All submissions cleared.', 'warn', 4000);
  });
}

// ============================================================
//  REAL-TIME SYNC
// ============================================================
function startRealTimeSync() {
  // 1. BroadcastChannel — same-origin cross-tab instant updates
  if (typeof BroadcastChannel !== 'undefined') {
    Admin.channel = new BroadcastChannel('aimurdle_channel');
    Admin.channel.onmessage = (e) => {
      if (e.data?.type === 'submission') {
        syncSubmissions();
      }
    };
  }

  // 2. storage event — catches changes from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_SUBMISSIONS) {
      syncSubmissions();
    }
  });

  // 3. Polling fallback — catches everything including same-tab changes
  Admin.pollTimer = setInterval(syncSubmissions, POLL_INTERVAL_MS);
}

// ============================================================
//  EXPORT CSV
// ============================================================
function exportCSV() {
  if (Admin.submissions.length === 0) {
    toast('No data to export.', 'warn'); return;
  }
  const rows = [
    ['Rank','Team Name','Score','Time (s)','Elapsed','Forced','Submitted At'],
    ...sortedSubmissions().map((s, i) => [
      i + 1,
      `"${s.teamName}"`,
      `${s.correctCount}/${s.totalQuestions}`,
      s.elapsedSeconds,
      formatTime(s.elapsedSeconds),
      s.forced ? 'Yes' : 'No',
      s.submittedAt || '',
    ])
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `aimurdle_leaderboard_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV downloaded.', 'ok');
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Load initial data
  syncSubmissions();
  rebuildFeed();

  // Controls
  initTimerControl();
  initSortButtons();
  initClearButton();

  // Export
  $('btn-export').addEventListener('click', exportCSV);

  // Logout
  $('btn-logout').addEventListener('click', () => {
    if (confirm('Log out of admin panel?')) window.close();
  });

  // Start real-time sync
  startRealTimeSync();

  // Mark sort-score active by default
  $('sort-score').classList.add('active');

  console.log('[AIMurdle Admin] Panel ready. Listening for submissions...');
});
