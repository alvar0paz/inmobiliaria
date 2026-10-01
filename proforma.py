"""Proforma page: the three design levels of the brief, each with its own interactive demo.

Units, prices and availability are illustrative sample data generated here; production reads them
from the central content manager. Edit PRICING to fill in the quote.
"""
import json
import random
from html import escape
from build import ROOT, t, a, btn, head, footer, proposal

# USD without VAT. None renders an empty field that can be filled in during the presentation.
PRICING = {
    'basico': {'core': None, 'site': None, 'new_site': None, 'maintenance': None, 'hosting': None, 'hourly': None},
    'medio': {'core': None, 'site': None, 'new_site': None, 'maintenance': None, 'hosting': None, 'hourly': None},
    'alto': {'core': None, 'site': None, 'new_site': None, 'maintenance': None, 'hosting': None, 'hourly': None},
}
VAT = 0.15

TYPOLOGIES = {
    'estudio': {'name': ('Estudio', 'Studio'), 'beds': 0, 'm2': (32, 38), 'scene': 'suite'},
    'suite': {'name': ('Suite', 'Suite'), 'beds': 1, 'm2': (46, 56), 'scene': 'suite'},
    'depa2': {'name': ('Departamento 2D', '2-bed apartment'), 'beds': 2, 'm2': (68, 82), 'scene': 'living'},
    'depa3': {'name': ('Departamento 3D', '3-bed apartment'), 'beds': 3, 'm2': (96, 112), 'scene': 'living'},
}

# layout: typology per position; front row first, then back row (used by the 2D plan and the 3D model)
PROJECTS = [
    {'slug': 'pixel', 'name': 'Pixel', 'domain': 'pixel.com.ec', 'sector': 'La Magdalena', 'address': 'Av. 5 de Junio y Rodrigo de Chávez',
     'floors': 12, 'front': 3, 'layout': ['suite', 'depa2', 'estudio', 'estudio', 'depa3', 'suite'], 'm2_price': 1580,
     'status': 'construccion', 'progress': 64, 'delivery': '2027-11', 'color': '#e0bd75', 'image': 'pixel-exterior', 'amenities': ['lobby', 'pool'],
     'whatsapp': '+593996775283'},
    {'slug': 'magnus', 'name': 'Magnus', 'domain': 'magnus.alphabuildershq.com', 'sector': 'Quito', 'address': 'Dirección según ficha oficial',
     'floors': 16, 'front': 2, 'layout': ['depa2', 'depa3', 'suite', 'depa2'], 'm2_price': 2050,
     'status': 'planos', 'progress': 12, 'delivery': '2029-03', 'color': '#b9c6d8', 'image': 'magnus-night', 'amenities': ['lobby', 'rooftop'],
     'whatsapp': '+59325133210'},
    {'slug': 'sparta', 'name': 'Sparta', 'domain': 'sparta.alphabuildershq.com', 'sector': 'Av. Bélgica y Shyris', 'address': 'Av. Bélgica y Shyris',
     'floors': 9, 'front': 3, 'layout': ['suite', 'estudio', 'suite', 'depa2', 'depa2'], 'm2_price': 1820,
     'status': 'acabados', 'progress': 88, 'delivery': '2027-02', 'color': '#c9a27a', 'image': 'sparta-exterior', 'amenities': ['lobby', 'gym'],
     'whatsapp': '+59325133210'},
]

STATUS = {'planos': ('En planos', 'Off-plan'), 'construccion': ('En construcción', 'Under construction'), 'obra_gris': ('Obra gris', 'Shell'),
          'acabados': ('Acabados', 'Finishing'), 'entregado': ('Entregado', 'Delivered'), 'suspendido': ('Suspendido', 'Suspended')}
UNIT_STATUS = {'disponible': ('Disponible', 'Available'), 'reservado': ('Reservado', 'Reserved'), 'vendido': ('Vendido', 'Sold')}


