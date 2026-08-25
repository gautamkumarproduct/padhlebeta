/* PadhleBeta — sound comes from a 1×1px YouTube iframe parked off-screen;
   everything you can see is our own chrome. Adapted from the same pattern
   used by hornokplease.xyz. */

const $ = (id) => document.getElementById(id);

const el = {
  player: $('player'),
  cover: $('cover'),
  title: $('title'),
  artist: $('artist'),
  seek: $('seek'),
  seekFill: $('seekFill'),
  seekKnob: $('seekKnob'),
  tCur: $('tCur'),
  tDur: $('tDur'),
  play: $('play'),
  prev: $('prev'),
  next: $('next'),
  shuffle: $('shuffle'),
  listBtn: $('listBtn'),
  list: $('list'),
  listItems: $('listItems'),
  clock: $('clock'),
  listeners: $('listeners'),
  bumperText: $('bumperText'),
  bumperNext: $('bumperNext'),
  horn: $('horn'),
  logo: document.querySelector('.logo'),
};

const state = {
  tracks: [],
  order: [],
  pos: 0,
  shuffle: true,
  ready: false,
  playing: false,
  started: false,
  scrubbing: false,
};

let yt = null;

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildOrder() {
  const seq = Array.from({ length: state.tracks.length }, (_, i) => i);
  return state.shuffle ? shuffleArr(seq) : seq;
}

const currentTrack = () => state.tracks[state.order[state.pos]];

let swapTimer = null;

