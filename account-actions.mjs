import crypto from "node:crypto";
import { commandByName } from "./command-catalog.js";
import { rank, ROLES } from "./access-policy.js";
export function duration(value, fallback = 300000) {
  if (value === undefined) return fallback;
  if (String(value).trim().toLowerCase() === "infinite") return 4e15;
  const m = /^(\d+(?:\.\d+)?)(s|m|h|d)$/i.exec(String(value).trim());
  if (!m) throw Error("Duration: use 30s, 5m, 2h, 7d or infinite.");
  const n =
    Number(m[1]) *
    { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
  if (n < 1000 || n > 30 * 86400000)
    throw Error("Duration must be 1 second to 30 days.");
  return n;
}
export function accountRole(access, user) {
  if (rank(user?.assignedRole) >= 0) return user.assignedRole;
  const code = access.codes.find((c) => c.id === user?.codeId && c.enabled);
  const base = code?.role || "player";
  return rank(user?.giftedRole) > rank(base) ? user.giftedRole : base;
}
export const accountRank = accountRole;
export function accountLock(user) {
  if (!user) return null;
  const now = Date.now();
  const locks = [
    ["ban", user.bannedUntil],
    ["kick", user.kickedUntil],
    ["warning", user.warningUntil],
  ]
    .filter(([, until]) => until > now)
    .sort((a, b) => b[1] - a[1]);
  return locks.length
    ? {
        kind: locks[0][0],
        until: locks[0][1],
        reason:
          user.restrictionReasons?.[
            locks[0][0] === "warning" ? "warn" : locks[0][0]
          ] ||
          user.moderationReason ||
          "A moderator temporarily locked this account.",
      }
    : null;
}
export function accountRoster(access) {
  return [...access.accounts.users.values()]
    .map((user) => ({
      uid: user.uid,
      name: user.pilotName || user.displayName || "Pilot",
      role: accountRole(access, user),
      maxRole: accountRank(access, user),
      giftedBy: user.giftedBy || null,
      rankChangedBy: user.rankChangedBy || user.giftedBy || null,
      codeChangesLocked: !!user.codeChangesLocked,
      codeLockBy: user.codeLockBy || null,
      online:
        [...(access.hub?.clients || [])].some(
          (c) => access.sessions.get(c.authToken)?.uid === user.uid,
        ) ||
        ([...access.sessions.values()].some(
          (s) => s.uid === user.uid && s.expires > Date.now(),
        ) &&
          user.lastSeen > Date.now() - 45000),
      lock: accountLock(user),
      mutedUntil: user.mutedUntil || 0,
      disarmedUntil: user.disarmedUntil || 0,
      pendingActions: (user.pendingActions || []).length,
    }))
    .sort(
      (a, b) =>
        Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    );
}
export function validateAircraftArgs(name, args) {
  const original = commandByName(name);
  const required = (original.args.match(/\{[^}]*\}/g) || []).filter(
    (v) => !v.includes("(optional)"),
  ).length;
  if (args.length < required)
    throw Error("Missing aircraft arguments. Use /help " + name + ".");
  const numeric = (index, min, max) => {
    if (
      args[index] !== undefined &&
      (!Number.isFinite(Number(args[index])) ||
        Number(args[index]) < min ||
        Number(args[index]) > max)
    )
      throw Error(name + ": enter " + min + " to " + max + ".");
  };
  if (["speed", "boost"].includes(name)) numeric(0, 0, 10000);
  if (name === "heading") numeric(0, 0, 360);
  if (name === "refuel") numeric(0, 0, 100);
  if (name === "rewind") numeric(0, 5, 60);
  if (name === "teleport") {
    numeric(0, -85, 85);
    numeric(1, -180, 180);
    numeric(2, 100, 80000);
  }
  if (
    ["bookmark", "return"].includes(name) &&
    !/^[a-z0-9_-]{1,24}$/i.test(args[0] || "")
  )
    throw Error("Use a valid bookmark name.");
  if (
    ["unlimited-fuel", "noclip"].includes(name) &&
    !["on", "off"].includes(args[0])
  )
    throw Error("Choose on or off.");
  if (name === "mode" && !["free", "guns", "drone", "bandit"].includes(args[0]))
    throw Error("Choose free, guns, drone or bandit.");
  if (
    name === "practice" &&
    !["stall", "engineout", "approach", "recovery"].includes(args[0])
  )
    throw Error("Choose a valid practice scenario.");
  if (name === "spawn") {
    if (!["drone", "bandit", "ground"].includes(args[0]))
      throw Error("Choose drone, bandit or ground.");
    numeric(1, 1, 8);
    if (args[1] !== undefined && !Number.isInteger(Number(args[1])))
      throw Error("Use a whole target count.");
  }
}
export function executeAccountCommand(
  access,
  token,
  name,
  args = [],
  options = {},
) {
  const actor = access.session(token),
    definition = commandByName(name);
  const spec = definition?.targetable
    ? {
        ...definition,
        accountAction: true,
        flightAction: true,
        role:
          rank(definition.role) > rank("instructor")
            ? definition.role
            : "instructor",
      }
    : definition;
  if (!actor?.uid || !spec?.accountAction || rank(actor.role) < rank(spec.role))
    throw Error("Permission denied.");
  if (
    !Array.isArray(args) ||
    args.length > 20 ||
    args.some((v) => typeof v !== "string" || v.length > 240)
  )
    throw Error("Invalid arguments.");
  if (name === "banlist")
    return {
      text:
        accountRoster(access)
          .filter((p) => p.lock?.kind === "ban")
          .map(
            (p) =>
              `${p.uid}: ${p.name} - until ${p.lock.until >= 4e15 ? "infinite" : new Date(p.lock.until).toISOString()}`,
          )
          .join("\n") || "No active bans.",
    };
  let base = spec.action || name,
    all = !!spec.allPilots;
  const value = all ? null : String(args[0] || "");
  let rest = all ? args : args.slice(1);
  const users = [...access.accounts.users.values()];
  const multiple = options.targets !== undefined;
  if (
    multiple &&
    (!Array.isArray(options.targets) ||
      options.targets.length < 2 ||
      options.targets.length > 20 ||
      options.targets.some(
        (v) => typeof v !== "string" || !v.trim() || v.length > 240,
      ) ||
      all ||
      !definition.args.includes("{Pilot's Name"))
  )
    throw Error("Invalid pilot-name list.");
  const resolve = (value) => {
    const matches = users.filter(
      (u) =>
        u.uid === value ||
        (base === "unban" && u.banId === value) ||
        (u.pilotName || u.displayName || "").toLocaleLowerCase() ===
          value.toLocaleLowerCase(),
    );
    const exact = matches.find((u) => u.uid === value);
    if (exact) return exact;
    if (matches.length !== 1)
      throw Error("Choose a unique pilot name from the Pilots list: " + value);
    return matches[0];
  };
  let targets = all
    ? users.filter((u) => u.uid !== actor.uid)
    : [
        ...new Map(
          (multiple ? options.targets : [value]).map((v) => {
            const u = resolve(v);
            return [u.uid, u];
          }),
        ).values(),
      ];
  const dangerous = !["repair", "rearm", "refuel"].includes(base);
  targets = targets.filter(
    (u) =>
      !all ||
      !dangerous ||
      rank(accountRank(access, u)) < rank(actor.role) ||
      (["demote", "promote", "allowcodes"].includes(base) &&
        ((u.rankChangedBy || u.giftedBy) === actor.uid ||
          (base === "allowcodes" && u.codeLockBy === actor.uid))),
  );
  if (!targets.length) throw Error("No eligible pilots.");
  for (const u of targets)
    if (
      dangerous &&
      (u.uid === actor.uid ||
        rank(accountRole(access, u)) >= rank(actor.role)) &&
      !(
        ["demote", "promote", "allowcodes"].includes(base) &&
        u.uid !== actor.uid &&
        (u.rankChangedBy || u.giftedBy) === actor.uid
      )
    )
      throw Error("Choose a lower-rank pilot.");
  const liftFields = {
    unban: ["bannedUntil", "kickedUntil", "warningUntil"],
    unkick: ["kickedUntil"],
    unwarn: ["warningUntil"],
    unmute: ["mutedUntil"],
    rearm: ["disarmedUntil"],
  };
  const canLift = (u) =>
    !(liftFields[base] || []).some(
      (field) =>
        u[field] > Date.now() &&
        ((base === "rearm" && u.uid === actor.uid) ||
          rank(u[field.replace("Until", "ByRole")] || u.banByRole) >
            rank(actor.role)),
    );
  if (all) targets = targets.filter(canLift);
  else if (targets.some((u) => !canLift(u)))
    throw Error(
      "A higher-rank staff restriction is active. Ask that staff member to lift it.",
    );
  if (!targets.length)
    throw Error("No eligible pilots; higher-rank restrictions are protected.");
  let span, reason, level;
  if (["kick", "ban", "mute", "warn", "disarm"].includes(base)) {
    span =
      base === "disarm"
        ? 4e15
        : duration(
            rest[0],
            {
              kick: 300000,
              ban: 3600000,
              mute: 600000,
              warn: 10000,
              disarm: 600000,
            }[base],
          );
    if (base === "disarm" && rest.length)
      throw Error("Disarm has no timer: use /disarm {Pilot} or /disarmall.");
    reason =
      rest
        .slice(rest[0] === undefined ? 0 : 1)
        .join(" ")
        .trim() ||
      `${base} issued by ${actor.account.pilotName || actor.account.displayName}`;
    if (reason.length > 240) throw Error("Reason is too long.");
  }
  if (["demote", "promote"].includes(base)) {
    level = rest[0]?.toLowerCase();
    if (
      (base === "demote"
        ? rest.length < 1 ||
          rest.length > 2 ||
          (rest[1] !== undefined &&
            !["lockcodes", "permanent"].includes(rest[1].toLowerCase()))
        : rest.length !== 1) ||
      !ROLES.some((r) => r.id === level)
    )
      throw Error("Choose a valid access level.");
    const eligible = (u) =>
      base === "demote"
        ? rank(level) < rank(accountRole(access, u)) ||
          (rest[1] &&
            rank(level) === rank(accountRole(access, u)) &&
            !u.codeChangesLocked)
        : rank(level) > rank(accountRole(access, u));
    if (all) targets = targets.filter(eligible);
    else if (targets.some((u) => !eligible(u)))
      throw Error(
        "Choose a lower level for demote or a higher level for promote.",
      );
    if (!targets.length) throw Error("No pilots need that rank change.");
  }
  if (spec.flightAction && base !== "disarm") {
    const original = commandByName(base);
    if (!original || original.scope !== "flight")
      throw Error("Unsupported aircraft action.");
    if (rest.length > (original.selfArgs ?? 0))
      throw Error("Too many aircraft arguments.");
    validateAircraftArgs(base, rest);
    if (rest.some((v) => /[{}]/.test(v)))
      throw Error("Replace command placeholders first.");
  }
  if (
    spec.flightAction &&
    base !== "disarm" &&
    targets.some((u) => (u.pendingActions || []).length >= 30)
  )
    throw Error(
      "A pilot has too many queued actions. Retry after their next flight.",
    );
  const results = [];
  for (const u of targets) {
    const now = Date.now(),
      patch = {};
    let action;
    if (["kick", "ban", "warn", "mute", "disarm"].includes(base)) {
      const key = {
        kick: "kickedUntil",
        ban: "bannedUntil",
        warn: "warningUntil",
        mute: "mutedUntil",
        disarm: "disarmedUntil",
      }[base];
      Object.assign(patch, {
        [key]: span >= 4e15 ? 4e15 : now + span,
        [key.replace("Until", "ByRole")]: actor.role,
        moderationReason: reason,
        moderationBy: actor.uid,
        restrictionReasons: { ...(u.restrictionReasons || {}), [base]: reason },
      });
      if (base === "ban")
        Object.assign(patch, {
          banId: u.uid,
          banName: u.pilotName || u.displayName,
          banRole: accountRole(access, u),
          banByRole: actor.role,
        });
    } else if (base === "unban")
      Object.assign(patch, { bannedUntil: 0, kickedUntil: 0, warningUntil: 0 });
    else if (base === "unmute") patch.mutedUntil = 0;
    else if (base === "unkick") patch.kickedUntil = 0;
    else if (base === "unwarn") patch.warningUntil = 0;
    else if (["demote", "promote"].includes(base))
      Object.assign(patch, {
        assignedRole: level,
        giftedRole: null,
        giftedBy: null,
        rankChangedBy: actor.uid,
        ...(base === "demote" && rest[1]
          ? { codeChangesLocked: true, codeLockBy: actor.uid }
          : {}),
      });
    else if (base === "lockcodes")
      Object.assign(patch, { codeChangesLocked: true, codeLockBy: actor.uid });
    else if (base === "allowcodes") patch.codeChangesLocked = false;
    else if (base === "rearm") {
      patch.disarmedUntil = 0;
      action = { name: "rearm", args: rest };
    } else if (spec.flightAction || base === "repair")
      action = { name: base, args: rest };
    else throw Error("Unsupported account action.");
    if (action) {
      const queue = u.pendingActions || [];
      if (queue.length >= 30)
        throw Error(`Too many pending actions for ${u.pilotName || u.uid}.`);
      patch.pendingActions = [
        ...queue,
        {
          ...action,
          id: crypto.randomUUID(),
          by: actor.account.pilotName || actor.account.displayName,
          role: actor.role,
          created: now,
        },
      ];
    }
    access.accounts.ban(u.uid, patch);
    for (const c of access.hub?.clients || [])
      if (access.sessions.get(c.authToken)?.uid === u.uid) {
        if (accountLock(u)) {
          access.hub.exit(c);
          c.send({ t: "account-lock", lock: accountLock(u) });
        } else c.send({ t: "account-state-changed" });
      }
    results.push(
      `${u.pilotName || u.displayName}: ${base}${span ? (base === "disarm" ? " until rearmed" : span >= 4e15 ? " (infinite)" : " until " + new Date(now + span).toISOString()) : ""}${action ? " (queued for their active flight)" : ""}`,
    );
  }
  return { text: results.join("\n"), data: { count: targets.length } };
}
