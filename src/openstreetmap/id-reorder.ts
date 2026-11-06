import { validateMemberReorder } from "../shared/relations"

export function applyOrderInsideID() {
  const raw = location.hash.match(/(?:^|[&#])osm2cai_members=([^&]+)/)?.[1]
  if (!raw) return
  let job
  try {
    if (raw.length > 120000) throw Error("Payload troppo grande")
    job = JSON.parse(decodeURIComponent(raw))
    if (
      !job ||
      typeof job !== "object" ||
      Array.isArray(job) ||
      !/^[1-9]\d{0,15}$/.test(String(job.relationId)) ||
      !Number.isSafeInteger(Number(job.relationId)) ||
      !Number.isSafeInteger(job.version) ||
      job.version < 1 ||
      !Array.isArray(job.before) ||
      !Array.isArray(job.after) ||
      job.before.length < 2 ||
      job.before.length > 10000 ||
      job.after.length !== job.before.length
    )
      throw Error("Dati incompleti")
    if (!validateMemberReorder(job.before, job.after))
      throw Error("Riordino non valido")
  } catch (e) {
    alert("OSM2CAI: richiesta di ordinamento non valida.")
    return
  }

  // L'istanza ufficiale iD è una variabile locale di /id: catturiamo
  // il contesto quando iD lo crea (il sito lo inizializza a DOMContentLoaded).
  const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window
  let captured: any = null
  let attempts = 0
  let finished = false
  let timer: any = null
  const stop: any = () => {
    finished = true
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    window.removeEventListener("pagehide", stop)
  }
  window.addEventListener("pagehide", stop, { once: true })
  // Copia superficiale delle esportazioni: evita di alterare l'oggetto
  // module namespace, che può essere immutabile.
  const proxy = (api: any) => {
    if (!api || typeof api.coreContext !== "function") return api
    const facade = Object.assign({}, api)
    facade.coreContext = function (...args: any[]) {
      const ctx = api.coreContext.apply(api, args)
      captured = ctx
      return ctx
    }
    return facade
  }
  try {
    let current = proxy(page.iD)
    Object.defineProperty(page, "iD", {
      configurable: true,
      enumerable: true,
      get() {
        return current
      },
      set(v) {
        current = proxy(v)
      },
    })
  } catch (e) {
    stop()
    alert("OSM2CAI: impossibile collegarsi a iD. Nessuna modifica applicata.")
    return
  }

  timer = setInterval(() => {
    if (finished) {
      stop()
      return
    }
    if (++attempts > 180) {
      stop()
      alert(
        "OSM2CAI: relazione non caricata o contesto iD non disponibile. " +
          "Nessuna modifica applicata.",
      )
      return
    }
    try {
      if (
        !captured ||
        typeof captured.hasEntity !== "function" ||
        typeof captured.perform !== "function"
      )
        return
      const entity = captured.hasEntity("r" + job.relationId)
      if (!entity || !Array.isArray(entity.members)) return
      const norm = (m: any) => ({
        type: m.type,
        ref: String(m.id ?? m.ref ?? "").replace(/^[nwr]/, ""),
        role: m.role || "",
      })
      const present = entity.members.map(norm)
      if (!validateMemberReorder(present, job.after)) {
        stop()
        alert("OSM2CAI: riordino non valido. Nessuna modifica applicata.")
        return
      }
      const canonical = (a: any) => JSON.stringify(a)
      if (
        Number(entity.version) !== job.version ||
        canonical(present) !== canonical(job.before)
      ) {
        stop()
        alert(
          "OSM2CAI: la relazione in iD non corrisponde alla versione " +
            "analizzata. Nessuna modifica applicata.",
        )
        return
      }
      if (canonical(job.before) === canonical(job.after)) {
        stop()
        return
      }
      stop()
      if (
        !confirm(
          "OSM2CAI: riordinare " +
            job.before.filter((m: any) => m.type === "way").length +
            " way nella relazione " +
            job.relationId +
            "?\nLa modifica resterà NON salvata in iD e potrà essere " +
            "annullata.",
        )
      )
        return
      const remaining = new Map<any, any>()
      for (const m of entity.members) {
        const k = canonical(norm(m))
        if (!remaining.has(k)) remaining.set(k, [])
        remaining.get(k).push(m)
      }
      const reordered = job.after.map((m: any) =>
        remaining.get(canonical(m))?.shift(),
      )
      if (
        reordered.some((m: any) => !m) ||
        reordered.length !== entity.members.length
      ) {
        alert("OSM2CAI: membri non corrispondenti. Nessuna modifica applicata.")
        return
      }
      const rid = "r" + job.relationId
      // Verifica finale prima della mutazione del grafo.
      if (!validateMemberReorder(present, reordered.map(norm))) {
        alert("OSM2CAI: i membri non rispettano la sequenza autorizzata.")
        return
      }
      captured.perform(
        (graph: any) =>
          graph.replace(graph.entity(rid).update({ members: reordered })),
        "OSM2CAI: riordino membri relazione " + job.relationId,
      )
      alert(
        "OSM2CAI: ordine applicato nella sessione di iD. Controlla e " +
          "salva manualmente oppure usa Annulla.",
      )
    } catch (e) {
      stop()
      alert(
        "OSM2CAI: applicazione in iD non riuscita: " +
          (e instanceof Error ? e.message : String(e)),
      )
    }
  }, 500)
}
