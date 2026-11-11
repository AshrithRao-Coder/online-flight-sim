import { duration, executeAccountCommand } from "./account-actions.mjs";
import { commandByName } from "./command-catalog.js";
import { rank } from "./access-policy.js";
const text = (args) => {
  const s = args
    .join(" ")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .trim();
  if (!s || s.length > 240) throw Error("Enter 1 to 240 characters.");
  return s;
};
export function executeServerCommand(hub, c, name, args, profile = {}) {
  if (hub.requireAccounts && commandByName(name)?.accountAction)
    return executeAccountCommand(hub.access, c.authToken, name, args);
  const command = commandByName(name),
    actor = hub.access.session(c.authToken);
  if (!command || command.scope !== "server")
    throw Error("Unknown server command.");
  if (!actor || rank(actor.role) < rank(command.role))
    throw Error("Permission denied.");
  if (
    !Array.isArray(args) ||
    args.length > 20 ||
    args.some((a) => typeof a !== "string" || a.length > 240)
  )
    throw Error("Invalid arguments.");
  const all = (message) => {
    for (const p of hub.clients) p.send(message);
  };
  if (name === "serverrooms") {
    const rooms = [...hub.rooms.values()].map((r) => ({
      id: r.id,
      name: r.name,
      private: !!r.private,
      locked: !!r.locked,
      mode: r.mode,
      pilots: hub.members(r.id).length,
    }));
    return {
      text:
        rooms
          .map(
            (r) =>
              `${r.id}: ${r.private ? "PRIVATE" : "PUBLIC"} ${r.name} (${r.pilots} pilots${r.locked ? ", locked" : ""})`,
          )
          .join("\n") || "No rooms yet.",
      data: { rooms },
    };
  }
  if (name === "enter-room") return hub.enterRoomAsAdmin(c, args[0], profile);
  if (name === "serverstats")
    return `Uptime ${Math.floor((Date.now() - hub.started) / 1000)}s · ${hub.clients.size} pilots · ${hub.rooms.size} rooms · ${hub.access.sessions.size} sessions · lobby ${hub.lobbyLocked ? "locked" : "open"}`;
  if (name === "broadcast") {
    all({ t: "notice", text: "ADMIN: " + text(args) });
    return "Broadcast sent.";
  }
  if (name === "locklobby" || name === "unlocklobby") {
    hub.lobbyLocked = name === "locklobby";
    hub.lobbyLockedUntil = hub.lobbyLocked
      ? Date.now() + duration(args[0], 1800000)
      : 0;
    all({
      t: "notice",
      text: hub.lobbyLocked
        ? "Lobby joining locked by Admin."
        : "Lobby joining reopened.",
    });
    return "Lobby " + (hub.lobbyLocked ? "locked." : "open.");
  }
  if (name === "banlist")
    return (
      [
        ...new Map(
          [
            ...hub.access.sessions.values(),
            ...hub.access.accounts.users.values(),
          ].map((s) => [s.banId, s]),
        ).values(),
      ]
        .filter((s) => s.bannedUntil > Date.now())
        .map(
          (s) =>
            `${s.banId || "unknown"}: ${s.banName || "PILOT"} · ${Math.ceil((s.bannedUntil - Date.now()) / 60000)} minutes`,
        )
        .join("\n") || "No active session bans."
    );
  if (name === "unban") {
    const s = [
      ...hub.access.sessions.values(),
      ...hub.access.accounts.users.values(),
    ].find(
      (s) => s.banId === args[0]?.toUpperCase() && s.bannedUntil > Date.now(),
    );
    if (!s) throw Error("Unknown active ban. Use /banlist.");
    if (rank(s.banRole) >= rank(actor.role))
      throw Error("Cannot lift a peer or higher-role ban.");
    if (rank(s.banByRole) > rank(actor.role))
      throw Error("This ban was imposed by a higher role.");
    s.bannedUntil = 0;
    if (s.uid) hub.access.accounts.ban(s.uid, { bannedUntil: 0 });
    for (const entry of hub.access.sessions.values())
      if (s.uid && entry.uid === s.uid) entry.bannedUntil = 0;
    for (const [token, entry] of hub.access.sessions)
      if (entry === s || (s.uid && entry.uid === s.uid)) {
        hub.kicks.delete(token);
        hub.kicks.delete(hub.access.identityKey(token));
      }
    return "Session ban removed.";
  }
  const room = hub.rooms.get(c.room);
  if (!c.room || !room) throw Error("Join a room first.");
  if (name === "repairall") {
    if (room.mode !== "dogfight")
      throw Error("Join a dogfight room to repair other aircraft.");
    const others = hub.members(c.room).filter((p) => p !== c);
    if (!others.length) throw Error("No other aircraft in this room.");
    for (const pilot of others) pilot.send({ t: "repair-hull", by: c.name });
    return "Restored " + others.length + " other aircraft hulls to 100%.";
  }
  const members = hub.members(c.room),
    guardRoom = () => {
      if (
        members.some(
          (p) =>
            p !== c && rank(hub.access.role(p.authToken)) >= rank(actor.role),
        )
      )
        throw Error("A peer or higher role is in this room.");
    };
  const target = () => {
    const value = String(name === "warn" ? args[0] || "" : args.join(" "));
    const matches = members.filter((p) => {
      const session = hub.access.session(p.authToken);
      return hub.requireAccounts
        ? session?.uid === value ||
            (
              session?.account?.pilotName ||
              session?.account?.displayName ||
              ""
            ).toLocaleLowerCase() === value.toLocaleLowerCase()
        : p.id === Number(value);
    });
    const exact = matches.find(
      (p) => hub.access.session(p.authToken)?.uid === value,
    );
    if (
      !exact &&
      new Set(matches.map((p) => hub.access.session(p.authToken)?.uid || p.id))
        .size > 1
    )
      throw Error(
        "More than one account has that name. Choose a unique pilot name.",
      );
    const p = exact || matches[0];
    if (!p || p === c || rank(hub.access.role(p.authToken)) >= rank(actor.role))
      throw Error("Choose a lower-rank account in your room.");
    return p;
  };
  const update = () =>
    hub.broadcast(room.id, {
      t: "room-update",
      room: {
        id: room.id,
        name: room.name,
        mode: room.mode,
        private: room.private,
        ...(room.ownerUid?{ownerId:room.ownerUid}:{}),
        locked: !!room.locked,
        topic: room.topic || "",
      },
    });
  if (["kick", "mute", "ban"].includes(name)) {
    const p = target();
    const result = hub.moderate(c, {
      action: name,
      target: hub.requireAccounts ? hub.access.session(p.authToken).uid : p.id,
    });
    return name === "ban"
      ? `${result} Ban ID: ${hub.access.sessions.get(p.authToken)?.banId}`
      : result;
  }
  if (name === "close-room") return hub.moderate(c, { action: "closeRoom" });
  if (name === "unmute") {
    const p = target();
    const uid = hub.access.session(p.authToken)?.uid;
    for (const peer of hub.clients)
      if (
        peer === p ||
        (uid && hub.access.session(peer.authToken)?.uid === uid)
      ) {
        peer.mutedUntil = 0;
        hub.mutes.delete(peer.authToken);
        hub.mutes.delete(hub.access.identityKey(peer.authToken));
      }
    p.send({ t: "notice", text: "Your room chat is unmuted." });
    return "Chat restored.";
  }
  if (name === "warn") {
    const p = target();
    const uid = hub.access.session(p.authToken)?.uid;
    for (const peer of hub.clients)
      if (
        peer === p ||
        (uid && hub.access.session(peer.authToken)?.uid === uid)
      )
        peer.send({
          t: "notice",
          text: "MODERATOR WARNING: " + text(args.slice(1)),
        });
    return "Warning sent.";
  }
  if (name === "announce") {
    hub.broadcast(c.room, {
      t: "notice",
      text: "ROOM ANNOUNCEMENT: " + text(args),
    });
    return "Announcement sent.";
  }
  if (name === "slowchat") {
    const n = Number(args[0]);
    if (!Number.isInteger(n) || n < 1 || n > 30)
      throw Error("Use 1 to 30 seconds.");
    room.chatDelay = n * 1000;
    room.chatDelayUntil = Date.now() + duration(args[1], 1800000);
    hub.broadcast(c.room, {
      t: "notice",
      text: `Room chat interval: ${n} seconds. Staff exempt.`,
    });
    return "Chat interval updated.";
  }
  if (name === "clear-chat") {
    hub.broadcast(c.room, { t: "chat-clear" });
    return "Room chat cleared.";
  }
  if (name === "kickall") {
    let n = 0;
    for (const p of members)
      if (
        c.room &&
        p !== c &&
        p.room === c.room &&
        rank(hub.access.role(p.authToken)) < rank(actor.role)
      ) {
        hub.moderate(c, { action: "kick", target: p.id });
        n++;
      }
    return `Removed ${n} lower-role pilots.`;
  }
  guardRoom();
  if (name === "lockroom" || name === "unlockroom") {
    room.locked = name === "lockroom";
    room.lockUntil = room.locked ? Date.now() + duration(args[0], 1800000) : 0;
    room.lockRank = rank(actor.role);
    update();
    return "Room " + (room.locked ? "locked." : "unlocked.");
  }
  if (name === "rename-room") {
    room.name = text(args).slice(0, 24);
    update();
    return "Room renamed.";
  }
  if (name === "roomtopic") {
    room.topic = text(args);
    update();
    hub.broadcast(c.room, { t: "notice", text: "BRIEFING: " + room.topic });
    return "Room briefing updated.";
  }
  if (name === "roommode") {
    if (!["free", "dogfight"].includes(args[0]))
      throw Error("Choose free or dogfight.");
    if (args[0] === "dogfight" && !members.some((p) => hub.isArmed(p.aircraft)))
      throw Error("Dogfight needs at least one armed aircraft.");
    room.mode = args[0];
    update();
    return "Room mode updated.";
  }
  if (name === "reset-scores") {
    for (const p of members) {
      p.kills = p.deaths = 0;
      p.lastHitBy = null;
    }
    hub.broadcast(c.room, { t: "scores-reset" });
    return "Room scores reset.";
  }
  throw Error("Unknown server command.");
}
