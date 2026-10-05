/* Audrey Swee — Portfolio interactions (vanilla, no dependencies) */
(() => {
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  // In-page transitions (filters, grid/list). `vt-local` tells the CSS to keep the page still
  // and only move the cards; the zoom-blur is reserved for moving between pages.
  let localVts = 0;
  const vt = (fn) => {
    if (!d.startViewTransition || reduce) return fn();
    localVts++;
    root.classList.add('vt-local');
    const t = d.startViewTransition(fn);
    // skipped when clicks overlap or the tab is hidden; the DOM update still runs
    t.ready.catch(() => {});
    t.finished.catch(() => {}).finally(() => { if (--localVts === 0) root.classList.remove('vt-local'); });
    return t;
  };
  const SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0z"/></svg>';

  /* ---------- Split hero letters (they "dance" on hover) ---------- */
  function splitLetters() {
    const layers = $$('[data-letters]');
    if (!layers.length) return;
    layers.forEach((layer) => {
      let i = 0;
      $$('.line', layer).forEach((line) => {
        const text = line.textContent.trim();
        line.textContent = '';
        [...text].forEach((ch) => {
          const s = d.createElement('span');
          s.className = 'ch';
          s.setAttribute('aria-hidden', 'true');
          s.style.setProperty('--i', i);
          s.dataset.i = i++;
          s.textContent = ch;
          line.appendChild(s);
        });
      });
    });
    if (reduce) return;
    layers.forEach((layer) => layer.addEventListener('pointerover', (e) => {
      const ch = e.target.closest('.ch');
      if (!ch || ch.classList.contains('hop')) return;
      $$(`.ch[data-i="${ch.dataset.i}"]`).forEach((c) => {
        c.classList.add('hop');
        c.addEventListener('animationend', () => c.classList.remove('hop'), { once: true });
      });
    }));
  }

  /* ---------- Page ready (drives the load-in) ---------- */
  function ready() {
    const go = () => root.classList.add('ready');
    requestAnimationFrame(() => requestAnimationFrame(go));
    setTimeout(go, 120); // rAF is paused in background tabs
  }

  /* ---------- Header: hide on scroll down ---------- */
  function header() {
    const h = $('[data-header]');
    if (!h) return;
    let last = scrollY;
    const onScroll = () => {
      const y = scrollY;
      h.classList.toggle('is-scrolled', y > 24);
      if (y > 260 && y > last + 4) { h.classList.add('is-hidden'); root.classList.add('header-hidden'); }
      else if (y < last - 4 || y < 260) { h.classList.remove('is-hidden'); root.classList.remove('header-hidden'); }
      last = y;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    h.addEventListener('focusin', () => { h.classList.remove('is-hidden'); root.classList.remove('header-hidden'); });
  }

  /* ---------- Reveal on scroll (soft-focus blur-in) ---------- */
  function reveal() {
    const targets = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) { targets.forEach((t) => t.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    targets.forEach((t) => io.observe(t));
  }

  /* ---------- Count-up numbers ---------- */
  function counters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const run = (el) => {
      const to = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix ? `<small>${el.dataset.suffix}</small>` : '';
      const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (reduce) { el.innerHTML = fmt(to) + suffix; return; }
      const t0 = performance.now();
      const step = (now) => {
        const p = clamp((now - t0) / 1600, 0, 1);
        el.innerHTML = fmt(to * (1 - Math.pow(1 - p, 4))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    }), { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Hero pointer parallax ---------- */
  function heroParallax() {
    const hero = $('.hero');
    if (!hero || !fine || reduce) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const loop = () => {
      x = lerp(x, tx, 0.08); y = lerp(y, ty, 0.08);
      hero.style.setProperty('--mx', x.toFixed(3));
      hero.style.setProperty('--my', y.toFixed(3));
      raf = (Math.abs(x - tx) > 0.001 || Math.abs(y - ty) > 0.001) ? requestAnimationFrame(loop) : 0;
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  }

  /* ---------- Hover video previews (project cards, vlog cards) ---------- */
  function hoverVideos() {
    const boxes = $$('[data-hover-video]');
    if (!boxes.length || reduce) return;
    const play = (box) => {
      const v = $('video', box);
      if (!v) return;
      if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
      const p = v.play();
      const on = () => box.classList.add('is-playing');
      if (p && p.then) p.then(on).catch(() => {}); else on();
    };
    const stop = (box) => {
      const v = $('video', box);
      if (!v) return;
      v.pause();
      box.classList.remove('is-playing');
    };
    if (fine) {
      boxes.forEach((box) => {
        const trigger = box.closest('a') || box;
        trigger.addEventListener('pointerenter', () => play(box));
        trigger.addEventListener('pointerleave', () => stop(box));
        trigger.addEventListener('focus', () => play(box));
        trigger.addEventListener('blur', () => stop(box));
      });
    } else if ('IntersectionObserver' in window) {
      // Touch: play previews while they are mostly on screen
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.intersectionRatio >= 0.65) play(e.target); else stop(e.target);
      }), { threshold: [0, 0.65] });
      boxes.forEach((b) => io.observe(b));
    }
    addEventListener('pagehide', () => boxes.forEach(stop));
  }

  /* ---------- Card tilt + image parallax ---------- */
  function cardMotion() {
    if (!fine || reduce) return;
    $$('.project__media').forEach((m) => {
      const link = m.closest('.project__link');
      link.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        m.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2)}deg`);
        m.style.setProperty('--rx', `${((0.5 - (e.clientY - r.top) / r.height) * 6).toFixed(2)}deg`);
      });
      link.addEventListener('pointerleave', () => { m.style.setProperty('--rx', '0deg'); m.style.setProperty('--ry', '0deg'); });
    });
    const imgs = $$('.project__clip > img');
    if (!imgs.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = innerHeight;
      imgs.forEach((im) => {
        const r = im.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        im.style.setProperty('--py', `${(((r.top + r.height / 2 - vh / 2) / vh) * -26).toFixed(1)}px`);
      });
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  }

  /* ---------- Work: filters, grid/list toggle, list preview ---------- */
  function work() {
    const list = $('[data-projects]');
    if (!list) return;
    const projects = $$('.project', list);
    const empty = $('[data-empty]');

    $$('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      vt(() => {
        let shown = 0;
        projects.forEach((p) => {
          const on = f === 'all' || p.dataset.tags.split(' ').includes(f);
          p.hidden = !on;
          if (on) { shown++; p.classList.add('is-in'); }
        });
        list.classList.toggle('is-filtered', f !== 'all');
        if (empty) empty.hidden = shown > 0;
      });
    }));

    const setView = (view, animate = true) => {
      $$('[data-view-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.viewBtn === view)));
      const apply = () => { list.dataset.view = view; };
      animate ? vt(apply) : apply();
      store.set('as-view', view);
    };
    $$('[data-view-btn]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.viewBtn)));
    const saved = store.get('as-view');
    if (saved === 'list' || saved === 'grid') setView(saved, false);

    if (!fine) return;
    const fp = d.createElement('div');
    fp.className = 'float-preview';
    fp.setAttribute('aria-hidden', 'true');
    fp.innerHTML = '<img alt=""><video muted loop playsinline></video>';
    d.body.appendChild(fp);
    const img = $('img', fp), vid = $('video', fp);
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
    const loop = () => {
      x = lerp(x, tx, reduce ? 1 : 0.16); y = lerp(y, ty, reduce ? 1 : 0.16);
      fp.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      raf = on || Math.abs(x - tx) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    projects.forEach((p) => {
      const link = $('.project__link', p);
      link.addEventListener('pointerenter', (e) => {
        if (list.dataset.view !== 'list') return;
        img.src = p.dataset.poster;
        vid.removeAttribute('src');
        if (p.dataset.preview && !reduce) { vid.src = p.dataset.preview; vid.play().catch(() => {}); vid.style.display = ''; }
        else vid.style.display = 'none';
        tx = x = e.clientX; ty = y = e.clientY;
        on = true;
        fp.classList.add('is-on');
        if (!raf) raf = requestAnimationFrame(loop);
      });
      link.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
      link.addEventListener('pointerleave', () => { on = false; fp.classList.remove('is-on'); vid.pause(); });
    });
  }

  /* ---------- Cursor bubble (labels on cards / photos) ---------- */
  function cursor() {
    if (!fine) return;
    root.classList.add('has-cursor');
    const c = d.createElement('div');
    c.className = 'cursor';
    c.setAttribute('aria-hidden', 'true');
    d.body.appendChild(c);
    let tx = -100, ty = -100, x = -100, y = -100, raf = 0, active = null;
    const loop = () => {
      x = lerp(x, tx, reduce ? 1 : 0.22); y = lerp(y, ty, reduce ? 1 : 0.22);
      c.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      raf = (Math.abs(x - tx) > 0.3 || Math.abs(y - ty) > 0.3) ? requestAnimationFrame(loop) : 0;
    };
    const target = (el) => {
      el = el && el.closest ? el.closest('[data-cursor]') : null;
      if (el === active) return;
      active = el;
      if (el) {
        if (!c.classList.contains('is-on')) { x = tx; y = ty; }
        c.textContent = el.dataset.cursor;
        c.classList.add('is-on');
      } else c.classList.remove('is-on');
    };
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      target(e.target);
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    // Scrolling moves content under a still pointer — re-check what's beneath it
    addEventListener('scroll', () => { if (tx > 0) target(d.elementFromPoint(tx, ty)); }, { passive: true });
    d.addEventListener('pointerleave', () => { c.classList.remove('is-on'); active = null; });
  }

  /* ---------- Glitter trail ---------- */
  function glitter() {
    if (!fine || reduce) return;
    let last = 0, lx = 0, ly = 0, live = 0;
    addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 50 || Math.hypot(e.clientX - lx, e.clientY - ly) < 16 || live > 16) return;
      if (e.target.closest && e.target.closest('[data-cursor]')) return; // the bubble is showing
      last = now; lx = e.clientX; ly = e.clientY;
      const g = d.createElement('span');
      g.className = 'glitter';
      g.innerHTML = SPARK;
      const s = 6 + Math.random() * 9;
      g.style.width = g.style.height = `${s}px`;
      g.style.setProperty('--x', `${e.clientX}px`);
      g.style.setProperty('--y', `${e.clientY}px`);
      g.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
      g.style.setProperty('--dy', `${10 + Math.random() * 26}px`);
      if (Math.random() > 0.6) g.style.color = '#F2E6D9';
      d.body.appendChild(g);
      live++;
      g.addEventListener('animationend', () => { g.remove(); live--; }, { once: true });
    }, { passive: true });
  }

  /* ---------- Magnetic buttons ---------- */
  function magnetic() {
    if (!fine || reduce) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1)}px, ${((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Draggable polaroids ---------- */
  function board() {
    const b = $('[data-board]');
    if (!b) return;
    let z = 10;
    $$('.polaroid', b).forEach((p) => {
      let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
      const pos = () => [parseFloat(p.dataset.dx || 0), parseFloat(p.dataset.dy || 0)];
      const apply = (dx, dy) => {
        const br = b.getBoundingClientRect(), pr = p.getBoundingClientRect();
        const [cx, cy] = pos();
        // keep at least 40% of the photo on the board
        dx = clamp(dx, cx + (br.left - pr.left) - pr.width * 0.6, cx + (br.right - pr.right) + pr.width * 0.6);
        dy = clamp(dy, cy + (br.top - pr.top) - pr.height * 0.6, cy + (br.bottom - pr.bottom) + pr.height * 0.6);
        p.dataset.dx = dx; p.dataset.dy = dy;
        p.style.translate = `${dx}px ${dy}px`;
      };
      p.addEventListener('pointerdown', (e) => {
        dragging = true;
        p.setPointerCapture(e.pointerId);
        p.classList.add('is-dragging');
        p.style.zIndex = ++z;
        [ox, oy] = pos();
        sx = e.clientX; sy = e.clientY;
      });
      p.addEventListener('pointermove', (e) => { if (dragging) apply(ox + e.clientX - sx, oy + e.clientY - sy); });
      const end = () => { dragging = false; p.classList.remove('is-dragging'); };
      p.addEventListener('pointerup', end);
      p.addEventListener('pointercancel', end);
      p.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 40 : 12;
        const k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!k) return;
        e.preventDefault();
        p.style.zIndex = ++z;
        const [cx, cy] = pos();
        apply(cx + k[0], cy + k[1]);
      });
    });
  }

  /* ---------- Lightbox ---------- */
  function lightbox() {
    const triggers = $$('[data-lightbox]');
    if (!triggers.length) return;
    const icon = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
    const dlg = d.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('closedby', 'any');
    dlg.setAttribute('aria-label', 'Image viewer');
    dlg.innerHTML = `
      <p class="lb-count" aria-live="polite"></p>
      <figure><img alt=""><figcaption></figcaption></figure>
      <button class="lb-btn lb-close" type="button" aria-label="Close viewer">${icon('<path d="M18 6 6 18M6 6l12 12"/>')}</button>
      <button class="lb-btn lb-prev" type="button" aria-label="Previous image">${icon('<path d="m15 18-6-6 6-6"/>')}</button>
      <button class="lb-btn lb-next" type="button" aria-label="Next image">${icon('<path d="m9 18 6-6-6-6"/>')}</button>`;
    d.body.appendChild(dlg);
    const img = $('img', dlg), cap = $('figcaption', dlg), count = $('.lb-count', dlg);
    const prev = $('.lb-prev', dlg), next = $('.lb-next', dlg);
    let group = [], idx = 0;
    const show = (n) => {
      idx = (n + group.length) % group.length;
      const t = group[idx];
      const timg = $('img', t);
      img.src = t.dataset.full || (timg && (timg.currentSrc || timg.src));
      img.alt = (timg && timg.alt) || '';
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      cap.textContent = t.dataset.caption || img.alt;
      count.textContent = group.length > 1 ? `${pad(idx + 1)} / ${pad(group.length)}` : '';
      prev.hidden = next.hidden = group.length < 2;
    };
    triggers.forEach((t) => t.addEventListener('click', (e) => {
      e.preventDefault();
      group = $$(`[data-lightbox="${t.dataset.lightbox}"]`);
      show(group.indexOf(t));
      dlg.showModal();
    }));
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    $('.lb-close', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    // Light-dismiss: native closedby="any", plus a fallback for browsers without it
    dlg.addEventListener('click', (e) => {
      if (e.target.tagName === 'FIGURE') dlg.close();
      if (!('closedBy' in HTMLDialogElement.prototype) && e.target === dlg) dlg.close();
    });
    let sx = null;
    dlg.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', (e) => {
      if (sx === null || group.length < 2) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* ---------- Tabs ---------- */
  function tabs() {
    $$('[data-tabs]').forEach((t) => {
      const btns = $$('[role="tab"]', t);
      const select = (b, focus) => {
        btns.forEach((x) => {
          const on = x === b;
          x.setAttribute('aria-selected', String(on));
          x.tabIndex = on ? 0 : -1;
          $(`#${x.getAttribute('aria-controls')}`).hidden = !on;
        });
        if (focus) b.focus();
      };
      btns.forEach((b, n) => {
        b.addEventListener('click', () => select(b));
        b.addEventListener('keydown', (e) => {
          const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
          if (k) { e.preventDefault(); select(btns[(n + k + btns.length) % btns.length], true); }
          if (e.key === 'Home') { e.preventDefault(); select(btns[0], true); }
          if (e.key === 'End') { e.preventDefault(); select(btns[btns.length - 1], true); }
        });
      });
    });
    $$('.tabpanel .gallery').forEach((g) => [...g.children].forEach((c, n) => c.style.setProperty('--n', n)));
  }

  /* ---------- Picker (design selector) ---------- */
  function pickers() {
    $$('[data-picker]').forEach((p) => {
      const stage = $('.picker__stage', p);
      const main = $('img', stage);
      const no = $('[data-picker-no]', p), txt = $('[data-picker-text]', p);
      const btns = $$('.picker__thumbs button', p);
      btns.forEach((b, n) => b.addEventListener('click', () => {
        if (b.getAttribute('aria-pressed') === 'true') return;
        btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        stage.classList.add('is-swapping');
        setTimeout(() => {
          main.src = b.dataset.src;
          main.alt = b.dataset.alt || '';
          if (no) no.textContent = pad(n + 1);
          if (txt) txt.textContent = b.dataset.caption;
          const done = () => stage.classList.remove('is-swapping');
          main.complete ? requestAnimationFrame(done) : main.addEventListener('load', done, { once: true });
        }, reduce ? 0 : 220);
      }));
    });
  }

  /* ---------- Card stack ---------- */
  function stacks() {
    $$('[data-stack]').forEach((s) => {
      let order = $$('.stack__card', s);
      const counter = $('[data-stack-count]', s.parentElement);
      let n = 0;
      const layout = () => order.forEach((c, k) => {
        c.style.setProperty('--pos', k);
        c.tabIndex = k === 0 ? 0 : -1;
        c.setAttribute('aria-hidden', String(k !== 0));
      });
      layout();
      const advance = () => {
        const top = order[0];
        top.classList.add('is-leaving');
        setTimeout(() => {
          top.classList.remove('is-leaving');
          order = [...order.slice(1), top];
          layout();
          order[0].focus({ preventScroll: true });
          n = (n + 1) % order.length;
          if (counter) counter.textContent = `${pad(n + 1)} / ${pad(order.length)}`;
        }, reduce ? 0 : 420);
      };
      order.forEach((c) => c.addEventListener('click', () => { if (c === order[0]) advance(); }));
    });
  }

  /* ---------- Video players ---------- */
  function players() {
    $$('[data-player]').forEach((p) => {
      const v = $('video', p);
      const btn = $('.vplayer__play', p);
      if (!v || !btn) return;
      v.controls = false;
      btn.addEventListener('click', () => {
        p.classList.add('is-started');
        v.controls = true;
        const r = v.play();
        if (r && r.catch) r.catch(() => {});
        v.focus({ preventScroll: true });
      });
    });
    $$('video[data-ambient]').forEach((v) => {
      if (reduce) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; return; }
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) { const r = v.play(); if (r && r.catch) r.catch(() => {}); } else v.pause();
      }), { threshold: 0.25 });
      io.observe(v);
    });
    addEventListener('pagehide', () => $$('video').forEach((v) => v.pause()));
  }

  /* ---------- Next-project image follows pointer ---------- */
  function nextProject() {
    const n = $('.next');
    if (!n || !fine || reduce) return;
    n.addEventListener('pointermove', (e) => {
      const r = n.getBoundingClientRect();
      n.style.setProperty('--nx', `${((e.clientX - r.left) / r.width - 0.7) * 120}px`);
      n.style.setProperty('--ny', `${((e.clientY - r.top) / r.height - 0.5) * 80}px`);
    });
  }

  /* ---------- Sticky sub-nav highlight ---------- */
  function subnav() {
    const nav = $('.subnav');
    if (!nav) return;
    const links = $$('a', nav);
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove('is-active'));
      const a = map.get(e.target.id);
      if (a) { a.classList.add('is-active'); nav.scrollTo({ left: a.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' }); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => { const s = d.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Misc ---------- */
  function misc() {
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    $$('[data-top]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }));
  }

  splitLetters();
  ready();
  header();
  reveal();
  counters();
  heroParallax();
  hoverVideos();
  cardMotion();
  work();
  cursor();
  glitter();
  magnetic();
  board();
  lightbox();
  tabs();
  pickers();
  stacks();
  players();
  nextProject();
  subnav();
  misc();
})();
