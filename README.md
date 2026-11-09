# Online Flight Sim

A browser flight simulator with 55 aircraft, satellite imagery, measured terrain and 3D cockpits.

Play: https://AshrithRao-Coder.github.io/online-flight-sim/

Features include working cockpit controls, aircraft damage and failures, custom liveries, weather and wind, combat, and a searchable 81-command console across seven access levels. One health bar shows aircraft condition in solo combat modes and multiplayer dogfight rooms. Notifications stay above Multiplayer, Access/Admin and Command panels.

Firebase sign-in and verified email are required. After verification, enter a rank access code to play; the Admin code is not a sign-in method. Account supports editable pilot names, Google/password provider linking, verification and sign-out. Moderation targets accounts across connections and aircraft changes. Analytics is not enabled.

Static hosting supports verified Firebase sign-in and local rank-code checks for solo play. The double-click/file copy has no code-only bypass; use an HTTP(S) server. Multiplayer and server-verified moderation require the included Node server:

```
node server.mjs
```

Use `PORT` to choose a port. The default is 4173; local development on this PC uses 4180. Access-code definitions and private server configuration must stay private. Set `OFS_ACCESS_FILE` to a persistent location on a hosted service. Set `OFS_ACCOUNTS_FILE` to a private persistent location as well; its default is `.ofs-accounts.json`. Never commit either registry or a plaintext code list. For Google sign-in on GitHub Pages, add `ashrithrao-coder.github.io` to Firebase Authentication > Settings > Authorized domains. Server permissions require a verified account and a valid code. Tail-strike damage and armed-jet health displays are included.

Aircraft assets are converted from FlightGear. Attribution and licence notices are included alongside the game files.

All other-pilot controls are in Commands. /promote and /demote (plus all variants) change current rank while preserving account/code data. Add lockcodes to demote to block self-service code changes; /allowcodes re-enables them. Staff rank changes remain available while a pilot is code-locked. Account and Access use Change access code, with no level dropdown. Moderation supports finite/infinite durations; disarm lasts until rearm. Instructor /repairall and all other-pilot aircraft actions support offline queueing.

Admin /lockcodes {Pilot} locks self-service code changes without changing rank. /lockcodesall targets all eligible pilots. /allowcodes {Pilot} reverses the lock.

The Moderator-only Pilots list has its own sidebar/flight-toolbar panel, separate from Quick commands. The roster command has been removed.

Any command with a pilot-name field accepts up to 20 arbitrary pilot names. Use double quotes with any number of spaces around each &: `/ban 30s ("Alex"&"Robin"&"Sam")` or `/ban 30s ("Alex" & "Robin" & "Sam")`. Spacing may differ on either side and between names, including no spaces. This also works for aircraft actions, for example `/repair ("Alex"&"Robin"&"Sam")`. All targets and permissions are checked before applying the group; an unknown or protected pilot rejects the whole command. The existing 512-character command limit still applies.
