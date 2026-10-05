# Release review — AfterWatch 1.1.0

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
