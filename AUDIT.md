# Release review — AfterWatch 1.3.0

Reviewed and approved for publication by the project owner on October 6, 2026. Manifest and package both identify version 1.3.0. This release combines playback and YouTube detection, nested episode fallback, platform ordering and IMDb support.

MUBI numeric-player/legacy-record detection, scoped streaming-player title fallbacks, explicit unknown-type selection, and the observed Prime/Disney/Apple public-detail fixes are implemented. YouTube adds an upload-ID-bound reader, user-selected title/episode suggestions, and raw-title restoration. This release also adds platform ordering, optional Letterboxd and IMDb movie/TV/episode navigation. Series and episode identities are separate; edits or ambiguous metadata cannot reuse an old episode ID. IMDb falls back to title search without guessing catalog matches. 168 Node tests and syntax/assets checks pass. Streaming/YouTube browser checks are recorded below. Permissions and CSP are unchanged; Disney and YouTube have separate one-time bounded MAIN-world metadata readers. No new permissions or runtime dependencies are required.

The four-platform review passed 200 native Chrome preview scenarios: all 24 orders with every platform enabled, plus all 16 enabled subsets with the default order, across five languages. Destination/settings DOM order, endpoint buttons, checkbox state, no horizontal overflow, and popup height at most 600px were checked. Separate IMDb checks in each language verify parent-series versus exact-episode routes, changed-number fallback, missing-number blocking, moved-platform focus, visibility/order persistence after reload, and localized copy. English Settings and Turkish IMDb destination screenshots were visually inspected. Node tests also cover legacy/version 1 migration, explicit all-disabled settings, malformed schemas, slow restoration, serialized writes, and disabled event-handler guards. These checks use simulated Chrome APIs; unpacked loading remains a separate manual check. The earlier three-platform review passed 240 combinations before IMDb was added.

A subsequent nested-episode regression verifies a malformed JSON-LD page with no Open Graph: the primary heading and typed nested route agree on the series, season and episode. Native Chrome extraction and five localized popup scenarios pass, including all four destination queries, zero application errors and popup bounds. Node cases reject conflicting names/numbers, multiple headings, article/movie signals, malformed paths and incomplete labels. Turkish dotted-I watch suffixes are handled explicitly. No episode name, release year or identity is inferred from invalid metadata.

Authenticated players could not be inspected in the available signed-out browser. MUBI redirected to a public film page; Netflix, Prime, Disney, and Apple public details were inspected. Synthetic player checks are not live account verification or unpacked-extension loading. Exact sources, limitations, and the remaining manual checks are documented in [STREAMING.md](STREAMING.md).

The prior 22 browser regression scenarios and 60 language/platform scenarios also passed again, with zero application errors and normal popup height no greater than 594px.

---

# Archived release review — AfterWatch 1.2.0

Reviewed and approved for publication by the project owner on October 5, 2026. This feature release follows 1.1.0; the local 1.1.1 episode fix is included rather than published separately.

## Current behavior and boundaries

- Letterboxd is always available. Settings independently enables or disables Reddit and Ekşi, including disabling both discussion buttons. Each platform has an audience/language description translated into all five interface languages.
- Reddit navigation is a fixed-origin HTTPS search, with the selected title plus discussion, and S01E02 notation for episode searches. There is no guessed subreddit, thread ID, or automatic posting. Existing Ekşi search and Letterboxd movie identity behavior remain available.
- New installations use the supported browser UI language, with English fallback. Turkish initially selects Ekşi; other languages initially select Reddit. Existing saved-language users keep Ekşi when upgrading. Saved platform choices take priority over browser or interface language.
- Only language and enabledPlatforms are saved locally. Invalid stored platform identifiers cannot create arbitrary destinations. No geolocation, additional permissions, backend, or runtime dependencies were added.
- Preferences use serialized partial writes so language and platform updates do not overwrite each other. Late preference loading does not replace manual choices. Discussion buttons wait until preferences finish loading; Letterboxd remains independent. Storage failures show localized feedback and keep the current choice usable.
- Settings supports Back, Escape, labelled checkboxes, focus return, and preserved title/episode fields. A bounded selection panel keeps the three destination buttons within normal Chrome popup dimensions.
- Episode metadata/heading/path improvements from the local 1.1.1 fix remain included. Missing or contradictory evidence cannot fill unknown fields by inventing values; page-provided metadata is not independently verified.
- MUBI's current-film record is read from a size-limited page-embedded script only on a matching film URL, with agreement between the film slug and heading. The localized title remains primary and its supplied original title becomes an alternative. Identical names are deduplicated; missing, unrelated, malformed, or oversized records do not supply alternatives. No title is translated or inferred from a URL slug.

## Validation

