# Sarvesh Gandhi — resume redesign options

Five single-page A4 redesigns of the original resume. Each option ships as a self-contained HTML file (fonts embedded), a PDF, and a PNG preview.

| # | Option | Layout | Type | Accent |
|---|--------|--------|------|--------|
| 01 | Navy Sidebar | Two columns, dark sidebar with contact / skills / education / leadership; experience on the right | Inter | Navy + gold |
| 02 | Editorial Serif | Classic single column with a two-column footer | Playfair Display + Source Serif 4 | Burgundy |
| 03 | Timeline Teal | Two columns; experience on a vertical timeline, skills as chips | Manrope | Teal |
| 04 | Impact Header | Full-width header band + four headline metrics, then two columns | IBM Plex Sans + Plex Mono | Forest green |
| 05 | Swiss Mono | Black and white grid, label column on the left, key numbers highlighted | Inter + Plex Mono | Yellow marker |
| JD | Tailored: Platform & Integrations | Impact Header layout with content rewritten for the Senior PM, Platform & Integrations JD. See `JD-FIT-senior-pm-platform-integrations.md` | IBM Plex Sans + Plex Mono | Forest green |

## Editing

Content lives in `build/data.py`; layouts and styles in `build/build.py`. To regenerate:

```
python3 build/build.py <out-dir>          # writes the HTML files
NODE_PATH=$(npm root -g) node build/render.js <out-dir>   # renders PDFs/PNGs, auto-scales to one A4 page
```

Rendering needs Playwright with Chromium and the Google Fonts TTFs listed in `build.py` (downloaded into `../fonts`).

The tailored variant is built with `RESUME_DATA=data_jd RESUME_ONLY=04 RESUME_PROJECTS_MAIN=1 RESUME_PREFIX=sarvesh-resume-tailored-platform-pm`.