def build_units(p):
    rnd = random.Random(p['slug'])
    units = []
    for floor in range(2, p['floors'] + 2):  # floor 1 is the lobby
        sold_bias = 0.5 - floor / (p['floors'] + 2) * 0.3  # lower floors sell first
        for pos, ty in enumerate(p['layout']):
            lo, hi = TYPOLOGIES[ty]['m2']
            m2 = round(rnd.uniform(lo, hi), 1)
            r = rnd.random()
            status = 'vendido' if r < sold_bias else 'reservado' if r < sold_bias + 0.14 else 'disponible'
            units.append({'id': f'{floor}{pos + 1:02d}', 'floor': floor, 'pos': pos, 'type': ty, 'm2': m2, 'status': status})
    return units


def data():
    projects = []
    for p in PROJECTS:
        projects.append({**p, 'units': build_units(p)})
    return {'sample': True, 'priceValidDays': 60, 'typologies': TYPOLOGIES, 'status': STATUS, 'unitStatus': UNIT_STATUS, 'projects': projects}


def unit_price(p, u):
    return round(u['m2'] * p['m2_price'] * (1 + (u['floor'] - 2) * 0.008), -2)


def usd(n):
    return 'USD ' + f'{n:,.0f}'.replace(',', '.')


def availability_table(p):
    """Server-rendered summary so availability is readable without JavaScript."""
    rows = ''
    for key, ty in TYPOLOGIES.items():
        units = [u for u in p['units'] if u['type'] == key]
        if not units:
            continue
        free = [u for u in units if u['status'] == 'disponible']
        price = min((unit_price(p, u) for u in free), default=None)
        m2 = [u['m2'] for u in units]
        rows += (f'<tr><th scope="row">{t(*ty["name"])}</th><td>{ty["beds"] or "—"}</td><td>{min(m2):.0f}–{max(m2):.0f} m²</td>'
                 f'<td>{usd(price) if price else t("Agotado", "Sold out")}</td><td><b>{len(free)}</b> / {len(units)}</td></tr>')
    return (f'<table class="pf-table"><caption>{p["name"]} · {p["sector"]}</caption><thead><tr><th scope="col">{t("Tipología", "Type")}</th>'
            f'<th scope="col">{t("Dorm.", "Beds")}</th><th scope="col">{t("Superficie", "Area")}</th><th scope="col">{t("Desde", "From")}</th>'
            f'<th scope="col">{t("Disponibles", "Available")}</th></tr></thead><tbody>{rows}</tbody></table>')


TIERS = [
    ('basico', 'essential', '01', ('BÁSICO', 'BASIC'), ('Esencial y funcionando', 'Essential and working'),
     ('Kit de componentes adaptado a la marca, todas las reglas del brief activas y el bot de WhatsApp respondiendo con los datos oficiales.',
      'A component kit adapted to the brand, every rule in the brief switched on and the WhatsApp bot answering with official data.'),
     [('Gestor central: un dato, un solo lugar', 'Central manager: one fact, one place'), ('Bot de WhatsApp conectado al feed', 'WhatsApp bot fed by the project feed'),
      ('Precios vencidos y no comercializables, automáticos', 'Expired prices and non-sale rules, automatic')]),
    ('medio', 'editorial', '02', ('MEDIO', 'MID'), ('Edificios en 2D', 'Buildings in 2D'),
     ('Diseño a medida en Figma y un selector 2D: cada edificio en fachada y en planta, con cada unidad y su estado.',
      'Bespoke Figma design and a 2D selector: every building in elevation and plan, showing each unit and its status.'),
     [('Todo lo del nivel básico', 'Everything in Basic'), ('Fachada y planta interactivas por proyecto', 'Interactive elevation and floor plan per project'),
      ('Transiciones y microinteracciones', 'Transitions and micro-interactions')]),
    ('alto', 'immersive', '03', ('ALTO', 'HIGH'), ('3D y visitas virtuales', '3D and virtual visits'),
     ('Dirección de arte propia, maqueta 3D de los proyectos con disponibilidad en vivo y visitas virtuales a departamentos y áreas comunes.',
      'Own art direction, a 3D model of the projects with live availability and virtual visits to apartments and shared spaces.'),
     [('Todo lo del nivel medio', 'Everything in Mid'), ('Maqueta 3D de la red de proyectos', '3D model of the project network'),
      ('Visitas virtuales: departamentos y áreas comunes', 'Virtual visits: apartments and shared spaces')]),
]

