# Alpha Builders · Concept Studio

Bilingual website concept by Andean Software Lab (Martín Vélez Falconí and Alvaro Paz), prepared for private review with Alpha Builders.

## Included

- Three homepage experiences: Essential is a compact project catalogue, Editorial tells architectural stories, and Immersive offers a cinematic project selector.
- Pixel carries each direction through a complete project journey. Essential prioritizes facts and home types; Editorial adds the 2D floor selector; Immersive leads into the 3D model and panoramic visit. Home type enquiries carry their context into the contact section.
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
| `dist/assets/` | Optimized project images, logos and profile portraits. |
| `asset-manifest.json` | Architectural image sources and reference notes. |
| `profile-sources.json` | Sources for the professional profiles. |
| `.openai/hosting.json` | Existing static hosting configuration. |

The complete `dist/` directory is tracked intentionally. Edit the CSS and JavaScript there directly; edit HTML through `build.py` and regenerate it. Publish `dist/` to a static host that supports directory index pages.

After building, run `python3 tests/site-structure.test.py` to check route targets, assets and shared viewer integration. Run the viewer gesture regression checks with `node --test tests/viewer-controls.test.cjs` (Node 18+). In the browser, check network/building selection, floor isolation, availability filters, apartment picking, the 2D/3D links, and tour navigation at desktop and mobile widths. The camera moves only on input; clicking a canvas enables wheel zoom, and Escape releases it. Floor controls appear only after selecting a building. Tour image failures show a retry action.

## Concept scope

The quote page uses illustrative units, prices, statuses and dates (labelled as sample data). The commercial quote is separate from demo inventory: `PRICING` in `proforma.py` holds the Basic / Mid / High offers at USD 36,000 / 42,000 / 48,000 before the provisional 15% VAT calculation. Values are rendered in HTML and can be adjusted temporarily during a presentation; reloading restores the published offer. The quote includes contacts, payment milestones, warranty, recurring costs and scope conditions. Its virtual visit wraps existing Pixel renders on a panoramic viewer; it is not 360 photography. The sound is synthesised in the browser and stays off until the visitor explicitly enables it.


This is a presentation prototype with four pages, not the full production platform. The optional journey uses architectural images and transitions; it is not a navigable 3D model or a verified representation of circulation inside the building. The map is a reference image with a link to Google Maps. There is no CMS or backend, and production prices, availability and project status require approved data.

Architecture, logos and reference images remain the property of their respective rights holders. They are included for private proposal review; see `asset-manifest.json`. The profile portraits come from the LinkedIn profiles supplied for the About us page.
