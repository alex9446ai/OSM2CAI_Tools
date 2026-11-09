# OSM2CAI Tools

**OSM2CAI Tools** è uno _userscript_ dedicato ai mappatori e ai validatori di OpenStreetMap (OSM) focalizzati sulla **Rete Escursionistica Italiana (REI)**. Il suo obiettivo primario è semplificare la verifica dei percorsi escursionistici e facilitare l'integrazione dei dati con **OSM2CAI**, la piattaforma del Club Alpino Italiano (CAI).

![Barra principale di OSM2CAI Tools](screenshot/OSM2CAI_tools-barra%20principale.png)

*Barra principale di OSM2CAI Tools su OpenStreetMap.*

Il progetto nasce come collegamento tra OSM e OSM2CAI. Oggi affianca alla consultazione delle informazioni CAI strumenti per **analizzare le relazioni escursionistiche, riconoscere anomalie e preparare il riordino dei membri nell'iD editor**.

> ⚠️ **Accesso riservato:** la piattaforma OSM2CAI è disponibile **solo per i soci del CAI**.

> **Ambito:** la barra informativa OSM2CAI è la componente principale dell'interfaccia. Gli strumenti di analisi delle relazioni possono essere utili anche per percorsi non italiani, ma i dati specifici OSM2CAI dipendono dal servizio CAI.

## Funzionalità

- **Consultazione OSM2CAI:** dati API, SDA, percorribilità, validazione e allineamento con OSM.
- **Analisi dei percorsi:** continuità, biforcazioni, anelli, relazioni annidate e indicatori sulla mappa.
- **Riordino con iD:** propone un ordine dei membri `way` quando non ambiguo, senza salvataggio automatico.

Per legenda, dettagli di ogni campo, popup, comportamento dell’analisi e limiti noti, consulta la **[guida alle funzionalità](FUNZIONALIT%C3%80.md)**.

## Requisiti

- Browser aggiornato, con supporto nativo a ECMAScript 2026. Non è prevista
  transpilation per browser obsoleti.
- Gestore di script: [Violentmonkey](https://violentmonkey.github.io/) (open source) o [Tampermonkey](https://www.tampermonkey.net/).
- Connessione ai servizi OSM e OSM2CAI per le funzioni che richiedono API.

La piattaforma OSM2CAI è **riservata ai soci CAI**; per accedervi possono essere necessarie le credenziali [MyCAI](https://soci.cai.it/). L'uso delle pagine OSM e dei rispettivi dati pubblici è distinto dall'accesso alla piattaforma CAI.

## Installazione

1. Installa Violentmonkey o Tampermonkey.
2. Installa lo script [`OSM2CAI_Tools.user.js`](https://github.com/andrea-del-sarto/OSM2CAI_Tools/raw/refs/heads/main/OSM2CAI_Tools.user.js)
3. Apri una relazione di percorso escursionistico su OpenStreetMap o Waymarked Trails.

## Esempi di utilizzo

### OpenStreetMap
https://www.openstreetmap.org/relation/136334

### Waymarked Trails
https://hiking.waymarkedtrails.org/#route?id=136334

## Documentazione utile

- [Documentazione OSM2CAI](https://catastorei.gitbook.io/documentazione-osm2cai)
- [Linee guida OSM/CAI](https://wiki.openstreetmap.org/wiki/IT:CAI)
- [Attività organizzate del Club Alpino Italiano su OSM](https://wiki.openstreetmap.org/wiki/Organised_Editing/Activities/Club_Alpino_Italiano/2022)
- [Copyright e licenza dei dati OSM](https://www.openstreetmap.org/copyright)
- [INFOMONT CAI](https://infomont.cai.it/)

## Licenza

Il codice di **OSM2CAI Tools** è distribuito secondo la **GNU General Public License, versione 3 (GPL-3.0-only)**. Consulta il file [LICENSE](LICENSE) per il testo integrale. Chi ridistribuisce versioni modificate deve rispettare le condizioni della GPL v3, comprese le disposizioni relative alla disponibilità del codice sorgente.

I dati OpenStreetMap sono distribuiti con licenza [ODbL](https://opendatacommons.org/licenses/odbl/).