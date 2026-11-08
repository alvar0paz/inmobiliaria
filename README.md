# Demo inmobiliaria · tnkoo Software Lab

Single immersive bilingual real estate demonstration at https://inmobiliaria.alvaropaz.com/.

## Routes
Every page exists in Spanish at `/…/` and in English at `/en/…/`, with `hreflang` alternates and a canonical URL.
- `/`: live 3D architecture introduction and the commercial offer.
- `/proyecto/`: four-step guided journey: architecture, apartment selection, furnished interior and enquiry.
- `/proforma/`: printable fixed-scope page + exterior building offer at US$2,999.99 including IVA, sharing scope and price with the homepage through `site/sections/commercial.mjs`.
- `/demo/`: local content-management and WhatsApp simulation with three example inventories. No external CRM or message delivery.
- `/como-funciona/`, `/nosotros/`, `/contacto/`, `/privacidad/`: explanation, team, contact form and privacy notice.
- `/propuesta/`, `/pixel/` and `/comparar/` were duplicates; they now redirect permanently (301) to `/` or `/proyecto/`. Old `?lang=en` links redirect to the `/en/` page.
- Unknown URLs get a branded 404 in the visitor's language.


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
```
npm ci
npm run pages   # regenerate public/**/index.html and public/_headers from site/
npm run dev     # full site with D1-backed enquiries
npm test        # node:test suites in tests/
npm run lint
npm run build   # regenerates pages, then builds the Worker and assets into ignored dist/
```
Everything is JavaScript/TypeScript on Node 22; there is no Python step.

- `site/` generates the static pages. `site/build.mjs` holds the page shell and routes; `site/sections/` the commercial offer, contact form, management panel and privacy notice; `site/data/demo-data.json` the illustrative inventory. Text is written once as `t('español', 'English')`; the build renders the Spanish page and derives its English twin (`toEnglish` in `site/lib/html.mjs`). Generated pages are committed because the Worker bundles them; CI fails if they are stale.
- `public/site.css` is the only stylesheet (sections are listed at the top of the file). Fonts are self-hosted in `public/fonts/` (SIL OFL) and preloaded.
- Browser scripts in `public/`: `site.js` on every page (in-place language switch that also moves the URL between `/x/` and `/en/x/`, print button); `asset-loader.js`, `viewer-controls.js`, `architecture.js` and `premium.js` only on the two pages with a 3D view (`three.min.js` is fetched lazily when the viewer scrolls into view); `enquiry.js` on the contact page; `management.js` on `/demo/`.
- Caching: every script and stylesheet is referenced with `?v=<content hash>`, the fonts and the engine are versioned too, so `public/_headers` lets browsers and the CDN keep them for a year. Pages always revalidate, so a publish is visible immediately.
- `app/` is the Worker: `[[...path]]/route.ts` serves pages, retired-URL redirects and the 404; `api/enquiries/route.ts` saves leads to D1; `consultas/route.ts` is the private inbox.
- If the GPU context is lost (common on phones when memory is short), the viewer shows a notice and rebuilds the scene in place when the context returns, keeping the visitor's step and selected unit.


## Validation
```
npm run lint && npm test
```
`tests/site.test.mjs` checks the generated site: routes in both languages, link and fragment targets, English titles/descriptions/canonical/hreflang, which scripts each page loads, one stylesheet with self-hosted fonts, versioned assets and their cache headers, the tour data and the privacy links. `tests/architecture.test.cjs` covers unit coverage, floor opening, availability colours, apartment height, hotspot projection, night lighting and the draw-call budget; `tests/enquiries.test.mjs` the lead API (validation, idempotent retries, rate limit, short references, inbox owner). CI (`.github/workflows/ci.yml`) runs lint, the page-freshness check, tests and the production build on every push and pull request.

## Portability
The site is published on OpenAI Sites, which runs it as a Cloudflare Worker with static assets and a D1 database. Only two things are platform-specific:
- Owner sign-in for `/consultas/`: the platform authenticates visitors and passes `oai-authenticated-user-*` headers, checked in `ownerAllowed` (`lib/enquiries.mjs`). The owner defaults to `DEFAULT_OWNER_EMAIL` and can be changed with an `OWNER_EMAIL` variable.
- Deployment config: `.openai/hosting.json` (project and D1 binding) and the Sites build helpers in `scripts/`. `vite.config.ts` pins the Worker name so renaming the package does not create a new deployment.

To move to a plain Cloudflare account: create a D1 database and apply `drizzle/0000_keen_tempest.sql`, deploy `dist/` with `wrangler deploy --config dist/server/wrangler.json` after setting the real `database_id`, and replace the header check in `ownerAllowed` with Cloudflare Access (or remove `/consultas/` and export leads from D1). Pages, assets, the form API and the 3D viewer need no changes.


## Boundaries
All architecture, projects, units, availability, prices and locations are illustrative. Four distinct conceptual apartment types demonstrate navigation and furnishings; they are not exact plans for real units. Real geometry must be prepared from approved architectural drawings. Views use real-time geometry, not photorealistic offline renders or captured 360 photography.

The contact form posts to `/api/enquiries`, saves to D1 and confirms a short reference (`ASL-XXXX-XXXX`) only after persistence. The privacy notice at `/privacidad/` describes exactly what is stored; keep it in step with `lib/enquiries.mjs`. Selected demo unit and type accompany the enquiry. `/consultas/` is restricted to the authenticated site owner (see Portability). It lists saved leads and offers email reply links; automatic email notifications are not configured. Anonymous users cannot read enquiries. Rate limits, a honeypot, consent, length limits and idempotent retries protect submissions. Local and hosted databases are separate. The manager and simulated WhatsApp assistant run only in-browser and reset on reload. No reservation, payment or external integration is active. Existing hostname aliases and public audience remain unchanged.

## Commercial scope
One flagship package at US$2,999.99 including IVA: one ES/EN project landing page, one custom exterior building model from approved drawings, rotation/zoom/agreed hotspots, project information/amenities/location, an enquiry form, mobile adaptation and two consolidated revision rounds. Building size, façade complexity and immediate surroundings are agreed in writing before acceptance. Schedule is confirmed after drawing review before deposit. 50% deposit and 50% before launch; 30 days of in-scope bug fixes. Interiors, apartment selection, live inventory, integrations, extra buildings, detailed landscaping, photorealistic renders and ongoing updates are quoted separately. Hosting, domain and external licences are excluded. There is no global cap for extras. The demo shows optional capabilities beyond the package.

## Database preview
After building, apply the generated `drizzle/0000_keen_tempest.sql` once to local D1 with the Sites starter command. Publishing applies hosted migrations. Never commit `.wrangler`, `.sites-runtime`, local database records or credentials.
