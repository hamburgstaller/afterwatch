# Contributing

AfterWatch is a dependency-free browser extension. Keep changes small and explain the user-visible behavior they improve.

## Local checks

Use Node.js 20 or later and run `npm test` and `npm run check`. No package installation is necessary. Run `npm run preview` for UI checks with simulated Chrome APIs, then reload the unpacked extension for real browser/permission checks.

## Reporting detection problems

Include a public page URL, the expected movie or series title, content type, relevant episode numbers, detected result, and browser/version. Avoid sharing account-only URLs, credentials, private page content, or personal browsing history. Report security-sensitive findings through [SECURITY.md](SECURITY.md).

## Adding support

Prefer standard media metadata before introducing a site-specific selector. Scope selectors to their intended context, avoid recommendation/cast/episode-list data, preserve meaningful title numbers, and keep manual entry available. Resolve JSON-LD identity references within the page only.

Add a minimal fixture containing only the metadata needed to reproduce the problem and a meaningful regression test. Do not copy entire pages, comments, images, or videos into fixtures.

The documentation and default interface are English. UI translations live in `i18n.js`: English, Spanish, Portuguese, Italian, and Turkish. Keep message keys and interpolation fields consistent across catalogs; `npm test` checks them. Media names retain their source language. Portuguese currently uses Brazilian wording.

Live chat remains a future feature. Proposals should describe identity matching, permission/privacy changes, and failure behavior; see [ROADMAP.md](ROADMAP.md).
