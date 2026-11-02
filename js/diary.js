/* ===== 日记 ===== */
(function () {
  const { $, $$, esc, today, fmtDate } = U;
  const state = Store.state;

  const MOODS = [
    { id: 'sun', name: '晴朗', svg: '<circle cx="12" cy="12" r="8.2"/><path d="M8.8 13.6c.9 1.4 1.9 2.1 3.2 2.1s2.3-.7 3.2-2.1"/><path d="M9.4 9.6h.02M14.6 9.6h.02"/>' },
    { id: 'calm', name: '平静', svg: '<circle cx="12" cy="12" r="8.2"/><path d="M8.4 9.8c.5-.5 1.1-.5 1.6 0M14 9.8c.5-.5 1.1-.5 1.6 0"/><path d="M9.4 14.6h5.2"/>' },
    { id: 'down', name: '低落', svg: '<circle cx="12" cy="12" r="8.2"/><path d="M8.6 9.2c.5.5 1.1.5 1.6 0M13.8 9.2c.5.5 1.1.5 1.6 0"/><path d="M9 16c.8-1.3 1.8-1.9 3-1.9s2.2.6 3 1.9"/>' },
    { id: 'spark', name: '雀跃', svg: '<circle cx="12" cy="12" r="8.2"/><path d="M8.8 13c.8 1.7 1.9 2.5 3.2 2.5s2.4-.8 3.2-2.5"/><path d="M9.6 9.2c.4-.6 1-.6 1.4 0M13 9.2c.4-.6 1-.6 1.4 0"/><path d="M19.8 4.6v2.6M18.5 5.9h2.6"/>' },
    { id: 'tired', name: '困', svg: '<circle cx="12" cy="12" r="8.2"/><path d="M8.4 10.2h1.8M13.8 10.2h1.8"/><path d="M9.6 15.4c.7.4 1.5.6 2.4.6s1.7-.2 2.4-.6"/><path d="M19.4 4.4l1.8 1.8-1.8 1.8"/>' }
  ];

  let editingId = null;
  let mood = 'calm';
  let query = '';

  function moodOf(id) { return MOODS.find((m) => m.id === id) || MOODS[1]; }

  route('diary', function (view) {
    view.innerHTML = `
      <div class="page-head">
        <h2 class="page-title"><span class="dot"></span>日记</h2>
        <p class="page-desc">不用写得好看，写得下来就好。</p>
      </div>

      <div class="diary-grid">
        <div class="panel editor-panel">
          <div class="row between" style="margin-bottom:12px">
            <span class="mini-label" id="editorLabel">写一篇新的</span>
            <input class="input" type="date" id="dDate" value="${today()}" style="width:auto;padding:6px 10px;font-size:12.5px" />
          </div>
          <div class="mood-row" id="moodRow"></div>
          <textarea class="input diary-text" id="dText" placeholder="今天……"></textarea>
          <div class="row between" style="margin-top:12px">
            <span class="muted" id="dCount">0 字</span>
            <div class="row" style="gap:8px">
              <button class="btn ghost sm" id="dCancel" hidden>取消编辑</button>
              <button class="btn primary" id="dSave">保存</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="row between" style="margin-bottom:12px">
            <span class="mini-label" id="diaryCount">写过的 · ${state.diary.entries.length} 篇</span>
            <input class="input" id="dSearch" placeholder="搜一搜" style="width:130px;padding:6px 10px;font-size:12.5px" />
          </div>
          <div id="diaryList"></div>
        </div>
      </div>
    `;

    function renderMoods() {
      $('#moodRow').innerHTML = MOODS.map((m) => `
        <button class="mood ${m.id === mood ? 'on' : ''}" data-mood="${m.id}" title="${m.name}">
          <svg viewBox="0 0 24 24">${m.svg}</svg>
          <span>${m.name}</span>
        </button>`).join('');
      $$('#moodRow .mood').forEach((b) => {
        b.onclick = () => { mood = b.dataset.mood; renderMoods(); };
      });
    }

    function renderList() {
      const box = $('#diaryList');
      let list = state.diary.entries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      if (query) {
        const q = query.toLowerCase();
        list = list.filter((e) => (e.text + e.date).toLowerCase().includes(q));
      }
      if (!list.length) {
        box.innerHTML = `<div class="empty">${query ? '没有找到' : '第一篇日记，从今天开始'}</div>`;
        return;
      }
      box.innerHTML = list.map((e) => {
        const m = moodOf(e.mood);
        return `
          <article class="diary-item" data-id="${e.id}">
            <div class="di-head">
              <svg class="di-mood" viewBox="0 0 24 24">${m.svg}</svg>
              <span class="di-date serif">${fmtDate(e.date, true)}</span>
              <span class="muted">${U.relDays(e.date)}</span>
              <span class="spacer"></span>
              <button class="mini-x" data-edit="${e.id}" title="编辑">${ICON.pencil}</button>
              <button class="mini-x" data-del="${e.id}" title="删掉">${ICON.trash}</button>
            </div>
            <p class="di-text">${linkText(e.text)}</p>
          </article>`;
      }).join('');

      $$('[data-edit]', box).forEach((b) => {
        b.onclick = (ev) => { ev.stopPropagation(); loadForEdit(b.dataset.edit); };
      });
      $$('[data-del]', box).forEach((b) => {
        b.onclick = (ev) => {
          ev.stopPropagation();
          UI.confirm('删掉这篇日记？', () => {
            state.diary.entries = state.diary.entries.filter((x) => x.id !== b.dataset.del);
            Store.save();
            if (editingId === b.dataset.del) resetEditor();
            renderList();
            const dc = $('#diaryCount');
            if (dc) dc.textContent = '写过的 · ' + state.diary.entries.length + ' 篇';
          }, '删掉');
        };
      });
      $$('.diary-item', box).forEach((item) => {
        item.onclick = () => openEntry(item.dataset.id);
      });
    }

    function linkText(text) {
      return esc(text).replace(/\n/g, '<br/>');
    }

    function openEntry(id) {
      const e = state.diary.entries.find((x) => x.id === id);
      if (!e) return;
      const m = moodOf(e.mood);
      UI.modal({
        title: fmtDate(e.date, true) + ' · ' + m.name,
        content: `<p class="serif" style="font-size:16px;line-height:2;letter-spacing:.03em;white-space:pre-wrap;margin:0">${esc(e.text)}</p>`,
        buttons: [
          { label: '编辑', action: (close) => { close(); loadForEdit(id); } },
          { label: '好', cls: 'primary' }
        ]
      });
    }

    function loadForEdit(id) {
      const e = state.diary.entries.find((x) => x.id === id);
      if (!e) return;
      editingId = id;
      mood = e.mood;
      $('#dDate').value = e.date;
      $('#dText').value = e.text;
      $('#editorLabel').textContent = '正在编辑 ' + fmtDate(e.date);
      $('#dCancel').hidden = false;
      renderMoods();
      updateCount();
      $('#dText').focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetEditor() {
      editingId = null;
      mood = 'calm';
      $('#dDate').value = today();
      $('#dText').value = '';
      $('#editorLabel').textContent = '写一篇新的';
      $('#dCancel').hidden = true;
      renderMoods();
      updateCount();
    }

    function updateCount() {
      $('#dCount').textContent = $('#dText').value.trim().length + ' 字';
    }

    $('#dText').oninput = updateCount;
    $('#dCancel').onclick = resetEditor;
    $('#dSearch').oninput = U.debounce((e) => { query = e.target.value.trim(); renderList(); }, 180);

    $('#dSave').onclick = () => {
      const text = $('#dText').value.trim();
      const date = $('#dDate').value || today();
      if (!text) { UI.toast('写一句也好'); return; }
      if (editingId) {
        const e = state.diary.entries.find((x) => x.id === editingId);
        if (e) { e.text = text; e.date = date; e.mood = mood; }
        UI.toast('改好了');
      } else {
        state.diary.entries.unshift({ id: Store.uid(), date, text, mood, ts: Date.now() });
        UI.toast('记下了');
      }
      Store.save();
      resetEditor();
      renderList();
      const dc = $('#diaryCount');
      if (dc) dc.textContent = '写过的 · ' + state.diary.entries.length + ' 篇';
    };

    renderMoods();
    renderList();
    updateCount();
  });
})();
