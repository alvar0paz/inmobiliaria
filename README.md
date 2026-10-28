# Demo inmobiliaria · Andean Software Lab

Single immersive bilingual real estate demonstration at https://inmobiliaria.alvaropaz.com/.

## Routes
- `/` and `/propuesta/`: live 3D architecture introduction.
- `/proyecto/`: four-step guided journey: architecture, apartment selection, furnished interior and enquiry.
- `/pixel/` and `/comparar/`: compatible aliases of the same full experience. Old style parameters no longer select tiers.
- `/demo/` and `/proforma/`: retained local content-management and WhatsApp simulation, with all three example inventories. No external CRM or message delivery.
- `/como-funciona/`, `/nosotros/`, `/contacto/`: explanation, team and contact.

## Development
Run `python3 build.py`, then serve `dist/`. The active generator is `premium.py`; inventory and management markup come from `proforma.py`. Active visuals and navigation live in `dist/architecture.js`, `dist/premium.js` and `dist/premium.css`. The geometry uses the locally vendored Three.js r128 and shared keyboard/pointer controls. `dist/management.js` retains the management simulation.

`legacy-viewer/` preserves replaced viewer scripts outside the published directory. Previous raster assets are recoverable through Git history; no photographs, raster renders or image textures are published or loaded by the current experience.

## Validation
```
python3 tests/site-structure.test.py
node --test tests/architecture.test.cjs tests/asset-loader.test.cjs tests/viewer-controls.test.cjs
```
Browser QA covers responsive exterior/interior views, apartment selection, lighting, ES/EN, enquiry context and management updates.

## Boundaries
All architecture, projects, units, availability, prices and locations are illustrative. One shared apartment demonstrates navigation and furnishings; it is not an exact plan for every unit. Real geometry must be prepared from approved architectural drawings. Views use real-time geometry, not photorealistic offline renders or captured 360 photography.

Email links retain the chosen home and open a draft for the visitor to review and send. The manager and simulated WhatsApp assistant run only in-browser and reset on reload. No reservation, payment or external integration is active. Existing hostname aliases and public audience remain unchanged.
