# Spruch des Tages

Fullscreen-Darstellung des aktuellen YouVersion-Verses des Tages (Deutsch, Hoffnung für alle) mit dem offiziellen Versbild. Unauffälliger Button zum Drucken auf A4 (hochkant).

Die Seite ist **statisch** und läuft auf **GitHub Pages**. Der Browser holt den Tagesvers und das Share-Bild direkt von den öffentlichen YouVersion-APIs.

## GitHub Pages

1. Im Repo unter **Settings → Pages** als Source **GitHub Actions** wählen.
2. Den Workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) einmal auf `main` ausführen (Push oder manuell unter Actions).
3. Die Seite erscheint unter `https://<user>.github.io/<repo>/`.

## Lokale Vorschau

```bash
npm start
```

Öffne anschließend [http://localhost:3000](http://localhost:3000).

Alternativ reicht jeder Static-File-Server auf dem Ordner `public/`.

## Technik

- Rein clientseitig: `moments.youversionapi.com` (Kalender) + `images.youversionapi.com` (deutsches Share-Bild)
- Zeitzone für den Tageswechsel: Europe/Berlin
- Druck-CSS: A4 hochkant
