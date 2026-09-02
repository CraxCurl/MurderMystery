/**
 * AIMurdle — Main Application Logic
 * Handles: landing, case display, timer, questions, submission
 */

'use strict';

// =============================================
//  STATE
// =============================================
const App = {
  teamName: '',
  caseData: null,
  timer: null,
  timerSeconds: 0,
  elapsed: 0,
  answers: {},        // { q1: optionId, q2: optionId, q3: optionId }
  locked: false,
  submitted: false,
  phase: 'landing',   // landing | case | questions | submitted
};

// =============================================
//  UTILITY
// =============================================
function $(id) { return document.getElementById(id); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function toast(msg, type = 'info', duration = 3000) {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'info' ? ` ${type}` : '');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => el.remove(), 350);
  }, duration);
}

function makeStars(container) {
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('span');
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const d = (2 + Math.random() * 4).toFixed(1);
    const delay = (Math.random() * 4).toFixed(2);
    const opacity = (0.2 + Math.random() * 0.6).toFixed(2);
    s.style.cssText = `left:${x}%;top:${y}%;--d:${d}s;--delay:${delay}s;--o:${opacity}`;
    container.appendChild(s);
  }
}

// =============================================
//  CASE LOADING
// =============================================
async function loadCase(url = './cases/ghost-in-the-model.json') {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to load case:', err);
    toast('Failed to load case data.', 'error', 5000);
    return null;
  }
}

// =============================================
//  LANDING SCREEN
// =============================================
function initLanding() {
  makeStars(document.querySelector('#screen-landing .stars'));

  const form = document.getElementById('landing-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('team-input');
    const name = input.value.trim();
    if (!name) { input.focus(); return; }

    App.teamName = name;

    // Load case
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'LOADING CASE...';
    btn.disabled = true;

    const caseData = await loadCase();
    if (!caseData) {
      btn.textContent = 'BEGIN INVESTIGATION';
      btn.disabled = false;
      return;
    }

    App.caseData = caseData;
    App.timerSeconds = (caseData.timer_minutes || 15) * 60;
    App.elapsed = 0;

    renderCase(caseData);
    showScreen('screen-case');
    App.phase = 'case';
    startTimer();
    toast(`Welcome, Team ${App.teamName}. The clock is ticking.`, 'info', 4000);
  });
}

