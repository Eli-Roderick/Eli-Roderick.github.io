## Mock Google-like SERP for Eye-Tracking Research

A static React + Tailwind web app that renders Google-like search results pages from JSON configs for controlled experiments. No Google logos or copyrighted assets are used.

### Features
- AI Overview box (toggleable via JSON)
- Organic results and ad-styled results (clearly labeled "Ad")
- About ~10 results per page
- Click-through opens target in a new tab
- Experimenter controls: pick query, next/prev, randomize/sequential order, download CSV log
- In-memory click logging with CSV export (timestamp, sessionId, query, url)
- Config-driven content; add/modify JSON without code changes
- Service worker for basic offline use after first load

### Tech Stack
- React 18, Vite
- Tailwind CSS 3

---

## Getting Started

1) Install dependencies
```bash
npm install
```

2) Run dev server
```bash
npm run dev
```
Open the shown localhost URL in your browser.

3) Build for static hosting
```bash
npm run build
npm run preview
```

You can host `dist/` on any static host. The app runs offline after first load thanks to a simple service worker.

---

## App Structure
- `index.html` – Vite entry
- `src/` – React code
  - `App.jsx` – experimenter header/controls, config selection, logging
  - `pages/SearchPage.jsx` – page layout for a single query
  - `components/AIOverview.jsx` – AI summary card
  - `components/SearchResult.jsx` – organic result
  - `components/AdResult.jsx` – ad-styled result
  - `utils/configLoader.js` – dynamic fetch of JSON configs
  - `utils/logger.js` – in-memory logger + CSV export
  - `index.css` – Tailwind directives and SERP-like styles
- `public/configs/` – JSON config files (loaded at runtime)
- `public/sw.js` – simple offline cache

---

## Configuration: Adding/Editing Queries

Configs live under `public/configs/`. At minimum you need:
- `public/configs/index.json` – array of objects with `label` and `path` fields, e.g.

```json
[
  { "label": "Best hiking boots", "path": "/configs/query1.json" },
  { "label": "Healthy breakfast ideas", "path": "/configs/query2.json" }
]
```

- One JSON file per query (e.g., `public/configs/query1.json`) with shape:

```json
{
  "query": "best hiking boots",
  "aiOverview": { "show": true, "text": "AI summary here" },
  "results": [
    { "title": "Result title", "url": "https://example.com", "snippet": "Short description...", "ad": false },
    { "title": "Shop ...", "url": "https://store.example/", "snippet": "...", "ad": true }
  ]
}
```

Notes:
- Toggle AI Overview by setting `aiOverview.show` true/false; text is sourced from `aiOverview.text`.
- Control order simply by ordering the `results` array; include `ad: true` to render with ad styling.
- The UI renders the first ~10 results per page.

---

## Logging & Export

- Every outbound click is recorded in-memory with `{ timestamp, sessionId, query, url }`.
- Use the "Download CSV" button in the header to save the current session as a CSV.
- Optional backend: You can later POST `logger.events` to a Node.js endpoint to persist logs.

---

## Offline Use

After first load, the service worker caches core assets and the config index so the app can run offline. If you add new configs, users should revisit once online to refresh the cache.

---

## Cross-Browser Support

Tested with latest Chrome, Firefox, and Edge. For best fidelity, ensure fonts are available; the app uses a system sans-serif stack.

---

## License
For research use only. No Google assets are included.