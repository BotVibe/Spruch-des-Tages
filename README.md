# Spruch des Tages

Fullscreen-Darstellung des aktuellen YouVersion-Verses des Tages (Deutsch, Hoffnung für alle) mit dem offiziellen Versbild. Unauffälliger Button zum Drucken auf A4 (hochkant).

Die Seite ist **statisch**. Der Browser holt den Tagesvers und das Share-Bild direkt von den öffentlichen YouVersion-APIs — kein Node.js für den Betrieb nötig.

## Deployment

Production: **https://vers.rosentreter.site**. GitHub Pages is no longer used.

- `.github/workflows/docker-publish.yml` builds the root `Dockerfile` on every PR (build only) and pushes `ghcr.io/botvibe/spruch-des-tages:main` (+ `sha-<short>`) on every push to `main`. `.github/workflows/test.yml` runs `npm test`.
- The image is nginx serving `public/index.html`, `app.js`, `votd.js` and `styles.css`, with a `/healthz` endpoint (Docker `HEALTHCHECK`) and an `X-App-Revision` header carrying the commit SHA (also the `org.opencontainers.image.revision` label).
- `deploy/compose.yml` runs the container read-only on the shared external `web` network without host ports; the shared Caddy proxy terminates TLS.

## Lokale Vorschau

Den Ordner [`public/`](public/) mit einem beliebigen Static-File-Server ausliefern, zum Beispiel:

```bash
python3 -m http.server 3000 --directory public
```

Danach [http://localhost:3000](http://localhost:3000) öffnen. Alternativ das Docker-Image lokal bauen und auf Port 80 testen:

```bash
docker build -t spruch-des-tages --build-arg APP_REVISION=local .
docker run --rm -p 8080:80 spruch-des-tages
```

## Tests

Logik-Tests (ohne Live-Netzwerk) mit Node’s eingebautem Runner:

```bash
npm test
```

CI führt dieselben Tests bei Push/PR aus ([`.github/workflows/test.yml`](.github/workflows/test.yml)).

## Technik

- Rein clientseitig: `moments.youversionapi.com` (Kalender) + `images.youversionapi.com` (deutsches Share-Bild)
- Gemeinsame Logik in [`public/votd.js`](public/votd.js), UI in [`public/app.js`](public/app.js)
- Zeitzone für den Tageswechsel: Europe/Berlin
- Druck-CSS: A4 hochkant
