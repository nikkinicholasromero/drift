/* ================= SOUND SOURCES =================
   Streaming previews from freesound.org (played from their CDN,
   to be downloaded and bundled later). Format:
   { fs: [folder, "id_userid"] } -> https://cdn.freesound.org/previews/folder/id_userid-lq.mp3
   null -> no source found yet
   Every layer is a real recording. Nothing is synthesised, because
   Web Audio cannot play while an iPhone is locked - see the engine note.
   Credits (license marked per entry):
     34065  "AMBIENT - Rain - Light" by Arctura                       (CC-BY)
     339324 "Stream, Water, C" by InspectorJ                          (CC-BY)
     365921 "Waterfall, Small, B" by InspectorJ                       (CC-BY)
     339326 "Bird Whistling, A" by InspectorJ                         (CC-BY)
     352514 "Ambience, Night Wildlife, A" by InspectorJ               (CC-BY)
     405561 "Wind, Realistic, A" by InspectorJ                        (CC-BY)
     353194 "Wind Chimes, A" by InspectorJ                            (CC-BY)
     414767 "Crackling Fire" by samarobryn                            (CC0)
     705049 "Small city ambience with traffic" by felix.blume         (CC0)
     341208 "train interior ambience 1a" by Yoyodaman234              (CC0)
     251233 "In the Tent - Rain" by pulswelle                         (CC0)
     177958 "Water Dripping in Cave" by Sclolex                       (CC0)
     523389 "Forest, trees rustling in the wind" by arpeggio1980      (CC0)
     278868 "Nature sounds frog 1" by Sandermotions                   (CC0)
     151241 "OwlsForestApril82012" by kvgarlic                        (CC0)
     417770 "Outdoor Ambience - Cicadas" by mixxythepixxy             (CC-BY)
     158780 "wolves" by Paresh                                        (CC0)
     505999 "Howling winter storm ambient sounds" by DBlover          (CC0)
     568975 "Distant sirens, urban, night" by TRP                     (CC0)
     543913 "bar chatter" by SoundsExciting                           (CC0)
     561815 "General Harbour Ambience" by Kinoton                     (CC0)
     178648 "ChurchBells" by Zabuhailo                                (CC0)
     780515 "Kitchen room tone with fridge" by pryanic                (CC0)
     496275 "6_Cat, purr" by 16GPanskaZlochova_Eliska                 (CC0)
     151279 "Washing Machine Spin Cycle" by timgormly                 (CC0)
     380135 "Computer Keyboard - typing sounds" by yottasounds        (CC0)
     242008 "Clock Ticking" by photogtony                             (CC0)
================================================== */
const FS = (folder, file) => "https://cdn.freesound.org/previews/" + folder + "/" + file + "-lq.mp3";

const CATALOG = [
  { category: "Water", sounds: [
    { name: "Rain",         variants: [ { label: "", src: { fs: FS(34,  "34065_28216") } } ] },
    { name: "Rain on tent", variants: [ { label: "", src: { fs: FS(251, "251233_2367966") } } ] },
    { name: "Stream",       variants: [ { label: "", src: { fs: FS(339, "339324_5121236") } } ] },
    { name: "Waterfall",    variants: [ { label: "", src: { fs: FS(365, "365921_5121236") } } ] },
    { name: "Cave drips",   variants: [ { label: "", src: { fs: FS(177, "177958_985466") } } ] }
  ]},
  { category: "Nature", sounds: [
    { name: "Birds",    variants: [ { label: "", src: { fs: FS(339, "339326_5121236") } } ] },
    { name: "Forest",   variants: [ { label: "", src: { fs: FS(523, "523389_2010973") } } ] },
    { name: "Crickets", variants: [ { label: "", src: { fs: FS(352, "352514_5121236") } } ] },
    { name: "Cicadas",  variants: [ { label: "", src: { fs: FS(417, "417770_6271616") } } ] },
    { name: "Frogs",    variants: [ { label: "", src: { fs: FS(278, "278868_1402315") } } ] },
    { name: "Owls",     variants: [ { label: "", src: { fs: FS(151, "151241_1050391") } } ] },
    { name: "Wolves",   variants: [ { label: "", src: { fs: FS(158, "158780_229952") } } ] },
    { name: "Wind",     variants: [ { label: "", src: { fs: FS(405, "405561_5121236") } } ] },
    { name: "Blizzard", variants: [ { label: "", src: { fs: FS(505, "505999_7846219") } } ] },
    { name: "Campfire", variants: [ { label: "", src: { fs: FS(414, "414767_4955305") } } ] },
    { name: "Chimes",   variants: [ { label: "", src: { fs: FS(353, "353194_5121236") } } ] }
  ]},
  { category: "City", sounds: [
    { name: "Traffic",      variants: [ { label: "", src: { fs: FS(705, "705049_1661766") } } ] },
    { name: "Sirens",       variants: [ { label: "", src: { fs: FS(568, "568975_97550") } } ] },
    { name: "Crowd",        variants: [ { label: "", src: { fs: FS(543, "543913_3279490") } } ] },
    { name: "Train",        variants: [ { label: "", src: { fs: FS(341, "341208_2792951") } } ] },
    { name: "Harbour",      variants: [ { label: "", src: { fs: FS(561, "561815_2247456") } } ] },
    { name: "Church bells", variants: [ { label: "", src: { fs: FS(178, "178648_2580450") } } ] }
  ]},
  { category: "Home", sounds: [
    { name: "Refrigerator",    variants: [ { label: "", src: { fs: FS(780, "780515_11318300") } } ] },
    { name: "Washing machine", variants: [ { label: "", src: { fs: FS(151, "151279_2578041") } } ] },
    { name: "Fireplace",       variants: [ { label: "", src: { fs: FS(414, "414767_4955305") } } ] },
    { name: "Purring cat",     variants: [ { label: "", src: { fs: FS(496, "496275_10774386") } } ] },
    { name: "Keyboard",        variants: [ { label: "", src: { fs: FS(380, "380135_3249786") } } ] },
    { name: "Clock",           variants: [ { label: "", src: { fs: FS(242, "242008_4363393") } } ] }
  ]}
];

