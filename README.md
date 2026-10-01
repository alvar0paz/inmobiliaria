# Alpha Builders · Concept Studio

Bilingual website concept by Andean Software Lab (Martín Vélez Falconí and Alvaro Paz), prepared for private review with Alpha Builders.

## Included

- A stakeholder proposal page with Essential, Interactive and Immersive previews. The previews share one buyer navigation; their visual treatments retain the existing essential/editorial/immersive style identifiers.
- The High experience adds a cinematic arrival using Pixel renders, a detailed model with separating floors, and an illustrative furnished room with cutaway/eye-level cameras and morning/sunset/night lighting. The unit selector, filters, 2D links and existing render tour remain connected.
- Pixel follows one project journey in every option: facts, apartments, exploration, shared spaces, location and contact. Interactive adds the floor-plan selector; Immersive also offers an optional building model and panoramic visit. Enquiries retain the selected home type or apartment.
- About us page with both professional profiles and LinkedIn links.
- Quote page (`/proforma/`) with the brief's three design levels, each with a live demo: Basic (central manager + WhatsApp bot), Mid (2D elevation and floor plans) and High (3D model of the projects + virtual visits), plus the price table from section 11 of the brief.
- Spanish and English content, responsive layouts and locally stored images.

## Run locally

Requires Python 3; there are no package dependencies.

```sh
python3 build.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4173>. Serve the site from the domain root, since links and asset paths start with `/`.

Example: <http://127.0.0.1:4173/nosotros/?style=immersive&lang=es>.

## Editing

| File | Purpose |
| --- | --- |
| `build.py` | Shared navigation, proposal, team page and build entry point. |
| `directions.py` | Distinct home and Pixel page compositions, bilingual content and shared project viewer integration. |
| `dist/directions.css`, `dist/directions.js` | Responsive direction layouts, featured projects, reading order and enquiry context. |
| `proforma.py` | Quote page template, sample unit data and the `PRICING` values per level. |
| `dist/proforma.css`, `dist/proforma.js` | Quote page styles, demos, launch screen and Web Audio sound. |
| `dist/viewer-controls.js` | Shared pointer, pinch, wheel and keyboard controls for the 3D model and virtual visit. |
| `dist/vendor/three.min.js` | three.js r128 (MIT), served locally so the 3D works offline. |
| `dist/styles.css` | Shared styles and the three visual directions. |
| `dist/app.js` | Language and style switching, dialogs and guided journey. |
| `sector.py` | Shared bilingual EL SECTOR location section for all three visual directions. |
| `dist/sector-scene.js`, `dist/sector-map.js`, `dist/sector-map.css` | Instanced 3D streetscape, landmark selection, camera controls and responsive location design. |
| `scripts/render-sector-map.py` | Regenerate the static map fallback from the same geometry, without a browser (Node, Pillow and NumPy). |
| `dist/assets/` | Optimized project images, logos and profile portraits. |
| `asset-manifest.json` | Architectural image sources and reference notes. |
| `profile-sources.json` | Sources for the professional profiles. |
| `.openai/hosting.json` | Existing static hosting configuration. |

The complete `dist/` directory is tracked intentionally. Edit the CSS and JavaScript there directly; edit HTML through `build.py` and regenerate it. Publish `dist/` to a static host that supports directory index pages.

After building, run `python3 tests/site-structure.test.py` to check route targets, assets and shared viewer integration. Run the viewer gesture regression checks with `node --test tests/viewer-controls.test.cjs` (Node 18+). In the browser, check network/building selection, floor isolation, availability filters, apartment picking, the 2D/3D links, and tour navigation at desktop and mobile widths. The camera moves only on input; clicking a canvas enables wheel zoom, and Escape releases it. Floor controls appear only after selecting a building. Tour image failures show a retry action.

## Concept scope

The quote page uses illustrative units, prices, statuses and dates (labelled as sample data). The commercial quote is separate from demo inventory: `PRICING` in `proforma.py` holds the Basic / Mid / High offers at USD 36,000 / 42,000 / 48,000 before the provisional 15% VAT calculation. Values are rendered in HTML and can be adjusted temporarily during a presentation; reloading restores the published offer. The quote includes contacts, payment milestones, warranty, recurring costs and scope conditions. Its virtual visit wraps existing Pixel renders on a panoramic viewer; it is not 360 photography. The sound is synthesised in the browser and stays off until the visitor explicitly enables it.


This is a presentation prototype with five pages, not the full production platform. The arrival uses architectural images and transitions. The interactive building, furnished room and lighting are illustrative, not verified architectural plans, real circulation, accurate views or a solar study. EL SECTOR uses a locally rendered, interactive 3D diorama with a static fallback and a link to Google Maps. Pixel, Metro, Coral and the two avenue names come from Pixel’s original location diagram; surrounding massing, landscaping and distances are illustrative. The map dialog also preserves the original published image. There is no CMS or backend, and production prices, availability and project status require approved data.

Architecture, logos and reference images remain the property of their respective rights holders. They are included for private proposal review; see `asset-manifest.json`. The profile portraits come from the LinkedIn profiles supplied for the About us page.

The sector map loads WebGL as it approaches the viewport and renders only on interaction. Run `node --test tests/sector-map.test.cjs` for projection, landmark selection, language, camera, lazy rendering and WebGL fallback checks. To regenerate its image after editing the geometry, run `python3 scripts/render-sector-map.py`.

## Render-only imagery

All seven architectural and interior images are AI-generated photorealistic conceptual renders, created with the built-in image generation tool. Native PNG outputs are stored in `dist/assets/*-render.png` and used across all three design directions, arrival sequences and tour textures. Team cards use initials, not photographs. Logos and schematic maps are retained. Original references are archived in `reference-assets/`, outside the published directory.

Prompts and generation provenance are recorded in `render-prompts.json`. These visualizations are not verified architectural plans; bilingual captions identify them as conceptual AI renders.

Viewer backing buffers follow screen density up to 3×. Clamp wrapping and linear filtering avoid WebGL 1 downsampling; avoid image zoom effects or re-encoding generated files.

## Navigation and proposal previews

Start stakeholder reviews at `/propuesta/`: Overview, Compare options, and Investment & team. The Essential / Interactive / Immersive cards open the corresponding buyer preview using the existing `style` query parameter. `/proforma/` retains the full quote and operational demos; `/nosotros/` identifies the proposal team.

Buyer pages use one shared navigation with an advisor action. The project order is consistent across all styles: overview, apartments, optional plans/building exploration, shared spaces, location, contact. Mobile uses a labeled Menu and one bottom advisor action. Buyer pages contain a quiet return-to-proposal link, without proposal tier controls or duplicate section navigation.

The 2D plan is the default for Interactive and Immersive. The building model is optional within Immersive. Existing `/pixel/?demo=3d#demo-3d` links remain supported. Apartment selection carries across plan/model views and into the enquiry email with the unit, floor, type and area. No message is sent automatically.

Shared navigation lives in `build.py`, `dist/navigation.css` and `dist/navigation.js`. `proposal_page.py` authors the stakeholder page. Navigation, preview style preservation, ES/EN, enquiry context, keyboard menu behavior and 320–1440px layouts were checked in a local browser.
