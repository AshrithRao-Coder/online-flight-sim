import { createHash } from 'node:crypto';

// Server-only storage. Never import this module into the browser bundle.
export async function connectFirestore(access, {env = process.env, database} = {}) {
  if (env.OFS_STORAGE !== 'firestore' && !database) return null;
  if (!database) {
    const {initializeApp, cert} = await import('firebase-admin/app');
    const {getFirestore} = await import('firebase-admin/firestore');
    let credentials;
    try { credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || ''); }
    catch { throw Error('Set FIREBASE_SERVICE_ACCOUNT_JSON in the server environment, not in the repository.'); }
    if (credentials.project_id !== 'online-flight-sim') throw Error('Firebase service account belongs to the wrong project.');
    database = getFirestore(initializeApp({credential: cert(credentials)}, 'game-storage'));
  }
  const accounts = database.collection('ofs_accounts');
  const codeRef = database.collection('ofs_private').doc('access_codes');
  // A failed cloud read must stop startup, rather than replace cloud data with an empty registry.
  const [users, codes] = await Promise.all([accounts.get(), codeRef.get()]);
  if (!users.empty) access.accounts.users = new Map(users.docs.map(d => {
    const user = JSON.parse(d.data().record);
    if (!user.uid || typeof user.uid !== 'string') throw Error('Invalid stored account.');
    return [user.uid, user];
  }));
  if (codes.exists) {
    const list = JSON.parse(codes.data().record);
    if (!Array.isArray(list) || list.some(c => !/^[a-f0-9]{64}$/.test(c.hash))) throw Error('Invalid stored access codes.');
    const owner = access.codes.find(c => c.protected);
    access.codes = list.filter(c => c.id !== owner.id && c.hash !== owner.hash);
    access.codes.push(owner);
  }
  const written = new Map(users.docs.map(d => [JSON.parse(d.data().record).uid, d.data().record]));
  let writtenCodes = codes.exists ? codes.data().record : null;
  let tail = Promise.resolve();
  let dirty = true;
  const flush = () => {
    // Serialize snapshots: overlapping saves must never overwrite a newer record with an older one.
    const task = tail.then(async () => {
      if (!dirty) return;
      dirty = false;
      const changed = [...access.accounts.users.values()].map(u => [u.uid, JSON.stringify(u)]).filter(([uid, json]) => written.get(uid) !== json);
      const codeJson = JSON.stringify(access.codes);
      for (let i = 0; i < changed.length; i += 400) {
        const part = changed.slice(i, i + 400), batch = database.batch();
        for (const [uid, record] of part) batch.set(accounts.doc(createHash('sha256').update(uid).digest('hex')), {record});
        await batch.commit();
        for (const [uid, record] of part) written.set(uid, record);
      }
      if (codeJson !== writtenCodes) { await codeRef.set({record: codeJson}); writtenCodes = codeJson; }
    });
    tail = task.catch(() => { dirty = true; });
    return task;
  };
  // Existing synchronous mutation methods remain usable by HTTP and multiplayer.
  // HTTP responses await flush; background saves retain failed changes for retry.
  const schedule = () => { dirty = true; flush().catch(() => console.error('Firestore write failed; changes remain pending.')); };
  access.accounts.save = schedule;
  access.save = schedule;
  access.flushStorage = flush;
  await flush();
  console.log('Account storage: Firestore (persistent)');
  return {flush};
}
