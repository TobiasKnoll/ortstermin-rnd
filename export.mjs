import { uid, safeName, validateImport, templateFields } from './model.mjs';
import { getAsset, importRecord } from './storage.mjs';
import { reportHTML } from './report.mjs';
export const blobDataURL = blob => new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
export function download(blob, name) { const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000); }
export async function exportRecord(record) {
  if (!globalThis.JSZip) throw new Error('Exportmodul fehlt. Bitte die App einmal mit Internet öffnen.');
  const zip=new JSZip(),manifest=[],images={};
  for(const meta of [...record.photos,...record.attachments]){
    const asset=await getAsset(meta.id);if(!asset?.blob)throw new Error(`Datei fehlt: ${meta.name}. Export bitte nach Wiederherstellung erneut starten.`);
    const path=`dateien/${meta.id}/${safeName(meta.name)}`;
    zip.file(path,asset.blob);manifest.push({id:meta.id,path,type:asset.blob.type,size:asset.blob.size});
    if(record.photos.some(p=>p.id===meta.id))images[meta.id]=await blobDataURL(asset.blob);
  }
  const data={format:'knoll-ortstermin',version:1,exportedAt:new Date().toISOString(),record,assets:manifest};
  zip.file('ortstermin.json',JSON.stringify(data,null,2));
  zip.file('vorlagenfelder_nur_gelbe_Luecken.json',JSON.stringify(templateFields(record),null,2));
  zip.file('Ortsterminprotokoll.html',reportHTML(record,images));
  zip.file('HINWEIS.txt','Die ZIP-Datei enthält alle erfassten Daten und Dateien. Zum Weiterarbeiten in der Ortstermin-App importieren. Das HTML-Protokoll im Browser öffnen und über Drucken als PDF speichern.\nDie Word-Vorlage wurde nicht verändert. Die Vorlagenfelder dürfen ausschließlich an ursprünglich gelben Stellen eingesetzt werden. Alle anderen Texte und Formatierungen sind unverändert zu erhalten. Nicht gelbe Fundstellen mit gleichem Feldnamen sind gesperrt.\n');
  return {blob:await zip.generateAsync({type:'blob',compression:'STORE'}),name:`Ortstermin_${safeName(record.number)}_${new Date().toISOString().slice(0,10)}.zip`};
}
export async function importFile(file) {
  if(file.size>250*1024*1024)throw new Error('Die Datei ist größer als 250 MB. Bitte den Export am Computer aufteilen.');
  let data,zip;
  if(file.name.toLowerCase().endsWith('.json')) data=JSON.parse(await file.text());
  else {zip=await JSZip.loadAsync(file);const entry=zip.file('ortstermin.json');if(!entry)throw new Error('Die ZIP-Datei enthält keine ortstermin.json.');const json=await entry.async('string');if(json.length>10*1024*1024)throw new Error('Die Datendatei ist zu groß.');data=JSON.parse(json);}
  const record=validateImport(data),assets=[],ids=new Set();let total=0;
  for(const meta of [...record.photos,...record.attachments]){
    if(ids.has(meta.id))throw new Error('Doppelte Dateikennung im Import.');ids.add(meta.id);
    const entry=(Array.isArray(data.assets)?data.assets:[]).find(a=>a.id===meta.id);
    if(!zip || !entry || typeof entry.path!=='string' || !/^dateien\/[a-zA-Z0-9-]+\/[^/]+$/.test(entry.path) || entry.path.includes('..'))throw new Error('Eine verknüpfte Bild- oder Anlagendatei fehlt oder ist ungültig. Bitte die vollständige ZIP importieren.');
    const item=zip.file(entry.path);if(!item)throw new Error('Anlagendatei fehlt: '+meta.name);
    const allowed=['image/jpeg','image/png','image/webp','application/pdf'];
    if(!allowed.includes(entry.type) || (record.photos.includes(meta) && !entry.type.startsWith('image/')))throw new Error('Nicht unterstütztes Dateiformat im Export.');
    const bytes=await item.async('uint8array');total+=bytes.length;
    if(bytes.length>30*1024*1024 || total>250*1024*1024)throw new Error('Die entpackten Anlagen überschreiten das Importlimit.');
    const id=uid();assets.push({id,projectId:record.id,blob:new Blob([bytes],{type:entry.type}),name:meta.name});meta.id=id;
  }
  return importRecord(record,assets);
}
