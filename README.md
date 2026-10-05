# AfterWatch

**You've watched it. Now join the conversation.**

A small browser extension that takes you from a movie, series, or episode page to discussions on **Ekşi Sözlük** and title searches on **Letterboxd**. Check the detected title and content type, adjust them if needed, and choose where to go next.

[Download the extension](https://github.com/hamburgstaller/afterwatch/releases/latest) · [Source and issues](https://github.com/hamburgstaller/afterwatch)

Version 1.1.0 supports movies, TV series, and episodes, with an English, Spanish, Portuguese, Italian, or Turkish interface. Shared live rooms remain a future idea, documented in [ROADMAP.md](ROADMAP.md).

## Features

- Reads standard `Movie`, `TVSeries`, and `TVEpisode` JSON-LD, including local `@id` references, `mainEntity`, and series/season relationships. Open Graph movie/TV types provide a fallback.
- Separates localized and alternative titles when a supported heading layout agrees with the page's media metadata.
- Preserves numbers and meaningful parentheses in titles, including `1917`, `Blade Runner 2049`, and `12 Angry Men`.
- Lets you edit the title, choose the content type, or select another title found on the page.
- Keeps a series title separate from an episode title and its season/episode numbers. Missing series names require manual entry.
- Offers series-wide or episode-specific Ekşi searches. Episode searches use the series title plus Turkish season/episode labels; season zero is supported for specials. Search results and spoiler-free topics are not guaranteed.
- Keeps English as the default interface. The selector includes Spanish, Portuguese (Brazilian wording), Italian, and Turkish, and saves only the selected language locally. Media titles and destination-site content are not translated.
- Opens the Letterboxd movie page using one unambiguous IMDb ID from Movie metadata, or searches films by title. TV content uses a series-title search with an explicit availability notice.
- Stops using the old movie IMDb ID when you change the title or content type.
- Supports manual entry when automatic detection fails or the browser restricts page access.

AfterWatch does not post comments or submit ratings. Those actions happen on the destination website.

## Install locally

No build step, Node.js installation, API key, account, or dependency installation is required to use the extension.

1. Download or clone this repository and extract it if needed.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the directory containing `manifest.json`.
5. Pin the extension, open a movie, series, or episode detail page, and click AfterWatch.
6. Check the title and content type. For episodes, scroll the selection panel to choose the discussion scope or correct the season and episode numbers.
7. Choose Ekşi Sözlük or Letterboxd. Change the interface language using the selector beside the name.

If already installed from this directory, click **Reload** after updating it. The extension card should show version **1.1.0**. This version adds the `storage` permission solely for the local language preference.

Chrome 111 or later is required. Version 1.1.0 has automated popup and actual DOM extraction checks in Chrome; unpacked-extension loading and permissions still need a quick manual check after reloading. Edge uses compatible Chromium APIs but has not been independently tested here. Firefox and Safari are not currently verified.

## Supported pages and limits

Automatic detection depends on media information exposed by the current page. It is not guaranteed on every website. An explicit `mainEntity` can distinguish a detail page from related graph entries; multiple unrelated titles without an unambiguous main entity require manual entry. Recommendations, cast, and episode lists are not traversed. Parent metadata is resolved only within the page; external references are never fetched.

A localized title cannot always be converted to its English title without an external data source. An alternative title supplied by a page is not necessarily English or the original title. You can edit the search title before navigating.

Ekşi topics can mix media discussions with other uses of the same word. Series discussions may reveal later episodes; episode search does not filter spoilers. Letterboxd's IMDb redirect depends on its own catalog; if an ID does not resolve, edit the title to use title search.

[Letterboxd's FAQ](https://letterboxd.com/about/faq/) states that most returning TV shows are not supported, while some limited series and episodes are exceptions. AfterWatch therefore searches by series title for TV content and never sends an episode's IMDb ID to the movie redirect. A matching Letterboxd entry is not guaranteed.

## Privacy

The extension uses `activeTab`, `scripting`, and `storage`. Storage contains only the interface language, without synchronization to a server. It has no background tracking, persistent browsing access, cookies access, telemetry, account system, or local watch history.

Opening the popup reads media metadata from the active page into memory. Clicking a destination sends the selected title, episode search text, or movie IMDb ID to that website through its URL. Normal destination-site privacy rules apply. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Development

Tests require Node.js 20 or later, with no external packages:

```sh
npm test
npm run check
npm run preview
```

The preview runs at `http://127.0.0.1:4173/`. It simulates Chrome APIs and prints destination URLs instead of opening real tabs. It does not read your active browser page. Scenarios: `?scenario=raw`, `numeric`, `series`, `episode`, `missing-series`, `generic`, `protected`, `error`, and `hostile`. The preview stores a separate local language preference.

For real extension testing, open `/fixtures/series` or `/fixtures/episode` on that server and click the unpacked extension. These synthetic pages contain standard JSON-LD and no video or real catalog entry.

Real extension loading and permission checks are separate from the preview and automated tests. See [AUDIT.md](AUDIT.md) for validation evidence and remaining checks.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Detection changes should include a minimal fixture and a regression test. Avoid collecting user data or adding broader permissions without explaining the need.

## License and affiliation

[MIT](LICENSE). AfterWatch is independent and is not affiliated with Ekşi Sözlük, Letterboxd, IMDb, or any streaming website.
