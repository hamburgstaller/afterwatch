# Privacy

The current AfterWatch extension does not store movie history, send telemetry, create accounts, or operate a backend.

When you open the popup, it reads the active page's movie titles, movie metadata, and IMDb links. The information is processed in popup memory. It does not read browser history, cookies, form values, passwords, page comments, or video content.

Clicking Ekşi Sözlük includes the selected title in an Ekşi search URL. Clicking Letterboxd includes the detected IMDb ID or selected title in a Letterboxd URL. The destination website handles its own requests, cookies, and account behavior. The URLs can appear in browser history even though the extension itself does not keep a movie history.

`activeTab` supplies temporary access when you invoke the extension. `scripting` is used to read movie information from that page. Persistent host access and the `storage` permission are not requested.

The development preview is separate from the production extension. `dev/preview.js` loads a local fixture only through the local preview server; production `popup.html` never loads it.

Future live chat or external metadata lookup would change the data flow. They are not implemented in this release and would require updated privacy documentation before release.
