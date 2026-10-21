# Winterplan Simon & Liz

Eine Seite, zwei Personen, gemeinsame Eingaben. Jede Änderung wird automatisch auf dem Server gespeichert, beide sehen sie nach kurzer Zeit.

## Auf Netlify veröffentlichen (kostenlos, ohne Token)

1. app.netlify.com öffnen und mit GitHub anmelden.
2. „Add new project“, dann „Import an existing project“, dann GitHub. Das Repo **Winterplan** wählen. Taucht es nicht auf, bei „Configure the Netlify app on GitHub“ das Repo freigeben.
3. Nichts ändern, die Einstellungen kommen aus `netlify.toml`. „Deploy“ drücken.
4. Nach etwa einer Minute steht die Adresse oben (`irgendwas.netlify.app`). Unter „Site configuration“ lässt sie sich über „Change site name“ umbenennen.

Die Eingaben liegen in Netlify Blobs. Sie bleiben bei jedem neuen Deploy erhalten. Wer den Link kennt, kann den Plan ansehen und ändern. Deshalb den Link nur an Liz geben.

## Auf Railway (Alternative)

1. Dieses Repo als neuen Service anlegen.
2. Im Service ein **Volume** anlegen, Mount-Pfad `/data`.
3. Unter Variables `DATA_DIR` = `/data` setzen, sonst sind die Eingaben nach jedem Deploy weg.
4. Unter Settings > Networking eine öffentliche Domain erzeugen.

Optional schützt `BASIC_AUTH` = `benutzer:passwort` die Seite mit einem Login.

## Lokal testen

```
npm start
```

Dann http://localhost:3000 öffnen.

## Dateien

- `index.html`: die ganze Seite
- `netlify.toml`, `netlify/functions/state.mjs`: Einstellungen und Speicher-Funktion für Netlify
- `server.js`: gleicher Speicher als kleiner Node-Server für Railway oder lokal
