// Shared config for the study rooms.
const SUPABASE_URL = 'https://aoljwsoczdyevvvtoxkb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ocDNtgEUb5k1GOSWUVnZ0Q_2daL54ZZ';

// Two rooms on a day/night schedule (IST) instead of a single always-open
// room — keeps whoever's actually online at the same time of day grouped
// together. The site auto-joins whichever one is currently open; there's
// no picker.
const ROOMS = [
  { id: 'day', title: 'Study Room 1', hours: '10 AM – 10 PM', icon: '☀️', accent: '#ffcf4d' },
  { id: 'night', title: 'Study Room 2', hours: '10 PM – 10 AM', icon: '🌙', accent: '#8b5cf6' },
];

function getRoomById(id) {
  return ROOMS.find((r) => r.id === id) || null;
}

// Room 1 runs 10:00–22:00 IST, Room 2 the other half of the day — always
// India Standard Time regardless of the visitor's own timezone, since the
// schedule is written for Indian students.
function getActiveRoom(now = new Date()) {
  const istMs = now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 60 * 60000;
  const istHour = new Date(istMs).getHours();
  return istHour >= 10 && istHour < 22 ? ROOMS[0] : ROOMS[1];
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

// ── Ambient placeholder profiles ─────────────────────────────────────
// Purely a display-layer thing to make an empty room feel occupied — never
// written to Supabase, never counted in real analytics (pb_events /
// pb_room_sessions stay untouched). The set rotates every hour (same set
// for everyone that hour, seeded off the clock) and is shuffled fresh on
// each render so the on-screen order isn't identical every time.
const BOT_NAME_POOL = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Gupta', 'Ananya Iyer', 'Vikram Singh',
  'Sneha Reddy', 'Karan Mehta', 'Isha Verma', 'Arjun Nair', 'Pooja Joshi',
  'Aditya Rao', 'Neha Kapoor', 'Rahul Bose', 'Divya Menon', 'Manish Yadav',
  'Kavya Pillai', 'Siddharth Jain', 'Riya Chauhan', 'Aman Tiwari', 'Simran Kaur',
  'Yash Agarwal', 'Meera Pillai', 'Nikhil Desai', 'Tanvi Shah', 'Harsh Malhotra',
  'Anjali Rana', 'Varun Chopra', 'Sanya Bhatt', 'Kunal Saxena', 'Ritika Dutta',
  'Abhishek Pandey', 'Shreya Kulkarni', 'Naman Khanna', 'Ishita Bansal', 'Devansh Trivedi',
];

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getAmbientProfiles(count = 11) {
  const hourSeed = Math.floor(Date.now() / 3600000);
  const rand = mulberry32(hourSeed);
  const pool = [...BOT_NAME_POOL];
  // Fisher–Yates with the seeded generator — same result for everyone
  // within the same clock hour.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, count);
  // Shuffle again with the real RNG so render order isn't identical on
  // every visit even within the same hour.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
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
