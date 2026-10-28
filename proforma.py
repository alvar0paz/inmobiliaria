"""Proforma page: the three design levels of the brief, each with its own interactive demo.

Units, prices and availability are illustrative sample data generated here; production reads them
from the central content manager.
"""
import json
import random
from html import escape
from build import ROOT, t, a, btn, head, footer, proposal

TYPOLOGIES = {
    'estudio': {'name': ('Estudio', 'Studio'), 'beds': 0, 'm2': (32, 38), 'scene': 'suite'},
    'suite': {'name': ('Suite', 'Suite'), 'beds': 1, 'm2': (46, 56), 'scene': 'suite'},
    'depa2': {'name': ('2 dormitorios', '2-bed apartment'), 'beds': 2, 'm2': (68, 82), 'scene': 'living'},
    'depa3': {'name': ('3 dormitorios', '3-bed apartment'), 'beds': 3, 'm2': (96, 112), 'scene': 'living'},
}

# layout: typology per position; front row first, then back row (used by the 2D plan and the 3D model)
PROJECTS = [
    {'slug': 'pixel', 'name': 'Residencia 01', 'domain': 'residencia01.example', 'sector': 'Sector de ejemplo', 'address': 'Avenida Central y Calle del Parque',
     'floors': 12, 'front': 3, 'layout': ['suite', 'depa2', 'estudio', 'estudio', 'depa3', 'suite'], 'm2_price': 1580,
     'status': 'construccion', 'progress': 64, 'delivery': '2027-11', 'color': '#e0bd75', 'image': 'residencia-exterior-render', 'amenities': ['lobby', 'pool'],
     'whatsapp': ''},
    {'slug': 'magnus', 'name': 'Residencia 02', 'domain': 'residencia02.example', 'sector': 'Quito', 'address': 'Dirección según ficha oficial',
     'floors': 16, 'front': 2, 'layout': ['depa2', 'depa3', 'suite', 'depa2'], 'm2_price': 2050,
     'status': 'planos', 'progress': 12, 'delivery': '2029-03', 'color': '#b9c6d8', 'image': 'magnus-night-render', 'amenities': ['lobby', 'rooftop'],
     'whatsapp': ''},
    {'slug': 'sparta', 'name': 'Residencia 03', 'domain': 'residencia03.example', 'sector': 'Sector de ejemplo', 'address': 'Sector de ejemplo',
     'floors': 9, 'front': 3, 'layout': ['suite', 'estudio', 'suite', 'depa2', 'depa2'], 'm2_price': 1820,
     'status': 'acabados', 'progress': 88, 'delivery': '2027-02', 'color': '#c9a27a', 'image': 'sparta-exterior-render', 'amenities': ['lobby', 'gym'],
     'whatsapp': ''},
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


def panel_head(key, n, level, title, copy, chips):
    chips_html = ''.join(f'<li>{t(*c)}</li>' for c in chips)
    return f'<header class="pf-panel-head pf-reveal"><div><span class="pf-level">{n} · {t(*level)}</span>{t(*title, "h2")}</div><div>{t(*copy, "p")}<ul class="pf-chips">{chips_html}</ul></div></header>'


def basic_panel(d):
    options = ''.join(f'<option value="{p["slug"]}">{p["name"]}</option>' for p in d['projects'])
    statuses = ''.join(f'<option value="{k}" data-es="{v[0]}" data-en="{v[1]}">{v[0]}</option>' for k, v in STATUS.items())
    return f'''<section class="pf-panel" id="demo-basico" data-panel="basico" role="tabpanel" aria-labelledby="tab-basico">{panel_head('basico', '01', ('GESTIÓN Y CONSULTAS', 'MANAGEMENT & ENQUIRIES'), ('Una misma base,<br>siempre conectada.', 'One shared foundation,<br>always connected.'), ('Cambia un dato en el gestor central y mira cómo llega, en el mismo instante, a la tarjeta del sitio de marca, a la ficha del proyecto, a la tabla de estado, al feed y al bot de WhatsApp. Esta simulación se ejecuta solo en tu navegador.', 'Change a value in the central manager and watch it reach the brand-site card, the project page, the status table, the feed and the WhatsApp bot at the same moment. This simulation runs only in your browser.'), [('Gestor central', 'Central manager'), ('Feed JSON', 'JSON feed'), ('Bot de WhatsApp', 'WhatsApp bot'), ('Reglas de publicación', 'Publishing rules')])}
<div class="pf-basic js-only"><form class="pf-stage pf-cms" id="cms" autocomplete="off"><div class="pf-stage-bar"><b>{t('GESTOR CENTRAL','CENTRAL MANAGER')}</b><span>{t('Rol: Comercial','Role: Sales')}</span></div>
<label>{t('Proyecto','Project')}<select name="project">{options}</select></label>
<label>{t('Precio por m² (USD)','Price per m² (USD)')}<input name="m2_price" type="number" min="500" max="6000" step="10" inputmode="numeric"></label>
<label>{t('Estado','Status')}<select name="status">{statuses}</select></label>
<label>{t('Avance de obra','Construction progress')} <output name="progress_out"></output><input name="progress" type="range" min="0" max="100"></label>
<fieldset><legend>{t('Vigencia de precios','Price validity')}</legend><label class="pf-radio"><input type="radio" name="age" value="5" checked>{t('Actualizados hace 5 días','Updated 5 days ago')}</label><label class="pf-radio"><input type="radio" name="age" value="75">{t('Actualizados hace 75 días','Updated 75 days ago')}</label></fieldset>
<label class="pf-switch"><input type="checkbox" name="sellable" checked><span>{t('Comercializable','For sale')}</span><small>{t('Solo lo edita el rol Legal','Legal role only')}</small></label>
<p class="pf-cms-note" id="cms-note" aria-live="polite"></p></form>
<div class="pf-outputs"><article class="pf-out" data-out="card"><small>promotora.example/proyectos/</small><div id="out-card"></div></article><article class="pf-out" data-out="page"><small id="out-page-domain"></small><div id="out-page"></div></article><article class="pf-out" data-out="status"><small>promotora.example/estado-de-proyectos/</small><div id="out-status"></div></article><article class="pf-out pf-out-code" id="api-json" data-out="feed"><small>API / JSON · /proyectos.json</small><pre id="out-feed"></pre></article></div>
<div class="pf-phone" aria-label="WhatsApp"><div class="pf-phone-screen"><div class="pf-wa-head"><span class="pf-wa-avatar" id="wa-avatar">P</span><div><b id="wa-name">Residencia 01</b><small>{t('Asistente simulado · datos de ejemplo','Simulated assistant · sample data')}</small></div></div><div class="pf-wa-body" id="wa-body" aria-live="polite"></div><div class="pf-wa-quick" id="wa-quick"></div><form class="pf-wa-input" id="wa-form"><label class="sr-only" for="wa-text">{t('Mensaje','Message')}</label><input id="wa-text" placeholder="Escribe un mensaje" data-ph-es="Escribe un mensaje" data-ph-en="Type a message" autocomplete="off"><button aria-label="Enviar">➤</button></form></div></div></div>
<div class="pf-log js-only"><b>{t('Eventos y reglas automáticas','Events and automatic rules')}</b><ol id="event-log"></ol></div>
<div class="pf-fallback">{availability_table(d['projects'][0])}<p class="detail-note">{t('En el nivel básico la disponibilidad se publica como tabla, generada desde el gestor y legible sin JavaScript.','At the basic level availability is published as a table, generated from the manager and readable without JavaScript.')}</p></div></section>'''


def mid_panel(d):
    tables = ''.join(availability_table(p) for p in d['projects'])
    return f'''<section class="pf-panel" id="demo-medio" data-panel="medio" role="tabpanel" aria-labelledby="tab-medio">{panel_head('medio', '02', ('SELECCIÓN 2D', '2D SELECTION'), ('Cada edificio,<br>piso por piso.', 'Every building,<br>floor by floor.'), ('Elige un edificio de la red, recorre su fachada y abre la planta de cualquier piso. Cada unidad muestra su tipología, su superficie, su precio y si está disponible, con los mismos datos del gestor.', 'Pick a building from the network, move along its elevation and open the plan of any floor. Every unit shows its type, area, price and availability, from the same manager data.'), [('Diseño a medida en Figma', 'Bespoke Figma design'), ('Tema con tipografía e imagen', 'Theme with type and image'), ('Microinteracciones', 'Micro-interactions'), ('Consulta por unidad', 'Unit-level enquiry')])}
<div class="pf-mid js-only"><div class="pf-skyline" id="skyline" role="group" aria-label="Edificios"></div><div class="pf-filters" id="filters2d" role="group" aria-label="Filtros"></div><div class="pf-2d"><div class="pf-stage pf-elev"><div class="pf-stage-bar"><b id="elev-title"></b><span>{t('Fachada · toca un piso','Elevation · tap a floor')}</span></div><svg id="elev" role="img" aria-label="Fachada"></svg></div><div class="pf-2d-side"><div class="pf-stage pf-plan"><div class="pf-stage-bar"><b id="plan-title"></b><span>{t('Planta · toca una unidad','Plan · tap a unit')}</span></div><svg id="plan" role="img" aria-label="Planta"></svg></div><div class="pf-unit" id="unit2d" aria-live="polite"></div></div></div><div class="pf-legend" data-legend></div></div>
<div class="pf-fallback pf-fallback-grid">{tables}</div></section>'''


def high_panel(d):
    from spatial import arrival, toolbar, overlay
    note = ('La visita usa renders conceptuales generados con IA en un visor panorámico. La maqueta y el inventario son ilustrativos.', 'The visit uses AI-generated conceptual renders in a panoramic viewer. The model and inventory are illustrative.') if len(d['projects']) == 1 else ('La visita usa renders conceptuales generados con IA en un visor panorámico. Los interiores de los otros proyectos se muestran con esas mismas imágenes de referencia. La maqueta y los datos son ilustrativos.', 'The visit uses AI-generated conceptual renders in a panoramic viewer. Other projects use those same reference interiors. The model and data are illustrative.')
    return f'''<section class="pf-panel" id="demo-alto" data-panel="alto" role="tabpanel" aria-labelledby="tab-alto">{panel_head('alto', '03', ('EXPLORACIÓN 3D', '3D EXPLORATION'), ('Recorre el proyecto<br>antes de que exista.', 'Walk through the project<br>before it exists.'), ('Una maqueta 3D con los proyectos de la red. Gira, acércate, aísla un piso y elige un departamento disponible. Desde ahí entras a la visita virtual del departamento y de las áreas comunes.', 'A 3D model of the projects in the network. Rotate, zoom in, isolate a floor and pick an available apartment. From there you step into the virtual visit of the apartment and the shared spaces.'), [('Dirección de arte propia', 'Own art direction'), ('Portada propia por proyecto', 'Own cover per project'), ('Narrativa con scroll', 'Scroll-driven narrative'), ('Inventario ilustrativo', 'Illustrative inventory')])}
<div class="pf-high js-only" data-spatial-mode="model">
<details class="arrival-optional"><summary>{t('Ver la secuencia de llegada','View the arrival sequence')}</summary>{arrival()}</details>{toolbar()}
<div class="pf-viewer-toolbar"><div class="pf-seg" id="projects3d" role="group" aria-label="Proyectos"></div><button class="pf-chip" id="overview3d">{t('Vista de la red','Network view')}</button></div>
<div class="pf-model-layout">
<div class="pf-stage pf-3d" id="stage3d" data-mode="model">{overlay()}<canvas id="scene3d" tabindex="0" aria-label="Maqueta 3D de los proyectos" aria-describedby="model-help"></canvas><div class="pf-3d-labels" id="labels3d"></div><div class="pf-camera-tools" role="group" aria-label="Cámara 3D"><button class="pf-chip" data-model-action="left" aria-label="Girar a la izquierda / Rotate left">↶</button><button class="pf-chip" data-model-action="right" aria-label="Girar a la derecha / Rotate right">↷</button><button class="pf-chip" data-model-action="out" aria-label="Alejar / Zoom out">−</button><button class="pf-chip" data-model-action="in" aria-label="Acercar / Zoom in">+</button><button class="pf-chip" data-model-action="reset">{t('Centrar vista','Reset view')}</button></div></div>
<aside class="pf-model-sidebar" aria-label="Selección de unidades"><div class="pf-3d-tools"><div class="pf-floor-filter" id="floor3d-filter" hidden><label for="floor3d">{t('Piso','Floor')} <output id="floor3d-out" for="floor3d"></output></label><div class="pf-floor-controls"><button class="pf-chip" id="floor3d-prev" aria-label="Piso anterior / Previous floor">−</button><input type="range" id="floor3d" min="1" value="1" step="1" disabled><button class="pf-chip" id="floor3d-next" aria-label="Piso siguiente / Next floor">+</button></div></div><label class="pf-switch"><input type="checkbox" id="avail3d"><span>{t('Solo disponibles','Available only')}</span></label><label for="unit3d-select">{t('Seleccionar unidad','Select a unit')}</label><select id="unit3d-select" disabled></select><p id="selection3d-status" role="status"></p></div><div class="pf-legend" data-legend></div><div class="pf-unit" id="unit3d" hidden></div></aside>
</div><p class="pf-viewer-help" id="model-help">{t('Arrastra para girar; pellizca o usa + y − para acercar. Con el visor seleccionado: rueda para zoom, flechas para girar, Inicio para centrar y Esc para salir.','Drag to rotate; pinch or use + and − to zoom. With the viewer selected: scroll to zoom, arrow keys to rotate, Home to reset and Esc to release.')}</p>
<div class="pf-tour-shell"><div class="pf-viewer-toolbar"><h3>{t('Visita virtual','Virtual visit')}</h3><div class="pf-tour-actions" role="group" aria-label="Cámara de la visita"><button class="pf-chip" data-tour-action="out" aria-label="Alejar visita / Zoom out of tour">−</button><button class="pf-chip" data-tour-action="in" aria-label="Acercar visita / Zoom into tour">+</button><button class="pf-chip" data-tour-action="reset">{t('Centrar visita','Reset tour')}</button></div></div><nav class="pf-tour-nav" id="tourNav" aria-label="Espacios"></nav>
<div class="pf-stage pf-tour" id="tourStage"><canvas id="tour3d" tabindex="0" aria-label="Visita virtual" aria-describedby="tour-help"></canvas><div class="pf-tour-hotspots" id="tourHotspots"></div><div class="pf-tour-fade" id="tourFade"></div><p class="pf-viewer-status" id="tour-status" role="status" hidden></p><button class="pf-chip pf-tour-retry" id="tour-retry" hidden>{t('Reintentar imagen','Retry image')}</button></div>
<div class="pf-tour-info"><div class="pf-tour-caption"><small id="tour-kicker"></small><h3 id="tour-title"></h3><p id="tour-desc"></p></div></div>
<p class="pf-viewer-help" id="tour-help">{t('Arrastra para mirar. Pellizca o usa + y − para acercar. Puedes cambiar de espacio con los botones superiores.','Drag to look around. Pinch or use + and − to zoom. Switch spaces using the buttons above.')}</p></div>
<p class="detail-note">{t(*note)}</p></div>
<div class="pf-fallback"><p>{t('Sin JavaScript, cada proyecto conserva su tabla de disponibilidad : la maqueta y la visita son una mejora progresiva.','Without JavaScript, every project keeps its availability table : the model and the visit are a progressive enhancement.')}</p></div></section>'''


def proforma():
    d=data();feed=json.dumps(d,ensure_ascii=False)
    tabs=''.join(f'<button id="tab-{key}" data-tab="{key}" role="tab" aria-selected="{str(key=="basico").lower()}" aria-controls="demo-{key}">{t(es,en)}</button>' for key,es,en in [('basico','Gestión y consultas','Management & enquiries'),('medio','Selección en 2D','2D selection'),('alto','Exploración en 3D','3D exploration')])
    intro=f'''<section class="technical-intro" id="inicio"><span class="overline">{t('PRUÉBALO','TRY IT')}</span>{t('Del dato<br>a la <em>experiencia.</em>','From data<br>to <em>experience.</em>','h1')}<p>{t('Cambia el estado de un proyecto, elige un departamento en el plano o explora la maqueta 3D. Descubre cómo podría funcionar con tu información.','Change a project’s status, choose an apartment on the plan or explore the 3D model. See how it could work with your information.')}</p></section>'''
    out=head('proforma')+f'''<main id="main" class="pf demo-tools">{intro}<section class="pf-demo" id="demo"><div class="pf-tabs js-only" role="tablist" aria-label="Herramientas / Tools">{tabs}</div><p class="pf-sample"><b>{t('SIMULACIÓN LOCAL','LOCAL SIMULATION')}</b> {t('Proyectos, unidades, precios y fechas ficticios. Los cambios se reinician al recargar. No se envían mensajes ni se conecta con un CRM.','Fictional projects, units, prices and dates. Changes reset on reload. No messages are sent and no CRM is connected.')}</p>{basic_panel(d)}{mid_panel(d)}{high_panel(d)}</section><section class="proposal-next" id="proforma"><div>{t('Empecemos por un proyecto.','Let’s start with one project.','h2')}<p>{t('Definimos el alcance según tus planos, imágenes, inventario e integraciones. La producción de nuevos modelos o recorridos se evalúa por separado.','We define the scope around your plans, imagery, inventory and integrations. Production of new models or tours is assessed separately.')}</p></div>{a('Conversar sobre un piloto','Discuss a pilot','/contacto/','button')}</section></main>'''+footer(True)+f'<script type="application/json" id="demo-data">{feed}</script><noscript><div class="noscript">Datos ilustrativos. Activa JavaScript para probar las herramientas interactivas.</div></noscript></body></html>'
    for route in ('demo','proforma'):
        (ROOT/route).mkdir(exist_ok=True);(ROOT/route/'index.html').write_text(out)
        (ROOT/route/'proyectos-demo.json').write_text(json.dumps(d,ensure_ascii=False,indent=1))
