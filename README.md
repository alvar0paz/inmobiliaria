# Demo inmobiliaria · Andean Software Lab

Reusable bilingual sales demonstration for real estate developers, published at https://inmobiliaria.alvaropaz.com/.

## Experience

- `/propuesta/`: developer-facing introduction, customer journey and pilot contact.
- `/comparar/`: Essential, Interactive and Immersive experiences.
- `/?style=essential|editorial|immersive`: fictional developer portfolio.
- `/proyecto/`: fictional Residencia 01 with floor plans, apartment selection, 3D building, rendered tours and selected-unit enquiry context.
- `/demo/`: local management simulation, illustrative WhatsApp conversation and 2D/3D tools.
- `/como-funciona/`: explanation of the possible data and integration flow.
- `/nosotros/` and `/contacto/`: Andean Software Lab team and email contact.

Legacy `/pixel/` and `/proforma/` routes remain compatible, serving the neutral project and tools pages. No fixed service quotation, tax identifiers, client-specific contract terms, original developer logos, sales contacts or external project tours are published. The old custom hostname remains attached to the same updated site.

## Development

Buildless deployment; Python generates HTML into tracked `dist/`:

```
python3 build.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
python3 tests/site-structure.test.py
node --test tests/asset-loader.test.cjs tests/viewer-controls.test.cjs tests/sector-map.test.cjs
```

Edit HTML in `build.py`, `proposal_page.py`, `directions.py`, `proforma.py`, `technical_page.py`, `contact_page.py`, `sector.py` and `spatial.py`. Shared CSS and browser scripts live in `dist/`. Static hosting identity stays in `.openai/hosting.json`.

## Demo boundaries

Residencia 01/02/03, units, dates, availability, streets and prices are fictional examples. Images are AI-generated architectural concepts, not approved plans. The panorama uses 2D renders; it is not captured 360 photography. Building geometry and interiors are illustrative.

The manager and WhatsApp assistant run locally, reset on reload and do not send messages or connect to a production CRM. Enquiry links open an email to Alvaro, with the chosen example unit where applicable; visitors submit it themselves. Production scope and pricing are defined per project. New 3D, 360 or render production is evaluated separately from integrating existing assets.

## Asset provenance

`render-prompts.json` retains original render provenance. `rebrand-image-provenance.json` records the built-in image-generation edit used to remove signage from the demo exterior. Published asset: `dist/assets/residencia-exterior-render.png`. Original logos and the branded location image were removed from `dist/`. `scripts/render-sector-map.py` generates the unbranded map fallback from the same Three.js geometry with fictional labels.
