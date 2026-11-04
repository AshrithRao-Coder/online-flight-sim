# Online Flight Sim

A browser flight simulator with 55 aircraft, satellite imagery, measured terrain and 3D cockpits.

Play: https://AshrithRao-Coder.github.io/online-flight-sim/

Features include working cockpit controls, aircraft damage and failures, custom liveries, weather and wind, combat, and a searchable 79-command console across seven access levels. Damaged unarmed aircraft show their damage percentage and remaining hull health. Notifications stay above Multiplayer, Access/Admin and Command panels.

The static site supports solo play and local access levels. Multiplayer and server-verified moderation require the included Node server:

```
node server.mjs
```

Use `PORT` to choose a port. The default is 4173; local development on this PC uses 4180. Access-code definitions and private server configuration must stay private. Set `OFS_ACCESS_FILE` to a persistent location on a hosted service. Never commit `.ofs-access-codes.json` or a plaintext code list. Static browser access is a convenience lock; server permissions are checked separately.

Aircraft assets are converted from FlightGear. Attribution and licence notices are included alongside the game files.
