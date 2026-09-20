# Spruch des Tages

Fullscreen-Darstellung des aktuellen YouVersion-Verses des Tages (Deutsch, Hoffnung für alle) mit dem offiziellen Versbild. Unauffälliger Button zum Drucken auf A4 (hochkant).

Die Seite ist **statisch** und läuft auf **GitHub Pages**. Der Browser holt den Tagesvers und das Share-Bild direkt von den öffentlichen YouVersion-APIs — kein Node.js nötig.

## GitHub Pages

1. Im Repo unter **Settings → Pages** als Source **GitHub Actions** wählen.
2. Den Workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) einmal auf `main` ausführen (Push oder manuell unter Actions).
3. Die Seite erscheint unter `https://<user>.github.io/<repo>/`.

## Lokale Vorschau

Den Ordner [`public/`](public/) mit einem beliebigen Static-File-Server ausliefern, zum Beispiel:

```bash
python3 -m http.server 3000 --directory public
```

Danach [http://localhost:3000](http://localhost:3000) öffnen. Alternativ nach dem Deploy einfach die GitHub-Pages-URL nutzen.

## Technik

- Rein clientseitig: `moments.youversionapi.com` (Kalender) + `images.youversionapi.com` (deutsches Share-Bild)
- Zeitzone für den Tageswechsel: Europe/Berlin
- Druck-CSS: A4 hochkant