VERSUS = [
    (('Precio, m² y tipologías en texto', 'Price, m² and unit types as text'), ('No', 'No'), 'y', 'y', 'y'),
    (('Estado, avance y fecha de entrega', 'Status, progress and delivery date'), ('No', 'No'), 'y', 'y', 'y'),
    (('Disponibilidad por unidad', 'Availability per unit'), ('No', 'No'), ('Tabla', 'Table'), ('Fachada y planta 2D', '2D elevation and plan'), ('Maqueta 3D', '3D model')),
    (('WhatsApp por proyecto con bot', 'Per-project WhatsApp with bot'), ('No visible', 'Not visible'), 'y', 'y', 'y'),
    (('Recorrido de espacios', 'Tour of the spaces'), ('Solo Pixel, en su sitio aparte', 'Pixel only, on a separate site'), ('Enlace al tour 360', 'Link to 360 tour'), ('Enlace al tour 360', 'Link to 360 tour'), ('Visita virtual integrada', 'Built-in virtual visit')),
    (('Sitio propio por proyecto, en la misma red', 'Own site per project, on one network'), ('1 de 15, desconectado', '1 of 15, disconnected'), '15', '15', '15'),
    (('Legible para IA: JSON-LD, llms.txt, feed', 'AI-readable: JSON-LD, llms.txt, feed'), ('No', 'No'), 'y', 'y', 'y'),
]

LEVELS = [
    (('Punto de partida', 'Starting point'), ('Kit de componentes adaptado', 'Adapted component kit'), ('Diseño a medida en Figma', 'Bespoke Figma design'), ('Figma con dirección de arte propia', 'Figma with own art direction')),
    (('Plantillas', 'Templates'), ('Las 13, variaciones mínimas', 'All 13, minimal variation'), ('Las 13, cada una a medida', 'All 13, each tailored'), ('Las 13 + portada propia por proyecto', 'All 13 + own cover per project')),
    (('Tema por proyecto', 'Theme per project'), ('Logo y paleta', 'Logo and palette'), ('Logo, paleta, tipografía e imagen', 'Logo, palette, type and image'), ('Todo lo anterior + portada propia', 'All of the above + own cover')),
    (('Movimiento', 'Motion'), ('Estados básicos', 'Basic states'), ('Transiciones y microinteracciones', 'Transitions and micro-interactions'), ('Narrativa con scroll', 'Scroll-driven narrative')),
    (('Experiencia de unidades', 'Unit experience'), ('Tabla de disponibilidad + bot', 'Availability table + bot'), ('Edificio en 2D: fachada y planta', 'Building in 2D: elevation and plan'), ('Maqueta 3D + visitas virtuales', '3D model + virtual visits')),
    (('Prototipo', 'Prototype'), ('Wireframes navegables', 'Clickable wireframes'), ('Prototipo navegable', 'Clickable prototype'), ('Prototipo con animaciones', 'Animated prototype')),
    (('Rondas de diseño', 'Design rounds'), ('1', '1'), ('2', '2'), ('2 + pulido', '2 + polish')),
    (('Entregable de diseño', 'Design deliverable'), ('Guía de estilo básica', 'Basic style guide'), ('Sistema de diseño en Figma', 'Figma design system'), ('Sistema de diseño + guía de movimiento', 'Design system + motion guide')),
]

PRICE_ROWS = [
    ('core', ('Sistema central, sitio de marca y plantilla de proyecto', 'Central system, brand site and project template'), 'input'),
    ('site', ('Precio por sitio de proyecto', 'Price per project site'), 'input'),
    ('sites', ('15 sitios de proyecto, incluida la migración de pixel.com.ec', '15 project sites, including the pixel.com.ec migration'), 'calc'),
    ('subtotal', ('Total sin IVA', 'Total excluding VAT'), 'calc'),
    ('vat', ('IVA 15%', 'VAT 15%'), 'calc'),
    ('total', ('Total con IVA', 'Total including VAT'), 'total'),
    ('sign', ('Pago a la firma (70%) · jue 8 oct 2026', 'Payment on signing (70%) · Thu 8 Oct 2026'), 'calc'),
    ('accept', ('Pago a la aceptación final (30%) · mar 8 dic 2026', 'Payment on final acceptance (30%) · Tue 8 Dec 2026'), 'calc'),
    ('new_site', ('Sitio de proyecto nuevo, después del lanzamiento (5 días hábiles)', 'New project site after launch (5 working days)'), 'input'),
    ('maintenance', ('Mantenimiento mensual opcional, por sitio', 'Optional monthly maintenance, per site'), 'input'),
    ('hosting', ('Costo anual de referencia por dominio: hosting, licencias y servicios', 'Reference annual cost per domain: hosting, licences and services'), 'input'),
    ('hourly', ('Tarifa por hora fuera de alcance', 'Hourly rate for out-of-scope work'), 'input'),
]


