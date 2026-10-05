# Changelog

## 1.2.0 — 2026-10-05

- Suggest MUBI's page-provided original title as an alternative while preserving the page's localized primary title. Validate the film slug and heading; ignore unrelated or missing records.

- Add a settings view to show or hide Reddit and Ekşi Sözlük independently. Letterboxd stays available.
- Explain each platform's audience and language in all five interface languages.
- Add Reddit title searches, using S01E02 notation for episode-specific searches; never guess a subreddit or thread URL.
- Use the browser UI language for first-run defaults. Keep Ekşi for existing users with a saved language, and preserve saved platform choices when the interface language changes.
- Store only language and enabled-platform preferences locally. Preserve manual choices during loading and serialize preference writes.

- Read Review itemReviewed media metadata when its URL identifies the active page.
- Fill missing series titles and season/episode numbers from recognized episode headings on pages with episode metadata.
- Support Turkish season/episode labels, S01E02, 1x02, and English, Spanish, Portuguese, and Italian labels.
- Use matching episode path patterns as a fallback for known series; ignore query parameters and fragments.
- Keep structured identities and numbers when page signals disagree. Episode fallback uses no hostname-specific rules or new permissions.
- Add regression tests and an incomplete-metadata preview scenario.

The locally prepared 1.1.1 fix was not published separately; it is included in 1.2.0.

## 1.1.0 — 2026-10-05

- Add TVSeries and TVEpisode detection, local graph references, and series/season relationships.
- Separate series and episode titles, with editable media type and season/episode numbers.
- Offer series-wide and episode-specific Ekşi searches, including season-zero specials.
- Use series-title search for TV content on Letterboxd and explain its catalog limitations.
- Add Spanish, Portuguese, Italian, and Turkish UI catalogs; English remains the default.
- Save only the interface language locally, adding the storage permission.
- Preserve user edits during slow detection and language loading; serialize preference writes.
- Keep destination buttons visible through a compact header and scrollable selection panel.
- Expand regression tests and add synthetic TV pages for local extension testing.

## 1.0.3 — 2026-10-04

- Detect separately displayed alternative titles through page structure and matching movie metadata, without a hostname allowlist.
- Ignore unrelated, ambiguous, or rating-only secondary headings.
- Use Movie metadata as the source of IMDb identity; ignore unscoped page links.
- Describe supported pages in general terms and use a neutral regression fixture.

## 1.0.2 — 2026-10-03

- Use AfterWatch as the working name and a fully English interface.
- Explain that Ekşi Sözlük discussions are in Turkish.
- Translate all project documentation and add MIT licensing and contribution guidance.
- Record TV/episode support, later Turkish localization, and on-demand shared rooms in the roadmap.

## 1.0.1 — Local development build

- Separate localized and alternative titles; fix Mezar / Raw detection.
- Preserve title numbers and meaningful parentheses.
- Read structured movie data and allow title correction.
- Navigate to Letterboxd using an IMDb ID, with title search as a fallback.
- Improve error handling, accessibility, click locking, and input timing.
- Add strict CSP, dependency-free tests, and a local preview.

## 1.0 — Initial prototype

- Extract and clean titles from the active page.
- Open Ekşi Sözlük and Letterboxd searches.
