/*
 * Disc Carousel
 * Copyright (c) 2026 PROJECT Y/O. Effect Atlas License 1.0 (effectatlas.com/license)
 * Keep this notice when you copy or adapt the code; no visible credit is needed in your project.
 *
 * Nine glossy discs in real 3D (Three.js) stand on a diagonal arc, far at the lower left, near at the upper right.
 * Adapted for Suiji: three discs (focus / short break / long break), mode-coloured label accents,
 * and the pomodoro timer HUD layered above the active disc.
 * One wheel notch moves exactly one disc; during a change the whole row leans, banks and dips with the speed, and far
 * discs trail behind. Click a disc to jump to it. Good for a record or release shelf, a product lineup or a
 * collection index.
 *
 * How it moves
 * - Position L is a float with no limits. Disc i uses the copy of itself nearest to L: p = i + 9 x round((L - i) / 9),
 *   m = p - L, always within +-4.5, so the row loops forever without a seam.
 * - Arc, per disc, with angle th = m x 0.35 rad:
 *   x = sin(th) x 2.3 x 2.4 x gap / 100, z = 2.4 x (1 - cos th), rotateY = -th + lean,
 *   y = 0.06 for the current disc (it sits slightly higher), scale = 1 for the current disc, else
 *   max(0.8, 1 - |m| x 0.12). The whole row is in a group rotated -30 deg on X and -30 deg on Y and scaled 1.08,
 *   which turns the flat arc into the diagonal. Camera: 40 deg field of view at z 4.4, moved back on narrow aspect
 *   ratios so the row still fits (z = max(4.4, 3.6 / (2 tan 20 deg x aspect))). Fog from 7 to 14 units (scaled with
 *   the camera distance) in the surface colour.
 * - Change: L is tweened to the next whole disc with cubic-bezier(.32, .72, 0, 1). Durations, with snap = glide / 1000
 *   - 0.05 s: wheel = glide (0.51 s by default); keys and swipes = min(0.6, snap - 0.04 + 0.05 x discs moved);
 *   click = clamp(0.45 + 0.11 x discs moved, snap, 1.05). A new input during a tween re-targets from where it is.
 * - Flow: a speed value v chases dL/dt (clamped +-40) at rate 14 while speeding up and 6 while slowing down. Each change
 *   also kicks v: wheel 2.5, key 4, click min(5, 1.4 x discs moved), clamped +-12.
 *   lean = clamp(sign(v) x sqrt(|v|) x 0.055 x lean%, +-0.3) rad, added to rotateY (x 1.12 on non-current discs);
 *   bank: rotateZ = -lean x 0.32 (x 0.7 on the current disc); dip: y -= min(0.09, |v| x 0.014 x lean%)
 *   (x 0.7 on the current disc).
 * - Trail: every disc chases its arc slot separately, rate k = clamp(11 - |m| x 1.15 x trail%, 6.5, 15) per second,
 *   for position, rotation and scale. Far discs lag; the row reads as a chain, not a rigid wheel.
 * - Wrap-around: a disc whose copy jumps to the other end slides in from the side (x +- 0.9, z - 0.45, rotateY -+ 0.3,
 *   scale x 0.72) and is pulled into place by the same chase. The jump happens out of view.
 * - Wheel, one notch = one disc: deltas are converted to px (line x 16, page x window size); horizontal wins if it is
 *   1.25x larger. Below 0.3 px is noise. Deltas (max 24 each) accumulate to 6 px for one step. After a step the wheel
 *   is disarmed until one of: a gap of 130 ms, a separate notch (gap 34 ms+, 90 ms+ since the step, as strong as the
 *   peak), a clear acceleration (1.2x the decaying envelope, 550 ms time constant) 190 ms+ after the step, or 480 ms of
 *   sustained input at 80 % of the peak. 150 ms without events resets everything. So a mouse notch moves one disc and a
 *   trackpad flick moves one disc, not ten. Ctrl+wheel is left to the browser (zoom). The wheel over the row always
 *   changes discs; it never hands off to page scroll.
 * - Click (under 6 px of movement) on a disc: raycast against the disc faces, go to that disc. Touch swipe over 24 px
 *   horizontally: one disc. Mouse hover over another disc shows a pointer cursor.
 * - Rendering: one WebGLRenderer, alpha, ACES filmic tone mapping at exposure 0.86, pixel ratio capped at 2. Each disc is
 *   a printed front (canvas texture, clearcoat, procedural normal map of fine rings and scratches), a dark metal back,
 *   a bevelled lathe edge and a three-layer clear hub (transmission). A procedural float environment map with a thin
 *   bright band gives the moving strip highlight. Four directional lights plus ambient. It renders only while something
 *   moves.
 * - Without WebGL, after a lost context, or with ?fallback in the page URL, the same matrices drive CSS 3D
 *   (perspective + matrix3d) on canvas-painted divs, with fog as opacity.
 *
 * Options
 *   params.glide  300..900, default 510   ms for one wheel step; keys and clicks are derived from it
 *   params.gap    70..130, default 100    spacing along the arc in percent
 *   params.lean   0..200, default 100     lean, bank and dip during a change in percent; 0 keeps the row rigid
 *   params.trail  0..200, default 100     how much far discs lag in percent; 0 moves all discs together
 *   reducedMotion true / false / null     force reduced motion; null follows prefers-reduced-motion live
 *
 * API
 *   const fx = mountDiscCarousel(element, {params: {...}, reducedMotion: null});
 *   fx.params                 copy of current params
 *   fx.setParams({gap: 120})  change params live
 *   fx.setPaused(true|false)  freeze / resume; input is ignored while paused
 *   fx.reset()                params back to defaults, the row slides back to the third disc (the start
 *                             position, nearest copy) over glide ms with no lean
 *   fx.goTo(n)                glide to disc n (0..8; the nearest copy on the ring, same glide as a key press); returns false if paused or already there
 *   fx.setReducedMotion(bool)
 *   fx.destroy()              removes listeners, observers; disposes geometries, textures,
 *                             materials, the environment target and the WebGL context
 *
 * Usage (plain HTML)
 *   <link rel="stylesheet" href="effect.css">
 *   <div id="stage" style="height:560px"></div>
 *   <script src="three.min.js"></script>
 *   <script src="effect.js"></script>
 *   <script>const fx = mountDiscCarousel(document.getElementById('stage'));</script>
 * The element needs a real width and height; the effect fills it and replaces its children. three.min.js must load
 * first (window.THREE); without it the CSS 3D fallback is used.
 *
 * Safe to change
 * - Disc faces: drawFace(D, i, tok) paints face i on a square canvas (transparent hole, silver ring, print area
 *   0.335..0.865 of the radius, ring text band, an accent arc at 3 o'clock). Replace the print area with your artwork,
 *   or draw an image into it. Colours come from --ink, --ink-3, --accent, --surface and --font on the element.
 * - Lights, material values and the environment bands, if you keep the look consistent.
 * - Params within their ranges. The disc count is the constant N (9); keep it at least 9 so the wrap stays off screen.
 *
 * Do not change (the feel breaks)
 * - The wheel gate (6 px threshold, the re-arm rules). Mapping wheel delta straight to position turns one trackpad
 *   flick into a spin through the whole row.
 * - The per-disc chase with the falloff toward the ends; a single shared transform loses the trailing chain.
 * - Lean from the square root of flow speed, chasing faster up (14) than down (6); linear lean looks jerky.
 * - The (.32, .72, 0, 1) curve: a fast start and a long soft landing.
 * - Nearest-copy indexing (p = i + 9 round((L - i) / 9)); clamping L instead creates an end and a jump.
 *
 * Porting (React, Vue, Svelte, Webflow)
 * - Mount once on a ref after the element is in the DOM; call fx.destroy() on unmount (useEffect cleanup,
 *   onBeforeUnmount). This matters here: each mount creates a WebGL context, and browsers allow only a handful.
 *   In React StrictMode the mount runs twice; destroy in the cleanup handles that.
 * - Render an empty container and let the effect own its children. Push param changes through fx.setParams.
 * - Use the bundled three.js r128 global build, or import three and assign it to window.THREE before mounting. The code
 *   uses r128 APIs (outputEncoding, sRGBEncoding); on newer three.js versions these are renamed.
 * - Load effect.css globally (class names are not scoped). In Webflow, paste CSS and JS into custom code, add
 *   three.min.js before it and call mountDiscCarousel on an embed div with a fixed height.
 * - SSR: only call it in the browser.
 *
 * Accessibility and reduced motion
 * - The viewport takes focus (tabindex 0) and handles ArrowLeft / ArrowRight (one disc), Home / End (nearest first /
 *   last disc). It is a role="group" with aria-roledescription "carousel" and a label, and a polite live region
 *   announces "03 / 09". The canvas and CSS layers inside are aria-hidden; label the discs yourself if you put real
 *   content on them.
 * - With reduced motion: no tween, no lean, no trail; a change jumps straight to the target disc.
 * - Only renders while something moves; the loop stops when the tab is hidden, the stage is off screen or it is paused.
 *
 * Third-party: three.js r128 (three.min.js, MIT License, Copyright 2010-2021 Three.js Authors; see three.LICENSE.txt).
 */