/* ================= AUDIO ENGINE =================
   Deliberately NO Web Audio. Every layer is a plain looped <audio>
   element, because iOS stops any AudioContext output the moment the
   screen locks - it treats Web Audio as "Ambient" audio and suspends
   it for backgrounded pages, while media elements keep playing.
   That rules out panning (an <audio> element has volume but no pan)
   and locally generated noise, which is why neither exists here.
   update(ch) reconciles audio with the channel state. */
const AudioEngine = (() => {
  const vol = lvl => Math.pow(lvl / 100, 2); // perceptual curve

  /* No crossOrigin: it was only ever needed to satisfy CORS for
     createMediaElementSource. Without Web Audio routing these are
     ordinary media requests, which also removes the CORS failure
     that intermittently produced a "stream blocked" badge. */
  function makeStream(ch, v) {
    const a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.src = v.src.fs;
    // surface stream failures in the UI instead of failing silently
    a.addEventListener("error", () => {
      if (ch.onStreamError) ch.onStreamError();
    });
    return { audio: a };
  }

  return {
    update(ch) {
      const v = ch.variants[ch.variant];
      const active = !ch.disabled && ch.level > 0 && !masterPaused;

      // stop whatever belongs to a different variant
      if (ch.playing && ch.playing.key !== ch.variant) this.stop(ch);
      if (!v.src) return;

      if (!ch.playing) {
        if (!active) return;
        ch.playing = makeStream(ch, v);
        ch.playing.key = ch.variant;
      }

      const a = ch.playing.audio;
      a.volume = active ? vol(Math.round(ch.level)) : 0;
      if (active && a.paused) a.play().catch(() => {});
      if (!active && !a.paused) a.pause();
    },
    stop(ch) {
      if (!ch.playing) return;
      ch.playing.audio.pause();
      ch.playing.audio.src = "";
      ch.playing = null;
    },
    /* iOS unlock: media elements can only start playing if their FIRST
       play() happens inside a user gesture. Live Mix starts streams from
       a timer, so on the first tap we "prime" every stream: create it,
       play muted for an instant, pause. After that, programmatic play()
       is allowed for those elements. */
    primeAll(channels) {
      channels.forEach(ch => {
        const v = ch.variants[ch.variant];
        if (!v.src || ch.playing || ch.disabled) return;
        const made = makeStream(ch, v);
        const a = made.audio;
        a.muted = true;
        const p = a.play();
        if (p) p.then(() => { a.pause(); a.muted = false; a.currentTime = 0; })
               .catch(() => { a.muted = false; });
        made.key = ch.variant;
        ch.playing = made;
      });
    }
  };
})();

document.addEventListener("pointerdown", () => {
  AudioEngine.primeAll(channels);
}, { once: true });

/* ================= UI ================= */
const catalogEl = document.getElementById("catalog");
const statusEl  = document.getElementById("status");
const randomBtn = document.getElementById("randomize");
const liveBtn   = document.getElementById("livemix");
const resetBtn  = document.getElementById("reset");
const channels  = [];

