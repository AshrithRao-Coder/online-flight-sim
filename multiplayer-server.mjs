// Multiplayer relay: a minimal WebSocket server (RFC 6455, text frames only)
// on /api/mp. Players connect to the lobby, see the public rooms players have
// made, then join one (or a private one by its code) or create their own:
// free flight (no weapons) or dogfight, public or private. There are no
// standing rooms: a room exists only once someone makes it. In a room each player sends its
// own position ten times a second and the server shares everyone's latest
// position with the rest of the room ten times a second. Hits are decided by
// the shooter's game and relayed to the target, only in dogfight rooms; the
// victim announces its own destruction and the server credits whoever hit it
// last.
import crypto from 'node:crypto';

const MAX_PLAYERS = 150, MAX_ROOM = 24, MAX_ROOMS = 200, MAX_MESSAGE = 2048;
// Per player: messages a second on average, and the burst allowed.
const RATE = 40, BURST = 80;
// Damage one shooter may deal one target per second (a full gun burst is
// about 60; a missile 100).
const DAMAGE_PER_SECOND = 140;
// Room codes: no 0/O or 1/I, so they read aloud cleanly.
const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Names: letters, digits, space, - and _. A few words are refused outright
// (checked with common letter swaps and spacing removed).
const BLOCKED = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'penis', 'vagina', 'dick', 'cock', 'pussy', 'porn', 'sex', 'kys', 'retard'];
const SWAPS = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };
export function cleanName(raw, fallback = 'PILOT', max = 16) {
  let name = String(raw ?? '').replace(/[^A-Za-z0-9 _-]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const flat = String(raw ?? '').toLowerCase().replace(/./g, (c) => SWAPS[c] ?? c).replace(/[^a-z]/g, '');
  if (name.length < 2 || BLOCKED.some((w) => flat.includes(w))) name = fallback;
  return name.toUpperCase();
}
const finite = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
// A position report: lat, lon, altitude (m), heading, pitch, bank (deg),
// speed (m/s) and flag bits (1 gear down, 2 firing, 4 afterburner, 8 down).
export function validState(d) {
  return Array.isArray(d) && d.length === 8 && finite(d[0], -90, 90) && finite(d[1], -180, 180) &&
    finite(d[2], -1000, 30000) && finite(d[3], -360, 720) && finite(d[4], -180, 180) &&
    finite(d[5], -360, 360) && finite(d[6], 0, 1500) && Number.isInteger(d[7]) && d[7] >= 0 && d[7] < 256;
}
const validAircraft = (a) => typeof a === 'string' && /^[a-z0-9]{1,12}$/.test(a);
// A position (lat, lon, altitude) and, for a drop, a velocity (m/s).
const validPoint = (d) => finite(d[0], -90, 90) && finite(d[1], -180, 180) && finite(d[2], -1000, 30000) &&
  d.slice(3).every((v) => finite(v, -2000, 2000));
// Aircraft that can hurt other planes: the fighters' guns and missiles, and
// the bombers (the B-29's turrets, and every bomber's bomb blasts).
export const ARMED = new Set(['f14', 'f15', 'f16', 'su27', 'su33', 'su37', 'b1b', 'b2', 'b29']);

// ── frames ────────────────────────────────────────────────────────────────────
function frame(opcode, payload = Buffer.alloc(0)) {
  const n = payload.length,
    head = n < 126 ? Buffer.from([0x80 | opcode, n]) : n < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
  if (n >= 126) {
    head[0] = 0x80 | opcode;
    if (n < 65536) { head[1] = 126; head.writeUInt16BE(n, 2); }
    else { head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  }
  return Buffer.concat([head, payload]);
}

class Client {
  constructor(socket, hub) {
    this.socket = socket;
    this.hub = hub;
    this.id = hub.nextId++;
    this.buffer = Buffer.alloc(0);
    this.tokens = BURST;
    this.lastRefill = Date.now();
    this.lastSeen = Date.now();
    this.room = null;
    this.name = null;
    this.aircraft = 'f16';
    this.state = null;
    this.kills = 0;
    this.deaths = 0;
    this.lastHitBy = null;
    this.damageGiven = new Map(); // target id -> { since, amount }
    this.created = 0;
    socket.setNoDelay(true);
    socket.on('data', (chunk) => this.data(chunk));
    socket.on('close', () => hub.leave(this));
    socket.on('error', () => socket.destroy());
  }
  send(message) {
    if (!this.socket.destroyed) this.socket.write(frame(1, Buffer.from(JSON.stringify(message))));
  }
  close(code = 1000) {
    if (this.socket.destroyed) return;
    const p = Buffer.alloc(2); p.writeUInt16BE(code);
    this.socket.end(frame(8, p));
  }
  data(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0], b1 = this.buffer[1], opcode = b0 & 15;
      // Clients must mask; fragmented messages are not used by the game.
      if (!(b1 & 0x80) || !(b0 & 0x80)) return this.close(1002);
      let len = b1 & 127, at = 2;
      if (len === 126) { if (this.buffer.length < 4) return; len = this.buffer.readUInt16BE(2); at = 4; }
      else if (len === 127) return this.close(1009);
      if (len > MAX_MESSAGE) return this.close(1009);
      if (this.buffer.length < at + 4 + len) return;
      const mask = this.buffer.subarray(at, at + 4), payload = Buffer.from(this.buffer.subarray(at + 4, at + 4 + len));
      for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      this.buffer = this.buffer.subarray(at + 4 + len);
      this.lastSeen = Date.now();
      if (opcode === 8) return this.close();
      if (opcode === 9) { this.socket.write(frame(10, payload)); continue; }
      if (opcode !== 1) continue;
      if (!this.allow()) return this.close(1008);
      let message;
      try { message = JSON.parse(payload.toString('utf8')); } catch { continue; }
      if (message && typeof message === 'object') this.hub.message(this, message);
    }
  }
  allow() {
    const now = Date.now();
    this.tokens = Math.min(BURST, this.tokens + ((now - this.lastRefill) / 1000) * RATE);
    this.lastRefill = now;
    if (this.tokens < 1) return false;
    this.tokens--;
    return true;
  }
  get info() {
    return { id: this.id, name: this.name, aircraft: this.aircraft, kills: this.kills, deaths: this.deaths };
  }
}

