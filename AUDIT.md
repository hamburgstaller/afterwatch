# Release review — October 4, 2026

## Findings and improvements

The original prototype contained three files. The following issues were fixed, and additional failure cases introduced by editable input were covered.

| Area | Finding | Current behavior |
| --- | --- | --- |
| Detection | The heading joined localized and alternative names: Mezar Raw | Separate titles; an alternative with a release year is preferred when the main heading agrees with movie metadata |
| Cleaning | All short numbers and all parenthetical text were removed | Numbers and meaningful parentheses are preserved |
| False positives | Any short nonempty heading was treated as a movie | Requires Movie/video.movie evidence; heading structure alone is insufficient |
| Identity | Letterboxd always searched by name | Uses one unambiguous IMDb ID when available |
| Errors | Opening failures were not handled | Errors are caught; manual entry remains usable |
| Correction | The detected title could not be edited | Editable title and page-title alternatives |
| Input timing | Slow detection could overwrite new input | User-entered text is preserved |
| Repeated clicks | Pending navigation could be triggered repeatedly | Buttons are locked until tab creation finishes |
| Stale details | Editing to a different movie left the detected year visible | Unrelated metadata is cleared |
| Interface | One-platform branding and decorative buttons | Two destinations, clear actions, English interface |
| Accessibility | Limited input labeling and status feedback | Input label, live status, visible focus, reduced-motion support |
| Privacy | Minimal permissions were good but undocumented | Permissions remain minimal; privacy/security documentation added |

No obvious critical vulnerability was found in the initial source review. Plain-text rendering and encoded URLs were already good choices; the updated build adds validation and a restrictive CSP.

## Validation evidence

- A supplied movie detail page was inspected live. Its heading contained a localized title and a separately marked alternative title: `<h1>Mezar izle <small>Raw (2016)</small></h1>`, Movie.name=Mezar, IMDb=tt4954522.
- The page's JSON-LD date was 2017, while its alternative heading showed 2016. The heading's year is preferred for display.
- `https://letterboxd.com/imdb/tt4954522/` redirected live to `https://letterboxd.com/film/raw-2016/`.
- Letterboxd's search form and Films filter exposed `/search/films/{title}/`.
- The Raw search on Ekşi redirected to `raw--60673`. That topic includes non-film entries as well as movie discussions.
- Automated tests cover titles, the Raw regression, malformed JSON, graph/mainEntity extraction, ambiguity, lookalike domains, URL encoding, and simulated popup API failures.
- Final automated result for version 1.0.3: **36 tests passed, 0 failed**.
- Alternative-heading detection now depends on page structure and matching movie metadata, with no hostname allowlist. Tests cover different hosts, unrelated headings, missing movie metadata, ratings, and multiple alternative headings.
- IMDb identity comes only from the selected Movie metadata's URL or sameAs fields, not unrelated page links.
- Browser preview checks covered destination buttons, manual correction to 1917, restricted-page fallback, and HTML-looking titles remaining plain text. No application console errors were observed in the previous preview checks.
- The project owner reported that the actual Chrome extension worked well on several known pages. Their report does not specify each page or cover every edge case.
- Version 1.0.3 generalizes alternative-heading detection. Real Chrome testing should be repeated briefly after reloading this build.
- The final English browser preview was checked for IMDb navigation and manual 1917 title search; generated URLs were correct and no application console errors were recorded.
- `npm run check` passed: matching versions, manifest description length, English popup, expected local scripts/assets, MIT license, and JavaScript syntax.
- A production ZIP was built with only `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `film.js`, and `LICENSE`; its contents were inspected. Development files and fixtures are excluded.

## Public repository readiness

- [x] English interface, manifest description, README, privacy/security documents, changelog, and contribution guide.
- [x] MIT license and matching package metadata.
- [x] Minimal production permissions and no embedded secrets or external runtime packages.
- [x] CI workflow to run `npm test` with read-only repository permissions.
- [x] TV/episode support and live chat explicitly documented as future work.
- [x] AfterWatch was selected by the project owner after reviewing existing [afterwatch.app](https://afterwatch.app/about) and [afterwatch.net](https://www.afterwatch.net/) services. This does not establish exclusive use of the name.
- [ ] Quick manual check of version 1.0.3 in Chrome.
- [x] Public GitHub repository created: [hamburgstaller/afterwatch](https://github.com/hamburgstaller/afterwatch).
- [x] Private vulnerability reporting enabled and its repository setting verified.

## Broader release checks

- [ ] Real Edge loading and permission checks.
- [ ] More fixtures for movie pages, listings, articles, and unsupported pages.
- [ ] Store icons, screenshots, and store description if a store release is planned.

The current extension remains movie-focused. It does not translate arbitrary titles, automatically support every website, or implement a server, live chat, accounts, or TV episode detection.