// =============================================
//  TIMER
// =============================================
function startTimer() {
  let remaining = App.timerSeconds;
  updateTimerDisplay(remaining);

  App.timer = setInterval(() => {
    remaining--;
    App.elapsed++;
    updateTimerDisplay(remaining);

    if (remaining <= 120 && remaining > 0) {
      const displays = document.querySelectorAll('.timer-display');
      displays.forEach(d => d.classList.add('warning'));
    }
    if (remaining === 120) {
      toast('⚠ 2 minutes remaining! Lock in your answers!', 'warn', 5000);
    }
    if (remaining <= 0) {
      clearInterval(App.timer);
      if (!App.submitted) {
        toast('⏰ Time is up! Auto-submitting...', 'error', 4000);
        setTimeout(() => submitAnswers(true), 2000);
      }
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  document.querySelectorAll('.timer-display').forEach(el => {
    el.textContent = formatTime(seconds);
  });
}

function stopTimer() {
  if (App.timer) {
    clearInterval(App.timer);
    App.timer = null;
  }
}

// =============================================
//  CASE SCREEN RENDERING
// =============================================
function renderCase(data) {
  // Header
  document.getElementById('header-team-name').textContent = `Team: ${App.teamName}`;
  document.getElementById('header-round').textContent = data.round;

  // Hero
  document.getElementById('hero-round').textContent = data.round;
  document.getElementById('hero-title').textContent = data.title;
  document.getElementById('hero-title').setAttribute('data-text', data.title);
  document.getElementById('hero-subtitle').textContent = data.subtitle;
  document.getElementById('hero-tagline').textContent = data.tagline;

  // Case file paper
  renderCaseFile(data.case_file);

  // Hidden clues
  renderHiddenClues(data.hidden_clues || []);

  // Evidences
  renderEvidences(data.evidences);

  // Suspects
  renderSuspects(data.suspects);

  // Go to questions button (once: true prevents double-binding)
  const goBtn = document.getElementById('btn-go-questions');
  goBtn.replaceWith(goBtn.cloneNode(true)); // remove old listeners
  document.getElementById('btn-go-questions').addEventListener('click', goToQuestions);

  // Update phase track
  setPhaseStep(0);
}

function renderCaseFile(cf) {
  const container = document.getElementById('case-file-paper');
  container.innerHTML = `
    <div class="paper-header">📁 CASE FILE</div>
    <div class="paper-row"><span class="paper-key">Victim:</span><span class="paper-val">${cf.victim}</span></div>
    <div class="paper-row"><span class="paper-key">Real Name:</span><span class="paper-val">${cf.real_name}</span></div>
    <div class="paper-row"><span class="paper-key">Date:</span><span class="paper-val">${cf.date}</span></div>
    <div class="paper-row"><span class="paper-key">Time Found:</span><span class="paper-val">${cf.time_found}</span></div>
    <div class="paper-row"><span class="paper-key">Location:</span><span class="paper-val">${cf.location}</span></div>
    <div class="paper-row"><span class="paper-key">Status:</span><span class="paper-val paper-status">${cf.status}</span></div>
    <div class="paper-section">
      <div class="paper-section-title">About the Victim</div>
      <div>${cf.about}</div>
    </div>
    <div class="paper-section">
      <div class="paper-section-title">Your Mission</div>
      <div>${cf.mission}</div>
    </div>
    <div class="paper-cta">${cf.call_to_action}</div>
  `;
}

function renderHiddenClues(clues) {
  const container = document.getElementById('hidden-clues-container');
  container.innerHTML = '';
  clues.forEach(c => {
    const tile = document.createElement('div');
    tile.className = 'clue-tile';
    const dur = c.duration ? ` <span style="color:var(--text-dim)">▶ ${c.duration}</span>` : '';
    tile.innerHTML = `
      <div class="clue-tile-header">${c.icon || '📌'} ${c.title}${dur}</div>
      <div style="white-space:pre-line;font-style:italic;">${c.content}</div>
    `;
    container.appendChild(tile);
  });
}

function renderEvidences(evidences) {
  evidences.forEach((ev, i) => {
    const slot = document.getElementById(`evidence-slot-${i + 1}`);
    if (!slot) return;

    let inner = `<div class="card-label">${ev.icon || '📄'} ${ev.label}</div>
    <div class="card-title">${ev.title}</div>`;

    if (ev.type === 'diary') {
      inner += `<div class="diary-block">
        <div class="timestamp">⏰ ${ev.timestamp}</div>
        ${ev.content.map(line => `<p>${escapeHTML(line)}</p>`).join('')}
      </div>`;
    } else if (ev.type === 'chat') {
      inner += `<div class="chat-block">
        ${ev.content.map(row => {
          const cls = row.speaker.toLowerCase().replace(/[^a-z]/g, '');
          return `<div class="chat-row">
            <span class="chat-speaker ${cls}">${escapeHTML(row.speaker)}:</span>
            <span class="chat-msg">${escapeHTML(row.message)}</span>
          </div>`;
        }).join('')}
        ${ev.timestamp ? `<div class="chat-footer">(Chat exported at ${ev.timestamp})</div>` : ''}
      </div>`;
    } else if (ev.type === 'log') {
      inner += `<div class="log-block">
        ${ev.content.map(row => `
          <div class="log-row">
            <span class="log-time">${escapeHTML(row.time)}</span>
            <span class="log-level ${row.level}">${row.level}</span>
            <span class="log-user">${escapeHTML(row.user)}</span>
            <span class="log-event ${row.level === 'ALERT' ? 'alert-event' : ''}">${escapeHTML(row.event)}</span>
          </div>`).join('')}
      </div>`;

      if (ev.extra_clue) {
        inner += `<div class="extra-clue-box">
          <div class="extra-clue-title">🔐 ${ev.extra_clue.title}</div>
          <div style="color:var(--text-muted);font-size:11px;margin-bottom:10px;">${ev.extra_clue.description}</div>
          <div class="cipher-text">${ev.extra_clue.cipher}</div>
          <div class="cipher-hint">Hint: ${ev.extra_clue.hint}</div>
        </div>`;
      }
    }

    slot.innerHTML = inner;
  });
}

function renderSuspects(suspects) {
  const grid = document.getElementById('suspects-grid');
  grid.innerHTML = '';
  suspects.forEach(s => {
    const card = document.createElement('div');
    card.className = 'suspect-card';
    card.style.setProperty('--suspect-color', s.color);
    card.innerHTML = `
      <div class="suspect-icon" style="color:${s.color};border-color:${s.color}22;">${s.icon}</div>
      <div class="suspect-name">${escapeHTML(s.name)}</div>
      <div class="suspect-role">${escapeHTML(s.role)}</div>
      <ul class="suspect-clues">
        ${s.clues.map(c => `<li>${escapeHTML(c)}</li>`).join('')}
      </ul>
    `;
    grid.appendChild(card);
  });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================
//  PHASE TRACKING
// =============================================
function setPhaseStep(activeIndex) {
  const steps = document.querySelectorAll('.phase-step');
  const connectors = document.querySelectorAll('.phase-connector');
  steps.forEach((step, i) => {
    step.classList.remove('active', 'done');
    if (i < activeIndex) step.classList.add('done');
    else if (i === activeIndex) step.classList.add('active');
  });
  connectors.forEach((c, i) => {
    c.classList.toggle('done', i < activeIndex);
  });
}

// =============================================
//  QUESTIONS SCREEN
// =============================================
function goToQuestions() {
  if (!App.caseData) return;
  showScreen('screen-questions');
  App.phase = 'questions';
  setPhaseStep(1);
  renderQuestions(App.caseData.questions);
  // Sync timer display
  document.querySelectorAll('.timer-display').forEach(el => {
    // already synced by startTimer interval
  });
}

function renderQuestions(questions) {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';

  document.getElementById('q-team-name').textContent = `Team: ${App.teamName}`;
  document.getElementById('q-total').textContent = `${questions.length} Questions`;

  const optionLetters = ['A', 'B', 'C', 'D'];

  questions.forEach((q, qi) => {
    const block = document.createElement('div');
    block.className = 'question-block';
    block.style.animationDelay = `${qi * 0.12}s`;
    block.style.opacity = '0';

    block.innerHTML = `
      <div class="question-text">
        <div class="question-icon">${q.icon}</div>
        <h3>${escapeHTML(q.question)}</h3>
      </div>
      <div class="options-grid" id="options-${q.id}">
        ${q.options.map((opt, oi) => `
          <button class="option-btn"
            data-qid="${q.id}"
            data-oid="${opt.id}"
            ${App.locked ? 'disabled' : ''}
          >
            <span class="opt-letter">${optionLetters[oi]}</span>
            ${escapeHTML(opt.label)}
          </button>
        `).join('')}
      </div>
    `;

    container.appendChild(block);
  });

  // Attach click handlers
  container.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => selectOption(btn));
  });

  // Restore saved answers
  Object.entries(App.answers).forEach(([qid, oid]) => {
    const btn = container.querySelector(`[data-qid="${qid}"][data-oid="${oid}"]`);
    if (btn) btn.classList.add('selected');
  });

  updateAnswerSummary(questions);

  // Animate in
  requestAnimationFrame(() => {
    container.querySelectorAll('.question-block').forEach(b => {
      b.style.opacity = '';
    });
  });

  // Clean + re-attach buttons to avoid duplicate listeners on re-entry
  ['btn-lockin','btn-change','btn-submit','btn-back-case'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.replaceWith(el.cloneNode(true));
  });

  document.getElementById('btn-lockin').addEventListener('click', lockInAnswers);
  document.getElementById('btn-change').addEventListener('click', unlockAnswers);
  document.getElementById('btn-submit').addEventListener('click', () => submitAnswers(false));
  document.getElementById('btn-back-case').addEventListener('click', () => {
    showScreen('screen-case');
    App.phase = 'case';
    setPhaseStep(0);
  });

  updateLockUI();
}

