(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  let lang = document.documentElement.lang === 'en' ? 'en' : 'es', step = 0, room = 'overview', selected = null, engine = null, paintStates = {};
  const feed = $('#demo-data') ? JSON.parse($('#demo-data').textContent) : null, p = feed?.project;
  const L = (es, en) => lang === 'es' ? es : en;
  const copy = [
    ['01 / LA ARQUITECTURA', '01 / THE ARCHITECTURE', 'La primera mirada.', 'The first look.', 'Gira el edificio y toca los puntos de interés para acercarte a la piscina, las terrazas y el lobby. Después, elige tu hogar.', 'Rotate the building and tap the points of interest to move closer to the pool, terraces and lobby. Then choose your home.'],
    ['02 / TU DEPARTAMENTO', '02 / YOUR APARTMENT', 'Un espacio para ti.', 'A space for you.', 'Elige un piso y el edificio se abre para mostrarlo. Los colores indican disponibilidad; toca una unidad en el modelo para entrar o elígela en la lista.', 'Choose a floor and the building opens to reveal it. Colours show availability; tap a unit on the model to step inside, or pick it from the list.'],
    ['03 / LA VIDA DENTRO', '03 / LIFE INSIDE', 'Imagina lo cotidiano.', 'Imagine the everyday.', 'Entra a tu unidad y descubre la distribución de su tipología, espacio por espacio. La vista exterior cambia con la altura del piso elegido.', 'Step inside and discover the layout for your apartment type, space by space. The outside view changes with your floor’s height.'],
    ['04 / EL SIGUIENTE PASO', '04 / YOUR NEXT STEP', 'Hablemos de tu hogar.', 'Let’s talk about your home.', 'Tu selección acompaña la conversación. Una experiencia conectada de principio a fin.', 'Your selection travels with the conversation. A connected experience from start to finish.'],
  ];
  const STATUS = {disponible: ['Disponible', 'Available', 'available'], reservado: ['Reservado', 'Reserved', 'reserved'], vendido: ['Vendido', 'Sold', 'sold']};
  const AMENITY = {pool: ['Piscina en la azotea', 'Rooftop pool', 'left'], garden: ['Jardín en altura', 'Sky garden', 'right'], terraces: ['Terrazas privadas', 'Private terraces', 'right'], lobby: ['Lobby y acceso', 'Lobby & entrance', 'left']};
  // Interior area from the plan, plus the terrace when the home has one.
  const area = u => u.terrace ? `${u.m2} m² + ${u.terrace} m² ${L('terraza', 'terrace')}` : `${u.m2} m²`;
  const ROOM = {living: ['Sala', 'Living'], kitchen: ['Cocina', 'Kitchen'], bedroom: ['Dormitorio principal', 'Main bedroom'], bedroom2: ['Dormitorio 2', 'Bedroom 2'], bedroom3: ['Dormitorio 3', 'Bedroom 3'], bathroom: ['Baño', 'Bathroom'], terrace: ['Terraza', 'Terrace']};
  const status = u => L(...STATUS[u.status]);
  const typeName = u => feed.typologies[u.type].name[lang === 'es' ? 0 : 1];
  const unitById = id => p?.units.find(u => u.id === id);
  const interiorCopy = {
    estudio: ['Un espacio abierto con zona de descanso, cocina compacta y balcón.', 'An open space with a sleeping nook, compact kitchen and balcony.'],
    suite: ['Un dormitorio independiente, comedor para cuatro y una terraza íntima.', 'A separate bedroom, dining for four and an intimate terrace.'],
    depa2: ['Dos dormitorios, espacio de trabajo y una sala para compartir.', 'Two bedrooms, a workspace and a living room to share.'],
    depa3: ['Tres dormitorios independientes, comedor para seis y una amplia terraza.', 'Three separate bedrooms, dining for six and a generous terrace.'],
  };
  const currentType = () => selected?.type || 'suite';
  const roomLabel = key => key === 'bedroom' && currentType() === 'estudio' ? L('Zona de descanso', 'Sleeping area') : L(...ROOM[key]);
  function renderInterior() {
    const type = currentType(), beds = feed.typologies[type].beds;
    $('#interior-type').textContent = feed.typologies[type].name[lang === 'es' ? 0 : 1] + (selected ? ` · ${L('Unidad', 'Unit')} ${selected.id}` : ` · ${L('Vista de ejemplo', 'Sample view')}`);
    $('#interior-description').textContent = L(...interiorCopy[type]);
    $$('[data-room]').forEach(b => {
      const key = b.dataset.room;
      b.hidden = key === 'bedroom2' && beds < 2 || key === 'bedroom3' && beds < 3;
      if (key !== 'overview') b.textContent = roomLabel(key);
    });
  }


  // Static text is already in the page language; site.js swaps it in place and announces the switch.
  function translate() {
    lang = document.documentElement.lang === 'en' ? 'en' : 'es';
    if (p) { renderStep(); list(); selection(); }
    clearHotspots();
    if ($('#architecture')) $('#architecture').setAttribute('aria-label', L('Modelo arquitectónico 3D. Arrastra para girar, usa las flechas o los botones de zoom.', '3D architectural model. Drag to rotate, use arrow keys or zoom buttons.'));
  }
  document.addEventListener('demo:language', translate);

  function sceneName() {
    const floor = +$('#floor').value, u = selected;
    if (step === 1) return `${L('PISO', 'FLOOR')} ${floor}` + (u && u.floor === floor ? ` · ${L('UNIDAD', 'UNIT')} ${u.id}` : '');
    if (step === 2) return (u ? `${L('UNIDAD', 'UNIT')} ${u.id} · ` : `${L('INTERIOR CONCEPTUAL', 'CONCEPT INTERIOR')} · `) + `${L('PISO', 'FLOOR')} ${u ? u.floor : floor}`;
    if (step === 3 && u) return `RESIDENCIA 01 · ${L('UNIDAD', 'UNIT')} ${u.id}`;
    return 'RESIDENCIA 01';
  }
  function renderStep() {
    renderInterior();
    const c = copy[step], offset = lang === 'es' ? 0 : 1;
    $('#step-label').textContent = c[offset];
    $('#step-title').textContent = c[2 + offset];
    $('#step-copy').textContent = c[4 + offset];
    $$('[data-step]').forEach(b => b.setAttribute('aria-current', String(+b.dataset.step === step)));
    ['building', 'unit', 'interior', 'contact'].forEach((key, i) => $(`#${key}-options`).hidden = i !== step);
    $('#previous').disabled = step === 0;
    $('#next').hidden = step === 3;
    $('#scene-name').textContent = sceneName();
    $('#floor-stepper').hidden = step !== 1;
    $('#floor-now').textContent = $('#floor').value;
    $('#scene-legend').hidden = step !== 1;
    $('#scene-hint').hidden = step === 1;
    $$('[data-room]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.room === room)));
  }
  function showScene() {
    if (matchMedia('(max-width:700px)').matches) $('#scene-wrap').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth', block: 'start'});
  }
  // Availability colours follow the same filters as the list.
  function states() {
    const beds = $('#bedrooms').value, available = $('#available').checked;
    paintStates = {};
    for (const u of p.units) {
      const match = (beds === 'all' || feed.typologies[u.type].beds === +beds) && (!available || u.status === 'disponible');
      paintStates[u.id] = match ? STATUS[u.status][2] : 'dim';
    }
    return paintStates;
  }
  // Keeps the 3D scene in step with the guided journey.
  function sync3d() {
    if (!engine || !p) return;
    const floor = +$('#floor').value;
    if (step === 2) {
      engine.focusFloor(null);
      engine.paint(null);
      engine.select(selected?.id ?? null, false);
      engine.setMode('interior', room);
      return;
    }
    engine.setMode('building');
    if (step === 1) {
      engine.paint(states());
      engine.focusFloor(floor);
      engine.select(selected?.id ?? null, selected?.floor === floor);
    } else {
      engine.paint(null);
      engine.focusFloor(null);
      engine.select(selected?.id ?? null, step === 3);
      if (step === 0 || !selected) engine.view();
    }
  }
  function go(index) {
    const next = Math.max(0, Math.min(3, index));
    step = next === 2 && engine && !engine.capabilities.interiors ? (next > step ? 3 : 1) : next;
    renderStep();
    clearTip();
    sync3d();
  }
  function list() {
    const floor = +$('#floor').value, beds = $('#bedrooms').value, available = $('#available').checked;
    const units = p.units.filter(u => u.floor === floor && (beds === 'all' || feed.typologies[u.type].beds === +beds) && (!available || u.status === 'disponible'));
    $('#unit-list').innerHTML = units.length
      ? units.map(u => `<button data-unit="${u.id}" aria-pressed="${selected?.id === u.id}"><div><b>${L('Unidad', 'Unit')} ${u.id}</b><span><i class="dot" data-state="${STATUS[u.status][2]}"></i>${typeName(u)} · ${status(u)}</span></div><b>${u.m2} m²</b></button>`).join('')
      : `<p class="empty">${L('No hay viviendas que coincidan. Prueba otro piso o filtro.', 'No matching homes. Try another floor or filter.')}</p>`;
    $$('[data-unit]').forEach(b => b.onclick = () => choose(b.dataset.unit));
  }
  function choose(id) {
    const unit = unitById(id);
    if (!unit || ($('#available').checked && unit.status !== 'disponible') || ($('#bedrooms').value !== 'all' && feed.typologies[unit.type].beds !== +$('#bedrooms').value)) return false;
    if (unit.type !== currentType()) { room = 'overview'; clearHotspots(); }
    selected = unit;
    $('#floor').value = String(unit.floor);
    list();
    selection();
    renderStep();
    if (!engine) return true;
    if (step === 1) { engine.paint(states()); engine.focusFloor(unit.floor); }
    engine.select(id, step === 1 || step === 3);
    return true;
  }
  // In step 02, tapping a unit in the model (its number, its dot or the unit itself) flies straight inside it.
  function enterUnit(id) {
    if (step !== 1) return choose(id);
    if (!choose(id)) return;
    room = 'overview';
    go(2);
    showScene();
  }
  function selection() {
    const e = $('#selected-home');
    if (!selected) {
      e.innerHTML = '';
      $('#enquire').textContent = L('Elegir un departamento →', 'Choose an apartment →');
      $('#enquire').href = '#main';
      $('#enquire').onclick = ev => { ev.preventDefault(); go(1); };
      return;
    }
    const u = selected, st = status(u);
    e.innerHTML = `<b>${p.name} · ${L('Unidad', 'Unit')} ${u.id}</b><span>${L('Piso', 'Floor')} ${u.floor} · ${area(u)} · ${st}</span>`;
    const a = $('#enquire');
    a.textContent = L('Preparar mi consulta ↗', 'Prepare my enquiry ↗');
    a.onclick = null;
    const params = new URLSearchParams({source: 'demo', unit: u.id, floor: String(u.floor), type: u.type, area: String(u.m2)});
    a.href = (lang === 'en' ? '/en' : '') + '/contacto/?' + params;

  }
  function changeFloor(value) {
    const floor = Math.max(2, Math.min(p.floors + 1, value));
    $('#floor').value = String(floor);
    list();
    renderStep();
    if (step === 1) engine?.focusFloor(floor);
  }

  if (p) {
    $('#floor').innerHTML = Array.from({length: p.floors}, (_, i) => `<option value="${i + 2}">${i + 2}</option>`).join('');
    $('#floor').value = '7';
    $('#floor').onchange = () => changeFloor(+$('#floor').value);
    ['bedrooms', 'available'].forEach(id => $('#' + id).onchange = () => { list(); if (step === 1) engine?.paint(states()); });
    $$('[data-floor-step]').forEach(b => b.onclick = () => changeFloor(+$('#floor').value + +b.dataset.floorStep));
    $$('[data-step]').forEach(b => b.onclick = () => { go(+b.dataset.step); showScene(); });
    $('#next').onclick = () => { go(step + 1); showScene(); };
    $('#previous').onclick = () => { go(step - 1); showScene(); };
    $$('[data-room]').forEach(b => b.onclick = () => enterRoom(b.dataset.room));
  }
  function enterRoom(key) {
    room = key;
    engine?.setMode('interior', room);
    renderStep();
    showScene();
  }

  /* ---------- Labels that follow points in the 3D scene ---------- */
  const wrap = $('#scene-wrap'), canvas = $('#architecture');
  const layer = document.createElement('div'), tip = document.createElement('div'), spots = new Map();
  layer.className = 'hotspots';
  tip.className = 'unit-tip';
  tip.hidden = true;
  tip.setAttribute('aria-hidden', 'true');
  wrap?.append(layer, tip);
  // Labels never drift away from the pointer: the idle orbit pauses while someone is over the scene.
  wrap?.addEventListener('pointermove', () => engine?.hold());
  wrap?.addEventListener('pointerdown', () => engine?.hold());
  const kindForStep = () => p ? ['amenity', 'unit', 'room', 'selected'][step] : 'amenity';
  function clearHotspots() { spots.forEach(el => el.remove()); spots.clear(); }
  function spot(key) {
    let el = spots.get(key);
    if (el) return el;
    const [kind, id] = key.split(':');
    el = document.createElement('button');
    el.type = 'button';
    el.className = `hotspot hotspot-${kind}`;
    let label = id;
    if (kind === 'amenity') { label = L(AMENITY[id][0], AMENITY[id][1]); el.dataset.side = AMENITY[id][2]; }
    if (kind === 'room') label = roomLabel(id);
    if (kind === 'selected') label = `${L('Tu hogar', 'Your home')} · ${id}`;
    if (kind === 'unit') {
      const u = unitById(id);
      el.setAttribute('aria-label', `${L('Unidad', 'Unit')} ${id}, ${u.m2} m², ${status(u)}`);
    }
    el.innerHTML = `<i aria-hidden="true"></i><span>${label}</span>`;
    el.onclick = () => {
      if (kind === 'amenity') engine?.focus(id);
      if (kind === 'unit') enterUnit(id);
      if (kind === 'room') enterRoom(id);
      if (kind === 'selected') engine?.select(id, true);
    };
    layer.append(el);
    spots.set(key, el);
    return el;
  }
  function renderHotspots(list) {
    const kind = kindForStep(), seen = new Set();
    for (const a of list) {
      if (!a.show || !a.key.startsWith(kind + ':')) continue;
      const el = spot(a.key), id = a.key.split(':')[1];
      seen.add(a.key);
      el.style.transform = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0)`;
      if (kind === 'unit') { el.dataset.state = paintStates[id] || 'dim'; el.setAttribute('aria-pressed', String(selected?.id === id)); }
      if (!el.classList.contains('is-on')) el.classList.add('is-on');
    }
    for (const [key, el] of spots) if (!seen.has(key) && el.classList.contains('is-on')) el.classList.remove('is-on');
  }
  function clearTip() { tip.hidden = true; if (canvas) canvas.style.cursor = ''; }
  function hoverUnit(id, x, y) {
    const u = id && unitById(id);
    if (!u) return clearTip();
    canvas.style.cursor = 'pointer';
    const b = wrap.getBoundingClientRect();
    tip.innerHTML = `<b>${L('Unidad', 'Unit')} ${u.id} · ${L('Piso', 'Floor')} ${u.floor}</b><span>${typeName(u)} · ${area(u)}</span><em data-state="${STATUS[u.status][2]}">${status(u)}</em><small>${L('Toca para entrar', 'Tap to step inside')}</small>`;
    tip.hidden = false;
    const left = Math.min(x - b.left + 16, b.width - tip.offsetWidth - 12), top = Math.min(y - b.top + 16, b.height - tip.offsetHeight - 12);
    tip.style.transform = `translate3d(${left}px,${top}px,0)`;
  }

  translate();
  if (!canvas) return;
  $$('[data-light]').forEach(b => b.onclick = () => { engine?.lighting(+b.dataset.light); $$('[data-light]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
  $$('[data-camera]').forEach(b => b.onclick = () => engine?.command(b.dataset.camera));
  function fallback() {
    const st = $('#scene-status');
    st.hidden = false;
    st.textContent = L('La vista 3D no está disponible en este navegador. Puedes continuar con el selector de viviendas y preparar tu consulta.', 'The 3D view is unavailable in this browser. You can continue with home selection and prepare your enquiry.');
    st.classList.add('is-error');
    canvas.dataset.ready = 'error';
  }
  // A page can show a client's building from a glTF package instead of the demo tower:
  // <canvas id="architecture" data-building="/buildings/<project>/building.json">.
  const manifest = canvas?.dataset.building;
  async function start(restored = false) {
    const building = manifest ? await GltfBuilding.load(THREE, manifest) : undefined;
    engine = Architecture.create(THREE, canvas, p ? id => { if (step === 1) enterUnit(id); else { go(1); choose(id); } } : null, {
      building,
      intro: !!p && !restored, orbit: !!p,
      units: p?.units,
      onReady: () => { const st = $('#scene-status'); st.hidden = true; st.classList.remove('is-error'); canvas.dataset.ready = 'true'; },
      onRender: renderHotspots,
      onHover: p ? hoverUnit : null,
    });
    // Without furnished plans there is no "La vida dentro": the journey goes from the apartment to the next step.
    $('[data-step="2"]')?.toggleAttribute('hidden', !engine.capabilities.interiors);
    const light = $('[data-light][aria-pressed="true"]');
    if (p) { go(step); if (restored && light) engine.lighting(+light.dataset.light); } else engine.lighting(+(light?.dataset.light ?? 2));
  }
  // Mobile browsers drop the GPU context when memory runs low or the tab is backgrounded.
  // Show the fallback while it is gone, then rebuild the scene where the visitor left it.
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback(); });
  canvas.addEventListener('webglcontextrestored', () => {
    try { engine?.dispose(); } catch { /* the old context is already gone */ }
    engine = null;
    start(true).catch(() => location.reload());
  });
  AlphaAssets.whenVisible(canvas, () => (manifest ? AlphaAssets.gltf() : AlphaAssets.three()).then(() => start()).catch(fallback));
  window.addEventListener('pagehide', e => { if (!e.persisted) engine?.dispose(); });
})();