def check(v):
    if v == 'y':
        return '<span class="pf-yes" aria-label="Sí">✓</span>'
    return t(*v) if isinstance(v, tuple) else escape(v)


def hero():
    cards = ''
    for key, style, n, level, name, desc, points in TIERS:
        items = ''.join(f'<li>{t(*pt)}</li>' for pt in points)
        cards += (f'<article class="pf-tier pf-reveal" data-tier-card="{key}"><div class="pf-tier-top"><span>{n}</span>{t(*level, "small")}</div>{t(*name, "h3")}{t(*desc, "p")}'
                  f'<ul>{items}</ul><div class="pf-tier-foot"><span class="pf-tier-total" data-total="{key}">{t("Precio por definir", "Price to be confirmed")}</span>'
                  f'<a class="button" href="#demo-{key}" data-tier="{key}">{t("Ver demo", "View demo")}</a></div></article>')
    return f'''<section class="pf-hero" id="inicio"><div class="pf-hero-copy"><div class="eyebrow">{t('PROFORMA DEMO · RED WEB ALPHA BUILDERS','QUOTE DEMO · ALPHA BUILDERS WEB NETWORK')}</div>{t('Tres niveles.<br>Una misma <em>red.</em>','Three levels.<br>One <em>network.</em>','h1')}<p class="pf-lead">{t('El mismo alcance, los mismos 18 requisitos y el mismo lanzamiento del 2 de diciembre de 2026 en los tres niveles. Cambia la experiencia que vive el comprador. Cada nivel se puede probar aquí mismo.','The same scope, the same 18 requirements and the same 2 December 2026 launch in all three levels. What changes is the buyer’s experience. Every level can be tried right here.')}</p><dl class="pf-facts"><div><dt>{t('Sitios','Sites')}</dt><dd>16</dd></div><div><dt>{t('Lanzamiento','Launch')}</dt><dd>{t('2 dic 2026','2 Dec 2026')}</dd></div><div><dt>{t('Pago','Payment')}</dt><dd>70 / 30</dd></div></dl></div><div class="pf-tiers">{cards}</div></section>'''


def versus():
    rows = ''.join(f'<tr><th scope="row">{t(*label)}</th><td class="pf-now">{t(*now)}</td><td>{check(b)}</td><td>{check(m)}</td><td>{check(h)}</td></tr>' for label, now, b, m, h in VERSUS)
    return f'''<section class="section pf-versus pf-reveal" id="comparativa"><div class="section-header"><div><div class="eyebrow">{t('DE DÓNDE PARTIMOS','WHERE WE START')}</div>{t('El sitio actual frente a la red nueva.','The current website versus the new network.','h2')}</div><a class="text-link" href="https://alphabuildershq.com/" target="_blank" rel="noopener">{t('Ver alphabuildershq.com','View alphabuildershq.com')}</a></div><div class="pf-scroll"><table class="pf-table pf-compare"><thead><tr><th scope="col"><span class="sr-only">{t('Aspecto','Aspect')}</span></th><th scope="col">{t('Sitio actual','Current site')}</th><th scope="col">{t('Básico','Basic')}</th><th scope="col">{t('Medio','Mid')}</th><th scope="col">{t('Alto','High')}</th></tr></thead><tbody>{rows}</tbody></table></div><p class="detail-note">{t('Sitio actual revisado el 30 de septiembre de 2026: la portada muestra nombres de proyectos sin precios, estado ni disponibilidad, y no se ve un enlace de WhatsApp.','Current website reviewed on 30 September 2026: the homepage lists project names without prices, status or availability, and no WhatsApp link is visible.')}</p></section>'''


