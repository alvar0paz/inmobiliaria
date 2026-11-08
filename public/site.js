// Site-wide behaviour on every page: switch language in place (keeping the visitor's state) while the
// address bar moves between the Spanish page and its /en/ twin, and the proforma print button.
(() => {
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
})();
