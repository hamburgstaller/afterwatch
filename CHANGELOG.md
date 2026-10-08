# Changelog

## 1.4.0 — 2026-10-08

- Exchange selected and alternative page titles in place. The clicked option becomes the previous selected title, supports repeated switching and keeps keyboard focus. Other aliases and manually entered episode fields are preserved; typed custom text is not represented as page-provided metadata. YouTube's separate suggestion/restoration flow is retained.
- Explain ambiguous media, unavailable player/video titles, unreadable metadata, conflicting episode/IMDb information and content changes during extraction. Keep actionable explanations visible outside the scrolling selection panel in all five languages.
- Identify missing title/type/season/episode fields and invalid numeric ranges. Refresh explanations after manual correction, preserve read/open failure messages, and expose invalid fields accessibly. Series search remains available without episode numbers.
- Keep diagnostic reasons in popup memory only. No guessed confidence percentage, external catalog verification, telemetry, saved diagnostic history or new permission is introduced.
- Add the selected mint AW monogram with a play triangle inside the A. Include its editable, font-independent SVG source and 16, 32, 48 and 128 pixel PNG exports.
- Set the extension and toolbar icons in the manifest and display the same mark in the README. The icon adds no permission or behavior changes.

## 1.3.0 — 2026-10-06

- Detect episodes when a single primary heading agrees with a nested series/season/episode route, even if JSON-LD is malformed and Open Graph is absent. Keep conflicts, articles, movies and incomplete labels out of this fallback. Clean Turkish dotted-I watch suffixes without changing meaningful title words. No title/ID/year is guessed from malformed data.
- Add optional, orderable IMDb navigation for movies, TV series and episodes, with descriptions in all five languages. New installations enable IMDb; upgrades preserve existing choices with IMDb off.
- Keep series and episode IMDb identities separate. Use one matching typed metadata ID for direct navigation, otherwise a title search; episode scope adds explicit S01E02 numbers. Edited titles/types/numbers cannot reuse a previous episode identity. Missing numbers require correction; search results are not verified matches.
- Upgrade platformSettings to version 2 for four destinations. Preserve valid version 1 visibility and order, including all-disabled choices, and append IMDb without enabling it. Bound longer destination lists with scrolling.
- Let users enable/disable Letterboxd, enabled by default, alongside Reddit and Ekşi. Show a helpful empty state when all platforms are disabled and block hidden destinations in their event handlers.
- Add accessible up/down controls to arrange all four platforms. Settings and destination DOM order match; disabled platforms keep their position, and keyboard focus remains on the moved platform.
- Save visibility and order together in a versioned local platformSettings preference. Migrate old discussion choices once with Letterboxd enabled; preserve later explicit disable choices. Delayed loading and queued writes preserve manual edits and untouched saved choices/order.

- Add YouTube upload-ID-bound DOM and optional MAIN-world title readers. Preserve raw video titles and offer selectable movie/episode title suggestions in all five languages; restore the original title at any time.
- Require a content-type choice on YouTube until a suggestion or manual choice is selected. Leave absent seasons empty, never infer release dates from upload dates, and never use video IDs as movie identities.
- Reject stale/conflicting YouTube records and navigation races. Do not read descriptions, recommendations, comments, account data, or streaming data; no API key or network lookup is added.
- Separate platform playback selectors into local adapter readers with shared validation/fallback, and prevent conflicting player controls from falling back to stale structured titles.

- Recognize MUBI's numeric film-player route and validate the current embedded film by its ID, including the legacy Next.js record location. Keep localized/original titles and reject conflicting or stale records.
- Read scoped playback titles on Netflix, Prime Video/Amazon, Apple TV, Hulu, and Peacock. Use browser media-session titles on recognized playback pages, including Max and Disney+, when available.
- Read Disney's current custom-player title/subtitle once in the MAIN world; no page changes, timers, network requests, or additional permissions.
- Separate playback detection from potentially stale detail-page metadata. Never infer titles from slugs/IDs or classify an unknown player title as a movie. Require an explicit content-type choice when necessary.
- Recognize bounded, explicit episode labels in player subtitles without inventing missing numbers.
- Fix observed public detail-page cases: Prime title artwork and episode tabs, agreeing Disney promotional title wrappers, and Apple movie/show routes with a canonical content identifier.
- Add detection, popup, race, privacy, and failure regressions. Authenticated playback still needs manual verification; see [streaming validation](STREAMING.md).

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
