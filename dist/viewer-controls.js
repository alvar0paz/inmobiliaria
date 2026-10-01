/* Shared pointer handling for the model and panoramic viewer. No scene dependencies. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ViewerControls = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function gestures({rotate, zoom, tap = () => {}, active = () => {}}) {
    const pointers = new Map();
    let origin = null, moved = false;
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    return {
      get active() { return pointers.size > 0; },
      down(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return false;
        if (!pointers.size) { origin = {x:e.clientX, y:e.clientY}; moved = false; }
        pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
        // Any multi-touch gesture must never become a unit selection on release.
        if (pointers.size > 1) moved = true;
        active(true);
        return true;
      },
      move(e) {
        const previous = pointers.get(e.pointerId);
        if (!previous) return false;
        const before = pointers.size === 2 ? distance() : 0;
        pointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
        if (pointers.size === 2) {
          const after = distance();
          if (before > 2 && after > 2) zoom(clamp(before / after, .5, 2));
        } else if (pointers.size === 1) {
          const crossed = !moved && Math.hypot(e.clientX-origin.x, e.clientY-origin.y) > 5;
          if (crossed) moved = true;
          if (moved) rotate(e.clientX-(crossed?origin.x:previous.x), e.clientY-(crossed?origin.y:previous.y));
        }
        return true;
      },
      up(e, cancelled = false) {
        if (!pointers.has(e.pointerId)) return;
        if (cancelled) moved = true;
        pointers.delete(e.pointerId);
        if (!pointers.size) {
          if (!moved && origin && Math.hypot(e.clientX-origin.x, e.clientY-origin.y) <= 5) tap(e);
          origin = null;
          active(false);
        }
      },
      cancel() { pointers.clear(); origin = null; moved = true; active(false); }
    };
  }

  function wheelScale(delta, mode = 0, height = 800) {
    const pixels = delta * (mode === 1 ? 16 : mode === 2 ? height : 1);
    return Math.exp(clamp(pixels * .0015, -.5, .5));
  }

  function fitDistance(width, height, depth, aspect, fov = 34) {
    const vertical = Math.tan(fov * Math.PI / 360);
    return (Math.max(height / (2 * vertical), width / (2 * vertical * Math.max(.2, aspect))) + depth / 2) * 1.18;
  }

  function bind(canvas, callbacks) {
    const control = gestures(callbacks);
    canvas.addEventListener('pointerdown', e => {
      if (!control.down(e)) return;
      canvas.focus({preventScroll:true});
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!control.move(e) && e.pointerType === 'mouse') callbacks.hover?.(e);
    });
    canvas.addEventListener('pointerup', e => control.up(e));
    canvas.addEventListener('pointercancel', e => control.up(e, true));
    canvas.addEventListener('lostpointercapture', e => control.up(e, true));
    canvas.addEventListener('pointerleave', () => callbacks.leave?.());
    canvas.addEventListener('wheel', e => {
      // Scrolling past a viewer should not trap the page. Clicking it opts into wheel zoom.
      if (document.activeElement !== canvas && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      callbacks.zoom(wheelScale(e.deltaY, e.deltaMode, canvas.clientHeight));
    }, {passive:false});
    canvas.addEventListener('keydown', e => {
      // Descendant form controls never share this handler.
      if (e.target !== canvas) return;
      const actions = {ArrowLeft:()=>callbacks.rotate(-28,0), ArrowRight:()=>callbacks.rotate(28,0),
        ArrowUp:()=>callbacks.rotate(0,-24), ArrowDown:()=>callbacks.rotate(0,24),
        '+':()=>callbacks.zoom(.85), '=':()=>callbacks.zoom(.85), '-':()=>callbacks.zoom(1/.85),
        Home:()=>callbacks.reset?.(), Escape:()=>{control.cancel(); callbacks.escape?.(); canvas.blur();}};
      if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
    });
    canvas.addEventListener('blur', () => control.cancel());
    return control;
  }
  return {gestures, wheelScale, fitDistance, bind, clamp};
});
