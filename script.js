/* ================= SOUND SOURCES =================
   Streaming previews from freesound.org (played from their CDN,
   to be downloaded and bundled later). Format:
   { fs: [folder, "id_userid"] } -> https://cdn.freesound.org/previews/folder/id_userid-lq.mp3
   { gen: "type" } -> generated locally with Web Audio
   null -> no source found yet
   Credits (CC-BY unless noted CC0):
     34065  "AMBIENT - Rain - Light" by Arctura
     238911 "Seamless Rain Loop" by Iwan 'qubodup' Gabovitch
     346642 "Rain on Windows, Interior, A" by InspectorJ (jshaw.co.uk)
     400632 "Ambience, Seaside Waves, Close, A" by InspectorJ
     339324 "Stream, Water, C" by InspectorJ
     365921 "Waterfall, Small, B" by InspectorJ
     339326 "Bird Whistling, A" by InspectorJ
     352514 "Ambience, Night Wildlife, A" by InspectorJ
     405561 "Wind, Realistic, A" by InspectorJ
     343130 "Ticking Clock, A" by InspectorJ
     353194 "Wind Chimes, A" by InspectorJ
     414767 "Crackling Fire" by samarobryn (CC0)
     705049 "Small city ambience with traffic" by felix.blume (CC0)
     341208 "train interior ambience 1a" by Yoyodaman234 (CC0)
================================================== */
const FS = (folder, file) => "https://cdn.freesound.org/previews/" + folder + "/" + file + "-lq.mp3";

const CATALOG = [
  { category: "Water", sounds: [
    { name: "Rain", variants: [
      { label: "Light",     src: { fs: FS(34,  "34065_28216") } },
      { label: "On roof",   src: { fs: FS(346, "346642_5121236") } },
      { label: "Courtyard", src: { fs: FS(238, "238911_71257") } }
    ]},
    { name: "Thunderstorm", variants: [
      { label: "Distant", src: null },
      { label: "Close",   src: null }
    ]},
    { name: "Ocean", variants: [
      { label: "Gentle",  src: { fs: FS(400, "400632_5121236") } },
      { label: "Rolling", src: { fs: FS(400, "400632_5121236") } }
    ]},
    { name: "Lake",      variants: [ { label: "", src: null } ] },
    { name: "Stream",    variants: [ { label: "", src: { fs: FS(339, "339324_5121236") } } ] },
    { name: "Waterfall", variants: [ { label: "", src: { fs: FS(365, "365921_5121236") } } ] }
  ]},
  { category: "Nature", sounds: [
    { name: "Birds", variants: [
      { label: "Morning", src: { fs: FS(339, "339326_5121236") } },
      { label: "Forest",  src: { fs: FS(339, "339326_5121236") } }
    ]},
    { name: "Crickets", variants: [ { label: "", src: { fs: FS(352, "352514_5121236") } } ] },
    { name: "Wind", variants: [
      { label: "In trees", src: { fs: FS(405, "405561_5121236") } },
      { label: "Winter",   src: null }
    ]},
    { name: "Campfire", variants: [
      { label: "Crackling", src: { fs: FS(414, "414767_4955305") } },
      { label: "Soft",      src: { fs: FS(414, "414767_4955305") } }
    ]},
    { name: "Snowfall", variants: [ { label: "", src: null } ] }
  ]},
  { category: "City", sounds: [
    { name: "Cafe", variants: [
      { label: "Quiet", src: null },
      { label: "Busy",  src: null }
    ]},
    { name: "Traffic", variants: [ { label: "", src: { fs: FS(705, "705049_1661766") } } ] },
    { name: "Train", variants: [
      { label: "Interior", src: { fs: FS(341, "341208_2792951") } },
      { label: "Passing",  src: { fs: FS(341, "341208_2792951") } }
    ]},
    { name: "Airplane", variants: [ { label: "", src: null } ] },
    { name: "Keyboard", variants: [ { label: "", src: null } ] }
  ]},
  { category: "Home", sounds: [
    { name: "Fan", variants: [
      { label: "Desk",    src: { gen: "fan-desk" } },
      { label: "Ceiling", src: { gen: "fan-ceiling" } }
    ]},
    { name: "Air conditioner", variants: [ { label: "", src: { gen: "ac" } } ] },
    { name: "Washing machine", variants: [ { label: "", src: null } ] },
    { name: "Fireplace",       variants: [ { label: "", src: { fs: FS(414, "414767_4955305") } } ] },
    { name: "Clock",           variants: [ { label: "", src: { fs: FS(343, "343130_5121236") } } ] }
  ]},
  { category: "Noise & tones", sounds: [
    { name: "White noise", variants: [ { label: "", src: { gen: "white" } } ] },
    { name: "Pink noise",  variants: [ { label: "", src: { gen: "pink" } } ] },
    { name: "Brown noise", variants: [ { label: "", src: { gen: "brown" } } ] },
    { name: "Drone", variants: [
      { label: "Warm", src: { gen: "drone-warm" } },
      { label: "Deep", src: { gen: "drone-deep" } }
    ]},
    { name: "Chimes", variants: [ { label: "", src: { fs: FS(353, "353194_5121236") } } ] }
  ]}
];