- 94 Node regression tests passed, zero failed. Coverage includes upgrade/default selection, independent language/platform choices, both/all-disabled platforms, slow loading and writes, storage failures, malformed preferences, fixed Reddit URLs, validated episode searches, MUBI localized/original names and rejection cases, and all previous detection/security regressions.
- npm run check passed: matching 1.2.0 metadata, a 131-character manifest description, local production scripts, required assets, MIT license, and syntax checks.
- Chrome 154.0.8037.98 checks passed: 60 scenarios spanning five languages, movie and two episode states, and all four platform combinations. First-run choices, localized Settings, search queries, saved restoration, no horizontal overflow, and maximum popup height of 594px were verified.
- The previous 20 localized popup scenarios and two synthetic DOM collector checks also passed. No application page/console errors were recorded. Turkish Settings and English three-platform screenshots were visually inspected.
- Additional MUBI checks read the actual page's film record in the in-app browser, validated the unmodified serialized collector in native Chrome against Turkish/English synthetic DOM fixtures, and exercised the actual film record in the popup. Selecting Crimes of the Future changed both destination searches correctly; the Turkish popup screenshot was visually inspected. In-app read-only inspection substituted heading access for DOM cloning and used the observed ASCII slug without URI decoding; native fixture checks used the production collector unchanged.
- Production packaging contains only manifest.json, popup.html, popup.css, popup.js, film.js, i18n.js, and LICENSE. Development code and fixtures are excluded. SHA-256: `819fafd9376dd720e6ac70d9ed5068f45e0121481484b3e4a0cb7b7f638c3e62`.

## Publication and remaining checks

Source documentation, the extension description, and release notes describe selectable global/Turkish destinations. The project owner explicitly approved publishing the reviewed source, updated GitHub About text, v1.2.0 tag, and production ZIP. The manual checks and documented limitations remain applicable.

Reload the unpacked extension, confirm version 1.2.0, and check platform persistence in the real popup. Browser preview checks simulate Chrome APIs and do not verify unpacked loading or real permissions; Edge remains unverified. Search result language, catalog availability, thread matching, and spoiler exclusion cannot be guaranteed. No external catalog or date-based discussion lookup is implemented.

The earlier reviews below are historical evidence, not publication approval for 1.2.0.

---

## Archived local review — AfterWatch 1.1.1 (not published separately)

Prepared locally on October 5, 2026. Superseded by the 1.2.0 feature release preparation.

- Fixed episode metadata nested inside Review itemReviewed when the reviewed URL identifies the current page. Unrelated reviews, recommendation lists, and comments are not traversed.
- Added conservative heading/path fallbacks on pages already identified as episodes. Recognized labels separate the series title from season and episode numbers; matching URL slugs supply numbers only for a known series. Conflicting page signals cannot replace structured identity or numbers.
- Validated the reported live episode page with the serialized collector: Breaking Bad, season 1, episode 1. The same page also worked after removing structured media candidates to exercise the Open Graph/heading/path fallback. No hostname adapter was added; public regression tests use a neutral domain.
- 76 Node regression tests passed with zero failures. npm run check passed with matching version 1.1.1 and unchanged permissions/CSP.
- Chrome 154.0.8037.98 browser checks passed: the previous 20 localized popup scenarios and two synthetic DOM pages, plus the live collector result in the production popup in all five languages. Expected episode-specific Ekşi URLs, filled fields, no page errors, no horizontal overflow, and a maximum popup height of 594px were verified.
- The Turkish popup screenshot was visually inspected. Live checks used an isolated browser context and did not access the owner's browser profile.
- The local production ZIP contains only manifest.json, popup.html, popup.css, popup.js, film.js, i18n.js, and LICENSE. SHA-256: `41e68774337814963bf5d251a62773a30da8640c5f7014062562816816ca6cc6`.
- Privacy documentation now describes reading only the URL pathname for episode detection. Query parameters and fragments are excluded from that signal, and the pathname is neither stored nor included in destination URLs.

Reload the unpacked extension and confirm version 1.1.1 before manually checking a real episode page. Automated popup checks simulate Chrome APIs; actual extension loading and Edge remain unverified. Detection still requires recognizable media evidence and can require manual correction on unsupported or ambiguous pages. No external catalog lookup, date-based discussion navigation, or new permissions were added.

The following archived review documents the previously published 1.1.0 release; its publication approval does not cover this patch.

---

## Archived release review — AfterWatch 1.1.0

Prepared locally on October 4, 2026. The project owner approved publication as version 1.1.0 on October 5, 2026.

## Implemented behavior

- Movie, TVSeries, and TVEpisode JSON-LD detection, with Open Graph movie/TV fallbacks.
- Bounded local graph indexing for relative/absolute @id references, mainEntity, partOfSeries, partOfTVSeries, and partOfSeason. No network lookup.
- Series titles stay separate from episode names and season/episode numbers. A missing parent title requires manual entry.
- Editable content type and episode numbers; season zero is allowed for specials.
- Series-wide Ekşi searches by default, with an optional episode search using Turkish season/episode labels. These are searches, not verified discussion-topic links or spoiler filters.
- Letterboxd movie IMDb navigation remains available. TV content uses series-title search with an explicit catalog limitation notice, never an episode IMDb redirect.
- English remains the default UI; Spanish, Portuguese (Brazilian wording), Italian, and Turkish are selectable. Media titles are not translated.
- Only the selected language is saved through chrome.storage.local. The new storage permission is documented in README, PRIVACY, and SECURITY.

