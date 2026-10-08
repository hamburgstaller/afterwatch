# Security

## Current boundaries

- Detection explanations render only bundled, recognized messages via textContent. Parsing errors contribute a boolean rather than raw error text; page data cannot inject a message. Diagnostic codes are not stored or sent externally. Existing title, type, episode and destination validation still governs navigation.
- Manifest V3 with `activeTab`, `scripting`, and `storage` permissions. Storage is used only for local language and platform visibility/order preferences.
- No remote scripts, runtime dependencies, `eval`, `innerHTML`, or background service. Translations are bundled as a local script.
- Page titles are untrusted text. The popup uses `textContent` and input `value`; destination URLs encode the selected title.
- Destination origins are fixed HTTPS URLs for Reddit, Ekşi Sözlük, Letterboxd, and IMDb. Platform preferences accept only supported identifiers; arbitrary destination URLs are not accepted. Disabled platforms cannot open through their event handlers.
- The platformSettings schema accepts version 2, a unique enabled subset, and an exact permutation of the four supported platforms. Valid version 1 settings are migrated without changing saved visibility/order, appending disabled IMDb. Order and visibility are saved together, never interpreted as URLs or executable text. All destination handlers wait for preference restoration and reject disabled platforms.
- Movie IMDb IDs are accepted only from actual IMDb hostnames and `/title/tt…` paths. Conflicting IDs disable direct identity navigation.
- TV content always uses title search on Letterboxd, without mixing episode and movie IMDb identities. Episode numbers are bounded integers; season zero is allowed for specials.
- IMDb navigation uses separate typed series and episode identities from URL, sameAs or @id metadata. Conflicting IDs or an ID shared between series and episode disable the affected direct routes. Title/type changes drop direct identity use; episode-number changes drop episode identity use. Parent-series identity is never substituted for an episode ID. Missing IDs use encoded title search, not catalog lookup or guessed IDs. Episode scope needs explicit numbers.
- JSON-LD processing has size, depth, and item limits. Malformed JSON does not prevent other detection methods from working.
- Graph references use a bounded local index, never a network fetch. Recommendations and episode lists are ignored; ambiguous main entities require manual entry.
- With no usable type metadata, episode inference requires a single complete primary heading corroborated by a recognized nested series/season/episode pathname. Names and both bounded numbers must agree; recognized article/movie types take precedence. Path slugs cannot supply titles alone, malformed JSON is not repaired or executed, and absent dates/episode names/identities remain absent.
- The CSP allows local scripts and blocks object embedding, network connections, form submission, and base URL overrides.
- Player adapters require exact supported hostnames and playback routes or explicit player markers. Marketing/login pages and recommendations cannot supply player titles. Playback ignores unbound detail metadata that can become stale after single-page navigation.
- MUBI player records must match the numeric route ID. Conflicting current/legacy records are rejected. Browser/player text never supplies an IMDb ID; unknown types require user selection and incomplete episode numbers remain empty.
- Disney's custom player is read once with a small self-contained MAIN-world function. No script tag, event listener, timer, network call, or persistent page modification is installed. Only bounded title/subtitle text and the pathname cross back into popup memory; the two reads must agree on the pathname. The page can still provide misleading text, so this is not independent catalog verification.
- YouTube's optional MAIN-world reader returns only an upload ID and a bounded title. The ID must match the active watch parameter or supported player pathname; duplicate/malformed IDs, mismatched records, and conflicting title sources are rejected. Only exact YouTube hosts are accepted, and all other query values remain outside the returned data. Its DOM reader is scoped to the current upload, never recommendation headings.
- YouTube's title cleaning and episode parsing create selectable suggestions, not independently verified movie identities. Raw titles remain restorable. Unknown types require a user choice, missing seasons stay empty, and upload dates/descriptions cannot supply catalog identities or dates.

A page can supply misleading media information. The extension does not independently verify it against a catalog. Users can inspect and edit the title, content type, and episode numbers. Ekşi topics, Reddit threads, and Letterboxd catalog mappings are not guaranteed. Reddit searches do not invent community or thread URLs. Episode searches do not filter spoilers.

## Reporting

Use [private vulnerability reporting](https://github.com/hamburgstaller/afterwatch/security/advisories/new) for security-sensitive findings. Do not post sensitive data or exploit details in a public issue. Ordinary bugs can be reported through [GitHub issues](https://github.com/hamburgstaller/afterwatch/issues).

The source review and automated checks are not an independent penetration test or security certification.