/* ================= AUDIO ENGINE =================
   One place for all playback. Streams use looped <audio>
   elements pointing at Freesound preview mp3s. Generated
   sounds use Web Audio (noise buffers / oscillators).
   update(ch) reconciles audio with the channel state. */
const AudioEngine = (() => {
  let ctx = null;
  const vol = lvl => Math.pow(lvl / 100, 2); // perceptual curve

  function context() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(kind) {
    const c = context();
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0, last=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.3;
      else if (kind === "pink") {
        b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
        b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
        b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
        d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.09;
        b6 = w * 0.115926;
      } else { // brown
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.0;
      }
    }
    return buf;
  }

  function buildGenerated(type) {
    const c = context();
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.connect(c.destination);
    const nodes = [gain];

    function noiseThrough(kind, filterSetup) {
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(kind);
      src.loop = true;
      let out = src;
      if (filterSetup) {
        const f = c.createBiquadFilter();
        filterSetup(f);
        src.connect(f); out = f; nodes.push(f);
      }
      out.connect(gain);
      src.start();
      nodes.push(src);
    }

    function osc(freq, type2, g) {
      const o = c.createOscillator();
      o.type = type2; o.frequency.value = freq;
      const og = c.createGain(); og.gain.value = g;
      o.connect(og); og.connect(gain);
      o.start();
      nodes.push(o, og);
    }

    switch (type) {
      case "white": noiseThrough("white"); break;
      case "pink":  noiseThrough("pink");  break;
      case "brown": noiseThrough("brown"); break;
      case "fan-desk":    noiseThrough("pink",  f => { f.type = "lowpass"; f.frequency.value = 500; }); break;
      case "fan-ceiling": noiseThrough("brown", f => { f.type = "lowpass"; f.frequency.value = 300; }); break;
      case "ac":
        noiseThrough("brown", f => { f.type = "lowpass"; f.frequency.value = 350; });
        osc(120, "sine", 0.02);
        break;
      case "drone-warm":
        osc(110, "triangle", 0.12); osc(110.7, "sine", 0.10); osc(220, "sine", 0.03);
        break;
      case "drone-deep":
        osc(55, "triangle", 0.16); osc(55.4, "sine", 0.12); osc(110, "sine", 0.03);
        break;
    }
    return { gain, nodes };
  }

  function makeStream(ch, v) {
    const a = new Audio(v.src.fs);
    a.loop = true;
    a.preload = "auto";
    // surface stream failures in the UI instead of failing silently
    a.addEventListener("error", () => {
      if (ch.onStreamError) ch.onStreamError();
    });
    return a;
  }

  return {
    update(ch) {
      const v = ch.variants[ch.variant];
      const active = !ch.muted && ch.level > 0;
      const target = active ? vol(Math.round(ch.level)) : 0;

      // stop whatever belongs to a different variant
      if (ch.playing && ch.playing.key !== ch.variant) this.stop(ch);
      if (!v.src) return;

      if ("fs" in v.src) {
        if (!ch.playing) {
          if (!active) return;
          ch.playing = { key: ch.variant, audio: makeStream(ch, v) };
        }
        const a = ch.playing.audio;
        a.volume = target;
        if (active && a.paused) a.play().catch(() => {});
        if (!active && !a.paused) a.pause();
      } else if ("gen" in v.src) {
        if (ctx && ctx.state === "suspended") ctx.resume();
        if (!ch.playing) {
          if (!active) return;
          ch.playing = { key: ch.variant, gen: buildGenerated(v.src.gen) };
        }
        ch.playing.gen.gain.gain.setTargetAtTime(target, context().currentTime, 0.05);
      }
    },
    stop(ch) {
      if (!ch.playing) return;
      if (ch.playing.audio) { ch.playing.audio.pause(); ch.playing.audio.src = ""; }
      if (ch.playing.gen) {
        // fully tear down the generated graph - stop sources, free CPU
        const g = ch.playing.gen;
        g.gain.gain.value = 0;
        g.nodes.forEach(n => {
          try { if (n.stop) n.stop(); } catch (e) {}
          try { if (n.disconnect) n.disconnect(); } catch (e) {}
        });
      }
      ch.playing = null;
    },
    /* iOS unlock: media elements can only start playing if their FIRST
       play() happens inside a user gesture. Live Mix starts streams from
       a timer, so on the first tap we "prime" every stream: create it,
       play muted for an instant, pause. After that, programmatic play()
       is allowed for those elements. */
    primeAll(channels) {
      context();
      channels.forEach(ch => {
        const v = ch.variants[ch.variant];
        if (!v.src || !("fs" in v.src) || ch.playing) return;
        const a = makeStream(ch, v);
        a.muted = true;
        const p = a.play();
        if (p) p.then(() => { a.pause(); a.muted = false; a.currentTime = 0; })
               .catch(() => { a.muted = false; });
        ch.playing = { key: ch.variant, audio: a };
      });
    },
    unlock() { context(); }
  };
})();

