# Funzionalità di OSM2CAI Tools

Per i requisiti e l'installazione, consulta [README.md](README.md).

## Indice

- [Barra informativa OSM2CAI](#1-barra-informativa-osm2cai)
  - [Legenda](#legenda)
  - [Stato di percorribilità](#stato-di-percorribilità)
  - [Data di validazione](#data-di-validazione)
  - [Allineamento con OpenStreetMap](#allineamento-con-openstreetmap)
- [Analisi delle relazioni escursionistiche](#2-analisi-delle-relazioni-escursionistiche)
- [Riordino dei membri nell'editor iD](#3-riordino-dei-membri-nelleditor-id)
- [Limiti e avvertenze](#4-limiti-e-avvertenze)

---

## 1. Barra informativa OSM2CAI

Aprendo una relazione escursionistica su [OpenStreetMap](https://www.openstreetmap.org/) o [Waymarked Trails](https://hiking.waymarkedtrails.org/), OSM2CAI Tools mostra una barra con le informazioni disponibili attraverso il servizio OSM2CAI e con gli strumenti di analisi della relazione.

Il pulsante **`?`** apre un riepilogo dei controlli. Le spiegazioni complete sono riportate qui sotto.

| Campo | Funzione |
| :--- | :--- |
| **OSM2CAI API** | Indica se il servizio OSM2CAI risponde correttamente. |
| **SDA** | Mostra il codice dello stato di accatastamento del percorso nel database CAI: **0, 1, 2, 3 o 4**. |
| **Percorribilità** | Mostra lo stato del percorso, quando disponibile. Passando il puntatore sul campo si aprono i dettagli. |
| **Data validazione** | Riporta l'ultima data di validazione OSM2CAI. Il colore indica quanto tempo è trascorso. |
| **Allineamento** | Confronta le date delle modifiche OSM con la data di riferimento OSM2CAI. |
| **Analisi relazione** | Verifica la continuità delle way, segnala problemi e, nei casi non ambigui, può proporre un riordino. |

### Legenda

- 🟢 **Positivo** — Stato positivo o controllo superato.
- 🔴 **Problema** — Problema o condizione da verificare.
- 🟠 **Stato intermedio** — Situazione intermedia o che richiede attenzione.
- ⚪ **Sconosciuto** — Informazione assente o non verificabile.

**Nota:** i colori vanno interpretati in base al campo. Per esempio, il colore della *Data validazione* ne indica l'**età**, non la correttezza complessiva del percorso.

### Stato di percorribilità

Se il dato è disponibile, il campo può indicare che il percorso è **percorribile**, **non percorribile**, **parzialmente percorribile** oppure che lo stato è **sconosciuto**.

Passando il puntatore sopra lo stato si apre un popup con le informazioni disponibili:

| Campo | Contenuto |
| :--- | :--- |
| **Descrizione** | Eventuali informazioni sulla percorribilità. |
| **Data aggiornamento** | Data dell'ultimo aggiornamento delle informazioni. |

Se una delle informazioni non è presente nei dati OSM2CAI, lo script non può fornirne il contenuto.

### Data di validazione

Il colore della data indica il tempo trascorso dall'ultima validazione OSM2CAI, calcolato in mesi.

| Colore | Tempo trascorso |
| :--- | :--- |
| 🟢 **Verde** | Fino a **12 mesi**, inclusi. |
| 🟠 **Arancione** | Oltre **12** e fino a **24 mesi**, inclusi. |
| 🔴 **Rosso** | Oltre **24 mesi**. |
| ⚪ **Grigio** | Data assente, vuota, non valida o futura. |

Una validazione recente non garantisce, da sola, che tutti i dati OSM siano corretti o aggiornati.

### Allineamento con OpenStreetMap

Il controllo confronta la modifica più recente degli elementi della relazione OSM (**relazioni, way e nodi**) con una data di riferimento OSM2CAI, diversa in base allo stato SDA.

| SDA | Data OSM2CAI utilizzata | Stati possibili |
| :--- | :--- | :--- |
| **4** | `validation_date` | 🟢 **aggiornato** · 🔴 **da verificare** |
| **1, 2, 3** | `updated_at` | 🟢 **aggiornato** · 🔴 **da aggiornare** |
| **0**, oppure dati temporali mancanti o non validi | Non disponibile | ⚪ **non verificabile** |

- **Aggiornato:** non risultano modifiche OSM successive alla data OSM2CAI utilizzata dal controllo.
- **Da verificare / da aggiornare:** risultano modifiche successive, da esaminare. Questo **non significa automaticamente** che ci siano errori.
- **Non verificabile:** mancano le condizioni o le informazioni necessarie per effettuare il confronto.

#### Dettaglio delle modifiche OSM (SDA 4)

Con **SDA 4** e stato **da verificare**, passando il puntatore sul campo *Allineamento* si apre l'elenco degli elementi modificati dopo la validazione.

L'elenco:

- raggruppa gli elementi per tipo: **relation**, **way**, **node**;
- ordina gli elementi di ciascun tipo dal più recente al meno recente;
- mostra **tipo e ID**, **data della modifica** e **utente OSM**;
- permette di aprire l'elemento su OpenStreetMap selezionando tipo e ID;
- visualizza al massimo **80 elementi**, segnalando il totale quando superiore.

> **Importante:** l'allineamento si basa sulle **date di modifica**. Non confronta in modo puntuale i tag né ricostruisce e confronta due geometrie storiche OSM/OSM2CAI.

---

## 2. Analisi delle relazioni escursionistiche

Il pulsante **Analisi relazione** esamina la struttura delle way appartenenti alla relazione e aiuta a individuare situazioni da controllare.

### Cosa viene controllato

- **Continuità e ordine delle way:** verifica che i segmenti siano collegati attraverso i nodi estremi.
- **Discontinuità e componenti scollegate:** individua parti del percorso che non risultano connesse tra loro.
- **Biforcazioni:** evidenzia i punti in cui la struttura presenta più diramazioni.
- **Way ripetute:** segnala la presenza della stessa way più volte nella relazione.
- **Tipologia del percorso:** distingue, quando possibile, un percorso con una sequenza di way collegate senza biforcazioni da un percorso ad anello o da una struttura ambigua.
- **Relazioni annidate:** tenta di analizzare anche le relazioni contenute in altre relazioni, recuperando le geometrie mancanti quando possibile.

### Visualizzazione sulla mappa

L'analisi può mostrare:

- **Frecce blu**, che indicano il verso di percorrenza;
- **pin temporanei**, che evidenziano problemi o punti da verificare;
- su OpenStreetMap, un **tracciato viola temporaneo** per rappresentare la geometria delle relazioni annidate.

Quando vengono rilevati problemi, lo script tenta di **inquadrare automaticamente il percorso** e mostra subito gli indicatori, senza richiedere un secondo clic. Gli indicatori possono essere nascosti tramite **Nascondi indicatori**.

Nel pannello dei risultati è possibile consultare i punti problematici e, quando previsti, aprire su OSM i nodi interessati. Gli indicatori sono puramente visivi: **non vengono salvati su OpenStreetMap**.

### Proposta di riordino

Quando la geometria è sufficientemente chiara, lo script può proporre una sequenza di way coerente con la continuità del percorso e, se disponibile, consentire di **copiarla**.

L'ordinamento automatico **non viene proposto** quando la struttura è annidata o complessa, presenta ruoli particolari oppure la geometria è ambigua. In questi casi è necessaria una verifica manuale.

---

## 3. Riordino dei membri nell'editor iD

Se l'analisi individua un ordinamento non ambiguo, è possibile scegliere la sequenza proposta o quella inversa e trasferirla nell'editor **iD** di OpenStreetMap.

Il procedimento prevede alcune salvaguardie:

1. Il riordino interviene sulle posizioni dei membri di tipo **`way`**, mantenendo i ruoli e i membri di altri tipi.
2. Prima dell'applicazione vengono controllati la **versione** e l'insieme dei membri della relazione.
3. L'utente deve **confermare** l'operazione nell'editor.
4. La modifica rimane **non salvata** nella sessione di iD, può essere annullata e deve essere verificata e salvata **manualmente**.

**OSM2CAI Tools non salva automaticamente modifiche sui server OpenStreetMap.**

---

## 4. Limiti e avvertenze

- **Analisi topologica:** la continuità delle estremità delle way non garantisce la correttezza di tag, ruoli o geometria.
- **Strutture complesse:** grandi *superroute* e relazioni molto annidate possono superare i limiti di recupero dei dati; in tal caso l'analisi può essere **incompleta**.
- **Integrazione con iD:** dipende anche da componenti interni dell'editor, che potrebbero cambiare con i suoi aggiornamenti.
- **Dati OSM2CAI:** le informazioni mostrate dipendono dalla disponibilità e dal contenuto delle risposte del servizio.
