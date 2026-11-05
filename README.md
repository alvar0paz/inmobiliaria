# Demo inmobiliaria · tnkoo Software Lab

Single immersive bilingual real estate demonstration at https://inmobiliaria.alvaropaz.com/.

## Routes
- `/` and `/propuesta/`: live 3D architecture introduction.
- `/proyecto/`: four-step guided journey: architecture, apartment selection, furnished interior and enquiry.
- `/pixel/` and `/comparar/`: compatible aliases of the same full experience. Old style parameters no longer select tiers.
- `/proforma/`: printable fixed-scope page + exterior building offer at US$2,999.99 including IVA, sharing its scope and price with the homepage through `commercial.py`.
- `/demo/`: retained local content-management and WhatsApp simulation, with all three example inventories. No external CRM or message delivery.
- `/como-funciona/`, `/nosotros/`, `/contacto/`: explanation, team and contact.

## The 3D experience
- **Arrival:** a loader replaces the blank canvas; the neighbourhood rises, the tower's floors stack into place and the camera sweeps to the hero view. The homepage starts on the finished tower with a fixed, unobstructed composition. The guided tour retains slow orbit and pauses while the pointer is over it.
- **Setting:** gradient sky, hazy Andean ridges with a snow-capped volcano, a fictional low-rise city, street, lawns and lamps. Fog joins the ground to the horizon.
- **01 Architecture:** gold hotspots (rooftop pool, sky garden, terraces, lobby) fly the camera to each detail.
- **02 Apartment:** the chosen floor opens: levels above lift and turn translucent, units are coloured by availability and filters, and numbered chips, hover cards, the list and the in-scene floor stepper all select the same unit.
- **03 Life inside:** the camera approaches the chosen unit, fades and enters the furnished apartment in its real position on that floor. The whole floor is shown cut away: corridor, two lifts, the stair and the five neighbouring homes as unfurnished shells, with the levels below still visible and everything above removed. Room hotspots and buttons glide between rooms; window and terrace views change with the floor.
- **04 Next step:** a portrait of the building with the chosen home highlighted.
- **Lighting:** morning, sunset and night blend over 1.5 s; at night windows, lobby, roof edge, street lamps, interior lamps and stars light up.
- **Realism:** the sky (haze band, sun halo, clouds) is baked into a prefiltered environment map, so materials get soft sky light and glass, water and metal reflect it. Plaster, paving, asphalt, grass, wood and the neighbouring blocks (windows, rooftop plant, lit rooms at night) carry procedural shader detail evaluated in object space — still no image files. Trees are lumpy multi-clump canopies on forked trunks; a street grid and parkland frame the site; exponential haze provides aerial perspective. On desktop WebGL2 the scene renders through a 4× MSAA buffer with bloom and a light vignette; phones, WebGL1 and GPUs that drop below ~30 fps keep the direct render. Screen-space ambient occlusion was removed: at interior distances it produced noisy halos and dashed edges.
- `prefers-reduced-motion` turns off the arrival, orbit, pulses and fades; every change applies instantly.

Static geometry is merged per material (about 195 draw calls instead of about 3,000), which keeps continuous animation smooth on phones.

## Typical floor
28 × 18.2 m plate with a central corridor. Front row (street side): 01 suite (7.6 m), 02 two-bed (10 m), lift core (4.2 m), 03 studio (6.2 m). Back row: 04 studio, 05 three-bed (12 m), 06 suite, stair (2.2 m). Unit widths, depths and 1.95 m terraces come from the same plans used for the furnished interiors (`PLANS`, `FLOOR` and `SLOTS` in `public/architecture.js`), so the exterior, the step-02 floor and the step-03 apartment are one consistent model.

## Development
Run `python3 build.py` to generate pages in `public/`, then `npm run dev` for the full site (including D1-backed enquiries). `npm run build` creates the Worker and assets in ignored `dist/`. Use the Sites build and publishing helpers for deployment. The active generator is `premium.py`; inventory and management markup come from `proforma.py`. Active visuals and navigation live in `public/architecture.js`, `public/premium.js` and `public/premium.css`. The geometry uses the locally vendored Three.js r128 and shared keyboard/pointer controls. `public/management.js` retains the management simulation.

`legacy-viewer/` preserves replaced viewer scripts outside the published directory. Previous raster assets are recoverable through Git history; no photographs, raster renders or image textures are published or loaded by the current experience.

## Validation
```
python3 tests/site-structure.test.py
node --test tests/architecture.test.cjs tests/asset-loader.test.cjs tests/viewer-controls.test.cjs tests/enquiries.test.mjs
```
`tests/architecture.test.cjs` covers unit coverage, floor opening, availability colours, apartment height, hotspot projection, night lighting and the draw-call budget. Browser QA covers responsive exterior/interior views, apartment selection, lighting, ES/EN, enquiry context and management updates.

## Boundaries
All architecture, projects, units, availability, prices and locations are illustrative. Four distinct conceptual apartment types demonstrate navigation and furnishings; they are not exact plans for real units. Real geometry must be prepared from approved architectural drawings. Views use real-time geometry, not photorealistic offline renders or captured 360 photography.

The contact form posts to `/api/enquiries`, saves to D1 and confirms a reference only after persistence. Selected demo unit and type accompany the enquiry. `/consultas/` is restricted to the authenticated site owner (alvarop3000@gmail.com). It lists saved leads and offers email reply links; automatic email notifications are not configured. Anonymous users cannot read enquiries. Rate limits, a honeypot, consent, length limits and idempotent retries protect submissions. Local and hosted databases are separate. The manager and simulated WhatsApp assistant run only in-browser and reset on reload. No reservation, payment or external integration is active. Existing hostname aliases and public audience remain unchanged.

## Commercial scope
One flagship package at US$2,999.99 including IVA: one ES/EN project landing page, one custom exterior building model from approved drawings, rotation/zoom/agreed hotspots, project information/amenities/location, an enquiry form, mobile adaptation and two consolidated revision rounds. Building size, façade complexity and immediate surroundings are agreed in writing before acceptance. Schedule is confirmed after drawing review before deposit. 50% deposit and 50% before launch; 30 days of in-scope bug fixes. Interiors, apartment selection, live inventory, integrations, extra buildings, detailed landscaping, photorealistic renders and ongoing updates are quoted separately. Hosting, domain and external licences are excluded. There is no global cap for extras. The demo shows optional capabilities beyond the package.

## Database preview
After building, apply the generated `drizzle/0000_keen_tempest.sql` once to local D1 with the Sites starter command. Publishing applies hosted migrations. Never commit `.wrangler`, `.sites-runtime`, local database records or credentials.
