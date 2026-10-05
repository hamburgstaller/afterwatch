# Privacy

AfterWatch stores only your interface language and enabled discussion-platform preferences locally. It does not store watch history, send telemetry, create accounts, or operate a backend. Initial suggestions use the browser UI language; no IP geolocation, country detection, or external language service is used.

Opening the popup reads the active page's movie, series, and episode titles and metadata, including series/season relationships and IMDb URLs in that metadata. Episode detection also examines the current URL's pathname, excluding query parameters and fragments. The pathname is not included in destination searches or stored. The information is processed in popup memory. It does not read browser history, cookies, form values, passwords, page comments, or video content. JSON-LD references are resolved only within the page, with no external lookup.

On a matching MUBI film page, the extension also parses a size-limited embedded film record to read its localized title, supplied original title, slug, and release year. It reads only the current film, not recommendation records, and does not request another language version or send that record elsewhere.

Clicking Ekşi Sözlük or Reddit includes the selected title in that site's search URL. An episode-specific search also includes the season and episode numbers. Reddit queries include the word discussion and use S01E02-style episode notation. Clicking Letterboxd includes a movie's detected IMDb ID or the selected movie/series title in a Letterboxd URL. The destination website handles its own requests, cookies, and account behavior. URLs can appear in browser history even though the extension itself does not keep a watch history.

`activeTab` supplies temporary access when you invoke the extension. `scripting` reads media information from that page. `storage` saves `language` and `enabledPlatforms` through `chrome.storage.local`; they are not synced by the extension. Initial or migrated platform choices are saved when preferences load; later changes are saved when you select them. Uninstalling the extension clears these settings. Persistent host access is not requested.

The development preview is separate from production. `dev/preview.js` loads a local fixture through the local server and keeps separate language and platform preferences in the preview origin's localStorage; production `popup.html` never loads it.

Future live chat or external metadata lookup would change the data flow. They are not implemented in this release and would require updated privacy documentation before release.
