# Demo inmobiliaria · tnkoo Software Lab

Single immersive bilingual real estate demonstration at https://inmobiliaria.alvaropaz.com/.

## Routes
- `/` and `/propuesta/`: live 3D architecture introduction.
- `/proyecto/`: four-step guided journey: architecture, apartment selection, furnished interior and enquiry.
- `/pixel/` and `/comparar/`: compatible aliases of the same full experience. Old style parameters no longer select tiers.
- `/proforma/`: printable commercial offer starting at US$997.99 including IVA, sharing its scope and price with the homepage through `commercial.py`.
- `/demo/`: retained local content-management and WhatsApp simulation, with all three example inventories. No external CRM or message delivery.
- `/como-funciona/`, `/nosotros/`, `/contacto/`: explanation, team and contact.

## The 3D experience
- **Arrival:** a loader replaces the blank canvas; the neighbourhood rises, the tower's floors stack into place and the camera sweeps to the hero view. The homepage starts on the finished tower with a fixed, unobstructed composition. The guided tour retains slow orbit and pauses while the pointer is over it.
- **Setting:** gradient sky, hazy Andean ridges with a snow-capped volcano, a fictional low-rise city, street, lawns and lamps. Fog joins the ground to the horizon.
- **01 Architecture:** gold hotspots (rooftop pool, sky garden, terraces, lobby) fly the camera to each detail.
- **02 Apartment:** the chosen floor opens: levels above lift and turn translucent, units are coloured by availability and filters, and numbered chips, hover cards, the list and the in-scene floor stepper all select the same unit.
- **03 Life inside:** the camera approaches the chosen unit, fades and enters the furnished apartment placed at that floor's height, so window and terrace views change with the floor. Room hotspots and buttons glide between rooms.
- **04 Next step:** a portrait of the building with the chosen home highlighted.
- **Lighting:** morning, sunset and night blend over 1.5 s; at night windows, lobby, roof edge, street lamps, interior lamps and stars light up.
- `prefers-reduced-motion` turns off the arrival, orbit, pulses and fades; every change applies instantly.

Static geometry is merged per material (about 190 draw calls instead of about 3,000), which keeps continuous animation smooth on phones.

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
Website implementation starts at US$997.99 including IVA. The starting scope covers one project, up to two supplied compatible apartment models and 100 units, two consolidated review rounds, 10 business days after deposit and approved materials, and 30 days of in-scope bug fixes. 50% deposit and 50% before launch, based on the accepted personalised quote. Modelling amounts include IVA: USD539.08–898.46 per furnished type, USD898.46–1,796.92 for exterior/grounds, and up to USD2,336 for an exterior plus two types. The complete website + modelling package is capped at USD3,333.99 including IVA for the published scope, subject to approved-plan review and agreed simplification where required. Hosting, domain, licences, custom furniture, photorealistic renders and external integrations remain outside that scope. The demo still illustrates all four apartment types.

## Database preview
After building, apply the generated `drizzle/0000_keen_tempest.sql` once to local D1 with the Sites starter command. Publishing applies hosted migrations. Never commit `.wrangler`, `.sites-runtime`, local database records or credentials.
