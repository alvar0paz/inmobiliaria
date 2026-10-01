"""Proforma page: the three design levels of the brief, each with its own interactive demo.

Units, prices and availability are illustrative sample data generated here; production reads them
from the central content manager. PRICING contains the commercial offer, separate from demo data.
"""
import json
import random
from html import escape
from build import ROOT, t, a, btn, head, footer, proposal

# Implementation amounts (core and site) include VAT. Additional and recurring services exclude VAT.
# Unit availability elsewhere on the page is sample data.
PRICING = {
    'basico': {'core': 24990, 'site': 1000, 'new_site': 1200, 'maintenance': 75, 'hosting': 200, 'hourly': 65},
    'medio': {'core': 28990, 'site': 1200, 'new_site': 1500, 'maintenance': 75, 'hosting': 200, 'hourly': 65},
    'alto': {'core': 28990, 'site': 1400, 'new_site': 1800, 'maintenance': 75, 'hosting': 200, 'hourly': 65},
}
VAT = 0.15


def quote_values(tier):
    p = PRICING[tier]
    sites = p['site'] * 15
    total = round(p['core'] + sites, 2)
    subtotal = round(total / (1 + VAT), 2)
    return {**p, 'sites': sites, 'subtotal': subtotal, 'vat': round(total - subtotal, 2),
            'total': total, 'sign': round(total * .7, 2), 'accept': round(total - round(total * .7, 2), 2),
            'maintenance_network': p['maintenance'] * 16, 'hosting_network': p['hosting'] * 16}


def quote_usd(n):
    return 'USD ' + f'{n:,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')

TYPOLOGIES = {
    'estudio': {'name': ('Estudio', 'Studio'), 'beds': 0, 'm2': (32, 38), 'scene': 'suite'},
    'suite': {'name': ('Suite', 'Suite'), 'beds': 1, 'm2': (46, 56), 'scene': 'suite'},
    'depa2': {'name': ('2 dormitorios', '2-bed apartment'), 'beds': 2, 'm2': (68, 82), 'scene': 'living'},
    'depa3': {'name': ('3 dormitorios', '3-bed apartment'), 'beds': 3, 'm2': (96, 112), 'scene': 'living'},
}

