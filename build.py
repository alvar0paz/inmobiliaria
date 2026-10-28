from pathlib import Path
from html import escape
from hashlib import sha256
import re
import json
ROOT=Path(__file__).parent/'public'
def t(es,en,tag='span',cls=''):
 return f'<{tag}'+(f' class="{cls}"' if cls else '')+f' data-es="{escape(es,quote=True)}" data-en="{escape(en,quote=True)}">{es}</{tag}>'
def a(es,en,href,cls='',extra=''): return f'<a href="{href}" class="{cls}" {extra}>{t(es,en)}</a>'
def btn(es,en,cls='',extra=''): return f'<button class="{cls}" {extra}>{t(es,en)}</button>'
def version_assets(markup):
 return re.sub(r'(?P<attr>src|href)="/(?P<name>[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"', lambda m: f'{m["attr"]}="/{m["name"]}?v={sha256((ROOT/m["name"]).read_bytes()).hexdigest()[:10]}"', markup)

def head(page='home'):
 extra_head='<link rel="stylesheet" href="/proforma.css"><script src="/asset-loader.js" defer></script><script src="/viewer-controls.js" defer></script><link rel="stylesheet" href="/spatial.css"><script src="/spatial-scene.js" defer></script><script src="/proforma.js" defer></script>' if page in ('proforma','project') else ''
 if page=='project': extra_head+='<link rel="stylesheet" href="/sector-map.css"><script src="/sector-scene.js" defer></script><script src="/sector-map.js" defer></script>'
 # Prioritize only the selected hero before deferred application scripts run.
 hero_assets={'essential':'residencia-exterior-render','editorial':'pixel-lobby-render' if page=='project' else 'residencia-exterior-render','immersive':'pixel-living-render'}
 hero_head=''
 if page in ('home','project'):
  hero_head='<script>(()=>{const images='+json.dumps(hero_assets)+''';const choice=new URLSearchParams(location.search).get('style');if(location.pathname==='/'&&!Object.hasOwn(images,choice))return;const asset=Object.hasOwn(images,choice)?images[choice]:images.immersive;const link=document.createElement('link');link.rel='preload';link.as='image';link.fetchPriority='high';link.href='/assets/'+asset+'.png';document.head.append(link)})()</script>'''
 title={'home':'Portafolio de ejemplo · Demo inmobiliaria','project':'Residencia 01 · Proyecto de ejemplo','about':'Andean Software Lab · Nuestro equipo','proforma':'Herramientas interactivas · Demo inmobiliaria','comparison':'Experiencias web · Demo inmobiliaria','technical':'Cómo funciona · Demo inmobiliaria','proposal':'Demo inmobiliaria · Andean Software Lab','contact':'Hablemos de tu proyecto · Andean Software Lab'}.get(page,'Demo inmobiliaria · Andean Software Lab')
 description='Experiencias web para proyectos inmobiliarios: planos interactivos, modelos 3D y recorridos visuales. Una demo de Andean Software Lab con datos ilustrativos.'
 return version_assets(f'''<!doctype html><html lang="es-EC"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="{description}"><meta property="og:title" content="{title}"><meta property="og:description" content="{description}"><meta property="og:type" content="website"><meta property="og:image" content="https://inmobiliaria.alvaropaz.com/assets/pixel-living-render.png"><title>{title}</title>{hero_head}<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23212b22'/%3E%3Cpath d='M6 25L16 6l10 19h-5l-5-10-5 10Z' fill='%23d5bc7c'/%3E%3C/svg%3E"><link rel="stylesheet" href="/styles.css">{('<link rel="stylesheet" href="/directions.css">' if page in ('home','project') else '')}<script>document.documentElement.classList.add('js')</script><script src="/navigation.js" defer></script><script src="/app.js" defer></script>{('<script src="/directions.js" defer></script>' if page in ('home','project') else '')}{extra_head}<link rel="stylesheet" href="/navigation.css"></head><body class="immersive page-{page}"><a class="skip" href="#main">{t('Saltar al contenido','Skip to content')}</a>
 {shell(page)}''')
def language():
 return f'<div class="lang-switch js-only" role="group" aria-label="Idioma / Language"><button data-lang="es" aria-pressed="true">ES</button><span>/</span><button data-lang="en" aria-pressed="false">EN</button></div>'
def shell(page):
 if page in ('home','project'):
  label = 'Portafolio ficticio · Datos de ejemplo' if page == 'home' else 'Proyecto ficticio · Datos de ejemplo'
  return f'<aside class="demo-ribbon" lang="es" aria-label="Identificación de la demo"><strong>DEMO</strong><span>{t(label,"Fictional projects · Sample data")}</span></aside><div class="preview-return">{a("← Volver a la demo","← Back to the demo","/comparar/")}</div>'
 links=a('Resumen','Overview','/propuesta/','', 'aria-current="page"' if page=='proposal' else '')+a('Comparar opciones','Compare options','/comparar/','', 'aria-current="page"' if page=='comparison' else '')+a('Cómo funciona','How it works','/como-funciona/','', 'aria-current="page"' if page=='technical' else '')+a('Herramientas','Tools','/demo/','', 'aria-current="page"' if page=='proforma' else '')+a('Nuestro equipo','Our team','/nosotros/','', 'aria-current="page"' if page=='about' else '')
 return menu_shell('<a class="proposal-brand" href="/propuesta/">ANDEAN SOFTWARE LAB<small>'+t('DEMO INMOBILIARIA','REAL ESTATE DEMO')+'</small></a>',links+a('Hablemos','Let’s talk','/contacto/','advisor-link'),'stakeholder')
