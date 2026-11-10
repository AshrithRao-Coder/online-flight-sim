import {createHash} from 'node:crypto';

// Import identity fields only. Firebase Auth is not an authority for game ranks.
export function createFirebaseDirectorySync(access, auth, {interval = 30000, now = Date.now} = {}) {
  let pending, last = -Infinity;
  return function sync({force = false} = {}) {
    if (pending) return pending;
    if (!force && now() - last < interval) return Promise.resolve(0);
    pending = (async () => {
      const identities = new Map();
      let pageToken;
      do {
        const page = await auth.listUsers(1000, pageToken);
        for (const user of page.users) if (typeof user.uid === 'string' && user.uid) {
          // Never retain password hashes, custom claims or provider tokens.
          identities.set(user.uid, {uid:user.uid, email:String(user.email || '').slice(0,254), displayName:String(user.displayName || '').slice(0,60), emailVerified:!!user.emailVerified, created:Date.parse(user.metadata?.creationTime) || now()});
        }
        pageToken = page.pageToken;
      } while (pageToken);
      const names = new Set([...access.accounts.users.values()].map(u=>(u.pilotName || u.displayName || '').toLocaleLowerCase()));
      const added = [];
      for (const identity of identities.values()) {
        if (access.accounts.users.has(identity.uid)) continue;
        const base = identity.displayName.replace(/[^\p{L}\p{N} ._'\-]/gu,'').replace(/\s+/g,' ').trim().slice(0,24) || 'Pilot';
        let pilotName = base, n = 0;
        while (pilotName.length < 2 || names.has(pilotName.toLocaleLowerCase())) {
          const suffix=createHash('sha256').update(identity.uid+':'+n++).digest('hex').slice(0,6);
          pilotName=base.slice(0,17)+' '+suffix;
        }
        names.add(pilotName.toLocaleLowerCase());
        // Missing accounts must redeem a real code before playing. No inferred privileges.
        access.accounts.users.set(identity.uid, {...identity, pilotName, codeId:null});
        added.push(identity.uid);
      }
      if (added.length) {
        try { access.accounts.save(); } catch (error) { for (const uid of added) access.accounts.users.delete(uid); throw error; }
      }
      await access.flushStorage?.();
      last = now();
      return added.length;
    })().finally(() => { pending = null; });
    return pending;
  };
}
