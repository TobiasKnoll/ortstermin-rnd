# Ortstermin · Knoll

Browser-App zur strukturierten Aufnahme für Restnutzungsdauergutachten.

## Start

Settings → Pages → Deploy from a branch → main → /(root) → Save.
Den dort angezeigten Link auf dem iPad in Safari öffnen. Warten, bis „Offline bereit“ angezeigt wird. Optional über „Teilen → Zum Home-Bildschirm“ hinzufügen und auch dort einmal online starten.

## Arbeiten

„Neuer Ortstermin“ mit vorhandener Auftragsnummer anlegen. Acht Bereiche ausfüllen, Fotos und Nachweise hinzufügen und offene Punkte dokumentieren. Änderungen werden automatisch lokal gespeichert. „Exportieren“ sichert Daten, Fotos und Nachweise als ZIP. „Importieren“ legt daraus eine neue Kopie an. „Protokoll / PDF“ öffnet die Druckansicht zum Speichern als PDF.

Es gibt keine automatische Synchronisierung. Vor dem Gerätewechsel ZIP sichern und übertragen. Browserdaten können gelöscht werden; deshalb regelmäßig exportieren. Keine ausgefüllten Exporte, Gutachten oder persönlichen Daten in dieses Repository hochladen.

Die App verändert keine Word-Vorlage. Die exportierte Feldzuordnung erlaubt ausschließlich das Ergänzen ursprünglich gelber Lücken. Alle übrigen Textteile und Formatierungen müssen erhalten bleiben. Sachverständige Einstufungen und Restnutzungsdauer werden manuell angesetzt. Rechenhinweise ersetzen keine fachliche Prüfung.

Die Schriftfamilie ist auf Frutiger LT 45 Light gesetzt; ohne lokale Installation wird die Systemschrift verwendet. Keine kommerzielle Schriftdatei enthalten.

JSZip ist mit Lizenz beigefügt. Alle Programmbestandteile werden lokal ausgeliefert. Bei Updates die Cache-Kennung in sw.js ändern und danach alle alten App-Fenster schließen. Daten bleiben im Browser gespeichert.

Quelle des Energiehinweises: [Anlage 10](https://www.gesetze-im-internet.de/geg/anlage_10.html). Hinweise zur Speicherung: [WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).

## Modernisierungspunkte und Erscheinungsbild (1.1.0)

Die App zeigt nach Umfang und Jahr den zeitabhängigen Höchstwert aus ImmoWertA, zu Anlage 2 II.3, Tabelle a (20.09.2023), entsprechend der Mustervorlage. Bezug ist das Kalenderjahr des Ermittlungsstichtags. Der Vorschlag kann übernommen oder sachverständig geändert werden. Nur tatsächlich angesetzte Punkte zählen zur Summe. Begründungen werden gespeichert, importiert und im Protokoll sowie der Zuordnung zu gelben Vorlagenfeldern ausgegeben.

Teilmodernisierungen erhalten eine Tabellenobergrenze ohne erfundenen pauschalen Abschlag. Für Grundrissverbesserungen wird die grundsätzlich zeitunabhängige Spanne 1–2 angezeigt. Nach mehr als ca. 20 Jahren, bei unbekanntem Jahr oder bei Zeiträumen gibt es keinen automatischen Einzelwert. Bereits gespeicherte Ansätze bleiben unverändert. Abweichungen und individuelle Ansätze ohne Begründung erscheinen als Prüfhinweis.

Original-Logo und Kopfzeile von Tobias Knoll sind in App, Home-Bildschirm-Symbol und Druckprotokoll integriert. Das HTML-Protokoll enthält die Kopfzeile eingebettet und bleibt ohne zusätzliche Bilddatei vollständig.

Quelle: [ImmoWertA – BMWSB](https://www.bmwsb.bund.de/SharedDocs/downloads/DE/veroeffentlichungen/wohnen/immowerta.pdf?__blob=publicationFile&v=1).
