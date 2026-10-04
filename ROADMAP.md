# Roadmap

These are future proposals, not features of the current release.

## Next: TV and episode support

Read TVSeries and TVEpisode metadata where available. Identify a series separately from a season or episode, so conversations can have clear spoiler boundaries. Show the detected media type and allow users to correct ambiguous matches. Add site-specific adapters only when standard metadata is insufficient.

## Later: language and destinations

Keep English as the default interface. Add Turkish through a localization layer rather than duplicating popup logic. Consider other discussion/review destinations that make sense for the selected media type.

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