function renderTrack() {
  const t = currentTrack();
  if (!t) return;

  if (el.title.dataset.rendered) {
    el.player.classList.add('is-swapping');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => el.player.classList.remove('is-swapping'), 40);
  }
  el.title.dataset.rendered = '1';

  el.title.textContent = t.title;
  el.artist.textContent = t.artist || '';
  el.cover.src = t.cover || '';
  el.cover.alt = `${t.title} artwork`;
  if (state.started) document.title = `${t.title} — PadhleBeta`;

  [...el.listItems.children].forEach((li, i) =>
    li.classList.toggle('is-current', i === state.pos),
  );
  const active = el.listItems.children[state.pos];
  if (active && el.list.classList.contains('is-open')) {
    active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderList() {
  el.listItems.innerHTML = '';
  state.order.forEach((trackIdx, i) => {
    const t = state.tracks[trackIdx];
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';

    const title = document.createElement('span');
    title.className = 't-title';
    title.textContent = t.title;

    const artist = document.createElement('span');
    artist.className = 't-artist';
    artist.textContent = t.artist || '';

    btn.append(title, artist);
    btn.addEventListener('click', () => go(i));
    li.append(btn);
    el.listItems.append(li);
  });
}

const bgLayers = [...document.querySelectorAll('.bg__layer')];
let bgIndex = 0;

function rotateBackground(to) {
  if (bgLayers.length < 2) return;
  const n = bgLayers.length;
  bgIndex = (((to ?? bgIndex + 1) % n) + n) % n;
  bgLayers.forEach((layer, i) => layer.classList.toggle('is-active', i === bgIndex));
}

function renderPlaying(on) {
  state.playing = on;
  el.player.classList.toggle('is-playing', on);
  el.play.setAttribute('aria-label', on ? 'Pause' : 'Play');
}

function go(newPos) {
  const n = state.order.length;
  state.pos = ((newPos % n) + n) % n;
  renderTrack();
  rotateBackground();
  if (!yt) return;
  state.started = true;
  yt.loadVideoById(currentTrack().id);
}

function toggle() {
  if (!yt || !state.ready) return;
  if (state.playing) {
    yt.pauseVideo();
  } else {
    state.started = true;
    yt.playVideo();
  }
}

const poll = { at: 0, time: 0, duration: 0 };
let lastSecond = -1;
let lastDuration = -1;

function samplePlayer() {
  if (!yt || typeof yt.getCurrentTime !== 'function') return;
  poll.time = yt.getCurrentTime() || 0;
  poll.duration = yt.getDuration() || 0;
  poll.at = performance.now();
}

function paintProgress() {
  requestAnimationFrame(paintProgress);
  if (!yt || state.scrubbing || !poll.duration) return;

  const drift = state.playing ? (performance.now() - poll.at) / 1000 : 0;
  const cur = Math.min(poll.duration, poll.time + drift);
  const frac = Math.min(1, Math.max(0, cur / poll.duration));

  el.seekFill.style.transform = `scaleX(${frac})`;
  el.seekKnob.style.transform = `translate(-50%, -50%) translateX(${
    frac * el.seek.clientWidth
  }px)`;

  const second = Math.floor(cur);
  if (second !== lastSecond) {
    lastSecond = second;
    el.tCur.textContent = fmt(cur);
    el.seek.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
  }
  if (poll.duration !== lastDuration) {
    lastDuration = poll.duration;
    el.tDur.textContent = fmt(poll.duration);
  }
}

function fractionFromEvent(e) {
  const r = el.seek.getBoundingClientRect();
  return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
}

function previewSeek(frac) {
  el.seekFill.style.transform = `scaleX(${frac})`;
  el.seekKnob.style.transform = `translate(-50%, -50%) translateX(${
    frac * el.seek.clientWidth
  }px)`;
  if (yt && typeof yt.getDuration === 'function') {
    el.tCur.textContent = fmt((yt.getDuration() || 0) * frac);
  }
}

el.seek.addEventListener('pointerdown', (e) => {
  if (!yt) return;
  state.scrubbing = true;
  el.seek.setPointerCapture(e.pointerId);
  previewSeek(fractionFromEvent(e));
});

el.seek.addEventListener('pointermove', (e) => {
  if (state.scrubbing) previewSeek(fractionFromEvent(e));
});

el.seek.addEventListener('pointerup', (e) => {
  if (!state.scrubbing) return;
  state.scrubbing = false;
  el.seek.releasePointerCapture(e.pointerId);
  const dur = yt?.getDuration?.() || 0;
  if (dur) yt.seekTo(dur * fractionFromEvent(e), true);
  samplePlayer();
});

el.seek.addEventListener('keydown', (e) => {
  const step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
  if (!step || !yt) return;
  e.preventDefault();
  yt.seekTo(Math.max(0, (yt.getCurrentTime() || 0) + step), true);
});

el.play.addEventListener('click', toggle);
el.prev.addEventListener('click', () => {
  if (yt && (yt.getCurrentTime() || 0) > 3) yt.seekTo(0, true);
  else go(state.pos - 1);
});
el.next.addEventListener('click', () => go(state.pos + 1));

el.shuffle.addEventListener('click', () => {
  const keep = currentTrack();
  state.shuffle = !state.shuffle;
  el.shuffle.classList.toggle('is-on', state.shuffle);
  el.shuffle.setAttribute('aria-pressed', String(state.shuffle));

  state.order = buildOrder();
  state.pos = Math.max(0, state.order.indexOf(state.tracks.indexOf(keep)));
  renderList();
  renderTrack();
});

el.listBtn.addEventListener('click', () => {
  const open = !el.list.classList.contains('is-open');
  el.list.classList.toggle('is-open', open);
  el.listBtn.classList.toggle('is-on', open);
  el.listBtn.setAttribute('aria-expanded', String(open));
  if (open) {
    el.listItems.children[state.pos]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, [contenteditable]')) return;
  if (e.key === ' ' || e.key === 'k') {
    e.preventDefault();
    toggle();
  } else if (e.key === 'n' || e.key === 'ArrowRight') {
    if (e.target !== el.seek) go(state.pos + 1);
  } else if (e.key === 'p' || e.key === 'ArrowLeft') {
    if (e.target !== el.seek) go(state.pos - 1);
  } else if (e.key === 'h') {
    ring();
  }
});

/* ── Study bell ──────────────────────────────────────────────
   A short synthesised chime — three detuned sine partials through
   a quick decay envelope, the way a school bell rings and fades. */

let audioCtx = null;

try {
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
} catch {
  /* not supported */
}

function ensureAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

['pointerdown', 'keydown'].forEach((evt) =>
  document.addEventListener(evt, ensureAudio, { once: true, capture: true }),
);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  samplePlayer();
});

let duckTimer = null;
let duckedFrom = null;

function duckMusic(ms) {
  if (!yt || typeof yt.getVolume !== 'function') return;
  if (duckedFrom === null) duckedFrom = yt.getVolume();
  yt.setVolume(Math.round(duckedFrom * 0.4));

  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    if (duckedFrom !== null) yt.setVolume(duckedFrom);
    duckedFrom = null;
  }, ms + 120);
}

function ring() {
  const ctx = ensureAudio();
  if (!ctx) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
  master.connect(ctx.destination);

  [880, 1320, 1760].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 1 : 0.4;
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 1.4);
  });

  duckMusic(1400);

  [
    [el.horn, 'is-blaring', 450],
    [el.logo, 'is-shaking', 720],
  ].forEach(([node, cls, ms]) => {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), ms);
  });
}

el.horn.addEventListener('click', ring);

/* ── Bumper lines ────────────────────────────────────────────
   Motivational study couplets, in the spirit of a truck's back panel. */