let animating = false;
let liveTimer = null;
/* One logical transport for the whole mix, driven by the lock screen.
   iOS binds its controls to a single arbitrary <audio> element, so
   without this a lock-screen pause would stop one layer and leave the
   rest playing. Levels are untouched, so resuming restores the mix. */
let masterPaused = false;

/* ---------- Live Mix drift engine ----------
   A bounded random walk toward a target, mean-reverting downward as a
   level gets loud so the mix does not creep towards everything at 100. */
function makeDrifter() {
  let target = null;
  function pickTarget(from) {
    const span = 15 + Math.random() * 25;
    const goUp = Math.random() < (1 - from / 100);
    return Math.min(100, Math.max(0, Math.round(from + (goUp ? span : -span))));
  }
  return {
    next(level) {
      if (target === null || target === level) target = pickTarget(level);
      return level + Math.sign(target - level);
    },
    reset() { target = null; },
    sink() { target = 0; }
  };
}

/* ---------- Live Mix conductor ---------- */
function conduct() {
  const eligible = channels.filter(c => c.variants[c.variant].src && !c.disabled);
  const silent = eligible.filter(c => Math.round(c.level) === 0);
  const active = eligible.filter(c => Math.round(c.level) > 0);
  if (Math.random() < 0.05 && silent.length) {
    const ch = silent[Math.floor(Math.random() * silent.length)];
    ch.level = 1; ch.drifter.reset(); render(ch);
  }
  if (Math.random() < 0.05 && active.length > 2) {
    active[Math.floor(Math.random() * active.length)].drifter.sink();
  }
}

/* ---------- build catalog ---------- */
CATALOG.forEach(group => {
  const label = document.createElement("p");
  label.className = "section-label";
  label.textContent = group.category;
  catalogEl.appendChild(label);

  const panel = document.createElement("section");
  panel.className = "panel";
  catalogEl.appendChild(panel);

  group.sounds.forEach(sound => {
    const el = document.createElement("div");
    el.className = "row";

    const hasSource = sound.variants.some(v => v.src);

    el.innerHTML =
      '<div class="row-top">' +
        '<button class="name" aria-pressed="false" title="Disable / enable">' + sound.name +
          (hasSource ? "" : '<span class="badge">no audio yet</span>') +
        '</button>' +
        '<span class="value">0</span>' +
      '</div>' +
      '<div class="fader" role="slider" tabindex="0" aria-label="' + sound.name + ' volume"' +
      ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-orientation="horizontal">' +
        '<div class="fill"></div>' +
      '</div>';

    panel.appendChild(el);

    const ch = {
      name: sound.name,
      variants: sound.variants,
      level: 0, variant: 0, disabled: false, playing: null,
      el,
      fader: el.querySelector(".fader"),
      fill:  el.querySelector(".fill"),
      value: el.querySelector(".value"),
      nameBtn: el.querySelector(".name"),
      drifter: makeDrifter()
    };
    ch.onStreamError = () => {
      if (ch.nameBtn.querySelector(".badge")) return;
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "stream blocked";
      ch.nameBtn.appendChild(b);
    };
    channels.push(ch);
    wire(ch);
    render(ch);
  });
});

function render(ch) {
  const pct = Math.round(ch.level);
  ch.fill.style.width = ch.level + "%";
  ch.value.textContent = ch.disabled ? "Off" : String(pct);
  ch.fader.setAttribute("aria-valuenow", pct);
  ch.fader.setAttribute("aria-disabled", ch.disabled);
  ch.el.classList.toggle("active", pct > 0 && !ch.disabled);
  ch.el.classList.toggle("disabled", ch.disabled);
  AudioEngine.update(ch);
  updateStatus();
}

function updateStatus() {
  const n = channels.filter(c => Math.round(c.level) > 0 && !c.disabled).length;
  statusEl.textContent = n === 0 ? "No layers active" : n === 1 ? "1 layer active" : n + " layers active";
  updateMediaSession(n);
}

/* ---------- lock screen / background transport ---------- */
function setMasterPaused(v) {
  masterPaused = v;
  channels.forEach(render);
  if ("mediaSession" in navigator)
    navigator.mediaSession.playbackState = v ? "paused" : "playing";
}

function updateMediaSession(n) {
  if (!("mediaSession" in navigator)) return;
  if (window.MediaMetadata) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Drift",
      artist: n === 0 ? "No layers active" : n === 1 ? "1 layer active" : n + " layers active"
    });
  }
  if (n > 0 && !masterPaused) navigator.mediaSession.playbackState = "playing";
}

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play",  () => setMasterPaused(false));
  navigator.mediaSession.setActionHandler("pause", () => setMasterPaused(true));
}

/* ---------- Randomize ---------- */
const easeInOut = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

