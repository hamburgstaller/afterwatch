# Security

## Current boundaries

- Manifest V3 with `activeTab`, `scripting`, and `storage` permissions. Storage is used only for the local language preference.
- No remote scripts, runtime dependencies, `eval`, `innerHTML`, or background service. Translations are bundled as a local script.
- Page titles are untrusted text. The popup uses `textContent` and input `value`; destination URLs encode the selected title.
- Destination origins are fixed HTTPS URLs for Ekşi Sözlük and Letterboxd.
- Movie IMDb IDs are accepted only from actual IMDb hostnames and `/title/tt…` paths. Conflicting IDs disable direct identity navigation.
- TV content always uses title search on Letterboxd, without mixing episode and movie IMDb identities. Episode numbers are bounded integers; season zero is allowed for specials.
- JSON-LD processing has size, depth, and item limits. Malformed JSON does not prevent other detection methods from working.
- Graph references use a bounded local index, never a network fetch. Recommendations and episode lists are ignored; ambiguous main entities require manual entry.
- The CSP allows local scripts and blocks object embedding, network connections, form submission, and base URL overrides.

A page can supply misleading media information. The extension does not independently verify it against a catalog. Users can inspect and edit the title, content type, and episode numbers. Ekşi topic matches and Letterboxd catalog mappings are not guaranteed. Episode searches do not filter spoilers.

## Reporting

Use [private vulnerability reporting](https://github.com/hamburgstaller/afterwatch/security/advisories/new) for security-sensitive findings. Do not post sensitive data or exploit details in a public issue. Ordinary bugs can be reported through [GitHub issues](https://github.com/hamburgstaller/afterwatch/issues).

The source review and automated checks are not an independent penetration test or security certification.