def panel_head(key, n, level, title, copy, chips):
    chips_html = ''.join(f'<li>{t(*c)}</li>' for c in chips)
    return f'<header class="pf-panel-head pf-reveal"><div><span class="pf-level">{n} · {t(*level)}</span>{t(*title, "h2")}</div><div>{t(*copy, "p")}<ul class="pf-chips">{chips_html}</ul></div></header>'


def basic_panel(d):
    options = ''.join(f'<option value="{p["slug"]}">{p["name"]}</option>' for p in d['projects'])
    statuses = ''.join(f'<option value="{k}" data-es="{v[0]}" data-en="{v[1]}">{v[0]}</option>' for k, v in STATUS.items())
    return f'''<section class="pf-panel" id="demo-basico" data-panel="basico" role="tabpanel" aria-labelledby="tab-basico">{panel_head('basico', '01', ('BÁSICO', 'BASIC'), ('Todo lo esencial,<br>funcionando.', 'Everything essential,<br>working.'), ('Cambia un dato en el gestor central y mira cómo llega, en el mismo instante, a la tarjeta del sitio de marca, a la ficha del proyecto, a la tabla de estado, al feed y al bot de WhatsApp. Así se comprueba el requisito 2 del brief.', 'Change a value in the central manager and watch it reach the brand-site card, the project page, the status table, the feed and the WhatsApp bot at the same moment. This is how requirement 2 of the brief is verified.'), [('Kit de componentes', 'Component kit'), ('Logo y paleta por proyecto', 'Logo and palette per project'), ('Sin animaciones', 'No animation'), ('1 ronda de diseño', '1 design round')])}
<div class="pf-basic js-only"><form class="pf-stage pf-cms" id="cms" autocomplete="off"><div class="pf-stage-bar"><b>{t('GESTOR CENTRAL','CENTRAL MANAGER')}</b><span>{t('Rol: Comercial','Role: Sales')}</span></div>
<label>{t('Proyecto','Project')}<select name="project">{options}</select></label>
<label>{t('Precio por m² (USD)','Price per m² (USD)')}<input name="m2_price" type="number" min="500" max="6000" step="10" inputmode="numeric"></label>
<label>{t('Estado','Status')}<select name="status">{statuses}</select></label>
<label>{t('Avance de obra','Construction progress')} <output name="progress_out"></output><input name="progress" type="range" min="0" max="100"></label>
<fieldset><legend>{t('Vigencia de precios','Price validity')}</legend><label class="pf-radio"><input type="radio" name="age" value="5" checked>{t('Actualizados hace 5 días','Updated 5 days ago')}</label><label class="pf-radio"><input type="radio" name="age" value="75">{t('Actualizados hace 75 días','Updated 75 days ago')}</label></fieldset>
<label class="pf-switch"><input type="checkbox" name="sellable" checked><span>{t('Comercializable','For sale')}</span><small>{t('Solo lo edita el rol Legal','Legal role only')}</small></label>
<p class="pf-cms-note" id="cms-note" aria-live="polite"></p></form>
<div class="pf-outputs"><article class="pf-out" data-out="card"><small>alphabuildershq.com/proyectos/</small><div id="out-card"></div></article><article class="pf-out" data-out="page"><small id="out-page-domain"></small><div id="out-page"></div></article><article class="pf-out" data-out="status"><small>alphabuildershq.com/estado-de-proyectos/</small><div id="out-status"></div></article><article class="pf-out pf-out-code" data-out="feed"><small>/proyectos.json</small><pre id="out-feed"></pre></article></div>
<div class="pf-phone" aria-label="WhatsApp"><div class="pf-phone-screen"><div class="pf-wa-head"><span class="pf-wa-avatar" id="wa-avatar">P</span><div><b id="wa-name">Pixel</b><small>{t('Asistente · responde con el feed oficial','Assistant · answers from the official feed')}</small></div></div><div class="pf-wa-body" id="wa-body" aria-live="polite"></div><div class="pf-wa-quick" id="wa-quick"></div><form class="pf-wa-input" id="wa-form"><label class="sr-only" for="wa-text">{t('Mensaje','Message')}</label><input id="wa-text" placeholder="Escribe un mensaje" data-ph-es="Escribe un mensaje" data-ph-en="Type a message" autocomplete="off"><button aria-label="Enviar">➤</button></form></div></div></div>
<div class="pf-log js-only"><b>{t('Eventos y reglas automáticas','Events and automatic rules')}</b><ol id="event-log"></ol></div>
<div class="pf-fallback">{availability_table(d['projects'][0])}<p class="detail-note">{t('En el nivel básico la disponibilidad se publica como tabla, generada desde el gestor y legible sin JavaScript.','At the basic level availability is published as a table, generated from the manager and readable without JavaScript.')}</p></div></section>'''


