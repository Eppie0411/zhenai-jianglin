/* ===== if 线建设 ===== */
(function () {
  const { $, $$, esc, fmtDate } = U;
  const state = Store.state;

  let openId = null;

  function find(id) { return state.iflines.find((f) => f.id === id); }

  route('ifline', function (view) {
    if (openId && !find(openId)) openId = null;
    openId ? renderDetail(view) : renderList(view);
  });

  /* ---------- 列表 ---------- */
  function renderList(view) {
    const lines = state.iflines.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
    view.innerHTML = `
      <div class="page-head">
        <h2 class="page-title"><span class="dot"></span>if 线建设</h2>
        <p class="page-desc">如果那天选了另一条路——把分支写下来，它就存在了。</p>
      </div>

      <div class="row between" style="margin-bottom:16px">
        <span class="mini-label">${lines.length} 条 if 线</span>
        <button class="btn soft" id="newLine">${ICON.plus} 开一条新 if</button>
      </div>

      <div class="if-grid" id="ifGrid"></div>
    `;

    const grid = $('#ifGrid');
    if (!lines.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <div class="eicon">${ICON.branch}</div>
        还没有 if 线<br/>起个标题，比如「如果他没有在那天离开」
      </div>`;
    } else {
      grid.innerHTML = lines.map((f, i) => `
        <article class="if-card" data-id="${f.id}">
          <span class="if-index serif">IF · ${String(i + 1).padStart(2, '0')}</span>
          <h3 class="if-title serif">${esc(f.title)}</h3>
          ${f.char ? `<span class="if-char">${esc(f.char)}</span>` : ''}
          <p class="if-premise">${esc(f.premise || '还没有写设定')}</p>
          <div class="if-foot">
            <span class="muted">${(f.segs || []).length} 个片段${f.updated ? ' · ' + U.relDays(new Date(f.updated).toISOString().slice(0, 10)) : ''}</span>
            <span class="if-open">打开 ${ICON.chevron}</span>
          </div>
        </article>`).join('');
      $$('.if-card', grid).forEach((c) => {
        c.onclick = () => { openId = c.dataset.id; render(1); };
      });
    }

    $('#newLine').onclick = () => {
      UI.prompt('开一条新 if 线', [
        { name: 'title', label: '标题', placeholder: '如果……' },
        { name: 'char', label: '关于谁（可留空）', placeholder: '角色的名字' },
        { name: 'premise', label: '一句话设定', type: 'textarea', rows: 3, placeholder: '分支从哪一刻开始分开？' }
      ], (d) => {
        const title = d.title.trim();
        if (!title) { UI.toast('给这条线起个标题'); return false; }
        const id = Store.uid();
        state.iflines.push({
          id, title, char: d.char.trim(), premise: d.premise.trim(),
          segs: [], createdAt: Date.now(), updated: Date.now()
        });
        Store.save();
        openId = id;
        render(1);
      }, '开一条');
    };
  }

  /* ---------- 详情 ---------- */
  function renderDetail(view) {
    const f = find(openId);
    const segs = f.segs || [];

    view.innerHTML = `
      <div class="page-head">
        <div class="row" style="gap:8px; margin-bottom:10px">
          <button class="btn ghost sm" id="backBtn">‹ 全部 if 线</button>
          <span class="spacer"></span>
          <button class="btn ghost sm" id="readBtn">${ICON.book} 读一遍</button>
          <button class="btn ghost sm" id="editBtn">${ICON.pencil} 改设定</button>
          <button class="btn ghost sm" id="delBtn">${ICON.trash}</button>
        </div>
        <h2 class="page-title"><span class="dot"></span>${esc(f.title)}</h2>
        <p class="page-desc">${f.char ? esc(f.char) + ' · ' : ''}${segs.length} 个片段</p>
      </div>

      ${f.premise ? `<div class="panel premise-panel"><span class="mini-label">设定</span><p class="serif premise-text">${esc(f.premise)}</p></div>` : ''}

      <div class="seg-list" id="segList"></div>

      <button class="add-seg" id="addSeg">${ICON.plus} 加一个片段</button>
    `;

    const box = $('#segList');
    if (!segs.length) {
      box.innerHTML = `<div class="empty">从第一个片段开始吧<br/>一小段对话、一个画面都可以</div>`;
    } else {
      box.innerHTML = segs.map((s, i) => `
        <div class="panel seg-item" data-id="${s.id}">
          <div class="seg-head">
            <span class="seg-num serif">${String(i + 1).padStart(2, '0')}</span>
            <span class="seg-title serif">${esc(s.title || '无题片段')}</span>
            <span class="spacer"></span>
            <button class="mini-x" data-edit="${s.id}" title="编辑">${ICON.pencil}</button>
            <button class="mini-x" data-del="${s.id}" title="删掉">${ICON.trash}</button>
          </div>
          <p class="seg-text">${esc(s.text).replace(/\n/g, '<br/>')}</p>
        </div>`).join('');

      $$('[data-edit]', box).forEach((b) => {
        b.onclick = () => segEditor(f, b.dataset.edit);
      });
      $$('[data-del]', box).forEach((b) => {
        b.onclick = () => {
          UI.confirm('删掉这个片段？', () => {
            f.segs = f.segs.filter((x) => x.id !== b.dataset.del);
            f.updated = Date.now();
            Store.save();
            render(1);
          }, '删掉');
        };
      });
    }

    $('#backBtn').onclick = () => { openId = null; render(1); };

    $('#editBtn').onclick = () => {
      UI.prompt('修改 if 线', [
        { name: 'title', label: '标题', value: f.title },
        { name: 'char', label: '关于谁', value: f.char || '' },
        { name: 'premise', label: '设定', type: 'textarea', rows: 3, value: f.premise || '' }
      ], (d) => {
        if (!d.title.trim()) { UI.toast('标题不能空'); return false; }
        f.title = d.title.trim();
        f.char = d.char.trim();
        f.premise = d.premise.trim();
        f.updated = Date.now();
        Store.save();
        render(1);
      });
    };

    $('#delBtn').onclick = () => {
      UI.confirm('删掉整条 if 线？', () => {
        state.iflines = state.iflines.filter((x) => x.id !== f.id);
        Store.save();
        openId = null;
        render(1);
      }, '删掉');
    };

    $('#addSeg').onclick = () => segEditor(f, null);

    $('#readBtn').onclick = () => {
      if (!segs.length) { UI.toast('还没有片段'); return; }
      const html = `
        <div class="read-view">
          <h2 class="read-title serif">${esc(f.title)}</h2>
          ${f.premise ? `<p class="read-premise serif">${esc(f.premise)}</p>` : ''}
          <div class="read-orn">✦</div>
          ${segs.map((s, i) => `
            <section class="read-seg">
              <span class="read-num serif">${String(i + 1).padStart(2, '0')}${s.title ? ' · ' + esc(s.title) : ''}</span>
              <p class="serif">${esc(s.text).replace(/\n/g, '<br/>')}</p>
            </section>`).join('')}
          <div class="read-orn">✦</div>
          <p class="read-end serif">— 完 —</p>
        </div>`;
      UI.modal({ title: 'if 线 · 阅读', content: html, wide: true, buttons: [{ label: '合上', cls: 'primary' }] });
    };
  }

  function segEditor(f, segId) {
    const seg = segId ? f.segs.find((s) => s.id === segId) : null;
    UI.prompt(seg ? '编辑片段' : '新片段', [
      { name: 'title', label: '小标题（可留空）', value: seg ? seg.title : '', placeholder: '那个雨天的下午' },
      { name: 'text', label: '正文', type: 'textarea', rows: 8, value: seg ? seg.text : '', placeholder: '写吧，写下去它就发生了。' }
    ], (d) => {
      const text = d.text.trim();
      if (!text) { UI.toast('写点东西吧'); return false; }
      if (seg) {
        seg.title = d.title.trim();
        seg.text = text;
      } else {
        f.segs = f.segs || [];
        f.segs.push({ id: Store.uid(), title: d.title.trim(), text });
      }
      f.updated = Date.now();
      Store.save();
      render(1);
    }, seg ? '保存' : '加上');
  }
})();
