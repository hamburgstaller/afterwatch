# Roadmap

The first three sections record work delivered in versions 1.1.0, 1.2.0 and 1.3.0; subsequent sections are future proposals.

## Available in 1.1.0: TV, episodes, and languages

Movie, TVSeries, and TVEpisode metadata are supported, including local graph references and series/season relationships. Users can correct the media type, title, season, and episode. Ekşi offers series-wide and episode-specific searches; neither guarantees spoiler-free discussions. Letterboxd TV searches include an availability notice.

English remains the default interface, with Spanish, Portuguese, Italian, and Turkish available through a saved local preference. Media titles and destination-site content are not translated.

## Available in 1.2.0: platform settings and episode fallback

Letterboxd stays available. Settings can show or hide Reddit and Ekşi independently, with audience/language descriptions. Browser UI language supplies first-run suggestions. Saved choices take priority; existing users with a saved language keep Ekşi when upgrading. Reddit uses title or S01E02 discussion searches rather than guessing a community or thread URL.

Episode extraction includes same-page Review itemReviewed metadata and conservative recognized heading/path patterns. Missing or conflicting evidence still requires manual correction.

MUBI's verified current-film record supplies localized and original titles without translating them. Matching slugs/headings and size limits prevent unrelated page records from supplying alternatives.

## Available in 1.3.0: playback, YouTube, IMDb and platform ordering

Version 1.3.0 adds numeric MUBI player identity checks, separate player readers for major streaming layouts, and the observed Prime/Disney/Apple detail fixes. YouTube keeps raw upload titles and offers user-selected movie/episode title suggestions without an API or guessed season. See [STREAMING.md](STREAMING.md) for sources, evidence, and remaining authenticated/unpacked manual checks. Nested episode routes can corroborate a complete primary heading even without usable metadata.

Settings also lets users show/hide and reorder all four destinations, including Letterboxd and IMDb. IMDb supports movies, series and episodes with separate typed identities and title-search fallback. New installs enable it; upgrades retain saved choices with IMDb off. A versioned local preference preserves order and visibility, with migration from older settings. No new permission is required.

## Next: detection coverage and destinations

Add more fixtures from standard movie/TV detail layouts and improve ambiguous metadata handling. Consider additional discussion/review destinations suited to TV content. Add site-specific adapters only when standard metadata is insufficient, with scoped selectors and regression tests. External title lookup needs a separate privacy and API-usage design.

## Proposed: date-based navigation within a series discussion

For destinations that discuss episodes under a single series topic, prefer that main topic over assuming that every episode has its own topic. A future Ekşi action could find comments around a season premiere or an episode's first air date.

1. Resolve the series, season, and episode; use the episode's air date rather than the series' first-release year. Allow users to correct the date and discussion window.
2. Find the canonical series topic, then validate the destination's current date-filter and entry-link behavior before relying on it.
3. Where possible, combine a date window with episode-number or episode-title markers. Comments may be posted late, and multiple episodes can share one release date.
4. Link to a verified matching entry when available; avoid treating a stored page number as a permanent position. Fall back to the main topic or an explicit search if matching fails.

This would help users reach relevant discussion, but it cannot guarantee that a comment concerns the selected episode or is spoiler-free. Other destinations need their own navigation rules. External air-date lookup or destination-page processing requires a separate permission, privacy, and usage-terms design. Version 1.1.0 does not implement date lookup, filtering, or entry matching.

## Proposed: shared live rooms created on demand

A visitor should be able to join the same movie or episode room from any supported website. There is no need to preload a complete movie catalog.

1. The user explicitly chooses **Join live chat**.
2. Resolve a canonical media identity. Prefer a verified IMDb or media-provider ID; if only a title is available, ask the user to confirm a match. Title text or site URLs alone are not reliable room keys.
3. The server atomically finds or creates the room using a unique canonical key. An auto-incrementing internal room ID can coexist with that key.
4. Fetch and cache minimal display metadata on the first visit, subject to the provider's usage terms. Do not import entire streaming-site databases or video content.
5. Join the room through a secure WebSocket connection and exchange messages with other participants.
6. Keep the room record after everyone leaves; reconnect future visitors to the same room.

Example media keys:

```text
movie:imdb:tt4954522
tv:tmdb:1399
episode:tmdb:1399:s1:e1
```

Keys are examples of the design, not implemented endpoints. Movie, series, and episode IDs need separate namespaces.

### Service and storage

Use a small hosted backend (or a managed real-time service), a persistent database, and secure WebSockets. Suggested tables are `media`, `rooms`, and `messages`; room presence is temporary state with expiry. A unique index on the canonical media key prevents concurrent joins from creating duplicates.

Store only media that people actually visit. Show the ten most recently created rooms using `created_at`; distinguish this from recently active rooms using `last_activity_at` and from rooms with participants online now.

Persistent rooms do not require an always-open connection. Connections exist while people participate. Long-term room records still require hosting, backups, maintenance, and an explicit retention/deletion policy; retaining every message indefinitely should be a separate decision.

### Chat experience

A browser-action popup closes easily. A dedicated extension tab is a better initial home for a long-running conversation; a browser side panel could be considered later. Chat should be opt-in and must not silently read or transmit page comments or browsing history.

The first public chat version needs server-validated media identity and membership, message limits, rate limiting, reporting/blocking, and a way to moderate abuse. Separate show/episode rooms and clear spoiler labels are needed for TV support. A stable room does not mean moderation can never remove content or close a room.

Adding chat changes the current extension's network permissions/CSP and privacy model. Define them around the chosen backend only, keep service secrets on the server, and publish the updated data flow before release.

### Reference material

- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [TMDB: finding media through an external ID](https://developer.themoviedb.org/reference/find-by-id)
