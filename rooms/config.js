// Shared config for the study rooms.
const SUPABASE_URL = 'https://aoljwsoczdyevvvtoxkb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ocDNtgEUb5k1GOSWUVnZ0Q_2daL54ZZ';

const ROOMS = [
  { id: 'iitjee', title: 'IIT-JEE', icon: '⚙️', accent: '#8b5cf6' },
  { id: 'neet', title: 'NEET', icon: '🧬', accent: '#22d3ee' },
  { id: 'board10', title: 'Boards · Class 10', icon: '📘', accent: '#4ade80' },
  { id: 'board12', title: 'Boards · Class 12', icon: '📗', accent: '#60a5fa' },
  { id: 'lakshya', title: 'Lakshya · Open Focus', icon: '🎯', accent: '#ffcf4d' },
];

function getRoomById(id) {
  return ROOMS.find((r) => r.id === id) || null;
}

// ── Device identity (no login — a UUID that lives in this browser) ──────
function getDeviceId() {
  let id = localStorage.getItem('pb_uid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pb_uid', id);
  }
  return id;
}

// A fresh id per tab/visit, used to group events from one sitting.
function getDeviceSessionId() {
  let id = sessionStorage.getItem('pb_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('pb_session_id', id);
  }
  return id;
}

function getStudentName() {
  return localStorage.getItem('pb_name') || '';
}

function setStudentName(name, type) {
  localStorage.setItem('pb_name', name.trim().slice(0, 24));
  if (type) localStorage.setItem('pb_name_type', type);
}

function getStudentNameType() {
  return localStorage.getItem('pb_name_type') || 'custom';
}

// ── Random name picker — anonymizes and cuts down on spammy custom names ──
const NAME_ADJECTIVES = [
  'Sharp', 'Calm', 'Swift', 'Bright', 'Bold', 'Silent', 'Focused', 'Steady',
  'Brave', 'Wise', 'Fierce', 'Cool', 'Sincere', 'Sturdy', 'Keen', 'Patient',
];
const NAME_NOUNS = [
  'Falcon', 'Tiger', 'Eagle', 'Wolf', 'Owl', 'Lion', 'Panther', 'Hawk',
  'Cheetah', 'Bear', 'Fox', 'Rhino', 'Otter', 'Stag', 'Lynx', 'Heron',
];

function randomName() {
  const a = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
  const n = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
  return `${a} ${n}`;
}

// Total minutes studied, tracked purely client-side (per browser, no login).
function getStudiedSeconds() {
  return Number(localStorage.getItem('pb_studied_seconds') || 0);
}

function addStudiedSeconds(seconds) {
  const total = getStudiedSeconds() + Math.max(0, Math.round(seconds));
  localStorage.setItem('pb_studied_seconds', String(total));
  localStorage.setItem('pb_studied_last', String(Date.now()));
  return total;
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

// ── Pomodoro cycle: 30 min focus + 3 min break, derived purely from
// wall-clock time so every device agrees without any server coordination. ──
const FOCUS_SECONDS = 30 * 60;
const BREAK_SECONDS = 3 * 60;
const CYCLE_SECONDS = FOCUS_SECONDS + BREAK_SECONDS;

function getCycleState(now = Date.now()) {
  const epochSeconds = Math.floor(now / 1000);
  const cycleKey = Math.floor(epochSeconds / CYCLE_SECONDS);
  const phase = epochSeconds % CYCLE_SECONDS;
  const isBreak = phase >= FOCUS_SECONDS;
  const remaining = isBreak ? CYCLE_SECONDS - phase : FOCUS_SECONDS - phase;
  return { cycleKey, isBreak, remaining };
}
