import { legacyLanguageRedirect } from '../../lib/legacy-language.mjs';
// Serves the generated pages in public/ (Spanish at /, English under /en/).
const pages = import.meta.glob('../../public/**/*.html', {query: '?raw', import: 'default', eager: true}) as Record<string, string>;

// Retired duplicate URLs keep working: links and bookmarks move permanently to the single page.
const MOVED: Record<string, string> = {'/propuesta/': '/', '/pixel/': '/proyecto/', '/comparar/': '/proyecto/'};

const html = (body: string, status = 200) => new Response(body, {status, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate'}});

export function GET(request: Request) {
  const url = new URL(request.url);
  const legacy = legacyLanguageRedirect(url);
  if (legacy) return Response.redirect(legacy, 301);
  const path = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
  const english = path === '/en/' || path.startsWith('/en/');
  const bare = english ? path.slice(3) : path;
  if (MOVED[bare]) return Response.redirect(new URL((english ? '/en' : '') + MOVED[bare] + url.search, url), 301);
  const page = pages['../../public' + path + 'index.html'];
  if (typeof page === 'string') return html(page);
  const notFound = pages[`../../public${english ? '/en' : ''}/404/index.html`];
  return typeof notFound === 'string' ? html(notFound, 404) : new Response('Página no encontrada', {status: 404});
}
