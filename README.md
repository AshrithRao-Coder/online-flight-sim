# Online Flight Sim

A browser flight simulator with 55 aircraft, satellite imagery, measured terrain and 3D cockpits.

Play: https://AshrithRao-Coder.github.io/online-flight-sim/

Features include working cockpit controls, aircraft damage and failures, custom liveries, weather and wind, combat, and a searchable 46-command console across seven access levels. One health bar shows aircraft condition in solo combat modes and multiplayer dogfight rooms. Notifications stay above Multiplayer, Access/Admin and Command panels.

Firebase sign-in and verified email are required. After verification, enter a rank access code to play; the Admin code is not a sign-in method. Account supports editable pilot names, Google/password provider linking, verification and sign-out. Moderation targets accounts across connections and aircraft changes. Analytics is not enabled.

Static hosting supports verified Firebase sign-in and local rank-code checks for solo play. The double-click/file copy has no code-only bypass; use an HTTP(S) server. Multiplayer and server-verified moderation require the included Node server:

```
node server.mjs
```

Use `PORT` to choose a port. The default is 4173; local development on this PC uses 4180. Access-code definitions and private server configuration must stay private. Set `OFS_ACCESS_FILE` to a persistent location on a hosted service. Set `OFS_ACCOUNTS_FILE` to a private persistent location as well; its default is `.ofs-accounts.json`. Never commit either registry or a plaintext code list. For Google sign-in on GitHub Pages, add `ashrithrao-coder.github.io` to Firebase Authentication > Settings > Authorized domains. Server permissions require a verified account and a valid code. Tail-strike damage and armed-jet health displays are included.

Aircraft assets are converted from FlightGear. Attribution and licence notices are included alongside the game files.
