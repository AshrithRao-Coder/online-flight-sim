import {friendsState, friendAction, friendMessages, executeFriendCommand} from './friends.mjs';
import {
  accountLock,
  accountRole,
  accountRoster,
  executeAccountCommand,
} from "./account-actions.mjs";
import {
  AccountRegistry,
  verifyFirebaseIdentity,
} from "./firebase-accounts.mjs";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  DEFAULT_CODES,
  rank,
  can,
  permissions,
  normaliseCode,
} from "./access-policy.js";

export class AccessControl {
  constructor({
    file = null,
    codes = DEFAULT_CODES,
    accountsFile = null,
    verifyIdentity = verifyFirebaseIdentity,
  } = {}) {
    this.file = file;
    this.accounts = new AccountRegistry({ file: accountsFile });
    this.verifyIdentity = verifyIdentity;
    this.codes = structuredClone(codes);
    this.sessions = new Map();
    this.attempts = new Map();
    if (file && fs.existsSync(file)) {
      const saved = JSON.parse(fs.readFileSync(file, "utf8"));
      if (
        !Array.isArray(saved) ||
        saved.some((e) => rank(e.role) < 0 || !/^[a-f0-9]{64}$/.test(e.hash))
      )
        throw Error("Invalid access code registry");
      this.codes = saved;
      // The owner's original Admin credential cannot be disabled or overwritten.
      const owner = DEFAULT_CODES.find((e) => e.protected);
      this.codes = this.codes.filter(
        (e) => e.id !== owner.id && e.hash !== owner.hash,
      );
      this.codes.push({ ...owner });
    }
  }
  save() {
    if (this.file) {
      const tmp = this.file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(this.codes), { mode: 0o600 });
      fs.renameSync(tmp, this.file);
    }
  }
  checkRate(ip) {
    const now = Date.now(),
      bucket = this.attempts.get(ip) || { at: now, n: 0 };
    if (now - bucket.at > 60000) {
      bucket.at = now;
      bucket.n = 0;
    }
    if (++bucket.n > 12) throw Error("Too many attempts. Wait one minute.");
    this.attempts.set(ip, bucket);
    if (this.attempts.size > 2000)
      for (const [key, b] of this.attempts)
        if (now - b.at > 60000) this.attempts.delete(key);
  }
  login(code, ip = "local") {
    this.checkRate(ip);
    const now = Date.now();
    if (typeof code !== "string" || code.length > 160)
      throw Error("Wrong or disabled code.");
    const hash = crypto
      .createHash("sha256")
      .update(normaliseCode(code))
      .digest("hex");
    const entry = this.codes.find((e) => e.enabled && e.hash === hash);
    if (!entry) throw Error("Wrong or disabled code.");
    for (const [token, s] of this.sessions)
      if (s.expires < now) this.sessions.delete(token);
    if (this.sessions.size >= 5000)
      throw Error("Server session limit reached.");
    const token = crypto.randomBytes(32).toString("hex");
    this.sessions.set(token, { codeId: entry.id, expires: now + 12 * 3600000 });
    return {
      token,
      role: entry.role,
      hash,
      permissions: permissions(entry.role),
    };
  }
  session(token, { allowLocked = false } = {}) {
    const s = this.sessions.get(token);
    if (
      !s ||
      s.expires < Date.now() ||
      (!allowLocked && s.bannedUntil > Date.now())
    )
      return null;
    const account = s.uid ? this.accounts.users.get(s.uid) : null;
    if (
      s.uid &&
      (!account ||
        !account.emailVerified ||
        (!allowLocked && accountLock(account)))
    )
      return null;
    const code = this.codes.find(
      (e) => e.id === (account?.codeId ?? s.codeId) && e.enabled,
    );
    if (!code && !account?.giftedRole && rank(account?.assignedRole) < 0)
      return null;
    return {
      ...s,
      role: account ? accountRole(this, account) : code?.role || "player",
      ...(account
        ? {
            account: {
              uid: account.uid,
              email: account.email,
              displayName: account.pilotName || account.displayName,
              pilotName: account.pilotName || account.displayName,
              emailVerified: account.emailVerified,
              codeChangesLocked: !!account.codeChangesLocked,
            },
          }
        : {}),
    };
  }
  async loginFirebase(
    idToken,
    {
      code,
      previousToken,
      linkCurrent = false,
      resume = false,
      ip = "local",
    } = {},
  ) {
    this.checkRate(ip);
    const identity = await this.verifyIdentity(idToken);
    if (!identity.emailVerified || !identity.email)
      throw Error("Verify your email before choosing a rank code.");

    let codeId;
    if (code !== undefined) {
      if (this.accounts.users.get(identity.uid)?.codeChangesLocked)
        throw Error(
          "Access-code changes are locked by staff. Ask staff to use /allowcodes on this account.",
        );
      if (typeof code !== "string" || code.length > 160)
        throw Error("Wrong or disabled code.");
      const hash = crypto
        .createHash("sha256")
        .update(normaliseCode(code))
        .digest("hex");
      const entry = this.codes.find((e) => e.enabled && e.hash === hash);
      if (!entry) throw Error("Wrong or disabled code.");
      codeId = entry.id;
    } else {
      const current = this.session(previousToken, { allowLocked: true });
      if (current?.uid === identity.uid) codeId = current.codeId;
      else if (
        rank(this.accounts.users.get(identity.uid)?.assignedRole) >= 0 ||
        this.accounts.users.get(identity.uid)?.giftedRole ||
        this.codes.some(
          (e) =>
            e.enabled && e.id === this.accounts.users.get(identity.uid)?.codeId,
        )
      )
        codeId = this.accounts.users.get(identity.uid).codeId;
      else {
        const account = this.accounts.upsert(identity);
        return {
          needsCode: true,
          role: null,
          account: {
            uid: account.uid,
            email: account.email,
            displayName: account.pilotName || account.displayName,
            pilotName: account.pilotName || account.displayName,
            emailVerified: true,
          },
        };
      }
    }
    for (const [token, entry] of this.sessions)
      if (entry.expires < Date.now()) this.sessions.delete(token);
    if (this.sessions.size >= 5000)
      throw Error("Server session limit reached.");
    this.accounts.upsert(identity, codeId);
    if (code !== undefined)
      this.accounts.ban(identity.uid, {
        assignedRole: null,
        giftedRole: null,
        giftedBy: null,
      });
    const token = crypto.randomBytes(32).toString("hex");
    const account = this.accounts.users.get(identity.uid);
    this.sessions.set(token, {
      uid: identity.uid,
      codeId: account.codeId,
      expires: identity.expires,
    });
    const session = this.session(token, { allowLocked: true });
    if (previousToken) this.sessions.delete(previousToken);
    return {
      token,
      role: session.role,
      permissions: permissions(session.role),
      moderation: accountLock(account),
      account: session.account,
    };
  }

  identityKey(token) {
    const uid = this.sessions.get(token)?.uid;
    return uid ? "firebase:" + uid : token;
  }
  role(token) {
    return this.session(token)?.role || "player";
  }
  require(token, power) {
    const s = this.session(token);
    if (!s || !can(s.role, power)) throw Error("Permission denied.");
    return s;
  }
  manage(token, { action, ...body }) {
    this.require(token, "manageCodes");
    if (action === "list")
      return { codes: this.codes.map(({ hash, ...e }) => e) };
    if (action === "create") {
      if (rank(body.role) < 0) throw Error("Choose a valid role.");
      const code =
        "SKY-" + crypto.randomBytes(10).toString("hex").toUpperCase();
      const entry = {
        id: crypto.randomUUID(),
        role: body.role,
        label: String(body.label || body.role).slice(0, 60),
        enabled: true,
        hash: crypto.createHash("sha256").update(code).digest("hex"),
      };
      if (this.codes.length >= 500)
        throw Error("Code limit reached. Revoke unused codes first.");
      this.codes.push(entry);
      try {
        this.save();
      } catch (e) {
        this.codes.pop();
        throw e;
      }
      return { code };
    }
    const entry = this.codes.find((e) => e.id === body.id);
    if (!entry || entry.protected)
      throw Error("The owner's Admin code is protected.");
    if (!["revoke", "enable"].includes(action)) throw Error("Unknown action.");
    const old = entry.enabled;
    entry.enabled = action === "enable";
    try {
      this.save();
    } catch (e) {
      entry.enabled = old;
      throw e;
    }
    if (action === "revoke")
      for (const [token, s] of this.sessions)
        if (s.codeId === entry.id) this.sessions.delete(token);
    return { ok: true };
  }
  async handle(req, res, url) {
    const path = url.pathname.slice("/api/access/".length),
      token = /^Bearer ([a-f0-9]{64})$/.exec(
        req.headers.authorization || "",
      )?.[1];
    const send = async (status, data) => {
      if (this.flushStorage) {
        try { await this.flushStorage(); }
        catch { status = 503; data = {error: "Account storage unavailable. Please retry; changes have not been confirmed."}; }
      }
      return res
        .writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        })
        .end(JSON.stringify(data));
    };
    if (req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== req.headers.host)
          return send(403, { error: "Origin refused." });
      } catch {
        return send(403, { error: "Origin refused." });
      }
    }
    try {
      if (req.method === "GET" && path === "status")
        return send(200, { enabled: true, firebase: true, storage: this.flushStorage ? "firestore" : "local", firebaseDirectory: !!this.syncFirebaseDirectory });
      if (req.method === "GET" && path === "session") {
        const s = this.session(token, { allowLocked: true });
        if (!s?.account?.emailVerified)
          return send(401, {
            error: "Session expired. Enter your code again.",
          });
        return send(200, {
          role: s.role,
          moderation: accountLock(this.accounts.users.get(s.uid)),
          permissions: permissions(s.role),
          ...(s.account ? { account: s.account } : {}),
        });
      }
      if (req.method === "GET" && path === "friends-chat") return send(200, friendMessages(this, token, url.searchParams.get('pilot')));
      if (req.method === "GET" && path === "friends") return send(200, friendsState(this, token));
      if (req.method === "GET" && path === "pilots") {
        const session = this.session(token);
        if (!session?.uid)
          return send(401, { error: "Sign in to view pilots." });
        if (rank(session.role) < rank("moderator"))
          return send(403, {
            error: "Moderator access required to view pilots.",
          });
        await this.syncFirebaseDirectory?.();
        return send(200, {
          pilots: accountRoster(this).map((p) => ({
            name: p.name,
            role: p.role,
            online: p.online,
          })),
        });
      }
      if (req.method === "GET" && path === "account-state") {
        const s = this.session(token, { allowLocked: true });
        if (!s?.uid) return send(401, { error: "Reconnect your account." });
        const user = this.accounts.users.get(s.uid);
        user.lastSeen = Date.now();
        Object.assign(this.sessions.get(token), {lastSeen: Date.now()});
        return send(200, {
          moderation: accountLock(user),
          mutedUntil: user.mutedUntil || 0,
          disarmedUntil: user.disarmedUntil || 0,
          codeChangesLocked: !!user.codeChangesLocked,
          role: s.role,
          actions: accountLock(user) ? [] : user.pendingActions || [],
        });
      }
      if (req.method !== "POST")
        return send(405, { error: "Method not allowed." });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 20000)
          return send(413, { error: "Request too large." });
      }
      const body = JSON.parse(raw || "{}");
      if (path === "friends") return send(200, friendAction(this, token, body));
      if (path === "presence-resume") {
        const current = this.sessions.get(token);
        if (current) Object.assign(current, {presenceAway:false,lastSeen:Date.now()});
        return send(200, {ok:true});
      }
      if (path === "presence-leave") {
        const beaconToken = typeof body.sessionToken === 'string' && /^[a-f0-9]{64}$/.test(body.sessionToken) ? body.sessionToken : null;
        const current = this.sessions.get(token || beaconToken);
        if (current) current.presenceAway = true;
        return send(200, {ok: true});
      }
      if (path === "command" && ['friendadd','friendaddall','friendremove','friendremoveall'].includes(body.name))
        return send(200, executeFriendCommand(this,token,body.name,body.args,body.groups));
      if (path === "command")
        return send(
          200,
          executeAccountCommand(this, token, body.name, body.args, {
            targets: body.targets,
          }),
        );
      if (path === "action-ack") {
        const s = this.session(token);
        if (!s?.uid) return send(403, { error: "Account locked." });
        const user = this.accounts.users.get(s.uid);
        const ids = Array.isArray(body.ids) ? body.ids.slice(0, 30) : [];
        this.accounts.ban(s.uid, {
          pendingActions: (user.pendingActions || []).filter(
            (a) => !ids.includes(a.id),
          ),
        });
        return send(200, { ok: true });
      }
      if (path === "firebase") {
        return send(
          200,
          await this.loginFirebase(body.idToken, {
            code: body.code,
            previousToken: token,
            linkCurrent: body.linkCurrent === true,
            resume: body.resume === true,
            ip: req.socket.remoteAddress,
          }),
        );
      }
      if (path === "profile") {
        const current = this.require(token, "play");
        if (!current.uid) throw Error("Sign in first.");
        const account = this.accounts.rename(current.uid, body.pilotName);
        return send(200, {
          account: {
            uid: account.uid,
            email: account.email,
            displayName: account.pilotName,
            pilotName: account.pilotName,
            emailVerified: true,
          },
        });
      }
      if (path === "login") {
        return send(403, {
          error:
            "Sign in and verify your email first. Codes are redeemed after verification.",
        });
      }
      if (path === "logout") {
        this.sessions.delete(token);
        return send(200, { ok: true });
      }
      if (path === "codes") {
        if (!this.session(token)?.account?.emailVerified)
          throw Error("Sign in and verify your email first.");
        return send(200, this.manage(token, body));
      }
      return send(404, { error: "Not found." });
    } catch (e) {
      return send(e instanceof SyntaxError ? 400 : 403, { error: e.message });
    }
  }
}
