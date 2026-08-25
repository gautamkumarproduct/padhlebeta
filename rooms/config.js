// Shared config for the study rooms. Presence + chat run on Supabase
// Realtime channels only — no database table, so this "publishable" key
// (safe to expose client-side by design) is all that's needed.
const SUPABASE_URL = 'https://aoljwsoczdyevvvtoxkb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ocDNtgEUb5k1GOSWUVnZ0Q_2daL54ZZ';

const ROOMS = [
  { id: 'jee-11', group: 'IIT-JEE', label: 'Class 11', title: 'IIT-JEE · Class 11' },
  { id: 'jee-12', group: 'IIT-JEE', label: 'Class 12', title: 'IIT-JEE · Class 12' },
  { id: 'jee-drop', group: 'IIT-JEE', label: 'Dropper', title: 'IIT-JEE · Dropper' },
  { id: 'neet-11', group: 'NEET', label: 'Class 11', title: 'NEET · Class 11' },
  { id: 'neet-12', group: 'NEET', label: 'Class 12', title: 'NEET · Class 12' },
  { id: 'neet-drop', group: 'NEET', label: 'Dropper', title: 'NEET · Dropper' },
  { id: 'board-10', group: 'Boards', label: 'Class 10', title: 'Boards · Class 10' },
  { id: 'board-12', group: 'Boards', label: 'Class 12', title: 'Boards · Class 12' },
];

function getRoomById(id) {
  return ROOMS.find((r) => r.id === id) || null;
}

function getStudentName() {
  return localStorage.getItem('pb_name') || '';
}

function setStudentName(name) {
  localStorage.setItem('pb_name', name.trim().slice(0, 24));
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
