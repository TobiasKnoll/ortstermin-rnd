import { ALL_FIELDS, SECTIONS, MODERNIZATIONS, STANDARDS, PHOTO_SLOTS } from './schema.mjs';
export const uid = () => globalThis.crypto.randomUUID();
export const empty = value => value === '' || value === undefined || value === null;
export const number = value => empty(value) || !String(value).trim() ? null : Number.isFinite(Number(String(value).replace(',', '.'))) ? Number(String(value).replace(',', '.')) : null;
export const fmt = (value, digits = 2) => value === null || value === undefined ? '—' : Number(value).toLocaleString('de-DE', { maximumFractionDigits: digits });
export const dateDE = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.split('-').reverse().join('.') : (s || '');
export const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const safeName = value => String(value || 'Ortstermin').normalize('NFC').replace(/[^\p{L}\p{N}_.-]+/gu, '_').replace(/^\.+/, '').slice(0, 100) || 'Ortstermin';
export function newRecord(orderNumber) {
  if (!String(orderNumber).trim()) throw new Error('Bitte eine Auftragsnummer eingeben.');
  const now = new Date().toISOString();
  return { id: uid(), number: String(orderNumber).trim(), fields: {}, rooms: [], damages: [], openItems: [], photos: [], attachments: [], modernizations: Object.fromEntries(MODERNIZATIONS.map(m => [m.id, { extent: '', year: '', detail: '', source: '', points: '' }])), standards: Object.fromEntries(STANDARDS.map(s => [s.id, { level: '', reason: '' }])), reviewed: {}, status: 'in_bearbeitung', archived: false, createdAt: now, updatedAt: now, revision: 0 };
}
export function energyClass(value) {
  const n = number(value); if (n === null || n < 0) return null;
  return [[30, 'A+'], [50, 'A'], [75, 'B'], [100, 'C'], [130, 'D'], [160, 'E'], [200, 'F'], [250, 'G']].find(([max]) => n <= max)?.[1] || 'H';
}
export function calculations(record) {
  const f = record.fields;
  const levels = STANDARDS.map(s => number(record.standards[s.id]?.level));
  const validLevels = levels.every(n => n !== null && n >= 1 && n <= 5);
  const weighted = validLevels ? STANDARDS.reduce((sum, s, i) => sum + levels[i] * s.weight, 0) / 100 : null;
  const half = weighted === null ? null : Math.round(weighted * 2) / 2;
  const points = MODERNIZATIONS.map(m => number(record.modernizations[m.id]?.points));
  const allPoints = points.every((n, i) => n !== null && n >= 0 && n <= MODERNIZATIONS[i].max);
  const totalPoints = allPoints ? points.reduce((sum, n) => sum + n, 0) : null;
  const year = /^\d{4}-\d{2}-\d{2}$/.test(f.valuationDate || '') ? Number(f.valuationDate.slice(0, 4)) : null;
  const built = number(f.yearBuilt); const age = year !== null && built !== null && built <= year ? year - built : null;
  const gnd = number(f.gnd); const validGnd = gnd !== null && gnd > 0;
  return { weighted, half, totalPoints, year, age, baseRnd: validGnd && age !== null ? gnd - age : null, relativeAge: validGnd && age !== null ? age / gnd * 100 : null, relativeResult: validGnd && number(f.rnd) !== null ? number(f.rnd) / gnd * 100 : null };
}
export function issues(record) {
  const found = []; const add = (section, text, field = '') => found.push({ section, text, field }); const f = record.fields;
  for (const s of SECTIONS) for (const group of s.groups) for (const def of group.fields) {
    const v = f[def.id];
    if (def.required && empty(v)) add(s.id, `${def.label} fehlt.`, def.id);
    if (def.type === 'number' && !empty(v)) {
      const n = number(v);
      if (n === null || (def.min !== undefined && n < def.min) || (def.max !== undefined && n > def.max) || (def.step === 1 && !Number.isInteger(n))) add(s.id, `${def.label}: Wert bitte prüfen.`, def.id);
    }
  }
  if (number(f.residential) !== null && number(f.commercial) !== null && Math.abs(number(f.residential) + number(f.commercial) - 100) > 0.01) add('gebaeude', 'Wohn- und Gewerbenutzung ergeben zusammen nicht 100 %.');
  const ec = energyClass(f.finalEnergy); if (ec && f.energyClass && f.energyClass !== ec) add('gebaeude', `Endenergie ${f.finalEnergy} passt rechnerisch zu Klasse ${ec}; eingetragen ist ${f.energyClass}. Mit dem Ausweis abgleichen.`, 'energyClass');
  const year = calculations(record).year;
  if (year && number(f.yearBuilt) > year) add('gebaeude', 'Das Baujahr liegt nach dem Ermittlungsstichtag.', 'yearBuilt');
  for (const m of MODERNIZATIONS) {
    const v = record.modernizations[m.id] || {}; const p = number(v.points);
    if (!empty(v.points) && (p === null || p < 0 || p > m.max)) add('modernisierung', `${m.title}: Punkte müssen zwischen 0 und ${m.max} liegen.`);
    if (['teilweise', 'vollständig'].includes(v.extent) && !v.year.trim()) add('modernisierung', `${m.title}: Zeitpunkt noch offen.`);
    if (/^\d{4}$/.test(v.year) && year && Number(v.year) > year) add('modernisierung', `${m.title}: Modernisierung liegt nach dem Stichtag.`);
    if (v.extent === 'keine' && p > 0 && !v.detail.trim()) add('modernisierung', `${m.title}: Punkte trotz fehlender Modernisierung bitte begründen.`);
  }
  if (f.damageStatus === 'Feststellungen dokumentiert' && !record.damages.some(d => d.finding.trim())) add('technik', 'Die festgestellten Schäden sind noch nicht beschrieben.');
  const slots = record.photos.map(p => p.slot).filter(s => s !== 'Zusatzfoto');
  if (new Set(slots).size !== slots.length) add('dokumentation', 'Eine Fotoposition ist mehrfach belegt. Bitte die Zuordnung prüfen.');
  if (f.recordComplete === 'ja' && record.openItems.some(i => !i.done)) add('nachbereitung', 'Es gibt noch unerledigte offene Punkte.');
  const rnd = number(f.rnd), gnd = number(f.gnd), relative = number(f.relativeRnd);
  if (rnd !== null && gnd > 0 && relative !== null && Math.abs(rnd / gnd * 100 - relative) > 0.15) add('nachbereitung', 'Restnutzungsdauer und relative Restnutzungsdauer passen rechnerisch nicht zusammen.');
  return found;
}
export function sectionProgress(record, section) {
  const defs = section.groups.flatMap(g => g.fields).filter(f => !f.optional);
  if (section.id === 'modernisierung') return { filled: MODERNIZATIONS.filter(m => record.modernizations[m.id]?.extent).length, total: 8 };
  return { filled: defs.filter(f => !empty(record.fields[f.id])).length, total: defs.length };
}
export function templateFields(record) {
  const f = record.fields, c = calculations(record), result = {};
  const put = (key, value) => { if (!empty(value)) result[key] = String(value); };
  const mapping = {
    Name_Auftraggeber: 'clientName', Straße_Auftraggeber: 'clientStreet', PLZ_Auftraggeber: 'clientCity', 'Wohneinheit_Nr.': 'unit', Stockwerk: 'floor', Gebäudeart: 'buildingType', Baujahr: 'yearBuilt', Anzahl_Geschosse: 'storeys', Anzahl_Wohneinheiten: 'units', Prozentzahl_wohnwirtschaftlich: 'residential', Prozentzahl_gewerblich: 'commercial', Ausbau_Keller: 'basementUse', Art_Außenwände: 'wallMaterial', Mod_Außenwände: 'wallCondition', Dachart: 'roofType', Ausbaugrad_Dach: 'attic', Dachkonstruktion: 'roofStructure', Dacheindeckung: 'roofCover', Mod_Dach: 'roofCondition', Fensterprofile: 'windowMaterial', Rolläden: 'shutters', Mod_Fenster: 'windowCondition', Innenwände: 'innerWalls', Wandflächen: 'wallFinish', Innentüren_Art: 'innerDoors', Mod_Innenwände_Türen: 'innerCondition', Deckenkonstruktion: 'ceiling', Deckenoberfläche: 'ceilingFinish', Treppenkonstruktion: 'stairs', Mod_Deckenkonstruktion_Treppen: 'ceilingCondition', Ausstattung_Bad: 'bath', Boden_Bad: 'bathFloor', Wandflächen_Bad: 'bathWalls', Mod_Sanitär: 'bathCondition', Art_Energieträger: 'fuel', Mod_Heizung_Warmwasser: 'heatingCondition', Türsprechanlage_vorhanden: 'intercom', Mod_sonstige_Ausstattung: 'technicalCondition', Zustand_Sondereigentum: 'privateCondition', Zustand_Gemeinschaftseigentum: 'commonCondition', Grundrissgestaltung: 'floorPlan', Mod_Fußböden: 'floorCondition', Energieeffizienzklasse: 'energyClass', Art_Energieausweis: 'energyType', Wert_Endenergie: 'finalEnergy', Wert_Primärenergie: 'primaryEnergy', Gebäudestandard_Zahl: 'standardHalf', Gebäudestandard_Wort: 'standardLabel', ASS_Wort_Spanne: 'standardLabel', Modernisierungsgrad: 'modernGrade', GND_aus_ASS: 'gnd', 'GND aus ASS': 'gnd', Ergebnis_Nutzungsdauer: 'rnd', Prozentzahl_Ergebnis_Nutzungsdauer: 'relativeRnd', Teilnehmer_Ortsbesichtigung: 'participants'
  };
  for (const [key, id] of Object.entries(mapping)) put(key, f[id]);
  put('Auftragsnummer', record.number);
  put('Herr_oder_Frau', f.salutation === 'Herr' ? 'Herrn' : f.salutation === 'Keine Anrede' ? '' : f.salutation);
  for (const [key, id] of Object.entries({ Auftrag_vom: 'commissionDate', Tag_der_Ortsbesichtigung: 'visitDate', Datum_Ermittlungsstichtag: 'valuationDate', Datum_Energieausweis: 'energyDate', Datum_Gutachten: 'reportDate' })) put(key, dateDE(f[id]));
  put('Objektadresse', [f.objectStreet, f.objectCity].filter(Boolean).join(', '));
  put('Unterkellerung_Grad', f.basement === 'keine' ? 'nicht unterkellert' : f.basement ? `${f.basement} unterkellert` : '');
  put('Fassadengestaltung', [f.facade, f.insulation].filter(Boolean).join('; '));
  put('Mod_Fenster', [f.windowCondition, f.externalDoors && `Außentüren: ${f.externalDoors}`].filter(Boolean).join('; '));
  put('Art_Verglasung', ({ einfach: 'Einfachverglasung', zweifach: 'Zweifachverglasung', dreifach: 'Dreifachverglasung' })[f.glazing] || f.glazing);
  put('Art_Heizung', [f.heatingType, f.hotWater && `Warmwasser: ${f.hotWater}`].filter(Boolean).join('; '));
  put('Anzahl_Steckdosen_Schalter_Sicherungen', [f.sockets, f.fuses].filter(Boolean).join('; '));
  if (record.rooms.some(r => r.name || r.floor)) { put('Zimmer1', 'Räume'); put('Art_Fußboden_Zimmer1', record.rooms.filter(r => r.name || r.floor).map(r => `${r.name || 'Raum'}: ${r.floor || 'Belag offen'}${r.condition ? ` (${r.condition})` : ''}`).join('; ')); }
  if (f.damageStatus === 'keine erkennbar') put('Wesentliche_Baumängel_Bauschäden', 'Keine wesentlichen Baumängel oder Bauschäden erkennbar.');
  else if (record.damages.length) put('Wesentliche_Baumängel_Bauschäden', record.damages.map(d => [d.location, d.finding, d.source].filter(Boolean).join(': ')).join('; '));
  for (const s of STANDARDS) put(s.key, record.standards[s.id]?.level);
  if (c.weighted !== null) put('ASS_Summe', fmt(c.weighted, 3));
  for (const [key, val] of Object.entries({ Zahl_Modernisierungspunkte: c.totalPoints, Stichjahr: c.year, Zahl_Gebäudealter: c.age, Zahl_RND: c.baseRnd, Prozentzahl_relatives_Gebäudealter: c.relativeAge })) if (val !== null) put(key, fmt(val));
  const explanationKeys = ['Erläuterung_Mod_Dach_wenn_vorhanden', 'Erläuterung_Mod_Fenster_wenn_vorhanden', 'Eräuterung_Mod_Leitungssysteme_wenn_vorhanden', 'Erläuterung_Mod_Heizungsanlage_wenn_vorhanden', 'Eräuterungen_Mod_Wärmedämmung_Außenwände_wenn_vorhanden', 'Erläuterungen_Mod_Bäder_wenn_vorhanden', 'Erläuterungen_Mod_Innenausbau_Decken_Fußböden_Treppen_wenn_vorhanden', 'Erläuterungen_Mod_Grundrissgestaltung'];
  MODERNIZATIONS.forEach((m, i) => { const v = record.modernizations[m.id]; if (v && (v.extent || v.year || v.detail)) put(explanationKeys[i], [m.title + ':', v.extent && `Umfang: ${v.extent}.`, v.year && `Zeitpunkt: ${v.year}.`, v.detail, v.source && `Quelle: ${v.source}.`, !empty(v.points) && `Ansatz: ${v.points} Punkte.`].filter(Boolean).join(' ')); });
  for (let n = 1; n <= 4; n++) put(`Foto${n}_beschriften`, record.photos.find(p => p.slot === `Foto ${n}`)?.caption);
  return { format: 'knoll-vorlagenfelder', version: 1, policy: { replaceOnlyOriginallyYellow: true, preserveAllOtherTextAndFormatting: true, blockedOccurrences: [{ field: 'Anbauweise', location: 'Gebäudebeschreibung auf Seite 8' }, { field: 'Baujahr', location: 'Gebäudebeschreibung auf Seite 8' }], note: 'Gleiche Feldnamen dürfen nur an ursprünglich gelben Fundstellen ersetzt werden. Kein globales Suchen und Ersetzen.' }, fields: result, modernizationRows: MODERNIZATIONS.map(m => ({ element: m.title, ...record.modernizations[m.id] })), photoAssignments: record.photos.map(p => ({ slot: p.slot, assetId: p.id, caption: p.caption })) };
}
const string = (x, max = 10000) => { const s = typeof x === 'string' ? x : typeof x === 'number' && Number.isFinite(x) ? String(x) : ''; if (s.length > max) throw new Error('Ein Importfeld überschreitet die erlaubte Länge. Es wurden keine Daten übernommen.'); return s; };
export function validateImport(data) {
  if (!data || data.format !== 'knoll-ortstermin' || data.version !== 1 || !data.record || !String(data.record.number || '').trim()) throw new Error('Keine unterstützte Ortstermin-Datei (Version 1).');
  const raw = data.record, record = newRecord(string(raw.number, 100));
  for (const key of ['rooms', 'damages', 'openItems', 'photos', 'attachments']) if (Array.isArray(raw[key]) && raw[key].length > (['photos','attachments'].includes(key) ? 300 : 500)) throw new Error('Der Import enthält zu viele Einträge. Es wurden keine Daten übernommen.');
  for (const f of ALL_FIELDS) record.fields[f.id] = string(raw.fields?.[f.id]);
  for (const m of MODERNIZATIONS) for (const key of ['extent', 'year', 'detail', 'source', 'points']) record.modernizations[m.id][key] = string(raw.modernizations?.[m.id]?.[key]);
  for (const s of STANDARDS) for (const key of ['level', 'reason']) record.standards[s.id][key] = string(raw.standards?.[s.id]?.[key]);
  for (const [key, props] of Object.entries({ rooms: ['name', 'floor', 'condition'], damages: ['location', 'finding', 'source'], openItems: ['title', 'person', 'due'] })) {
    record[key] = (Array.isArray(raw[key]) ? raw[key] : []).slice(0, 500).map(row => ({ id: uid(), ...Object.fromEntries(props.map(k => [k, string(row?.[k])])), ...(key === 'openItems' ? { done: row?.done === true } : {}) }));
  }
  record.reviewed = Object.fromEntries(SECTIONS.map(s => [s.id, raw.reviewed?.[s.id] === true]));
  record.status = raw.status === 'abgeschlossen' ? 'abgeschlossen' : 'in_bearbeitung';
  for (const key of ['photos', 'attachments']) record[key] = (Array.isArray(raw[key]) ? raw[key] : []).slice(0, 300).filter(x => typeof x?.id === 'string').map(x => ({ id: x.id, name: string(x.name, 200), caption: string(x.caption), slot: PHOTO_SLOTS.includes(x.slot) ? x.slot : 'Zusatzfoto', kind: ['energy', 'map', 'other'].includes(x.kind) ? x.kind : 'other' }));
  return record;
}
