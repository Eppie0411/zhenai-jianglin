/* ===== 游戏日常 ===== */
(function () {
  const { $, $$, esc, today, fmtDate } = U;
  const state = Store.state;

  let filterGame = '';

  route('gamelog', function (view) {
    const games = {};
    state.gamelog.entries.forEach((e) => {
      games[e.game] = games[e.game] || { count: 0, last: '' };
      games[e.game].count++;
      if (e.date > games[e.game].last) games[e.game].last = e.date;
    });
    const gameNames = Object.keys(games).sort((a, b) => games[b].count - games[a].count);

    view.innerHTML = `
      <div class="page-head">
        <h2 class="page-title"><span class="dot"></span>游戏日常</h2>
        <p class="page-desc">今天刷到哪儿了、抽到了什么，都值得记一笔。</p>
      </div>

      <div class="panel">
        <div class="row form-row">
          <div class="field f-date">
            <label>日期</label>
            <input class="input" type="date" id="gDate" value="${today()}" />
          </div>
          <div class="field f-amount">
            <label>游戏</label>
            <input class="input" id="gGame" list="gameList" placeholder="游戏名" />
            <datalist id="gameList">${gameNames.map((g) => `<option value="${esc(g)}"></option>`).join('')}</datalist>
          </div>
          <div class="field f-event">
            <label>今天做了什么</label>
            <input class="input" id="gEvent" placeholder="通关第四章 / 抽到 SSR / 挖了一天矿" />
          </div>
          <div class="field f-note">
            <label>备注</label>
            <input class="input" id="gNote" placeholder="可留空" />
          </div>
          <button class="btn primary form-submit" id="gAdd">记下</button>
        </div>
      </div>

      <div class="section-label">在玩的</div>
      <div class="game-cards" id="gameCards"></div>

      <div class="panel" style="margin-top:16px">
        <div class="row between" style="margin-bottom:14px">
          <span class="mini-label">时间线</span>
          <div class="chips" id="gameFilter"></div>
        </div>
        <div id="logList"></div>
      </div>
    `;

    function statsByGame() {
      const m = {};
      state.gamelog.entries.forEach((e) => {
        m[e.game] = m[e.game] || { count: 0, last: '' };
        m[e.game].count++;
        if (e.date > m[e.game].last) m[e.game].last = e.date;
      });
      return m;
    }

    function gameNamesNow() {
      return Object.keys(statsByGame()).sort((a, b) => statsByGame()[b].count - statsByGame()[a].count);
    }

    function renderCards() {
      const box = $('#gameCards');
      const stats = statsByGame();
      const names = gameNamesNow();
      if (!names.length) {
        box.innerHTML = `<div class="empty" style="grid-column:1/-1">还没有记录，先记一条吧</div>`;
        return;
      }
      box.innerHTML = names.map((g) => `
        <div class="game-card ${filterGame === g ? 'on' : ''}" data-g="${esc(g)}">
          <span class="gc-icon">${ICON.gamepad}</span>
          <span class="gc-name">${esc(g)}</span>
          <span class="gc-meta">${stats[g].count} 条 · 最近 ${U.relDays(stats[g].last)}</span>
        </div>`).join('');
      $$('.game-card', box).forEach((c) => {
        c.onclick = () => {
          filterGame = filterGame === c.dataset.g ? '' : c.dataset.g;
          renderCards(); renderFilter(); renderList();
        };
      });
    }

    function renderFilter() {
      $('#gameFilter').innerHTML = `
        <button class="chip ${!filterGame ? 'on' : ''}" data-g="">全部</button>
        ${gameNamesNow().map((g) => `<button class="chip ${filterGame === g ? 'on' : ''}" data-g="${esc(g)}">${esc(g)}</button>`).join('')}`;
      $$('#gameFilter .chip').forEach((b) => {
        b.onclick = () => {
          filterGame = b.dataset.g;
          renderCards(); renderFilter(); renderList();
        };
      });
    }

    function renderList() {
      const box = $('#logList');
      let list = state.gamelog.entries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.ts - b.ts));
      if (filterGame) list = list.filter((e) => e.game === filterGame);
      if (!list.length) {
        box.innerHTML = `<div class="empty">这里空空的</div>`;
        return;
      }
      const groups = {};
      list.forEach((e) => { (groups[e.date] = groups[e.date] || []).push(e); });
      box.innerHTML = Object.keys(groups).sort().reverse().map((date) => `
        <div class="day-group">
          <div class="day-head">
            <span class="serif">${fmtDate(date, true)}</span>
            <span class="muted">${U.relDays(date)}</span>
          </div>
          ${groups[date].map((e) => `
            <div class="entry log-entry">
              <span class="entry-cat game-tag">${esc(e.game)}</span>
              <span class="entry-note"><b style="font-weight:600">${esc(e.event)}</b>${e.note ? ' · ' + esc(e.note) : ''}</span>
              <button class="mini-x" data-del="${e.id}" title="删掉">${ICON.trash}</button>
            </div>`).join('')}
        </div>`).join('');

      $$('[data-del]', box).forEach((b) => {
        b.onclick = () => {
          state.gamelog.entries = state.gamelog.entries.filter((x) => x.id !== b.dataset.del);
          Store.save();
          render();
        };
      });
    }

    function render() {
      renderCards(); renderFilter(); renderList();
    }

    $('#gAdd').onclick = () => {
      const game = $('#gGame').value.trim();
      const event = $('#gEvent').value.trim();
      const date = $('#gDate').value || today();
      if (!game) { UI.toast('写一下游戏名'); return; }
      if (!event) { UI.toast('今天做了什么呢'); return; }
      state.gamelog.entries.unshift({
        id: Store.uid(), date, game, event, note: $('#gNote').value.trim(), ts: Date.now()
      });
      Store.save();
      if (!gameNames.includes(game)) gameNames.push(game);
      const dl = $('#gameList');
      if (dl && ![...dl.options].some((o) => o.value === game)) {
        const op = document.createElement('option');
        op.value = game;
        dl.appendChild(op);
      }
      $('#gEvent').value = ''; $('#gNote').value = '';
      renderCards(); renderFilter(); renderList();
      UI.toast('记下了');
    };
    ['#gGame', '#gEvent', '#gNote'].forEach((sel) => {
      $(sel).onkeydown = (e) => { if (e.key === 'Enter') $('#gAdd').click(); };
    });

    renderCards();
    renderFilter();
    renderList();
  });
})();
