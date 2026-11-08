// Inventory-management simulation shown on /demo/ (runs in the browser through management.js).
import { t } from '../lib/html.mjs';
import { STATUS, TYPOLOGIES, unitPrice, usd, fmt0 } from '../lib/data.mjs';

/** Server-rendered summary so availability is readable without JavaScript. */
export function availabilityTable(p) {
  let rows = '';
  for (const [key, ty] of Object.entries(TYPOLOGIES)) {
    const units = p.units.filter(u => u.type === key);
    if (!units.length) continue;
    const free = units.filter(u => u.status === 'disponible');
    const price = free.length ? Math.min(...free.map(u => unitPrice(p, u))) : null;
    const m2 = units.map(u => u.m2);
    rows += `<tr><th scope="row">${t(...ty.name)}</th><td>${ty.beds || '—'}</td><td>${fmt0(Math.min(...m2))}–${fmt0(Math.max(...m2))} m²</td><td>${price ? usd(price) : t('Agotado', 'Sold out')}</td><td><b>${free.length}</b> / ${units.length}</td></tr>`;
  }
  return `<table class="pf-table"><caption>${p.name} · ${p.sector}</caption><thead><tr><th scope="col">${t('Tipología', 'Type')}</th><th scope="col">${t('Dorm.', 'Beds')}</th><th scope="col">${t('Superficie', 'Area')}</th><th scope="col">${t('Desde', 'From')}</th><th scope="col">${t('Disponibles', 'Available')}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function panelHead(key, n, level, title, copy, chips) {
  const chips_html = chips.map(c => `<li>${t(...c)}</li>`).join('');
  return `<header class="pf-panel-head pf-reveal"><div><span class="pf-level">${n} · ${t(...level)}</span>${t(...title, 'h2')}</div><div>${t(...copy, 'p')}<ul class="pf-chips">${chips_html}</ul></div></header>`;
}

export function basicPanel(d) {
  const options = d.projects.map(p => `<option value="${p.slug}">${p.name}</option>`).join('');
  const statuses = Object.entries(STATUS).map(([k, v]) => `<option value="${k}" data-es="${v[0]}" data-en="${v[1]}">${v[0]}</option>`).join('');
  return `<section class="pf-panel" id="demo-basico" data-panel="basico" role="tabpanel" aria-labelledby="tab-basico">${panelHead('basico', '01', ['GESTIÓN Y CONSULTAS', 'MANAGEMENT & ENQUIRIES'], ['Una misma base,<br>siempre conectada.', 'One shared foundation,<br>always connected.'], ['Cambia un dato en el gestor central y mira cómo llega, en el mismo instante, a la tarjeta del sitio de marca, a la ficha del proyecto, a la tabla de estado, al feed y al bot de WhatsApp. Esta simulación se ejecuta solo en tu navegador.', 'Change a value in the central manager and watch it reach the brand-site card, the project page, the status table, the feed and the WhatsApp bot at the same moment. This simulation runs only in your browser.'], [['Gestor central', 'Central manager'], ['Feed JSON', 'JSON feed'], ['Bot de WhatsApp', 'WhatsApp bot'], ['Reglas de publicación', 'Publishing rules']])}
<div class="pf-basic js-only"><form class="pf-stage pf-cms" id="cms" autocomplete="off"><div class="pf-stage-bar"><b>${t('GESTOR CENTRAL', 'CENTRAL MANAGER')}</b><span>${t('Rol: Comercial', 'Role: Sales')}</span></div>
<label>${t('Proyecto', 'Project')}<select name="project">${options}</select></label>
<label>${t('Precio por m² (USD)', 'Price per m² (USD)')}<input name="m2_price" type="number" min="500" max="6000" step="10" inputmode="numeric"></label>
<label>${t('Estado', 'Status')}<select name="status">${statuses}</select></label>
<label>${t('Avance de obra', 'Construction progress')} <output name="progress_out"></output><input name="progress" type="range" min="0" max="100"></label>
<fieldset><legend>${t('Vigencia de precios', 'Price validity')}</legend><label class="pf-radio"><input type="radio" name="age" value="5" checked>${t('Actualizados hace 5 días', 'Updated 5 days ago')}</label><label class="pf-radio"><input type="radio" name="age" value="75">${t('Actualizados hace 75 días', 'Updated 75 days ago')}</label></fieldset>
<label class="pf-switch"><input type="checkbox" name="sellable" checked><span>${t('Comercializable', 'For sale')}</span><small>${t('Solo lo edita el rol Legal', 'Legal role only')}</small></label>
<p class="pf-cms-note" id="cms-note" aria-live="polite"></p></form>
<div class="pf-outputs"><article class="pf-out" data-out="card"><small>promotora.example/proyectos/</small><div id="out-card"></div></article><article class="pf-out" data-out="page"><small id="out-page-domain"></small><div id="out-page"></div></article><article class="pf-out" data-out="status"><small>promotora.example/estado-de-proyectos/</small><div id="out-status"></div></article><article class="pf-out pf-out-code" id="api-json" data-out="feed"><small>API / JSON · /proyectos.json</small><pre id="out-feed"></pre></article></div>
<div class="pf-phone" aria-label="WhatsApp"><div class="pf-phone-screen"><div class="pf-wa-head"><span class="pf-wa-avatar" id="wa-avatar">P</span><div><b id="wa-name">Residencia 01</b><small>${t('Asistente simulado · datos de ejemplo', 'Simulated assistant · sample data')}</small></div></div><div class="pf-wa-body" id="wa-body" aria-live="polite"></div><div class="pf-wa-quick" id="wa-quick"></div><form class="pf-wa-input" id="wa-form"><label class="sr-only" for="wa-text">${t('Mensaje', 'Message')}</label><input id="wa-text" placeholder="Escribe un mensaje" data-ph-es="Escribe un mensaje" data-ph-en="Type a message" autocomplete="off"><button aria-label="Enviar">➤</button></form></div></div></div>
<div class="pf-log js-only"><b>${t('Eventos y reglas automáticas', 'Events and automatic rules')}</b><ol id="event-log"></ol></div>
<div class="pf-fallback">${availabilityTable(d.projects[0])}<p class="detail-note">${t('En el nivel básico la disponibilidad se publica como tabla, generada desde el gestor y legible sin JavaScript.', 'At the basic level availability is published as a table, generated from the manager and readable without JavaScript.')}</p></div></section>`;
}