def menu_shell(brand,links,kind='buyer'):
 return f'''<header class="navigation {kind}-navigation">{brand}<button class="menu-toggle js-only" aria-expanded="false" aria-controls="primary-menu">{t('Menú','Menu')} <span aria-hidden="true">☰</span></button><nav id="primary-menu" class="primary-menu" aria-label="Principal / Main">{links}{language()}</nav></header>'''
def nav(project=False):
 brand=('<div class="project-brand">'+a('← Proyectos','← All projects','/#projects')+'<a href="/proyecto/" aria-label="Residencia 01"><span class="pixel-word">Residencia 01</span></a></div>') if project else '<a class="proposal-brand" href="/?style=immersive" aria-label="Portafolio de ejemplo">TU MARCA<small>PORTAFOLIO DEMO</small></a>'
 links=(a('El proyecto','Overview','#details')+a('Departamentos','Apartments','#homes')+a('Ubicación','Location','#location')) if project else (a('Proyectos','Projects','#projects')+a('La experiencia','The experience','#vision'))
 links+=a('Hablar con un asesor','Talk to an advisor','#contact','advisor-link')
 return menu_shell(brand,links)+a('Hablar con un asesor','Talk to an advisor','#contact','mobile-advisor')
def footer(stakeholder=False):
 return f'''<footer class="footer"><span>ANDEAN SOFTWARE LAB © 2026</span>{a('Hablemos de tu proyecto','Let’s talk about your project','/contacto/')}<span>{t('Demo conceptual · Proyectos ficticios · Renders generados con IA','Concept demo · Fictional projects · AI-generated renders')}</span></footer>'''
def proposal(): return ''
def map_dialog(): return ''
def home():
 from directions import home as render_home
 render_home()

def tour_dialog():
 return f'''<dialog id="tour" class="dialog tour-dialog"><div class="dialog-head"><b>RESIDENCIA 01 / {t('UNA VISITA A TU RITMO','A VISIT AT YOUR PACE')}</b><button class="close" data-close aria-label="Close / Cerrar">×</button></div><div class="tour-layout"><div class="tour-stage open" id="tour-stage"><img id="tour-image" decoding="async" alt="Exterior de Residencia 01"><div class="door left"></div><div class="door right"></div><div class="travel-label" aria-hidden="true">RESIDENCIA 01<br><small>{t('UN PASO MÁS CERCA DE CASA','ONE STEP CLOSER TO HOME')}</small></div><div class="tour-caption" aria-live="polite"><small id="scene-kicker">01 / LLEGAR</small><h2 id="scene-title">Tu primera mirada.</h2><p id="scene-description">Residencia 01, en Sector de ejemplo.</p></div></div><aside class="tour-controls"><div class="eyebrow">{t('ELIGE POR DÓNDE SEGUIR','CHOOSE YOUR NEXT STEP')}</div><div class="journey-progress"><span id="journey-counter">01</span><small>/ 04</small></div><div class="floor-buttons">'''+''.join(f'<button data-scene="{i}" aria-pressed="{str(i==0).lower()}"><b>0{i+1}</b>{t(es,en)}</button>' for i,es,en in [(0,'Llegar','Arrive'),(1,'Entrar','Step inside'),(2,'Habitar','Come home'),(3,'Disfrutar','Unwind')])+f'''</div><div class="journey-actions"><button id="journey-prev" class="text-link">{t('Anterior','Previous')}</button><button id="journey-next" class="button">{t('Continuar','Continue')}</button></div><p class="tour-note">{t('Secuencia conceptual con renders 2D. Las paradas no representan pisos ni una ruta física verificada. Puedes saltar a cualquier espacio.','Conceptual sequence using 2D renders. Stops do not represent floors or a verified physical route. Jump to any space at any time.')}</p><button class="text-link" id="tour-to-details">{t('Ir directo a la información','Go straight to project details')}</button></aside></div></dialog>'''
def project():
 from directions import project as render_project
 render_project()