def mid_panel(d):
    tables = ''.join(availability_table(p) for p in d['projects'])
    return f'''<section class="pf-panel" id="demo-medio" data-panel="medio" role="tabpanel" aria-labelledby="tab-medio">{panel_head('medio', '02', ('MEDIO', 'MID'), ('Cada edificio,<br>piso por piso.', 'Every building,<br>floor by floor.'), ('Elige un edificio de la red, recorre su fachada y abre la planta de cualquier piso. Cada unidad muestra su tipología, su superficie, su precio y si está disponible, con los mismos datos del gestor.', 'Pick a building from the network, move along its elevation and open the plan of any floor. Every unit shows its type, area, price and availability, from the same manager data.'), [('Diseño a medida en Figma', 'Bespoke Figma design'), ('Tema con tipografía e imagen', 'Theme with type and image'), ('Microinteracciones', 'Micro-interactions'), ('2 rondas de diseño', '2 design rounds')])}
<div class="pf-mid js-only"><div class="pf-skyline" id="skyline" role="group" aria-label="Edificios"></div><div class="pf-filters" id="filters2d" role="group" aria-label="Filtros"></div><div class="pf-2d"><div class="pf-stage pf-elev"><div class="pf-stage-bar"><b id="elev-title"></b><span>{t('Fachada · toca un piso','Elevation · tap a floor')}</span></div><svg id="elev" role="img" aria-label="Fachada"></svg></div><div class="pf-2d-side"><div class="pf-stage pf-plan"><div class="pf-stage-bar"><b id="plan-title"></b><span>{t('Planta · toca una unidad','Plan · tap a unit')}</span></div><svg id="plan" role="img" aria-label="Planta"></svg></div><div class="pf-unit" id="unit2d" aria-live="polite"></div></div></div><div class="pf-legend" data-legend></div></div>
<div class="pf-fallback pf-fallback-grid">{tables}</div></section>'''


def high_panel(d):
    return f'''<section class="pf-panel" id="demo-alto" data-panel="alto" role="tabpanel" aria-labelledby="tab-alto">{panel_head('alto', '03', ('ALTO', 'HIGH'), ('Recorre el proyecto<br>antes de que exista.', 'Walk through the project<br>before it exists.'), ('Una maqueta 3D con los proyectos de la red. Gira, acércate, aísla un piso y elige un departamento disponible. Desde ahí entras a la visita virtual del departamento y de las áreas comunes.', 'A 3D model of the projects in the network. Rotate, zoom in, isolate a floor and pick an available apartment. From there you step into the virtual visit of the apartment and the shared spaces.'), [('Dirección de arte propia', 'Own art direction'), ('Portada propia por proyecto', 'Own cover per project'), ('Narrativa con scroll', 'Scroll-driven narrative'), ('2 rondas + pulido', '2 rounds + polish')])}
<div class="pf-high js-only"><div class="pf-stage pf-3d" id="stage3d"><canvas id="scene3d" aria-label="Maqueta 3D de los proyectos"></canvas><div class="pf-3d-labels" id="labels3d"></div><div class="pf-3d-top"><div class="pf-seg" id="projects3d" role="group" aria-label="Proyectos"></div><button class="pf-chip" id="overview3d">{t('Vista de la red','Network view')}</button></div><div class="pf-3d-tools"><label>{t('Aislar piso','Isolate floor')} <output id="floor3d-out"></output><input type="range" id="floor3d" min="0" value="0"></label><label class="pf-switch small"><input type="checkbox" id="avail3d"><span>{t('Solo disponibles','Available only')}</span></label></div><div class="pf-legend" data-legend></div><div class="pf-unit pf-unit-float" id="unit3d" hidden></div><p class="pf-3d-hint">{t('Arrastra para girar · rueda o pellizco para acercar','Drag to rotate · scroll or pinch to zoom')}</p></div>
<div class="pf-stage pf-tour" id="tourStage"><canvas id="tour3d" aria-label="Visita virtual"></canvas><div class="pf-tour-hotspots" id="tourHotspots"></div><div class="pf-tour-fade" id="tourFade"></div><div class="pf-tour-caption"><small id="tour-kicker"></small><h3 id="tour-title"></h3><p id="tour-desc"></p></div><nav class="pf-tour-nav" id="tourNav" aria-label="Espacios"></nav><div class="pf-tour-mini" id="tourMini" aria-hidden="true"></div><a class="pf-tour-real" href="https://pixel.com.ec/tour360/deparNuevo/" target="_blank" rel="noopener">{t('Tour 360 publicado por Pixel ↗','Pixel’s published 360 tour ↗')}</a></div>
<p class="detail-note">{t('La visita usa renders existentes de Pixel proyectados en un visor panorámico. En producción se integran los tours 360 existentes y el modelo 3D se construye con los planos aprobados de cada proyecto.','The visit uses existing Pixel renders projected in a panoramic viewer. In production the existing 360 tours are embedded and the 3D model is built from each project’s approved plans.')}</p></div>
<div class="pf-fallback"><p>{t('Sin JavaScript, cada proyecto conserva su tabla de disponibilidad y sus enlaces a los tours 360: la maqueta y la visita son una mejora progresiva.','Without JavaScript, every project keeps its availability table and links to its 360 tours: the model and the visit are a progressive enhancement.')}</p></div></section>'''


