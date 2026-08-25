// Study room logic + the home↔room view transition. Lives on the same
// page as app.js (the music player) so the mini player and its bumper
// line never disappear — there is no navigation between "home" and
// "room" anymore, just a CSS view swap.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const room = ROOMS[0];
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const viewHome = document.getElementById('viewHome');
const viewRoom = document.getElementById('viewRoom');
const nameGate = document.getElementById('nameGate');

/* ── View transition ─────────────────────────────────────────────── */

function switchView(fromEl, toEl) {
  fromEl.classList.add('view--leaving');
  window.setTimeout(() => {
    fromEl.classList.add('is-hidden');
    fromEl.classList.remove('view--leaving');
    toEl.classList.remove('is-hidden');
    toEl.classList.add('view--entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toEl.classList.remove('view--entering'));
    });
  }, 420);
}

/* ── Name gate ────────────────────────────────────────────────────── */

const nameInput = document.getElementById('nameInput');
const randomNameBtn = document.getElementById('randomNameBtn');
const enterRoomBtn = document.getElementById('enterRoomBtn');
const nameGateClose = document.getElementById('nameGateClose');
const roomsCtaBtn = document.getElementById('roomsCtaBtn');

function openNameGate() {
  nameInput.value = getStudentName();
  nameGate.classList.remove('is-hidden');
  requestAnimationFrame(() => nameGate.classList.add('is-open'));
  nameInput.focus();
}

function closeNameGate() {
  nameGate.classList.remove('is-open');
  window.setTimeout(() => nameGate.classList.add('is-hidden'), 260);
}

let usedRandomName = false;

randomNameBtn.addEventListener('click', () => {
  nameInput.value = randomName();
  usedRandomName = true;
});

nameInput.addEventListener('input', () => {
  usedRandomName = false;
});

nameGateClose.addEventListener('click', closeNameGate);

enterRoomBtn.addEventListener('click', () => {
  const value = nameInput.value.trim();
  if (!value) {
    nameInput.focus();
    nameInput.placeholder = 'Enter a name first';
    return;
  }
  setStudentName(value, usedRandomName ? 'random' : 'custom');
  closeNameGate();
  window.setTimeout(joinRoom, 200);
});

roomsCtaBtn.addEventListener('click', () => {
  if (getStudentName()) {
    joinRoom();
  } else {
    openNameGate();
  }
});

/* ── Room state (created once, reused if the user leaves and rejoins) ── */

let joined = false;
let channel = null;
let deviceId = null;
let myKey = null;
let name = null;
let sessionId = null;
let cycleState = null;

const roomCount = document.getElementById('roomCount');
const presentList = document.getElementById('presentList');
const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatPanel = document.getElementById('chatPanel');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const pollCard = document.getElementById('pollCard');
const pollResults = document.getElementById('pollResults');
const phaseEl = document.getElementById('pomodoroPhase');
const pomodoroTimerEl = document.getElementById('pomodoroTimer');
const pomodoroLabelEl = document.getElementById('pomodoroLabel');
const pomodoroCard = document.getElementById('pomodoroCard');
const ringFill = document.getElementById('pomodoroRingFill');
const timerEl = document.getElementById('timer');
const leaveBtn = document.getElementById('leaveBtn');

const RING_CIRCUMFERENCE = 2 * Math.PI * 52;
ringFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);

let myVote = null;
let startedAt = 0;
let timerInterval = null;
let pomodoroInterval = null;
let studySaved = true;
let lastCycleKey = 0;
let lastIsBreak = false;

