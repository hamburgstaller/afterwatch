# Streaming detection — 1.3.0 review

Reviewed for version 1.3.0 on October 6, 2026. Detection depends on page-provided signals; this review does not guarantee every regional/account layout.

| Platform | Current source | Evidence and limits |
| --- | --- | --- |
| MUBI | Numeric player ID matched to current/legacy embedded film record; optional browser media title or explicit film/year page label | Reported player route covered by synthetic Chrome DOM checks. A signed-out live attempt redirected to the public detail page, so authenticated playback remains unverified. Original-title alternatives require the embedded record. |
| Netflix | Standard detail metadata; scoped player header or browser media title | Live Breaking Bad public detail exposes TVSeries metadata. Synthetic header, absent-title, stale-metadata and conflicting-header checks pass. Authenticated player not verified. |
| Prime Video / Amazon | Scoped player title/subtitle; single detail heading or title-art alt text; explicit episode tab | Live Fallout public detail uses a title image and episode tab. Synthetic detail and player checks pass, including localized routes. Missing type evidence does not imply movie. Regional Amazon domains are explicitly bounded. |
| Disney+ | Standard detail metadata with an agreeing heading; custom player metadata or browser media title | Live WALL-E public detail includes a promotional wrapper in Movie.name. Synthetic detail and MAIN-world reader checks pass. Authenticated player not verified; missing custom-element data falls back safely. |
| Apple TV | Canonical movie/show detail route and single heading; scoped player title/subtitle | Live Greyhound public detail has a heading but no Movie JSON-LD. Synthetic detail/player checks pass. Authenticated player not verified. |
| Max / HBO Max | Browser media-session title on recognized video route; current-page metadata where exposed | Synthetic browser media-session and stale-detail checks pass. Requires the site to expose a current title; authenticated player not verified. |
| Hulu | Scoped player title/subtitle or browser media title on a watch route | Synthetic checks pass. Authenticated player not verified. |
| Peacock | Explicit playback title fields or browser media title; playlist/live routes excluded | Synthetic checks pass. Authenticated player not verified. |
| Paramount+ | Existing Movie/TVEpisode JSON-LD tied to the active player page | Synthetic episode metadata check passes. Authenticated player not verified. No private catalog/API integration. |
| YouTube | Current-upload heading/video-bound Open Graph, then a bounded optional MAIN-world title read matched by video ID | Actual public TRT Haber watch heading and active upload ID inspected. Eight native Chrome DOM cases and 40 localized popup checks pass. Raw title is preserved; types and suggestions require user selection. No descriptions, comments, upload dates, or catalog API are read. Actual unpacked injection remains a manual check. |

These adapters extend page-local extraction. They do not add subscriptions, remote catalog calls, scraping services, broader host permissions, or watch-history storage. DOM selectors were informed by the open-source [PreMiD Activities integrations](https://github.com/PreMiD/Activities/tree/main/websites) and public page inspection. Their internal API-fetch implementations are not used by AfterWatch.

## Validation

- 168 Node regression tests pass, including exact-host/route gates, MUBI numeric/legacy identities and rejection cases, unknown-type navigation blocking in five languages, episode bounds, conflicting identities, Disney/YouTube read failures/navigation races, YouTube suggestions/restoration, platform ordering/migration/visibility, preserved manual edits, and distinct series/episode IMDb navigation identities.
- Release asset/syntax checks pass. Manifest/package both identify version 1.3.0; permissions and CSP are unchanged.
- Native Chrome checks pass on 21 synthetic DOM fixtures, including three MUBI player cases, and 35 popup scenarios across five languages. Player title/type/numbers, destination queries, no horizontal overflow, popup height at most 600px, and zero application page errors were checked.
- The existing 22 browser regression scenarios and 60 language/platform scenarios also pass, with zero application errors and a maximum normal popup height of 594px.
- YouTube adds eight native Chrome DOM cases and 40 popup checks across five languages. Raw/suggested titles, explicit type selection, absent seasons, navigation, restoration, language changes, inert hostile text, and normal popup geometry pass. The English suggestion screenshot was visually inspected. YouTube upload IDs are not film IDs, and numbered Turkish episodes may use absolute series numbering; users must confirm the selected season/episode interpretation.
- The earlier three-platform review passed 240 Chrome preview combinations. The current four-platform IMDb update passes 200 cases: all 24 orders with every destination enabled and all 16 enabled subsets in default order, across five languages. Separate IMDb navigation/edit/persistence checks pass in all five languages. Saved all-disabled choices remain disabled; legacy and version 1 settings migrate without enabling IMDb. Keyboard focus, matching DOM order, reload persistence, empty state, and popup bounds pass.
- Public Netflix, Prime Video, Disney+, and Apple TV detail layouts were inspected in the in-app browser. The minimal fixture shapes preserve only relevant DOM/metadata; playback fixtures are synthetic, not recordings of signed-in sessions.
- Actual unpacked-extension injection, authenticated playback, and Edge are still separate manual checks. Synthetic Chrome page evaluation and mocked popup APIs do not prove these.

## Manual checks before release

1. Reload the unpacked extension at chrome://extensions, then reload the MUBI film/player page if necessary. Confirm that the extension card displays version 1.3.0.
2. Open AfterWatch on the detail page and again during playback. For the reported numeric MUBI route, expect the current film title; original-title alternatives appear only if the record supplies them.
3. Try while playing, paused, and after revealing player controls. Reopening the popup performs a fresh read; it does not continuously monitor the page.
4. Switch to a different film or episode without closing the tab. Confirm that a previous title, IMDb identity, or episode number is not reused when current evidence is absent or contradictory.
5. On any platform with no type evidence, choose the content type explicitly. Missing season/episode numbers remain editable and an episode-specific search requires both.
6. Keep manual title entry usable on unsupported, login, missing-title, and failed-read pages. Browser media metadata and website fields remain untrusted page-provided information.
