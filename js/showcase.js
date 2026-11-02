/* ===== 稿件展示 ===== */
(function () {
  const { $, $$, esc, fmtDate, today } = U;
  const state = Store.state;

  const STYLES = [
    { id: 'polaroid', name: '拍立得' },
    { id: 'frame', name: '画框' },
    { id: 'minimal', name: '极简' }
  ];

  route('showcase', function (view) {
    const items = state.showcase.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));

    view.innerHTML = `
      <div class="page-head">
        <h2 class="page-title"><span class="dot"></span>稿件展示</h2>
        <p class="page-desc">收到的每一张图，配上一段只属于你的字。</p>
      </div>

      <div class="row between" style="margin-bottom:16px">
        <span class="mini-label">${items.length} 张稿件</span>
        <button class="btn soft" id="addWork">${ICON.image} 上传一张</button>
      </div>

      <div class="show-grid" id="showGrid"></div>
    `;

    const grid = $('#showGrid');
    if (!items.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <div class="eicon">${ICON.film}</div>
        还没有稿件<br/>上传一张，给它配一段字
      </div>`;
    } else {
      grid.innerHTML = items.map((it) => renderCard(it)).join('');
      $$('.show-card', grid).forEach((c) => {
        c.onclick = () => openDetail(c.dataset.id);
      });
    }

    $('#addWork').onclick = () => editor(null);
  });

  function renderCard(it) {
    const style = it.style || 'polaroid';
    const cap = it.title || it.caption || '';
    return `
      <article class="show-card sc-${style} reveal" data-id="${it.id}">
        <div class="sc-img"><img src="${it.img}" alt="" loading="lazy" /></div>
        <div class="sc-cap">
          ${cap ? `<span class="sc-title serif">${esc(cap)}</span>` : ''}
          ${it.caption && it.title ? `<span class="sc-sub">${esc(it.caption)}</span>` : ''}
          <span class="sc-meta">${it.credit ? esc(it.credit) + ' · ' : ''}${fmtDate(it.date || '')}</span>
        </div>
      </article>`;
  }

  function openDetail(id) {
    const it = state.showcase.find((x) => x.id === id);
    if (!it) return;
    const style = it.style || 'polaroid';
    const html = `
      <div class="detail-wrap style-${style}">
        <div class="detail-frame">
          <img src="${it.img}" alt="" />
          <span class="detail-orn">✦</span>
        </div>
        <div class="detail-text">
          ${it.title ? `<h2 class="detail-title serif">${esc(it.title)}</h2>` : ''}
          ${it.caption ? `<p class="detail-cap serif">${esc(it.caption).replace(/\n/g, '<br/>')}</p>` : ''}
          <div class="detail-foot">
            <span>${it.credit ? esc(it.credit) : ''}</span>
            <span>${fmtDate(it.date || '', true)}</span>
          </div>
        </div>
      </div>
      <div class="row" style="justify-content:center;gap:8px;margin-top:18px">
        <button class="btn ghost sm" id="dtEdit">${ICON.pencil} 改文案</button>
        <button class="btn ghost sm" id="dtDel">${ICON.trash} 删掉</button>
      </div>
      <p class="muted" style="text-align:center;margin:10px 0 0">截图保存就是一张小卡</p>
    `;
    const m = UI.modal({ title: '稿件', content: html, wide: true, buttons: [{ label: '合上', cls: 'primary' }] });
    $('#dtEdit', m.box).onclick = () => { m.close(); setTimeout(() => editor(it), 320); };
    $('#dtDel', m.box).onclick = () => {
      UI.confirm('删掉这张稿件？图片也会一起消失', () => {
        state.showcase = state.showcase.filter((x) => x.id !== it.id);
        Store.save();
        m.close();
        render(1);
      }, '删掉');
    };
  }

  function editor(it) {
    let img = it ? it.img : '';
    let style = it ? (it.style || 'polaroid') : 'polaroid';

    const form = document.createElement('div');
    form.className = 'set-grid';
    form.innerHTML = `
      <div class="field">
        <label>图片</label>
        <div class="up-area ${img ? 'has' : ''}" id="upArea">
          ${img ? `<img src="${img}" alt="" />` : `<div class="up-hint">${ICON.image}<span>点这里选图片</span></div>`}
        </div>
        <input type="file" id="upFile" accept="image/*" hidden />
      </div>
      <div class="field">
        <label>标题（大字）</label>
        <input class="input" name="title" value="${esc(it ? it.title || '' : '')}" placeholder="给这张图起个名字" />
      </div>
      <div class="field">
        <label>文案（小字）</label>
        <textarea class="input" name="caption" rows="3" placeholder="想配的话，换行也保留">${esc(it ? it.caption || '' : '')}</textarea>
      </div>
      <div class="row" style="gap:10px">
        <div class="field" style="flex:1">
          <label>署名</label>
          <input class="input" name="credit" value="${esc(it ? it.credit || '' : '')}" placeholder="画师 / 来源（可留空）" />
        </div>
        <div class="field" style="width:150px">
          <label>日期</label>
          <input class="input" type="date" name="date" value="${it ? it.date || today() : today()}" />
        </div>
      </div>
      <div class="field">
        <label>卡片样式</label>
        <div class="chips" id="styleChips">
          ${STYLES.map((s) => `<button class="chip ${s.id === style ? 'on' : ''}" data-s="${s.id}">${s.name}</button>`).join('')}
        </div>
      </div>
    `;

    const m = UI.modal({
      title: it ? '改这张稿件' : '上传稿件',
      content: form,
      buttons: [
        { label: '取消' },
        {
          label: '保存', cls: 'primary', action: (close) => {
            if (!img) { UI.toast('先选一张图片'); return; }
            const val = (n) => { const el = $('[name=' + n + ']', form); return el ? el.value.trim() : ''; };
            const payload = {
              img, style,
              title: val('title'),
              caption: val('caption'),
              credit: val('credit'),
              date: val('date') || today()
            };
            if (it) {
              Object.assign(it, payload);
            } else {
              state.showcase.unshift(Object.assign({ id: Store.uid(), ts: Date.now() }, payload));
            }
            Store.save(true);
            close();
            UI.toast(it ? '改好了' : '收进展示墙了');
            render(1);
          }
        }
      ]
    });

    const file = $('#upFile', form);
    const area = $('#upArea', form);
    area.onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files[0];
      if (!f) return;
      try {
        const url = await U.compressImage(f, 1100, 0.78);
        if (url.length > 900000) UI.toast('图片有点大，可能存不下');
        img = url;
        area.classList.add('has');
        area.innerHTML = `<img src="${url}" alt="" />`;
      } catch (e) { UI.toast('这张图读不进来'); }
    };

    $('#styleChips', form).onclick = (e) => {
      const b = e.target.closest('[data-s]');
      if (!b) return;
      style = b.dataset.s;
      $$('#styleChips .chip', form).forEach((c) => c.classList.toggle('on', c === b));
    };
  }
})();