function selectOption(btn) {
  if (App.locked) return;

  const qid = btn.dataset.qid;
  const oid = btn.dataset.oid;

  // Deselect others in same group
  document.querySelectorAll(`[data-qid="${qid}"]`).forEach(b => b.classList.remove('selected'));

  // Select this
  btn.classList.add('selected');
  App.answers[qid] = oid;

  updateAnswerSummary(App.caseData.questions);
}

function updateAnswerSummary(questions) {
  const chips = document.getElementById('answers-summary');
  chips.innerHTML = '';
  questions.forEach((q, i) => {
    const chip = document.createElement('div');
    chip.className = 'answer-chip' + (App.answers[q.id] ? ' answered' : '');
    chip.textContent = `Q${i + 1}: ${App.answers[q.id] ? '✓ Answered' : 'Pending'}`;
    chips.appendChild(chip);
  });

  // Progress bar
  const total = questions.length;
  const done = Object.keys(App.answers).length;
  document.getElementById('question-progress-fill').style.width = `${(done / total) * 100}%`;
}

function lockInAnswers() {
  const questions = App.caseData.questions;
  const missing = questions.filter(q => !App.answers[q.id]);
  if (missing.length > 0) {
    toast(`Please answer all ${missing.length} remaining question(s) before locking in.`, 'warn', 3000);
    return;
  }

  App.locked = true;
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  updateLockUI();
  toast('Answers locked in! Review and submit when ready.', 'info', 3000);
}

