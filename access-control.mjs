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
  constructor({ file = null, codes = DEFAULT_CODES } = {}) {
    this.file = file;
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
  login(code, ip = "local") {
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
  session(token) {
    const s = this.sessions.get(token);
    if (!s || s.expires < Date.now() || s.bannedUntil > Date.now()) return null;
    const code = this.codes.find((e) => e.id === s.codeId && e.enabled);
    return code ? { ...s, role: code.role } : null;
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
    const send = (status, data) =>
      res
        .writeHead(status, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        })
        .end(JSON.stringify(data));
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
        return send(200, { enabled: true });
      if (req.method === "GET" && path === "session") {
        const s = this.session(token);
        if (!s)
          return send(401, {
            error: "Session expired. Enter your code again.",
          });
        return send(200, { role: s.role, permissions: permissions(s.role) });
      }
      if (req.method !== "POST")
        return send(405, { error: "Method not allowed." });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096)
          return send(413, { error: "Request too large." });
      }
      const body = JSON.parse(raw || "{}");
      if (path === "login") {
        const result = this.login(body.code, req.socket.remoteAddress);
        if (token) this.sessions.delete(token);
        return send(200, result);
      }
      if (path === "logout") {
        this.sessions.delete(token);
        return send(200, { ok: true });
      }
      if (path === "codes") return send(200, this.manage(token, body));
      return send(404, { error: "Not found." });
    } catch (e) {
      return send(e instanceof SyntaxError ? 400 : 403, { error: e.message });
    }
  }
}