def quote():
    head_cells = ''.join(f'<th scope="col">{t(*level)}</th>' for _, _, _, level, *_ in TIERS)
    level_rows = ''.join(f'<tr><th scope="row">{t(*label)}</th>' + ''.join(f'<td>{t(*v)}</td>' for v in vals) + '</tr>' for label, *vals in LEVELS)
    price_rows = ''
    for key, label, kind in PRICE_ROWS:
        cells = ''
        for tier, *_ in TIERS:
            if kind == 'input':
                v = PRICING[tier][key]
                cells += f'<td><label class="pf-money"><span>USD</span><input type="number" min="0" step="50" inputmode="numeric" data-price="{tier}:{key}" value="{v if v is not None else ""}" placeholder="—" aria-label="{escape(label[0])} · {tier}"></label></td>'
            else:
                cells += f'<td class="pf-calc" data-calc="{tier}:{key}">—</td>'
        price_rows += f'<tr class="pf-row-{kind}"><th scope="row">{t(*label)}</th>{cells}</tr>'
    return f'''<section class="section pf-quote pf-reveal" id="proforma"><div class="section-header"><div><div class="eyebrow">{t('PROFORMA · SECCIÓN 11 DEL BRIEF','QUOTE · SECTION 11 OF THE BRIEF')}</div>{t('Qué incluye cada nivel<br>y cuánto cuesta.','What each level includes<br>and what it costs.','h2')}</div><button class="text-link js-only" id="print-quote">{t('Imprimir o guardar PDF','Print or save as PDF')}</button></div>
<div class="pf-scroll"><table class="pf-table pf-levels"><thead><tr><th scope="col"><span class="sr-only">{t('Aspecto','Aspect')}</span></th>{head_cells}</tr></thead><tbody>{level_rows}</tbody><tbody class="pf-prices"><tr class="pf-divider"><th colspan="4">{t('Precio en USD','Price in USD')}</th></tr>{price_rows}</tbody></table></div>
<div class="pf-same"><div><b>{t('Igual en los tres niveles','The same in all three levels')}</b><p>{t('Sistema central y un solo gestor para 16 dominios · 18 requisitos técnicos · datos estructurados, sitemaps, llms.txt y feed · CRM y bot de WhatsApp · GTM, GA4, Meta y Floodlight · migración y redirecciones 301 · 2 capacitaciones · garantía de 30 días hasta el 4 de enero de 2027.','Central system and one manager for 16 domains · 18 technical requirements · structured data, sitemaps, llms.txt and feed · CRM and WhatsApp bot · GTM, GA4, Meta and Floodlight · migration and 301 redirects · 2 training sessions · 30-day warranty until 4 January 2027.')}</p></div><ol class="pf-timeline">'''+''.join(f'<li><b>{d}</b>{t(*l)}</li>' for d,l in [('12–14 oct',('Plan técnico','Technical plan')),('15–21 oct',('Wireframes','Wireframes')),('15–28 oct',('Sistema central','Central system')),('22 oct–5 nov',('Diseño visual','Visual design')),('6–24 nov',('Maquetación e integraciones','Build and integrations')),('25 nov–1 dic',('Pruebas y aceptación','Testing and acceptance')),('2 dic',('Lanzamiento de los 16 sitios','Launch of all 16 sites'))])+f'''</ol></div>
<p class="detail-note">{t('Precios en USD. El IVA se calcula al 15%. Validez de la oferta: 30 días. Dominios, hosting y licencias los contrata Alpha Builders; aquí solo se cotizan como referencia.','Prices in USD. VAT is calculated at 15%. Offer valid for 30 days. Domains, hosting and licences are contracted by Alpha Builders; they are quoted here for reference only.')}</p></section>'''