## Regression findings handled

| Area | Risk | Implemented handling |
| --- | --- | --- |
| Identity | Using an episode name as a series name | Parent series metadata is required; otherwise manual series entry |
| Graphs | Treating parent series and episode as two unrelated titles | Explicit mainEntity and parent relationships select the intended media |
| Graphs | Duplicate records or cyclic/unresolved references | Dedupe candidates, bound traversal, resolve within the page only |
| Ambiguity | Guessing between multiple unrelated titles | Keep manual entry when no single main entity exists |
| TV navigation | Sending a TV episode IMDb ID to a movie destination | Restrict direct IMDb navigation to detected movies |
| Episode search | Missing, negative, fractional or hostile number values | Validate bounded integers and block only the episode-specific Ekşi search |
| Editing | Keeping old identity or episode details after correction | Clear incompatible details and use title search when identity no longer matches |
| Detection timing | Overwriting manual title/type edits | Preserve user-entered values while detection is pending |
| Language timing | Late saved preference overwriting a new choice | User selection takes priority over pending preference loading |
| Language writes | Rapid changes saving an older preference last | Serialize writes and show localized save failures |
| Navigation timing | Repeated clicks or language changes during navigation | Keep destination buttons locked until tab creation completes |
| Interface | TV controls and translations extending the popup | Compact header, keyboard-focusable scroll panel, visible scrollbar, wrapped route text |
| Rendering | HTML-looking metadata becoming executable | Use textContent/value, fixed destination origins and URL encoding |

## Validation evidence

- 67 Node regression tests passed, 0 failed, including existing Raw/Mezar and numeric-title cases, serialized collection, TV relationships, ambiguity, URL safety, translations, Chrome API errors, and timing behavior.
- npm run check passed: matching version 1.1.0, 130-character manifest description, local scripts including i18n.js, MIT license, required files, and JavaScript syntax.
- Automated browser checks used Chrome 154.0.8037.98 with an isolated test context, without accessing the owner's browser profile.
- The actual serialized collector was run against two synthetic DOM pages: a series and an episode with graph references. Titles and episode numbers were correct.
- 20 localized popup scenarios covered five languages and movie, series, episode, and missing-series states. Labels, edited searches, Letterboxd TV fallback, and selected-language persistence were checked.
- Additional browser checks covered manual episode correction on a restricted-page simulation, season-zero searches, and hostile-looking input remaining plain text.
- No application page or console errors were recorded in those browser scenarios. No horizontal overflow occurred at 360px width; production popup height was checked against 600px for the normal scenarios.
- The production ZIP is prepared locally with only manifest.json, popup.html, popup.css, popup.js, film.js, i18n.js, and LICENSE. Development fixtures and preview scripts are excluded.
- ZIP contents and version were inspected. SHA-256: `60b21756b93e959e5b356e8fdf187bbbabbe43b9fc1714484a405fd280fa3eef`.
- Public source and release files were checked for the previously removed site branding; the domain-specific adapter has not been reintroduced.

Browser screenshots and machine-readable review results are local development artifacts, not runtime files. Automated browser preview checks simulate Chrome APIs; they do not verify real extension loading or permissions.

## Remaining limits and manual checks

- Reload the unpacked extension in Chrome and confirm version 1.1.0, its storage permission, language persistence after closing the real popup, and one series/episode page. Local synthetic pages are available at http://127.0.0.1:4173/fixtures/series and /fixtures/episode while the preview server runs.
- Real Edge installation and permission behavior remain unverified. Firefox and Safari are not supported/verified.
- Metadata-free, login-restricted, ambiguous, or nonstandard pages may need manual entry. Season and episode numbers cannot always be recovered automatically.
- This does not translate titles or fetch a movie/TV catalog. Destination entries and discussion topics are not guaranteed.
- Letterboxd's current FAQ does not promise general returning-TV support: https://letterboxd.com/about/faq/ . TV title search may return no result.
- Episode search does not filter spoilers; series-wide discussions may reveal later episodes.
- No server, accounts, live chat, or watch-history storage was added. This review is not an independent security certification.

## Publication approval

The owner approved publishing the reviewed feature work, source commit, v1.1.0 tag, and production ZIP. The manual checks and limitations above remain documented. Date-based Ekşi discussion navigation is a future roadmap item, not a feature of this release.

## References

- TV episode metadata: https://schema.org/TVEpisode
- TV series metadata: https://schema.org/TVSeries
- Extension preference storage: https://developer.chrome.com/docs/extensions/reference/api/storage
- Letterboxd catalog and identity URLs: https://letterboxd.com/about/faq/
