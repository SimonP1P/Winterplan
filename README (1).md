# Winterplan Simon & Liz

Eine Seite, ein kleiner Node-Server, keine Abhängigkeiten. Eingaben werden in `state.json` gespeichert und beide sehen Änderungen nach wenigen Sekunden.

## Auf Railway

1. Diesen Ordner in ein GitHub-Repo legen und in Railway als neuen Service aus dem Repo anlegen. Alternativ im Ordner `railway up`.
2. Im Service ein **Volume** anlegen und als Mount-Pfad `/data` eintragen.
3. Unter Variables setzen:
   - `DATA_DIR` = `/data`, sonst sind die Eingaben nach jedem Deploy weg.
   - `BASIC_AUTH` = `benutzer:passwort`, sonst kann jeder mit dem Link die Seite ändern.
4. Unter Settings > Networking eine öffentliche Domain erzeugen.

## Lokal testen

```
npm start
```

Dann http://localhost:3000 öffnen.

## Dateien

- `index.html`: die ganze Seite
- `server.js`: liefert die Seite aus und speichert Änderungen unter `/api/state`