const BUMPER_LINES = [
  'पढ़ोगे लिखोगे बनोगे नवाब',
  'मेहनत का फल मीठा होता है',
  'अभी नहीं तो कभी नहीं',
  'आज का काम कल पर मत टाल',
  'सपने वो नहीं जो सोते हुए देखो',
  'रुक मत, थक मत, बस लगा रह',
  'किताब खोलो, फोन बंद करो',
  'मंज़िल दूर है तो क्या, हिम्मत तो पास है',
  'जो जितना पढ़ेगा, वो उतना बढ़ेगा',
  'खुद पर भरोसा रखो',
  'आज की मेहनत, कल की सफलता',
  'हार मत मानो, कोशिश करते रहो',
  'सफलता का कोई शॉर्टकट नहीं',
  'तू खुद ही अपनी मंज़िल है',
  'डर के आगे जीत है',
  'बस एक और चैप्टर, एक और रिवीज़न',
  'तू कर सकता है, बस लगा रह',
  'रात को पढ़ो, सुबह याद रखो',
  'गिरो, फिर उठो, फिर पढ़ो',
  'सफर मुश्किल है, पर नामुमकिन नहीं',
  'जो आज पढ़ेगा, वो कल राज करेगा',
  'फोकस रख, फोन साइड रख',
  'खुद से किया वादा निभाओ',
  'हर दिन थोड़ा बेहतर बनो',
  'सफलता चुपके से नहीं आती, कमाई जाती है',
];

let bumperOrder = [];
let bumperPos = 0;
let bumperTimer = null;

function shuffleLines() {
  bumperOrder = shuffleArr(BUMPER_LINES.map((_, i) => i));
}

function nextBumper() {
  bumperPos += 1;
  if (bumperPos >= bumperOrder.length) {
    const last = bumperOrder[bumperOrder.length - 1];
    shuffleLines();
    if (bumperOrder[0] === last && bumperOrder.length > 1) {
      [bumperOrder[0], bumperOrder[1]] = [bumperOrder[1], bumperOrder[0]];
    }
    bumperPos = 0;
  }

  el.bumperText.classList.add('is-swapping');
  setTimeout(() => {
    el.bumperText.textContent = BUMPER_LINES[bumperOrder[bumperPos]];
    el.bumperText.classList.remove('is-swapping');
  }, 250);

  clearInterval(bumperTimer);
  bumperTimer = setInterval(nextBumper, 12000);
}

shuffleLines();
el.bumperText.textContent = BUMPER_LINES[bumperOrder[0]];
bumperTimer = setInterval(nextBumper, 12000);
el.bumperNext.addEventListener('click', nextBumper);

/* ── Ambient chrome: clock + fellow students ────────────────── */

function tickClock() {
  el.clock.textContent = new Date()
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
}
tickClock();
setInterval(tickClock, 15000);

(function driftListeners() {
  const MIN = 400;
  const MAX = 900;
  let count = MIN + Math.floor(Math.random() * (MAX - MIN));

  el.listeners.textContent = String(count);

  const step = () => {
    const midpoint = (MIN + MAX) / 2;
    const up = Math.random() < (count < midpoint ? 0.58 : 0.42);
    count = Math.max(MIN, Math.min(MAX, count + (up ? 1 : -1) * (1 + Math.floor(Math.random() * 4))));
    el.listeners.textContent = String(count);
    setTimeout(step, 2500 + Math.random() * 3500);
  };

  setTimeout(step, 2000);
})();

/* ── YouTube iframe boot ─────────────────────────────────────── */

function preferAudio() {
  try {
    yt?.setPlaybackQuality?.('tiny');
  } catch {
    /* the API ignores the hint on some videos */
  }
}

window.onYouTubeIframeAPIReady = () => {
  yt = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    videoId: currentTrack().id,
    playerVars: {
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: () => {
        state.ready = true;
        el.play.disabled = false;
        preferAudio();
      },
      onStateChange: (e) => {
        const S = YT.PlayerState;
        if (e.data === S.PLAYING) {
          renderPlaying(true);
          preferAudio();
        } else if (e.data === S.PAUSED || e.data === S.BUFFERING) {
          renderPlaying(e.data === S.BUFFERING && state.playing);
        } else if (e.data === S.ENDED) go(state.pos + 1);
      },
      onError: () => {
        if (state.started) go(state.pos + 1);
      },
    },
  });

  setInterval(samplePlayer, 250);
  requestAnimationFrame(paintProgress);
};

(async function init() {
  try {
    const res = await fetch('/tracks.json');
    state.tracks = await res.json();
  } catch {
    el.title.textContent = 'Could not load the playlist';
    el.artist.textContent = 'Check tracks.json';
    return;
  }

  if (!state.tracks.length) {
    el.title.textContent = 'No tracks yet';
    el.artist.textContent = 'tracks.json is empty';
    return;
  }

  state.order = buildOrder();
  renderList();
  renderTrack();
  rotateBackground(0);

  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.append(s);
})();
