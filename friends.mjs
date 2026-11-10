import crypto from "node:crypto";
import { accountRoster } from "./account-actions.mjs";
import { rank } from "./access-policy.js";
import { commandByName } from "./command-catalog.js";
const nameOf = (u) => u.pilotName || u.displayName || "Pilot";
function identity(access, token) {
  const s = access.require(token, "play");
  if (!s.uid) throw Error("Sign in to use Friends.");
  return access.accounts.users.get(s.uid);
}
function exact(access, name) {
  if (typeof name !== "string" || !name.trim() || name.length > 60)
    throw Error("Enter an exact pilot name.");
  const matches = [...access.accounts.users.values()].filter(
    (u) => nameOf(u).toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );
  if (matches.length !== 1)
    throw Error("No unique pilot with that name: " + name);
  return matches[0];
}
function relation(a, b) {
  const outgoing = (a.friendships || []).find((e) => e.to === b.uid);
  if (outgoing) return { owner: a, edge: outgoing };
  const incoming = (b.friendships || []).find((e) => e.to === a.uid);
  return incoming ? { owner: b, edge: incoming } : null;
}
function notice(user, text, fromId, kind = "friend") {
  user.socialNotices = [
    ...(user.socialNotices || []),
    {
      id: crypto.randomUUID(),
      text,
      fromId,
      kind,
      at: Date.now(),
      read: false,
    },
  ].slice(-50);
}
function transaction(access, work) {
  const before = structuredClone([...access.accounts.users]);
  try {
    const result = work();
    access.accounts.save();
    return result;
  } catch (e) {
    access.accounts.users = new Map(before);
    throw e;
  }
}
function countFriends(access, user) {
  let count = 0;
  for (const owner of access.accounts.users.values())
    for (const e of owner.friendships || [])
      if (
        e.state === "accepted" &&
        (owner.uid === user.uid || e.to === user.uid)
      )
        count++;
  return count;
}
function accept(access, a, b, staffName) {
  if (countFriends(access, a) >= 200 || countFriends(access, b) >= 200)
    throw Error("A pilot has reached the 200-friend limit.");
  const r = relation(a, b);
  if (r?.edge.state === "accepted") return false;
  if (r) r.edge.state = "accepted";
  else
    a.friendships = [
      ...(a.friendships || []),
      { to: b.uid, state: "accepted", created: Date.now() },
    ];
  if (staffName) {
    notice(a, staffName + " added " + nameOf(b) + " as your friend.", b.uid);
    notice(b, staffName + " added " + nameOf(a) + " as your friend.", a.uid);
  }
  return true;
}
export function friendsState(access, token) {
  const me = identity(access, token),
    roster = new Map(accountRoster(access).map((p) => [p.uid, p]));
  const result = {
    friends: [],
    incoming: [],
    outgoing: [],
    notices: me.socialNotices || [],
  };
  for (const owner of access.accounts.users.values())
    for (const edge of owner.friendships || []) {
      if (owner.uid !== me.uid && edge.to !== me.uid) continue;
      const other = roster.get(owner.uid === me.uid ? edge.to : owner.uid);
      if (!other) continue;
      result[
        edge.state === "accepted"
          ? "friends"
          : owner.uid === me.uid
            ? "outgoing"
            : "incoming"
      ].push({
        id: other.uid,
        name: other.name,
        role: other.role,
        online: other.online,
      });
    }
  for (const key of ["friends", "incoming", "outgoing"])
    result[key].sort(
      (a, b) =>
        Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    );
  return result;
}
export function friendMessages(access, token, targetId) {
  const me = identity(access, token),
    other = access.accounts.users.get(targetId),
    r = other && relation(me, other);
  if (!r || r.edge.state !== "accepted")
    throw Error("Private chat is available only between friends.");
  return {
    pilot: { id: other.uid, name: nameOf(other) },
    messages: (r.edge.messages || []).map((m) => ({
      ...m,
      name: nameOf(access.accounts.users.get(m.from) || {}),
    })),
  };
}
export function friendAction(
  access,
  token,
  { action, pilotName, targetId, text, ids } = {},
) {
  const me = identity(access, token),
    users = access.accounts.users;
  if (action === "read") {
    const read = new Set(Array.isArray(ids) ? ids.slice(0, 50) : []);
    if ((me.socialNotices || []).some((n) => read.has(n.id) && !n.read))
      transaction(access, () => {
        for (const n of me.socialNotices || [])
          if (read.has(n.id)) n.read = true;
      });
    return friendsState(access, token);
  }
  const target =
    action === "request" ? exact(access, pilotName) : users.get(targetId);
  if (!target || target.uid === me.uid) throw Error("Choose another pilot.");
  const r = relation(me, target),
    incoming = r?.owner.uid === target.uid;
  const messages = {
    request: "Friend request sent to " + nameOf(target) + ".",
    accept: nameOf(target) + " added as a friend.",
    decline: nameOf(target) + "’s friend request declined.",
    cancel: "Friend request to " + nameOf(target) + " cancelled.",
    remove: nameOf(target) + " removed from your friends.",
    message: "Message sent.",
  };
  transaction(access, () => {
    if (action === "request") {
      if (r) throw Error("You are already friends or have a pending request.");
      if (
        countFriends(access, me) >= 200 ||
        (me.friendships || []).filter((e) => e.state === "pending").length >= 50
      )
        throw Error("Friend or request limit reached.");
      const received = [...users.values()].reduce(
        (n, u) =>
          n +
          (u.friendships || []).filter(
            (e) => e.to === target.uid && e.state === "pending",
          ).length,
        0,
      );
      if (received >= 50)
        throw Error("That pilot has too many pending requests.");
      me.friendships = [
        ...(me.friendships || []),
        { to: target.uid, state: "pending", created: Date.now() },
      ];
      notice(target, nameOf(me) + " sent you a friend request.", me.uid);
    } else if (action === "accept" && incoming && r.edge.state === "pending") {
      accept(access, me, target);
      notice(target, nameOf(me) + " accepted your friend request.", me.uid);
    } else if (action === "decline" && incoming && r.edge.state === "pending") {
      r.owner.friendships = r.owner.friendships.filter((e) => e !== r.edge);
      notice(target, nameOf(me) + " declined your friend request.", me.uid);
    } else if (
      action === "cancel" &&
      r &&
      !incoming &&
      r.edge.state === "pending"
    ) {
      r.owner.friendships = r.owner.friendships.filter((e) => e !== r.edge);
      notice(target, nameOf(me) + " cancelled their friend request.", me.uid);
    } else if (action === "remove" && r?.edge.state === "accepted") {
      r.owner.friendships = r.owner.friendships.filter((e) => e !== r.edge);
      notice(target, nameOf(me) + " removed you as a friend.", me.uid);
    } else if (action === "message" && r?.edge.state === "accepted") {
      if (typeof text !== "string" || !text.trim() || text.length > 400)
        throw Error("Messages need 1–400 characters.");
      if ((me.mutedUntil || 0) > Date.now())
        throw Error("You are muted and cannot send private messages.");
      const now = Date.now(),
        recent = me.socialMessageTimes?.filter((t) => t > now - 60000) || [];
      if (recent.length >= 20)
        throw Error("Please wait before sending more messages.");
      me.socialMessageTimes = [...recent, now];
      r.edge.messages = [
        ...(r.edge.messages || []),
        { id: crypto.randomUUID(), from: me.uid, text: text.trim(), at: now },
      ].slice(-50);
      // Bound the combined history on the owning account to fit a Firestore document.
      const all = (r.owner.friendships || [])
        .flatMap((e) => e.messages || [])
        .sort((a, b) => b.at - a.at);
      const keep = new Set(all.slice(0, 300).map((m) => m.id));
      for (const edge of r.owner.friendships || [])
        if (edge.messages)
          edge.messages = edge.messages.filter((m) => keep.has(m.id));
      notice(
        target,
        nameOf(me) + " sent you a private message.",
        me.uid,
        "message",
      );
    } else throw Error("This friend action is no longer available.");
  });
  return { ...friendsState(access, token), text: messages[action] };
}
export function executeFriendCommand(
  access,
  token,
  name,
  args = [],
  groups = [],
) {
  const spec = commandByName(name),
    actor = access.session(token);
  if (
    !spec?.friendModeration ||
    !actor?.uid ||
    rank(actor.role) < rank("moderator")
  )
    throw Error("Moderator access required.");
  if (
    !Array.isArray(args) ||
    args.length !== (spec.allPilots ? 1 : 2) ||
    args.some((a) => typeof a !== "string")
  )
    throw Error("Use the pilot-name placeholders shown in Quick commands.");
  if (!Array.isArray(groups) || groups.length > 2)
    throw Error("Invalid pilot groups.");
  const fields = new Map();
  for (const g of groups) {
    if (
      !g ||
      !Number.isInteger(g.index) ||
      g.index < 0 ||
      g.index >= (spec.allPilots ? 1 : 2) ||
      fields.has(g.index) ||
      !Array.isArray(g.names) ||
      g.names.length < 2 ||
      g.names.length > 20 ||
      g.names.some((n) => typeof n !== "string")
    )
      throw Error("Invalid pilot groups.");
    fields.set(g.index, g.names);
  }
  const resolve = (index) => [
    ...new Map(
      (fields.get(index) || [args[index]]).map((n) => {
        const u = exact(access, n);
        return [u.uid, u];
      }),
    ).values(),
  ];
  const first = resolve(0),
    second = spec.allPilots ? [...access.accounts.users.values()] : resolve(1),
    pairs = new Map();
  for (const a of first)
    for (const b of second)
      if (a.uid !== b.uid) pairs.set([a.uid, b.uid].sort().join("\0"), [a, b]);
  if (!pairs.size) throw Error("Choose two different pilots.");
  if (pairs.size > 400)
    throw Error("Use at most 400 friendship pairs per command.");
  let changed = 0;
  transaction(access, () => {
    for (const [a, b] of pairs.values()) {
      if (spec.friendModeration === "add") {
        if (accept(access, a, b, actor.account?.pilotName || "A moderator"))
          changed++;
      } else {
        const r = relation(a, b);
        if (!r) continue;
        r.owner.friendships = r.owner.friendships.filter((e) => e !== r.edge);
        const staff = actor.account?.pilotName || "A moderator";
        notice(
          a,
          staff + " removed your friendship or request with " + nameOf(b) + ".",
          b.uid,
        );
        notice(
          b,
          staff + " removed your friendship or request with " + nameOf(a) + ".",
          a.uid,
        );
        changed++;
      }
    }
  });
  return {
    text:
      changed +
      " friendship" +
      (changed === 1 ? "" : "s") +
      " " +
      (spec.friendModeration === "add" ? "created" : "removed") +
      ".",
  };
}
