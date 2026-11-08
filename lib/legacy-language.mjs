// Preserve old emailed language links while moving to canonical language paths.
export function legacyLanguageRedirect(input) {
  const url = new URL(input);
  const lang = url.searchParams.get('lang');
  if (lang !== 'en' && lang !== 'es') return null;
  const bare = url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  url.pathname = lang === 'en' ? '/en' + bare : bare;
  url.searchParams.delete('lang');
  return url;
}
