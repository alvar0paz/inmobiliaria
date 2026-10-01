"""Shared cinematic entry and spatial controls for the existing High experience."""
from build import t, a, btn


def arrival():
    return f'''<section class="spatial-arrival" aria-label="Pixel · una llegada a casa">
<div class="arrival-frames">{''.join('<img src="/assets/'+asset+'.png" alt="'+alt+'" data-arrival-image="'+str(i)+'"'+('' if i==0 else ' hidden')+' loading="lazy" decoding="async">' for i,(asset,alt) in enumerate([('pixel-exterior-render','Render de la fachada de Pixel'),('pixel-lobby-render','Render del lobby Pixel Colors'),('pixel-living-render','Render del interior de Pixel')]))}</div>
<div class="arrival-copy"><span class="overline">PIXEL / {t('UNA LLEGADA A CASA','A JOURNEY HOME')}</span><h3 id="arrival-title">{t('Todo empieza<br>con una mirada.','It starts<br>with a first look.')}</h3><p id="arrival-caption">{t('La ciudad queda afuera. Tu historia está por empezar.','The city stays outside. Your story is about to begin.')}</p><button class="button" type="button" id="arrival-continue">{t('Entrar al lobby','Enter the lobby')}</button></div>
<div class="arrival-bottom"><nav aria-label="Llegada / Arrival">{''.join('<button type="button" data-arrival-step="'+str(i)+'" aria-pressed="'+str(i==0).lower()+'"><span>0'+str(i+1)+'</span>'+t(es,en)+'</button>' for i,(es,en) in enumerate([('Llegar','Arrive'),('Entrar','Step inside'),('Habitar','Come home')]))}</nav><small>{t('Renders de Pixel · secuencia conceptual','Pixel renders · conceptual sequence')}</small></div></section>'''


def toolbar():
    return f'''<div class="spatial-heading" id="demo-3d" tabindex="-1"><div><span class="overline">{t('LA ARQUITECTURA EN TUS MANOS','ARCHITECTURE IN YOUR HANDS')}</span><h3>{t('Descubre lo que hay dentro.','Discover what lies within.')}</h3></div><a class="spatial-quick" href="/pixel/#details">{t('Información rápida','Quick information')}</a></div>
<div class="spatial-controls"><div class="spatial-modes" role="group" aria-label="Experiencia espacial / Spatial experience"><button type="button" class="pf-chip" id="spatial-building" aria-pressed="true">{t('El edificio','The building')}</button><button type="button" class="pf-chip" id="spatial-interior" aria-pressed="false">{t('Un día en casa','A day at home')}</button></div><button type="button" class="pf-chip" id="explode3d" aria-pressed="false">{t('Separar pisos','Separate floors')}</button><div class="spatial-daylight" id="spatial-daylight" role="group" aria-label="Luz conceptual / Concept lighting" hidden>{''.join('<button class="pf-chip" type="button" data-daylight="'+str(i)+'" aria-pressed="'+str(i==1).lower()+'">'+t(es,en)+'</button>' for i,(es,en) in enumerate([('Mañana','Morning'),('Atardecer','Sunset'),('Noche','Night')]))}</div></div>'''


def overlay():
    return f'''<div class="spatial-stage-title"><span id="spatial-scene-label">{t('MAQUETA VIVA','LIVING MODEL')}</span><span id="spatial-scene-note">{t('Gira. Separa los pisos. Elige un espacio.','Rotate. Separate the floors. Choose a space.')}</span></div><div class="spatial-interior-tools" id="spatial-interior-tools" hidden><button class="pf-chip" type="button" id="interior-camera" aria-pressed="false">{t('Entrar al espacio','Step inside')}</button><button class="pf-chip" type="button" id="interior-renders">{t('Ver renders de Pixel','View Pixel renders')}</button></div>'''