function unlockAnswers() {
  App.locked = false;
  document.querySelectorAll('.option-btn').forEach(b => b.disabled = false);
  updateLockUI();
  toast('You can now change your answers.', 'info', 2000);
}

function updateLockUI() {
  const lockBar = document.getElementById('lockin-bar');
  const btnLockin = document.getElementById('btn-lockin');
  const btnChange = document.getElementById('btn-change');
  const btnSubmit = document.getElementById('btn-submit');

  if (App.locked) {
    btnLockin.classList.add('hidden');
    btnChange.classList.remove('hidden');
    btnSubmit.classList.remove('hidden');
    lockBar.style.borderTopColor = 'rgba(0,212,255,0.3)';
    lockBar.style.background = 'rgba(0,212,255,0.04)';
    document.getElementById('lockin-status').textContent = '🔒 Answers Locked In — Submit or Change';
  } else {
    btnLockin.classList.remove('hidden');
    btnChange.classList.add('hidden');
    btnSubmit.classList.add('hidden');
    lockBar.style.borderTopColor = 'rgba(192,57,43,0.2)';
    lockBar.style.background = 'rgba(192,57,43,0.08)';
    document.getElementById('lockin-status').textContent = 'Select your answers above, then lock in';
  }
}

// =============================================
//  SUBMISSION
// =============================================
function submitAnswers(forced = false) {
  if (App.submitted) return;

  if (!forced && !App.locked) {
    toast('Please lock in your answers before submitting.', 'warn', 3000);
    return;
  }

  stopTimer();
  App.submitted = true;

  const elapsed = App.elapsed;
  const questions = App.caseData.questions;

  // Calculate score (simple: correct count)
  let correct = 0;
  questions.forEach(q => {
    if (App.answers[q.id] === q.correct) correct++;
  });

  // Build submission payload (for backend team integration)
  const payload = {
    teamName: App.teamName,
    caseId: App.caseData.id,
    answers: App.answers,
    correctCount: correct,
    totalQuestions: questions.length,
    elapsedSeconds: elapsed,
    submittedAt: new Date().toISOString(),
    forced,
  };

  // Store locally
  try {
    localStorage.setItem(`aimurdle_submission_${App.teamName}`, JSON.stringify(payload));
  } catch (_) {}

  // Dispatch event for backend integration
  window.dispatchEvent(new CustomEvent('aimurdle:submitted', { detail: payload }));

  renderSubmitted(payload, questions);
  showScreen('screen-submitted');
  App.phase = 'submitted';
  setPhaseStep(2);
}

function renderSubmitted(payload, questions) {
  document.getElementById('submitted-team').textContent = `Team: ${payload.teamName}`;
  document.getElementById('submitted-time').textContent = formatTime(payload.elapsedSeconds);
  document.getElementById('submitted-correct').textContent = `${payload.correctCount}/${payload.totalQuestions}`;

  const reviewContainer = document.getElementById('answer-review-list');
  reviewContainer.innerHTML = '';

  questions.forEach((q, i) => {
    const answerId = payload.answers[q.id];
    const selectedOpt = q.options.find(o => o.id === answerId);
    const row = document.createElement('div');
    row.className = 'answer-review-row';
    row.innerHTML = `
      <span class="answer-review-q">Q${i + 1}</span>
      <span class="answer-review-text">${selectedOpt ? escapeHTML(selectedOpt.label) : '<em style="color:var(--text-dim)">Not answered</em>'}</span>
      <span class="answer-review-badge badge-locked">Locked</span>
    `;
    reviewContainer.appendChild(row);
  });

  // Submitted flag
  document.getElementById('submitted-forced-note').textContent =
    payload.forced ? 'Submitted automatically — time ran out.' : '';
}

// =============================================
//  INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  initLanding();
  // All button listeners are wired in renderCase / renderQuestions
});
