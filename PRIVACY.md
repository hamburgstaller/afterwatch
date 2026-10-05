# Privacy

AfterWatch stores only your interface language preference locally. It does not store watch history, send telemetry, create accounts, or operate a backend.

Opening the popup reads the active page's movie, series, and episode titles and metadata, including series/season relationships and IMDb URLs in that metadata. The information is processed in popup memory. It does not read browser history, cookies, form values, passwords, page comments, or video content. JSON-LD references are resolved only within the page, with no external lookup.

Clicking Ekşi Sözlük includes the selected title in an Ekşi search URL. An episode-specific search also includes the season and episode numbers. Clicking Letterboxd includes a movie's detected IMDb ID or the selected movie/series title in a Letterboxd URL. The destination website handles its own requests, cookies, and account behavior. URLs can appear in browser history even though the extension itself does not keep a watch history.

`activeTab` supplies temporary access when you invoke the extension. `scripting` reads media information from that page. `storage` saves a single `language` setting through `chrome.storage.local`; it is not synced by the extension. Uninstalling the extension clears that setting. Persistent host access is not requested.

The development preview is separate from production. `dev/preview.js` loads a local fixture through the local server and keeps a separate language preference in the preview origin's localStorage; production `popup.html` never loads it.

Future live chat or external metadata lookup would change the data flow. They are not implemented in this release and would require updated privacy documentation before release.
