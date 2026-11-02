/* ===== 每日记账 ===== */
(function () {
  const { $, $$, esc, fmtDate, today, money } = U;
  const state = Store.state;

  let ym = today().slice(0, 7);
  let formType = 'out';
  let formCat = '餐饮';

  function entriesOfMonth() {
    return state.ledger.entries
      .filter((e) => e.date.slice(0, 7) === ym)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  function ymLabel(v) {
    const [y, m] = v.split('-');
    return y + ' 年 ' + Number(m) + ' 月';
  }

  function shiftMonth(delta) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    render();
  }

  function cats() {
    return formType === 'out' ? state.ledger.cats : state.ledger.incomeCats;
  }

  function render() {
    const view = $('#view');
    view.innerHTML = '';
    const list = entriesOfMonth();
    const out = list.filter((e) => e.type === 'out').reduce((n, e) => n + Number(e.amount || 0), 0);
    const inc = list.filter((e) => e.type === 'in').reduce((n, e) => n + Number(e.amount || 0), 0);
    const bal = inc - out;

    if (!cats().includes(formCat)) formCat = cats()[0];

    view.innerHTML = `
      <div class="page-head">
        <h2 class="page-title"><span class="dot"></span>每日记账</h2>
        <p class="page-desc">今天花的每一笔，都是给喜欢的东西投票。</p>
      </div>

      <div class="panel">
        <div class="row form-row">
          <div class="field f-date">
            <label>日期</label>
            <input class="input" type="date" id="fDate" value="${today()}" max="2099-12-31" />
          </div>
          <div class="field f-amount">
            <label>金额</label>
            <input class="input" id="fAmount" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00" />
          </div>
          <div class="field f-note">
            <label>备注</label>
            <input class="input" id="fNote" placeholder="买了什么，随便写" />
          </div>
          <button class="btn primary form-submit" id="fAdd">记一笔</button>
        </div>
        <div class="divider"></div>
        <div class="row" style="justify-content:space-between; align-items:flex-start">
          <div class="chips" id="typeChips">
            <button class="chip ${formType === 'out' ? 'on' : ''}" data-t="out">支出</button>
            <button class="chip ${formType === 'in' ? 'on' : ''}" data-t="in">收入</button>
          </div>
          <div class="chips" id="catChips">
            ${cats().map((c) => `<button class="chip ${c === formCat ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}
            <button class="chip" id="addCat" title="新增分类">＋ 分类</button>
          </div>
        </div>
      </div>

      <div class="ledger-grid">
        <div class="panel">
          <div class="row between" style="margin-bottom:6px">
            <div class="row" style="gap:4px">
              <button class="btn ghost sm" id="prevM">‹</button>
              <span class="serif" style="font-size:15px;letter-spacing:.06em">${ymLabel(ym)}</span>
              <button class="btn ghost sm" id="nextM">›</button>
            </div>
            <span class="muted">${list.length} 笔</span>
          </div>
          <div class="sum-row">
            <div class="sum"><span>支出</span><b>${money(out)}</b></div>
            <div class="sum"><span>收入</span><b>${money(inc)}</b></div>
            <div class="sum"><span>结余</span><b class="${bal < 0 ? 'neg' : ''}">${bal < 0 ? '-' : ''}${money(Math.abs(bal))}</b></div>
          </div>
          <div class="dashed"></div>
          <div id="entryList"></div>
        </div>

        <div class="panel">
          <span class="mini-label">这个月花在哪</span>
          <div id="catChart" style="margin-top:14px"></div>
          <div class="dashed"></div>
          <span class="mini-label">最近 7 天</span>
          <div id="dayChart" class="day-chart" style="margin-top:12px"></div>
        </div>
      </div>
    `;

    /* 记录列表 */
    const box = $('#entryList');
    if (!list.length) {
      box.innerHTML = `<div class="empty">这个月还没有记录<br/>从第一笔开始吧</div>`;
    } else {
      const groups = {};
      list.forEach((e) => { (groups[e.date] = groups[e.date] || []).push(e); });
      box.innerHTML = Object.keys(groups).sort().reverse().map((date) => {
        const items = groups[date];
        const dayOut = items.filter((e) => e.type === 'out').reduce((n, e) => n + Number(e.amount), 0);
        return `
          <div class="day-group">
            <div class="day-head">
              <span class="serif">${fmtDate(date, true)}</span>
              <span class="muted">${U.relDays(date)}${dayOut ? ' · 支出 ' + money(dayOut) : ''}</span>
            </div>
            ${items.map((e) => `
              <div class="entry" data-id="${e.id}">
                <span class="entry-cat">${esc(e.cat)}</span>
                <span class="entry-note">${esc(e.note || '')}</span>
                <span class="entry-amt ${e.type === 'in' ? 'in' : ''}">${e.type === 'in' ? '+' : '-'}${money(e.amount)}</span>
                <button class="mini-x" data-del="${e.id}" title="删掉">${ICON.trash}</button>
              </div>`).join('')}
          </div>`;
      }).join('');
      $$('[data-del]', box).forEach((b) => {
        b.onclick = () => {
          state.ledger.entries = state.ledger.entries.filter((x) => x.id !== b.dataset.del);
          Store.save();
          render();
        };
      });
    }

    /* 分类统计 */
    const byCat = {};
    list.filter((e) => e.type === 'out').forEach((e) => {
      byCat[e.cat] = (byCat[e.cat] || 0) + Number(e.amount);
    });
    const catArr = Object.keys(byCat).map((k) => [k, byCat[k]]).sort((a, b) => b[1] - a[1]);
    const maxCat = catArr.length ? catArr[0][1] : 0;
    $('#catChart').innerHTML = catArr.length ? catArr.map(([k, v]) => `
      <div class="bar-row">
        <span class="bar-name">${esc(k)}</span>
        <span class="bar-track"><i style="width:${maxCat ? (v / maxCat) * 100 : 0}%"></i></span>
        <span class="bar-val">${money(v)}</span>
      </div>`).join('') : `<p class="muted" style="margin:0">还没有支出</p>`;

    /* 7 天 */
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = U.ymd(d);
      const sum = state.ledger.entries
        .filter((e) => e.date === key && e.type === 'out')
        .reduce((n, e) => n + Number(e.amount), 0);
      days.push({ key, sum, label: String(d.getDate()) });
    }
    const maxDay = Math.max(1, ...days.map((d) => d.sum));
    $('#dayChart').innerHTML = days.map((d) => `
      <div class="day-col" title="${d.key} · ${money(d.sum)}">
        <span class="day-bar" style="height:${Math.max(3, (d.sum / maxDay) * 100)}%"><i></i></span>
        <span class="day-num">${d.label}</span>
      </div>`).join('');

    /* 交互 */
    $('#prevM').onclick = () => shiftMonth(-1);
    $('#nextM').onclick = () => shiftMonth(1);

    $('#typeChips').onclick = (e) => {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      formType = b.dataset.t;
      formCat = cats()[0];
      render();
    };
    $('#catChips').onclick = (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      formCat = b.dataset.c;
      $$('#catChips .chip').forEach((c) => c.classList.toggle('on', c === b));
    };
    $('#addCat').onclick = () => {
      UI.prompt('新增分类', [{ name: 'name', label: '分类名', placeholder: '比如：奶茶、手账、会员' }], (d) => {
        const name = d.name.trim();
        if (!name) return false;
        const arr = formType === 'out' ? state.ledger.cats : state.ledger.incomeCats;
        if (!arr.includes(name)) arr.push(name);
        formCat = name;
        Store.save();
        render();
      }, '加上');
    };

    const addEntry = () => {
      const date = $('#fDate').value || today();
      const amount = parseFloat($('#fAmount').value);
      const note = $('#fNote').value.trim();
      if (!amount || amount <= 0) { UI.toast('金额写一下嘛'); return; }
      state.ledger.entries.unshift({
        id: Store.uid(), date, amount, type: formType, cat: formCat, note
      });
      Store.save();
      if (date.slice(0, 7) !== ym) ym = date.slice(0, 7);
      render();
      UI.toast(formType === 'out' ? '记下了 -' + money(amount) : '记下了 +' + money(amount));
    };
    $('#fAdd').onclick = addEntry;
    $('#fAmount').onkeydown = (e) => { if (e.key === 'Enter') addEntry(); };
    $('#fNote').onkeydown = (e) => { if (e.key === 'Enter') addEntry(); };
  }

  route('ledger', render);
})();
