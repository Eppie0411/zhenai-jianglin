/* ===== 路由 + 主页 + 小房间设置 ===== */
(function () {
  const { $, $$, esc, today, fmtDate } = U;
  const state = Store.state;

  const ROUTES = {};
  window.route = function (id, fn) { ROUTES[id] = fn; };

  const THEMES = [
    { id: 'cream', name: '奶油', dot: '#cf8d95', bg: '#fbf7f1' },
    { id: 'sakura', name: '樱', dot: '#e193a6', bg: '#fdf6f7' },
    { id: 'berry', name: '莓', dot: '#9d84c4', bg: '#f8f5fb' },
    { id: 'sky', name: '雾蓝', dot: '#85a8c6', bg: '#f4f8fb' },
    { id: 'matcha', name: '抹茶', dot: '#8fa87c', bg: '#f6f8f0' },
    { id: 'mono', name: '墨', dot: '#4b4946', bg: '#f7f6f4' },
    { id: 'night', name: '夜', dot: '#d8a3a8', bg: '#1a1b16' }
  ];

  /* ---------- 自定义色调：只给主色和底色，其余色阶自己算 ---------- */
  const VARS = ['--bg', '--bg-2', '--panel', '--panel-2', '--ink', '--ink-mid', '--ink-soft',
    '--line', '--line-strong', '--accent', '--accent-ink', '--accent-soft', '--shadow', '--shadow-s'];

  const DEFAULT_CUSTOM = { accent: '#cf8d95', bg: '#fbf7f1' };

  function hex2rgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6) h = 'cccccc';
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function luma(h) {
    const [r, g, b] = hex2rgb(h).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function alpha(h, a) {
    const [r, g, b] = hex2rgb(h);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
  }

  function applyCustomTheme(custom) {
    const c = Object.assign({}, DEFAULT_CUSTOM, custom || {});
    const root = document.documentElement;
    const dark = luma(c.bg) < 0.32;
    const accent = c.accent;
    const bg = c.bg;
    const panel = dark ? mix(bg, '#ffffff', 0.07) : mix(bg, '#ffffff', 0.7);
    const panel2 = dark ? mix(bg, '#ffffff', 0.12) : mix(bg, panel, 0.65);
    const ink = dark ? mix('#f7f2e8', accent, 0.06) : mix('#2b2724', accent, 0.1);
    const map = {
      '--bg': bg,
      '--bg-2': dark ? mix(bg, '#000000', 0.3) : mix(bg, '#000000', 0.035),
      '--panel': panel,
      '--panel-2': panel2,
      '--ink': ink,
      '--ink-mid': mix(ink, bg, dark ? 0.22 : 0.36),
      '--ink-soft': mix(ink, bg, dark ? 0.33 : 0.52),
      '--line': alpha(ink, dark ? 0.16 : 0.13),
      '--line-strong': alpha(ink, dark ? 0.38 : 0.3),
      '--accent': accent,
      '--accent-ink': dark ? mix(accent, '#ffffff', 0.28) : mix(accent, ink, 0.38),
      '--accent-soft': mix(panel, accent, dark ? 0.22 : 0.16),
      '--shadow': dark ? '0 18px 40px -26px rgba(0,0,0,.85)' : '0 18px 40px -28px ' + alpha(ink, 0.5),
      '--shadow-s': dark ? '0 8px 20px -12px rgba(0,0,0,.85)' : '0 8px 20px -14px ' + alpha(ink, 0.55)
    };
    VARS.forEach((k) => root.style.setProperty(k, map[k]));
    root.setAttribute('data-theme', dark ? 'custom-dark' : 'custom-light');
  }

  function applyTheme(id) {
    const root = document.documentElement;
    VARS.forEach((k) => root.style.removeProperty(k));
    if (id === 'custom') {
      applyCustomTheme(state.profile.custom);
      return;
    }
    const valid = THEMES.some((t) => t.id === id);
    root.setAttribute('data-theme', valid ? id : 'cream');
  }

  function applyProfile() {
    const p = state.profile;
    document.title = p.siteName + ' · 梦女向小房间';
    const bn = $('#brandName');
    if (bn) bn.textContent = p.siteName;
  }

  /* ================= 主页 ================= */
  route('home', function (view) {
    const p = state.profile;
    const cardCount = state.cards.characters.reduce((n, c) => n + c.cards.length, 0);
    const quote = state.home && state.home.quote;

    const tiles = [
      { id: 'cards', icon: ICON.card, name: '字卡传讯', desc: '抽一张 ta 想说的话', count: cardCount + ' 张' },
      { id: 'ledger', icon: ICON.coin, name: '每日记账', desc: '钱去哪儿了一眼看见', count: state.ledger.entries.length + ' 笔' },
      { id: 'diary', icon: ICON.book, name: '日记', desc: '今天也留一句', count: state.diary.entries.length + ' 篇' },
      { id: 'gamelog', icon: ICON.gamepad, name: '游戏日常', desc: '今天刷到哪儿了', count: state.gamelog.entries.length + ' 条' },
      { id: 'ifline', icon: ICON.branch, name: 'if 线建设', desc: '如果那天选了另一条路', count: state.iflines.length + ' 条线' },
      { id: 'showcase', icon: ICON.film, name: '稿件展示', desc: '给收到的图配一段字', count: state.showcase.length + ' 张' },
      { id: 'games', icon: ICON.dice, name: '小游戏', desc: '三个可以摸摸的小游戏', count: '3 个' },
      { id: 'settings', icon: ICON.pencil, name: '小房间', desc: '头像、昵称、配色', count: '设置', action: true }
    ];

    view.innerHTML = `
      <div class="hero">
        <div class="profile-card">
          <div class="deco">${ICON.cat}</div>
          <div class="avatar-slot">
            <div class="avatar" id="avatarBox">
              ${p.avatar ? `<img src="${p.avatar}" alt="" />` : ICON.cat}
            </div>
            <button class="avatar-edit" id="avatarBtn" title="换头像">${ICON.camera}</button>
          </div>
          <div class="profile-main">
            <h1 class="profile-name">${esc(p.name)}<button class="btn ghost sm" id="editName">改名</button></h1>
            <p class="profile-bio">${esc(p.bio)}</p>
            <div class="profile-meta">
              <div class="stat"><b>${state.diary.entries.length}</b><span>篇日记</span></div>
              <div class="stat"><b>${state.cards.characters.length}</b><span>位角色</span></div>
              <div class="stat"><b>${cardCount}</b><span>张字卡</span></div>
              <div class="stat"><b>${state.showcase.length}</b><span>张稿件</span></div>
            </div>
          </div>
        </div>

        <div class="today-card">
          <div class="date">${fmtDate(today(), true)}</div>
          <p class="today-quote ${quote ? '' : 'small'}" id="quoteText">${quote ? esc(quote.text) : '今天的门还关着，抽一张字卡看看 ta 想说什么。'}</p>
          <div class="row between">
            <span class="from" id="quoteFrom">${quote ? '—— ' + esc(quote.from) : '&nbsp;'}</span>
            <button class="btn soft sm" id="drawQuote">抽一张</button>
          </div>
        </div>
      </div>

      <div class="section-label">去哪儿</div>
      <div class="grid" id="tileGrid">
        ${tiles.map((t) => `
          <${t.action ? 'button type="button" class="tile" id="tileSettings"' : 'a href="#/' + t.id + '" class="tile"'}>
            <span class="count">${esc(t.count)}</span>
            <span class="tile-icon">${t.icon}</span>
            <span class="tile-name">${esc(t.name)}</span>
            <span class="tile-desc">${esc(t.desc)}</span>
          </${t.action ? 'button' : 'a'}>`).join('')}
      </div>
    `;

    $('#editName').onclick = () => Settings.open('profile');
    const tileSettings = $('#tileSettings');
    if (tileSettings) tileSettings.onclick = () => Settings.open('room');
    $('#avatarBtn').onclick = () => Settings.open('profile');

    const drawBtn = $('#drawQuote');
    drawBtn.onclick = () => {
      const all = [];
      state.cards.characters.forEach((c) => {
        c.cards.forEach((card) => all.push({ text: card.text, from: c.name }));
      });
      if (!all.length) {
        UI.toast('字卡库还是空的，先去建几张吧');
        location.hash = '#/cards';
        return;
      }
      const hit = U.pick(all);
      const qt = $('#quoteText');
      const qf = $('#quoteFrom');
      qt.classList.add('small');
      qt.textContent = '……';
      qf.textContent = '';
      setTimeout(() => {
        qt.textContent = hit.text;
        qt.classList.toggle('small', hit.text.length > 26);
        qf.textContent = '—— ' + hit.from;
        qt.animate(
          [{ opacity: .2, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, easing: 'cubic-bezier(.22,.9,.3,1)' }
        );
      }, 220);
      state.home = state.home || {};
      state.home.quote = { text: hit.text, from: hit.from };

      const ch = state.cards.characters.find((c) => c.name === hit.from);
      state.cards.history.unshift({
        id: Store.uid(), text: hit.text, char: hit.from, color: ch ? ch.color : 'rose', ts: Date.now(), src: 'home'
      });
      state.cards.history = state.cards.history.slice(0, 80);
      Store.save();
    };
  });

  /* ================= 小房间设置 ================= */
  const Settings = {
    open(tab) {
      if (tab === 'profile') return this.openProfile();
      this.openRoom();
    },

    openProfile() {
      const p = state.profile;
      const form = document.createElement('div');
      form.className = 'set-grid';
      form.innerHTML = `
        <div class="field">
          <label>昵称</label>
          <input class="input" name="name" value="${esc(p.name)}" placeholder="写你喜欢的名字" />
        </div>
        <div class="field">
          <label>简介小字</label>
          <textarea class="input" name="bio" rows="2" placeholder="一句关于你的话">${esc(p.bio)}</textarea>
        </div>
        <div class="field">
          <label>头像</label>
          <div class="row">
            <div class="avatar" style="width:56px;height:56px" id="sgAvatar">${p.avatar ? `<img src="${p.avatar}">` : ICON.cat}</div>
            <button class="btn sm" id="sgUp">上传图片</button>
            <button class="btn ghost sm" id="sgClear">用线描猫猫</button>
          </div>
          <input type="file" id="sgFile" accept="image/*" hidden />
        </div>
      `;
      let newAvatar = p.avatar;

      UI.modal({
        title: '小房间 · 你',
        content: form,
        buttons: [
          { label: '取消' },
          {
            label: '保存', cls: 'primary', action: (close) => {
              const name = $('input[name=name]', form).value.trim() || '未命名的小房间';
              const bio = $('textarea[name=bio]', form).value.trim();
              state.profile.name = name;
              state.profile.bio = bio;
              state.profile.avatar = newAvatar;
              Store.save();
              close();
              UI.toast('换好啦');
              if (location.hash === '#/home' || location.hash === '') render(true);
              else render();
            }
          }
        ]
      });

      const f = $('#sgFile', form);
      $('#sgUp', form).onclick = () => f.click();
      f.onchange = async () => {
        const file = f.files[0];
        if (!file) return;
        try {
          newAvatar = await U.compressImage(file, 400, 0.8);
          $('#sgAvatar', form).innerHTML = `<img src="${newAvatar}">`;
        } catch (e) { UI.toast('这张图读不进来'); }
      };
      $('#sgClear', form).onclick = () => {
        newAvatar = '';
        $('#sgAvatar', form).innerHTML = ICON.cat;
      };
    },

    openRoom() {
      const p = state.profile;
      const box = document.createElement('div');
      box.className = 'set-grid';
      box.innerHTML = `
        <div class="field">
          <label>站名</label>
          <input class="input" name="siteName" value="${esc(p.siteName)}" />
        </div>
        <div class="field">
          <label>配色</label>
          <div class="theme-row" id="themeRow">
            ${THEMES.map((t) => `
              <button class="swatch ${p.theme === t.id ? 'on' : ''}" data-theme-id="${t.id}" title="${t.name}">
                <i style="background:${t.dot}"></i>
              </button>`).join('')}
            <button class="swatch ${p.theme === 'custom' ? 'on' : ''}" data-theme-id="custom" title="自定义色调">
              <i style="background:conic-gradient(from 20deg, #e19aa6, #a9c3dd, #b3c9a3, #d9c08f, #e19aa6)"></i>
            </button>
          </div>
          <p class="muted" style="margin:2px 0 0">点一下立刻换色；最后一个圆是自定义。</p>
          <div class="custom-tone" id="customTone">
            <label>主色调<input type="color" id="cAccent" value="${esc((p.custom && p.custom.accent) || DEFAULT_CUSTOM.accent)}" /></label>
            <label>底色<input type="color" id="cBg" value="${esc((p.custom && p.custom.bg) || DEFAULT_CUSTOM.bg)}" /></label>
            <span class="muted">挑完立刻生效，底色深一点就是夜间模式</span>
          </div>
        </div>
        <div class="divider"></div>
        <div class="field">
          <label>数据备份</label>
          <div class="row">
            <button class="btn sm" id="sgExport">导出备份</button>
            <button class="btn sm" id="sgImport">导入备份</button>
            <button class="btn ghost sm" id="sgDemo">填点示例内容</button>
            <button class="btn ghost sm" id="sgReset">清空全部</button>
          </div>
          <p class="muted" style="margin:6px 0 0">数据只存在这台设备的浏览器里，换设备前记得导出。</p>
          <input type="file" id="sgImportFile" accept="application/json" hidden />
        </div>
      `;

      UI.modal({
        title: '小房间 · 设置',
        content: box,
        buttons: [
          {
            label: '保存', cls: 'primary', action: (close) => {
              state.profile.siteName = $('input[name=siteName]', box).value.trim() || '真爱降临';
              Store.save();
              applyProfile();
              close();
              UI.toast('改好了');
            }
          }
        ]
      });

      $('#themeRow', box).onclick = (e) => {
        const btn = e.target.closest('.swatch');
        if (!btn) return;
        const id = btn.dataset.themeId;
        if (id === 'custom' && !state.profile.custom) {
          state.profile.custom = Object.assign({}, DEFAULT_CUSTOM);
        }
        state.profile.theme = id;
        applyTheme(id);
        Store.save();
        $$('.swatch', box).forEach((s) => s.classList.toggle('on', s === btn));
        // 点预设时，把两个取色器同步成这套颜色，关系一目了然
        const preset = THEMES.find((t) => t.id === id);
        if (preset) {
          $('#cAccent', box).value = preset.dot;
          $('#cBg', box).value = preset.bg;
        }
      };

      const applyCustom = () => {
        state.profile.custom = {
          accent: $('#cAccent', box).value,
          bg: $('#cBg', box).value
        };
        state.profile.theme = 'custom';
        applyTheme('custom');
        Store.save();
        $$('.swatch', box).forEach((s) => s.classList.toggle('on', s.dataset.themeId === 'custom'));
      };
      $('#cAccent', box).oninput = applyCustom;
      $('#cBg', box).oninput = applyCustom;

      $('#sgExport', box).onclick = () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '真爱降临备份-' + today() + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        UI.toast('备份已下载');
      };

      const impFile = $('#sgImportFile', box);
      $('#sgImport', box).onclick = () => impFile.click();
      impFile.onchange = () => {
        const file = impFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (!data || typeof data !== 'object') throw new Error('bad');
            const merged = U.deepMerge(Store.defaults(), data);
            localStorage.setItem(Store.KEY, JSON.stringify(merged));
            UI.toast('导入成功，正在刷新');
            setTimeout(() => location.reload(), 700);
          } catch (e) { UI.toast('这个文件读不进来'); }
        };
        reader.readAsText(file);
      };

      $('#sgDemo', box).onclick = () => {
        UI.confirm('放几位示例角色、几笔记录和两篇日记进来，方便看看效果。（不会覆盖你已有的内容）', () => {
          seedDemo();
          UI.toast('示例内容放好了');
          setTimeout(() => location.reload(), 600);
        }, '放进来');
      };

      $('#sgReset', box).onclick = () => {
        UI.confirm('会清空所有字卡、日记、稿件和记账，确定吗？', () => {
          Store.reset();
          location.reload();
        }, '清空');
      };
    }
  };
  window.Settings = Settings;

  /* 示例内容：只往里加，不覆盖已有内容 */
  function seedDemo() {
    const st = Store.state;
    const d = (off) => {
      const x = new Date();
      x.setDate(x.getDate() - off);
      return U.ymd(x);
    };

    if (!st.cards.characters.some((c) => c.name === '夜灯')) {
      st.cards.characters.push({
        id: Store.uid(), name: '夜灯', color: 'rose', cards: [
          { id: Store.uid(), text: '今天也辛苦了，先把肩膀放下来。', type: '能量' },
          { id: Store.uid(), text: '不用急着变好，慢慢来就好。', type: '能量' },
          { id: Store.uid(), text: '外面在下雨，要不要一起听一会儿？', type: '对话' },
          { id: Store.uid(), text: '去，还是不去？（凭第一感觉选）', type: '答案' },
          { id: Store.uid(), text: '我没有生气，只是有点想你。', type: '对话' }
        ]
      });
    }

    if (!st.ledger.entries.length) {
      const rows = [
        [0, 28, 'out', '餐饮', '楼下的关东煮'],
        [0, 45, 'out', '谷子', '立牌'],
        [1, 12, 'out', '交通', ''],
        [2, 199, 'out', '娱乐', '游戏月卡'],
        [3, 68, 'out', '日用', '洗发水'],
        [4, 3000, 'in', '工资', ''],
        [5, 36, 'out', '餐饮', '奶茶两杯']
      ];
      rows.forEach(([off, amount, type, cat, note]) => {
        st.ledger.entries.push({ id: Store.uid(), date: d(off), amount, type, cat, note });
      });
    }

    if (!st.diary.entries.length) {
      st.diary.entries.push({ id: Store.uid(), date: d(0), mood: 'sun', text: '今天画到一半突然想通了，那个动作应该是这样收手的。\n晚上听了很久的雨声。', ts: Date.now() });
      st.diary.entries.push({ id: Store.uid(), date: d(2), mood: 'calm', text: '什么都没做，但也没关系。', ts: Date.now() - 1000 });
    }

    if (!st.gamelog.entries.length) {
      st.gamelog.entries.push({ id: Store.uid(), date: d(0), game: '某某物语', event: '通关第四章', note: '最后那段哭了', ts: Date.now() });
      st.gamelog.entries.push({ id: Store.uid(), date: d(1), game: '小岛生活', event: '建好了小木屋', note: '', ts: Date.now() - 1000 });
    }

    if (!st.iflines.length) {
      st.iflines.push({
        id: Store.uid(), title: '如果他没有在那天离开', char: '夜灯',
        premise: '雨停的那一刻，他回头了。',
        segs: [
          { id: Store.uid(), title: '回头', text: '雨停的时候，他站在巷口没有走。\n我听见自己心跳的声音，比雨声还响。' },
          { id: Store.uid(), title: '伞沿', text: '他把伞往我这边偏了一点，说：走吧。' }
        ],
        createdAt: Date.now(), updated: Date.now()
      });
    }

    Store.save(true);
  }

  /* ================= 路由调度 ================= */
  let current = '';

  function normalize() {
    let h = location.hash.replace(/^#\/?/, '').trim();
    if (!h) h = 'home';
    if (h === 'settings') { Settings.open('room'); return null; }
    return ROUTES[h] ? h : 'home';
  }

  function render(force) {
    const id = normalize();
    if (!id) return;
    if (!force && id === current) {
      // 同页刷新内容（编辑器改动后重绘）
    }
    current = id;
    if (window.__cleanup) {
      try { window.__cleanup(); } catch (e) { console.warn(e); }
      window.__cleanup = null;
    }
    const view = $('#view');
    view.innerHTML = '';
    ROUTES[id](view);
    $$('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.render = render;

  window.addEventListener('hashchange', render);

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.profile.theme);
    applyProfile();
    if (!location.hash) location.hash = '#/home';
    render();

    // 顶栏换色，循环
    $('#themeBtn').onclick = () => {
      const idx = THEMES.findIndex((t) => t.id === state.profile.theme);
      const next = THEMES[(idx + 1) % THEMES.length];
      state.profile.theme = next.id;
      applyTheme(next.id);
      Store.save();
      UI.toast('配色：' + next.name);
    };
  });
})();
