# Persistent accounts on Render Free

Creating the database alone does not enable persistence. The deployed server must run this version and have the environment below.

1. Create Cloud Firestore **Standard edition**, database `(default)`, in **Production mode**, in Firebase project `online-flight-sim`. Keep browser access to `ofs_accounts` and `ofs_private` denied; the trusted server uses its own credential.
2. Firebase Console → Project settings → Service accounts → Firebase Admin SDK → Generate new private key. Keep the downloaded JSON private. Never paste it into chat or add it to GitHub.
3. Render → this web service → Environment. Add:
   - `OFS_STORAGE` = `firestore`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the complete contents of the downloaded JSON file (paste directly into Render, without extra quotes).
   - `NODE_VERSION` = `22`
4. Set the Render build command to `npm ci` and start command to `node server.mjs`. Deploy the version containing `firestore-storage.mjs` and the Firebase Admin SDK dependency.
5. Look for `Account storage: Firestore (persistent)` in Render logs. If credentials, permissions or the database are unavailable, startup fails instead of silently starting an empty registry. Do not remove the storage setting to bypass this failure.
6. Sign in, check the Moderator Pilots list, then restart the service and check again. Names, redeemed ranks, staff overrides, code locks, moderation and queued aircraft actions should remain.

The server writes records under `ofs_accounts` and the private access-code registry under `ofs_private/access_codes`. Only changed records are written; ordinary polling does not write to Firestore. Use one Render service instance for this in-memory game server; this integration does not synchronize multiple live instances.

The initial connection imports an existing local registry only when the corresponding cloud collection/record is empty. Existing cloud records take precedence. Keep backups of any surviving local registry before switching deployments.

This does not reconstruct previously lost ranks, pilot names, bans or other metadata. Firebase Authentication users are separate from the game's registry. Returning users can sign in again and redeem a code to re-create missing game records; staff can restore names/ranks as needed. Never infer staff privileges from an email address or a client-supplied role.

Friends is available to every signed-in rank through the sidebar and flight toolbar. Send requests by exact pilot name, accept/decline received requests, cancel sent requests, and remove friends. Friends and requests are account-based and persist with the account registry (Firestore on Render). The full Pilots list stays Moderator-only. Pilots shows access levels and refreshes every three seconds while open. Closing a tab sends a presence beacon; lost connections expire after about 12 seconds, plus the list refresh delay.

The server now imports missing Firebase Authentication users at startup and refreshes the Moderator Pilots directory at most every 30 seconds. It preserves existing Firestore pilot names, ranks, moderation and friendships. Newly discovered identities receive no rank-code privileges and must redeem a code before playing. Names and ranks stored only on localhost cannot be reconstructed from Firebase Authentication. The service account must be permitted to list Firebase Authentication users; a failed startup sync stops startup instead of silently presenting an incomplete account directory. Logs show `Firebase account directory synchronized (N missing accounts imported).` The public `/api/access/status` reports `storage: "firestore"` and `firebaseDirectory: true` when this integration is active, without exposing account details.

Friends supports private text chat and joining a friend in an existing multiplayer room. Public rooms can be joined directly; private rooms send a request to the room creator, who can approve or decline from Friends or Multiplayer. Approval does not move a pilot automatically: the requester selects Join server. Full or locked rooms return clear errors, and capacity is checked again at actual join. Requests expire after ten minutes or if the friend leaves the room. Creators can delete their own Public or Private rooms from Multiplayer; deletion returns all pilots to the lobby and removes pending requests. Room joining never starts or repositions an aircraft. There is no separate Friends room type.
