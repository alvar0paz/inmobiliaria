# Alpha Builders · Concept Studio

Bilingual website concept by Martín Vélez Falconí and Alvaro Paz, prepared for private review with Alpha Builders.

## Included

- Brand homepage with three visual directions: Essential, Editorial and Immersive.
- Pixel project page with quick information, a location widget and an optional guided journey.
- About us page with both professional profiles and LinkedIn links.
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
| `build.py` | Page templates and bilingual content; generates the three HTML pages. |
| `dist/styles.css` | Shared styles and the three visual directions. |
| `dist/app.js` | Language and style switching, dialogs and guided journey. |
| `dist/assets/` | Optimized project images, logos and profile portraits. |
| `asset-manifest.json` | Architectural image sources and reference notes. |
| `profile-sources.json` | Sources for the professional profiles. |
| `.openai/hosting.json` | Existing static hosting configuration. |

The complete `dist/` directory is tracked intentionally. Edit the CSS and JavaScript there directly; edit HTML through `build.py` and regenerate it. Publish `dist/` to a static host that supports directory index pages.

## Concept scope

This is a presentation prototype with three pages, not the full production platform. The optional journey uses architectural images and transitions; it is not a navigable 3D model or a verified representation of circulation inside the building. The map is a reference image with a link to Google Maps. There is no CMS or backend, and production prices, availability and project status require approved data.

Architecture, logos and reference images remain the property of their respective rights holders. They are included for private proposal review; see `asset-manifest.json`. The profile portraits come from the LinkedIn profiles supplied for the About us page.