function fmtClock(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function chatLockedMsgClone(text) {
  const p = document.createElement('p');
  p.className = 'chat-empty';
  p.textContent = text;
  return p;
}

function renderMessages(rows) {
  chatLog.innerHTML = '';
  if (!rows.length) {
    chatLog.append(chatLockedMsgClone('No messages yet — say hi 👋'));
    return;
  }
  rows.forEach((row) => appendMessageEl(row));
  chatLog.scrollTop = chatLog.scrollHeight;
}

function appendMessageEl(row) {
  const empty = chatLog.querySelector('.chat-empty');
  if (empty) chatLog.innerHTML = '';
  const msg = document.createElement('div');
  msg.className = 'chat-msg' + (row.user_id === deviceId ? ' is-you' : '');
  const who = document.createElement('span');
  who.className = 'who';
  who.textContent = row.display_name + ': ';
  const body = document.createElement('span');
  body.className = 'body';
  body.textContent = row.body;
  msg.append(who, body);
  chatLog.append(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function loadChatForCycle(cycleKey) {
  const { data } = await supabase
    .from('pb_chat_messages')
    .select('user_id, display_name, body')
    .eq('room_id', room.id)
    .eq('cycle_key', cycleKey)
    .order('created_at', { ascending: true })
    .limit(200);
  renderMessages(data || []);
}

function setChatLocked(locked) {
  chatInput.disabled = locked;
  chatSendBtn.disabled = locked;
  chatInput.placeholder = locked ? 'Chat opens on break…' : 'Type a message…';
}

let chatHidden = localStorage.getItem('pb_chat_hidden') === '1';
function applyChatVisibility() {
  chatPanel.classList.toggle('is-hidden', chatHidden);
  chatToggleBtn.textContent = chatHidden ? 'Show chat' : 'Hide chat';
}
applyChatVisibility();
chatToggleBtn.addEventListener('click', () => {
  chatHidden = !chatHidden;
  localStorage.setItem('pb_chat_hidden', chatHidden ? '1' : '0');
  applyChatVisibility();
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = chatInput.value.trim();
  if (!body || !cycleState.isBreak) return;
  chatInput.value = '';
  await supabase.from('pb_chat_messages').insert({
    room_id: room.id,
    user_id: deviceId,
    display_name: name,
    body,
    cycle_key: cycleState.cycleKey,
  });
});

const POLL_META = {
  yes: { label: '💪 Yes', color: 'var(--green)' },
  partial: { label: '😐 Kinda', color: 'var(--accent)' },
  no: { label: '😴 No', color: '#f87171' },
};

function renderPollResults(rows) {
  const counts = { yes: 0, partial: 0, no: 0 };
  rows.forEach((r) => {
    if (counts[r.response] !== undefined) counts[r.response] += 1;
  });
  const total = rows.length;

  pollResults.innerHTML = '';
  if (!total) {
    const empty = document.createElement('div');
    empty.className = 'poll-empty';
    empty.textContent = 'No responses yet';
    pollResults.append(empty);
    return;
  }

  Object.entries(counts).forEach(([key, count]) => {
    const pct = Math.round((count / total) * 100);
    const row = document.createElement('div');
    row.className = 'poll-bar-row';

    const label = document.createElement('span');
    label.className = 'poll-bar-label';
    label.textContent = POLL_META[key].label;

    const track = document.createElement('span');
    track.className = 'poll-bar-track';
    const fill = document.createElement('span');
    fill.className = 'poll-bar-fill';
    fill.style.width = pct + '%';
    fill.style.background = POLL_META[key].color;
    track.append(fill);

    const value = document.createElement('span');
    value.className = 'poll-bar-value';
    value.textContent = `${count}`;

    row.append(label, track, value);
    pollResults.append(row);
  });

  const totalEl = document.createElement('div');
  totalEl.className = 'poll-total';
  totalEl.textContent = `${total} responded`;
  pollResults.append(totalEl);
}

function highlightMyVote() {
  document.querySelectorAll('.poll-btn').forEach((btn) => {
    btn.classList.toggle('is-selected', btn.dataset.response === myVote);
  });
}

async function loadPoll(cycleKey) {
  const { data } = await supabase
    .from('pb_poll_responses')
    .select('user_id, response')
    .eq('room_id', room.id)
    .eq('cycle_key', cycleKey)
    .limit(1000);
  renderPollResults(data || []);
  const mine = (data || []).find((r) => r.user_id === deviceId);
  myVote = mine ? mine.response : null;
  highlightMyVote();
}

document.querySelectorAll('.poll-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const response = btn.dataset.response;
    myVote = response;
    highlightMyVote();
    await supabase.from('pb_poll_responses').upsert(
      { room_id: room.id, user_id: deviceId, cycle_key: cycleState.cycleKey, response },
      { onConflict: 'room_id,user_id,cycle_key' },
    );
    supabase.from('pb_events').insert({
      user_id: deviceId,
      device_session_id: getDeviceSessionId(),
      event_name: 'poll_answered',
      room_id: room.id,
      properties: { response, cycle_key: cycleState.cycleKey },
    }).then(() => {}, () => {});
  });
});

async function enterBreak() {
  pollCard.classList.remove('is-hidden');
  pollResults.textContent = '';
  myVote = null;
  setChatLocked(false);
  await loadChatForCycle(cycleState.cycleKey);
  await loadPoll(cycleState.cycleKey);
}

function enterFocus(previousCycleKey) {
  pollCard.classList.add('is-hidden');
  setChatLocked(true);
  chatLog.innerHTML = '';
  chatLog.append(chatLockedMsgClone('🔒 Chat opens during the next break'));
  if (previousCycleKey !== undefined) {
    supabase
      .from('pb_chat_messages')
      .delete()
      .eq('room_id', room.id)
      .eq('cycle_key', previousCycleKey)
      .then(() => {}, () => {});
  }
}

function tickPomodoro() {
  cycleState = getCycleState();
  phaseEl.textContent = cycleState.isBreak ? 'BREAK' : 'FOCUS';
  pomodoroCard.classList.toggle('is-break', cycleState.isBreak);
  pomodoroTimerEl.textContent = fmtClock(cycleState.remaining);
  pomodoroLabelEl.textContent = cycleState.isBreak ? 'back to focus in' : 'until break';

  const phaseTotal = cycleState.isBreak ? BREAK_SECONDS : FOCUS_SECONDS;
  const elapsedInPhase = phaseTotal - cycleState.remaining;
  const fraction = elapsedInPhase / phaseTotal;
  ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));

  if (cycleState.isBreak !== lastIsBreak) {
    if (cycleState.isBreak) enterBreak();
    else enterFocus(lastCycleKey);
    lastIsBreak = cycleState.isBreak;
    lastCycleKey = cycleState.cycleKey;
  }
}

