const pages = import.meta.glob('../../public/**/*.html', {query: '?raw', import: 'default', eager: true});
export function GET(request: Request) {
  const path = new URL(request.url).pathname;
  const key = '../../public' + (path.endsWith('/') ? path : path + '/') + 'index.html';
  const html = pages[key];
  if (typeof html !== 'string') return new Response('Página no encontrada', {status: 404});
  return new Response(html, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate'}});
}
