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

// Two YouTube players are kept alive: `players[activeSlot]` is the one
// that's actually audible, and the other one sits silently cued to
// whatever track is coming up next. Hitting "next" then just swaps which
// slot is active instead of loading a fresh video and waiting for it to
// buffer — that wait was most of the perceived "music takes a while"
// complaint. `yt` stays as an alias for the active player so the rest of
// this file (seek, toggle, samplePlayer, …) doesn't need to change.
const players = [null, null];
const playerCuedPos = [null, null];
let activeSlot = 0;
let yt = null;
function syncActivePlayerAlias() {
  yt = players[activeSlot];
}

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

// Whatever a visitor hears first should be consistent — the rain ambience
// track always leads, regardless of shuffle. Only applied once at initial
// load, not on every shuffle toggle, so re-shuffling mid-listen doesn't
// unexpectedly yank someone back to it.
const RAIN_TRACK_ID = '13EL6Mgeocc';
function leadWithRain(order) {
  const rainIdx = state.tracks.findIndex((t) => t.id === RAIN_TRACK_ID);
  if (rainIdx === -1) return order;
  const pos = order.indexOf(rainIdx);
  if (pos > 0) {
    order.splice(pos, 1);
    order.unshift(rainIdx);
  }
  return order;
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

    // Rain/Lofi are focus ambience rather than songs — flagged in
    // tracks.json so the styling follows the track wherever shuffle
    // puts it, instead of being pinned to a list position.
    if (t.kind === 'ambient') li.classList.add('is-ambient');

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

function track(name, params) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
}

function renderPlaying(on) {
  const wasPlaying = state.playing;
  state.playing = on;
  el.player.classList.toggle('is-playing', on);
  el.play.setAttribute('aria-label', on ? 'Pause' : 'Play');
  if (on && !wasPlaying) {
    const t = currentTrack();
    track('play_song', { song_title: t?.title, song_artist: t?.artist });
  }
}

function nextPos(fromPos = state.pos) {
  const n = state.order.length;
  return ((fromPos + 1) % n + n) % n;
}

// Cue the upcoming track into whichever player isn't currently live, so
// it's already buffered by the time "next" is pressed.
function preloadUpcoming(attempt = 0) {
  const idle = activeSlot === 0 ? 1 : 0;
  const p = players[idle];
  if (!p || typeof p.cueVideoById !== 'function') return;
  const targetPos = nextPos();
  if (playerCuedPos[idle] === targetPos && attempt === 0) return;
  const track = state.tracks[state.order[targetPos]];
  if (!track) return;
  p.cueVideoById({ videoId: track.id, suggestedQuality: 'tiny' });
  playerCuedPos[idle] = targetPos;

  // Same dropped-cue race as the initial track (see cueInitialTrack) can
  // hit a freshly-ready preload player too — verify and retry.
  setTimeout(() => {
    if (playerCuedPos[idle] !== targetPos) return; // superseded already
    const gotDuration = (p.getDuration?.() || 0) > 0;
    const st = p.getPlayerState?.();
    if (!gotDuration && st !== 5 && attempt < 4) {
      preloadUpcoming(attempt + 1);
    }
  }, 200 + attempt * 250);
}

function go(newPos) {
  const n = state.order.length;
  const targetPos = ((newPos % n) + n) % n;
  const wasPlaying = state.playing;
  const idle = activeSlot === 0 ? 1 : 0;
  const canSwapToPreloaded = targetPos === nextPos(state.pos) && playerCuedPos[idle] === targetPos && players[idle];

  state.pos = targetPos;
  renderTrack();
  rotateBackground();
  track('track_change', { song_title: currentTrack()?.title });
  state.started = true;

  if (canSwapToPreloaded) {
    activeSlot = idle;
    syncActivePlayerAlias();
    if (wasPlaying) yt.playVideo();
    preloadUpcoming();
  } else if (players[activeSlot]) {
    // Hinting the quality on the load call itself (rather than waiting for
    // preferAudio() after playback starts) skips straight to the smallest
    // rendition instead of buffering a higher-res stream first.
    players[activeSlot].loadVideoById({ videoId: currentTrack().id, suggestedQuality: 'tiny' });
    playerCuedPos[activeSlot] = targetPos;
    preloadUpcoming();
  }
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
  // The "next" track just changed, so whatever the idle player had cued
  // is no longer necessarily correct.
  playerCuedPos[activeSlot === 0 ? 1 : 0] = null;
  preloadUpcoming();
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
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  samplePlayer();
});

/* ── Bumper lines ────────────────────────────────────────────
   Motivational study couplets, in the spirit of a truck's back panel. */