function tickTimer() {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  timerEl.textContent = fmtClock(elapsed);
}

function saveStudyTime() {
  if (studySaved) return;
  studySaved = true;
  const elapsedSeconds = (Date.now() - startedAt) / 1000;
  addStudiedSeconds(elapsedSeconds);
  supabase.from('pb_room_sessions').update({
    left_at: new Date().toISOString(),
    duration_seconds: Math.round(elapsedSeconds),
  }).eq('id', sessionId).then(() => {}, () => {});
  supabase.from('pb_events').insert({
    user_id: deviceId,
    device_session_id: getDeviceSessionId(),
    event_name: 'room_leave',
    room_id: room.id,
    properties: { duration_seconds: Math.round(elapsedSeconds) },
  }).then(() => {}, () => {});
}

window.addEventListener('pagehide', saveStudyTime);

function renderPresence() {
  const state = channel.presenceState();
  const people = Object.values(state)
    .flat()
    .sort((a, b) => a.joined_at - b.joined_at);

  roomCount.textContent = people.length === 1 ? '1 studying' : `${people.length} studying`;

  presentList.innerHTML = '';
  people.forEach((p) => {
    const chip = document.createElement('span');
    chip.className = 'present-chip' + (p.key === myKey ? ' is-you' : '');
    chip.textContent = p.key === myKey ? `${p.name} (you)` : p.name;
    presentList.append(chip);
  });
}

// One channel for the room's whole lifetime, created once at load time —
// Supabase dedupes channels by topic string, so a second `.channel()` call
// with the same topic silently hands back the already-subscribed instance
// and any further `.on()` calls on it throw. Presence syncs from the
// moment the page loads (driving the home-screen headcount) and the user
// simply `.track()`s/`.untrack()`s themselves on join/leave.
myKey = `peek-${Math.random().toString(36).slice(2, 8)}`;
channel = supabase.channel(`room:${room.id}`, {
  config: { presence: { key: myKey }, broadcast: { self: true } },
});

channel.on('presence', { event: 'sync' }, () => {
  renderPresence();
  if (!joined) {
    const state = channel.presenceState();
    const n = Object.values(state).flat().length;
    const badge = document.getElementById('studiedBadge');
    if (badge && n > 0) {
      badge.textContent = `Lakshya · Open Focus — ${n === 1 ? '1 person' : n + ' people'} studying now`;
    }
  }
});

channel.on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'pb_chat_messages', filter: `room_id=eq.${room.id}` },
  ({ new: row }) => {
    if (!cycleState || row.cycle_key !== cycleState.cycleKey) return;
    appendMessageEl(row);
  },
);

channel.on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'pb_poll_responses', filter: `room_id=eq.${room.id}` },
  (payload) => {
    const row = payload.new || payload.old;
    if (!row || !cycleState || row.cycle_key !== cycleState.cycleKey) return;
    loadPoll(cycleState.cycleKey);
  },
);

channel.subscribe();

tickPomodoro();
pomodoroInterval = window.setInterval(tickPomodoro, 1000);

function joinRoom() {
  switchView(viewHome, viewRoom);

  name = getStudentName();
  deviceId = getDeviceId();
  startedAt = Date.now();
  studySaved = false;

  supabase.from('pb_users').upsert(
    { id: deviceId, display_name: name, name_type: getStudentNameType(), last_seen_at: new Date().toISOString() },
    { onConflict: 'id' },
  ).then(() => {}, () => {});

  sessionId = crypto.randomUUID();
  supabase.from('pb_room_sessions').insert({
    id: sessionId,
    user_id: deviceId,
    room_id: room.id,
    joined_at: new Date().toISOString(),
  }).then(() => {}, () => {});

  supabase.from('pb_events').insert({
    user_id: deviceId,
    device_session_id: getDeviceSessionId(),
    event_name: 'room_join',
    room_id: room.id,
    properties: { name_type: getStudentNameType() },
  }).then(() => {}, () => {});

  channel.track({ key: myKey, name, joined_at: Date.now() });
  joined = true;

  if (cycleState.isBreak) enterBreak();

  tickTimer();
  timerInterval = window.setInterval(tickTimer, 1000);
}

leaveBtn.addEventListener('click', () => {
  saveStudyTime();
  window.clearInterval(timerInterval);
  channel.untrack();
  joined = false;
  switchView(viewRoom, viewHome);
});

function refreshStudiedBadge() {
  const seconds = getStudiedSeconds();
  const badge = document.getElementById('studiedBadge');
  if (!badge || seconds <= 0) return;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const amount = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m` : '<1m';
  badge.textContent = `You've studied ${amount} so far — keep going`;
}

refreshStudiedBadge();
