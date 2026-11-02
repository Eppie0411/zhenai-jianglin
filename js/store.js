/* ===== 数据层 + 通用工具 ===== */
(function () {
  const KEY = 'yume_notebook_v1';

  const defaults = () => ({
    version: 1,
    profile: {
      name: '未命名的小房间',
      bio: '把想说的话先放在这里。',
      avatar: '',
      siteName: '真爱降临',
      theme: 'cream'
    },
    cards: {
      characters: [
        {
          id: 'c_default',
          name: 'ta',
          color: 'rose',
          cards: [
            { id: uid(), text: '今天也辛苦了，先把肩膀放下来。', type: '能量' },
            { id: uid(), text: '不用急着变好，慢慢来就好。', type: '能量' },
            { id: uid(), text: '想问什么？我听着。', type: '对话' },
            { id: uid(), text: '去，还是不去？（凭第一感觉选）', type: '答案' }
          ]
        }
      ],
      history: []
    },
    ledger: {
      entries: [],
      cats: ['餐饮', '交通', '购物', '谷子', '娱乐', '日用', '其他'],
      incomeCats: ['零花', '工资', '红包', '其他']
    },
    diary: { entries: [] },
    gamelog: { entries: [] },
    iflines: [],
    showcase: [],
    settings: { volume: 55, loop: true, lastTrack: 0 }
  });

  function uid() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function deepMerge(base, incoming) {
    if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
    if (base && typeof base === 'object') {
      const out = Array.isArray(incoming) ? base : Object.assign({}, base);
      if (incoming && typeof incoming === 'object') {
        Object.keys(incoming).forEach((k) => {
          out[k] = k in base ? deepMerge(base[k], incoming[k]) : incoming[k];
        });
      }
      return out;
    }
    return incoming === undefined ? base : incoming;
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? deepMerge(defaults(), JSON.parse(raw)) : defaults();
  } catch (e) {
    console.warn('读取本地数据失败，已重置', e);
    state = defaults();
  }

  // 站名迁移：早期版本默认叫「星屑手账」
  if (state.profile && state.profile.siteName === '星屑手账') {
    state.profile.siteName = '真爱降临';
  }

  let saveTimer = null;
  function save(now) {
    const run = () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        console.warn(e);
        UI.toast('本地空间满了，试试删掉一些稿件图片');
      }
      saveTimer = null;
    };
    if (now) return run();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(run, 220);
  }

  function reset() {
    state = defaults();
    save(true);
  }

  /* ---------- 小工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function today() {
    const d = new Date();
    return ymd(d);
  }
  function ymd(d) {
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  function weekday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return isNaN(d) ? '' : '周' + WEEK[d.getDay()];
  }
  function fmtDate(dateStr, withWeek) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const base = y + '.' + m + '.' + d;
    return withWeek ? base + ' ' + weekday(dateStr) : base;
  }
  function fmtTime(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function relDays(dateStr) {
    const a = new Date(dateStr + 'T00:00:00');
    const b = new Date(today() + 'T00:00:00');
    const diff = Math.round((b - a) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    if (diff > 0) return diff + ' 天前';
    return Math.abs(diff) + ' 天后';
  }
  function money(n) {
    const v = Number(n) || 0;
    return (Math.round(v * 100) / 100).toLocaleString('zh-CN', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /* ---------- 图片压缩 ---------- */
  function compressImage(file, maxSide, quality) {
    maxSide = maxSide || 1000;
    quality = quality || 0.72;
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('不是图片文件'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('读取失败'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('图片解析失败'));
        img.onload = () => {
          let { width: w, height: h } = img;
          const scale = Math.min(1, maxSide / Math.max(w, h));
          w = Math.round(w * scale); h = Math.round(h * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- UI 小部件 ---------- */
  const UI = {
    toast(msg) {
      const wrap = $('#toastWrap');
      if (!wrap) return;
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      wrap.appendChild(el);
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 320);
      }, 2000);
    },

    /**
     * modal({ title, content, buttons:[{label, cls, action(close, root)}], wide })
     */
    modal(opts) {
      const root = $('#modalRoot');
      const back = document.createElement('div');
      back.className = 'modal-back';
      const box = document.createElement('div');
      box.className = 'modal' + (opts.wide ? ' wide' : '');
      const head = document.createElement('h3');
      head.innerHTML = esc(opts.title || '');

      const body = document.createElement('div');
      body.className = 'modal-body';
      if (typeof opts.content === 'string') body.innerHTML = opts.content;
      else if (opts.content) body.appendChild(opts.content);

      box.appendChild(head);
      box.appendChild(body);

      const close = () => {
        back.classList.remove('show');
        setTimeout(() => back.remove(), 280);
        document.removeEventListener('keydown', onKey);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(); };

      if (opts.buttons && opts.buttons.length) {
        const foot = document.createElement('div');
        foot.className = 'modal-foot';
        opts.buttons.forEach((b) => {
          const btn = document.createElement('button');
          btn.className = 'btn ' + (b.cls || '');
          btn.textContent = b.label;
          btn.onclick = () => b.action ? b.action(close, box) : close();
          foot.appendChild(btn);
        });
        box.appendChild(foot);
      }

      back.appendChild(box);
      back.onclick = (e) => { if (e.target === back) close(); };
      root.appendChild(back);
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(() => back.classList.add('show'));
      return { close, box };
    },

    confirm(text, onYes, yesLabel) {
      UI.modal({
        title: '确认一下',
        content: '<p class="muted" style="margin:0">' + esc(text) + '</p>',
        buttons: [
          { label: '算了' },
          { label: yesLabel || '确定', cls: 'primary', action: (close) => { close(); onYes(); } }
        ]
      });
    },

    prompt(title, fields, onSubmit, submitLabel) {
      const form = document.createElement('div');
      form.className = 'set-grid';
      fields.forEach((f) => {
        const wrap = document.createElement('div');
        wrap.className = 'field';
        if (f.label) {
          const lb = document.createElement('label');
          lb.textContent = f.label;
          wrap.appendChild(lb);
        }
        let input;
        if (f.type === 'textarea') {
          input = document.createElement('textarea');
          input.className = 'input';
          input.rows = f.rows || 4;
        } else if (f.type === 'select') {
          input = document.createElement('select');
          input.className = 'input';
          (f.options || []).forEach((o) => {
            const op = document.createElement('option');
            op.value = o; op.textContent = o;
            input.appendChild(op);
          });
        } else {
          input = document.createElement('input');
          input.className = 'input';
          input.type = f.type || 'text';
        }
        input.name = f.name;
        input.value = f.value == null ? '' : f.value;
        if (f.placeholder) input.placeholder = f.placeholder;
        wrap.appendChild(input);
        form.appendChild(wrap);
      });
      const m = UI.modal({
        title,
        content: form,
        buttons: [
          { label: '取消' },
          {
            label: submitLabel || '保存',
            cls: 'primary',
            action: (close) => {
              const data = {};
              $$('.input', form).forEach((i) => { data[i.name] = i.value; });
              if (onSubmit(data) !== false) close();
            }
          }
        ]
      });
      const first = $('.input', form);
      if (first) setTimeout(() => first.focus(), 260);
      return m;
    }
  };

  /* ---------- 线描图标 ---------- */
  const icon = {
    cat: '<svg viewBox="0 0 40 40"><path d="M11 16.5 8.6 8.6c-.2-.7.3-1.3 1-1.1l7 2.4M29 16.5l2.4-7.9c.2-.7-.3-1.3-1-1.1l-7 2.4"/><path d="M20 9.6c6.3 0 10.6 4.6 10.6 10.9S26.3 31 20 31 9.4 26.8 9.4 20.5 13.7 9.6 20 9.6Z"/><circle cx="16.2" cy="19.4" r=".95" fill="currentColor" stroke="none"/><circle cx="23.8" cy="19.4" r=".95" fill="currentColor" stroke="none"/><path d="M18.4 23.2c.5.6 1 .9 1.6.9s1.1-.3 1.6-.9"/><path d="M20 21.4v1.1"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="3" y="5.6" width="18" height="12.8" rx="2.6"/><path d="M3 10h18"/><path d="M7.4 14.2h4.2"/><circle cx="17" cy="14.2" r="1.1"/></svg>',
    coin: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="7.2" rx="7" ry="3.2"/><path d="M5 7.2v9.6c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V7.2"/><path d="M5 12c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 4.6h8.4c1.4 0 2.4 1 2.4 2.4v12.4H6.4C5 19.4 4 18.4 4 17V4.6Z"/><path d="M20 4.6v12.4c0 1.4-1 2.4-2.4 2.4h-2.8"/><path d="M20 4.6h-3.2c-1.4 0-2.4 1-2.4 2.4"/><path d="M7.4 8.6h4.2M7.4 12h4.2"/></svg>',
    gamepad: '<svg viewBox="0 0 24 24"><path d="M7.6 7.4h8.8c2.6 0 4.4 2.1 4.4 4.6 0 3.3-1.3 5.4-3 5.4-1.2 0-2-1-2.9-2.1-.4-.5-.9-.8-1.6-.8h-2.6c-.7 0-1.2.3-1.6.8-.9 1.1-1.7 2.1-2.9 2.1-1.7 0-3-2.1-3-5.4 0-2.5 1.8-4.6 4.4-4.6Z"/><path d="M8.4 10.4v3.2M6.8 12h3.2"/><circle cx="15.6" cy="11.2" r=".95"/><circle cx="17.8" cy="13.4" r=".95"/></svg>',
    film: '<svg viewBox="0 0 24 24"><rect x="3.2" y="5" width="17.6" height="14" rx="2.4"/><path d="M3.2 9.2h17.6M3.2 14.8h17.6"/><path d="M8.2 5v14M15.8 5v14"/></svg>',
    dice: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.15"/><circle cx="15" cy="15" r="1.15"/><circle cx="15" cy="9" r="1.15"/><circle cx="9" cy="15" r="1.15"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.6l2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16.8l-5.2 2.8 1.2-5.9-4.4-4 5.9-.7Z"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3.4c.8 3.4 2.2 4.8 5.6 5.6-3.4.8-4.8 2.2-5.6 5.6-.8-3.4-2.2-4.8-5.6-5.6 3.4-.8 4.8-2.2 5.6-5.6Z"/><path d="M17.6 15c.4 1.7 1.1 2.4 2.8 2.8-1.7.4-2.4 1.1-2.8 2.8-.4-1.7-1.1-2.4-2.8-2.8 1.7-.4 2.4-1.1 2.8-2.8Z"/></svg>',
    branch: '<svg viewBox="0 0 24 24"><circle cx="7" cy="5.6" r="2.2"/><circle cx="17" cy="5.6" r="2.2"/><circle cx="12" cy="18.4" r="2.2"/><path d="M7 7.8v3.4c0 1.6 1.2 2.8 2.8 2.8h1.4M17 7.8v3.4c0 1.6-1.2 2.8-2.8 2.8h-1.4M12 14v2.2"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 19.6s-6.8-4.2-6.8-8.6A3.9 3.9 0 0 1 12 8.3a3.9 3.9 0 0 1 6.8 2.7c0 4.4-6.8 8.6-6.8 8.6Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5.4v13.2M5.4 12h13.2"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><path d="M16.2 4.6 19.4 7.8 8.9 18.3l-4.1 1 1-4.1L16.2 4.6Z"/><path d="M14.3 6.5l3.2 3.2"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4.6 7.2h14.8M9.4 7.2V5.4h5.2v1.8"/><path d="M6.6 7.2 7.5 19a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-11.8"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3.6" y="5" width="16.8" height="14" rx="2.4"/><circle cx="8.8" cy="9.8" r="1.5"/><path d="M4 17l4.6-4.4 3.4 3 2.6-2.4L20 17.4"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><path d="M4 8.4h3.2l1.4-2.2h6.8l1.4 2.2H20v10H4Z"/><circle cx="12" cy="13.2" r="3.1"/></svg>',
    music: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6"/><path d="M12 4a8 8 0 0 1 8 8" opacity=".5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M9.4 6.4 15 12l-5.6 5.6"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7.6V12l3 1.8"/></svg>',
    tag: '<svg viewBox="0 0 24 24"><path d="M4.6 11.2V5.4c0-.5.4-.9.9-.9h5.8c.4 0 .8.2 1 .5l7 7c.4.4.4 1 0 1.4l-5.6 5.6c-.4.4-1 .4-1.4 0l-7-7a1.5 1.5 0 0 1-.7-1.2Z"/><circle cx="8.4" cy="8.4" r="1"/></svg>'
  };

  window.Store = {
    get state() { return state; },
    save, reset, uid, defaults,
    KEY
  };
  window.UI = UI;
  window.U = {
    $, $$, esc, today, ymd, weekday, fmtDate, fmtTime, relDays, money,
    pick, shuffle, debounce, compressImage, deepMerge
  };
  window.ICON = icon;
})();