const global = typeof window !== 'undefined' ? window : globalThis;
  'use strict';

  // ---- inlined from the shared runtime: math helpers ----
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const R = { clamp, mix };

  // ---- inlined from the shared runtime: lifecycle ----
  // One requestAnimationFrame loop that runs only while something moves; pauses when the tab is hidden, the element is
  // off screen or setPaused(true); follows prefers-reduced-motion live; re-measures on resize; destroy() removes every
  // listener and observer it added.
  function scope(element, controls, options) {
    options = options || {};
    const defaults = Object.fromEntries(controls.map((control) => [control.key, control.default]));
    let params = Object.assign({}, defaults, options.params || {});
    let paused = false,
      destroyed = false,
      visible = true,
      reducedOverride = null;
    let raf = 0,
      last = 0,
      time = 0,
      frameCount = 0,
      draw = () => false,
      ticking = false;
    let width = 1,
      height = 1,
      active = true;
    const cleanup = [],
      hooks = new Map();
    // Only card wrappers that supply a startup coordinator opt into deferred preparation.
    // Keep mount synchronous, but prevent font/resize/replay callbacks from drawing an incomplete renderer.
    const startup = options.card && options.card.startup;
    let preparing = !!startup,
      preparationRevision = 0,
      preparationState = preparing ? 'pending' : 'legacy';
    let resolveReady,
      rejectReady,
      preparationError = null,
      preparationStarted = false;
    const abortError = () =>
      (startup && startup.signal.aborted && startup.signal.reason) ||
      new DOMException('Effect preparation was cancelled', 'AbortError');
    const ready = preparing
      ? new Promise((resolve, reject) => {
          resolveReady = resolve;
          rejectReady = reject;
        })
      : null;
    if (ready) ready.catch(() => {});
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let preferenceReduced = preference.matches;
    const reduced = () => (reducedOverride === null ? preferenceReduced : reducedOverride);
    const emit = (type, value) => {
      (hooks.get(type) || []).forEach((fn) => fn(value));
    };
    function listen(target, type, fn, listenerOptions) {
      target.addEventListener(type, fn, listenerOptions);
      cleanup.push(() => target.removeEventListener(type, fn, listenerOptions));
      return fn;
    }
    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
    function allowed() {
      return (
        !destroyed &&
        !preparing &&
        preparationState !== 'failed' &&
        !paused &&
        visible &&
        !document.hidden &&
        !reduced()
      );
    }
    function tick(now) {
      raf = 0;
      if (!allowed()) return;
      const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0;
      last = now;
      time += dt;
      frameCount++;
      // A wake() from inside draw (directly or via measure/setParams/replay) books the next frame itself;
      // it must not reset `last` (the loop never went idle) and the line below must not book a second one.
      ticking = true;
      try {
        active = draw({ dt, time, width, height, params, reduced: false }) !== false;
      } finally {
        ticking = false;
      }
      if (active && allowed() && !raf) raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (allowed() && !raf) {
        if (!ticking) last = 0;
        raf = requestAnimationFrame(tick);
      }
    }
    function paint() {
      if (destroyed || preparing || preparationState === 'failed') return;
      active = draw({ dt: 0, time, width, height, params, reduced: reduced() }) !== false;
    }
    function measure() {
      if (destroyed) return;
      const nextWidth = Math.max(1, element.clientWidth),
        nextHeight = Math.max(1, element.clientHeight);
      if (preparing) {
        if (width !== nextWidth || height !== nextHeight) preparationRevision++;
        width = nextWidth;
        height = nextHeight;
        return;
      }
      width = nextWidth;
      height = nextHeight;
      emit('resize', { width, height });
      paint();
      if (active) wake();
    }
    function syncMotion() {
      stop();
      element.dataset.reduced = String(reduced());
      if (preparing) {
        preparationRevision++;
        return;
      }
      emit('motion', reduced());
      paint();
      if (active) wake();
    }
    const api = {
      element,
      defaults,
      listen,
      get params() {
        return params;
      },
      get time() {
        return time;
      },
      get width() {
        return width;
      },
      get height() {
        return height;
      },
      get paused() {
        return paused;
      },
      get reduced() {
        return reduced();
      },
      get destroyed() {
        return destroyed;
      },
      get preparing() {
        return preparing;
      },
      invalidatePreparation() {
        if (preparing) preparationRevision++;
      },
      on(type, fn) {
        if (!hooks.has(type)) hooks.set(type, []);
        hooks.get(type).push(fn);
        return fn;
      },
      cleanup(fn) {
        cleanup.push(fn);
        return fn;
      },
      frame(fn) {
        draw = fn;
        measure();
        wake();
      },
      wake,
      paint,
      measure,
      runPreparationPhase(fn, label) {
        if (!startup) return Promise.resolve().then(fn);
        if (destroyed || preparationError || startup.signal.aborted)
          return Promise.reject(preparationError || abortError());
        return startup.runPhase(() => {
          if (destroyed || preparationError || startup.signal.aborted) throw preparationError || abortError();
          return fn();
        }, label);
      },
      prepare(task) {
        if (!startup || preparationStarted) return ready;
        preparationStarted = true;
        // Params/replay/resize may change while a GPU compilation or font is pending. Re-run only the
        // module's idempotent preparation work for the newest inputs, with its renderer resources reused.
        (async () => {
          while (preparing && !destroyed && !preparationError) {
            measure();
            const revision = preparationRevision;
            await task((fn, label) => api.runPreparationPhase(fn, label));
            const completed = await api.runPreparationPhase(() => {
              measure();
              if (revision !== preparationRevision) return false;
              time = 0;
              last = 0;
              preparing = false;
              try {
                paint();
              } catch (error) {
                preparing = true;
                throw error;
              }
              preparationState = 'ready';
              element.dataset.preparation = 'ready';
              resolveReady(api);
              if (active) wake();
              return true;
            }, 'first-frame');
            if (completed) break;
          }
        })().catch((error) => api.failPreparation(error));
        return ready;
      },
      failPreparation(error) {
        if (!startup || preparationState === 'ready' || preparationState === 'failed') return;
        preparationError =
          error instanceof Error || (error && error.name)
            ? error
            : new Error(String(error || 'Effect preparation failed'));
        preparationState = 'failed';
        preparing = false;
        stop();
        element.dataset.preparation = 'failed';
        rejectReady(preparationError);
        api.destroy();
      },
      setParams(next) {
        if (destroyed) return;
        const updated = Object.assign({}, params);
        controls.forEach((control) => {
          if (!Object.hasOwn(next || {}, control.key)) return;
          let value = next[control.key];
          if (control.type === 'range')
            value = Number.isFinite(+value) ? clamp(+value, control.min, control.max) : control.default;
          else if (control.type === 'color')
            value = /^#[a-f0-9]{6}$/i.test(String(value)) ? String(value) : control.default;
          else if (control.type === 'toggle') value = !!value;
          else if (control.type === 'select' && !control.options.some((option) => option.value === value))
            value = control.default;
          updated[control.key] = value;
        });
        params = updated;
        if (preparing) {
          preparationRevision++;
          return;
        }
        emit('params', params);
        paint();
        if (active) wake();
      },
      setPaused(value) {
        if (destroyed) return;
        paused = !!value;
        element.dataset.paused = String(paused);
        stop();
        emit('pause', paused);
        if (!paused) {
          paint();
          if (active) wake();
        }
      },
      setReduced(value) {
        if (destroyed) return;
        reducedOverride = value == null ? null : !!value;
        syncMotion();
      },
      replay() {
        if (destroyed) return;
        stop();
        time = 0;
        if (preparing) {
          preparationRevision++;
          return;
        }
        emit('replay');
        paint();
        if (active) wake();
      },
      reset() {
        api.setParams(defaults);
        api.replay();
      },
      destroy() {
        if (destroyed) return;
        if (preparing) api.failPreparation(abortError());
        if (destroyed) return;
        destroyed = true;
        stop();
        try {
          emit('destroy');
        } finally {
          cleanup
            .splice(0)
            .reverse()
            .forEach((fn) => {
              try {
                fn();
              } catch {}
            });
          hooks.clear();
          element.dataset.destroyed = 'true';
        }
      },
      status() {
        return {
          time,
          raf,
          frameCount,
          width,
          height,
          paused,
          destroyed,
          visible,
          reduced: reduced(),
          preparing,
          preparation: preparationState,
          listeners: cleanup.length,
          params: Object.assign({}, params),
        };
      },
    };
    if (ready) {
      api.ready = ready;
      element.dataset.preparation = 'pending';
      listen(startup.signal, 'abort', () => api.destroy());
      if (startup.signal.aborted) Promise.resolve().then(() => api.destroy());
    }
    listen(preference, 'change', (event) => {
      preferenceReduced = event.matches;
      syncMotion();
    });
    listen(document, 'visibilitychange', () => {
      stop();
      emit('visibility', !document.hidden);
      if (!document.hidden) wake();
    });
    listen(window, 'pageshow', (event) => {
      if (event.persisted) {
        measure();
        wake();
      }
    });
    listen(window, 'pagehide', (event) => {
      if (event.persisted) stop();
      else api.destroy();
    });
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    cleanup.push(() => resize.disconnect());
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      stop();
      emit('visibility', visible);
      if (visible) wake();
    });
    intersection.observe(options.visibilityTarget || element);
    cleanup.push(() => intersection.disconnect());
    element.dataset.reduced = String(reduced());
    width = Math.max(1, element.clientWidth);
    height = Math.max(1, element.clientHeight);
    return api;
  }

  const CONTROLS = [
    { key: 'glide', type: 'range', default: 510, min: 300, max: 900, step: 10 },
    { key: 'gap', type: 'range', default: 100, min: 70, max: 130, step: 1 },
    { key: 'lean', type: 'range', default: 100, min: 0, max: 200, step: 5 },
    { key: 'trail', type: 'range', default: 100, min: 0, max: 200, step: 5 },
  ];

  // ---- the effect ----
  const STRIP = { y: 0.27, h: 0.016, gain: 6 };
  const N = 3,
    START = 0,
    wrap = (n) => ((n % N) + N) % N;
  const K = {
    radius: 2.4,
    depth: 1,
    step: 0.35,
    activeY: 0.06,
    hGap: 2.3,
    rotY: -30,
    groupScale: 1.08,
    rotX: -30,
    fov: 40,
    camZ: 4.4,
    inactiveScale: 0.8,
    lean: 0.055,
    leanMax: 0.3,
    bank: 0.32,
    dip: 0.014,
    dipMax: 0.09,
    followBase: 11,
    followTight: 15,
    followFalloff: 1.15,
    followMin: 6.5,
    spawnSlide: 0.9,
    spawnShrink: 0.72,
    fogNear: 7,
    fogFar: 14,
    hole: 0.14,
    hub: 0.24,
    edgeBleed: 0.026,
    thick: 0.01,
    matrixWidth: 0.4,
    frosted: 0.54,
  };
  /**
   * 沉浸模式专用机位：把整组三盘当成一个正面排列的物体重新取景。
   * 不是只转当前盘，而是把整组从斜置机位拉正、镜头后退，三盘都进入同一视角。
   */
  const VIEW = {
    rotX: 0,
    rotY: 0,
    groupScale: 1,
    /** 沉浸时镜头回到基准距离，中间盘由页面放大承担 */
    camScale: 1,
    /** 两侧盘在过渡时稍微上抬/外推，随后缩小消失 */
    sideLift: 0.35,
    sideSpread: 0.2,
  };
  const WHEEL = {
    ms: { envelope: 550, idle: 150, pause: 130, notch: 34, afterNotch: 90, afterFlick: 190, hold: 480 },
    px: { floor: 0.3, perEvent: 24, toStep: 6 },
    ratio: { notch: 1, hold: 0.8, rise: 1.2 },
  };
  function cubicBezier(x1, y1, x2, y2) {
    const at = (a, b, s) => {
        const r = 1 - s;
        return 3 * r * s * (r * a + s * b) + s * s * s;
      },
      rate = (a, b, s) => {
        const r = 1 - s;
        return 3 * (r * r * a + 2 * r * s * (b - a) + s * s * (1 - b));
      };
    return (p) => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let s = p,
        done = false;
      for (let n = 0; n < 6; n++) {
        const miss = at(x1, x2, s) - p,
          k = rate(x1, x2, s);
        done = Math.abs(miss) < 1e-7;
        if (done || Math.abs(k) < 1e-6) break;
        const next = s - miss / k;
        if (next < 0 || next > 1) break;
        s = next;
      }
      if (done) return at(y1, y2, s);
      let lo = 0,
        hi = 1;
      while (hi - lo > 1e-7) {
        s = (lo + hi) / 2;
        if (at(x1, x2, s) < p) lo = s;
        else hi = s;
      }
      return at(y1, y2, (lo + hi) / 2);
    };
  }
  const ENERGY = cubicBezier(0.32, 0.72, 0, 1),
    POWER3 = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  const M4 = {
    mul(a, b) {
      const o = new Array(16);
      for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
          o[c * 4 + r] = s;
        }
      return o;
    },
    rx(t) {
      const c = Math.cos(t),
        s = Math.sin(t);
      return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
    },
    ry(t) {
      const c = Math.cos(t),
        s = Math.sin(t);
      return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
    },
    rz(t) {
      const c = Math.cos(t),
        s = Math.sin(t);
      return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    },
    tr(x, y, z) {
      return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
    },
    sc(x, y, z) {
      return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
    },
  };
  const RAD = Math.PI / 180;
  function drawFace(D, i, tok) {
    const c = document.createElement('canvas');
    c.width = c.height = D;
    const g = c.getContext('2d'),
      R = D / 2,
      C = D / 2,
      TAU = Math.PI * 2;
    const ink = tok.ink,
      ink2 = '#5c5b56',
      ink3 = tok.ink3,
      paper = '#ffffff',
      light = '#e6e6e3',
      pale = '#cfcfcb',
      mode = (tok.modeMeta && tok.modeMeta[i]) || null,
      acc = (mode && mode.accent) || tok.accent,
      font = tok.font || 'sans-serif';
    const PRINT = 0.335,
      BAND_IN = 0.865,
      BAND_OUT = 0.955;
    const circle = (r) => {
      g.beginPath();
      g.arc(C, C, r * R, 0, TAU);
    };
    const disk = (r, col) => {
      circle(r);
      g.fillStyle = col;
      g.fill();
    };
    const ring = (r, w, col) => {
      circle(r);
      g.lineWidth = w * R;
      g.strokeStyle = col;
      g.stroke();
    };
    const sector = (r0, r1, a0, a1, col) => {
      g.beginPath();
      g.arc(C, C, r1 * R, a0, a1);
      g.arc(C, C, r0 * R, a1, a0, true);
      g.closePath();
      g.fillStyle = col;
      g.fill();
    };
    const clipAnnulus = (r0, r1) => {
      g.beginPath();
      g.arc(C, C, r1 * R, 0, TAU);
      g.arc(C, C, r0 * R, 0, TAU, true);
      g.clip('evenodd');
    };
    const S = [
      {
        bg: paper,
        fg: ink,
        field() {
          for (let k = 0; k < 24; k++) ring(PRINT + 0.025 + k * 0.0215, 0.004, ink);
          sector(PRINT, BAND_IN - 0.03, -Math.PI / 2, 0, ink);
        },
      },
      {
        bg: ink,
        fg: paper,
        field() {
          for (let k = 0; k < 60; k++) {
            const a = (k / 60) * TAU,
              l = k % 5 ? 0.07 : 0.2,
              w = k % 5 ? 0.006 : 0.014;
            g.save();
            g.translate(C, C);
            g.rotate(a);
            g.fillStyle = paper;
            g.fillRect((-w * R) / 2, -(BAND_IN - 0.035) * R, w * R, l * R);
            g.restore();
          }
          ring(0.5, 0.003, 'rgba(255,255,255,.55)');
        },
      },
      {
        bg: light,
        fg: ink,
        field() {
          g.fillStyle = ink;
          g.fillRect(0, 0, D, C - 0.02 * R);
          g.strokeStyle = ink;
          g.lineWidth = 0.005 * R;
          for (let y = C + 0.06 * R; y < D; y += 0.038 * R) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(D, y);
            g.stroke();
          }
        },
        band: 'split',
      },
      {
        bg: paper,
        fg: ink,
        field() {
          const a = -0.7,
            b = a + Math.PI,
            d = 0.6,
            r = 0.24;
          g.save();
          g.beginPath();
          g.arc(C + Math.cos(a) * d * R, C + Math.sin(a) * d * R, r * R, 0, TAU);
          g.fillStyle = ink;
          g.fill();
          g.clip();
          for (let k = 1; k < 6; k++) {
            g.beginPath();
            g.arc(C + Math.cos(a) * d * R, C + Math.sin(a) * d * R, k * 0.045 * R, 0, TAU);
            g.lineWidth = 0.005 * R;
            g.strokeStyle = 'rgba(255,255,255,.75)';
            g.stroke();
          }
          g.restore();
          g.beginPath();
          g.arc(C + Math.cos(b) * d * R, C + Math.sin(b) * d * R, r * R, 0, TAU);
          g.lineWidth = 0.006 * R;
          g.strokeStyle = ink;
          g.stroke();
          g.beginPath();
          g.moveTo(C + Math.cos(a) * (d + r + 0.02) * R, C + Math.sin(a) * (d + r + 0.02) * R);
          g.lineTo(C + Math.cos(b) * (d + r + 0.02) * R, C + Math.sin(b) * (d + r + 0.02) * R);
          g.lineWidth = 0.003 * R;
          g.stroke();
        },
      },
      {
        bg: ink3,
        fg: ink,
        field() {
          const cols = [ink, paper, pale, ink, paper, ink3, ink, pale];
          for (let k = 0; k < 8; k++)
            sector(PRINT, BAND_IN, -Math.PI / 2 + (k * TAU) / 8, -Math.PI / 2 + ((k + 1) * TAU) / 8 - 0.004, cols[k]);
          disk(0.47, ink3);
          ring(0.47, 0.004, ink);
        },
      },
      {
        bg: ink,
        fg: paper,
        field() {
          const tr = [
            [0.36, 0.015],
            [0.4, 0.05],
            [0.475, 0.008],
            [0.5, 0.03],
            [0.56, 0.004],
            [0.585, 0.07],
            [0.685, 0.012],
            [0.71, 0.004],
            [0.735, 0.035],
            [0.8, 0.006],
            [0.82, 0.016],
          ];
          tr.forEach(([r, w]) => sector(r, r + w, 0, TAU, paper));
        },
      },
      {
        bg: paper,
        fg: ink,
        field() {
          const step = 0.052 * R;
          for (let y = step / 2; y < D; y += step)
            for (let x = step / 2; x < D; x += step) {
              const r = Math.hypot(x - C, y - C) / R;
              if (r < PRINT + 0.02 || r > BAND_IN - 0.02) continue;
              const t = (r - PRINT) / (BAND_IN - PRINT);
              g.beginPath();
              g.arc(x, y, step * 0.5 * Math.pow(t, 1.3), 0, TAU);
              g.fillStyle = ink;
              g.fill();
            }
        },
      },
      {
        bg: light,
        fg: ink,
        field() {
          g.fillStyle = ink;
          g.fillRect(C - 0.62 * R, 0, 0.34 * R, D);
          g.strokeStyle = ink;
          g.lineWidth = 0.004 * R;
          for (let x = C + 0.12 * R; x < D; x += 0.03 * R) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, D);
            g.stroke();
          }
          disk(0.1 + PRINT, light);
        },
      },
      {
        bg: ink2,
        fg: paper,
        field() {
          g.beginPath();
          const turns = 7,
            r0 = PRINT + 0.02,
            r1 = BAND_IN - 0.04;
          for (let k = 0; k <= 1400; k++) {
            const t = k / 1400,
              a = -Math.PI / 2 + t * turns * TAU,
              r = (r0 + (r1 - r0) * t) * R;
            k ? g.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r) : g.moveTo(C + Math.cos(a) * r, C + Math.sin(a) * r);
          }
          g.lineWidth = 0.006 * R;
          g.strokeStyle = paper;
          g.stroke();
        },
      },
    ];
    const s = S[i % S.length];
    g.save();
    g.beginPath();
    g.arc(C, C, R, 0, TAU);
    g.arc(C, C, R * 0.3, 0, TAU, true);
    g.clip('evenodd');
    g.fillStyle = s.bg;
    g.fillRect(0, 0, D, D);
    g.save();
    clipAnnulus(PRINT, BAND_IN);
    s.field();
    g.restore();
    const bandBg = s.band === 'split' ? null : s.bg;
    if (bandBg) sector(BAND_IN, 1, 0, TAU, bandBg);
    const line = s.fg === paper ? 'rgba(255,255,255,.8)' : 'rgba(23,24,26,.8)';
    ring(BAND_IN, 0.003, line);
    ring(BAND_OUT + 0.012, 0.002, line);
    const no = String(i + 1).padStart(2, '0');
    const words = [
      (mode && mode.ringTitle) || 'SIDE ' + (i % 2 ? 'B' : 'A'),
      mode && mode.minutes ? mode.minutes + ' MIN' : '2026',
      'EDITION ' + no,
      'NO. ' + no + ' / ' + String(N).padStart(2, '0'),
      'EFFECT ATLAS',
      '33⅓',
      'SERIES ONE',
      'ALL RIGHTS RESERVED',
    ];
    const text = words.join('  ·  ') + '  ·  ';
    g.font = '500 ' + Math.round(0.036 * R) + 'px ' + font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const rr = ((BAND_IN + BAND_OUT) / 2) * R + 0.004 * R,
      span = TAU - 0.42,
      widths = [...text].map((ch) => g.measureText(ch).width),
      total = widths.reduce((a, b) => a + b, 0),
      extra = Math.max(0, (span * rr - total) / text.length);
    let a = 0.21;
    [...text].forEach((ch, k) => {
      const w = widths[k] + extra,
        da = w / rr;
      a += da / 2;
      const col = s.band === 'split' && Math.sin(a) < 0 ? paper : s.fg;
      g.save();
      g.translate(C + Math.cos(a) * rr, C + Math.sin(a) * rr);
      g.rotate(a + Math.PI / 2);
      g.fillStyle = col;
      g.fillText(ch, 0, 0);
      g.restore();
      a += da / 2;
    });
    g.beginPath();
    g.arc(C, C, rr, -0.13, 0.13);
    g.lineWidth = 0.018 * R;
    g.strokeStyle = acc;
    g.lineCap = 'butt';
    g.stroke();
    sector(0.3, PRINT, 0, TAU, '#d9dbdf');
    for (let k = 0; k < 5; k++) ring(0.305 + k * 0.0065, 0.0012, k % 2 ? 'rgba(255,255,255,.8)' : 'rgba(23,24,26,.14)');
    ring(PRINT, 0.0025, 'rgba(23,24,26,.25)');
    g.restore();
    return c;
  }
  function baseTime(minutes) {
    const m = Math.max(0, Math.round(Number(minutes) || 0));
    return String(m).padStart(2, '0') + ':00';
  }

  const TIMER_FACE = {    focus: {
      bg0: '#fbf8f3',
      bg1: '#e7e1d8',
      text: '#17181a',
      muted: 'rgba(23,24,26,.56)',
      line: 'rgba(23,24,26,.11)',
      groove: 'rgba(23,24,26,.032)',
    },
    shortBreak: {
      bg0: '#1a1d22',
      bg1: '#070809',
      text: '#f7f7f3',
      muted: 'rgba(255,255,255,.62)',
      line: 'rgba(255,255,255,.10)',
      groove: 'rgba(255,255,255,.032)',
    },
    longBreak: {
      bg0: '#f3f6fa',
      bg1: '#dfe5ee',
      text: '#17181a',
      muted: 'rgba(23,24,26,.55)',
      line: 'rgba(23,24,26,.10)',
      groove: 'rgba(23,24,26,.03)',
    },
  };

  /**
   * The active disc's full face becomes the timer: mode label, time, remaining arc,
   * status line and cycle dots are printed straight onto the record surface.
   */
  function drawTimerFace(ctx, D, state, tok) {
    const R = D / 2,
      C = D / 2,
      TAU = Math.PI * 2;
    const p = TIMER_FACE[state.mode] || TIMER_FACE.focus;
    const accent = state.accent || '#ff5a3c';
    ctx.clearRect(0, 0, D, D);
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, R * 0.988, 0, TAU);
    ctx.clip();

    const grd = ctx.createRadialGradient(C - R * 0.18, C - R * 0.22, R * 0.05, C, C, R * 1.02);
    grd.addColorStop(0, p.bg0);
    grd.addColorStop(0.55, p.bg1);
    grd.addColorStop(1, p.bg1);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, D, D);

    const hi = ctx.createLinearGradient(0, 0, D, D);
    hi.addColorStop(0, 'rgba(255,255,255,.20)');
    hi.addColorStop(0.42, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.fillRect(0, 0, D, D);

    ctx.lineWidth = 1;
    for (let k = 0; k < 74; k++) {
      ctx.beginPath();
      ctx.arc(C, C, R * (0.32 + k * 0.0092), 0, TAU);
      ctx.strokeStyle = p.groove;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(C, C, R * 0.972, 0, TAU);
    ctx.lineWidth = R * 0.0045;
    ctx.strokeStyle = p.line;
    ctx.stroke();

    const pr = R * 0.795,
      lw = R * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(C, C, pr, 0, TAU);
    ctx.strokeStyle = p.line;
    ctx.lineWidth = lw;
    ctx.stroke();
    const prog = Math.max(0, Math.min(1, Number(state.progress) || 0));
    if (prog > 0.0005) {
      ctx.beginPath();
      ctx.arc(C, C, pr, -Math.PI / 2, -Math.PI / 2 + TAU * prog);
      ctx.strokeStyle = accent;
      ctx.lineWidth = lw;
      ctx.stroke();
      const a = -Math.PI / 2 + TAU * prog;
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * pr, C + Math.sin(a) * pr, lw * 0.62, 0, TAU);
      ctx.fillStyle = accent;
      ctx.fill();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(R * 0.085)}px ${tok.font}`;
    ctx.fillStyle = accent;
    ctx.fillText(state.label || '', C, C - R * 0.265);

    let font = R * 0.34;
    ctx.font = `600 ${Math.round(font)}px ${tok.font}`;
    const tw = ctx.measureText(state.timeLabel || '').width;
    if (tw > D * 0.76) {
      font = (font * D * 0.76) / tw;
      ctx.font = `600 ${Math.round(font)}px ${tok.font}`;
    }
    ctx.fillStyle = p.text;
    ctx.fillText(state.timeLabel || '', C, C + R * 0.01);

    ctx.font = `500 ${Math.round(R * 0.058)}px ${tok.font}`;
    ctx.fillStyle = p.muted;
    ctx.fillText(state.statusLine || '', C, C + R * 0.30);

    const total = Math.max(1, Math.min(10, state.cycleTotal || 4));
    const filled = Math.max(0, Math.min(total, state.cycleCount || 0));
    const gap = R * 0.055,
      dotR = R * 0.013,
      start = C - ((total - 1) * gap) / 2;
    for (let i = 0; i < total; i++) {
      ctx.beginPath();
      ctx.arc(start + i * gap, C + R * 0.405, dotR, 0, TAU);
      ctx.fillStyle = i < filled ? accent : p.line;
      ctx.fill();
    }
    ctx.restore();
  }

  function normalMap(size, height, strength) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    height(g, size);
    const src = g.getImageData(0, 0, size, size).data,
      out = g.createImageData(size, size),
      o = out.data,
      h = (x, y) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = (h(x + 1, y) - h(x - 1, y)) * strength,
          dy = (h(x, y + 1) - h(x, y - 1)) * strength,
          l = Math.hypot(dx, dy, 1),
          i = (y * size + x) * 4;
        o[i] = ((-dx / l) * 0.5 + 0.5) * 255;
        o[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
        o[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
        o[i + 3] = 255;
      }
    g.putImageData(out, 0, 0);
    return c;
  }
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function frontHeight(g, S) {
    const r = seeded(7),
      C = S / 2;
    g.fillStyle = '#808080';
    g.fillRect(0, 0, S, S);
    for (let k = 0; k < S * 0.5; k += 1.5) {
      g.beginPath();
      g.arc(C, C, k, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(255,255,255,' + (0.035 * 0.35) / 0.35 + ')';
      g.lineWidth = 0.6;
      g.stroke();
    }
    for (let k = 0; k < 90; k++) {
      const a = r() * Math.PI * 2,
        rad = (0.3 + r() * 0.65) * C,
        len = 0.05 + r() * 0.35;
      g.beginPath();
      g.arc(C, C, rad, a, a + len);
      g.strokeStyle = 'rgba(' + (r() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.12 + r() * 0.2) + ')';
      g.lineWidth = 0.5 + r();
      g.stroke();
    }
    const img = g.getImageData(0, 0, S, S),
      d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 24 * 0.59;
      d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, d[i] + n));
    }
    g.putImageData(img, 0, 0);
  }
  function backHeight(g, S) {
    const C = S / 2;
    g.fillStyle = '#808080';
    g.fillRect(0, 0, S, S);
    for (let k = 0; k < S * 0.5; k += 2) {
      g.beginPath();
      g.arc(C, C, k, 0, Math.PI * 2);
      g.strokeStyle = k % 4 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)';
      g.lineWidth = 1;
      g.stroke();
    }
  }
  function roughCanvas(S, base, grain) {
    const r = seeded(11),
      c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'),
      img = g.createImageData(S, S),
      d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.max(0, Math.min(255, base + (r() - 0.5) * grain));
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  function hubRings() {
    const S = 512,
      C = S / 2,
      cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d'),
      fill = g.createRadialGradient(C, C, S * 0.08, C, C, C);
    [
      [0, '#d9dde4'],
      [0.42, '#f0f2f5'],
      [0.72, '#cfd4dc'],
      [1, '#b8bec8'],
    ].forEach(([at, col]) => fill.addColorStop(at, col));
    g.fillStyle = fill;
    g.fillRect(0, 0, S, S);
    g.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(C, C, S * (0.255 + 0.03 * k), 0, 2 * Math.PI);
      g.strokeStyle = `rgba(255,255,255,${0.14 - 0.018 * k})`;
      g.stroke();
    }
    return cv;
  }
  function envData(T) {
    const Wd = 512,
      Hd = 256,
      d = new Float32Array(Wd * Hd * 4),
      lin = (c) => {
        c /= 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      },
      hex = (h) => [
        lin(parseInt(h.slice(1, 3), 16)),
        lin(parseInt(h.slice(3, 5), 16)),
        lin(parseInt(h.slice(5, 7), 16)),
      ];
    const a = hex('#25282f'),
      b = hex('#0e0f13'),
      c = hex('#020203'),
      bands = [
        [0.08, 0.05, 0.95, 3],
        [0.2, 0.11, 0.55, 2],
        [0.31, 0.022, 0.9, 1],
        [0.46, 0.04, 0.85, 1],
        [0.66, 0.09, 0.3, 2],
      ];
    for (let y = 0; y < Hd; y++) {
      const v = 1 - (y + 0.5) / Hd,
        base = v < 0.5 ? a.map((x, k) => x + (b[k] - x) * v * 2) : b.map((x, k) => x + (c[k] - x) * (v - 0.5) * 2);
      let w = 0;
      bands.forEach(([cy, h, al, e]) => {
        const t = Math.abs(v - cy) / h;
        if (t < 1) w = Math.max(w, lin(255 * Math.max(0.1, 0.85 * al) * (1 - Math.pow(t, e))));
      });
      const st = Math.abs(v - STRIP.y) / STRIP.h,
        strip = st < 1 ? STRIP.gain * (1 - st * st) : 0;
      for (let x = 0; x < Wd; x++) {
        const i = (y * Wd + x) * 4;
        for (let k = 0; k < 3; k++) d[i + k] = base[k] * (1 - w) + w + strip;
        d[i + 3] = 1;
      }
    }
    const t = new T.DataTexture(d, Wd, Hd, T.RGBAFormat, T.FloatType);
    t.mapping = T.EquirectangularReflectionMapping;
    t.needsUpdate = true;
    return t;
  }
  function mount(element, options) {
    options = options || {};
    const api = scope(element, CONTROLS, options);
    const cardOpt = options.card || null,
      wantGL = !!cardOpt.webgl && !!window.THREE;
    const phased = !!cardOpt.startup;
    element.classList.add('dc-stage');
    element.innerHTML =
      '<div class="dc-viewport"' +
      ' tabindex="0" role="group" aria-roledescription="carousel" aria-label="Disc carousel. Swipe horizontally or use the left and right arrow keys to switch modes."' +
      '><canvas class="dc-webgl" aria-hidden="true"></canvas><div class="dc-css" aria-hidden="true"></div></div>' +
      '' +
      '<p class="cr-sr dc-live" aria-live="polite"></p>';
    const viewport = element.querySelector('.dc-viewport'),
      canvas = element.querySelector('.dc-webgl'),
      cssLayer = element.querySelector('.dc-css'),
      liveEl = element.querySelector('.dc-live');
    const css = getComputedStyle(element),
      tokv = (n, f) => css.getPropertyValue(n).trim() || f;
    const tok = {
      ink: tokv('--ink', '#17181a'),
      ink3: tokv('--ink-3', '#9a9993'),
      accent: tokv('--accent', '#4559ff'),
      surface: tokv('--surface', '#f0f0ef'),
      font: tokv('--font', '"Inter Demo", system-ui, sans-serif'),
      modeMeta: options.modeMeta || null,
    };
    let L = START,
      prevL = START,
      flow = 0,
      tween = null,
      contextLost = false,
      first = true;
    const discs = Array.from({ length: N }, (_, i) => ({
      i,
      p: i,
      live: false,
      x: 0,
      y: 0,
      z: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      s: 1,
      vis: false,
    }));
    let renderer = null,
      scene,
      camera,
      group,
      res = [],
      discGL = [],
      timerFaces = [],
      immersiveView = false,
      viewAmount = 0,
      raycaster = null;
    const faceSize = 1024;
    if (wantGL)
      try {
        if (new URLSearchParams(location.search).has('fallback')) throw new Error('Explicit fallback.');
        const T = window.THREE;
        renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputEncoding = T.sRGBEncoding;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.86;
        renderer.setClearColor(0, 0);
        scene = new T.Scene();
        scene.fog = new T.Fog(new T.Color(tok.surface), K.fogNear, K.fogFar);
        camera = new T.PerspectiveCamera(K.fov, 1, 0.1, 100);
        camera.position.z = K.camZ;
        group = new T.Group();
        group.rotation.set(K.rotX * RAD, K.rotY * RAD, 0);
        group.scale.setScalar(K.groupScale);
        scene.add(group);
        scene.add(new T.AmbientLight(0xffffff, 0.25));
        const key = new T.DirectionalLight(0xfff9e8, 0.75);
        key.position.set(3.5, -8, 6);
        scene.add(key);
        const fillL = new T.DirectionalLight(0xffffff, 0.3);
        fillL.position.set(-5, -2, 4);
        scene.add(fillL);
        const rim = new T.DirectionalLight(0x499ff5, 0.75);
        rim.position.set(0, 3, -6);
        scene.add(rim);
        const top = new T.DirectionalLight(0xffffff, 1);
        top.position.set(0, 3.2, 3);
        scene.add(top);
        const envTex = envData(T);
        const pm = new T.PMREMGenerator(renderer),
          envRT = pm.fromEquirectangular(envTex);
        envTex.dispose();
        pm.dispose();
        scene.environment = envRT.texture;
        res.push(envRT);
        const tex = (c, srgb) => {
          const t = new T.CanvasTexture(c);
          if (srgb) t.encoding = T.sRGBEncoding;
          t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          res.push(t);
          return t;
        };
        const set = (mat, props) => {
          Object.keys(props).forEach((k) => {
            if (k in mat) mat[k] = props[k];
          });
          return mat;
        };
        const frontN = tex(normalMap(1024, frontHeight, 1.2)),
          backN = tex(normalMap(1024, backHeight, 1.6)),
          frontR = tex(roughCanvas(256, 255, 0.59 * 90)),
          backR = tex(roughCanvas(256, 230, 40)),
          matrixT = tex(hubRings(), true);
        const uvPlanar = (geo) => {
          const p = geo.attributes.position,
            u = geo.attributes.uv;
          for (let i = 0; i < p.count; i++) u.setXY(i, p.getX(i) * 0.5 + 0.5, p.getY(i) * 0.5 + 0.5);
          u.needsUpdate = true;
          return geo;
        };
        const outer = 1 - K.edgeBleed,
          Qt = K.thick;
        const frontGeo = uvPlanar(new T.RingGeometry(K.hub, outer, 220, 1)),
          backGeo = uvPlanar(new T.RingGeometry(K.hub, outer, 220, 1));
        const e = Qt / 2,
          bt = 0.0015 + Math.min(Qt * 0.55, 0.018),
          rimTop = [
            [outer, e],
            [1 - bt, e],
            [1, e - bt],
          ],
          edgeGeo = new T.LatheGeometry(
            rimTop
              .concat(
                rimTop
                  .slice()
                  .reverse()
                  .map(([r, z]) => [r, -z]),
              )
              .map(([r, z]) => new T.Vector2(r, z)),
            256,
          );
        edgeGeo.computeVertexNormals();
        const lathe = (r0, r1, height, wave, seg) => {
          const half = height / 2,
            from = Math.max(r0, 0.002),
            to = Math.max(r1, from + 1e-4);
          const face = [0, 1, 2, 3, 4, 5].map((n) => {
            const f = n / 5,
              dip = Math.sin(f * Math.PI * 1.5);
            return [from + (to - from) * f, half * (1 - 0.8 * wave * dip * dip)];
          });
          const outline = [
            [from, -half],
            [from, half],
            ...face,
            [r1, half * 0.92],
            [r1, -half * 0.92],
            ...face.reverse().map(([r, z]) => [r, -z]),
          ];
          const g = new T.LatheGeometry(
            outline.map(([r, z]) => new T.Vector2(r, z)),
            seg,
          );
          g.computeVertexNormals();
          return g;
        };
        const hr = K.hole,
          span = K.hub - K.hole,
          mi = K.hole + 0.34 * span,
          mo = mi + K.matrixWidth * span,
          hh = 1.02 * Qt;
        const hubGeo = lathe(mo, K.hub, hh, 0.22, 160),
          matrixGeo = lathe(mi, mo, hh * 0.88, 0.12, 128),
          frostGeo = lathe(hr, mi, hh * 0.96, 0.4, 128);
        res.push(frontGeo, backGeo, edgeGeo, hubGeo, matrixGeo, frostGeo);
        const backMat = set(
          new T.MeshPhysicalMaterial({
            color: new T.Color('#1A1E2A'),
            roughness: 0.23,
            metalness: 1,
            roughnessMap: backR,
            normalMap: backN,
            normalScale: new T.Vector2(0.5, 0.5),
          }),
          { clearcoat: 0.34, clearcoatRoughness: 0.06, envMapIntensity: 1.5 },
        );
        const edgeMat = set(
          new T.MeshPhysicalMaterial({
            color: new T.Color('#ffffff'),
            roughness: 0.04,
            metalness: 0.55,
            side: T.DoubleSide,
          }),
          { clearcoat: 0.7, clearcoatRoughness: 0.05, envMapIntensity: 1.8 },
        );
        const hubMat = set(
          new T.MeshPhysicalMaterial({
            color: new T.Color('#ffffff'),
            roughness: 0.38,
            metalness: 0,
            transparent: true,
            side: T.DoubleSide,
          }),
          { transmission: 0.68, thickness: 0.6, ior: 2, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3 },
        );
        const matrixMat = set(
          new T.MeshPhysicalMaterial({
            side: T.DoubleSide,
            metalness: 0.82,
            map: matrixT,
            color: new T.Color('#dfe3e9'),
            roughness: 0.28,
          }),
          { envMapIntensity: 1.45, clearcoatRoughness: 0.12, clearcoat: 0.7 },
        );
        const frostMat = set(
          new T.MeshPhysicalMaterial({
            side: T.DoubleSide,
            transparent: true,
            color: new T.Color('#eef0f5'),
            metalness: 0,
            roughness: 0.25 + 0.55 * K.frosted,
          }),
          {
            envMapIntensity: 0.9,
            ior: 1.5,
            clearcoatRoughness: 0.3,
            clearcoat: 0.4,
            thickness: 0.3,
            transmission: 0.5 - 0.5 * K.frosted,
          },
        );
        res.push(backMat, edgeMat, hubMat, matrixMat, frostMat);
        const timerGeo = new T.CircleGeometry(0.965, 160);
        res.push(timerGeo);
        const timerMaterials = [];
        const timerMetaList = tok.modeMeta || [];
        for (let i = 0; i < N; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1024;
          const ctx = canvas.getContext('2d');
          const texture = tex(canvas, true);
          const meta = timerMetaList[i] || {};
          drawTimerFace(
            ctx,
            1024,
            {
              mode: meta.key || 'focus',
              label: meta.label || '',
              accent: meta.accent,
              timeLabel: baseTime(meta.minutes || 25),
              progress: 1,
              statusLine: meta.minutes ? `${meta.minutes} 分钟` : '',
              cycleCount: 0,
              cycleTotal: 4,
            },
            tok,
          );
          texture.needsUpdate = true;
          const material = new T.MeshPhysicalMaterial({
            map: texture,
            roughness: 0.36,
            metalness: 0.18,
            clearcoat: 0.85,
            clearcoatRoughness: 0.08,
            envMapIntensity: 0.95,
          });
          res.push(material);
          timerMaterials.push(material);
          timerFaces.push({ canvas, ctx, texture });
        }
        for (let i = 0; i < N; i++) {
          const map = tex(drawFace(faceSize, i, tok), true);
          const frontMat = set(
            new T.MeshPhysicalMaterial({
              map,
              alphaTest: 0.5,
              roughness: 0.42,
              metalness: 0.48,
              roughnessMap: frontR,
              normalMap: frontN,
              normalScale: new T.Vector2(0.3, 0.3),
            }),
            { clearcoat: 0.8, clearcoatRoughness: 0, envMapIntensity: 0.85 },
          );
          res.push(frontMat);
          const g = new T.Group(),
            front = new T.Mesh(frontGeo, frontMat),
            back = new T.Mesh(backGeo, backMat),
            edge = new T.Mesh(edgeGeo, edgeMat),
            hub = new T.Mesh(hubGeo, hubMat),
            mat = new T.Mesh(matrixGeo, matrixMat),
            frost = new T.Mesh(frostGeo, frostMat);
          front.position.z = Qt / 2 + 6e-4;
          back.position.z = -Qt / 2 - 6e-4;
          back.rotation.y = Math.PI;
          [edge, hub, mat, frost].forEach((o) => {
            o.rotation.x = Math.PI / 2;
          });
          front.userData.index = back.userData.index = i;
          const timer = new T.Mesh(timerGeo, timerMaterials[i]);
          timer.position.z = Qt / 2 + 0.0032;
          timer.visible = false;
          g.add(front, back, edge, hub, mat, frost, timer);
          g.visible = false;
          group.add(g);
          discGL.push({ g, map, pick: [front, back], timer });
        }
        raycaster = new T.Raycaster();
        cssLayer.hidden = true;
      } catch (error) {
        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss();
        }
        renderer = null;
      }
    if (!renderer) canvas.hidden = true;
    const discEls = Array.from({ length: N }, (_, i) => {
      const el = document.createElement('div');
      el.className = 'dc-disc';
      el.dataset.index = String(i);
      el.innerHTML = '<div class="dc-face"></div><div class="dc-back"></div>';
      cssLayer.append(el);
      return el;
    });
    const FONT_WAIT = 600,
      fontSpec = '600 40px ' + tok.font.split(',')[0].trim(),
      faceKey = [tok.ink, tok.ink3, tok.accent, tok.font, 512, JSON.stringify(tok.modeMeta || [])].join('|');
    const faceStore = (() => {
      try {
        const t = window.top;
        if (t !== window && t.location.origin === location.origin) return t.__dcFaceBlobs || (t.__dcFaceBlobs = {});
      } catch (e) {}
      return null;
    })();
    const faceUrls = [],
      faceQ = [],
      faceBlobs = [];
    let faceT = 0,
      fontT = 0,
      fontOk = false,
      fontWaited = false,
      drewEarly = false,
      facesPrepared = false;
    api.cleanup &&
      api.cleanup(() => {
        clearTimeout(faceT);
        clearTimeout(fontT);
        faceUrls.forEach((u) => u && URL.revokeObjectURL(u));
      });
    function setFace(i, u) {
      if (faceUrls[i]) URL.revokeObjectURL(faceUrls[i]);
      faceUrls[i] = u;
      discEls[i].firstChild.style.backgroundImage = 'url(' + u + ')';
    }
    function paintCssFace(i) {
      const face = discEls[i].firstChild,
        c = drawFace(512, i, tok),
        old = face.querySelector('canvas'),
        withFont = fontOk;
      c.className = 'dc-face-c';
      if (old) old.replaceWith(c);
      else face.append(c);
      if (c.toBlob)
        c.toBlob((b) => {
          if (!b || api.destroyed || !c.isConnected) return;
          const u = URL.createObjectURL(b);
          const done = () => {
            if (api.destroyed || !c.isConnected) {
              URL.revokeObjectURL(u);
              return;
            }
            setFace(i, u);
            c.remove();
            if (withFont && faceStore) {
              faceBlobs[i] = b;
              if (faceBlobs.filter(Boolean).length === N) faceStore[faceKey] = faceBlobs.slice();
            }
          };
          if (phased) {
            const image = new Image();
            image.onload = done;
            image.onerror = () => URL.revokeObjectURL(u);
            image.src = u;
          } else done();
        }, 'image/png');
    }
    function faceSlice() {
      faceT = 0;
      if (api.destroyed) return;
      const t = performance.now();
      while (faceQ.length) {
        paintCssFace(faceQ.shift());
        if (performance.now() - t > 12) break;
      }
      if (faceQ.length) faceT = setTimeout(faceSlice, 0);
    }
    function queueFaces() {
      const ord = Array.from({ length: N }, (_, i) => i).sort(
        (x, y) => Math.min(wrap(x - START), wrap(START - x)) - Math.min(wrap(y - START), wrap(START - y)),
      );
      ord.forEach((i) => {
        if (!faceQ.includes(i)) faceQ.push(i);
      });
      if (!faceT) faceSlice();
    }
    function paintCssFaces() {
      const kept = faceStore && faceStore[faceKey];
      if (kept) {
        kept.forEach((b, i) => setFace(i, URL.createObjectURL(b)));
        return;
      }
      if (fontOk || fontWaited) {
        queueFaces();
        return;
      }
      const go = () => {
        if (fontWaited || api.destroyed) return;
        fontWaited = true;
        drewEarly = !fontOk;
        queueFaces();
      };
      fontT = setTimeout(go, FONT_WAIT);
      fontReady.then(go);
    }
    let cssFacesDone = false;
    function useCss() {
      return !renderer || contextLost;
    }
    function ensureCssFaces() {
      if (!cssFacesDone && useCss()) {
        cssFacesDone = true;
        paintCssFaces();
      }
    }
    const fontReady = (
      document.fonts && document.fonts.load
        ? Promise.all([document.fonts.load(fontSpec), document.fonts.load(fontSpec.replace('600', '500'))])
        : Promise.resolve()
    ).then(
      () => {
        fontOk = true;
      },
      () => {
        fontOk = true;
      },
    );
    if (!phased) ensureCssFaces();
    fontReady.then(() => {
      if (api.destroyed) return;
      if (phased && api.preparing) {
        if (drewEarly) {
          facesPrepared = false;
          api.invalidatePreparation();
        }
        return;
      }
      discGL.forEach((d, i) => {
        const c = d.map.image,
          g = c.getContext('2d');
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(drawFace(faceSize, i, tok), 0, 0);
        d.map.needsUpdate = true;
      });
      if (cssFacesDone && drewEarly && !(faceStore && faceStore[faceKey])) {
        clearTimeout(faceT);
        faceT = 0;
        queueFaces();
      }
      api.paint();
    });
    if (renderer) {
      api.listen(canvas, 'webglcontextlost', (ev) => {
        ev.preventDefault();
        contextLost = true;
        canvas.hidden = true;
        cssLayer.hidden = false;
        ensureCssFaces();
        api.paint();
      });
      api.listen(canvas, 'webglcontextrestored', () => {
        contextLost = false;
        canvas.hidden = false;
        cssLayer.hidden = true;
        sizing();
        api.paint();
        api.wake();
      });
    }
    let W = 1,
      H = 1,
      camZ = K.camZ,
      baseCamZ = K.camZ,
      unit = 56;
    function sizing() {
      W = Math.max(1, viewport.clientWidth);
      H = Math.max(1, viewport.clientHeight);
      const aspect = W / H;
      // 3.48（原 3.6）：把默认机位往表盘推近一点点，画面占比约大 3%
      camZ = Math.max(K.camZ, 3.48 / (2 * Math.tan((K.fov / 2) * RAD) * aspect));
      baseCamZ = camZ;
      unit = !cardOpt.webgl ? +cardOpt.unit || 56 : H / (2 * Math.tan((K.fov / 2) * RAD) * camZ);
      if (!cardOpt.webgl) camZ = K.camZ;
      if (renderer && !contextLost) {
        renderer.setSize(W, H, false);
        camera.aspect = aspect;
        camera.position.z = camZ;
        camera.updateProjectionMatrix();
        scene.fog.near = (K.fogNear * camZ) / K.camZ;
        scene.fog.far = (K.fogFar * camZ) / K.camZ;
        applyView();
      }
    }
    api.on('resize', () => {
      sizing();
      handHome = null;
      handTarget = null;
    });
    let G = M4.mul(
      M4.mul(M4.rx(K.rotX * RAD), M4.ry(K.rotY * RAD)),
      M4.sc(K.groupScale, K.groupScale, K.groupScale),
    );
    const worldOf = (d) =>
      M4.mul(
        G,
        M4.mul(
          M4.tr(d.x, d.y, d.z),
          M4.mul(M4.mul(M4.mul(M4.rx(d.rx), M4.ry(d.ry)), M4.rz(d.rz)), M4.sc(d.s, d.s, d.s)),
        ),
      );
    function applyView() {
      if (!group) return;
      group.rotation.set(
        R.mix(K.rotX, VIEW.rotX, viewAmount) * RAD,
        R.mix(K.rotY, VIEW.rotY, viewAmount) * RAD,
        0,
      );
      const scale = R.mix(K.groupScale, VIEW.groupScale, viewAmount);
      group.scale.setScalar(scale);
      G = M4.mul(
        M4.mul(M4.rx(group.rotation.x), M4.ry(group.rotation.y)),
        M4.sc(scale, scale, scale),
      );
      if (camera && renderer && !contextLost) {
        const z = baseCamZ * R.mix(1, VIEW.camScale, viewAmount);
        camera.position.z = z;
        if (scene.fog) {
          scene.fog.near = (K.fogNear * z) / K.camZ;
          scene.fog.far = (K.fogFar * z) / K.camZ;
        }
      }
    }
    function layout(dt, forced, params) {
      const cur = Math.round(L),
        moving = !forced && !api.reduced;
      const amt = moving ? params.lean / 100 : 0,
        speed = Math.abs(flow),
        a = Math.sign(flow) * Math.min(K.leanMax, K.lean * amt * Math.sqrt(speed)),
        o = Math.min(K.dipMax, K.dip * amt * speed);
      const hGap = (K.hGap * params.gap) / 100,
        fall = (K.followFalloff * params.trail) / 100;
      const front = viewAmount;
      let residual = 0;
      for (const d of discs) {
        const p = d.i + N * Math.round((L - d.i) / N),
          mm = p - L,
          g = p === cur,
          h = Math.abs(mm),
          th = K.step * mm,
          v = Math.max(K.thick * 3, 0.12, K.depth);
        let x = K.radius * hGap * Math.sin(th),
          y = g ? K.activeY - 0.7 * o : -o,
          z = K.radius * v * (1 - Math.cos(th));
        if (!g && front > 0) {
          // 两侧盘向外推 + 向上抬，获得清晰的间距，不再被中间盘遮挡
          x += Math.sign(mm) * VIEW.sideSpread * front;
          y += VIEW.sideLift * front;
        }
        const ry = R.mix(-th + a * (g ? 1 : 1.12), 0, front),
          rz = R.mix(-a * K.bank * (g ? 0.7 : 1), 0, front),
          baseScale = g ? 1 : Math.max(K.inactiveScale, 1 - h * (1 - K.inactiveScale) * 0.6),
          s = R.mix(baseScale, g ? 1 : 0, front);
        if (p !== d.p) {
          d.p = p;
          d.live = false;
        }
        if (!d.live) {
          d.x = x;
          d.y = y;
          d.z = z;
          d.rx = 0;
          d.ry = ry;
          d.rz = rz;
          d.s = s;
          if (!first && moving) {
            const from = Math.sign(mm);
            d.x += from * K.spawnSlide;
            d.z -= 0.45;
            d.ry -= from * 0.3;
            d.s *= K.spawnShrink;
          }
          d.live = true;
          d.vis = true;
          residual += 1;
          continue;
        }
        d.vis = true;
        const k = R.clamp(K.followBase - h * fall, K.followMin, K.followTight),
          A = forced || api.reduced ? 1 : Math.min(1, dt * k);
        residual +=
          Math.abs(x - d.x) +
          Math.abs(y - d.y) +
          Math.abs(z - d.z) +
          Math.abs(s - d.s) +
          Math.abs(ry - d.ry) +
          Math.abs(rz - d.rz);
        d.x += (x - d.x) * A;
        d.y += (y - d.y) * A;
        d.z += (z - d.z) * A;
        d.s += (s - d.s) * A;
        d.ry += (ry - d.ry) * A;
        d.rz += (rz - d.rz) * A;
        d.rx += (0 - d.rx) * A;
      }
      first = false;
      return residual;
    }
    function draw() {
      if (renderer && !contextLost) {
        discs.forEach((d, i) => {
          const o = discGL[i].g;
          const timer = discGL[i].timer;
          const active = i === wrap(pendingIndex());
          const visible = d.vis && (active || d.s > 0.03);
          if (timer) timer.visible = visible;
          o.visible = visible;
          if (!visible) return;
          o.position.set(d.x, d.y, d.z);
          o.rotation.set(d.rx, d.ry, d.rz);
          o.scale.setScalar(d.s);
          const w = worldOf(d);
          o.renderOrder = Math.round(500 + w[14] * 10 - i * 0.01);
        });
        renderer.render(scene, camera);
        return;
      }
      const P = camZ * unit,
        near = (K.fogNear * camZ) / K.camZ,
        far = (K.fogFar * camZ) / K.camZ;
      discs.forEach((d, i) => {
        const el = discEls[i];
        if (!d.vis) {
          el.style.display = 'none';
          return;
        }
        el.style.display = '';
        const w = worldOf(d),
          u = unit,
          F = [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
          Mc = M4.mul(M4.mul(M4.mul(M4.sc(u, u, u), F), w), M4.mul(F, M4.sc(0.01, 0.01, 0.01)));
        el.style.transform =
          'perspective(' + P.toFixed(1) + 'px) matrix3d(' + Mc.map((v) => +v.toFixed(5)).join(',') + ')';
        el.style.zIndex = String(Math.round(500 + w[14] * 10));
        const fog = R.clamp((camZ - w[14] - near) / (far - near), 0, 1);
        el.style.opacity = (1 - fog).toFixed(3);
      });
    }
    const cfg = () => {
      const snap = api.params.glide / 1000 - 0.05;
      return snap;
    };
    function preset(source, n) {
      const snap = cfg();
      if (source === 'wheel') return { dur: snap + 0.05, kick: 2.5 };
      if (source === 'key') return { dur: Math.min(0.6, snap - 0.04 + n * 0.05), kick: 4 };
      if (source === 'click') return { dur: R.clamp(0.45 + n * 0.11, snap, 1.05), kick: Math.min(5, n * 1.4) };
      return { dur: snap, kick: 0, ease: POWER3 };
    }
    function pendingIndex() {
      return tween ? tween.to : Math.round(L);
    }
    const nearestOf = (i) => i + N * Math.round((pendingIndex() - i) / N);
    function announce(v) {
      liveEl.textContent = String(wrap(v) + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
    }
    function goTo(n, source) {
      if (n === pendingIndex() && !tween) return false;
      if (tween && tween.to === n) return false;
      const dist = Math.abs(n - L),
        p = preset(source, dist);
      if (api.reduced) {
        tween = null;
        L = n;
        prevL = n;
        flow = 0;
        announce(n);
        api.paint();
        return true;
      }
      if (p.kick) {
        const s = Math.sign(n - L);
        if (s) flow = R.clamp(flow + s * p.kick, -12, 12);
      }
      tween = { from: L, to: n, t: 0, dur: p.dur, ease: p.ease || ENERGY, rigid: false };
      announce(n);
      api.wake();
      return true;
    }
    const wh = {
      armed: true,
      flick: false,
      acc: 0,
      dir: 0,
      env: 0,
      peak: 0,
      count: 0,
      lastStep: 0,
      lastAt: 0,
      has: false,
    };
    function wheelReset() {
      Object.assign(wh, {
        armed: true,
        flick: false,
        acc: 0,
        dir: 0,
        env: 0,
        peak: 0,
        count: 0,
        lastStep: 0,
        lastAt: 0,
        has: false,
      });
    }
    function wheelInput(t, now) {
      if (wh.has && now - wh.lastAt >= WHEEL.ms.idle) wheelReset();
      const n = Math.abs(t),
        gap = wh.has ? now - wh.lastAt : Infinity;
      wh.lastAt = now;
      wh.has = true;
      const decay = gap === Infinity ? 0 : Math.exp(-gap / WHEEL.ms.envelope),
        o = wh.env * decay;
      if (n < WHEEL.px.floor) {
        wh.env = o;
        return false;
      }
      const rise = n > o * WHEEL.ratio.rise;
      wh.env = Math.max(n, o);
      if (!wh.armed) {
        wh.count++;
        wh.peak = Math.max(wh.peak, n);
        const since = now - wh.lastStep,
          pause = gap >= WHEEL.ms.pause,
          tick =
            gap >= WHEEL.ms.notch && wh.count <= 2 && since >= WHEEL.ms.afterNotch && n >= wh.peak * WHEEL.ratio.notch,
          flick = rise && since >= WHEEL.ms.afterFlick,
          sustain = since >= WHEEL.ms.hold && wh.env >= wh.peak * WHEEL.ratio.hold;
        if (!(pause || tick || flick || sustain)) return false;
        wh.armed = true;
        wh.acc = 0;
        wh.dir = 0;
        wh.flick = !(pause || tick || sustain);
      }
      const dir = t > 0 ? 1 : -1;
      if (dir !== wh.dir) {
        wh.acc = 0;
        wh.dir = dir;
      }
      wh.acc += Math.min(wh.flick ? Math.max(0, n - o) : n, WHEEL.px.perEvent);
      if (wh.acc < WHEEL.px.toStep) return false;
      wh.armed = false;
      wh.flick = false;
      wh.acc = 0;
      wh.lastStep = now;
      wh.count = 0;
      wh.peak = n;
      goTo(pendingIndex() + dir, 'wheel');
      return true;
    }
    const norm = (ev) => {
      let x = ev.deltaX,
        y = ev.deltaY;
      if (ev.deltaMode === 1) {
        x *= 16;
        y *= 16;
      } else if (ev.deltaMode === 2) {
        x *= window.innerWidth;
        y *= window.innerHeight;
      }
      return Math.abs(x) > Math.abs(y) * 1.25 ? x : y;
    };
    function pickAt(cx, cy) {
      const r = viewport.getBoundingClientRect(),
        x = cx - r.left,
        y = cy - r.top;
      if (renderer && !contextLost) {
        raycaster.setFromCamera({ x: (x / r.width) * 2 - 1, y: -(y / r.height) * 2 + 1 }, camera);
        const objs = [];
        discGL.forEach((d, i) => {
          if (discs[i].vis) objs.push(...d.pick);
        });
        const hit = raycaster.intersectObjects(objs, false)[0];
        return hit ? discs[hit.object.userData.index].p : null;
      }
      const el = document.elementFromPoint(cx, cy),
        disc = el && el.closest && el.closest('.dc-disc');
      return disc && viewport.contains(disc) ? discs[+disc.dataset.index].p : null;
    }
    let handT = 0,
      handFired = {},
      handCycle = -1,
      handTarget = null,
      handHome = null;
    {
      api.listen(
        viewport,
        'wheel',
        (ev) => {
          if (ev.ctrlKey || api.paused) return;
          const t = norm(ev);
          if (!t) return;
          ev.preventDefault();
          {
            back = false;
          }
          if (wheelInput(t, performance.now()) && true && cardOpt.touched) cardOpt.touched();
        },
        { passive: false },
      );
      let press = null;
      api.listen(viewport, 'pointerdown', (ev) => {
        if (ev.button !== 0 || api.paused) return;
        press = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, at: performance.now() };
      });
      api.listen(viewport, 'pointerup', (ev) => {
        if (!press || press.id !== ev.pointerId) return;
        const dx = ev.clientX - press.x,
          dy = ev.clientY - press.y;
        press = null;
        if (api.paused) return;
        let moved = false;
        // 只保留左右滑动切换；点击盘面不再切换模式
        if (
          ev.pointerType !== 'mouse' &&
          Math.abs(dx) > 24 &&
          Math.abs(dx) > Math.abs(dy)
        )
          moved = goTo(pendingIndex() + (dx < 0 ? 1 : -1), 'key');
        if (moved && true && cardOpt.touched) cardOpt.touched();
      });
      api.listen(viewport, 'pointercancel', () => {
        press = null;
      });
      api.listen(viewport, 'keydown', (ev) => {
        if (api.paused) return;
        let n = null;
        const cur = pendingIndex();
        if (ev.key === 'ArrowRight') n = cur + 1;
        else if (ev.key === 'ArrowLeft') n = cur - 1;
        else if (ev.key === 'Home') n = nearestOf(0);
        else if (ev.key === 'End') n = nearestOf(N - 1);
        if (n === null) return;
        ev.preventDefault();
        if (goTo(n, 'key') && true && cardOpt.touched) cardOpt.touched();
      });
    }
    let back = false;
    {
      api.restore = () => {
        wheelReset();
        const home = nearestOf(START);
        if (api.reduced) {
          tween = null;
          L = prevL = home;
          flow = 0;
          announce(START);
          api.paint();
          return;
        }
        if (Math.round(L * 1e6) === home * 1e6 && !tween) {
          api.wake();
          return;
        }
        flow = 0;
        tween = { from: L, to: home, t: 0, dur: api.params.glide / 1000, ease: ENERGY, rigid: true };
        back = true;
        announce(START);
        api.wake();
      };
    }
    api.on('replay', () => {
      handHome = null;
      tween = null;
      L = prevL = START;
      flow = 0;
      back = false;
      handT = 0;
      handCycle = -1;
      handFired = {};
      handTarget = null;
      discs.forEach((d) => {
        d.live = false;
      });
      first = true;
      wheelReset();
    });
    api.on('motion', (reduced) => {
      if (reduced) {
        if (tween) {
          L = prevL = tween.to;
          tween = null;
        }
        flow = 0;
      }
    });
    function trackFlow(dt) {
      const speed = Math.min(40, Math.max(-40, (L - prevL) / Math.max(dt, 0.001)));
      prevL = L;
      const rate = Math.abs(speed) > Math.abs(flow) ? 14 : 6;
      flow = R.mix(flow, speed, Math.min(1, rate * dt));
      if (Math.abs(flow) < 0.01) flow = 0;
    }
    api.frame(({ dt, params, reduced }) => {
      const viewTarget = immersiveView ? 1 : 0;
      if (dt > 0) {
        viewAmount += (viewTarget - viewAmount) * Math.min(1, dt * 9);
        if (Math.abs(viewTarget - viewAmount) < 0.001) viewAmount = viewTarget;
      }
      applyView();
      let handActive = false;
      if (tween) {
        tween.t += dt;
        const u = reduced ? 1 : Math.min(1, tween.t / tween.dur);
        L = R.mix(tween.from, tween.to, tween.ease(u));
        if (u >= 1) {
          L = tween.to;
          if (tween.rigid) back = false;
          tween = null;
        }
      }
      const rigid = back || reduced;
      if (rigid) {
        flow = 0;
        prevL = L;
      } else if (dt > 0) trackFlow(dt);
      const residual = layout(dt, rigid, params);
      draw();
      element.dataset.index = String(wrap(pendingIndex()));
      element.dataset.position = L.toFixed(4);
      element.dataset.renderer = renderer && !contextLost ? 'webgl' : 'css';
      return (
        handActive ||
        !!tween ||
        flow !== 0 ||
        residual > 0.001 ||
        Math.abs(viewTarget - viewAmount) > 0.001
      );
    });
    if (phased)
      api.prepare(async (phase) => {
        if (useCss() && !facesPrepared) {
          cssFacesDone = true;
          const kept = faceStore && faceStore[faceKey];
          if (kept) {
            const loads = await phase(
              () =>
                kept.map((blob, i) => {
                  const url = URL.createObjectURL(blob);
                  setFace(i, url);
                  return new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onload = resolve;
                    image.onerror = () => reject(new Error('Disc face image failed'));
                    image.src = url;
                  });
                }),
              'disc-cached-faces',
            );
            await Promise.all(loads);
          } else {
            await Promise.race([
              fontReady,
              new Promise((resolve) => {
                fontT = setTimeout(resolve, FONT_WAIT);
              }),
            ]);
            clearTimeout(fontT);
            fontT = 0;
            fontWaited = true;
            drewEarly = !fontOk;
            const order = Array.from({ length: N }, (_, i) => i).sort(
              (x, y) => Math.min(wrap(x - START), wrap(START - x)) - Math.min(wrap(y - START), wrap(START - y)),
            );
            const drawSlices = async () => {
              let index = 0;
              while (index < N)
                await phase(() => {
                  const started = performance.now();
                  do {
                    paintCssFace(order[index++]);
                  } while (index < N && performance.now() - started <= 12);
                }, 'disc-face-slice');
            };
            await drawSlices();
            if (drewEarly && fontOk) {
              drewEarly = false;
              await drawSlices();
            }
          }
          facesPrepared = true;
        }
        await phase(() => {
          sizing();
          handHome = null;
          handTarget = null;
        }, 'disc-layout');
      });
    api.on('destroy', () => {
      res.forEach((r) => {
        try {
          r.dispose();
        } catch {}
      });
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      res = [];
      discGL = [];
      if (canvas) canvas.width = canvas.height = 1;
    });
    const status = api.status;
    api.status = () => ({
      ...status(),
      index: wrap(pendingIndex()),
      position: L,
      flow: flow,
      renderer: renderer && !contextLost ? 'webgl' : 'css',
      resources: api.destroyed ? 0 : res.length,
    });
    api.goTo = (n) => {
      if (api.paused) return false;
      return goTo(nearestOf(wrap(n)), 'key');
    };
    let lastTimerIndex = -1;
    let lastTimerSignature = '';
    api.setTimerState = (state) => {
      if (!timerFaces.length) return;
      const timerMetaList = tok.modeMeta || [];
      let idx = Number.isInteger(state.index) ? state.index : -1;
      if (idx < 0 || idx >= timerFaces.length) {
        idx = timerMetaList.findIndex((meta) => meta.key === state.mode);
      }
      const signature = timerMetaList
        .map((meta) => `${meta.key || ''}:${meta.minutes || 0}`)
        .join('|');
      const full = idx !== lastTimerIndex || signature !== lastTimerSignature;
      lastTimerIndex = idx;
      lastTimerSignature = signature;
      const total = state.cycleTotal || 4;
      for (let i = 0; i < timerFaces.length; i++) {
        if (!full && i !== idx) continue;
        const meta = timerMetaList[i] || {};
        const faceState =
          i === idx
            ? state
            : {
                mode: meta.key || 'focus',
                label: meta.label || '',
                accent: meta.accent,
                timeLabel: baseTime(meta.minutes || 25),
                progress: 1,
                statusLine: meta.minutes ? `${meta.minutes} 分钟` : '',
                cycleCount: 0,
                cycleTotal: total,
              };
        drawTimerFace(timerFaces[i].ctx, timerFaces[i].canvas.width, faceState, tok);
        timerFaces[i].texture.needsUpdate = true;
      }
      api.paint();
      api.wake();
    };
    api.setImmersiveView = (enabled) => {
      immersiveView = !!enabled;
      if (api.reduced) viewAmount = immersiveView ? 1 : 0;
      applyView();
      api.paint();
      api.wake();
    };
    return api;
  }

  // ---- mounting: stage markup, layout and the options the effect runs with ----
  function mountDiscCarousel(element, options) {
    options = options || {};
    // destroy() puts the element back as it was and stops whatever this mount function still has scheduled
    const mounted = {
      html: element.innerHTML,
      attrs: Array.from(element.attributes, (a) => [a.name, a.value]),
      frames: new Set(),
      timers: new Set(),
      observers: new Set(),
      owned: new Set(),
      done: false,
    };
    const watched = (Base) =>
      Base &&
      class extends Base {
        constructor(cb, opts) {
          super(cb, opts);
          mounted.observers.add(this);
        }
      };
    const ResizeObserver = watched(global.ResizeObserver),
      IntersectionObserver = watched(global.IntersectionObserver),
      MutationObserver = watched(global.MutationObserver);
    mounted.restore = () => {
      mounted.done = true;
      mounted.owned.forEach((o) => {
        if (o && typeof o.destroy === 'function') o.destroy();
      });
      mounted.owned.clear();
      mounted.frames.forEach((f) => global.cancelAnimationFrame(f));
      mounted.frames.clear();
      mounted.timers.forEach((t) => {
        global.clearTimeout(t);
        global.clearInterval(t);
      });
      mounted.timers.clear();
      mounted.observers.forEach((o) => o.disconnect());
      mounted.observers.clear();
      element.innerHTML = mounted.html;
      for (const a of Array.from(element.attributes)) element.removeAttribute(a.name);
      for (const [name, value] of mounted.attrs) element.setAttribute(name, value);
    };
    element.classList.add('disc-carousel');
    element.innerHTML = '<div class="fx-board" data-dc></div>';
    const stage = element,
      board = stage.querySelector('[data-dc]');
    const inst = mount(board, {
      params: options.params,
      modeMeta: options.modeMeta,
      card: { webgl: true, interactive: true },
    });

    if (options.reducedMotion != null) inst.setReduced(options.reducedMotion);
    return {
      get params() {
        return Object.assign({}, inst.params);
      },
      setParams: inst.setParams,
      setPaused: inst.setPaused,
      reset() {
        inst.setParams(inst.defaults);
        if (inst.restore) inst.restore();
        else inst.replay();
      },
      setReducedMotion: inst.setReduced,
      destroy() {
        if (mounted.done) return;
        inst.destroy();
        mounted.restore();
      },
      goTo: (n) => inst.goTo(n),
      setTimerState: (state) => inst.setTimerState(state),
      setImmersiveView: (enabled) => inst.setImmersiveView(enabled),
      // 宿主可能自己销毁（pagehide / 上下文丢失后失败重试），外部缓存需要能确认实例还活着
      status: () => inst.status(),
    };
  }
  export { mountDiscCarousel };