document.addEventListener("pointerdown", () => {
  AudioEngine.unlock();
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

/* ---------- Live Mix drift engine ---------- */
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
  const eligible = channels.filter(c => c.variants[c.variant].src);
  const silent = eligible.filter(c => !c.muted && Math.round(c.level) === 0);
  const active = eligible.filter(c => !c.muted && Math.round(c.level) > 0);
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
    const showChips = sound.variants.length > 1;
    const chips = showChips
      ? '<div class="variants" role="radiogroup" aria-label="' + sound.name + ' variant">' +
        sound.variants.map((v, i) =>
          '<button class="chip' + (i === 0 ? " on" : "") + '" role="radio" aria-checked="' + (i === 0) + '">' + v.label + '</button>'
        ).join("") + '</div>'
      : "";

    el.innerHTML =
      '<div class="row-top">' +
        '<button class="name" aria-pressed="false" title="Mute / unmute">' + sound.name +
          (hasSource ? "" : '<span class="badge">no audio yet</span>') +
        '</button>' +
        '<span class="value">0</span>' +
      '</div>' +
      chips +
      '<div class="fader" role="slider" tabindex="0" aria-label="' + sound.name + ' volume"' +
      ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-orientation="horizontal">' +
        '<div class="fill"></div>' +
      '</div>';

    panel.appendChild(el);

    const ch = {
      name: sound.name,
      variants: sound.variants,
      level: 0, variant: 0, muted: false, playing: null,
      el,
      fader: el.querySelector(".fader"),
      fill:  el.querySelector(".fill"),
      value: el.querySelector(".value"),
      nameBtn: el.querySelector(".name"),
      chips: [...el.querySelectorAll(".chip")],
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
  ch.value.textContent = ch.muted ? "Muted" : pct;
  ch.fader.setAttribute("aria-valuenow", pct);
  ch.el.classList.toggle("active", pct > 0 && !ch.muted);
  ch.el.classList.toggle("muted", ch.muted);
  AudioEngine.update(ch);
  updateStatus();
}

function updateStatus() {
  const n = channels.filter(c => Math.round(c.level) > 0 && !c.muted).length;
  statusEl.textContent = n === 0 ? "No layers active" : n === 1 ? "1 layer active" : n + " layers active";
}

/* ---------- Randomize ---------- */
const easeInOut = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;

function randomize() {
  if (animating) return;
  animating = true;
  document.body.classList.add("rand");
  randomBtn.classList.add("busy");
  randomBtn.textContent = "Mixing…";

  const sourced = channels.map((c, i) => c.variants[c.variant].src ? i : -1).filter(i => i >= 0);
  const count = Math.min(sourced.length, 3 + Math.floor(Math.random() * 3));
  const picked = new Set();
  while (picked.size < count) picked.add(sourced[Math.floor(Math.random() * sourced.length)]);

  const targets = channels.map((ch, i) => ({
    ch, from: ch.level,
    to: picked.has(i) ? 25 + Math.round(Math.random() * 70) : 0
  }));

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
    const anyActive = channels.some(c => Math.round(c.level) > 0 && !c.muted);
    if (!anyActive) randomize();
    liveTimer = setInterval(() => {
      if (animating) return;
      conduct();
      channels.forEach(ch => {
        if (ch.muted || Math.round(ch.level) === 0) return;
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
  channels.forEach(ch => {
    ch.level = 0; ch.muted = false; ch.drifter.reset();
    ch.nameBtn.setAttribute("aria-pressed", "false");
    render(ch);
  });
});

/* ---------- per-channel wiring ---------- */
function wire(ch) {
  const setFromPointer = (e) => {
    const rect = ch.fader.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    ch.level = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    ch.drifter.reset();
    if (ch.level > 0) ch.muted = false;
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
    let delta = 0;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") delta = 5;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") delta = -5;
    if (e.key === "Home") { ch.level = 0; render(ch); e.preventDefault(); return; }
    if (e.key === "End")  { ch.level = 100; ch.muted = false; render(ch); e.preventDefault(); return; }
    if (delta !== 0) {
      ch.level = Math.min(100, Math.max(0, Math.round(ch.level) + delta));
      ch.drifter.reset();
      if (ch.level > 0) ch.muted = false;
      render(ch);
      e.preventDefault();
    }
  });

  ch.nameBtn.addEventListener("click", () => {
    ch.muted = !ch.muted;
    ch.nameBtn.setAttribute("aria-pressed", ch.muted);
    render(ch);
  });

  ch.chips.forEach((chip, i) => {
    chip.addEventListener("click", () => {
      const wasActive = Math.round(ch.level) > 0 && !ch.muted;
      ch.variant = i;
      ch.chips.forEach((c, j) => {
        c.classList.toggle("on", j === i);
        c.setAttribute("aria-checked", j === i);
      });
      AudioEngine.stop(ch);
      if (wasActive) AudioEngine.update(ch);
      render(ch);
    });
  });
}
