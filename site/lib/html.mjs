// Markup helpers shared by every page section.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../public/', import.meta.url));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
export const escapeAttr = value => String(value).replace(/[&<>"']/g, c => ESCAPES[c]);

/** Bilingual text: Spanish is rendered, both languages travel in data attributes for the switch. */
export function t(es, en, tag = 'span', cls = '') {
  return `<${tag}${cls ? ` class="${cls}"` : ''} data-es="${escapeAttr(es)}" data-en="${escapeAttr(en)}">${es}</${tag}>`;
}

/** Appends a content hash to every local script and stylesheet so caches can keep them forever. */
export function versionAssets(markup) {
  return markup.replace(/(?<attr>src|href)="\/(?<name>[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g, (_, attr, name) =>
    `${attr}="/${name}?v=${createHash('sha256').update(readFileSync(ROOT + name)).digest('hex').slice(0, 10)}"`);
}

export const SITE = 'https://inmobiliaria.alvaropaz.com';

const unescapeAttr = value => value.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const isPagePath = path => !/^(en|fonts|vendor|api|consultas)(\/|$)/.test(path) && !/\.[a-z0-9]+$/i.test(path.split(/[?#]/)[0]);

/**
 * Turns a generated Spanish page into its English twin: every element that carries data-es/data-en
 * gets its English text, placeholders switch, and internal page links move under /en/.
 */
export function toEnglish(html) {
  const opening = /<([a-z0-9]+)(?:\s[^>]*?)?\sdata-es="([^"]*)"\sdata-en="([^"]*)"[^>]*>/g;
  let out = '', last = 0, missed = 0, match;
  while ((match = opening.exec(html))) {
    const [open, tag, es, en] = match, start = match.index + open.length, text = unescapeAttr(es);
    if (!html.startsWith(text + `</${tag}>`, start)) { missed++; continue; }
    out += html.slice(last, start) + unescapeAttr(en);
    last = start + text.length;
    opening.lastIndex = last;
  }
  html = out + html.slice(last);
  if (missed) throw new Error(`toEnglish: ${missed} bilingual elements could not be swapped`);
  html = html.replace(/placeholder="([^"]*)" data-ph-es="([^"]*)" data-ph-en="([^"]*)"/g, (_, __, es, en) => `placeholder="${en}" data-ph-es="${es}" data-ph-en="${en}"`);
  return html.replace(/href="\/([^"]*)"/g, (all, path) => isPagePath(path) ? `href="/en/${path}"` : all);
}
