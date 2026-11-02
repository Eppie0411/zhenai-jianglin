/* ===== 小游戏 ===== */
(function () {
  const { $, $$, esc } = U;
  const state = Store.state;

  const DIFFS = [
    { id: 'easy', name: '简单' },
    { id: 'normal', name: '普通' },
    { id: 'hard', name: '挑战' }
  ];

  const SYM = {
    cat: '<path d="M7.6 9.6 6.4 5.9l3.5 1.3M16.4 9.6l1.2-3.7-3.5 1.3"/><path d="M12 6.8c3.2 0 5.4 2.4 5.4 5.6S15.2 18 12 18s-5.4-2.2-5.4-5.6S8.8 6.8 12 6.8Z"/><path d="M10.2 11.6h.02M13.8 11.6h.02"/><path d="M11.2 13.6c.3.4.6.6 1 .6s.7-.2 1-.6"/>',
    star: '<path d="M12 4.2l2.4 5.1 5.6.7-4.1 3.9 1.1 5.6L12 16.8l-5 2.7 1.1-5.6L4 10l5.6-.7z"/>',
    moon: '<path d="M15.4 4.8a7.5 7.5 0 1 0 4.1 12.4 8.1 8.1 0 0 1-4.1-12.4z"/>',
    heart: '<path d="M12 19.2s-6.4-3.9-6.4-8.2A3.6 3.6 0 0 1 12 8.5a3.6 3.6 0 0 1 6.4 2.5c0 4.3-6.4 8.2-6.4 8.2z"/>',
    cloud: '<path d="M7.8 17.2a3.2 3.2 0 0 1-.4-6.4 4.6 4.6 0 0 1 8.7-1.2 3.4 3.4 0 0 1 1 6.8z"/>',
    fish: '<path d="M3.8 12c2.3-2.8 5-4.2 8.1-4.2 2.9 0 5.5 1.5 7.8 4.2-2.3 2.7-4.9 4.2-7.8 4.2-3.1 0-5.8-1.4-8.1-4.2z"/><path d="M4.6 12 3 14.4M4.6 12 3 9.6"/><path d="M14.4 11.4h.02"/>',
    leaf: '<path d="M5.4 18.6c0-6.6 4.3-10.9 13.2-11.3.6 7.5-3.8 12.1-10.4 12.1-.9 0-1.9 0-2.8-.8z"/><path d="M6.8 17.2c2.5-3.4 5.3-5.7 8.6-7"/>',
    spark: '<path d="M12 4.4c.7 3 2 4.3 5 5-3 .7-4.3 2-5 5-.7-3-2-4.3-5-5 3-.7 4.3-2 5-5Z"/>'
  };
  const SYM_KEYS = Object.keys(SYM);

  function best(key, fallback) {
    state.gameBest = state.gameBest || {};
    return state.gameBest[key] == null ? fallback : state.gameBest[key];
  }
  function setBest(key, value, higherBetter) {
    state.gameBest = state.gameBest || {};
    const cur = state.gameBest[key];
    const isBetter = cur == null || (higherBetter ? value > cur : value < cur);
    if (isBetter) {
      state.gameBest[key] = value;
      Store.save();
      return true;
    }
    return false;
  }

  let timers = [];
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function every(fn, ms) { const t = setInterval(fn, ms); timers.push(t); return t; }
  let rafId = null;
  function killAll() {
    timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timers = [];
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }
  function setCleanup(fn) { window.__cleanup = fn; }

  /* ================= 入口 ================= */
  route('games', function (view) {
    killAll();
    view.innerHTML = `
      <div class="page-head">
        <h2 class="page-title"><span class="dot"></span>小游戏</h2>
        <p class="page-desc">三个不用动脑的小东西，累了就玩一局。</p>
      </div>

      <div class="game-menu" id="gameMenu">
        <button class="game-tile" data-game="memory">
          <span class="gt-icon">${ICON.dice}</span>
          <span class="gt-name serif">记忆翻牌</span>
          <span class="gt-desc">找出成对的小图案</span>
          <span class="gt-best" data-best="memory">—</span>
        </button>
        <button class="game-tile" data-game="whack">
          <span class="gt-icon">${ICON.cat}</span>
          <span class="gt-name serif">点点小猫</span>
          <span class="gt-desc">猫猫冒头的时候点它</span>
          <span class="gt-best" data-best="whack">—</span>
        </button>
        <button class="game-tile" data-game="catch">
          <span class="gt-icon">${ICON.star}</span>
          <span class="gt-name serif">接住星星</span>
          <span class="gt-desc">左右移动小碗</span>
          <span class="gt-best" data-best="catch">—</span>
        </button>
      </div>

      <div id="gameStage"></div>
    `;

    refreshBest();
    function refreshBest() {
      const m = best('memory_easy', null);
      $('[data-best=memory]').textContent = m ? '最好 ' + m + ' 步' : '还没玩过';
      $('[data-best=whack]').textContent = best('whack_easy', null) ? '最好 ' + best('whack_easy') + ' 分' : '还没玩过';
      $('[data-best=catch]').textContent = best('catch_easy', null) ? '最好 ' + best('catch_easy') + ' 分' : '还没玩过';
    }

    $$('.game-tile').forEach((t) => {
      t.onclick = () => startGame(t.dataset.game);
    });
  });

  let stage = null;
  let diff = 'easy';

  function startGame(kind) {
    stage = $('#gameStage');
    diff = 'easy';
    const titles = { memory: '记忆翻牌', whack: '点点小猫', catch: '接住星星' };
    stage.innerHTML = `
      <div class="panel game-panel">
        <div class="row between" style="margin-bottom:16px">
          <div class="row" style="gap:10px">
            <button class="btn ghost sm" id="gBack">‹ 换一个</button>
            <span class="serif" style="font-size:16px;letter-spacing:.08em">${titles[kind]}</span>
          </div>
          <div class="chips" id="gDiff">
            ${DIFFS.map((d) => `<button class="chip ${d.id === diff ? 'on' : ''}" data-d="${d.id}">${d.name}</button>`).join('')}
          </div>
        </div>
        <div id="gBody"></div>
      </div>
    `;
    $('#gBack').onclick = () => { killAll(); render(1); };
    $('#gDiff').onclick = (e) => {
      const b = e.target.closest('[data-d]');
      if (!b) return;
      diff = b.dataset.d;
      $$('#gDiff .chip').forEach((c) => c.classList.toggle('on', c === b));
      mount(kind);
    };
    mount(kind);
  }

  function mount(kind) {
    killAll();
    setCleanup(killAll);
    const body = $('#gBody');
    if (kind === 'memory') memory(body);
    else if (kind === 'whack') whack(body);
    else catchGame(body);
  }

  /* ================= 记忆翻牌 ================= */
  function memory(body) {
    const config = {
      easy: { pairs: 4, cols: 4 },
      normal: { pairs: 6, cols: 4 },
      hard: { pairs: 8, cols: 4 }
    }[diff];

    const syms = U.shuffle(SYM_KEYS).slice(0, config.pairs);
    const deck = U.shuffle(syms.concat(syms)).map((s) => ({ sym: s, done: false }));
    let first = null, second = null, lock = false, moves = 0, matched = 0, started = 0, timerId = null;

    body.innerHTML = `
      <div class="g-hud">
        <span>步数 <b id="mMoves">0</b></span>
        <span>配对 <b id="mMatched">0</b>/${config.pairs}</span>
        <span>用时 <b id="mTime">0s</b></span>
        <span class="spacer"></span>
        <button class="btn ghost sm" id="mReset">重来</button>
      </div>
      <div class="mem-grid" id="memGrid" style="grid-template-columns:repeat(${config.cols},1fr)">
        ${deck.map((c, i) => `
          <button class="mem-card" data-i="${i}">
            <span class="mc-inner">
              <span class="mc-back">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="5.6" r=".9"/><circle cx="12" cy="18.4" r=".9"/><circle cx="5.6" cy="12" r=".9"/><circle cx="18.4" cy="12" r=".9"/></svg>
              </span>
              <span class="mc-front"><svg viewBox="0 0 24 24">${SYM[c.sym]}</svg></span>
            </span>
          </button>`).join('')}
      </div>
    `;

    const grid = $('#memGrid');
    const cards = $$('.mem-card', grid);

    function tick() {
      $('#mTime').textContent = Math.floor((Date.now() - started) / 1000) + 's';
    }

    cards.forEach((card) => {
      card.onclick = () => {
        const i = Number(card.dataset.i);
        if (lock || deck[i].done || card.classList.contains('flip')) return;
        if (!started) { started = Date.now(); timerId = every(tick, 300); }
        card.classList.add('flip');
        if (!first) { first = { i, card }; return; }
        second = { i, card };
        moves++;
        $('#mMoves').textContent = moves;
        const a = deck[first.i], b = deck[second.i];
        if (a.sym === b.sym) {
          a.done = b.done = true;
          matched++;
          $('#mMatched').textContent = matched;
          first.card.classList.add('done');
          second.card.classList.add('done');
          first = second = null;
          if (matched === config.pairs) win();
        } else {
          lock = true;
          const f1 = first.card, f2 = second.card;
          first = second = null;
          later(() => {
            f1.classList.remove('flip');
            f2.classList.remove('flip');
            lock = false;
          }, 620);
        }
      };
    });

    function win() {
      clearInterval(timerId);
      const sec = Math.floor((Date.now() - started) / 1000);
      const record = setBest('memory_' + diff, moves, false);
      later(() => {
        UI.modal({
          title: '全部配对了',
          content: `<p class="muted" style="margin:0 0 8px">${moves} 步 · ${sec} 秒</p>
            <p class="serif" style="font-size:16px;margin:0">${record ? '新记录，好厉害。' : '稳稳地收下了。'}</p>`,
          buttons: [{ label: '再来一局', cls: 'primary', action: (close) => { close(); memory(body); } }]
        });
      }, 420);
    }

    $('#mReset').onclick = () => memory(body);
  }

  /* ================= 点点小猫 ================= */
  function whack(body) {
    const config = {
      easy: { show: 1050, gap: 620, total: 30 },
      normal: { show: 780, gap: 460, total: 30 },
      hard: { show: 600, gap: 330, total: 30 }
    }[diff];

    let score = 0, left = config.total, running = false;
    let active = -1;

    body.innerHTML = `
      <div class="g-hud">
        <span>得分 <b id="wScore">0</b></span>
        <span>剩余 <b id="wTime">${config.total}</b>s</span>
        <span class="spacer"></span>
        <button class="btn ghost sm" id="wStart">开始</button>
      </div>
      <div class="whack-grid" id="whackGrid">
        ${Array.from({ length: 9 }).map((_, i) => `
          <button class="hole" data-i="${i}">
            <span class="hole-cat">${ICON.cat}</span>
            <span class="hole-rim"></span>
          </button>`).join('')}
      </div>
      <p class="muted" style="text-align:center;margin:12px 0 0">点开就开始，${config.total} 秒内看你能戳到几只。</p>
    `;

    const holes = $$('.hole', body);

    function startTimer() {
      running = true;
      every(() => {
        left--;
        $('#wTime').textContent = Math.max(0, left);
        if (left <= 0) endGame();
      }, 1000);
      spawn();
    }

    function spawn() {
      if (!running) return;
      holes.forEach((h) => h.classList.remove('up'));
      active = Math.floor(Math.random() * holes.length);
      const hole = holes[active];
      hole.classList.add('up');
      const id = active;
      later(() => {
        if (active === id) {
          hole.classList.remove('up');
          active = -1;
        }
      }, Math.min(config.show, config.gap - 40));
      later(spawn, config.gap + Math.random() * 260);
    }

    holes.forEach((hole) => {
      hole.onclick = () => {
        if (!running) return;
        if (hole.classList.contains('up')) {
          score++;
          $('#wScore').textContent = score;
          hole.classList.remove('up');
          hole.classList.add('pop');
          later(() => hole.classList.remove('pop'), 260);
          active = -1;
          // 偶尔立刻冒头，手感更快
          if (diff !== 'easy' && Math.random() < 0.4) { later(spawn, 200); }
        }
      };
    });

    function endGame() {
      running = false;
      killAll();
      const record = setBest('whack_' + diff, score, true);
      UI.modal({
        title: '时间到',
        content: `<p class="muted" style="margin:0 0 8px">戳到了 ${score} 只猫猫</p>
          <p class="serif" style="font-size:16px;margin:0">${record ? '新记录，猫猫都怕你。' : '再来一局？'}</p>`,
        buttons: [{ label: '再来', cls: 'primary', action: (close) => { close(); whack(body); } }]
      });
    }

    $('#wStart').onclick = (e) => {
      if (running) return;
      e.target.textContent = '进行中';
      e.target.disabled = true;
      startTimer();
    };
  }

  /* ================= 接住星星 ================= */
  function catchGame(body) {
    const config = {
      easy: { speed: [55, 95], spawn: 900, total: 30 },
      normal: { speed: [85, 135], spawn: 700, total: 30 },
      hard: { speed: [125, 185], spawn: 540, total: 30 }
    }[diff];

    let score = 0, missed = 0, left = config.total, running = false;
    let catcherX = 0, targetX = 0, W = 0, H = 300;
    const stars = [];

    body.innerHTML = `
      <div class="g-hud">
        <span>接住 <b id="cScore">0</b></span>
        <span>漏掉 <b id="cMiss">0</b></span>
        <span>剩余 <b id="cTime">${config.total}</b>s</span>
        <span class="spacer"></span>
        <button class="btn ghost sm" id="cStart">开始</button>
      </div>
      <div class="catch-stage" id="catchStage">
        <div class="catch-hint" id="cHint">点开始，然后用鼠标或手指左右移动</div>
        <div class="catcher" id="catcher">
          <svg viewBox="0 0 60 34"><path d="M4 6h52c0 15-11.6 24-26 24S4 21 4 6Z"/><path d="M4 6c8 4 44 4 52 0"/></svg>
        </div>
      </div>
    `;

    const stageEl = $('#catchStage');
    const catcher = $('#catcher');
    const hint = $('#cHint');

    function measure() {
      const r = stageEl.getBoundingClientRect();
      W = r.width; H = r.height;
      catcherX = W / 2; targetX = catcherX;
      positionCatcher();
    }

    function positionCatcher() {
      catcher.style.transform = 'translate(' + (catcherX - 34) + 'px, 0)';
    }

    function pointerMove(e) {
      const r = stageEl.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      targetX = Math.max(20, Math.min(W - 20, x));
    }

    function loop() {
      catcherX += (targetX - catcherX) * 0.25;
      positionCatcher();
      stars.forEach((s) => {
        s.y += s.vy / 60;
        s.el.style.transform = 'translate(' + (s.x - 10) + 'px,' + s.y + 'px) rotate(' + s.rot + 'deg)';
        if (s.y > H - 30) {
          if (Math.abs(s.x - catcherX) < 40) {
            score++; $('#cScore').textContent = score;
            s.el.classList.add('caught');
          } else {
            missed++; $('#cMiss').textContent = missed;
            s.el.classList.add('gone');
          }
          later(() => s.el.remove(), 340);
          s.dead = true;
        }
      });
      for (let i = stars.length - 1; i >= 0; i--) if (stars[i].dead) stars.splice(i, 1);
      rafId = requestAnimationFrame(loop);
    }

    function spawnStar() {
      if (!running) return;
      const el = document.createElement('div');
      el.className = 'falling-star';
      el.innerHTML = `<svg viewBox="0 0 24 24">${SYM.star}</svg>`;
      stageEl.appendChild(el);
      stars.push({
        el,
        x: 26 + Math.random() * Math.max(1, W - 52),
        y: -24,
        vy: config.speed[0] + Math.random() * (config.speed[1] - config.speed[0]),
        rot: Math.random() * 40 - 20,
        dead: false
      });
      later(spawnStar, config.spawn + Math.random() * 320);
    }

    function start() {
      running = true;
      hint.style.opacity = '0';
      measure();
      stageEl.addEventListener('mousemove', pointerMove);
      stageEl.addEventListener('touchmove', pointerMove, { passive: true });
      $('#cStart').disabled = true;
      $('#cStart').textContent = '进行中';
      rafId = requestAnimationFrame(loop);
      spawnStar();
      every(() => {
        left--;
        $('#cTime').textContent = Math.max(0, left);
        if (left <= 0) endGame();
      }, 1000);
    }

    function endGame() {
      running = false;
      killAll();
      const record = setBest('catch_' + diff, score, true);
      UI.modal({
        title: '时间到',
        content: `<p class="muted" style="margin:0 0 8px">接住 ${score} 颗，漏掉 ${missed} 颗</p>
          <p class="serif" style="font-size:16px;margin:0">${record ? '新记录，星星都往你这儿掉。' : '再来一局？'}</p>`,
        buttons: [{ label: '再来', cls: 'primary', action: (close) => { close(); catchGame(body); } }]
      });
    }

    $('#cStart').onclick = start;
    setTimeout(measure, 30);
    window.addEventListener('resize', measure);
    setCleanup(() => { killAll(); window.removeEventListener('resize', measure); });
  }
})();
