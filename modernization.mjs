// ImmoWertA (20.09.2023), zu Anlage 2 II.3, Tabelle a.
// Identisch mit der Orientierungstabelle der bereitgestellten Mustervorlage.
export const POINT_SOURCE = 'ImmoWertA, zu Anlage 2 II.3, Tabelle a (20.09.2023)';
export const POINT_SOURCE_URL = 'https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/immowerta.pdf?__blob=publicationFile&v=1';
export const AGE_BANDS = [5, 10, 15, 20];
export const POINT_TABLE = Object.freeze({
  roof: [4, 3, 2, 1], windows: [2, 2, 1, 0], pipes: [2, 2, 2, 1],
  heat: [2, 2, 1, 0], insulation: [4, 3, 2, 1], bath: [2, 1, 0, 0],
  interior: [2, 2, 2, 1]
});
const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export function pointRecommendation(record, id) {
  const v = record.modernizations?.[id] || {};
  const base = { kind: 'pending', points: null, upper: null, label: 'Noch kein Vorschlag', basis: '', source: POINT_SOURCE };
  if (v.extent === 'keine') return { ...base, kind: 'exact', points: 0, upper: 0, label: '0 Punkte', basis: 'Keine Modernisierung angegeben; keine Modernisierungspunkte.' };
  if (!['teilweise', 'vollständig'].includes(v.extent)) return { ...base, basis: 'Bitte den Umfang der Modernisierung angeben. Bei unbekanntem Umfang ist kein Tabellenansatz ableitbar.' };
  if (!validDate(record.fields?.valuationDate)) return { ...base, basis: 'Bitte zuerst den Ermittlungsstichtag im Bereich Auftrag eintragen.' };
  const date = record.fields.valuationDate, year = String(v.year || '').trim();
  if (!/^[1-9]\d{3}$/.test(year)) return { ...base, basis: 'Für die automatische Zuordnung ein einzelnes vierstelliges Jahr eintragen. Bei Zeiträumen oder unbekanntem Jahr den Ansatz sachverständig festlegen.' };
  const elapsed = Number(date.slice(0, 4)) - Number(year);
  if (elapsed < 0) return { ...base, basis: 'Das Modernisierungsjahr liegt nach dem Ermittlungsstichtag. Angaben prüfen.' };
  const context = `Ermittlungsstichtag ${date.split('-').reverse().join('.')} · Modernisierung ${year} · ${elapsed} ${elapsed === 1 ? 'Jahr' : 'Jahre'} zurück (Kalenderjahresdifferenz).`;
  if (id === 'layout') return { ...base, kind: 'range', upper: 2, label: '1–2 Punkte', basis: `${context} Die Tabelle nennt für wesentliche Grundrissverbesserungen grundsätzlich zeitunabhängig 1–2 Punkte. Den konkreten Ansatz nach Art und Umfang begründen; kein automatischer Einzelwert.` };
  const band = AGE_BANDS.findIndex(n => elapsed <= n);
  if (band < 0) return { ...base, kind: 'outside', basis: `${context} Für mehr als ca. 20 Jahre enthält die Tabelle keine Spalte. Kein automatischer Nullansatz und keine Fortschreibung; sachverständig beurteilen.` };
  const upper = POINT_TABLE[id]?.[band];
  if (upper === undefined) return { ...base, basis: 'Kein Tabellenwert für dieses Bauteil hinterlegt.' };
  const basis = `${context} Tabellenspalte „bis ca. ${AGE_BANDS[band]} Jahre zurück“: maximal ${upper} Punkte.`;
  if (v.extent === 'teilweise') return { ...base, kind: 'partial', upper, label: `Bis ${upper} Punkte`, basis: `${basis} Für Teilerneuerungen ist kein fester Abschlag vorgegeben. Den Ansatz innerhalb der Obergrenze sachverständig festlegen und begründen.` };
  return { ...base, kind: 'exact', points: upper, upper, label: `${upper} Punkte`, basis: `${basis} Vorschlag bei vollständiger Maßnahme; Umfang, Qualität und Erhaltungszustand fachlich prüfen.` };
}
export function pointAssessment(record, id) {
  const v = record.modernizations?.[id] || {}, recommendation = pointRecommendation(record, id);
  const raw = String(v.points ?? '').trim(), points = raw === '' ? null : Number(raw.replace(',', '.'));
  const entered = points !== null && Number.isFinite(points);
  const deviates = entered && (recommendation.kind === 'exact' ? points !== recommendation.points : recommendation.kind === 'range' ? points < 1 || points > 2 : recommendation.upper !== null && points > recommendation.upper);
  const needsReason = entered && (deviates || recommendation.kind !== 'exact');
  const reason = String(v.pointReason || '').trim();
  return { recommendation, points: entered ? points : null, deviates, needsReason, reason, missingReason: needsReason && !reason };
}
