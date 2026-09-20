# Spruch des Tages

Fullscreen-Darstellung des aktuellen YouVersion-Verses des Tages (Deutsch, Hoffnung für alle) mit dem offiziellen Versbild. Unauffälliger Button zum Drucken auf A4 (hochkant).

## Start

```bash
npm start
```

Öffne anschließend [http://localhost:3000](http://localhost:3000).

## Technik

- Kleiner Node-Server (`server.js`) ohne Extra-Dependencies
- `GET /api/votd` lädt den Tagesvers und das YouVersion-Share-Bild (Sprache `de`, Version Hfa)
- Frontend zeigt das Bild fullscreen; Druck-CSS setzt A4 hochkant
