// Checks the generated pages in public/: routes, links, languages, scripts, caching and content rules.
// Run after `npm run pages` (CI also fails if the committed pages are out of date).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const SITE = 'https://inmobiliaria.alvaropaz.com';
const walk = dir => readdirSync(dir).flatMap(name => statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]);
const files = walk(ROOT);
const pages = files.filter(f => f.endsWith('index.html'));
const read = f => readFileSync(f, 'utf8');
const route = f => '/' + relative(ROOT, f).replace(/index\.html$/, '');
const attrs = (html, name) => [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map(m => m[1]);
const scripts = html => [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
const ROUTES = ['/', '/proyecto/', '/como-funciona/', '/demo/', '/proforma/', '/nosotros/', '/contacto/', '/privacidad/', '/404/'];

test('every route exists once in Spanish and once in English, and nothing else is published as a page', () => {
  const expected = [...ROUTES, ...ROUTES.map(r => '/en' + r)].sort();
  assert.deepEqual(pages.map(route).sort(), expected);
  for (const retired of ['propuesta', 'pixel', 'comparar']) assert.ok(!existsSync(join(ROOT, retired)), retired);
});

test('internal links, assets and fragment targets resolve; ids are unique', () => {
  for (const file of pages) {
    const html = read(file), ids = attrs(html, 'id');
    assert.equal(ids.length, new Set(ids).size, `duplicate id in ${route(file)}`);
    for (const ref of [...attrs(html, 'href'), ...attrs(html, 'src')]) {
      if (/^(https?:|mailto:)/.test(ref)) continue;
      const url = new URL(ref, SITE + route(file));
      if (ref.startsWith('#')) { assert.ok(ids.includes(url.hash.slice(1)), `${route(file)} → ${ref}`); continue; }
      let target = join(ROOT, decodeURIComponent(url.pathname));
      if (url.pathname.endsWith('/')) target = join(target, 'index.html');
      assert.ok(existsSync(target), `${route(file)} → ${ref}`);
      if (url.hash && target.endsWith('.html')) assert.ok(attrs(read(target), 'id').includes(url.hash.slice(1)), `${route(file)} → ${ref}`);
    }
  }
});

test('English pages are English: lang, title, description, canonical and hreflang pairs', () => {
  for (const r of ROUTES) {
    const es = read(join(ROOT, r, 'index.html')), en = read(join(ROOT, 'en', r, 'index.html'));
    assert.match(es, /<html lang="es">/); assert.match(en, /<html lang="en">/);
    assert.notEqual(es.match(/<title[^>]*>([^<]*)/)[1], en.match(/<title[^>]*>([^<]*)/)[1], `title ${r}`);
    assert.match(en, /<meta name="description" content="Interactive architecture/);
    assert.ok(es.includes(`<link rel="canonical" href="${SITE}${r}">`), `canonical ${r}`);
    assert.ok(en.includes(`<link rel="canonical" href="${SITE}/en${r}">`), `canonical en ${r}`);
    for (const html of [es, en]) {
      assert.ok(html.includes(`hreflang="es" href="${SITE}${r}"`) && html.includes(`hreflang="en" href="${SITE}/en${r}"`), `hreflang ${r}`);
    }
    // English internal links stay in English.
    for (const href of attrs(en, 'href').filter(h => h.startsWith('/') && !/\.(css|js|woff2)/.test(h) && !h.startsWith('/fonts/'))) assert.match(href, /^\/en\//, `${r} → ${href}`);
    const text = en.replace(/<head>[\s\S]*?<\/head>|<script[\s\S]*?<\/script>|<[^>]+>/g, ' ');
    for (const word of ['Explorar', 'Hablemos', 'Enviar mi proyecto', 'Continuar', 'Saltar al contenido']) assert.ok(!text.includes(word), `${r} still shows “${word}”`);
  }
});

test('the 3D engine loads only on pages with a 3D view; page scripts load only where used', () => {
  const viewer = ['/', '/proyecto/'];
  for (const file of pages) {
    const r = route(file).replace(/^\/en\//, '/'), list = scripts(read(file));
    assert.ok(list.includes('/site.js'), r);
    assert.equal(list.includes('/architecture.js'), viewer.includes(r), `architecture.js on ${r}`);
    for (const part of ['/viewer-kit.js', '/viewer-site.js', '/building-tower.js']) assert.equal(list.includes(part), viewer.includes(r), `${part} on ${r}`);
    assert.equal(list.includes('/premium.js'), viewer.includes(r), `premium.js on ${r}`);
    assert.equal(list.includes('/enquiry.js'), r === '/contacto/', `enquiry.js on ${r}`);
    assert.equal(list.includes('/management.js'), r === '/demo/', `management.js on ${r}`);
    assert.ok(!list.includes('/vendor/three.min.js'), 'three.js is downloaded lazily');
    if (viewer.includes(r)) {
      assert.ok(list.indexOf('/viewer-controls.js') < list.indexOf('/viewer-kit.js'));
      assert.ok(list.indexOf('/viewer-kit.js') < list.indexOf('/viewer-site.js') && list.indexOf('/viewer-site.js') < list.indexOf('/building-tower.js'));
      assert.ok(list.indexOf('/building-tower.js') < list.indexOf('/architecture.js'));
      assert.ok(list.indexOf('/site.js') < list.indexOf('/premium.js'));
    }
  }
});

test('one stylesheet, self-hosted fonts, and every local asset carries a content version', () => {
  const css = read(join(ROOT, 'site.css'));
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(css), 'no Google Fonts');
  assert.ok(!css.includes('@import'), 'no @import chains');
  assert.equal((css.replace(/\/\*[\s\S]*?\*\//g, '').match(/!important/g) || []).length, 5, 'only the documented !important declarations');
  for (const font of [...css.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map(m => m[1])) assert.ok(existsSync(join(ROOT, font)), font);
  for (const file of pages) {
    const html = read(file);
    assert.deepEqual(attrs(html, 'rel').filter(r => r === 'stylesheet'), ['stylesheet'], route(file));
    for (const ref of [...attrs(html, 'href'), ...attrs(html, 'src')].filter(r => /^\/[^/].*\.(js|css)/.test(r))) assert.match(ref, /\?v=[0-9a-f]{10}$/, `${route(file)} → ${ref}`);
  }
  const loader = read(join(ROOT, 'asset-loader.js')), versions = JSON.parse(loader.match(/const VERSIONS=(\{[^}]*\});/)[1]);
  for (const path of ['vendor/three.min.js', 'vendor/GLTFLoader.js', 'building-gltf.js']) {
    assert.match(versions[path] || '', /^[0-9a-f]{10}$/, `lazy ${path} is versioned`);
    assert.equal(versions[path], createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex').slice(0, 10), `${path} version is current`);
  }
});

test('versioned assets are cached for a year; pages are not', () => {
  const headers = read(join(ROOT, '_headers'));
  for (const asset of files.filter(f => /\.(js|css)$/.test(f) && !f.includes('/vendor/')).map(f => '/' + relative(ROOT, f))) {
    assert.ok(headers.includes(`${asset}\n  Cache-Control: public, max-age=31536000, immutable`), asset);
  }
  assert.ok(headers.includes('/fonts/*\n') && headers.includes('/vendor/*\n') && headers.includes('/_next/static/*\n'));
  assert.ok(!/\.html|^\/\*$/m.test(headers), 'pages keep revalidating');
});

test('the guided tour keeps its data, steps and controls', () => {
  const html = read(join(ROOT, 'proyecto/index.html'));
  const data = JSON.parse(html.match(/<script id="demo-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(data.sample); assert.equal(data.project.units.length, 72);
  for (const id of ['architecture', 'floor', 'bedrooms', 'available', 'unit-list', 'selected-home', 'enquire', 'language']) assert.ok(attrs(html, 'id').includes(id), id);
  assert.equal((html.match(/data-step=/g) || []).length, 4);
});

test('management simulation keeps three sample projects and its outputs', () => {
  const html = read(join(ROOT, 'demo/index.html'));
  assert.equal(JSON.parse(html.match(/<script type="application\/json" id="demo-data">([\s\S]*?)<\/script>/)[1]).projects.length, 3);
  for (const id of ['cms', 'out-card', 'out-feed', 'wa-form']) assert.ok(attrs(html, 'id').includes(id), id);
  assert.match(html, /<body class="page-demo">/);
});

test('privacy notice is linked from the form and the footer of every page', () => {
  assert.ok(read(join(ROOT, 'contacto/index.html')).includes('<a href="/privacidad/">Política de privacidad</a>'));
  assert.ok(read(join(ROOT, 'en/contacto/index.html')).includes('<a href="/en/privacidad/">Privacy policy</a>'));
  for (const file of pages) assert.match(read(file), /href="(\/en)?\/privacidad\/"/, route(file));
});

test('no raster images, no retired tier interfaces, no original client brand or quote', () => {
  assert.deepEqual(files.filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f)), []);
  const forbidden = ['alpha builders', 'alphabuilders', 'pixel.com.ec', 'contacto@pixel', '41.990', '46.990', '49.990', 'zolutium', '16 sitios', '15 sitios', 'data-price=', 'ruc 17', '<img', 'textureloader', 'data-tier', 'data-direction', 'compare options', 'comparar opciones', 'tres niveles', 'three tiers'];
  for (const file of files.filter(f => /\.(html|js|json|css)$/.test(f) && !f.includes('/vendor/'))) {
    const text = read(file).toLowerCase();
    for (const term of forbidden) assert.ok(!text.includes(term), `${relative(ROOT, file)} contains “${term}”`);
  }
  assert.ok(read(join(ROOT, 'contacto/index.html')).includes('info@tnkoo.com'));
});
