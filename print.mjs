import { getRecord, getAsset } from './storage.mjs';
import { reportHTML } from './report.mjs';
import { blobDataURL } from './export.mjs';
try {
  const r=await getRecord(new URLSearchParams(location.search).get('id'));
  if(!r)throw new Error('Ortstermin nicht gefunden. Bitte über die App erneut öffnen.');
  const images={};for(const p of r.photos){const a=await getAsset(p.id);if(a)images[p.id]=await blobDataURL(a.blob);}
  document.open();document.write(reportHTML(r,images));document.close();
} catch(error){document.body.textContent=error.message;}