function randomize() {
  if (animating) return;
  animating = true;
  document.body.classList.add("rand");
  randomBtn.classList.add("busy");
  randomBtn.textContent = "Mixing…";

  const sourced = channels.map((c, i) => c.variants[c.variant].src && !c.disabled ? i : -1).filter(i => i >= 0);
  const count = Math.min(sourced.length, 3 + Math.floor(Math.random() * 3));
  const picked = new Set();
  while (picked.size < count) picked.add(sourced[Math.floor(Math.random() * sourced.length)]);

  // map before filtering so the index-based `picked` lookup stays correct.
  // Disabled channels are dropped entirely rather than animated to 0 - their
  // level is a preserved setting, not part of the mix.
  const targets = channels.map((ch, i) => ({
    ch, from: ch.level,
    to: picked.has(i) ? 25 + Math.round(Math.random() * 70) : 0
  })).filter(t => !t.ch.disabled);

  const finish = () => {
    animating = false;
    document.body.classList.remove("rand");
    setTimeout(() => { randomBtn.classList.remove("busy"); randomBtn.textContent = "Randomize"; }, 350);
  };

  const reduce = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    targets.forEach(t => { t.ch.level = t.to; t.ch.drifter.reset(); render(t.ch); });
    finish();
    return;
  }

  const DURATION = 2000;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / DURATION);
    const e = easeInOut(t);
    targets.forEach(({ ch, from, to }) => { ch.level = from + (to - from) * e; render(ch); });
    if (t < 1) requestAnimationFrame(step);
    else {
      targets.forEach(({ ch, to }) => { ch.level = to; ch.drifter.reset(); render(ch); });
      finish();
    }
  }
  requestAnimationFrame(step);
}

/* ---------- Live Mix ---------- */
function setLive(on) {
  liveBtn.classList.toggle("on", on);
  liveBtn.setAttribute("aria-pressed", on);
  document.body.classList.toggle("live", on);
  if (on) {
    const anyActive = channels.some(c => Math.round(c.level) > 0 && !c.disabled);
    if (!anyActive) randomize();
    liveTimer = setInterval(() => {
      if (animating) return;
      conduct();
      channels.forEach(ch => {
        if (ch.disabled || Math.round(ch.level) === 0) return;
        ch.level = ch.drifter.next(Math.round(ch.level));
        render(ch);
      });
    }, 1000);
  } else {
    clearInterval(liveTimer);
    liveTimer = null;
  }
}

randomBtn.addEventListener("click", randomize);
liveBtn.addEventListener("click", () => setLive(liveTimer === null));
resetBtn.addEventListener("click", () => {
  setLive(false);
  // Reset clears the mix, not your preferences: disabled sounds stay disabled,
  // otherwise you would have to switch them off again after every reset.
  channels.forEach(ch => { ch.level = 0; ch.drifter.reset(); render(ch); });
});

/* ---------- per-channel wiring ---------- */
function wire(ch) {
  /* A disabled sound stays disabled no matter what its level is set to,
     so every input path bails early rather than quietly switching it back on. */
  const setFromPointer = (e) => {
    if (ch.disabled) return;
    const rect = ch.fader.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    ch.level = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    ch.drifter.reset();
    render(ch);
  };

  ch.fader.addEventListener("pointerdown", (e) => {
    ch.fader.setPointerCapture(e.pointerId);
    ch.fader.classList.add("dragging");
    setFromPointer(e);
    const move = (ev) => setFromPointer(ev);
    const up = () => {
      ch.fader.classList.remove("dragging");
      ch.fader.removeEventListener("pointermove", move);
      ch.fader.removeEventListener("pointerup", up);
      ch.fader.removeEventListener("pointercancel", up);
    };
    ch.fader.addEventListener("pointermove", move);
    ch.fader.addEventListener("pointerup", up);
    ch.fader.addEventListener("pointercancel", up);
  });

  ch.fader.addEventListener("keydown", (e) => {
    if (ch.disabled) return;
    let delta = 0;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") delta = 5;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") delta = -5;
    if (e.key === "Home") { ch.level = 0; render(ch); e.preventDefault(); return; }
    if (e.key === "End")  { ch.level = 100; render(ch); e.preventDefault(); return; }
    if (delta !== 0) {
      ch.level = Math.min(100, Math.max(0, Math.round(ch.level) + delta));
      ch.drifter.reset();
      render(ch);
      e.preventDefault();
    }
  });

  ch.nameBtn.addEventListener("click", () => {
    ch.disabled = !ch.disabled;
    ch.nameBtn.setAttribute("aria-pressed", ch.disabled);
    render(ch);
  });
}
