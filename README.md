# AfterWatch

**You've watched it. Now join the conversation.**

A small browser extension that takes you from a movie, series, or episode page to discussions on **Reddit** or **Ekşi Sözlük**, reviews on **Letterboxd**, and movie/TV ratings on **IMDb**. Check the detected title and content type, adjust them if needed, and choose where to go next.

[Download the extension](https://github.com/hamburgstaller/afterwatch/releases/latest) · [Source and issues](https://github.com/hamburgstaller/afterwatch)

Version 1.3.0 adds IMDb, platform ordering, optional Letterboxd, playback detection and YouTube title suggestions. The interface supports English, Spanish, Portuguese, Italian and Turkish. Shared live rooms remain a future idea, documented in [ROADMAP.md](ROADMAP.md).

## Features

- Reads standard `Movie`, `TVSeries`, and `TVEpisode` JSON-LD, including local `@id` references, `mainEntity`, and series/season relationships. Open Graph movie/TV types provide a fallback.
- Separates localized and alternative titles when a supported heading layout agrees with the page's media metadata.
- Reads MUBI's embedded current-film record only when its slug and title match the film page and heading. Keeps the page's localized title first and offers its supplied original title as a selectable alternative. The original title is not necessarily English; no translation or external title lookup is performed.
- Preserves numbers and meaningful parentheses in titles, including `1917`, `Blade Runner 2049`, and `12 Angry Men`.
- Lets you edit the title, choose the content type, or select another title found on the page.
- Lets you show or hide platforms in Settings. Letterboxd and IMDb are optional, and up/down arrows to arrange all four platforms. Letterboxd is enabled by default; new installations also enable IMDb. Existing saved selections and order are retained, with IMDb initially off on upgrades. Disabled platforms keep their position. Only supported destinations can be enabled; custom site URLs are not supported.
- Describes each platform's audience and language in Settings. These labels describe the destination, not the user's detected country.
- Keeps a series title separate from an episode title and its season/episode numbers. Reads Review itemReviewed metadata only when the reviewed item's URL identifies the active page.
- Fills missing episode information from recognized headings such as `Show 1. Sezon 2. Bölüm`, `Show S01E02`, or `Show Season 1 Episode 2` on pages with episode metadata. Matching path patterns can supply numbers for a known series. Conflicting signals or unrecognized formats require manual correction.
- Handles nested paths such as `/dizi/example-show/sezon-1/bolum-2/`. Without usable metadata, it requires a single complete primary heading whose series name and both numbers agree with the typed route. Invalid JSON-LD is ignored; absent episode names, dates or IDs are not invented. Article/movie signals prevent this fallback.
- Offers series-wide or episode-specific Ekşi searches. Episode searches use the series title plus Turkish season/episode labels; season zero is supported for specials. Search results and spoiler-free topics are not guaranteed.
- Searches Reddit by title and the word `discussion`, using `S01E02` notation for an episode search. Searches do not identify a verified thread or subreddit and do not guarantee English results or spoiler-free discussion.
- Starts new installations in a supported browser UI language, falling back to English. Turkish initially enables Ekşi; other languages initially enable Reddit. Existing users with a saved language keep Ekşi when upgrading, unless they already chose platforms. Language changes never change platform choices. Portuguese uses Brazilian wording; media titles and destination-site content are not translated.
- Opens the Letterboxd movie page using one unambiguous IMDb ID from Movie metadata, or searches films by title. TV content uses a series-title search with an explicit availability notice.
- Stops using the old movie IMDb ID when you change the title or content type.
- IMDb opens an unambiguous identity from typed media metadata. Series and episode identities remain separate. An episode's scope chooses the parent series or exact episode; without an ID it searches by title, adding explicit S01E02 numbers for episode scope. Missing numbers block episode search. Changing title/type or episode numbers stops using a previous episode identity. Search results are not verified catalog matches.
- Supports manual entry when automatic detection fails or the browser restricts page access.

| Platform | Audience / language | Purpose |
| --- | --- | --- |
| Letterboxd | Global | Movie reviews and ratings; limited TV availability; enabled by default, optional |
| Reddit | Global, predominantly English | Film and TV discussion searches; optional |
| Ekşi Sözlük | Türkiye, Turkish | Film and TV discussions, often in one series topic; optional |
| IMDb | Global | Movie, TV series and episode pages, ratings and reviews; optional |

AfterWatch does not post comments or submit ratings. Those actions happen on the destination website.

## Install locally

No build step, Node.js installation, API key, account, or dependency installation is required to use the extension.

1. Download or clone this repository and extract it if needed.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the directory containing `manifest.json`.
5. Pin the extension, open a movie, series, or episode detail page, and click AfterWatch.
6. Check the title and content type. For episodes, scroll the selection panel to choose the discussion scope or correct the season and episode numbers.
7. Choose an enabled platform. Change the interface language using the selector beside the name.
8. Open the gear button for Settings. Enable or disable any of the four platforms and use its up/down arrows to change the order. Use Back or Escape to return. Your selected title and episode numbers are preserved.

If already installed from this directory, click **Reload** after updating it. The extension card should show version **1.3.0**. The `storage` permission, added in 1.1.0, now saves local language and platform preferences. No new permission is required.

Chrome 111 or later is required. Automated popup and actual DOM extraction checks run in Chrome; unpacked-extension loading and permissions still need a quick manual check after reloading. Edge uses compatible Chromium APIs but has not been independently tested here. Firefox and Safari are not currently verified.

## Supported pages and limits

### Playback and YouTube detection

Version 1.3.0 includes MUBI player detection and conservative playback fallbacks for Netflix, Prime Video/Amazon, Disney+, Apple TV, Max, Hulu, Peacock, and Paramount+. Reload the unpacked extension after updating this directory.

All four destinations are optional and saves their display order. Letterboxd starts enabled; upgrading old discussion settings preserves Reddit/Ekşi choices and adds Letterboxd once. Valid three-platform settings keep their visibility/order and append disabled IMDb. New installations enable IMDb; upgrading users can enable it in Settings. A subsequently saved choice to disable any or all platforms is preserved. Settings and destination buttons use the same order. Language changes do not change these choices.

YouTube has a separate upload-ID-bound reader. It preserves the video title and leaves the content type unselected. Recognized full-movie suffixes and explicit episode labels produce optional suggestions; click a suggestion to use it, or restore the raw video title. A missing season stays empty, and an upload date or YouTube video ID is never treated as a movie/episode release date or catalog identity. No API key or external lookup is required.

Player titles come from the current film record, scoped controls, page-bound media metadata, or the browser's media session. Hideable controls can be absent; reveal them and reopen the popup if needed. No title is inferred from a URL ID or slug. Unknown content types require a selection before navigation; unavailable season/episode numbers remain empty.

Public detail pages and synthetic playback DOM were checked. Authenticated playback is not yet verified. Platform interfaces, regions, browser media-session behavior, and account state can affect detection. See [STREAMING.md](STREAMING.md) for the exact evidence and manual checks.

Automatic detection depends on media information exposed by the current page. It is not guaranteed on every website. An explicit `mainEntity` can distinguish a detail page from related graph entries; multiple unrelated titles without an unambiguous main entity require manual entry. Recommendations, cast, and episode lists are not traversed. Parent metadata is resolved only within the page; external references are never fetched.

A localized title cannot always be converted to its English title without an external data source. An alternative title supplied by a page is not necessarily English or the original title. You can edit the search title before navigating.

Ekşi topics can mix media discussions with other uses of the same word. Series discussions may reveal later episodes; episode search does not filter spoilers. Letterboxd's IMDb redirect depends on its own catalog; if an ID does not resolve, edit the title to use title search.

[Letterboxd's FAQ](https://letterboxd.com/about/faq/) states that most returning TV shows are not supported, while some limited series and episodes are exceptions. AfterWatch therefore searches by series title for TV content and never sends an episode's IMDb ID to the movie redirect. A matching Letterboxd entry is not guaranteed.

## Privacy

The extension uses `activeTab`, `scripting`, and `storage`. Storage contains only interface-language and platform visibility/order preferences, without synchronization to a server. First-run suggestions use the browser UI language, without IP geolocation or country tracking. It has no background tracking, persistent browsing access, cookies access, telemetry, account system, or local watch history.

Opening the popup reads media metadata from the active page into memory. Clicking a destination sends the selected title, episode search text, or media IMDb ID to that website through its URL. Normal destination-site privacy rules apply. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Development

Tests require Node.js 20 or later, with no external packages:

```sh
npm test
npm run check
npm run preview
```

The preview runs at `http://127.0.0.1:4173/`. It simulates Chrome APIs and prints destination URLs instead of opening real tabs. It does not read your active browser page. Scenarios: `?scenario=raw`, `numeric`, `series`, `episode`, `episode-heading`, `missing-series`, `generic`, `protected`, `error`, and `hostile`. The preview stores separate local language and platform preferences.

Additional popup preview scenarios are `?scenario=youtube-movie`, `youtube-episode`, and `youtube-partial`. These simulate video data rather than reading YouTube. `?scenario=episode-nested` demonstrates the complete-heading/nested-route fallback with no usable metadata. `?scenario=imdb-series` and `imdb-episode` demonstrate series/episode identity navigation using synthetic metadata. Enable IMDb in Settings if upgrading existing preview preferences. For real extension testing, open `/fixtures/series`, `/fixtures/episode`, or `/fixtures/episode-heading` on that server and click the unpacked extension. These synthetic pages contain media metadata and no video or catalog integration.

Real extension loading and permission checks are separate from the preview and automated tests. See [AUDIT.md](AUDIT.md) for validation evidence and remaining checks.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Detection changes should include a minimal fixture and a regression test. Avoid collecting user data or adding broader permissions without explaining the need.

## License and affiliation

[MIT](LICENSE). AfterWatch is independent and is not affiliated with Ekşi Sözlük, Letterboxd, IMDb, or any streaming website.