# layout: typology per position; front row first, then back row (used by the 2D plan and the 3D model)
PROJECTS = [
    {'slug': 'pixel', 'name': 'Pixel', 'domain': 'pixel.com.ec', 'sector': 'La Magdalena', 'address': 'Av. 5 de Junio y Rodrigo de Chávez',
     'floors': 12, 'front': 3, 'layout': ['suite', 'depa2', 'estudio', 'estudio', 'depa3', 'suite'], 'm2_price': 1580,
     'status': 'construccion', 'progress': 64, 'delivery': '2027-11', 'color': '#e0bd75', 'image': 'pixel-exterior-render', 'amenities': ['lobby', 'pool'],
     'whatsapp': '+593996775283'},
    {'slug': 'magnus', 'name': 'Magnus', 'domain': 'magnus.alphabuildershq.com', 'sector': 'Quito', 'address': 'Dirección según ficha oficial',
     'floors': 16, 'front': 2, 'layout': ['depa2', 'depa3', 'suite', 'depa2'], 'm2_price': 2050,
     'status': 'planos', 'progress': 12, 'delivery': '2029-03', 'color': '#b9c6d8', 'image': 'magnus-night-render', 'amenities': ['lobby', 'rooftop'],
     'whatsapp': '+59325133210'},
    {'slug': 'sparta', 'name': 'Sparta', 'domain': 'sparta.alphabuildershq.com', 'sector': 'Av. Bélgica y Shyris', 'address': 'Av. Bélgica y Shyris',
     'floors': 9, 'front': 3, 'layout': ['suite', 'estudio', 'suite', 'depa2', 'depa2'], 'm2_price': 1820,
     'status': 'acabados', 'progress': 88, 'delivery': '2027-02', 'color': '#c9a27a', 'image': 'sparta-exterior-render', 'amenities': ['lobby', 'gym'],
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
    ('basico', 'essential', '01', ('BÁSICO', 'BASIC'), ('Toda la red, lista para operar', 'The whole network, ready to run'),
     ('La base completa para operar los 16 sitios: identidad de marca, gestor central, disponibilidad y WhatsApp conectados. Una inversión enfocada en publicar, mantener la información al día y recibir consultas.',
      'The complete foundation for all 16 sites: brand identity, central content management, availability and connected WhatsApp. An investment focused on publishing, keeping information current and receiving enquiries.'),
     [('Gestor central: un dato, un solo lugar', 'Central manager: one fact, one place'), ('Bot de WhatsApp conectado al feed', 'WhatsApp bot fed by the project feed'),
      ('Precios vencidos y no comercializables, automáticos', 'Expired prices and non-sale rules, automatic')]),
    ('medio', 'editorial', '02', ('MEDIO', 'MID'), ('Diseño propio. Decisiones en 2D.', 'Custom design. Clear choices in 2D.'),
     ('Todo lo de Básico, con diseño a medida y una presentación editorial que da identidad a cada proyecto. El selector de fachada y planta permite entender la ubicación, superficie y disponibilidad de cada unidad antes de consultar.',
      'Everything in Basic, with bespoke design and an editorial presentation that gives each project its own identity. The elevation and floor-plan selector helps buyers understand each unit’s location, area and availability before enquiring.'),
     [('Todo lo del nivel básico', 'Everything in Basic'), ('Fachada y planta interactivas por proyecto', 'Interactive elevation and floor plan per project'),
      ('Transiciones y microinteracciones', 'Transitions and micro-interactions')]),
    ('alto', 'immersive', '03', ('ALTO', 'HIGH'), ('La experiencia completa, en 3D', 'The complete experience, in 3D'),
     ('Todo lo de Medio, con dirección de arte, maquetas 3D y visitas virtuales integradas. Una experiencia para explorar el edificio, elegir una unidad y recorrer sus espacios con los activos entregados, conectada al mismo gestor central.',
      'Everything in Mid, with art direction, 3D models and integrated virtual visits. An experience for exploring the building, choosing a unit and touring its spaces using supplied assets, connected to the same central content system.'),
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
    (('Experiencia de unidades', 'Unit experience'), ('Tabla de disponibilidad + bot', 'Availability table + bot'), ('Edificio en 2D: fachada y planta', 'Building in 2D: elevation and plan'), ('Todo el Medio + maqueta 3D y visitas virtuales', 'Everything in Mid + 3D model and virtual visits')),
    (('Prototipo', 'Prototype'), ('Wireframes navegables', 'Clickable wireframes'), ('Prototipo navegable', 'Clickable prototype'), ('Prototipo con animaciones', 'Animated prototype')),
    (('Rondas de diseño', 'Design rounds'), ('1', '1'), ('2', '2'), ('2 + pulido', '2 + polish')),
    (('Entregable de diseño', 'Design deliverable'), ('Guía de estilo básica', 'Basic style guide'), ('Sistema de diseño en Figma', 'Figma design system'), ('Sistema de diseño + guía de movimiento', 'Design system + motion guide')),
]

PRICE_ROWS = [
    ('core', ('Sistema central, sitio de marca y plantilla de proyecto', 'Central system, brand site and project template'), 'input'),
    ('site', ('Precio por sitio de proyecto', 'Price per project site'), 'input'),
    ('sites', ('15 sitios de proyecto, incluida la migración de pixel.com.ec', '15 project sites, including the pixel.com.ec migration'), 'calc'),
    ('total', ('Inversión total · IVA incluido', 'Total investment · VAT included'), 'total'),
    ('subtotal', ('Base sin IVA, incluida en el total', 'Net amount included in the total'), 'calc'),
    ('vat', ('IVA 15%, incluido en el total', 'VAT 15%, included in the total'), 'calc'),
    ('sign', ('Pago a la firma (70%) · jue 8 oct 2026', 'Payment on signing (70%) · Thu 8 Oct 2026'), 'calc'),
    ('accept', ('Pago a la aceptación final (30%) · mar 8 dic 2026', 'Payment on final acceptance (30%) · Tue 8 Dec 2026'), 'calc'),
    ('new_site', ('Sitio nuevo después del lanzamiento · sin IVA', 'New site after launch · excluding VAT'), 'input'),
    ('maintenance', ('Mantenimiento mensual opcional, por sitio', 'Optional monthly maintenance, per site'), 'input'),
    ('maintenance_network', ('Mantenimiento mensual opcional, red de 16 sitios', 'Optional monthly maintenance, all 16 sites'), 'calc'),
    ('hosting', ('Costo anual de referencia por dominio: hosting, licencias y servicios', 'Reference annual cost per domain: hosting, licences and services'), 'input'),
    ('hosting_network', ('Costo anual de referencia para los 16 dominios', 'Reference annual cost for all 16 domains'), 'calc'),
    ('hourly', ('Tarifa por hora fuera de alcance', 'Hourly rate for out-of-scope work'), 'input'),
]


def check(v):
    if v == 'y':
        return '<span class="pf-yes" aria-label="Sí">✓</span>'
    return t(*v) if isinstance(v, tuple) else escape(v)


def comparison_cell(label, content, cls=''):
    # One value stays shared by the desktop table, mobile layout and quote calculator.
    return f'<td role="cell" class="{cls}"><span class="pf-mobile-label" aria-hidden="true">{t(*label)}</span><div class="pf-cell-value">{content}</div></td>'


def hero():
    cards = ''
    for key, style, n, level, name, desc, points in TIERS:
        items = ''.join(f'<li>{t(*pt)}</li>' for pt in points)
        cards += (f'<article class="pf-tier pf-reveal" data-tier-card="{key}"><button type="button" class="pf-tier-select js-only" data-select-tier="{key}" aria-pressed="false" aria-controls="demo-{key}"><span class="sr-only">{t("Seleccionar nivel", "Select tier")} {t(*level)}</span></button><div class="pf-tier-top"><span>{n}</span>{t(*level, "small")}</div>{t(*name, "h3")}{t(*desc, "p")}'
                  f'<ul>{items}</ul><div class="pf-tier-foot"><span class="pf-tier-total" data-total="{key}">{t("Total con IVA", "Total incl. VAT")}<b>{quote_usd(quote_values(key)["total"])}</b></span>'
                  f'<a class="button" href="/?style={style}" data-preview-style="{style}">{t("Ver experiencia del cliente", "Preview customer experience")}</a><a class="text-link" href="#demo-{key}" data-tier="{key}">{t("Ver herramientas del nivel", "View tier tools")}</a></div></article>')
    return f'''<section class="pf-hero" id="inicio"><div class="pf-hero-copy"><div class="eyebrow">{t('PROFORMA DEMO · RED WEB ALPHA BUILDERS','QUOTE DEMO · ALPHA BUILDERS WEB NETWORK')}</div>{t('Tres niveles.<br>Una misma <em>red.</em>','Three levels.<br>One <em>network.</em>','h1')}<p class="pf-lead">{t('Una inversión para toda la red, con IVA incluido. Los tres niveles cubren los 18 requisitos del brief: Básico organiza la operación; Medio añade diseño a medida y selección en 2D; Alto completa la experiencia con 3D y visitas virtuales. Lanzamiento objetivo: 2 de diciembre de 2026, sujeto a las condiciones de la proforma.','One investment for the entire network, with VAT included. All three tiers cover the 18 brief requirements: Basic brings operations together; Mid adds bespoke design and 2D selection; High completes the experience with 3D and virtual visits. Target launch: 2 December 2026, subject to the quote terms.')}</p><div class="action-row">{a('Probar la demo 3D','Try the 3D demo','?demo=3d#demo-3d','button demo-primary','data-demo3d')}</div><dl class="pf-facts"><div><dt>{t('Sitios','Sites')}</dt><dd>16</dd></div><div><dt>{t('Lanzamiento','Launch')}</dt><dd>{t('2 dic 2026','2 Dec 2026')}</dd></div><div><dt>{t('Pago','Payment')}</dt><dd>70 / 30</dd></div></dl></div><div class="pf-tiers">{cards}</div></section>'''


def versus():
    rows = ''.join(f'<tr role="row"><th scope="row" role="rowheader">{t(*label)}</th>' + comparison_cell(('Sitio actual', 'Current site'), t(*now), 'pf-now') + ''.join(comparison_cell(tier[3], check(value)) for tier, value in zip(TIERS, (b, m, h))) + '</tr>' for label, now, b, m, h in VERSUS)
    return f'''<section class="section pf-versus pf-reveal" id="comparativa"><div class="section-header"><div><div class="eyebrow">{t('DE DÓNDE PARTIMOS','WHERE WE START')}</div>{t('El sitio actual frente a la red nueva.','The current website versus the new network.','h2')}</div><a class="text-link" href="https://alphabuildershq.com/" target="_blank" rel="noopener">{t('Ver alphabuildershq.com','View alphabuildershq.com')}</a></div><div class="pf-scroll"><table role="table" class="pf-table pf-compare"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader"><span class="sr-only">{t('Aspecto','Aspect')}</span></th><th scope="col" role="columnheader">{t('Sitio actual','Current site')}</th><th scope="col" role="columnheader">{t('Básico','Basic')}</th><th scope="col" role="columnheader">{t('Medio','Mid')}</th><th scope="col" role="columnheader">{t('Alto','High')}</th></tr></thead><tbody role="rowgroup">{rows}</tbody></table></div><p class="detail-note">{t('Sitio actual revisado el 30 de septiembre de 2026: la portada muestra nombres de proyectos sin precios, estado ni disponibilidad, y no se ve un enlace de WhatsApp.','Current website reviewed on 30 September 2026: the homepage lists project names without prices, status or availability, and no WhatsApp link is visible.')}</p></section>'''


def panel_head(key, n, level, title, copy, chips):
    chips_html = ''.join(f'<li>{t(*c)}</li>' for c in chips)
    return f'<header class="pf-panel-head pf-reveal"><div><span class="pf-level">{n} · {t(*level)}</span>{t(*title, "h2")}</div><div>{t(*copy, "p")}<ul class="pf-chips">{chips_html}</ul></div></header>'


def basic_panel(d):
    options = ''.join(f'<option value="{p["slug"]}">{p["name"]}</option>' for p in d['projects'])
    statuses = ''.join(f'<option value="{k}" data-es="{v[0]}" data-en="{v[1]}">{v[0]}</option>' for k, v in STATUS.items())
    return f'''<section class="pf-panel" id="demo-basico" data-panel="basico" role="tabpanel" aria-labelledby="tab-basico">{panel_head('basico', '01', ('INCLUIDO EN LOS TRES NIVELES', 'INCLUDED IN ALL THREE TIERS'), ('Una misma base,<br>siempre conectada.', 'One shared foundation,<br>always connected.'), ('Cambia un dato en el gestor central y mira cómo llega, en el mismo instante, a la tarjeta del sitio de marca, a la ficha del proyecto, a la tabla de estado, al feed y al bot de WhatsApp. Así se comprueba el requisito 2 del brief.', 'Change a value in the central manager and watch it reach the brand-site card, the project page, the status table, the feed and the WhatsApp bot at the same moment. This is how requirement 2 of the brief is verified.'), [('Gestor central', 'Central manager'), ('Feed JSON', 'JSON feed'), ('Bot de WhatsApp', 'WhatsApp bot'), ('Reglas de publicación', 'Publishing rules')])}
<div class="pf-basic js-only"><form class="pf-stage pf-cms" id="cms" autocomplete="off"><div class="pf-stage-bar"><b>{t('GESTOR CENTRAL','CENTRAL MANAGER')}</b><span>{t('Rol: Comercial','Role: Sales')}</span></div>
<label>{t('Proyecto','Project')}<select name="project">{options}</select></label>
<label>{t('Precio por m² (USD)','Price per m² (USD)')}<input name="m2_price" disabled type="number" min="500" max="6000" step="10" inputmode="numeric"></label>
<label>{t('Estado','Status')}<select name="status">{statuses}</select></label>
<label>{t('Avance de obra','Construction progress')} <output name="progress_out"></output><input name="progress" type="range" min="0" max="100"></label>
<fieldset><legend>{t('Vigencia de precios','Price validity')}</legend><label class="pf-radio"><input type="radio" name="age" value="5" checked>{t('Actualizados hace 5 días','Updated 5 days ago')}</label><label class="pf-radio"><input type="radio" name="age" value="75">{t('Actualizados hace 75 días','Updated 75 days ago')}</label></fieldset>
<label class="pf-switch"><input type="checkbox" name="sellable" checked><span>{t('Comercializable','For sale')}</span><small>{t('Solo lo edita el rol Legal','Legal role only')}</small></label>
<p class="pf-cms-note" id="cms-note" aria-live="polite"></p></form>
<div class="pf-outputs"><article class="pf-out" data-out="card"><small>alphabuildershq.com/proyectos/</small><div id="out-card"></div></article><article class="pf-out" data-out="page"><small id="out-page-domain"></small><div id="out-page"></div></article><article class="pf-out" data-out="status"><small>alphabuildershq.com/estado-de-proyectos/</small><div id="out-status"></div></article><article class="pf-out pf-out-code" id="api-json" data-out="feed"><small>API / JSON · /proyectos.json</small><pre id="out-feed"></pre></article></div>
<div class="pf-phone" aria-label="WhatsApp"><div class="pf-phone-screen"><div class="pf-wa-head"><span class="pf-wa-avatar" id="wa-avatar">P</span><div><b id="wa-name">Pixel</b><small>{t('Asistente · responde con el feed oficial','Assistant · answers from the official feed')}</small></div></div><div class="pf-wa-body" id="wa-body" aria-live="polite"></div><div class="pf-wa-quick" id="wa-quick"></div><form class="pf-wa-input" id="wa-form"><label class="sr-only" for="wa-text">{t('Mensaje','Message')}</label><input id="wa-text" placeholder="Escribe un mensaje" data-ph-es="Escribe un mensaje" data-ph-en="Type a message" autocomplete="off"><button aria-label="Enviar">➤</button></form></div></div></div>
<div class="pf-log js-only"><b>{t('Eventos y reglas automáticas','Events and automatic rules')}</b><ol id="event-log"></ol></div>
<div class="pf-fallback">{availability_table(d['projects'][0])}<p class="detail-note">{t('En el nivel básico la disponibilidad se publica como tabla, generada desde el gestor y legible sin JavaScript.','At the basic level availability is published as a table, generated from the manager and readable without JavaScript.')}</p></div></section>'''


def mid_panel(d):
    tables = ''.join(availability_table(p) for p in d['projects'])
    return f'''<section class="pf-panel" id="demo-medio" data-panel="medio" role="tabpanel" aria-labelledby="tab-medio">{panel_head('medio', '02', ('MEDIO', 'MID'), ('Cada edificio,<br>piso por piso.', 'Every building,<br>floor by floor.'), ('Elige un edificio de la red, recorre su fachada y abre la planta de cualquier piso. Cada unidad muestra su tipología, su superficie, su precio y si está disponible, con los mismos datos del gestor.', 'Pick a building from the network, move along its elevation and open the plan of any floor. Every unit shows its type, area, price and availability, from the same manager data.'), [('Diseño a medida en Figma', 'Bespoke Figma design'), ('Tema con tipografía e imagen', 'Theme with type and image'), ('Microinteracciones', 'Micro-interactions'), ('2 rondas de diseño', '2 design rounds')])}
<div class="pf-mid js-only"><div class="pf-skyline" id="skyline" role="group" aria-label="Edificios"></div><div class="pf-filters" id="filters2d" role="group" aria-label="Filtros"></div><div class="pf-2d"><div class="pf-stage pf-elev"><div class="pf-stage-bar"><b id="elev-title"></b><span>{t('Fachada · toca un piso','Elevation · tap a floor')}</span></div><svg id="elev" role="img" aria-label="Fachada"></svg></div><div class="pf-2d-side"><div class="pf-stage pf-plan"><div class="pf-stage-bar"><b id="plan-title"></b><span>{t('Planta · toca una unidad','Plan · tap a unit')}</span></div><svg id="plan" role="img" aria-label="Planta"></svg></div><div class="pf-unit" id="unit2d" aria-live="polite"></div></div></div><div class="pf-legend" data-legend></div></div>
<div class="pf-fallback pf-fallback-grid">{tables}</div></section>'''


def high_panel(d):
    from spatial import arrival, toolbar, overlay
    note = ('La visita usa renders conceptuales generados con IA inspirados en Pixel en un visor panorámico. La maqueta y el inventario son ilustrativos.', 'The visit uses AI-generated conceptual renders inspired by Pixel in a panoramic viewer. The model and inventory are illustrative.') if len(d['projects']) == 1 else ('La visita usa renders conceptuales generados con IA inspirados en Pixel en un visor panorámico. Los interiores de los otros proyectos se muestran con esas mismas imágenes de referencia. La maqueta y los datos son ilustrativos.', 'The visit uses AI-generated conceptual renders inspired by Pixel in a panoramic viewer. Other projects use those same reference interiors. The model and data are illustrative.')
    return f'''<section class="pf-panel" id="demo-alto" data-panel="alto" role="tabpanel" aria-labelledby="tab-alto">{panel_head('alto', '03', ('ALTO', 'HIGH'), ('Recorre el proyecto<br>antes de que exista.', 'Walk through the project<br>before it exists.'), ('Una maqueta 3D con los proyectos de la red. Gira, acércate, aísla un piso y elige un departamento disponible. Desde ahí entras a la visita virtual del departamento y de las áreas comunes.', 'A 3D model of the projects in the network. Rotate, zoom in, isolate a floor and pick an available apartment. From there you step into the virtual visit of the apartment and the shared spaces.'), [('Dirección de arte propia', 'Own art direction'), ('Portada propia por proyecto', 'Own cover per project'), ('Narrativa con scroll', 'Scroll-driven narrative'), ('2 rondas + pulido', '2 rounds + polish')])}
<div class="pf-high js-only" data-spatial-mode="model">
<details class="arrival-optional"><summary>{t('Ver la secuencia de llegada','View the arrival sequence')}</summary>{arrival()}</details>{toolbar()}
<div class="pf-viewer-toolbar"><div class="pf-seg" id="projects3d" role="group" aria-label="Proyectos"></div><button class="pf-chip" id="overview3d">{t('Vista de la red','Network view')}</button></div>
<div class="pf-model-layout">
<div class="pf-stage pf-3d" id="stage3d" data-mode="model">{overlay()}<canvas id="scene3d" tabindex="0" aria-label="Maqueta 3D de los proyectos" aria-describedby="model-help"></canvas><div class="pf-3d-labels" id="labels3d"></div><div class="pf-camera-tools" role="group" aria-label="Cámara 3D"><button class="pf-chip" data-model-action="left" aria-label="Girar a la izquierda / Rotate left">↶</button><button class="pf-chip" data-model-action="right" aria-label="Girar a la derecha / Rotate right">↷</button><button class="pf-chip" data-model-action="out" aria-label="Alejar / Zoom out">−</button><button class="pf-chip" data-model-action="in" aria-label="Acercar / Zoom in">+</button><button class="pf-chip" data-model-action="reset">{t('Centrar vista','Reset view')}</button></div></div>
<aside class="pf-model-sidebar" aria-label="Selección de unidades"><div class="pf-3d-tools"><div class="pf-floor-filter" id="floor3d-filter" hidden><label for="floor3d">{t('Piso','Floor')} <output id="floor3d-out" for="floor3d"></output></label><div class="pf-floor-controls"><button class="pf-chip" id="floor3d-prev" aria-label="Piso anterior / Previous floor">−</button><input type="range" id="floor3d" min="1" value="1" step="1" disabled><button class="pf-chip" id="floor3d-next" aria-label="Piso siguiente / Next floor">+</button></div></div><label class="pf-switch"><input type="checkbox" id="avail3d"><span>{t('Solo disponibles','Available only')}</span></label><label for="unit3d-select">{t('Seleccionar unidad','Select a unit')}</label><select id="unit3d-select" disabled></select><p id="selection3d-status" role="status"></p></div><div class="pf-legend" data-legend></div><div class="pf-unit" id="unit3d" hidden></div></aside>
</div><p class="pf-viewer-help" id="model-help">{t('Arrastra para girar; pellizca o usa + y − para acercar. Con el visor seleccionado: rueda para zoom, flechas para girar, Inicio para centrar y Esc para salir.','Drag to rotate; pinch or use + and − to zoom. With the viewer selected: scroll to zoom, arrow keys to rotate, Home to reset and Esc to release.')}</p>
<div class="pf-tour-shell"><div class="pf-viewer-toolbar"><h3>{t('Visita virtual','Virtual visit')}</h3><div class="pf-tour-actions" role="group" aria-label="Cámara de la visita"><button class="pf-chip" data-tour-action="out" aria-label="Alejar visita / Zoom out of tour">−</button><button class="pf-chip" data-tour-action="in" aria-label="Acercar visita / Zoom into tour">+</button><button class="pf-chip" data-tour-action="reset">{t('Centrar visita','Reset tour')}</button></div></div><nav class="pf-tour-nav" id="tourNav" aria-label="Espacios"></nav>
<div class="pf-stage pf-tour" id="tourStage"><canvas id="tour3d" tabindex="0" aria-label="Visita virtual" aria-describedby="tour-help"></canvas><div class="pf-tour-hotspots" id="tourHotspots"></div><div class="pf-tour-fade" id="tourFade"></div><p class="pf-viewer-status" id="tour-status" role="status" hidden></p><button class="pf-chip pf-tour-retry" id="tour-retry" hidden>{t('Reintentar imagen','Retry image')}</button></div>
<div class="pf-tour-info"><div class="pf-tour-caption"><small id="tour-kicker"></small><h3 id="tour-title"></h3><p id="tour-desc"></p></div><a class="text-link" href="https://pixel.com.ec/tour360/deparNuevo/" target="_blank" rel="noopener">{t('Abrir el tour 360 de Pixel','Open the Pixel 360 tour')}</a></div>
<p class="pf-viewer-help" id="tour-help">{t('Arrastra para mirar. Pellizca o usa + y − para acercar. Puedes cambiar de espacio con los botones superiores.','Drag to look around. Pinch or use + and − to zoom. Switch spaces using the buttons above.')}</p></div>
<p class="detail-note">{t(*note)}</p></div>
<div class="pf-fallback"><p>{t('Sin JavaScript, cada proyecto conserva su tabla de disponibilidad y sus enlaces a los tours 360: la maqueta y la visita son una mejora progresiva.','Without JavaScript, every project keeps its availability table and links to its 360 tours: the model and the visit are a progressive enhancement.')}</p></div></section>'''


def quote():
    head_cells = ''.join(f'<th scope="col">{t(*level)}<small>{t(*name)}</small></th>' for _, _, _, level, name, *_ in TIERS)
    level_rows = ''.join(f'<tr role="row"><th scope="row" role="rowheader">{t(*label)}</th>' + ''.join(comparison_cell(tier[3], t(*value)) for tier, value in zip(TIERS, vals)) + '</tr>' for label, *vals in LEVELS)
    price_rows = ''
    for key, label, kind in PRICE_ROWS:
        if key == 'new_site':
            price_rows += f'<tr class="pf-divider" role="row"><th colspan="4" role="rowheader">{t("Servicios adicionales y recurrentes · USD sin IVA", "Additional and recurring services · USD excluding VAT")}</th></tr>'
        cells = ''
        for tier, _, _, level, *_ in TIERS:
            if kind == 'input':
                v = PRICING[tier][key]
                value = f'<label class="pf-money"><span>USD</span><input type="number" min="0" step="0.01" inputmode="decimal" disabled data-price="{tier}:{key}" value="{v}" aria-label="{escape(label[0])} · {tier}"></label><span class="pf-print-value" data-print="{tier}:{key}">{quote_usd(v)}</span>'
                cells += comparison_cell(level, value)
            else:
                cells += comparison_cell(level, f'<span data-calc="{tier}:{key}">{quote_usd(quote_values(tier)[key])}</span>', 'pf-calc')
        price_rows += f'<tr class="pf-row-{kind}" role="row"><th scope="row" role="rowheader">{t(*label)}</th>{cells}</tr>'
    contacts = '''<div class="pf-contacts"><address><strong>Alvaro Paz</strong><span>RUC 1717417982001</span><a href="tel:+593986674760">+593 98 667 4760</a><a href="mailto:alvaroipazr@gmail.com">alvaroipazr@gmail.com</a></address><address><strong>Martín Vélez Falconí</strong><span>RUC 1724556681001</span><a href="tel:+593983466900">+593 98 346 6900</a><a href="mailto:martinvelezf@hotmail.com">martinvelezf@hotmail.com</a></address></div>'''
    terms = [
        (('La misma base para los 16 sitios', 'The same foundation for all 16 sites'), [
            ('Sitio de marca, gestor central y 15 sitios de proyecto, incluida la migración de Pixel. Ocho plantillas de marca y cinco de proyecto, temas responsive, carga del contenido del brief e importación CSV o XLSX. Todos los niveles incluyen los 18 requisitos técnicos y los 13 criterios de aceptación.',
             'Brand site, central manager and 15 project sites, including the Pixel migration. Eight brand templates and five project templates, responsive themes, brief content loading and CSV or XLSX import. Every tier includes the 18 technical requirements and 13 acceptance criteria.'),
            ('Roles Comercial y Legal, reglas de precios vencidos y comercialización, HTML legible sin JavaScript, SEO y GEO, datos estructurados, sitemaps, robots.txt, llms.txt, feed e IndexNow. Integración con un CRM y el bot existente Zolutium, medición entre dominios, migración 301, seguridad, respaldos, documentación y dos capacitaciones de dos horas.',
             'Sales and Legal roles, price-expiry and sales rules, readable HTML without JavaScript, SEO and GEO, structured data, sitemaps, robots.txt, llms.txt, a feed and IndexNow. Integration with one CRM and the existing Zolutium bot, cross-domain tracking, 301 migration, security, backups, documentation and two two-hour training sessions.')]),
        (('Del 2D al 3D', 'From 2D to 3D'), [
            ('Medio incluye el selector de fachada y planta: edificio, piso, filtros y ficha de unidad. Alto incluye todo lo anterior, una maqueta 3D esquemática por proyecto, giro, zoom, aislamiento de pisos y consulta de unidades, más la integración de visitas virtuales de departamentos y áreas comunes. Estas experiencias están incluidas en el precio de su nivel.',
             'Mid includes the elevation and floor-plan selector: building, floor, filters and unit details. High includes everything in Mid, one schematic 3D model per project, rotation, zoom, floor isolation and unit selection, plus integration of virtual visits to apartments and shared spaces. These experiences are included in their tier price.'),
            ('Alpha Builders entrega planos aprobados, inventario de unidades y tours o renders con permiso de uso. Incluimos gráficos 2D y geometría 3D simplificada; no modelado fotorrealista, BIM, nuevos renders ni filmación 360. Se reutilizan visitas por tipología y se conservan los tours existentes de Pixel. La disponibilidad refleja la última publicación del gestor; no incluye reservas ni pagos.',
             'Alpha Builders supplies approved plans, unit inventory and tours or renders with usage rights. We include 2D graphics and simplified 3D geometry; photorealistic modelling, BIM, new renders and 360 filming are excluded. Visits are reused by unit type and existing Pixel tours are preserved. Availability reflects the latest manager publication; reservations and payments are excluded.')]),
        (('Calendario y forma de pago', 'Schedule and payment'), [
            ('70% a la firma el 8 de octubre y 30% a la aceptación final el 8 de diciembre de 2026. Lanzamiento conjunto objetivo el 2 de diciembre, con el 3 como única fecha de reserva. Se validan los 16 sitios, los leads, la medición y la consistencia de los visores; se incluyen 72 horas de monitoreo tras publicar.',
             '70% on signing on 8 October and 30% at final acceptance on 8 December 2026. Target joint launch on 2 December, with 3 December as the only reserve date. All 16 sites, leads, tracking and viewer consistency are validated; 72 hours of monitoring follow publication.'),
            ('Las fechas requieren confirmar el equipo, la entrega de datos y activos al inicio, y aprobaciones en 24 horas hábiles. La oferta definitiva identificará al diseñador UX/UI, cinco desarrolladores, QA y responsable del proyecto solicitados en el brief. Se realizan reuniones de avance los lunes y jueves.',
             'Dates require confirmed staffing, delivery of data and assets at kickoff, and approvals within 24 working hours. The final offer will identify the UX/UI designer, five developers, QA and project lead required by the brief. Progress meetings take place on Mondays and Thursdays.')]),
        (('Garantía y mantenimiento', 'Warranty and maintenance'), [
            ('Garantía sin costo por errores de funcionamiento, visualización e integración, con cobertura prevista hasta el 4 de enero de 2027 y guardia en feriados. Respuesta / solución: crítica 2 h / 24 h; alta 1 / 2 días hábiles; normal 2 / 5 días hábiles. La cobertura se asigna al confirmar el equipo.',
             'No-cost warranty for functional, display and integration defects, with planned coverage through 4 January 2027 and holiday support. Response / resolution: critical 2 h / 24 h; high 1 / 2 business days; normal 2 / 5 business days. Coverage is assigned when staffing is confirmed.'),
            ('Mantenimiento opcional: una hora por sitio al mes, 16 horas agrupables para la red y no acumulables. Incluye actualizaciones, revisión de respaldos y alertas, ajustes menores e informe mensual. No incluye nuevas funciones ni guardia 24/7 después de la garantía. Horas extra solo con autorización.',
             'Optional maintenance: one hour per site per month, 16 pooled hours across the network with no rollover. Includes updates, backup and alert reviews, minor changes and a monthly report. New features and 24/7 support after warranty are excluded. Extra hours require approval.')]),
        (('Servicios y proyectos adicionales', 'Services and additional projects'), [
            ('Referencia anual por dominio: USD 120 hosting, CDN y SSL; USD 60 monitoreo, correo y respaldos; USD 20 dominio; USD 0 licencias obligatorias previstas. Total USD 200 por dominio o USD 3.200 para la red, sin IVA. Son estimaciones según uso y proveedor; Alpha Builders contrata y paga directamente.',
             'Annual reference per domain: USD 120 hosting, CDN and SSL; USD 60 monitoring, email and backups; USD 20 domain; USD 0 planned mandatory licences. Total USD 200 per domain or USD 3,200 for the network, excluding VAT. Estimates depend on usage and provider; Alpha Builders contracts and pays directly.'),
            ('Sitios nuevos en hasta cinco días hábiles desde recibir datos, logo, dominio y activos completos. El precio unitario incluye las plantillas y el tema del nivel contratado. Para 2D y 3D incluye configurar el visor con activos listos para web; producir nueva geometría se cotiza aparte.',
             'New sites within five business days of receiving complete data, logo, domain and assets. The unit price includes the templates and theme of the selected tier. For 2D and 3D it includes configuring the viewer with web-ready assets; producing new geometry is quoted separately.')]),
        (('Condiciones de la oferta', 'Offer terms'), [
            ('Vigencia de 30 días, hasta el 30 de octubre de 2026. Producción en español de Ecuador. Alpha Builders aporta contenido, estrategia SEO/GEO, mapa de redirecciones, plan de medición, accesos y textos legales. El código, diseños y cuentas de producción quedan a su nombre. Cambios de alcance se aprueban por escrito.',
             'Valid for 30 days, through 30 October 2026. Production in Ecuadorian Spanish. Alpha Builders supplies content, SEO/GEO strategy, redirects, measurement plan, access and legal text. Production code, designs and accounts belong to Alpha Builders. Scope changes require written approval.'),
            ('Se excluyen redacción, traducción, fotografía, nuevos tours, comparadores, área privada y desarrollo de un CRM o bot propio. La demo usa datos ilustrativos y respuestas de WhatsApp simuladas. La emisión definitiva requiere razón social y RUC del cliente, emisor de facturación y equipo confirmados. Esta proforma no es una factura.',
             'Copywriting, translation, photography, new tours, comparison tools, private areas and development of a new CRM or bot are excluded. The demo uses sample data and simulated WhatsApp replies. Final issuance requires the client’s legal name and tax ID, billing issuer and confirmed team. This quote is not an invoice.')]),
    ]
    conditions = ''.join(f'<article><h3>{t(*title)}</h3>' + ''.join(f'<p>{t(*paragraph)}</p>' for paragraph in paragraphs) + '</article>' for title, paragraphs in terms)
    timeline = ''.join(f'<li><b>{d}</b>{t(*label)}</li>' for d, label in [('12–14 oct', ('Plan técnico', 'Technical plan')), ('15–28 oct', ('Wireframes y gestor', 'Wireframes and manager')), ('22 oct–5 nov', ('Diseño y piloto 2D/3D', 'Design and 2D/3D pilot')), ('6–24 nov', ('Sitios e integraciones', 'Sites and integrations')), ('25 nov–1 dic', ('Pruebas y aceptación', 'Testing and acceptance')), ('2 dic', ('Lanzamiento conjunto', 'Joint launch')), ('8 dic', ('Aceptación final', 'Final acceptance'))])
    return f'''<section class="section pf-quote pf-reveal" id="proforma" data-vat="{VAT}"><div class="section-header"><div><div class="eyebrow">PF-AB-2026-001 · {t('REVISIÓN 3 · 1 OCTUBRE 2026','REVISION 3 · 1 OCTOBER 2026')}</div>{t('Proforma del<br>ecosistema web.','Web ecosystem<br>quotation.','h2')}</div><button class="text-link js-only" id="print-quote">{t('Imprimir o guardar PDF','Print or save as PDF')}</button></div>
<p class="pf-quote-intro">{t('Para Alpha Builders, atención de Juan José Vargas Flores. Un sitio de marca y 15 sitios de proyecto. Elige un nivel: Básico, Medio con 2D o Alto con 2D, 3D y visitas virtuales.','For Alpha Builders, attention Juan José Vargas Flores. One brand site and 15 project sites. Choose a tier: Basic, Mid with 2D or High with 2D, 3D and virtual visits.')}</p>
{contacts}<div class="pf-scroll"><table role="table" class="pf-table pf-levels"><caption class="sr-only">{t('Alcance y precio de los tres niveles','Scope and price of the three tiers')}</caption><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">{t('Alcance e inversión','Scope and investment')}</th>{head_cells}</tr></thead><tbody role="rowgroup">{level_rows}</tbody><tbody class="pf-prices" role="rowgroup"><tr class="pf-divider" role="row"><th colspan="4" role="rowheader">{t('Implementación · USD con IVA incluido · se contrata un solo nivel','Implementation · USD including VAT · choose one tier')}</th></tr>{price_rows}</tbody></table></div>
<p class="detail-note">{t('Los importes de implementación incluyen IVA; el desglose de base e impuesto es informativo y no se suma de nuevo. El precio por sitio ya está incluido en el lote de 15. Cada total cubre las experiencias de su nivel. Los adicionales y recurrentes se contratan por separado y no se suman a ese total.','Implementation amounts include VAT; the net and tax breakdown is informational and is not added again. The per-site price is already included in the batch of 15. Each total covers the experiences of its tier. Additional and recurring services are contracted separately and are not included in that total.')}</p>
<div class="pf-same"><div><b>{t('Calendario de referencia 2026','Reference schedule 2026')}</b><p>{t('Sujeto a confirmar equipo y activos al inicio. Las condiciones de entrega se detallan a continuación.','Subject to confirmed staffing and assets at kickoff. Delivery terms are detailed below.')}</p></div><ol class="pf-timeline">{timeline}</ol></div>
<div class="pf-terms">{conditions}</div>
<p class="detail-note">{t('IVA calculado al 15% como supuesto para un servicio local gravado. Se confirmará el tratamiento tributario y la tarifa aplicable al facturar.','VAT calculated at 15% on the assumption of a taxable local service. Tax treatment and the applicable rate will be confirmed at invoicing.')} <a class="text-link" href="https://esacc.corteconstitucional.gob.ec/storage/api/v1/10_DWL_FL/eyJjYXJwZXRhIjoicm8iLCJ1dWlkIjoiOWRkNGJkM2YtOTlhMC00MzAxLWJiY2QtMmRlNTJmZDc0YTJlLnBkZiJ9" target="_blank" rel="noopener">{t('Referencia SRI','SRI reference')}</a></p></section>'''


def launch():
    return f'''<div class="pf-launch" id="launch" hidden><div class="pf-launch-glow" aria-hidden="true"></div><div class="pf-launch-inner"><img src="/assets/alpha-logo-white.webp" alt="Alpha Builders" width="200" height="60"><p class="pf-launch-kicker">{t('PROFORMA · RED WEB DE 16 SITIOS','QUOTE · 16-SITE WEB NETWORK')}</p><div class="pf-launch-bar" aria-hidden="true"><i></i></div><div class="pf-launch-actions"><button class="button" id="launch-open">{t('Abrir la proforma','Open the quote')}<span aria-hidden="true">♪</span></button><small class="pf-launch-note">{t('Sonido opcional, apagado al inicio','Optional sound, off by default')}</small></div></div></div><button class="pf-sound js-only" id="sound-toggle" aria-pressed="false" aria-label="Sonido / Sound"><span class="pf-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>{t('Sonido','Sound')}</button>'''


def dots():
    items = [('inicio', ('Inicio', 'Start')), ('comparativa', ('Hoy vs. red nueva', 'Today vs. new network')), ('demo', ('Demo por nivel', 'Demo by level')), ('proforma', ('Proforma', 'Quote'))]
    links = ''.join(f'<li><a href="#{k}" data-dot="{k}">{t(*label)}</a></li>' for k, label in items)
    return f'<nav class="pf-dots js-only" aria-label="Secciones"><ol>{links}</ol></nav>'


def proforma():
    d = data()
    tabs = ''.join(f'<button role="tab" id="tab-{key}" aria-controls="{"demo-basico" if key == "basico" else "demo-basico demo-medio" if key == "medio" else "demo-basico demo-medio demo-alto"}" data-tab="{key}" data-style-link="{style}"><b>{n}</b>{t(*level)}<small>{t(*name)}</small></button>' for key, style, n, level, name, *_ in TIERS)
    feed = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    out = head('proforma') + f'''<main id="main" class="pf">{hero()}{versus()}<section class="pf-demo" id="demo"><div class="pf-tabs js-only" role="tablist" aria-label="Niveles">{tabs}</div><p class="pf-sample"><b>{t('DATOS DE EJEMPLO','SAMPLE DATA')}</b> {t('Unidades, precios, estados y fechas son ilustrativos. En producción salen del gestor central aprobado por Comercial y Legal.','Units, prices, statuses and dates are illustrative. In production they come from the central manager, approved by Sales and Legal.')}</p>{basic_panel(d)}{mid_panel(d)}{high_panel(d)}</section>{quote()}</main>''' + footer(True) + f'<script type="application/json" id="demo-data">{feed}</script><noscript><div class="noscript">La proforma, las tablas de disponibilidad y los precios están disponibles sin JavaScript. Activa JavaScript para usar las demos interactivas.</div></noscript></body></html>'
    (ROOT / 'proforma').mkdir(exist_ok=True)
    (ROOT / 'proforma' / 'index.html').write_text(out)
    (ROOT / 'proforma' / 'proyectos-demo.json').write_text(json.dumps(d, ensure_ascii=False, indent=1))
