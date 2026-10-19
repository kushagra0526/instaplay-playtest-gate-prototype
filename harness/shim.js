// Injected before any game script. Virtual time, seeded randomness, input like a real user, frame sampling.
(() => {
  const H = (window.__H = { t: 0, raf: [], timers: [], id: 1, errors: [], cryptoCalls: 0 });
  // seeded Math.random (mulberry32); same seed every page load
  let s = 12345;
  Math.random = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const T0 = 1767225600000, RealDate = Date;
  window.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(T0 + Math.floor(H.t)); } static now() { return T0 + Math.floor(H.t); } };
  performance.now = () => H.t;
  window.requestAnimationFrame = (cb) => { const id = H.id++; H.raf.push([id, cb]); return id; };
  window.cancelAnimationFrame = (id) => { H.raf = H.raf.filter((x) => x[0] !== id); };
  window.setTimeout = (cb, ms = 0, ...a) => { const id = H.id++; H.timers.push({ id, at: H.t + Math.max(0, +ms || 0), cb, a }); return id; };
  window.setInterval = (cb, ms = 0, ...a) => { const every = Math.max(4, +ms || 0); const id = H.id++; H.timers.push({ id, at: H.t + every, every, cb, a }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { H.timers = H.timers.filter((x) => x.id !== id); };
  const realGRV = crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues = (arr) => { H.cryptoCalls++; return realGRV(arr); };
  window.addEventListener('error', (e) => H.errors.push({ t: H.t, msg: String(e.message) }));
  const call = (fn, args) => { try { fn(...args); } catch (e) { H.errors.push({ t: H.t, msg: String(e && e.message || e) }); } };

  // one display frame: due timers fire at most once each (a busy page coalesces them), then rAF callbacks
  H.frame = (dt) => {
    const end = H.t + dt;
    const due = H.timers.filter((x) => x.at <= end).sort((a, b) => a.at - b.at);
    for (const tm of due) {
      if (!H.timers.includes(tm)) continue;
      H.t = Math.max(H.t, tm.at);
      if (tm.every) { tm.at += tm.every; while (tm.at <= end) tm.at += tm.every; } else H.timers = H.timers.filter((x) => x !== tm);
      call(tm.cb, tm.a);
    }
    H.t = end;
    const q = H.raf; H.raf = [];
    for (const [, cb] of q) call(cb, [H.t]);
  };

  const CODES = { ' ': ['Space', 32], Enter: ['Enter', 13], ArrowLeft: ['ArrowLeft', 37], ArrowUp: ['ArrowUp', 38], ArrowRight: ['ArrowRight', 39],
    ArrowDown: ['ArrowDown', 40], a: ['KeyA', 65], d: ['KeyD', 68], w: ['KeyW', 87], s: ['KeyS', 83], r: ['KeyR', 82] };
  const keyEv = (type, key) => {
    const [code, kc] = CODES[key];
    const ev = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { get: () => kc }); Object.defineProperty(ev, 'which', { get: () => kc });
    (document.activeElement || document.body).dispatchEvent(ev);  // keys go to the focused element, like a real browser
  };
  const mainCanvas = () => [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  let lastTouch = null;
  const tap = (phase, fx, fy) => {
    const cv = mainCanvas(); if (!cv) return;
    const r = cv.getBoundingClientRect(); const x = r.left + fx * r.width, y = r.top + fy * r.height;
    const el = document.elementFromPoint(x, y) || document.body;
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y };
    if (phase === 'down') {
      const p = new PointerEvent('pointerdown', { ...o, pointerType: 'touch', isPrimary: true, pointerId: 1 });
      el.dispatchEvent(p);
      let te = null;
      try { lastTouch = new Touch({ identifier: 1, target: el, clientX: x, clientY: y }); te = new TouchEvent('touchstart', { ...o, touches: [lastTouch], targetTouches: [lastTouch], changedTouches: [lastTouch] }); el.dispatchEvent(te); } catch (e) { /* no touch support */ }
      // compatibility mouse events are suppressed when the page cancels the pointer/touch event
      if (!p.defaultPrevented && !(te && te.defaultPrevented)) el.dispatchEvent(new MouseEvent('mousedown', o));
    } else {
      const p = new PointerEvent('pointerup', { ...o, pointerType: 'touch', isPrimary: true, pointerId: 1 });
      el.dispatchEvent(p);
      let te = null;
      try { te = new TouchEvent('touchend', { ...o, touches: [], targetTouches: [], changedTouches: [lastTouch] }); el.dispatchEvent(te); } catch (e) { /* no touch support */ }
      if (!p.defaultPrevented && !(te && te.defaultPrevented)) { el.dispatchEvent(new MouseEvent('mouseup', o)); el.dispatchEvent(new MouseEvent('click', o)); }
    }
  };
  const dispatch = (e) => {
    if (e.kind === 'key') {
      keyEv(e.down ? 'keydown' : 'keyup', e.key);
      if (e.down && (e.key.length === 1 || e.key === 'Enter')) keyEv('keypress', e.key);  // no keypress for arrows
    } else tap(e.down ? 'down' : 'up', e.x, e.y);
  };

  const off = document.createElement('canvas'); off.width = 36; off.height = 64;
  const small = document.createElement('canvas'); small.width = 45; small.height = 80;
  const pixels = (c, cv) => { const o = c.getContext('2d', { willReadFrequently: true }); o.clearRect(0, 0, c.width, c.height); o.drawImage(cv, 0, 0, c.width, c.height); return o.getImageData(0, 0, c.width, c.height).data; };
  const hash = () => { const cv = mainCanvas(); if (!cv) return 'none'; const d = pixels(off, cv); let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i] >> 3; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const thumb = () => { const cv = mainCanvas(); const d = pixels(small, cv); const g = []; for (let i = 0; i < d.length; i += 4) g.push(Math.round((d[i] + d[i + 1] + d[i + 2]) / 3 * d[i + 3] / 255)); return g; };
  const contract = () => { try { return window.__game ? { score: +window.__game.score(), over: !!window.__game.over() } : null; } catch (e) { return null; } };

  // plan: {fps, ms, sampleMs, thumbs:[t...], events:[{t, kind, key|x,y, down}], pauseOnOver}
  H.run = (p) => {
    const dt = 1000 / p.fps, ev = p.events.slice().sort((a, b) => a.t - b.t);
    const out = { samples: [], thumbs: {}, sent: [] };
    let ei = 0, nextSample = 0, shift = 0, paused = false;
    const want = (p.thumbs || []).slice().sort((a, b) => a - b);
    while (H.t < p.ms) {
      while (ei < ev.length && ev[ei].t + shift <= H.t) { dispatch(ev[ei]); out.sent.push(H.t); ei++; }
      H.frame(dt);
      while (want.length && H.t >= want[0]) out.thumbs[want.shift()] = thumb();
      if (H.t >= nextSample) {
        const c = contract();
        out.samples.push({ t: H.t, h: hash(), score: c ? c.score : null, over: c ? c.over : null });
        nextSample += p.sampleMs;
        // look at the first game-over screen with hands off, like a tester would
        if (p.pauseOnOver && c && c.over && !paused) { paused = true; shift += p.pauseOnOver; }
      }
    }
    out.errors = H.errors.slice(); out.cryptoCalls = H.cryptoCalls; out.contract = !!window.__game;
    return out;
  };
})();
