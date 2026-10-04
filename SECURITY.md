# Security

## Current boundaries

- Manifest V3 with only `activeTab` and `scripting` permissions.
- No remote scripts, runtime dependencies, `eval`, `innerHTML`, background service, or storage.
- Page titles are untrusted text. The popup uses `textContent` and input `value`; destination URLs encode the selected title.
- Destination origins are fixed HTTPS URLs for Ekşi Sözlük and Letterboxd.
- IMDb IDs are accepted only from actual IMDb hostnames and `/title/tt…` paths. Conflicting IDs disable direct identity navigation.
- JSON-LD processing has size, depth, and item limits. Malformed JSON does not prevent other detection methods from working.
- The extension CSP allows local scripts and blocks object embedding, network connections, form submission, and base URL overrides.

A page can supply misleading movie information. The extension does not independently verify it against a movie catalog. Users can inspect and edit the title. Ekşi topic matches and Letterboxd catalog mappings are not guaranteed.

## Reporting

Use [private vulnerability reporting](https://github.com/hamburgstaller/afterwatch/security/advisories/new) for security-sensitive findings. This channel is enabled on the repository. Do not post sensitive data or exploit details in a public issue. Ordinary non-sensitive bugs can be reported through [GitHub issues](https://github.com/hamburgstaller/afterwatch/issues).

The source review and automated checks are not an independent penetration test or security certification.