const BUMPER_LINES = [
  'Padh le, warna dost bhi mud ke nahi dekhenge',
  'Padh le, warna achi wife nahi milegi',
  'Padh le, warna rishta aaya toh puchega bhi nahi koi',
  'Padh le, warna college ke baad achi job nahi lagegi',
  'Padh le, warna ghoomne London nahi, Lonavala jaana padega',
  'Padh le, warna Audi nahi, Alto mein ghoomna padega',
  'Padh le, warna 4 BHK nahi, PG mein rehna padega',
  'Padh le, warna IAS nahi, peon bankar reh jaayega',
  'Padh le, warna degree bas bekar college ki hogi',
  'Padh le, warna rishtedaar shaadi mein taane maarenge',
  "Padh le, warna 'beta kya karta hai' sunke sharminda hoga",
  'Padh le, warna crush bhi bolegi — just friends',
  'Padh le, warna naukri dhundhna hi naukri ban jaayegi',
  'Padh le, warna family function mein sabse peeche baithna padega',
  "Padh le, warna LinkedIn pe sirf 'Open to Work' likhega",
  'Padh le, warna papa ka sar sharam se jhuk jaayega',
  'Padh le, warna reunion mein sabse chhota package tera hoga',
  'Padh le, warna baaki sab aage nikal jaayenge',
  'Abhi mehnat kar le, baad mein sirf araam karna padega',
  'Jo aaj so raha hai, kal pachtaayega',
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

// The mini player is fixed at the bottom on every view, and #viewRoom
// reserves --dock-height of padding so its own content can't end up
// hidden behind it. The dock's real height varies (bumper text can wrap
// to one or two lines, screen width changes it further), so measure it
// live instead of trusting a guessed constant.
const dockEl = document.getElementById('dock');
if (dockEl && 'ResizeObserver' in window) {
  const ro = new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty('--dock-height', `${entry.contentRect.height}px`);
  });
  ro.observe(dockEl);
}

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

// The API script and tracks.json used to load one after the other, which
// meant the API sat idle while the playlist fetch finished. Kick both off
// immediately and only build the player once both are in.
let ytApiReady = false;
let tracksReady = false;

function cueInitialTrack(attempt = 0) {
  const p = players[0];
  if (!p || typeof p.cueVideoById !== 'function') return;
  p.cueVideoById({ videoId: currentTrack().id, suggestedQuality: 'tiny' });
  playerCuedPos[0] = state.pos;

  // Verify it actually took — a dropped cue call leaves the player at
  // UNSTARTED (-1) with no duration, so retry a couple of times with a
  // growing delay before giving up.
  setTimeout(() => {
    const st = p.getPlayerState?.();
    const gotDuration = (p.getDuration?.() || 0) > 0;
    if (!gotDuration && st !== 5 /* CUED */ && attempt < 4) {
      cueInitialTrack(attempt + 1);
    }
  }, 200 + attempt * 250);
}

function createYtPlayer(slot, elementId) {
  return new YT.Player(elementId, {
    height: '1',
    width: '1',
    playerVars: {
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: () => {
        if (slot === 0) {
          state.ready = true;
          el.play.disabled = false;
          // Cue (don't load) at the lowest rendition — nothing has to
          // re-buffer at a higher quality before the first play.
          //
          // Calling cueVideoById synchronously inside onReady is a known
          // YouTube IFrame API race: the player object answers to
          // getCurrentTime()/getPlayerState() at this point, but isn't
          // always actually ready to accept a cue call yet, and the call
          // is silently dropped — nothing gets loaded and playVideo()
          // later does nothing. loadVideoById called any time after
          // onReady works reliably; a short delay avoids the race without
          // needing that autoplay side effect for the very first track.
          cueInitialTrack();
        } else {
          preloadUpcoming();
        }
      },
      onStateChange: (e) => {
        if (slot !== activeSlot) return;
        const S = YT.PlayerState;
        if (e.data === S.PLAYING) {
          renderPlaying(true);
          preferAudio();
        } else if (e.data === S.PAUSED || e.data === S.BUFFERING) {
          renderPlaying(e.data === S.BUFFERING && state.playing);
        } else if (e.data === S.ENDED) go(state.pos + 1);
      },
      onError: () => {
        if (slot === activeSlot && state.started) go(state.pos + 1);
      },
    },
  });
}

function tryBootPlayer() {
  if (!ytApiReady || !tracksReady || players[0]) return;

  players[0] = createYtPlayer(0, 'yt-player');
  syncActivePlayerAlias();

  // The second (preload) player is created once we're idle again, so it
  // never competes with the primary player or the initial page paint for
  // bandwidth — it just needs to be ready before "next" is likely pressed.
  const bootSecondPlayer = () => {
    players[1] = createYtPlayer(1, 'yt-player-2');
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(bootSecondPlayer, { timeout: 4000 });
  } else {
    setTimeout(bootSecondPlayer, 1500);
  }

  setInterval(samplePlayer, 250);
  requestAnimationFrame(paintProgress);
}

window.onYouTubeIframeAPIReady = () => {
  ytApiReady = true;
  tryBootPlayer();
};

// Yield to the browser's idle slice rather than fighting the initial
// paint (CSS, fonts, tracks.json) for bandwidth/main-thread time on
// slower mobile connections. `timeout` caps how long we'll wait so it
// still starts promptly even under sustained load.
const loadYtApi = () => {
  const ytScript = document.createElement('script');
  ytScript.src = 'https://www.youtube.com/iframe_api';
  document.head.append(ytScript);
};
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadYtApi, { timeout: 300 });
} else {
  setTimeout(loadYtApi, 50);
}

(async function init() {
  try {
    // no-store rather than a versioned URL: the playlist can change at
    // any time (as it just did), and it's small enough that always
    // fetching fresh isn't worth trading for cache-bust discipline.
    const res = await fetch('/tracks.json', { cache: 'no-store' });
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

  state.order = leadWithRain(buildOrder());
  renderList();
  renderTrack();
  rotateBackground(0);

  tracksReady = true;
  tryBootPlayer();
})();
