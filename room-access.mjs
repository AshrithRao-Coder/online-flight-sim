import crypto from "node:crypto";
const label = (u) => u?.pilotName || u?.displayName || "Pilot";
const friends = (access, a, b) => {
  const x = access.accounts.users.get(a),
    y = access.accounts.users.get(b);
  return (
    !!x &&
    !!y &&
    ((x.friendships || []).some((e) => e.to === b && e.state === "accepted") ||
      (y.friendships || []).some((e) => e.to === a && e.state === "accepted"))
  );
};
function peerRoom(access, uid) {
  const hub = access.hub;
  if (!hub) return null;
  const peer = [...hub.clients].find(
    (c) =>
      c.room &&
      hub.rooms.has(c.room) &&
      access.session(c.authToken)?.uid === uid,
  );
  return peer ? hub.rooms.get(peer.room) : null;
}
export function friendRoomSummary(access, uid) {
  const room = peerRoom(access, uid);
  return room
    ? {
        name: room.name,
        private: !!room.private,
        mode: room.mode,
        full: access.hub.members(room.id).length >= 24,
      }
    : null;
}
function current(access, token) {
  const s = access.require(token, "play");
  if (!s.uid) throw Error("Sign in to use multiplayer.");
  if (!access.hub) throw Error("Multiplayer needs the game server.");
  return s;
}
function info(access, room) {
  return {
    id: room.id,
    name: room.name,
    private: !!room.private,
    mode: room.mode,
    ownerId: room.ownerUid || null,
    pilots: access.hub.members(room.id).length,
    max: 24,
  };
}
function ready(access, room) {
  if (!room) throw Error("That room no longer exists.");
  if (access.hub.members(room.id).length >= 24)
    throw Error("Room full. Try again when a pilot leaves.");
  if (room.locked || access.hub.lobbyLocked)
    throw Error("Room joining is locked by staff.");
}
function notify(access, uid, text, from) {
  const u = access.accounts.users.get(uid);
  if (!u) return;
  u.socialNotices = [
    ...(u.socialNotices || []),
    {
      id: crypto.randomUUID(),
      kind: "room",
      text,
      fromId: from,
      at: Date.now(),
      read: false,
    },
  ].slice(-50);
}
function requests(access) {
  const hub = access.hub;
  hub.joinRequests ??= new Map();
  for (const [id, r] of hub.joinRequests)
    if (
      r.expires <= Date.now() ||
      !hub.rooms.has(r.roomId) ||
      !friends(access, r.from, r.friend) ||
      peerRoom(access, r.friend)?.id !== r.roomId
    )
      hub.joinRequests.delete(id);
  return hub.joinRequests;
}
export function roomAccessState(access, token) {
  const me = current(access, token),
    hub = access.hub;
  const list = requests(access);
  return {
    requests: [...list.values()]
      .filter(
        (r) =>
          hub.rooms.get(r.roomId).ownerUid === me.uid && r.status === "pending",
      )
      .map((r) => ({
        id: r.id,
        name: label(access.accounts.users.get(r.from)),
        friendName: label(access.accounts.users.get(r.friend)),
        room: info(access, hub.rooms.get(r.roomId)),
        expires: r.expires,
      })),
    approvals: [...list.values()]
      .filter((r) => r.from === me.uid)
      .map((r) => ({
        id: r.id,
        status: r.status,
        roomName: hub.rooms.get(r.roomId).name,
        full: hub.members(r.roomId).length >= 24,
        expires: r.expires,
      })),
    owned: [...hub.rooms.values()]
      .filter((r) => r.ownerUid === me.uid)
      .map((r) => info(access, r)),
  };
}
export function roomAccessAction(
  access,
  token,
  { action, targetId, requestId, roomId } = {},
) {
  const me = current(access, token),
    hub = access.hub,
    list = requests(access);
  if (action === "delete") {
    const room = hub.rooms.get(roomId);
    if (!room) throw Error("That room no longer exists.");
    if (room.ownerUid !== me.uid)
      throw Error("Only the creator can delete this room.");
    const members = hub.members(room.id);
    hub.rooms.delete(room.id);
    for (const p of members) {
      p.room = null;
      p.state = null;
      p.send({ t: "closed", error: "The creator deleted this room." });
    }
    for (const [id, r] of list)
      if (r.roomId === room.id) {
        notify(
          access,
          r.from,
          "The room you requested has been deleted.",
          me.uid,
        );
        list.delete(id);
      }
    access.accounts.save();
    return {
      text: "Room deleted. All pilots have returned to the multiplayer lobby.",
    };
  }
  if (action === "request") {
    if (!friends(access, me.uid, targetId))
      throw Error("You can join only an accepted friend through Friends.");
    const room = peerRoom(access, targetId);
    if (!room) throw Error("This friend is not in a multiplayer room.");
    ready(access, room);
    if (!room.private || room.ownerUid === me.uid)
      return { room: info(access, room), text: "Joined " + room.name + "." };
    if (!room.ownerUid)
      throw Error(
        "This private room has no available owner. Ask your friend for its room code.",
      );
    const existing = [...list.values()].find(
      (r) => r.from === me.uid && r.roomId === room.id,
    );
    if (existing?.status === "approved")
      return { room: info(access, room), text: "Joining " + room.name + "." };
    if (existing)
      return { text: "Your request is waiting for the private-room owner." };
    if (
      [...list.values()].filter((r) => r.from === me.uid).length >= 10 ||
      [...list.values()].filter((r) => r.roomId === room.id).length >= 50
    )
      throw Error("Too many pending room requests. Please wait.");
    const r = {
      id: crypto.randomUUID(),
      from: me.uid,
      friend: targetId,
      roomId: room.id,
      status: "pending",
      expires: Date.now() + 10 * 60000,
    };
    list.set(r.id, r);
    notify(
      access,
      room.ownerUid,
      label(access.accounts.users.get(me.uid)) +
        " requests to join " +
        room.name +
        " to fly with " +
        label(access.accounts.users.get(targetId)) +
        ". Open Multiplayer to respond.",
      me.uid,
    );
    access.accounts.save();
    return {
      text: "Request sent to the private-room owner. You will be notified when they respond.",
    };
  }
  const r = list.get(requestId);
  if (!r)
    throw Error("This room request has expired or the friend left the room.");
  const room = hub.rooms.get(r.roomId);
  if (action === "approve" || action === "decline") {
    if (room.ownerUid !== me.uid)
      throw Error("Only the private-room owner can respond.");
    if (action === "approve") {
      ready(access, room);
      r.status = "approved";
      notify(
        access,
        r.from,
        label(access.accounts.users.get(me.uid)) +
          " approved your request to join " +
          room.name +
          ". Open Friends or Multiplayer to join.",
        me.uid,
      );
    } else {
      list.delete(r.id);
      notify(
        access,
        r.from,
        label(access.accounts.users.get(me.uid)) +
          " declined your request to join " +
          room.name +
          ".",
        me.uid,
      );
    }
    access.accounts.save();
    return {
      text:
        action === "approve"
          ? "Join request approved."
          : "Join request declined.",
    };
  }
  if (r.from !== me.uid) throw Error("This request belongs to another pilot.");
  if (action === "cancel") {
    list.delete(r.id);
    return { text: "Join request cancelled." };
  }
  if (action === "join") {
    if (r.status !== "approved")
      throw Error("Wait for the private-room owner to approve your request.");
    ready(access, room);
    return { room: info(access, room), text: "Joined " + room.name + "." };
  }
  throw Error("Unknown room action.");
}
