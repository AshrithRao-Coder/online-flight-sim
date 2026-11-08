# Firebase web configuration and security alerts

The Firebase web configuration is public client configuration. Its API key identifies the Firebase project; it is not an account password, service-account private key, or authorization to access user data. Firebase Authentication still verifies account credentials, and this game server verifies Firebase identity before granting account permissions.

A generic Google API-key scanner may flag this value in the browser bundle. Do not obfuscate it, disable scanning, or treat deleting it from the latest commit as revocation. Check the key in Google Cloud Console under APIs & Services > Credentials. Restrict it to the APIs required by this application (Firebase Authentication uses Identity Toolkit and Token Service). Restrictions must also permit the Node server's Firebase identity-verification requests.

Repository access alone cannot establish the key's current Google Cloud restrictions. If it also grants access to unrelated or billable Google APIs, restrict or replace that key, update every deployment, and revoke the old one. Once its intended public Firebase-only use and restrictions are confirmed, the repository owner can classify the corresponding GitHub alert as a false positive. The alert has not been dismissed automatically.

References: [Firebase API keys](https://firebase.google.com/docs/projects/api-keys) and [Firebase security checklist](https://firebase.google.com/support/guides/security-checklist).