def launch():
    return f'''<div class="pf-launch" id="launch" hidden><div class="pf-launch-glow" aria-hidden="true"></div><div class="pf-launch-inner"><img src="/assets/alpha-logo-white.webp" alt="Alpha Builders" width="200" height="60"><p class="pf-launch-kicker">{t('PROFORMA · RED WEB DE 16 SITIOS','QUOTE · 16-SITE WEB NETWORK')}</p><div class="pf-launch-bar" aria-hidden="true"><i></i></div><div class="pf-launch-actions"><button class="button" id="launch-open">{t('Abrir la proforma','Open the quote')}<span aria-hidden="true">♪</span></button><small class="pf-launch-note">{t('Con sonido · puedes silenciarlo en cualquier momento','With sound · you can mute it at any time')}</small></div></div></div><button class="pf-sound js-only" id="sound-toggle" aria-pressed="true" aria-label="Sonido / Sound"><span class="pf-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>{t('Sonido','Sound')}</button>'''


def dots():
    items = [('inicio', ('Inicio', 'Start')), ('comparativa', ('Hoy vs. red nueva', 'Today vs. new network')), ('demo', ('Demo por nivel', 'Demo by level')), ('proforma', ('Proforma', 'Quote'))]
    links = ''.join(f'<li><a href="#{k}" data-dot="{k}">{t(*label)}</a></li>' for k, label in items)
    return f'<nav class="pf-dots js-only" aria-label="Secciones"><ol>{links}</ol></nav>'


def proforma():
    d = data()
    tabs = ''.join(f'<button role="tab" id="tab-{key}" aria-controls="demo-{key}" data-tab="{key}" data-style-link="{style}"><b>{n}</b>{t(*level)}<small>{t(*name)}</small></button>' for key, style, n, level, name, *_ in TIERS)
    feed = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    out = head('proforma') + launch() + dots() + f'''<main id="main" class="pf">{hero()}{versus()}<section class="pf-demo" id="demo"><div class="pf-tabs js-only" role="tablist" aria-label="Niveles">{tabs}</div><p class="pf-sample"><b>{t('DATOS DE EJEMPLO','SAMPLE DATA')}</b> {t('Unidades, precios, estados y fechas son ilustrativos. En producción salen del gestor central aprobado por Comercial y Legal.','Units, prices, statuses and dates are illustrative. In production they come from the central manager, approved by Sales and Legal.')}</p>{basic_panel(d)}{mid_panel(d)}{high_panel(d)}</section>{quote()}</main>''' + footer() + proposal() + f'<script type="application/json" id="demo-data">{feed}</script><noscript><div class="noscript">La proforma, las tablas de disponibilidad y los precios están disponibles sin JavaScript. Activa JavaScript para usar las demos interactivas.</div></noscript></body></html>'
    (ROOT / 'proforma').mkdir(exist_ok=True)
    (ROOT / 'proforma' / 'index.html').write_text(out)
    (ROOT / 'proforma' / 'proyectos-demo.json').write_text(json.dumps(d, ensure_ascii=False, indent=1))
