/* ===== 背景纯音乐 ===== */
(function () {
  const { $, $$, esc } = U;
  const state = Store.state;

  const GEN_TRACKS = [
    { id: 'gen_night', name: '夜灯', sub: '程序生成的纯音乐 · 慢', preset: 'night' },
    { id: 'gen_rain', name: '雨窗', sub: '程序生成的纯音乐 · 沙沙的', preset: 'rain' },
    { id: 'gen_star', name: '星屑', sub: '程序生成的纯音乐 · 轻亮', preset: 'star' }
  ];
  const imported = [];

  const PRESETS = {
    night: { root: 196, scale: [0, 3, 5, 7, 10], chordEvery: 9, noteEvery: 1200, padGain: .05, pluckGain: .1, noise: 0 },
    rain: { root: 174.6, scale: [0, 2, 3, 7, 8], chordEvery: 8, noteEvery: 900, padGain: .045, pluckGain: .075, noise: .035 },
    star: { root: 261.6, scale: [0, 2, 4, 7, 9], chordEvery: 7, noteEvery: 720, padGain: .04, pluckGain: .085, noise: 0 }
  };

  let ctx = null, master = null, delay = null, noiseNode = null;
  let scheduler = null;
  let chordTimer = 0, noteTimer = 0, chordIndex = 0, noteIndex = 0;
  let audioEl = null;
  let playing = false;
  let curIndex = Number(state.settings.lastTrack || 0);

  function tracks() { return GEN_TRACKS.concat(imported); }

  /* ---------- 音频图 ---------- */
  function initCtx() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(master);
    master.connect(ctx.destination);
  }

  function setVolume() {
    const v = Number($('#ppVol').value) / 100;
    if (master) master.gain.setTargetAtTime(playing ? v * 0.75 : 0, ctx.currentTime, 0.2);
    if (audioEl) audioEl.volume = Math.min(1, v);
  }

  function freq(preset, semi) {
    return preset.root * Math.pow(2, semi / 12);
  }

  function pad(notes, dur, gain) {
    const t = ctx.currentTime;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1100;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 2.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.8);
      o.connect(filt); filt.connect(g); g.connect(master); g.connect(delay);
      o.start(t); o.stop(t + dur + 2.2);
    });
  }

  function pluck(f, gain) {
    const t = ctx.currentTime + Math.random() * 0.04;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = f * 2.003;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(gain * 0.25, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(master); g.connect(delay);
    o2.connect(g2); g2.connect(delay);
    o.start(t); o.stop(t + 2.4);
    o2.start(t); o2.stop(t + 1.3);
  }

  function startNoise(level) {
    if (!level) return;
    const len = 2 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 1600; filt.Q.value = .6;
    const g = ctx.createGain(); g.gain.value = level;
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start();
    noiseNode = src;
  }

  function stopNoise() {
    if (noiseNode) { try { noiseNode.stop(); } catch (e) {} noiseNode = null; }
  }

  /* ---------- 生成音乐调度 ---------- */
  function genStep() {
    const track = tracks()[curIndex];
    const p = PRESETS[track.preset] || PRESETS.night;
    const now = Date.now();

    if (now >= chordTimer) {
      const degs = [0, 3, 4, 2, 5, 1];
      const base = degs[chordIndex % degs.length];
      const chord = [0, 2, 4].map((step) => {
        const idx = (base + step) % p.scale.length;
        const oct = Math.floor((base + step) / p.scale.length) * 12;
        return freq(p, p.scale[idx] + oct);
      });
      pad(chord, p.chordEvery, p.padGain);
      chordIndex++;
      chordTimer = now + p.chordEvery * 1000;
    }

    if (now >= noteTimer) {
      const steps = [0, 1, 2, 3, 4, 3, 2, 1];
      const semi = p.scale[steps[noteIndex % steps.length]] + 12 * (Math.random() < .2 ? 2 : 1);
      if (Math.random() < .78) pluck(freq(p, semi), p.pluckGain);
      noteIndex++;
      noteTimer = now + p.noteEvery * (0.85 + Math.random() * 0.5);
    }
  }

  function startGen() {
    initCtx();
    if (ctx.state === 'suspended') ctx.resume();
    stopNoise();
    const track = tracks()[curIndex];
    const p = PRESETS[track.preset] || PRESETS.night;
    chordIndex = Math.floor(Math.random() * 6);
    noteIndex = 0;
    chordTimer = 0; noteTimer = 0;
    if (p.noise) startNoise(p.noise);
    playing = true;
    master.gain.setTargetAtTime(Number($('#ppVol').value) / 100 * 0.75, ctx.currentTime, 0.6);
    genStep();
    clearInterval(scheduler);
    scheduler = setInterval(genStep, 220);
  }

  function stopGen() {
    clearInterval(scheduler);
    scheduler = null;
    stopNoise();
    playing = false;
    if (master && ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
  }

  /* ---------- 播放控制 ---------- */
  function stopAll() {
    stopGen();
    if (audioEl) { audioEl.pause(); }
  }

  function playIndex(i, autoplay) {
    const all = tracks();
    if (!all.length) return;
    curIndex = (i + all.length) % all.length;
    const track = all[curIndex];
    state.settings.lastTrack = curIndex;
    Store.save();

    $('#ppTitle').textContent = track.name;
    $('#ppSub').textContent = track.sub || '本地音频';

    if (audioEl) { audioEl.pause(); audioEl.load(); }

    if (track.kind === 'audio') {
      stopGen();
      if (!audioEl) audioEl = new Audio();
      audioEl.src = track.url;
      audioEl.volume = Number($('#ppVol').value) / 100;
      if (autoplay) audioEl.play().catch(() => {});
      playing = true;
    } else {
      if (autoplay) startGen();
      else { playing = true; }
    }
    updateUI();
    renderList();
  }

  function toggle() {
    const track = tracks()[curIndex];
    if (!track) return;
    if (playing) {
      stopAll();
      playing = false;
      updateUI();
    } else {
      if (track.kind === 'audio') {
        if (!audioEl) audioEl = new Audio(track.url);
        else if (audioEl.src !== track.url) audioEl.src = track.url;
        audioEl.volume = Number($('#ppVol').value) / 100;
        audioEl.play().catch(() => UI.toast('浏览器拦下了，再点一次'));
        playing = true;
      } else {
        startGen();
      }
      updateUI();
    }
  }

  function updateUI() {
    const disc = $('#disc');
    disc.classList.toggle('playing', playing);
    $('#ppPlayIcon').innerHTML = playing
      ? '<path d="M8.4 5.4h2.6v13.2H8.4zM13 5.4h2.6v13.2H13z"/>'
      : '<path d="M8 5.4v13.2L19 12 8 5.4Z"/>';
    $$('.pp-item').forEach((el, i) => el.classList.toggle('on', i === curIndex));
  }

  function renderList() {
    const box = $('#ppList');
    box.innerHTML = tracks().map((t, i) => `
      <div class="pp-item ${i === curIndex ? 'on' : ''}" data-i="${i}">
        <span>${esc(t.name)}</span>
        ${t.kind === 'audio' ? `<span class="x" data-del="${i}" title="移除">×</span>` : ''}
      </div>`).join('');

    $$('.pp-item', box).forEach((el) => {
      el.onclick = (e) => {
        if (e.target.dataset.del) return;
        playIndex(Number(el.dataset.i), true);
      };
    });
    $$('[data-del]', box).forEach((x) => {
      x.onclick = (e) => {
        e.stopPropagation();
        const idx = Number(x.dataset.del);
        const all = tracks();
        const track = all[idx];
        const impIdx = imported.indexOf(track);
        if (impIdx > -1) {
          URL.revokeObjectURL(track.url);
          imported.splice(impIdx, 1);
        }
        if (imported.length === 0 && curIndex >= GEN_TRACKS.length) playIndex(0, playing);
        else renderList();
      };
    });
  }

  /* ---------- 绑定 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const player = $('#player');
    const disc = $('#disc');

    disc.onclick = () => {
      const willOpen = !player.classList.contains('open');
      player.classList.toggle('open', willOpen);
      if (willOpen && !playing) toggle();
    };

    $('#ppPlay').onclick = (e) => { e.stopPropagation(); toggle(); };
    $('#ppPrev').onclick = (e) => { e.stopPropagation(); playIndex(curIndex - 1, playing); };
    $('#ppNext').onclick = (e) => { e.stopPropagation(); playIndex(curIndex + 1, playing); };
    $('#ppVol').oninput = setVolume;

    $('#ppFile').onchange = (e) => {
      Array.from(e.target.files || []).forEach((f) => {
        imported.push({
          id: Store.uid(),
          name: f.name.replace(/\.[^.]+$/, '').slice(0, 24),
          sub: '本地音频 · 这次打开有效',
          kind: 'audio',
          url: URL.createObjectURL(f)
        });
      });
      e.target.value = '';
      if (imported.length) {
        playIndex(GEN_TRACKS.length + imported.length - 1, true);
        UI.toast('加进播放列表了');
      }
      renderList();
    };

    // 点空白处收起面板
    document.addEventListener('click', (e) => {
      if (!player.contains(e.target)) player.classList.remove('open');
    });

    $('#ppVol').value = state.settings.volume || 55;
    const startIdx = Math.min(curIndex, GEN_TRACKS.length - 1);
    playIndex(startIdx, false);
    playing = false;
    updateUI();
    renderList();
  });

  window.addEventListener('beforeunload', () => {
    stopAll();
    imported.forEach((t) => URL.revokeObjectURL(t.url));
  });
})();
