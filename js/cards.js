/* ===== 字卡传讯 ===== */
(function () {
  const { $, $$, esc, fmtTime } = U;
  const state = Store.state;
  const TYPES = ['能量', '答案', '对话'];
  const TYPE_TITLE = { 能量: '给一点能量', 答案: '一个答案', 对话: 'ta 在跟你说话' };
  const COLORS = [
    { id: 'rose', name: '玫' },
    { id: 'lilac', name: '紫' },
    { id: 'sky', name: '蓝' },
    { id: 'matcha', name: '绿' },
    { id: 'sand', name: '沙' }
  ];

  let selId = null;
  let filter = '全部';

  function chars() { return state.cards.characters; }
  function current() {
    if (!chars().length) return null;
    if (!selId || !chars().some((c) => c.id === selId)) selId = chars()[0].id;
    return chars().find((c) => c.id === selId);
  }

  function pool() {
    const ch = current();
    if (!ch) return [];
    const list = filter === '全部' ? ch.cards : ch.cards.filter((c) => c.type === filter);
    return list.map((c) => Object.assign({ char: ch.name, charId: ch.id }, c));
  }

  route('cards', function (view) {
    const ch = current();

    view.innerHTML = `
      <div class="page-head">
        <h2 class="page-title"><span class="dot"></span>字卡传讯</h2>
        <p class="page-desc">给喜欢的角色建一个专属字卡库，想 ta 的时候抽一张。</p>
      </div>

      <div class="cards-layout">
        <aside class="char-col">
          <div class="row between" style="margin-bottom:10px">
            <span class="mini-label">角色</span>
            <button class="btn ghost sm" id="addChar">${ICON.plus} 新建</button>
          </div>
          <div class="char-list" id="charList"></div>
          <p class="muted" style="margin:12px 2px 0; line-height:1.7">每位角色都有独立的一套字卡，抽卡不会串台。</p>
        </aside>

        <section class="draw-col">
          <div class="panel draw-panel">
            <div class="row between" style="margin-bottom:16px">
              <div class="chips" id="typeChips">
                ${['全部'].concat(TYPES).map((t) => `<button class="chip ${t === filter ? 'on' : ''}" data-type="${t}">${t}</button>`).join('')}
              </div>
              <span class="muted" id="poolInfo"></span>
            </div>

            <div class="draw-stage" id="drawStage">
              <div class="ghost-card g1"></div>
              <div class="ghost-card g2"></div>
              <div class="draw-card" id="drawCard">
                <div class="dc-face dc-back">
                  <div class="dc-face-inner">
                    <div class="dc-icon">${ICON.cat}</div>
                    <div class="dc-brand serif" id="dcBackName">${esc(ch ? ch.name : '')}</div>
                    <div class="dc-hint">点下面的按钮抽一张</div>
                  </div>
                </div>
                <div class="dc-face dc-front">
                  <div class="dc-face-inner">
                    <div class="dc-type" id="dcType"></div>
                    <p class="dc-text serif" id="dcText">今天想说点什么？</p>
                    <div class="dc-from" id="dcFrom"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="draw-actions">
              <button class="btn primary" id="drawBtn">抽一张字卡</button>
              <button class="btn ghost sm" id="backBtn" hidden>翻回去</button>
            </div>

            <div class="reply-box" id="replyBox" hidden>
              <label class="mini-label">接住这句话，回一句（可不填）</label>
              <div class="row">
                <input class="input" id="replyInput" placeholder="想对 ta 说的话……" />
                <button class="btn soft sm" id="replySave">存进记录</button>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="row between" style="margin-bottom:14px">
              <span class="mini-label">字卡库 · ${ch ? esc(ch.name) : '—'} <em id="cardCount" style="font-style:normal;color:var(--ink-soft)">${ch ? ch.cards.length : 0} 张</em></span>
              <div class="row" style="gap:6px">
                <button class="btn sm" id="bulkAdd">批量录入</button>
                <button class="btn soft sm" id="addCard">${ICON.plus} 加一张</button>
              </div>
            </div>
            <div id="cardList"></div>
          </div>

          <div class="panel">
            <div class="row between" style="margin-bottom:12px">
              <span class="mini-label">抽卡记录</span>
              <button class="btn ghost sm" id="clearHistory">清空</button>
            </div>
            <div id="historyList"></div>
          </div>
        </section>
      </div>
    `;

    /* --- 角色列表 --- */
    function renderChars() {
      const list = $('#charList');
      const cur = current();
      if (!chars().length) {
        list.innerHTML = `<div class="empty" style="padding:22px 12px">还没有角色<br/>先建一个吧</div>`;
        return;
      }
      list.innerHTML = chars().map((c) => `
        <div class="char-item ${cur && c.id === cur.id ? 'on' : ''}" data-id="${c.id}">
          <span class="char-dot" data-color="${c.color || 'rose'}"></span>
          <span class="char-name">${esc(c.name)}</span>
          <span class="char-num">${c.cards.length}</span>
          <button class="char-more" data-menu="${c.id}" title="角色设置" aria-label="角色设置">${ICON.pencil}</button>
        </div>`).join('');

      $$('.char-item', list).forEach((item) => {
        item.onclick = (e) => {
          if (e.target.closest('[data-menu]')) return;
          selId = item.dataset.id;
          renderChars();
          renderPool();
          resetCard();
        };
      });
      $$('[data-menu]', list).forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          charMenu(btn.dataset.menu);
        };
      });
    }

    /* --- 字卡列表 --- */
    function renderCards() {
      const ch = current();
      const list = $('#cardList');
      const cnt = $('#cardCount');
      if (cnt) cnt.textContent = (ch ? ch.cards.length : 0) + ' 张';
      if (!ch || !ch.cards.length) {
        list.innerHTML = `<div class="empty"><div class="eicon">${ICON.card}</div>这里还没字卡，加一张试试</div>`;
        return;
      }
      list.innerHTML = ch.cards.map((c) => `
        <div class="card-row" data-id="${c.id}" title="点一下改这张卡">
          <span class="tag tag-${c.type}">${esc(c.type)}</span>
          <span class="card-row-text">${esc(c.text)}</span>
          <button class="mini-x" data-edit="${c.id}" title="编辑" aria-label="编辑">${ICON.pencil}</button>
          <button class="mini-x danger" data-del="${c.id}" title="删掉" aria-label="删掉">${ICON.trash}</button>
        </div>`).join('');

      $$('.card-row', list).forEach((row) => {
        row.onclick = (e) => {
          if (e.target.closest('[data-del]')) return;
          editCard(row.dataset.id);
        };
      });
      $$('[data-del]', list).forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          const id = b.dataset.del;
          const card = ch.cards.find((x) => x.id === id);
          const preview = card && card.text.length > 18 ? card.text.slice(0, 18) + '…' : (card ? card.text : '');
          UI.confirm('删掉这张字卡？「' + preview + '」', () => {
            ch.cards = ch.cards.filter((x) => x.id !== id);
            Store.save();
            renderCards();
            renderPool();
            renderChars();
            UI.toast('删掉了');
          }, '删掉');
        };
      });
    }

    /* --- 抽卡记录 --- */
    function renderHistory() {
      const box = $('#historyList');
      const h = state.cards.history;
      if (!h.length) {
        box.innerHTML = `<div class="empty" style="padding:24px">还没有抽过卡</div>`;
        return;
      }
      box.innerHTML = h.slice(0, 12).map((it) => `
        <div class="history-row">
          <span class="h-char">${esc(it.char)}</span>
          <span class="h-text">${esc(it.text)}</span>
          ${it.reply ? `<span class="h-reply">你：${esc(it.reply)}</span>` : ''}
          <span class="h-time">${fmtTime(it.ts)}</span>
        </div>`).join('');
    }

    function renderPool() {
      const n = pool().length;
      const info = $('#poolInfo');
      if (info) info.textContent = filter === '全部' ? `共 ${n} 张` : `${filter} · ${n} 张`;
      $('#drawBtn').disabled = n === 0;
      const cur = current();
      const bn = $('#dcBackName');
      if (bn) bn.textContent = cur ? cur.name : '';
    }

    /* --- 抽卡 --- */
    let flipped = false;
    let currentHit = null;

    function resetCard() {
      flipped = false;
      currentHit = null;
      const card = $('#drawCard');
      card.classList.remove('flipped');
      $('#replyBox').hidden = true;
      $('#backBtn').hidden = true;
      $('#dcText').textContent = '今天想说点什么？';
      $('#dcFrom').textContent = '';
      $('#dcType').textContent = '';
    }

    function doDraw() {
      const list = pool();
      if (!list.length) {
        UI.toast(filter === '全部' ? '这个角色的字卡库是空的' : '这一类的字卡还没有');
        return;
      }
      const hit = U.pick(list);
      currentHit = hit;
      const card = $('#drawCard');

      const reveal = () => {
        $('#dcType').textContent = TYPE_TITLE[hit.type] || hit.type;
        $('#dcText').textContent = hit.text;
        $('#dcFrom').textContent = '—— ' + hit.char;
        $('#dcType').dataset.type = hit.type;
        card.classList.add('flipped');
        card.animate(
          [{ transform: 'rotateY(0deg) rotateZ(-1.5deg)' }, { transform: 'rotateY(0deg) rotateZ(0)' }],
          { duration: 500, easing: 'ease-out' }
        );
        flipped = true;
        $('#backBtn').hidden = false;
        if (hit.type === '对话') {
          $('#replyBox').hidden = false;
        } else {
          $('#replyBox').hidden = true;
        }
        state.cards.history.unshift({
          id: Store.uid(), text: hit.text, char: hit.char, type: hit.type, ts: Date.now()
        });
        state.cards.history = state.cards.history.slice(0, 80);
        Store.save();
        renderHistory();
      };

      if (flipped) {
        card.classList.remove('flipped');
        flipped = false;
        setTimeout(reveal, 380);
      } else {
        setTimeout(reveal, 120);
      }
    }

    /* --- 增删改 --- */
    function charMenu(id) {
      const c = chars().find((x) => x.id === id);
      if (!c) return;
      let color = c.color || 'rose';

      const box = document.createElement('div');
      box.className = 'set-grid';
      box.innerHTML = `
        <div class="field">
          <label>称呼</label>
          <input class="input" name="name" value="${esc(c.name)}" placeholder="ta 的名字" maxlength="16" />
        </div>
        <div class="field">
          <label>列表里的小圆点颜色</label>
          <div class="chips" id="colorChips">
            ${COLORS.map((col) => `
              <button class="chip ${col.id === color ? 'on' : ''}" data-color-id="${col.id}">
                <span class="char-dot" data-color="${col.id}"></span>${col.name}
              </button>`).join('')}
          </div>
        </div>
        <div class="divider"></div>
        <div class="row between">
          <span class="muted">已有 ${c.cards.length} 张字卡</span>
          <button class="btn ghost sm" id="delChar" style="color:var(--accent-ink)">删除这位角色</button>
        </div>
      `;

      const m = UI.modal({
        title: '角色设置',
        content: box,
        buttons: [
          { label: '取消' },
          {
            label: '保存', cls: 'primary', action: (close) => {
              const name = $('input[name=name]', box).value.trim();
              if (!name) { UI.toast('总得有个称呼'); return false; }
              c.name = name;
              c.color = color;
              Store.save();
              close();
              renderChars(); renderPool(); renderHistory();
              UI.toast('改好了');
            }
          }
        ]
      });

      $('#colorChips', box).onclick = (e) => {
        const b = e.target.closest('[data-color-id]');
        if (!b) return;
        color = b.dataset.colorId;
        $$('#colorChips .chip', box).forEach((x) => x.classList.toggle('on', x === b));
      };

      $('#delChar', box).onclick = () => {
        UI.confirm('连同 ta 的 ' + c.cards.length + ' 张字卡一起删掉？', () => {
          state.cards.characters = chars().filter((x) => x.id !== id);
          state.cards.history = state.cards.history.filter((h) => h.char !== c.name);
          selId = null;
          Store.save();
          renderChars(); renderCards(); renderPool(); renderHistory(); resetCard();
          m.close();
          UI.toast('删掉了');
        }, '删掉');
      };
    }

    function addChar() {
      UI.prompt('新建角色', [
        { name: 'name', label: '称呼', placeholder: 'ta 的名字' }
      ], (d) => {
        const name = d.name.trim();
        if (!name) { UI.toast('总得有个称呼'); return false; }
        const colors = ['rose', 'lilac', 'sky', 'matcha', 'sand'];
        const id = Store.uid();
        chars().push({ id, name, color: U.pick(colors), cards: [] });
        selId = id;
        Store.save();
        renderChars(); renderPool(); renderCards(); resetCard();
        UI.toast('建好啦，加几张字卡吧');
      });
    }

    function editCard(id) {
      const ch = current();
      const card = ch.cards.find((x) => x.id === id);
      if (!card) return;
      UI.prompt('编辑字卡', [
        { name: 'text', label: '卡片文字', type: 'textarea', value: card.text, rows: 3 },
        { name: 'type', label: '类型', type: 'select', value: card.type, options: TYPES }
      ], (d) => {
        if (!d.text.trim()) { UI.toast('写点字吧'); return false; }
        card.text = d.text.trim();
        card.type = d.type;
        Store.save();
        renderCards(); renderPool();
      });
    }

    function addCard() {
      const ch = current();
      if (!ch) { UI.toast('先建一个角色'); return; }
      UI.prompt('加一张字卡', [
        { name: 'text', label: '卡片文字', type: 'textarea', rows: 3, placeholder: '想听到 ta 说什么？' },
        { name: 'type', label: '类型', type: 'select', options: TYPES }
      ], (d) => {
        const text = d.text.trim();
        if (!text) { UI.toast('写点字吧'); return false; }
        ch.cards.unshift({ id: Store.uid(), text, type: d.type });
        Store.save();
        renderCards(); renderPool(); renderChars();
        UI.toast('加好了');
      }, '加上');
    }

    function bulkAdd() {
      const ch = current();
      if (!ch) { UI.toast('先建一个角色'); return; }
      UI.prompt('批量录入', [
        { name: 'text', label: '一行一张', type: 'textarea', rows: 8, placeholder: '每行一句话，会全部存成「能量」类，之后可以单独改类型' },
        { name: 'type', label: '这一批的类型', type: 'select', options: TYPES }
      ], (d) => {
        const lines = d.text.split('\n').map((s) => s.trim()).filter(Boolean);
        if (!lines.length) { UI.toast('没有内容'); return false; }
        lines.forEach((text) => ch.cards.push({ id: Store.uid(), text, type: d.type }));
        Store.save();
        renderCards(); renderPool(); renderChars();
        UI.toast('存进了 ' + lines.length + ' 张');
      }, '存进去');
    }

    /* --- 绑定 --- */
    $('#addChar').onclick = addChar;
    $('#addCard').onclick = addCard;
    $('#bulkAdd').onclick = bulkAdd;
    $('#drawBtn').onclick = doDraw;
    $('#backBtn').onclick = () => { resetCard(); };
    $('#clearHistory').onclick = () => {
      UI.confirm('清空所有抽卡记录？', () => {
        state.cards.history = [];
        Store.save();
        renderHistory();
      }, '清空');
    };
    $('#replySave').onclick = () => {
      const val = $('#replyInput').value.trim();
      if (!currentHit) return;
      if (!val) { UI.toast('写一句嘛'); return; }
      const last = state.cards.history.find((h) => h.text === currentHit.text && !h.reply);
      if (last) last.reply = val;
      Store.save();
      $('#replyInput').value = '';
      renderHistory();
      UI.toast('存进这段对话了');
    };

    $('#typeChips').onclick = (e) => {
      const b = e.target.closest('[data-type]');
      if (!b) return;
      filter = b.dataset.type;
      $$('#typeChips .chip').forEach((c) => c.classList.toggle('on', c === b));
      renderPool();
    };

    renderChars();
    renderCards();
    renderHistory();
    renderPool();
  });
})();
