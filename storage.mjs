const DB_NAME = 'knoll-ortstermin-v1';
let database;
export async function openDatabase() {
  if (database) return database;
  database = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { const db = request.result; db.createObjectStore('records', { keyPath: 'id' }); const a = db.createObjectStore('assets', { keyPath: 'id' }); a.createIndex('projectId', 'projectId'); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Bitte andere Tabs dieser App schließen und erneut öffnen.'));
  });
  return database;
}
const req = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
export async function getRecord(id) { return req((await openDatabase()).transaction('records').objectStore('records').get(id)); }
export async function allRecords() { return req((await openDatabase()).transaction('records').objectStore('records').getAll()); }
export async function getAsset(id) { return req((await openDatabase()).transaction('assets').objectStore('assets').get(id)); }
export async function saveRecord(record, expectedRevision = record.revision) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite'), store = tx.objectStore('records'); let saved, conflict = false;
    const read = store.get(record.id);
    read.onsuccess = () => {
      if ((read.result?.revision || 0) !== expectedRevision) { conflict = true; tx.abort(); return; }
      saved = { ...record, revision: expectedRevision + 1 }; store.put(saved);
    };
    tx.oncomplete = () => resolve(saved);
    tx.onerror = tx.onabort = () => reject(conflict ? new Error('Dieser Ortstermin wurde in einem anderen Tab geändert. Bitte deinen aktuellen Stand exportieren und die App neu laden.') : tx.error || new Error('Speichern nicht möglich. Bitte den Stand jetzt exportieren.'));
  });
}
export async function saveAssets(assets) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const tx = db.transaction('assets', 'readwrite'); for (const a of assets) tx.objectStore('assets').put(a); tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error('Datei konnte nicht gespeichert werden.')); });
}
export function journal(record) { try { localStorage.setItem('knoll-draft-' + record.id, JSON.stringify(record)); return true; } catch { return false; } }
export function clearJournal(id, updatedAt) { try { const current = JSON.parse(localStorage.getItem('knoll-draft-' + id) || 'null'); if (current?.updatedAt === updatedAt) localStorage.removeItem('knoll-draft-' + id); } catch {} }
export function getJournal(id) { try { return JSON.parse(localStorage.getItem('knoll-draft-' + id) || 'null'); } catch { return null; } }
export async function importRecord(record, assets) {
  const db = await openDatabase(); const saved = { ...record, revision: 1 };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['records', 'assets'], 'readwrite');
    tx.objectStore('records').add(saved);
    for (const a of assets) tx.objectStore('assets').add(a);
    tx.oncomplete = () => resolve(saved);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Import konnte nicht gespeichert werden.'));
  });
}
export async function removeAsset(id) {
  const db = await openDatabase();
  return new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').delete(id);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error);});
}
