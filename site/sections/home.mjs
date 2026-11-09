// Home page: a scroll-driven film of the live building, what the package includes, extras, and the price once.
import { t } from '../lib/html.mjs';
import { OFFER_TOTAL, SCOPE, EXTRAS } from './commercial.mjs';

// Each beat is one time of day; premium.js shows the beat that matches the scroll position.
const BEATS = [
  ['Tu edificio, antes de que exista.', 'Your building, before it exists.', 'Lo modelamos en 3D desde tus planos y lo publicamos en una página que tus compradores giran, acercan y recorren desde el celular.', 'We model it in 3D from your drawings and publish it on a page buyers can turn, zoom and explore from their phone.'],
  ['Cada fachada, desde cualquier ángulo.', 'Every façade, from every angle.', 'Terrazas, lobby y piscina en la azotea: lo que vende tu proyecto, a un toque de distancia.', 'Terraces, lobby and rooftop pool: what sells your project, one tap away.'],
  ['De noche también vende.', 'It sells after dark, too.', 'Luz de mañana, atardecer y noche, para mostrar el edificio como se va a vivir.', 'Morning, sunset and night light, to show the building as it will be lived in.'],
];
const TIMES = [['Mañana', 'Morning'], ['Atardecer', 'Sunset'], ['Noche', 'Night']];

function film() {
  const beats = BEATS.map(([es, en, pes, pen], i) => `<li data-beat${i ? '' : ' class="is-on"'}>${t(es, en, i ? 'h2' : 'h1')}${t(pes, pen, 'p')}</li>`).join('');
  const times = TIMES.map(([es, en]) => t(es, en)).join('');
  return `<section class="film" data-film data-on="0" aria-label="Residencia 01 en 3D / Residencia 01 in 3D"><div class="film-stage">`
    + `<div class="scene-wrap film-scene" id="scene-wrap"><canvas id="architecture" tabindex="-1" aria-label="Modelo arquitectónico 3D. Arrastra para girar, usa las flechas o los botones de zoom."></canvas><div class="scene-status" id="scene-status" role="status">${t('Preparando tu visita…', 'Preparing your visit…')}</div></div>`
    + `<div class="film-copy"><ol class="film-beats">${beats}</ol><div class="film-foot"><div class="film-actions"><a class="button" href="/proyecto/">${t('Explorar la demo en 3D', 'Explore the 3D demo')}</a><a class="text-button" href="#precio">${t('Ver precio', 'See the price')}</a></div>`
    + `<div class="film-progress" aria-hidden="true"><div class="film-track"></div><div class="film-times">${times}</div></div></div></div></div></section>`;
}

function board() {
  const items = SCOPE.map(([, es, en, d, dEn]) => `<li>${t(es, en, 'h3')}${t(d, dEn, 'p')}</li>`).join('');
  return `<section class="board" aria-labelledby="board-title"><div class="board-head">${t('Lo que recibes', 'What you get', 'h2')}`
    + `${t('Un paquete cerrado: una página y un edificio 3D, listos para tus campañas y tus asesores.', 'One fixed package: a page and a 3D building, ready for your campaigns and sales team.', 'p')}</div><ul class="board-list">${items}</ul></section>`;
}

function extras() {
  const rows = EXTRAS.map(([, es, en, d, dEn]) => `<li><div>${t(es, en, 'h3')}${t(d, dEn, 'p')}</div>${t('Cotización a medida', 'Custom quote', 'span', 'extras-quote')}</li>`).join('');
  return `<section class="extras" aria-labelledby="extras-title"><div class="extras-head">${t('Cuando quieras más', 'When you want more', 'h2')}`
    + `${t('Interiores, selector de viviendas e integraciones se suman después, con su propia cotización. Todos están en la demo para que los pruebes.', 'Interiors, apartment selection and integrations are added later, each with its own quote. They are all in the demo for you to try.', 'p')}`
    + `<a class="text-button" href="/proforma/">${t('Ver la proforma completa', 'See the full proforma')}</a></div><ul class="extras-list">${rows}</ul></section>`;
}

function price() {
  return `<section class="close" id="precio" aria-labelledby="price-title"><div class="close-copy">${t('Página + edificio 3D', 'Page + 3D building', 'h2', 'close-label')}`
    + `<p class="close-price" id="price-title"><span>US$</span>${OFFER_TOTAL}</p>`
    + `${t('IVA incluido. Un edificio exterior modelado desde planos aprobados y 2 rondas de revisión. Hosting y dominio aparte.', 'VAT included. One exterior building modelled from approved drawings and 2 review rounds. Hosting and domain are separate.', 'p')}</div>`
    + `<div class="close-actions"><a class="button" href="/contacto/?source=home">${t('Cuéntanos de tu proyecto', 'Tell us about your project')}</a><a class="text-button" href="/proyecto/">${t('Probar la demo primero', 'Try the demo first')}</a></div></section>`;
}

export function homeBody() {
  return `<main id="main" class="home">${film()}${board()}${extras()}${price()}</main>`;
}
