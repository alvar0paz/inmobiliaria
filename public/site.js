// Site-wide behaviour on every page: switch language in place (keeping the visitor's state) while the
// address bar moves between the Spanish page and its /en/ twin, the proforma print button and the
// home page's drawings/3D comparison.
(() => {
  const legacyURL = new URL(location.href);
  const legacyLang = legacyURL.searchParams.get('lang');
  if (legacyLang === 'en' || legacyLang === 'es') {
    const bare = legacyURL.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
    legacyURL.pathname = legacyLang === 'en' ? '/en' + bare : bare;
    legacyURL.searchParams.delete('lang');
    location.replace(legacyURL.href);
    return;
  }
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const isPage = url => url.origin === location.origin && !/^\/(api|consultas|fonts|vendor)\//.test(url.pathname) && !/\.[a-z0-9]+$/i.test(url.pathname);
  const twin = (path, lang) => {
    const bare = path.replace(/^\/en(?=\/|$)/, '') || '/';
    return lang === 'en' ? '/en' + bare : bare;
  };
  function setLanguage(lang) {
    document.documentElement.lang = lang;
    $$('[data-es][data-en]').forEach(e => { e.innerHTML = e.dataset[lang]; });
    $$('meta[data-es][data-en]').forEach(m => m.setAttribute('content', m.dataset[lang]));
    $$('a[href^="/"]').forEach(a => {
      const url = new URL(a.getAttribute('href'), location.origin);
      if (isPage(url)) a.setAttribute('href', twin(url.pathname, lang) + url.search + url.hash);
    });
    const button = $('#language');
    if (button) button.textContent = lang === 'es' ? 'EN' : 'ES';
    history.replaceState(history.state, '', twin(location.pathname, lang) + location.search + location.hash);
    document.dispatchEvent(new Event('demo:language'));
  }
  $('#language')?.addEventListener('click', () => setLanguage(document.documentElement.lang === 'en' ? 'es' : 'en'));
  $('#print-proforma')?.addEventListener('click', () => window.print());
  // Drawings ↔ 3D: the range input sets where the drawing is cut. The first time the comparison is
  // in view, the divider sweeps once each way to show it can be dragged (skipped with reduced motion).
  for (const box of $$('[data-compare]')) {
    const range = box.querySelector('input'), set = v => box.style.setProperty('--cut', v + '%');
    let touched = false;
    range.addEventListener('input', () => { touched = true; set(range.value); });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) continue;
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      seen.disconnect();
      const t0 = performance.now();
      const sweep = t => {
        if (touched) return;
        const k = Math.min(1, (t - t0) / 2200), v = 50 - Math.sin(k * Math.PI * 2) * 24 * (1 - k * .4);
        set(v.toFixed(2));
        range.value = Math.round(v);
        if (k < 1) requestAnimationFrame(sweep);
      };
      setTimeout(() => requestAnimationFrame(sweep), 400);
    }, {threshold: .6});
    seen.observe(box);
  }
})();
