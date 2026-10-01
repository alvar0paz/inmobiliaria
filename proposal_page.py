"""Stakeholder entry point, separate from the customer previews."""
from build import ROOT, head, t, a, footer


def proposal_page():
    options = [
        ('essential', '01', 'Esencial', 'Essential', 'Básico', 'Basic',
         'Encuentra un proyecto y conversa con un asesor.', 'Find a project and speak with an advisor.',
         'Información del proyecto, tipos de vivienda y contacto. Una experiencia directa para quien busca su próximo hogar.',
         'Project information, home types and contact details. A straightforward experience for someone looking for their next home.'),
        ('editorial', '02', 'Interactivo', 'Interactive', 'Medio', 'Mid',
         'Compara departamentos y conoce su distribución.', 'Compare apartments and explore their layouts.',
         'Todo lo esencial, más selección de pisos y departamentos en planos, con un diseño a medida.',
         'Everything in Essential, plus floor and apartment selection on plans, with a bespoke design.'),
        ('immersive', '03', 'Inmersivo', 'Immersive', 'Alto', 'High',
         'Explora el edificio y sus espacios a tu ritmo.', 'Explore the building and its spaces at your own pace.',
         'Todo lo interactivo, más una maqueta 3D y visitas virtuales opcionales. La información siempre está a mano.',
         'Everything in Interactive, plus an optional 3D building model and virtual visits. Key information is always within reach.'),
    ]
    cards = ''
    for style, number, es, en, level, levelen, task, tasken, copy, copyen in options:
        cards += f'''<article class="option-card"><span class="overline">{number} / {t(level,levelen)}</span>{t(es,en,'h3')}{t(task,tasken,'p','option-task')}{t(copy,copyen,'p')}<a class="button" data-preview-style="{style}" href="/?style={style}">{t('Ver experiencia del cliente','Preview customer experience')} <span aria-hidden="true">↗</span></a></article>'''
    out = head('proposal') + f'''<main id="main" class="proposal-main"><section class="proposal-overview" id="resumen"><div><span class="overline">{t('PROPUESTA PARA ALPHA BUILDERS','PROPOSAL FOR ALPHA BUILDERS')}</span>{t('Una forma más fácil<br>de encontrar <em>hogar.</em>','An easier way<br>to find <em>home.</em>','h1')}<p>{t('Una experiencia clara para tus clientes. Un solo lugar para gestionar la información de tus proyectos. Elige cuánto quieres que puedan explorar.','A clear experience for your clients. One place to manage information across your projects. Choose how much they can explore.')}</p>{a('Comparar las opciones','Compare the options','#opciones','button')}</div><figure><img src="/assets/pixel-living-render.png" alt="Interior conceptual de Pixel / Pixel concept interior"><figcaption>{t('Pixel · Render conceptual generado con IA','Pixel · AI-generated concept render')}</figcaption></figure></section><section id="opciones" class="proposal-options"><div class="proposal-section-title"><span class="overline">{t('ELIGE LA EXPERIENCIA','CHOOSE THE EXPERIENCE')}</span>{t('Tres opciones.<br>Un recorrido familiar.','Three options.<br>One familiar journey.','h2')}<p>{t('En todas: conocer el proyecto, encontrar un departamento y hablar con un asesor. Abre cada opción para verla como la vería un cliente.','In every option: discover the project, find an apartment and speak with an advisor. Open each option to see it as a client would.')}</p></div><div class="option-grid">{cards}</div></section><section class="proposal-next"><div><span class="overline">{t('INVERSIÓN Y EQUIPO','INVESTMENT & TEAM')}</span>{t('Todo lo necesario<br>para tomar una decisión.','Everything you need<br>to make a decision.','h2')}</div><div><p>{t('Revisa los importes, el alcance y las condiciones de cada nivel, y conoce al equipo que llevará la propuesta a la realidad.','Review the pricing, scope and terms for each level, and meet the team who will deliver the proposal.')}</p><div class="action-row">{a('Ver inversión y alcance','View investment & scope','/proforma/#proforma','button')}{a('Equipo de la propuesta','Proposal team','/nosotros/','text-link')}</div></div></section></main>''' + footer(True) + '</body></html>'
    (ROOT/'propuesta').mkdir(exist_ok=True)
    (ROOT/'propuesta/index.html').write_text(out)
