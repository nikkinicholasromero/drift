/* ================= SOUND SOURCES =================
   Streaming previews from freesound.org (played from their CDN,
   to be downloaded and bundled later). Format:
   { fs: [folder, "id_userid"] } -> https://cdn.freesound.org/previews/folder/id_userid-lq.mp3
   { gen: "type" } -> generated locally with Web Audio
   null -> no source found yet
   Credits (CC-BY unless noted CC0):
     34065  "AMBIENT - Rain - Light" by Arctura
     339324 "Stream, Water, C" by InspectorJ
     365921 "Waterfall, Small, B" by InspectorJ
     339326 "Bird Whistling, A" by InspectorJ
     352514 "Ambience, Night Wildlife, A" by InspectorJ
     405561 "Wind, Realistic, A" by InspectorJ
     353194 "Wind Chimes, A" by InspectorJ
     414767 "Crackling Fire" by samarobryn (CC0)
     705049 "Small city ambience with traffic" by felix.blume (CC0)
     341208 "train interior ambience 1a" by Yoyodaman234 (CC0)
================================================== */
const FS = (folder, file) => "https://cdn.freesound.org/previews/" + folder + "/" + file + "-lq.mp3";

const CATALOG = [
  { category: "Water", sounds: [
    { name: "Rain",      variants: [ { label: "", src: { fs: FS(34,  "34065_28216") } } ] },
    { name: "Stream",    variants: [ { label: "", src: { fs: FS(339, "339324_5121236") } } ] },
    { name: "Waterfall", variants: [ { label: "", src: { fs: FS(365, "365921_5121236") } } ] }
  ]},
  { category: "Nature", sounds: [
    { name: "Birds",    variants: [ { label: "", src: { fs: FS(339, "339326_5121236") } } ] },
    { name: "Crickets", variants: [ { label: "", src: { fs: FS(352, "352514_5121236") } } ] },
    { name: "Wind",     variants: [ { label: "", src: { fs: FS(405, "405561_5121236") } } ] },
    { name: "Campfire", variants: [ { label: "", src: { fs: FS(414, "414767_4955305") } } ] }
  ]},
  { category: "City", sounds: [
    { name: "Traffic", variants: [ { label: "", src: { fs: FS(705, "705049_1661766") } } ] },
    { name: "Train",   variants: [ { label: "", src: { fs: FS(341, "341208_2792951") } } ] }
  ]},
  { category: "Home", sounds: [
    { name: "Fan", variants: [ { label: "", src: { gen: "fan-desk" } } ] },
    { name: "Air conditioner", centered: true, variants: [ { label: "", src: { gen: "ac" } } ] },
    { name: "Fireplace",       variants: [ { label: "", src: { fs: FS(414, "414767_4955305") } } ] }
  ]},
  { category: "Noise & tones", sounds: [
    { name: "White noise", centered: true, variants: [ { label: "", src: { gen: "white" } } ] },
    { name: "Pink noise",  centered: true, variants: [ { label: "", src: { gen: "pink" } } ] },
    { name: "Brown noise", centered: true, variants: [ { label: "", src: { gen: "brown" } } ] },
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
  const PAN_SMOOTH = 0.08;                   // time constant for pan moves

  function context() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* Every channel - streamed or generated - ends in the same
     gain -> panner -> destination chain, so level and pan are
     applied identically regardless of where the audio came from. */
  function makeChain(c) {
    const gain = c.createGain();
    gain.gain.value = 0;
    let panner = null;
    if (c.createStereoPanner) {
      panner = c.createStereoPanner();
      gain.connect(panner);
      panner.connect(c.destination);
    } else {
      gain.connect(c.destination);
    }
    return { gain, panner };
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
    const { gain, panner } = makeChain(c);
    const nodes = panner ? [gain, panner] : [gain];

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
      case "ac":
        noiseThrough("brown", f => { f.type = "lowpass"; f.frequency.value = 350; });
        osc(120, "sine", 0.02);
        break;
    }
    return { gain, panner, nodes };
  }

  /* Streams are routed through the AudioContext so they can be panned -
     an <audio> element on its own has volume but no pan. This requires
     CORS: crossOrigin must be set BEFORE src, or the graph outputs silence. */
  function makeStream(ch, v) {
    const c = context();
    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.loop = true;
    a.preload = "auto";
    a.src = v.src.fs;
    // surface stream failures in the UI instead of failing silently
    a.addEventListener("error", () => {
      if (ch.onStreamError) ch.onStreamError();
    });

    try {
      const node = c.createMediaElementSource(a);
      const { gain, panner } = makeChain(c);
      node.connect(gain);
      return { audio: a, gain, panner, nodes: panner ? [node, gain, panner] : [node, gain] };
    } catch (e) {
      // Routing unavailable - play the element directly, level via a.volume, no pan.
      return { audio: a, gain: null, panner: null, nodes: [], unrouted: true };
    }
  }

  return {
    update(ch) {
      const v = ch.variants[ch.variant];
      const active = !ch.disabled && ch.level > 0;
      const target = active ? vol(Math.round(ch.level)) : 0;

      // stop whatever belongs to a different variant
      if (ch.playing && ch.playing.key !== ch.variant) this.stop(ch);
      if (!v.src) return;

      if (ctx && ctx.state === "suspended") ctx.resume();
      if (!ch.playing) {
        if (!active) return;
        ch.playing = "fs" in v.src ? makeStream(ch, v) : buildGenerated(v.src.gen);
        ch.playing.key = ch.variant;
      }

      const p = ch.playing, t = context().currentTime;
      if (p.unrouted) p.audio.volume = target;
      else p.gain.gain.setTargetAtTime(target, t, 0.05);
      if (p.panner) p.panner.pan.setTargetAtTime(ch.pan / 100, t, PAN_SMOOTH);

      if (p.audio) {
        if (active && p.audio.paused) p.audio.play().catch(() => {});
        if (!active && !p.audio.paused) p.audio.pause();
      }
    },
    stop(ch) {
      if (!ch.playing) return;
      const p = ch.playing;
      if (p.audio) { p.audio.pause(); p.audio.src = ""; }
      // fully tear down the graph - stop sources, disconnect, free CPU
      if (p.gain) p.gain.gain.value = 0;
      p.nodes.forEach(n => {
        try { if (n.stop) n.stop(); } catch (e) {}
        try { if (n.disconnect) n.disconnect(); } catch (e) {}
      });
      ch.playing = null;
    },
    hasPan() {
      const AC = window.AudioContext || window.webkitAudioContext;
      return !!(AC && AC.prototype && AC.prototype.createStereoPanner);
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
        if (!v.src || !("fs" in v.src) || ch.playing || ch.disabled) return;
        const made = makeStream(ch, v);
        const a = made.audio;
        a.muted = true;
        const p = a.play();
        if (p) p.then(() => { a.pause(); a.muted = false; a.currentTime = 0; })
               .catch(() => { a.muted = false; });
        made.key = ch.variant;
        ch.playing = made;
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

/* ---------- Live Mix drift engine ----------
   A bounded random walk toward a target. `bias` returns the probability
   of moving up, which is what pulls a value back toward its resting
   point: volume mean-reverts downward as it gets loud, pan toward centre. */
function makeDrifter(opts) {
  const o = Object.assign({
    min: 0, max: 100, spanMin: 15, spanRange: 25, step: 1,
    bias: from => 1 - from / 100
  }, opts);
  let target = null;
  function pickTarget(from) {
    const span = o.spanMin + Math.random() * o.spanRange;
    const goUp = Math.random() < o.bias(from);
    return Math.min(o.max, Math.max(o.min, Math.round(from + (goUp ? span : -span))));
  }
  return {
    next(level) {
      if (target === null || Math.abs(target - level) < o.step) target = pickTarget(level);
      return level + Math.sign(target - level) * o.step;
    },
    reset() { target = null; },
    sink() { target = 0; }
  };
}

/* Slow, narrow drift so sounds wander like weather rather than swing about.
   At 0.5/tick a 40-unit move takes ~80s; +/-70 keeps it musical, not hard-panned. */
const PAN_DRIFT = {
  min: -70, max: 70, spanMin: 20, spanRange: 40, step: 0.5,
  bias: from => 0.5 - from / 200
};

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
      '</div>' +
      '<div class="pan" role="slider" tabindex="0" aria-label="' + sound.name + ' pan"' +
      ' aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Center"' +
      ' aria-orientation="horizontal">' +
        '<span class="pan-tick"></span>' +
        '<span class="pan-fill"></span>' +
        '<span class="pan-dot"></span>' +
      '</div>';

    panel.appendChild(el);

    const ch = {
      name: sound.name,
      variants: sound.variants,
      centered: !!sound.centered,
      level: 0, variant: 0, disabled: false, playing: null,
      pan: 0,
      el,
      fader: el.querySelector(".fader"),
      fill:  el.querySelector(".fill"),
      value: el.querySelector(".value"),
      nameBtn: el.querySelector(".name"),
      panEl:   el.querySelector(".pan"),
      panDot:  el.querySelector(".pan-dot"),
      panFill: el.querySelector(".pan-fill"),
      drifter: makeDrifter(),
      panDrifter: makeDrifter(PAN_DRIFT)
    };
    if (!AudioEngine.hasPan()) ch.panEl.classList.add("off");
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

/* Pan readouts stay silent at centre so the default state adds no visual noise.
   Function declarations, not consts - the catalog loop above calls render()
   while building rows, before this point in the file is reached. */
function panLabel(p) { return p < 0 ? "L" + -p : "R" + p; }
function panText(p)  { return p === 0 ? "Center" : (p < 0 ? "Left " + -p : "Right " + p); }

function render(ch) {
  const pct = Math.round(ch.level);
  const p = Math.round(ch.pan);
  ch.fill.style.width = ch.level + "%";
  ch.value.textContent = ch.disabled ? "Off" : (p === 0 ? String(pct) : pct + "  " + panLabel(p));
  ch.fader.setAttribute("aria-valuenow", pct);
  ch.fader.setAttribute("aria-disabled", ch.disabled);
  ch.panEl.setAttribute("aria-disabled", ch.disabled);

  ch.panDot.style.left   = (50 + ch.pan / 2) + "%";
  ch.panFill.style.left  = (ch.pan < 0 ? 50 + ch.pan / 2 : 50) + "%";
  ch.panFill.style.width = Math.abs(ch.pan) / 2 + "%";
  ch.panEl.setAttribute("aria-valuenow", p);
  ch.panEl.setAttribute("aria-valuetext", panText(p));

  ch.el.classList.toggle("active", pct > 0 && !ch.disabled);
  ch.el.classList.toggle("disabled", ch.disabled);
  AudioEngine.update(ch);
  updateStatus();
}

function updateStatus() {
  const n = channels.filter(c => Math.round(c.level) > 0 && !c.disabled).length;
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

  const sourced = channels.map((c, i) => c.variants[c.variant].src && !c.disabled ? i : -1).filter(i => i >= 0);
  const count = Math.min(sourced.length, 3 + Math.floor(Math.random() * 3));
  const picked = new Set();
  while (picked.size < count) picked.add(sourced[Math.floor(Math.random() * sourced.length)]);

  /* Spread picked layers across the field, but leave plenty centred - a mix
     where everything is panned feels as unbalanced as one where nothing is.
     Bass-heavy beds never move; low frequencies pan badly. */
  const pickPan = ch => {
    if (ch.centered || Math.random() < 0.5) return 0;
    return (Math.random() < 0.5 ? -1 : 1) * Math.round(20 + Math.random() * 45);
  };

  // map before filtering so the index-based `picked` lookup stays correct.
  // Disabled channels are dropped entirely rather than animated to 0 - their
  // level is a preserved setting, not part of the mix.
  const targets = channels.map((ch, i) => ({
    ch, from: ch.level, panFrom: ch.pan,
    to: picked.has(i) ? 25 + Math.round(Math.random() * 70) : 0,
    // silent layers keep their pan - no reason to churn what you can't hear
    panTo: picked.has(i) ? pickPan(ch) : ch.pan
  })).filter(t => !t.ch.disabled);

  const finish = () => {
    animating = false;
    document.body.classList.remove("rand");
    setTimeout(() => { randomBtn.classList.remove("busy"); randomBtn.textContent = "Randomize"; }, 350);
  };

  const reduce = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce) {
    targets.forEach(t => {
      t.ch.level = t.to; t.ch.pan = t.panTo;
      t.ch.drifter.reset(); t.ch.panDrifter.reset();
      render(t.ch);
    });
    finish();
    return;
  }

  const DURATION = 2000;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / DURATION);
    const e = easeInOut(t);
    targets.forEach(({ ch, from, to, panFrom, panTo }) => {
      ch.level = from + (to - from) * e;
      ch.pan   = panFrom + (panTo - panFrom) * e;
      render(ch);
    });
    if (t < 1) requestAnimationFrame(step);
    else {
      targets.forEach(({ ch, to, panTo }) => {
        ch.level = to; ch.pan = panTo;
        ch.drifter.reset(); ch.panDrifter.reset();
        render(ch);
      });
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
        if (!ch.centered) ch.pan = ch.panDrifter.next(ch.pan);
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
  channels.forEach(ch => {
    ch.level = 0; ch.drifter.reset();
    ch.pan = 0; ch.panDrifter.reset();
    render(ch);
  });
});

/* ---------- per-channel wiring ---------- */
function wire(ch) {
  /* A disabled sound stays disabled no matter what its level or pan is set to,
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

  /* ---- pan ---- */
  const setPan = (value) => {
    if (ch.disabled) return;
    const v = Math.max(-100, Math.min(100, value));
    // centre detent: hitting exact centre by hand is otherwise near-impossible
    ch.pan = Math.abs(v) < 6 ? 0 : Math.round(v);
    ch.panDrifter.reset();
    render(ch);
  };

  const panFromPointer = (e) => {
    const rect = ch.panEl.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setPan((Math.min(1, Math.max(0, ratio)) * 2 - 1) * 100);
  };

  ch.panEl.addEventListener("pointerdown", (e) => {
    ch.panEl.setPointerCapture(e.pointerId);
    ch.panEl.classList.add("dragging");
    panFromPointer(e);
    const move = (ev) => panFromPointer(ev);
    const up = () => {
      ch.panEl.classList.remove("dragging");
      ch.panEl.removeEventListener("pointermove", move);
      ch.panEl.removeEventListener("pointerup", up);
      ch.panEl.removeEventListener("pointercancel", up);
    };
    ch.panEl.addEventListener("pointermove", move);
    ch.panEl.addEventListener("pointerup", up);
    ch.panEl.addEventListener("pointercancel", up);
  });

  ch.panEl.addEventListener("dblclick", () => setPan(0));

  ch.panEl.addEventListener("keydown", (e) => {
    if (ch.disabled) return;
    let delta = 0;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") delta = 5;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") delta = -5;
    // Home returns to centre - more useful here than jumping to hard left
    if (e.key === "Home") { setPan(0); e.preventDefault(); return; }
    if (delta !== 0) { setPan(Math.round(ch.pan) + delta); e.preventDefault(); }
  });

  ch.nameBtn.addEventListener("click", () => {
    ch.disabled = !ch.disabled;
    ch.nameBtn.setAttribute("aria-pressed", ch.disabled);
    render(ch);
  });

}
