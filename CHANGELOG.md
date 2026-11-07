# Changelog

## 0.12.10

### Corretto

- **Biforcazioni su nodi intermedi:** il controllo delle diramazioni considera i segmenti tra tutti i nodi consecutivi delle way, non solo gli estremi.
- **Marcatori sulla mappa:** le biforcazioni rilevate su nodi intermedi possono essere segnalate sul nodo OSM condiviso.

### Migliorato

- **Analisi delle componenti scollegate e degli anelli:** utilizza un grafo costruito dai segmenti delle way.
- **Rami distinti:** i segmenti coincidenti o percorsi nei due versi non vengono contati più volte; gli incroci senza nodo OSM comune non sono considerati collegamenti.
- **Indicatori della mappa:** non vengono generati indicatori parziali quando mancano geometrie o sono presenti cicli nelle sottorelazioni.

## [0.12.x] — Versioni precedenti

Le versioni precedenti della serie 0.12.x hanno introdotto e consolidato le principali funzionalità di OSM2CAI Tools.

Per una panoramica completa delle funzionalità disponibili e del loro funzionamento, consultare  [FUNZIONALITÀ.md](FUNZIONALIT%C3%80.md).
