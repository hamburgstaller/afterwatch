# Contributing

AfterWatch is a dependency-free browser extension. Keep changes small and explain the user-visible behavior they improve.

## Local checks

Use Node.js 20 or later and run `npm test`. No package installation is necessary. Run `npm run preview` for UI checks with simulated Chrome APIs, then reload the unpacked extension for real browser/permission checks.

## Reporting detection problems

Include a public page URL, the expected movie title, the detected title, and your browser/version. Avoid sharing account-only URLs, credentials, private page content, or personal browsing history. Report security-sensitive findings through the channel described in [SECURITY.md](SECURITY.md).

## Adding support

Prefer standard movie metadata before introducing a site-specific selector. Scope selectors to the intended hostname, avoid recommendation/cast data, preserve meaningful title numbers, and keep manual entry available.

Add a minimal fixture containing only the title and metadata needed to reproduce the problem, plus a meaningful regression test. Do not copy entire pages, comments, images, or videos into fixtures.

The public interface and documentation are English. Movie names and input fixtures should preserve the languages used by their source pages. Turkish localization is planned for a later version.

TV episodes and live chat are future features. Proposals should first describe identity matching, permission/privacy changes, and failure behavior; see [ROADMAP.md](ROADMAP.md).
