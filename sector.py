"""Shared location section for the three Residencia 01 visual directions."""
from build import t, a


def location_section():
    return f'''<section class="pixel-location sector-section" id="location" aria-labelledby="sector-title">
<div class="sector-copy"><span class="overline">04 / {t('EL SECTOR','THE AREA')}</span>
<h2 id="sector-title">Sector de ejemplo.<br>{t('<em>Tu punto<br>de partida.</em>','<em>Your<br>starting point.</em>')}</h2>
<p class="sector-intro">{t('Una esquina de Quito.<br>El comienzo de tu próxima historia.','One corner of Quito.<br>The beginning of your next chapter.')}</p>
<address><span>RESIDENCIA 01 · QUITO</span>Avenida Central<br>&amp; Calle del Parque</address>
<div class="sector-places" role="group" aria-label="Lugares del sector / Places in the area">
<button type="button" data-sector-place="pixel" aria-pressed="true"><span>01</span><b>Residencia 01</b><i aria-hidden="true">↗</i></button>
<button type="button" data-sector-place="metro" aria-pressed="false"><span>02</span><b>{t("Transporte","Transport")}</b><i aria-hidden="true">↗</i></button>
<button type="button" data-sector-place="coral" aria-pressed="false"><span>03</span><b>{t("Comercio","Shops")}</b><i aria-hidden="true">↗</i></button>
</div>
<p class="sector-place-description" id="sector-place-description" role="status">{t('Residencia 01, en la esquina de Avenida Central y Calle del Parque.','Residencia 01, at the corner of Avenida Central and Calle del Parque.')}</p>
<p class="detail-note">{t('Ubicación ficticia. En tu proyecto, conectamos la dirección real y sus puntos de interés.','Fictional location. For your project, we connect the actual address and its points of interest.')}</p>
</div>
<figure class="sector-map-figure"><div class="sector-map" id="sector-map" data-selected="pixel">
<img class="sector-map-fallback" src="/assets/sector-map.png" alt="Maqueta ilustrativa del sector: Residencia 01 junto a Avenida Central y Calle del Parque, con referencias de transporte y comercio." width="1200" height="1000" loading="lazy">
<canvas id="sector-canvas" tabindex="0" hidden aria-label="Mapa 3D del sector / 3D area map" aria-describedby="sector-map-help sector-map-caption"></canvas>
<div class="sector-map-masthead"><span>QUITO <i>/</i> SECTOR DE EJEMPLO</span><span class="sector-map-badge"><i></i>{t('EL SECTOR EN 3D','THE AREA IN 3D')}</span></div>
<div class="sector-map-labels" id="sector-map-labels" hidden></div>
<div class="sector-map-tools" id="sector-map-tools" hidden>
<div class="sector-map-views" role="group" aria-label="Perspectiva / Perspective"><button type="button" data-sector-view="perspective" aria-pressed="true">{t('Perspectiva','Perspective')}</button><button type="button" data-sector-view="above" aria-pressed="false">{t('Desde arriba','From above')}</button></div>
<div class="sector-map-camera" role="group" aria-label="Cámara / Camera"><button type="button" data-sector-action="left" aria-label="Girar / Rotate">↶</button><button type="button" data-sector-action="out" aria-label="Alejar / Zoom out">−</button><button type="button" data-sector-action="in" aria-label="Acercar / Zoom in">+</button><button type="button" data-sector-action="reset" aria-label="Centrar mapa / Reset map">⌖</button></div>
</div>
<span class="sector-map-wordmark" aria-hidden="true">SECTOR DE EJEMPLO</span>
</div><figcaption id="sector-map-caption"><span>{t('Maqueta ilustrativa · no está a escala.','Illustrative model · not to scale.')}</span><span id="sector-map-help">{t('Entorno ficticio para demostrar la interacción.','Fictional surroundings demonstrating the interaction.')}</span></figcaption></figure>
</section>'''
