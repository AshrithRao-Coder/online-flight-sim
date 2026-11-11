# Online Flight Sim

A browser flight simulator with 55 aircraft, satellite imagery, measured terrain and 3D cockpits.

Play: https://AshrithRao-Coder.github.io/online-flight-sim/

Features include working cockpit controls, aircraft damage and failures, custom liveries, weather and wind, combat, and a searchable 85-command console across seven access levels. One health bar shows aircraft condition in solo combat modes and multiplayer dogfight rooms. Notifications stay above Multiplayer, Access/Admin and Command panels.

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

Render Free persistence requires Firestore and a private server credential. Follow [FIRESTORE_SETUP.md](FIRESTORE_SETUP.md) before relying on account records across restarts.

Friends is available to every signed-in rank through the sidebar and flight toolbar. Send requests by exact pilot name, accept/decline received requests, cancel sent requests, and remove friends. Friends and requests are account-based and persist with the account registry (Firestore on Render). The full Pilots list stays Moderator-only. Pilots shows access levels and refreshes every three seconds while open. Closing a tab sends a presence beacon; lost connections expire after about 12 seconds, plus the list refresh delay.

Pilots supports filtering by access level and sorting by rank (highest/lowest), name, or online status. Friends supports private text chat, persistent named notices for request and friendship changes, and Moderator commands `/friendadd`, `/friendremove`, `/friendaddall` and `/friendremoveall`. Pilot names in commands must be double-quoted; parenthesized groups can be used in either pilot-name field. Staff commands notify both affected pilots.

Friendship command pairs require comma-separated quoted names inside parentheses: `/friendadd ("Alice", "Bob")` and `/friendremove ("Alice", "Bob")`. The all-pilots forms remain `/friendaddall "Alice"` and `/friendremoveall "Alice"`. Friend changes use queued popups on arrival or after login for unseen notifications; the Updates section is removed.

The server now imports missing Firebase Authentication users at startup and refreshes the Moderator Pilots directory at most every 30 seconds. It preserves existing Firestore pilot names, ranks, moderation and friendships. Newly discovered identities receive no rank-code privileges and must redeem a code before playing. Names and ranks stored only on localhost cannot be reconstructed from Firebase Authentication. The service account must be permitted to list Firebase Authentication users; a failed startup sync stops startup instead of silently presenting an incomplete account directory. Logs show `Firebase account directory synchronized (N missing accounts imported).` The public `/api/access/status` reports `storage: "firestore"` and `firebaseDirectory: true` when this integration is active, without exposing account details.

Friends supports private text chat and joining a friend in an existing multiplayer room. Public rooms can be joined directly; private rooms send a request to the room creator, who can approve or decline from Friends or Multiplayer. Approval does not move a pilot automatically: the requester selects Join server. Full or locked rooms return clear errors, and capacity is checked again at actual join. Requests expire after ten minutes or if the friend leaves the room. Creators can delete their own Public or Private rooms from Multiplayer; deletion returns all pilots to the lobby and removes pending requests. Room joining never starts or repositions an aircraft. There is no separate Friends room type.