export class MultiplayerHub {
  constructor() {
    this.nextId = 1;
    this.clients = new Set();
    // id -> { id, name, mode, private, permanent, empty (time it emptied) }
    this.rooms = new Map();
    this.timer = setInterval(() => this.tick(), 100);
    this.timer.unref?.();
  }
  upgrade(req, socket) {
    const key = req.headers['sec-websocket-key'];
    if (!key || req.headers.upgrade?.toLowerCase() !== 'websocket' || this.clients.size >= MAX_PLAYERS) {
      socket.end('HTTP/1.1 ' + (key ? '503 Service Unavailable' : '400 Bad Request') + '\r\n\r\n');
      return;
    }
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    this.clients.add(new Client(socket, this));
  }
  members(id) {
    return [...this.clients].filter((c) => c.room === id);
  }
  broadcast(id, message, except = null) {
    for (const c of this.clients) if (c.room === id && c !== except) c.send(message);
  }
  // Public rooms for the lobby, busiest first (the two standing rooms lead).
  list() {
    return [...this.rooms.values()]
      .filter((r) => !r.private)
      .map((r) => ({ id: r.id, name: r.name, mode: r.mode, pilots: this.members(r.id).length, max: MAX_ROOM }))
      .sort((a, b) => b.pilots - a.pilots)
      .slice(0, 60);
  }
  newCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < 5; i++) code += CODE[crypto.randomInt(CODE.length)];
      if (!this.rooms.has(code)) return code;
    }
  }
  message(c, m) {
    if (m.t === 'rooms') { c.send({ t: 'rooms', list: this.list() }); return; }
    if (m.t === 'hello') {
      if (c.room) return;
      let room;
      if (m.create && typeof m.create === 'object') {
        // A new room. One player may make a few an hour.
        if (this.rooms.size >= MAX_ROOMS || c.created >= 5) { c.send({ t: 'error', error: 'No more rooms can be made right now. Join an open one.' }); return; }
        if (m.create.mode === 'dogfight' && !ARMED.has(m.aircraft)) { c.send({ t: 'error', error: 'Only armed aircraft can make a dogfight room: choose a fighter or a bomber, or make a free-flight room.' }); return; }
        c.created++;
        room = {
          id: this.newCode(),
          name: cleanName(m.create.name, `${cleanName(m.name, 'PILOT')}'S ROOM`.replace(/'/g, ''), 24),
          mode: m.create.mode === 'dogfight' ? 'dogfight' : 'free',
          private: !!m.create.private,
          empty: null,
        };
        this.rooms.set(room.id, room);
      } else {
        room = this.rooms.get(String(m.room ?? '').toUpperCase().trim());
        if (!room) { c.send({ t: 'error', error: 'There is no room with that code. Check it and try again.' }); return; }
      }
      if (this.members(room.id).length >= MAX_ROOM) { c.send({ t: 'error', error: 'That room is full. Try another.' }); return; }
      c.room = room.id;
      room.empty = null;
      c.name = cleanName(m.name, `PILOT ${c.id}`);
      if (this.members(room.id).some((o) => o !== c && o.name === c.name)) c.name = `${c.name.slice(0, 13)} ${c.id % 100}`;
      c.aircraft = validAircraft(m.aircraft) ? m.aircraft : 'f16';
      c.kills = c.deaths = 0;
      c.send({
        t: 'welcome', id: c.id, name: c.name,
        room: { id: room.id, name: room.name, mode: room.mode, private: room.private },
        combat: room.mode === 'dogfight',
        players: this.members(room.id).filter((o) => o !== c).map((o) => o.info),
      });
      this.broadcast(room.id, { t: 'join', p: c.info }, c);
      this.checkArmed(room.id);
      return;
    }
    if (!c.room) return;
    const room = this.rooms.get(c.room);
    if (m.t === 'leave') { this.exit(c); c.send({ t: 'left' }); return; }
    if (m.t === 's' && validState(m.d)) { c.state = m.d; return; }
    if (m.t === 'plane' && validAircraft(m.aircraft)) {
      c.aircraft = m.aircraft;
      this.broadcast(c.room, { t: 'plane', id: c.id, aircraft: c.aircraft }, c);
      this.checkArmed(c.room);
      return;
    }
    if (room?.mode !== 'dogfight') return;
    const target = [...this.clients].find((o) => o.id === m.target && o.room === c.room && o !== c);
    if (m.t === 'hit' && target && Number.isFinite(m.dmg) && m.dmg > 0) {
      // Cap the damage a shooter can deal a target in any one second.
      const now = Date.now(), given = c.damageGiven.get(target.id);
      const window = given && now - given.since < 1000 ? given : { since: now, amount: 0 };
      const dmg = Math.min(m.dmg, 100, DAMAGE_PER_SECOND - window.amount);
      if (dmg <= 0) return;
      window.amount += dmg;
      c.damageGiven.set(target.id, window);
      target.lastHitBy = { id: c.id, at: now };
      const blast = m.why === 'blast' ? { why: 'blast', ...(typeof m.weapon === 'string' && /^[A-Z0-9 -]{1,16}$/.test(m.weapon) ? { weapon: m.weapon } : {}) } : {};
      target.send({ t: 'hit', from: c.id, dmg: Math.round(dmg * 10) / 10, ...blast });
      return;
    }
    // A missile's flight, from the game that fired it (ten updates a second
    // per missile; a few missiles at once at most).
    if (m.t === 'mst' && typeof m.id === 'string' && /^[0-9]{1,9}$/.test(m.id) && Array.isArray(m.d) && m.d.length === 6 && validPoint(m.d) && [0, 1, 2, 3].includes(m.s)) {
      const now = Date.now();
      if (!c.mstWindow || now - c.mstWindow.since > 1000) c.mstWindow = { since: now, n: 0 };
      if (++c.mstWindow.n > 80) return;
      this.broadcast(c.room, { t: 'mst', from: c.id, id: m.id, d: m.d, s: m.s, ...(target ? { target: target.id } : {}), ...(m.boom === true ? { boom: true } : {}) }, c);
      return;
    }
    if (m.t === 'mlost' && target) { this.broadcast(c.room, { t: 'mlost', from: c.id, target: target.id, own: m.own === true }, c); return; }
    if (m.t === 'reacq' && target) { this.broadcast(c.room, { t: 'reacq', from: c.id, target: target.id }, c); return; }
    if (m.t === 'msl' && target) { this.broadcast(c.room, { t: 'msl', from: c.id, target: target.id }, c); return; }
    // Flares, as fast as a dispenser program runs (0.5 s), no faster.
    if (m.t === 'flare' && Array.isArray(m.d) && m.d.length === 6 && validPoint(m.d)) {
      const now = Date.now();
      if (now - (c.lastFlare || 0) < 400) return;
      c.lastFlare = now;
      const fooled = Array.isArray(m.fooled) ? m.fooled.slice(0, 12).filter((x) => typeof x === 'string' && /^[0-9]{1,9}$/.test(x)) : [];
      this.broadcast(c.room, { t: 'flare', from: c.id, d: m.d, fooled }, c);
      return;
    }
    // Bombs: the drop and the burst, shown to the rest of the room.
    if ((m.t === 'bomb' || m.t === 'boom') && typeof m.id === 'string' && /^[0-9-]{1,24}$/.test(m.id) &&
        typeof m.type === 'string' && /^[a-z0-9_]{1,16}$/.test(m.type) && Array.isArray(m.d) &&
        m.d.length === (m.t === 'bomb' ? 6 : 3) && validPoint(m.d)) {
      this.broadcast(c.room, { t: m.t, from: c.id, id: m.id, type: m.type, d: m.d, ...(m.t === 'boom' ? { air: !!m.air } : {}) }, c);
      return;
    }
    if (m.t === 'down') {
      // Credit whoever hit the victim in the last 15 seconds.
      const hit = c.lastHitBy && Date.now() - c.lastHitBy.at < 15000 ? c.lastHitBy : null,
        killer = hit && [...this.clients].find((o) => o.id === hit.id && o.room === c.room);
      c.deaths++;
      c.lastHitBy = null;
      if (killer) killer.kills++;
      this.broadcast(c.room, { t: 'kill', victim: c.id, victimName: c.name, killer: killer?.id ?? null, killerName: killer?.name ?? null, scores: this.members(c.room).map((o) => o.info) });
    }
  }
  // Leave the room (back to the lobby, still connected).
  exit(c) {
    const id = c.room;
    if (!id) return;
    c.room = null;
    c.state = null;
    this.broadcast(id, { t: 'leave', id: c.id });
    const room = this.rooms.get(id);
    if (room && !this.members(id).length) room.empty = Date.now();
    else this.checkArmed(id);
  }
  // A dogfight room left with no armed aircraft in it shuts down: everyone
  // goes back to the lobby with a message.
  checkArmed(id) {
    const room = this.rooms.get(id), members = this.members(id);
    if (room?.mode !== 'dogfight' || !members.length || members.some((c) => ARMED.has(c.aircraft))) return;
    this.rooms.delete(id);
    for (const c of members) {
      c.room = null;
      c.state = null;
      c.send({ t: 'closed', room: room.name, error: `${room.name} has shut down: a dogfight room needs at least one armed aircraft, and every pilot left in it was unarmed.` });
    }
  }
  leave(c) {
    if (!this.clients.delete(c)) return;
    this.exit(c);
  }
  tick() {
    const now = Date.now();
    for (const c of this.clients) if (now - c.lastSeen > 45000) { c.socket.destroy(); this.leave(c); }
    // A made room closes two minutes after its last pilot leaves.
    for (const [id, r] of this.rooms) if (r.empty && now - r.empty > 120000) this.rooms.delete(id);
    for (const id of this.rooms.keys()) {
      const members = this.members(id);
      if (members.length < 2) continue;
      const states = members.filter((c) => c.state).map((c) => [c.id, ...c.state]);
      for (const c of members) {
        const others = states.filter((s) => s[0] !== c.id);
        if (others.length) c.send({ t: 'snap', p: others });
      }
    }
  }
  close() {
    clearInterval(this.timer);
    for (const c of this.clients) c.socket.destroy();
    this.clients.clear();
  }
}

// Adds /api/mp to an http.Server.
export function attachMultiplayer(server) {
  const hub = new MultiplayerHub();
  server.on('upgrade', (req, socket) => {
    if (new URL(req.url, 'http://localhost').pathname !== '/api/mp') return socket.destroy();
    socket.on('error', () => socket.destroy());
    hub.upgrade(req, socket);
  });
  server.on('close', () => hub.close());
  return hub;
}