def about():
 profiles=[
  {'name':'Martín Vélez Falconí','photo':'martin-velez-falconi.jpg','url':'https://www.linkedin.com/in/martin-velez-falconi/',
   'role':('Backend · Automatización · DevOps','Backend · Automation · DevOps'),
   'bio':('Desarrolla la base técnica que conecta aplicaciones, procesos y datos. Trabaja con Django y Odoo para construir soluciones web, y con CI/CD, Kubernetes y Azure DevOps para automatizar su despliegue y operación.','Builds the technical foundation that connects applications, workflows and data. He works with Django and Odoo to develop web solutions, and with CI/CD, Kubernetes and Azure DevOps to automate deployment and operations.'),
   'specialty':('Desarrollo backend, integración de procesos y automatización.','Backend development, workflow integration and automation.'),
   'contribution':('Conectar el gestor de contenidos con la publicación de los proyectos y facilitar su operación.','Connect the content manager to project publishing and make day-to-day operations easier.'),
   'skills':['Django','Odoo','CI/CD','Kubernetes','Azure DevOps']},
  {'name':'Alvaro Paz','photo':'alvaro-paz.jpg','url':'https://www.linkedin.com/in/alvaropaz/',
   'role':('Ingeniería de software · Frontend y backend','Software engineering · Frontend and backend'),
   'bio':('Desarrolla aplicaciones web con React y Node.js, desde la interfaz hasta la lógica del servidor. Conecta servicios e integra herramientas para crear experiencias fluidas, simplificar procesos y convertir necesidades de negocio en software útil.','Builds web applications with React and Node.js, from the interface to server-side logic. He connects services and integrates tools to create seamless experiences, simplify workflows and turn business needs into useful software.'),
   'specialty':('Desarrollo frontend, backend e integración de sistemas.','Frontend development, backend development and systems integration.'),
   'contribution':('Unir la exploración de proyectos, la selección de unidades y el contacto comercial en una experiencia coherente.','Bring project discovery, home selection and sales enquiries together in one cohesive experience.'),
   'skills':['React','Node.js','Backend','Frontend',('Integraciones','Integrations')]}
 ]
 out=head('about')+f'''<header class="team-nav"><span class="team-wordmark">ANDEAN <small>SOFTWARE LAB</small></span>{a('Volver a la demo','Back to the demo','/propuesta/','text-link')}</header><main id="main" class="team-main"><section class="team-intro"><div class="eyebrow">{t('SOBRE NOSOTROS / NUESTRO EQUIPO','ABOUT US / OUR TEAM')}</div>{t('De la visión<br>al <em>producto.</em>','From vision<br>to <em>product.</em>','h1')}<p>{t('Somos Andean Software Lab, el equipo de Martín Vélez Falconí y Alvaro Paz. Combinamos ingeniería de software y criterio de producto para convertir necesidades de negocio en herramientas digitales claras, útiles y fáciles de gestionar.','We are Andean Software Lab, the team of Martín Vélez Falconí and Alvaro Paz. We combine software engineering and product thinking to turn business needs into digital tools that are clear, useful and easy to manage.')}</p></section><section class="team-grid" aria-label="Perfiles / Profiles">'''
 for p in profiles:
  skills=''.join('<li>'+ (t(*skill) if isinstance(skill,tuple) else skill)+'</li>' for skill in p['skills'])
  out+=f'''<article class="person-card"><div class="person-top"><img class="person-photo" src="/assets/{p['photo']}" alt="{p['name']}" width="96" height="96" decoding="async"><div class="person-heading"><p class="person-role">{t(*p['role'])}</p><h2>{p['name']}</h2></div></div><p class="person-bio">{t(*p['bio'])}</p><ul class="person-skills" aria-label="Especialidades / Specialties">{skills}</ul><dl class="person-facts"><div><dt>{t('ESPECIALIDAD','SPECIALTY')}</dt><dd>{t(*p['specialty'])}</dd></div><div><dt>{t('CÓMO TE AYUDAMOS','HOW WE HELP')}</dt><dd>{t(*p['contribution'])}</dd></div></dl><a class="person-link" href="{p['url']}" target="_blank" rel="noopener noreferrer"><span class="linkedin-mark" aria-hidden="true">in</span>{t('Ver perfil en LinkedIn','View LinkedIn profile')}</a></article>'''
 out+=f'''</section><section class="team-closing"><div><span class="eyebrow">{t('EXPERIENCIAS PARA TU PROYECTO','EXPERIENCES FOR YOUR PROJECT')}</span>{t('De descubrir un proyecto<br>a dar el siguiente paso.','From discovering a project<br>to taking the next step.','h2')}</div><div><p>{t('Un catálogo para encontrar rápido, una lectura editorial para entender el proyecto y una experiencia inmersiva para explorarlo. Tres formas de presentar la misma información, conectadas a una gestión central.','A catalogue to find a project quickly, an editorial approach to understand it, and an immersive experience to explore it. Three ways to present the same information, connected to one central content system.')}</p>{a('Explorar el concepto','Explore the concept','/','button')}</div></section><p class="team-sources">{t('Conoce más sobre cada integrante en su perfil de LinkedIn.','Learn more about each team member on LinkedIn.')}</p></main>'''+footer(True)+'</body></html>'
 (ROOT/'nosotros').mkdir(exist_ok=True);(ROOT/'nosotros'/'index.html').write_text(out)

if __name__=='__main__':
 from premium import build
 build()
