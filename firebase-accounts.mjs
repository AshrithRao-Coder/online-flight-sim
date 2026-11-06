import fs from "node:fs";
import { FIREBASE_CONFIG } from "./firebase-config.js";

// Google validates the ID token; never trust a client-supplied UID, email, or rank.
export async function verifyFirebaseIdentity(
  idToken,
  { fetcher = fetch, config = FIREBASE_CONFIG } = {},
) {
  if (typeof idToken !== "string" || idToken.length > 16000)
    throw Error("Invalid Firebase sign-in.");
  let claims;
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) throw Error();
    claims = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    throw Error("Invalid Firebase sign-in.");
  }
  const now = Date.now() / 1000;
  if (
    claims.aud !== config.projectId ||
    claims.iss !== "https://securetoken.google.com/" + config.projectId ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.sub.length > 128 ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now + 60 ||
    !Number.isFinite(claims.auth_time) ||
    claims.auth_time > now + 60
  )
    throw Error("Firebase sign-in expired or belongs to another project.");
  let response;
  try {
    response = await fetcher(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
        encodeURIComponent(config.apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(6000),
      },
    );
  } catch {
    throw Error("Could not verify your account with Firebase. Please retry.");
  }
  const data = await response.json();
  const user = data.users?.length === 1 ? data.users[0] : null;
  if (
    !response.ok ||
    !user ||
    user.disabled ||
    user.localId !== claims.sub ||
    claims.auth_time < Number(user.validSince || 0)
  )
    throw Error(
      "Firebase sign-in is invalid, revoked or disabled. Sign in again.",
    );
  return {
    uid: user.localId,
    email: String(user.email || "").slice(0, 254),
    displayName: String(user.displayName || "").slice(0, 60),
    emailVerified: !!user.emailVerified,
    expires: Math.min(claims.exp * 1000, Date.now() + 3600000),
  };
}

export class AccountRegistry {
  constructor({ file = null } = {}) {
    this.file = file;
    this.users = new Map();
    if (file && fs.existsSync(file)) {
      const list = JSON.parse(fs.readFileSync(file, "utf8"));
      if (
        !Array.isArray(list) ||
        list.some(
          (u) =>
            !u ||
            typeof u.uid !== "string" ||
            !u.uid ||
            u.uid.length > 128 ||
            (u.codeId != null && typeof u.codeId !== "string"),
        )
      )
        throw Error("Invalid account registry.");
      this.users = new Map(list.map((u) => [u.uid, u]));
    }
  }
  rename(uid, name) {
    const clean = String(name || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!/^[\p{L}\p{N} ._\x27-]{2,24}$/u.test(clean))
      throw Error(
        "Pilot names need 2-24 letters, numbers, spaces, dots, underscores or hyphens.",
      );
    if (
      [...this.users.values()].some(
        (u) =>
          u.uid !== uid &&
          (u.pilotName || u.displayName || "").toLocaleLowerCase() ===
            clean.toLocaleLowerCase(),
      )
    )
      throw Error("This pilot name is already in use.");
    const user = this.users.get(uid);
    if (!user) throw Error("Account not found.");
    const previous = user.pilotName;
    user.pilotName = clean;
    try {
      this.save();
    } catch (error) {
      user.pilotName = previous;
      throw error;
    }
    return user;
  }
  save() {
    if (!this.file) return;
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify([...this.users.values()]), {
      mode: 0o600,
    });
    fs.renameSync(tmp, this.file);
  }
  upsert(identity, codeId) {
    const previous = this.users.get(identity.uid),
      entry = {
        ...previous,
        uid: identity.uid,
        email: identity.email,
        displayName: identity.displayName,
        pilotName: previous?.pilotName || String(identity.displayName||"Pilot").trim().slice(0,24),
        emailVerified: identity.emailVerified,
        codeId: codeId === undefined ? (previous?.codeId ?? null) : codeId,
        created: previous?.created || Date.now(),
      };
    this.users.set(entry.uid, entry);
    try {
      this.save();
    } catch (error) {
      if (previous) this.users.set(entry.uid, previous);
      else this.users.delete(entry.uid);
      throw error;
    }
    return entry;
  }
  ban(uid, entry) {
    const user = this.users.get(uid);
    if (!user) return;
    const before = { ...user };
    Object.assign(user, entry);
    try {
      this.save();
    } catch (error) {
      this.users.set(uid, before);
      throw error;
    }
  }
}
