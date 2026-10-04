# AfterWatch

**You've watched it. Now join the conversation.**

A small browser extension that takes you from a movie page to discussions on **Ekşi Sözlük** and reviews or ratings on **Letterboxd**. Check the detected title, adjust it if needed, and choose where to go next.

[Download the extension](https://github.com/hamburgstaller/afterwatch/releases/latest) · [Source and issues](https://github.com/hamburgstaller/afterwatch)

The current release supports movies. TV shows, episodes, additional languages, and shared live rooms are future ideas, documented in [ROADMAP.md](ROADMAP.md).

## Features

- Reads standard `Movie` JSON-LD or `video.movie` metadata.
- Separates localized and alternative movie titles when a supported heading layout agrees with the page's movie metadata, so searches can use the alternative title supplied by the page.
- Preserves numbers and meaningful parentheses in movie titles, including `1917`, `Blade Runner 2049`, and `12 Angry Men`.
- Lets you edit the title or select another title found on the page.
- Opens a title search on Ekşi Sözlük, a Turkish discussion platform.
- Opens the Letterboxd movie page using one unambiguous IMDb ID from the page, or searches films by title when no ID is available.
- Stops using the old IMDb ID when you change the title to another movie.
- Supports manual title entry when automatic detection fails or the browser restricts page access.

AfterWatch does not post comments or submit ratings. Those actions happen on the destination website.

## Install locally

No build step, Node.js installation, API key, account, or dependency installation is required to use the extension.

1. Download or clone this repository and extract it if needed.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the directory containing `manifest.json`.
5. Pin the extension, open a movie detail page, and click AfterWatch.
6. Check the title and choose Ekşi Sözlük or Letterboxd.

If you already loaded this directory, use the extension's **Reload** button after updating it. The popup should display AfterWatch and the extension card should show version **1.0.3**.

Chrome 111 or later is required. The project owner has reported successful use of a previous build as a real Chrome extension on several movie pages; version 1.0.3 still needs a quick manual check after reloading. Edge uses compatible Chromium APIs but has not been independently tested here. Firefox and Safari are not currently verified.

## Supported pages and limits

Automatic detection depends on movie information exposed by the current page. It is not guaranteed on every website. Pages containing multiple movies are treated as ambiguous, and pages without movie metadata may require manual entry.

A localized title cannot always be converted to its English title without an external movie data source. An alternative title supplied by a page is not necessarily English or the original title. You can edit the search title before navigating.

Ekşi topics can mix movie discussions with other uses of the same word. Letterboxd's IMDb redirect depends on its own catalog; if an ID does not resolve, edit the title to use title search. Reviews and discussions may contain spoilers.

## Privacy

The extension uses only `activeTab` and `scripting`. It has no background tracking, persistent browsing access, cookies access, telemetry, account system, or local movie history.

Opening the popup reads movie metadata from the active page into memory. Clicking a destination sends the selected title or IMDb ID to that website through its URL. Normal destination-site privacy rules apply. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Development

Tests require Node.js 20 or later, with no external packages:

```sh
npm test
npm run check
npm run preview
```

The preview runs at `http://127.0.0.1:4173/`. It simulates Chrome APIs and prints destination URLs instead of opening real tabs. It does not read your active browser page. Scenarios: `?scenario=raw`, `numeric`, `generic`, `protected`, `error`, and `hostile`.

Real extension loading and permission checks are separate from the preview and automated tests. See [AUDIT.md](AUDIT.md) for validation evidence and remaining checks.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New site support should include a minimal public-page fixture and a regression test. Avoid collecting user data or adding broader permissions without explaining the need.

## License and affiliation

[MIT](LICENSE). AfterWatch is independent and is not affiliated with Ekşi Sözlük, Letterboxd, IMDb, or any streaming website.
