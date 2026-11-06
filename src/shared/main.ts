import { boundsFromGeojson, boundsFromOsmFull, wmtUrlForBounds } from "./geo"
import { latestRelationWayTimestamp, validationDateKind } from "./dates"
import {
  checkMemberOrder,
  orderArrowsForSequence,
  orderElevationHint,
  orderProblemPoints,
  relationGeometryMembers,
  validateMemberReorder,
} from "./relations"
import { createPanelLayout } from "./panel-layout"
import { createPanelMarkup, PANEL_LINK_ICON } from "./panel-markup"
// Copyright (C) 2026 andrea-del-sarto
// SPDX-License-Identifier: GPL-3.0-only
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License, version 3.
// This program is distributed WITHOUT ANY WARRANTY.
// See the LICENSE file or https://www.gnu.org/licenses/gpl-3.0.html

export interface SiteAdapter {
  readonly isWaymarkedTrails: boolean
  readonly mapSelectors: readonly string[]
  isOsmEditing(): boolean
  relationIdFromUrl(): string | null
  alternateLink(relationId: string, icon: string): string
  initializeEditor?(): boolean
  tileView?(map: Element, rect: DOMRect): MapCoordinates | null
  canvasFrame?(
    map: Element,
  ): { canvas: HTMLCanvasElement; matrix: DOMMatrix } | null
  panelInsets?(rect: DOMRect, map: Element): { left: number; right: number }
  resetMapState?(): void
  updateOsmLink?(relationId: string | null, bounds: any): void
  bindLinks?(getRelationId: () => string | null, getBounds: () => any): void
}

interface MapCoordinates {
  zoom: number
  lat: number
  lon: number
}

export function startUserscript(site: SiteAdapter): void {
  "use strict"

  // La versione visualizzata nel popup proviene dai metadati Tampermonkey.
  const SCRIPT_VERSION = GM_info?.script?.version || "0.12.9"

  if (site.initializeEditor?.()) return

  const API = "https://osm2cai.cai.it/api/v2/hiking-route-osm"
  const OSM2CAI = "https://osm2cai.cai.it/resources/hiking-routes"
  const TIMEOUT = 12000
  const COLLAPSED_KEY = "osm2cai-compact-collapsed"
  let collapsed = localStorage.getItem(COLLAPSED_KEY) === "1"
  let inFlight = new Set<any>()
  let relationIdShown: any = null
  let sequence = 0
  let refreshTimer: any = null
  let positionTimer: any = null
  let lastUrl = location.href

  const isWmt = () => site.isWaymarkedTrails
  const isOsmEditing = () => site.isOsmEditing()
  const relationIdFromUrl = () => site.relationIdFromUrl()
  const {
    insertStyle,
    adjustPosition,
    applyInlineLayout,
    applyTheme,
    applyModifiedPopupTheme,
  } = createPanelLayout(isWmt, () => collapsed)
  // Dettaglio delle modifiche OSM successive alla validazione (solo SDA 4).
  let modifiedAfterValidation: any = []
  let modifiedHoverTimer: any = null
  const $ = (id: any): any => document.getElementById("osm2cai-" + id)

  function hideModifiedPopup() {
    clearTimeout(modifiedHoverTimer)
    const popup = $("modified-popup")
    if (popup) {
      popup.hidden = true
      popup.style.display = "none"
    }
  }

  function scheduleHideModifiedPopup() {
    clearTimeout(modifiedHoverTimer)
    modifiedHoverTimer = setTimeout(hideModifiedPopup, 180)
  }

  function resetModifiedElements() {
    clearOrderMap()
    orderFull = null
    orderRelationId = null
    setMemberOrderIndicator("gray")
    modifiedAfterValidation = []
    hideModifiedPopup()
  }

  function modifiedElementsSince(full: any, validationDate: any) {
    const elements = full?.elements
    if (!Array.isArray(elements) || typeof validationDate !== "string") {
      return []
    }
    const stamp = validationDate.trim()
    if (!/^\d{4}-\d{2}-\d{2}(?:$|T|\s)/.test(stamp)) {
      return []
    }
    const ms = Date.parse(stamp)
    if (!Number.isFinite(ms)) {
      return []
    }
    const onlyDay = /^\d{4}-\d{2}-\d{2}$/.test(stamp)
    return elements
      .filter(item => {
        const modified =
          typeof item.timestamp === "string" ? Date.parse(item.timestamp) : NaN
        return (
          Number.isFinite(modified) &&
          (onlyDay ? item.timestamp.slice(0, 10) > stamp : modified > ms)
        )
      })
      .sort((a, b) => {
        const order: Record<string, number> = { relation: 0, way: 1, node: 2 }
        const group = (order[a.type] ?? 3) - (order[b.type] ?? 3)
        return group || Date.parse(b.timestamp) - Date.parse(a.timestamp)
      })
  }

  function renderModifiedPopup() {
    const popup = $("modified-popup")
    if (
      !popup ||
      !modifiedAfterValidation.length ||
      $("sync")?.textContent !== "da verificare"
    ) {
      return
    }
    popup.replaceChildren()
    const heading = document.createElement("div")
    heading.style.cssText = "font-weight:700;margin-bottom:7px"
    heading.textContent =
      "Elementi modificati dopo la validazione (" +
      modifiedAfterValidation.length +
      ")"
    popup.appendChild(heading)
    const list = document.createElement("div")
    const maxItems = 80
    for (const item of modifiedAfterValidation.slice(0, maxItems)) {
      if (
        !["node", "way", "relation"].includes(item.type) ||
        !Number.isSafeInteger(Number(item.id))
      ) {
        continue
      }
      const line = document.createElement("div")
      line.style.cssText =
        "padding:5px 0;border-bottom:1px solid rgba(128,128,128,.2)"
      const link = document.createElement("a")
      link.href =
        "https://www.openstreetmap.org/" +
        item.type +
        "/" +
        encodeURIComponent(item.id)
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.style.cssText = "color:#4697f5;text-decoration:underline"
      link.textContent = item.type + " " + item.id
      line.appendChild(link)
      const day = item.timestamp.slice(0, 10)
      const username =
        typeof item.user === "string" && item.user.trim()
          ? item.user.trim()
          : "utente non disponibile"
      line.appendChild(
        document.createTextNode(" — " + day + " — [" + username + "]"),
      )
      list.appendChild(line)
    }
    popup.appendChild(list)
    if (modifiedAfterValidation.length > maxItems) {
      const remaining = document.createElement("div")
      remaining.style.cssText = "margin-top:8px;font-style:italic"
      remaining.textContent =
        "Visualizzati i primi " +
        maxItems +
        " elementi (relation, way, node) su " +
        modifiedAfterValidation.length +
        "."
      popup.appendChild(remaining)
    }
    const anchor = $("sync")?.closest(".oc-metric")
    if (!anchor) {
      return
    }
    const rect = anchor.getBoundingClientRect()
    const width = Math.min(480, window.innerWidth - 16)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    popup.style.setProperty("position", "fixed", "important")
    popup.style.setProperty("left", left + "px", "important")
    popup.style.setProperty(
      "top",
      Math.min(rect.bottom + 8, window.innerHeight - 110) + "px",
      "important",
    )
    popup.style.setProperty("width", width + "px", "important")
    popup.style.setProperty("max-height", "min(420px, 65vh)", "important")
    popup.style.setProperty("overflow-y", "auto", "important")
    popup.style.setProperty("padding", "12px 14px", "important")
    popup.style.setProperty("border", "1px solid #8797ac", "important")
    popup.style.setProperty("border-radius", "8px", "important")
    popup.style.setProperty("box-shadow", "0 7px 22px #0004", "important")
    popup.style.setProperty("z-index", "2147483002", "important")
    popup.style.setProperty("pointer-events", "auto", "important")
    popup.style.setProperty("display", "block", "important")
    popup.hidden = false
    applyModifiedPopupTheme()
  }

  // Verifica dell'ordine: usa solo il full.json della relazione
  // attualmente aperta.
  // Non scrive dati OSM e non interagisce con il modello interno di iD.
  let orderFull: any = null
  let orderRelationId: any = null
  // Segnalazioni temporanee indipendenti dai layer Leaflet/OSM.
  // Non usa né modifica oggetti della mappa appartenenti ad altri script.
  let orderMapIssues: any = []
  let orderMapArrows: any = []
  let orderMapArrowsVisible = false
  let orderNestedGeometryVisible = false
  let orderMapVisible = false
  let orderAnimationFrame: any = null
  let orderRenderSignature: any = null
  let orderLastCanvasNode: any = null
  let osmTraceInputAnimation: any = null

  // Il ciclo veloce si attiva soltanto per pan/zoom o cambiamenti della vista.
  // A mappa ferma rimane un controllo leggero per aggiornamenti di URL e layout
  // che WMT non notifica a questo userscript tramite API pubbliche.
  let orderIdleTimer: any = null
  let orderFastUntil = 0
  let orderLastMotionSignature: any = null
  function startOrderAnimation(duration = 850) {
    orderFastUntil = Math.max(orderFastUntil, performance.now() + duration)
    if (orderAnimationFrame !== null) return
    if (orderIdleTimer !== null) {
      clearTimeout(orderIdleTimer)
      orderIdleTimer = null
    }
    const tick: any = () => {
      orderAnimationFrame = null
      if (
        (!orderMapVisible && !orderMapArrowsVisible) ||
        collapsed ||
        isOsmEditing() ||
        orderRelationId !== relationIdFromUrl()
      )
        return
      renderOrderMapOverlay()
      // renderOrderMapOverlay può già aver programmato un frame in caso
      // di cambiamento: evita due cicli concorrenti.
      if (orderAnimationFrame !== null) return
      if (performance.now() < orderFastUntil) {
        orderAnimationFrame = requestAnimationFrame(tick)
      } else {
        scheduleOrderIdle()
      }
    }
    orderAnimationFrame = requestAnimationFrame(tick)
  }

  function scheduleOrderIdle() {
    if (orderIdleTimer !== null || orderAnimationFrame !== null) return
    orderIdleTimer = setTimeout(() => {
      orderIdleTimer = null
      if (
        (!orderMapVisible && !orderMapArrowsVisible) ||
        collapsed ||
        isOsmEditing() ||
        orderRelationId !== relationIdFromUrl()
      )
        return
      renderOrderMapOverlay()
      // Se è iniziato un movimento, il rendering riattiva il ciclo rapido.
      if (orderAnimationFrame === null) scheduleOrderIdle()
    }, 420)
  }

  function clearOrderMap() {
    orderMapVisible = false
    orderMapIssues = []
    orderMapArrows = []
    orderMapArrowsVisible = false
    orderNestedGeometryVisible = false
    if (orderAnimationFrame !== null) {
      cancelAnimationFrame(orderAnimationFrame)
      orderAnimationFrame = null
    }
    if (orderIdleTimer !== null) {
      clearTimeout(orderIdleTimer)
      orderIdleTimer = null
    }
    orderFastUntil = 0
    orderLastMotionSignature = null
    orderRenderSignature = null
    orderLastCanvasNode = null
    site.resetMapState?.()
    document.getElementById("osm2cai-order-overlay")?.remove()
    orderDrag = null
    orderDragOffset = { x: 0, y: 0 }
    orderDragBase = { x: 0, y: 0 }
    orderLastView = null
    wmtCanvasBaseline = null
    wmtCanvasBaselineKey = null
    wmtZoomGesture = null
    osmZoomGesture = null
    osmLastZoom = null
    osmTraceInputAnimation = null
  }

  // Gli indicatori sono indipendenti da Leaflet/MapLibre e non alterano
  // i loro layer.
  // Durante il drag seguiamo il movimento del puntatore; quando l’URL cambia
  // riproiettiamo le coordinate dalla nuova vista.
  let orderDrag: any = null
  let orderDragOffset = { x: 0, y: 0 }
  let orderDragBase = { x: 0, y: 0 }
  let orderLastView: any = null
  // Su WMT seguiamo la trasformazione effettiva del canvas OpenLayers,
  // senza stimare anticipatamente uno zoom intero ad ogni click o rotella.
  let wmtCanvasBaseline: any = null
  let wmtCanvasBaselineKey: any = null
  // Compensazione esclusiva dello zoom WMT quando il canvas viene ridisegnato
  // senza esporre una scala CSS misurabile. Non modifica il drag della 2.6.4.
  let wmtZoomGesture: any = null
  let osmZoomGesture: any = null
  let osmLastZoom: any = null
  // Le frecce non devono essere mostrate in posizioni stimate durante
  // l’animazione: WMT può ridisegnare canvas senza trasformazione CSS.
  // Nascondimento basato sull'assestamento della vista, non su un timer fisso.
  // Mantiene un timeout di sicurezza solo se WMT non pubblica mai moveend.
  const WMT_ZOOM_STABLE_MS = 260
  const WMT_ZOOM_MAX_MS = 2300
  function beginWmtZoomGesture(
    direction: number,
    clientX: number | null = null,
    clientY: number | null = null,
  ) {
    if (!isWmt() || (!orderMapVisible && !orderMapArrowsVisible) || !direction)
      return
    const view = orderView()
    if (!view) return
    const { rect } = view
    const anchor =
      clientX !== null &&
      clientY !== null &&
      Number.isFinite(clientX) &&
      Number.isFinite(clientY)
        ? { x: clientX - rect.left, y: clientY - rect.top }
        : { x: rect.width / 2, y: rect.height / 2 }
    const now = performance.now()
    if (
      !wmtZoomGesture ||
      wmtZoomGesture.viewKey !== view.key ||
      now - wmtZoomGesture.started > 600
    ) {
      wmtZoomGesture = {
        viewKey: view.key,
        anchor,
        delta: direction,
        started: now,
        lastInput: now,
        lastMotion: now,
        viewUpdated: false,
      }
    } else {
      // Due pulsanti premuti rapidamente possono sommare lo zoom.
      wmtZoomGesture.delta = Math.max(
        -3,
        Math.min(3, wmtZoomGesture.delta + direction),
      )
      wmtZoomGesture.lastInput = now
      wmtZoomGesture.lastMotion = now
    }
    const pins = document.querySelector(
      "#osm2cai-order-overlay #osm2cai-map-problems",
    )
    if (pins) pins.style.visibility = "hidden"
    startOrderAnimation(800)
  }
  document.addEventListener(
    "wheel",
    event => {
      if (!isWmt() || event.ctrlKey || Math.abs(event.deltaY) < 2) return
      const map = findOrderMapElement()
      if (map && map.contains(event.target)) {
        // La rotella tradizionale di OL avvia normalmente uno step per gesto.
        // Evita di accumulare decine di step sul trackpad ad alta frequenza.
        const now = performance.now()
        if (!wmtZoomGesture || now - wmtZoomGesture.lastInput > 360)
          beginWmtZoomGesture(
            event.deltaY < 0 ? 1 : -1,
            event.clientX,
            event.clientY,
          )
        else {
          wmtZoomGesture.lastInput = now
          wmtZoomGesture.lastMotion = now
          startOrderAnimation(700)
        }
      }
    },
    { capture: true, passive: true },
  )
  document.addEventListener(
    "click",
    (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (!isWmt() || !target) return
      const control = target.closest(".ol-zoom-in,.ol-zoom-out")
      if (control)
        beginWmtZoomGesture(control.classList.contains("ol-zoom-in") ? 1 : -1)
    },
    true,
  )
  // OSM: come su WMT, non mostrare frecce su una vista che sta ancora
  // animando lo zoom. Il drag non viene toccato, e non alteriamo i layer OSM.
  const OSM_ZOOM_STABLE_MS = 300
  const OSM_ZOOM_MAX_MS = 1900
  // Anima la geometria all'INIZIO dello zoom, prima che OSM aggiorni #map=.
  // Non modifica i layer OSM, né il pan già funzionante.
  function beginOsmZoomGesture(
    direction = 0,
    clientX: number | null = null,
    clientY: number | null = null,
  ) {
    if (isWmt() || (!orderMapVisible && !orderMapArrowsVisible)) return
    const view = orderView()
    if (!view) return
    const now = performance.now()
    if (!osmZoomGesture) {
      osmZoomGesture = {
        started: now,
        lastInput: now,
        lastChange: now,
        startZoom: view.zoom,
        viewUpdated: false,
      }
    } else {
      osmZoomGesture.lastInput = now
      osmZoomGesture.lastChange = now
    }
    if (direction && orderNestedGeometryVisible) {
      const overlay = document.getElementById("osm2cai-order-overlay")
      const trace = overlay?.querySelector("#osm2cai-nested-geometry")
      if (trace) {
        const rect = view.rect
        const anchor = {
          x:
            clientX !== null && Number.isFinite(clientX)
              ? clientX - rect.left
              : rect.width / 2,
          y:
            clientY !== null && Number.isFinite(clientY)
              ? clientY - rect.top
              : rect.height / 2,
        }
        // Per gesti ripetuti usa la trasformazione finale del gesto precedente.
        const current: any = osmTraceInputAnimation
        const base = current && now < current.until ? current.factor : 1
        const factor = base * (direction > 0 ? 2 : 0.5)
        const start = current && now < current.until ? current.factor : 1
        trace.style.transformBox = "view-box"
        trace.style.transformOrigin = `${anchor.x}px ${anchor.y}px`
        // Il browser vede esplicitamente due stati e interpola il transform.
        trace.style.transition = "none"
        trace.style.transform = `scale(${start})`
        void trace.getBoundingClientRect()
        trace.style.transition = "transform 260ms ease-out"
        trace.style.transform = `scale(${factor})`
        osmTraceInputAnimation = { until: now + 300, factor, viewKey: view.key }
        startOrderAnimation(620)
      }
    }
    // I pin sono ancorati alla vista geografica: durante l'animazione OSM
    // non devono restare fermi su una posizione precedente.
    const pins = document.querySelector(
      "#osm2cai-order-overlay #osm2cai-map-problems",
    )
    if (pins) pins.style.visibility = "hidden"
    startOrderAnimation(750)
  }
  document.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      if (isWmt() || event.ctrlKey || Math.abs(event.deltaY) < 1) return
      const map = findOrderMapElement()
      if (event.target instanceof Node && map?.contains(event.target))
        beginOsmZoomGesture(
          event.deltaY < 0 ? 1 : -1,
          event.clientX,
          event.clientY,
        )
    },
    { capture: true, passive: true },
  )
  document.addEventListener(
    "dblclick",
    (event: MouseEvent) => {
      if (isWmt()) return
      const map = findOrderMapElement()
      if (event.target instanceof Node && map?.contains(event.target))
        beginOsmZoomGesture(
          event.shiftKey ? -1 : 1,
          event.clientX,
          event.clientY,
        )
    },
    true,
  )
  document.addEventListener(
    "click",
    (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (isWmt() || !target) return
      const plus = target.closest(
        '.leaflet-control-zoom-in,.ol-zoom-in,[data-testid="zoom-in"]',
      )
      const minus = target.closest(
        '.leaflet-control-zoom-out,.ol-zoom-out,[data-testid="zoom-out"]',
      )
      if (plus || minus) beginOsmZoomGesture(plus ? 1 : -1)
    },
    true,
  )
  document.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      if (
        isWmt() ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) ||
            event.target.isContentEditable))
      )
        return
      if (["+", "=", "-", "_"].includes(event.key) && findOrderMapElement())
        beginOsmZoomGesture(["+", "="].includes(event.key) ? 1 : -1)
    },
    true,
  )
  function findOrderMapElement() {
    for (const selector of site.mapSelectors) {
      for (const node of document.querySelectorAll(selector)) {
        const rect = node.getBoundingClientRect()
        if (
          rect.width > 250 &&
          rect.height > 180 &&
          rect.width <= window.innerWidth + 40
        )
          return node
      }
    }
    return null
  }

  function orderView() {
    const map = findOrderMapElement()
    if (!map) return null
    const rect = map.getBoundingClientRect()
    // Su OSM la vista reale si legge prima dalle tessere Leaflet.
    // L'URL può mancare del tutto oppure essere aggiornato solo a moveend.
    const tileView = site.tileView?.(map, rect) ?? null
    const match = (location.hash + "&" + location.search).match(
      /(?:^|[#?&])map=([\d.]+)\/(-?[\d.]+)\/(-?[\d.]+)/,
    )
    const stored =
      isWmt() && !match
        ? (localStorage.getItem("position") || "").match(
            /^([\d.]+)\/(-?[\d.]+)\/(-?[\d.]+)$/,
          )
        : null
    const view = match || stored
    if (!tileView && !view) return null
    const zoom = tileView ? tileView.zoom : Number(view![1])
    const lat = tileView ? tileView.lat : Number(view![2])
    const lon = tileView ? tileView.lon : Number(view![3])
    if (
      ![zoom, lat, lon].every(Number.isFinite) ||
      zoom < 0 ||
      zoom > 25 ||
      Math.abs(lat) > 85 ||
      Math.abs(lon) > 540
    )
      return null
    return {
      map,
      rect,
      zoom,
      lat,
      lon,
      source: tileView ? "tiles" : "url",
      key: zoom.toFixed(5) + "/" + lat.toFixed(7) + "/" + lon.toFixed(7),
    }
  }

  // Mantieni il dislocamento cumulativo fino all'aggiornamento della vista
  // pubblicata dal sito: l'URL della mappa viene aggiornato solo a moveend.
  // Vale anche per più trascinamenti consecutivi effettuati prima di moveend.
  function beginOrderDrag(event: PointerEvent) {
    if (
      (!orderMapVisible && !orderMapArrowsVisible) ||
      event.button !== 0 ||
      orderDrag
    )
      return
    const map = findOrderMapElement()
    if (!(event.target instanceof Node) || !map || !map.contains(event.target))
      return
    const view = orderView()
    if (!view) return
    orderDrag = { id: event.pointerId, x: event.clientX, y: event.clientY }
    orderDragBase = { ...orderDragOffset }
  }
  function moveOrderDrag(event: PointerEvent) {
    if (
      !orderDrag ||
      event.pointerId !== orderDrag.id ||
      (!orderMapVisible && !orderMapArrowsVisible)
    )
      return
    orderDragOffset = {
      x: orderDragBase.x + event.clientX - orderDrag.x,
      y: orderDragBase.y + event.clientY - orderDrag.y,
    }
    orderDrag.lastX = event.clientX
    orderDrag.lastY = event.clientY
    // Il ciclo rAF traccia già ogni frame durante i movimenti della mappa.
    startOrderAnimation()
  }
  function endOrderDrag(event: PointerEvent) {
    if (!orderDrag || (event && event.pointerId !== orderDrag.id)) return
    if (event) moveOrderDrag(event)
    orderDrag = null
    // L'offset resta valido finché WMT/OSM non pubblica la nuova vista.
  }
  document.addEventListener("pointerdown", beginOrderDrag, true)
  document.addEventListener("pointermove", moveOrderDrag, true)
  document.addEventListener("pointerup", endOrderDrag, true)
  document.addEventListener("pointercancel", endOrderDrag, true)
  window.addEventListener("blur", () => {
    orderDrag = null
  })
  function renderOrderMapOverlay() {
    if (
      (!orderMapVisible && !orderMapArrowsVisible) ||
      collapsed ||
      isOsmEditing() ||
      orderRelationId !== relationIdFromUrl()
    ) {
      clearOrderMap()
      return
    }
    const view = orderView()
    let overlay = document.getElementById("osm2cai-order-overlay")
    if (!view) {
      overlay?.remove()
      return
    }
    // Il solo cambio di livello zoom OSM avvia la soppressione delle
    // frecce; uno spostamento del centro non deve essere trattato come zoom.
    const osmNow = !isWmt() ? performance.now() : 0
    if (!isWmt()) {
      if (osmLastZoom !== null && view.zoom !== osmLastZoom) {
        if (!osmZoomGesture)
          osmZoomGesture = {
            started: osmNow,
            lastInput: osmNow,
            lastChange: osmNow,
            startZoom: osmLastZoom,
            viewUpdated: true,
          }
        osmZoomGesture.viewUpdated = true
        osmZoomGesture.lastChange = osmNow
        startOrderAnimation(650)
      }
      osmLastZoom = view.zoom
    }
    if (view.key !== orderLastView) {
      if (
        !isWmt() &&
        osmZoomGesture &&
        view.zoom !== osmZoomGesture.startZoom
      ) {
        osmZoomGesture.viewUpdated = true
        osmZoomGesture.lastChange = osmNow
      }
      orderLastView = view.key
      // Il sito ha pubblicato la nuova posizione: niente correzione
      // manuale da sommare alle coordinate geografiche aggiornate.
      orderDragOffset = { x: 0, y: 0 }
      wmtCanvasBaseline = null
      wmtCanvasBaselineKey = null
      if (wmtZoomGesture) {
        // La pubblicazione della nuova vista è il segnale più affidabile
        // che lo zoom sia arrivato alla sua destinazione geometrica.
        wmtZoomGesture.viewUpdated = true
        wmtZoomGesture.lastMotion = performance.now()
        startOrderAnimation(500)
      }
      if (orderDrag) {
        // Dopo l’aggiornamento la nuova origine è l’ultima posizione
        // nota del puntatore, per non sommare due volte il drag.
        orderDrag.x = orderDrag.lastX ?? orderDrag.x
        orderDrag.y = orderDrag.lastY ?? orderDrag.y
        orderDragBase = { x: 0, y: 0 }
      }
    }
    // Il canvas può essere sostituito da OpenLayers (cambio layer o tile).
    // Se cambia elemento, riparti da un nuovo riferimento senza usare
    // trasformazioni misurate su un canvas non più presente.
    // Durante l'interpolazione d'ingresso NON ricostruire il path sulla
    // vista URL vecchia o nuova: conserverebbe la traccia ferma e causerebbe
    // uno scatto. Al termine riproietta con la vista OSM definitiva.
    if (!isWmt() && osmTraceInputAnimation) {
      if (performance.now() < osmTraceInputAnimation.until) {
        const arrows = overlay?.querySelector("#osm2cai-map-arrows")
        if (arrows) arrows.style.visibility = "hidden"
        const pins = overlay?.querySelector("#osm2cai-map-problems")
        if (pins) pins.style.visibility = "hidden"
        return
      }
      osmTraceInputAnimation = null
      orderRenderSignature = null
    }
    const frameForSignature = site.canvasFrame?.(view.map) ?? null
    const canvasChanged: any =
      isWmt() && frameForSignature?.canvas !== orderLastCanvasNode
    if (canvasChanged) {
      wmtCanvasBaseline = null
      wmtCanvasBaselineKey = null
      orderRenderSignature = null
    }
    orderLastCanvasNode = frameForSignature?.canvas || null
    // Il canvas OL puo' cambiare transform a ogni frame. Non ricreiamo i
    // singoli marcatori: applichiamo la stessa trasformazione all'SVG.
    // La geometria si ridisegna soltanto quando cambia la vista URL, la
    // dimensione, il riferimento canvas o il contenuto dell'overlay.
    const baseSignature = [
      view.key,
      view.rect.left,
      view.rect.top,
      view.rect.width,
      view.rect.height,
      Boolean(frameForSignature),
      orderMapVisible,
      orderMapArrowsVisible,
      frameForSignature || view.source === "tiles" ? "" : orderDragOffset.x,
      frameForSignature || view.source === "tiles" ? "" : orderDragOffset.y,
    ].join("|")
    if (!overlay) {
      overlay = document.createElement("div")
      overlay.id = "osm2cai-order-overlay"
      overlay.setAttribute("aria-label", "Punti critici ordine membri OSM2CAI")
      overlay.style.cssText =
        "position:fixed;pointer-events:none;z-index:1100;overflow:hidden;"
      document.body.appendChild(overlay)
    }
    const { rect, zoom, lat, lon } = view
    overlay.style.left = rect.left + "px"
    overlay.style.top = rect.top + "px"
    overlay.style.width = rect.width + "px"
    overlay.style.height = rect.height + "px"
    if (site.panelInsets) {
      const covered = site.panelInsets(rect, view.map)
      overlay.style.clipPath =
        covered.left || covered.right
          ? `inset(0 ${covered.right}px 0 ${covered.left}px)`
          : "none"
      overlay.style.zIndex = "2"
    } else {
      overlay.style.clipPath = "none"
      overlay.style.zIndex = "1100"
    }
    const ns = "http://www.w3.org/2000/svg"
    const svg = document.createElementNS(ns, "svg")
    svg.setAttribute("width", String(rect.width))
    svg.setAttribute("height", String(rect.height))
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`)
    svg.style.pointerEvents = "none"
    const scale = 256 * 2 ** zoom
    const mercY = (a: any) =>
      Math.log(
        Math.tan(
          Math.PI / 4 + (Math.max(-85, Math.min(85, a)) * Math.PI) / 360,
        ),
      )
    const centerY = mercY(lat)
    // Durante lo zoom OpenLayers puo' ridisegnare/trasformare il canvas
    // prima di aggiornare #map=. L'SVG usa la medesima matrice affine
    // rispetto a un frame di riferimento, mantenendo invariati i punti.
    const wmtFrame = frameForSignature
    if (
      wmtFrame &&
      (!wmtCanvasBaseline ||
        wmtCanvasBaselineKey !== view.key ||
        !wmtCanvasBaseline.canvas.isConnected)
    ) {
      wmtCanvasBaseline = wmtFrame
      wmtCanvasBaselineKey = view.key
    }
    let liveTransform = null
    if (
      wmtFrame &&
      wmtCanvasBaseline &&
      wmtFrame.canvas === wmtCanvasBaseline.canvas
    ) {
      try {
        liveTransform = wmtFrame.matrix.multiply(
          wmtCanvasBaseline.matrix.inverse(),
        )
      } catch (_) {
        liveTransform = null
      }
    }
    // Se OpenLayers non trasla il canvas ma ne ridisegna i pixel,
    // utilizziamo il delta effettivo del puntatore durante il drag.
    // Non sommiamo due volte lo spostamento se è già nella matrice OL.
    let visualMatrix = liveTransform
    // Fallback SOLO per gli zoom che OpenLayers non codifica nella
    // matrice del canvas. Non sostituisce ne' modifica la logica del pan.
    if (isWmt() && (orderDrag || orderDragOffset.x || orderDragOffset.y)) {
      const mx = liveTransform?.e || 0,
        my = liveTransform?.f || 0
      const px = orderDragOffset.x,
        py = orderDragOffset.y
      if (Math.hypot(mx, my) < 3 && Math.hypot(px, py) > 0.5) {
        visualMatrix = new DOMMatrix()
          .translate(px, py)
          .multiply(liveTransform || new DOMMatrix())
      }
    }
    // Misura il cambiamento della vista e della matrice realmente osservati.
    // Non confondere il movimento del puntatore con la conclusione dello zoom.
    const motionSignature = [
      view.key,
      view.rect.width,
      view.rect.height,
      wmtFrame?.canvas ? String(wmtFrame.canvas) : "",
      wmtFrame?.matrix
        ? [
            wmtFrame.matrix.a,
            wmtFrame.matrix.b,
            wmtFrame.matrix.c,
            wmtFrame.matrix.d,
            wmtFrame.matrix.e,
            wmtFrame.matrix.f,
          ]
            .map(v => v.toFixed(5))
            .join(",")
        : "",
    ].join("|")
    const motionNow = performance.now()
    if (motionSignature !== orderLastMotionSignature) {
      orderLastMotionSignature = motionSignature
      if (wmtZoomGesture) wmtZoomGesture.lastMotion = motionNow
      startOrderAnimation(480)
    }
    if (wmtZoomGesture) {
      const stableFor =
        motionNow -
        Math.max(wmtZoomGesture.lastMotion, wmtZoomGesture.lastInput)
      // Moveend + assestamento: ripristina le frecce quando la vista è
      // stabile.
      // Fallback bounded per siti che non pubblicano l'URL dello zoom.
      if (
        (wmtZoomGesture.viewUpdated && stableFor >= WMT_ZOOM_STABLE_MS) ||
        (motionNow - wmtZoomGesture.started > WMT_ZOOM_MAX_MS &&
          stableFor >= WMT_ZOOM_STABLE_MS)
      ) {
        wmtZoomGesture = null
      }
    }
    if (!isWmt() && osmZoomGesture) {
      const quietFor =
        osmNow - Math.max(osmZoomGesture.lastChange, osmZoomGesture.lastInput)
      // In presenza di un cambio zoom, aspetta che la vista si assesti.
      // Un gesto che non ha prodotto zoom non deve nascondere le frecce
      // a lungo.
      if (
        (osmZoomGesture.viewUpdated && quietFor >= OSM_ZOOM_STABLE_MS) ||
        (osmNow - osmZoomGesture.started >= OSM_ZOOM_MAX_MS &&
          quietFor >= OSM_ZOOM_STABLE_MS)
      )
        osmZoomGesture = null
    }
    const arrowsHidden: any = Boolean(isWmt() ? wmtZoomGesture : osmZoomGesture)
    const transformText = visualMatrix
      ? `matrix(${[
          visualMatrix.a,
          visualMatrix.b,
          visualMatrix.c,
          visualMatrix.d,
          visualMatrix.e,
          visualMatrix.f,
        ].join(",")})`
      : "none"
    // Aggiornamento leggero a ogni frame: nessun DOM rebuild durante zoom.
    if (orderRenderSignature === baseSignature && overlay.firstElementChild) {
      const oldSvg = overlay.firstElementChild as SVGSVGElement
      oldSvg.style.transformOrigin = "0 0"
      oldSvg.style.transform = transformText
      const oldArrows = oldSvg.querySelector("#osm2cai-map-arrows")
      if (oldArrows)
        oldArrows.style.visibility = arrowsHidden ? "hidden" : "visible"
      const oldPins = oldSvg.querySelector("#osm2cai-map-problems")
      if (oldPins)
        oldPins.style.visibility = arrowsHidden ? "hidden" : "visible"
      return
    }
    orderRenderSignature = baseSignature
    const project = (point: any) => {
      let dx = point.lon - lon
      dx = ((dx + 540) % 360) - 180
      const originalX = rect.width / 2 + (dx / 360) * scale
      const originalY =
        rect.height / 2 - ((mercY(point.lat) - centerY) / (2 * Math.PI)) * scale
      return {
        x:
          originalX +
          (!wmtFrame && view.source !== "tiles" ? orderDragOffset.x : 0),
        y:
          originalY +
          (!wmtFrame && view.source !== "tiles" ? orderDragOffset.y : 0),
      }
    }
    const arrowLayer = document.createElementNS(ns, "g")
    arrowLayer.id = "osm2cai-map-arrows"
    arrowLayer.style.visibility = arrowsHidden ? "hidden" : "visible"
    svg.appendChild(arrowLayer)
    // OpenStreetMap non evidenzia di norma la geometria delle relazioni
    // figlie: disegniamo il percorso della super-relazione come anteprima
    // visiva non interattiva. Le singole way restano inalterate su OSM.
    // Il tracciato resta visibile anche quando lo zoom nasconde le frecce.
    if (!isWmt() && orderNestedGeometryVisible && orderMapArrows.length) {
      const pieces = []
      const margin = 48
      let previous = null
      for (const segment of orderMapArrows) {
        const a = project(segment.a),
          b = project(segment.b)
        if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) continue
        // Scarta solo i segmenti interamente fuori dalla stessa parte
        // del viewport, senza perdere quelli che lo attraversano.
        if (
          (a.x < -margin && b.x < -margin) ||
          (a.x > rect.width + margin && b.x > rect.width + margin) ||
          (a.y < -margin && b.y < -margin) ||
          (a.y > rect.height + margin && b.y > rect.height + margin)
        ) {
          previous = null
          continue
        }
        if (!previous || Math.hypot(a.x - previous.x, a.y - previous.y) > 0.2)
          pieces.push(`M${a.x.toFixed(1)},${a.y.toFixed(1)}`)
        pieces.push(`L${b.x.toFixed(1)},${b.y.toFixed(1)}`)
        previous = b
      }
      if (pieces.length) {
        const geometryLayer = document.createElementNS(ns, "g")
        geometryLayer.id = "osm2cai-nested-geometry"
        geometryLayer.setAttribute(
          "aria-label",
          "Geometria delle sottorelazioni OSM",
        )
        for (const [color, width, opacity] of [
          ["#ffffff", "7", "0.85"],
          ["#c026d3", "4", "0.92"],
        ]) {
          const path = document.createElementNS(ns, "path")
          path.setAttribute("d", pieces.join(" "))
          path.setAttribute("fill", "none")
          path.setAttribute("stroke", color)
          path.setAttribute("stroke-width", width)
          path.setAttribute("stroke-linecap", "round")
          path.setAttribute("stroke-linejoin", "round")
          path.setAttribute("stroke-opacity", opacity)
          geometryLayer.appendChild(path)
        }
        svg.insertBefore(geometryLayer, arrowLayer)
      }
    }
    if (orderMapArrowsVisible) {
      // Frecce distribuite per distanza sul tracciato proiettato, non per way.
      // Distanza adattiva in pixel, costante anche cambiando zoom.
      const spacing = 100,
        edgePadding = 35,
        minSeparation = 48
      let walked = 0,
        next = spacing / 2
      const placed: { x: number; y: number }[] = []
      for (const segment of orderMapArrows) {
        const a = project(segment.a),
          b = project(segment.b)
        const length = Math.hypot(b.x - a.x, b.y - a.y)
        if (!Number.isFinite(length) || length < 0.01) continue
        // Salta direttamente i campioni fuori da questo segmento.
        while (next <= walked + length) {
          const t = (next - walked) / length
          const x = a.x + (b.x - a.x) * t,
            y = a.y + (b.y - a.y) * t
          next += spacing
          if (
            x < edgePadding ||
            x > rect.width - edgePadding ||
            y < edgePadding ||
            y > rect.height - edgePadding
          )
            continue
          // Evita marcatori sovrapposti dove il sentiero fa tornanti.
          if (placed.some(p => Math.hypot(p.x - x, p.y - y) < minSeparation))
            continue
          placed.push({ x, y })
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
          const group = document.createElementNS(ns, "g")
          group.setAttribute(
            "transform",
            `translate(${x} ${y}) rotate(${angle})`,
          )
          group.setAttribute(
            "aria-label",
            "Verso di percorrenza: way " + segment.id,
          )
          group.style.pointerEvents = "none"
          for (const [color, width] of [
            ["#ffffff", "8"],
            ["#1675e8", "5"],
          ]) {
            const mark = document.createElementNS(ns, "path")
            mark.setAttribute("d", "M -7 -8 L 3 0 L -7 8")
            mark.setAttribute("fill", "none")
            mark.setAttribute("stroke", color)
            mark.setAttribute("stroke-width", width)
            mark.setAttribute("stroke-linecap", "round")
            mark.setAttribute("stroke-linejoin", "round")
            group.appendChild(mark)
          }
          arrowLayer.appendChild(group)
        }
        walked += length
      }
    }
    const problemLayer = document.createElementNS(ns, "g")
    problemLayer.id = "osm2cai-map-problems"
    problemLayer.style.visibility = arrowsHidden ? "hidden" : "visible"
    svg.appendChild(problemLayer)
    for (const issue of orderMapIssues) {
      const { x, y } = project(issue)
      if (x < -30 || x > rect.width + 30 || y < -30 || y > rect.height + 30)
        continue
      const group = document.createElementNS(ns, "a")
      const link =
        "https://www.openstreetmap.org/edit?editor=id#map=18/" +
        issue.lat.toFixed(6) +
        "/" +
        issue.lon.toFixed(6)
      group.setAttribute("href", link)
      group.setAttribute("target", "_blank")
      group.setAttribute("rel", "noopener noreferrer")
      group.setAttribute(
        "aria-label",
        "Modifica in iD: " + issue.detail + ", nodo " + issue.nodeId,
      )
      group.style.pointerEvents = "auto"
      group.style.cursor = "pointer"
      const circle = document.createElementNS(ns, "circle")
      circle.setAttribute("cx", String(x))
      circle.setAttribute("cy", String(y))
      circle.setAttribute("r", issue.type === "branch" ? "13" : "12")
      circle.setAttribute(
        "fill",
        issue.type === "branch" ? "#e9a419" : "#e63434",
      )
      circle.setAttribute("stroke", "white")
      circle.setAttribute("stroke-width", "3")
      circle.setAttribute("opacity", ".95")
      const label = document.createElementNS(ns, "text")
      label.setAttribute("x", String(x))
      label.setAttribute("y", String(y + 4.2))
      label.setAttribute("text-anchor", "middle")
      label.setAttribute("font-size", "11")
      label.setAttribute("font-family", "system-ui,sans-serif")
      label.setAttribute("font-weight", "700")
      label.setAttribute("fill", "#fff")
      label.style.pointerEvents = "none"
      label.textContent = issue.label
      group.append(circle, label)
      problemLayer.appendChild(group)
    }
    svg.style.transformOrigin = "0 0"
    svg.style.transform = transformText
    overlay.replaceChildren(svg)
  }

  // Inquadra la geometria della relazione quando si apre un'analisi con
  // problemi. Nessuna modifica ai layer o ai dati OSM. La mappa viene
  // centrata una sola volta per apertura, non a ogni ridisegno degli SVG.
  function focusOrderGeometry(full: any, relationId: any) {
    if (!full || String(relationId) !== String(relationIdFromUrl()))
      return false
    if (isWmt()) {
      // WMT legge `map=` dal fragment solo quando crea la mappa, non
      // quando cambia l'hash della stessa relazione. Perciò aggiornare
      // location.hash non sposta la vista OpenLayers già inizializzata.
      // Usa il pulsante nativo "Zoom to" nel footer dei dettagli WMT:
      // chiama map_state.set_map_view(bbox), quindi inquadra la route
      // con il motore della mappa e mantiene i pin georeferenziati.
      let attempts = 0
      const focusNative = () => {
        const orderPopover = document.getElementById("osm2cai-order-popover")
        if (
          String(relationId) !== String(relationIdFromUrl()) ||
          !orderPopover ||
          orderPopover.hidden
        )
          return
        const panel = [...document.querySelectorAll(".sidepanel")].find(el => {
          const rect = el.getBoundingClientRect()
          return (
            rect.width > 150 &&
            rect.height > 150 &&
            el.querySelector(".sidepanel-footer button") &&
            // Il pulsante compare prima della risposta API WMT:
            // attendi che i dettagli della relazione siano caricati.
            el.querySelector(".sidepanel-content .properties")
          )
        })
        const button = panel?.querySelector(".sidepanel-footer button")
        if (button && !button.disabled) {
          button.click()
          startOrderAnimation(1000)
        } else if (++attempts < 20) {
          setTimeout(focusNative, 150)
        }
      }
      focusNative()
      return true
    }
    const view = orderView()
    if (!view || !view.rect.width || !view.rect.height) return false
    const wayById = new Map<any, any>(
      (full.elements || [])
        .filter((e: any) => e.type === "way")
        .map((e: any) => [String(e.id), e]),
    )
    const nodeById = new Map<any, any>(
      (full.elements || [])
        .filter((e: any) => e.type === "node")
        .map((e: any) => [String(e.id), e]),
    )
    const geometry = relationGeometryMembers(full, relationId)
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity,
      count = 0
    const seenWays = new Set<any>()
    for (const member of geometry.members) {
      const id = String(member.ref)
      if (seenWays.has(id)) continue
      seenWays.add(id)
      const way = wayById.get(id)
      for (const nodeId of way?.nodes || []) {
        const n = nodeById.get(String(nodeId))
        if (!Number.isFinite(n?.lat) || !Number.isFinite(n?.lon)) continue
        minLat = Math.min(minLat, n.lat)
        maxLat = Math.max(maxLat, n.lat)
        minLon = Math.min(minLon, n.lon)
        maxLon = Math.max(maxLon, n.lon)
        count++
      }
    }
    if (!count || maxLon - minLon > 180) return false
    const lat = (minLat + maxLat) / 2,
      lon = (minLon + maxLon) / 2
    const mercY = (value: any) =>
      Math.log(
        Math.tan(
          Math.PI / 4 + (Math.max(-85, Math.min(85, value)) * Math.PI) / 360,
        ),
      )
    const dy = Math.abs(mercY(maxLat) - mercY(minLat)) / (2 * Math.PI)
    const dx = Math.max(0, (maxLon - minLon) / 360)
    const padding = 70
    const usableWidth = Math.max(140, view.rect.width - 2 * padding)
    const usableHeight = Math.max(120, view.rect.height - 2 * padding)
    const zoom = Math.max(
      3,
      Math.min(
        18,
        Math.floor(
          Math.min(
            Math.log2(usableWidth / (256 * Math.max(dx, 1e-10))),
            Math.log2(usableHeight / (256 * Math.max(dy, 1e-10))),
          ),
        ),
      ),
    )
    if (![lat, lon, zoom].every(Number.isFinite)) return false
    // Non spostare la mappa quando la geometria è già interamente visibile
    // con un margine ragionevole; evita cambi di zoom inutili.
    const currentScale = 256 * 2 ** view.zoom
    const mercCenter = mercY(view.lat)
    const projected = [
      [minLat, minLon],
      [minLat, maxLon],
      [maxLat, minLon],
      [maxLat, maxLon],
    ].map(([a, b]) => ({
      x: view.rect.width / 2 + ((b - view.lon) / 360) * currentScale,
      y:
        view.rect.height / 2 -
        ((mercY(a) - mercCenter) / (2 * Math.PI)) * currentScale,
    }))
    const inside = projected.every(
      p =>
        p.x >= padding &&
        p.x <= view.rect.width - padding &&
        p.y >= padding &&
        p.y <= view.rect.height - padding,
    )
    const centerShift = Math.hypot(
      ((lon - view.lon) / 360) * currentScale,
      ((mercY(lat) - mercCenter) / (2 * Math.PI)) * currentScale,
    )
    if (
      inside &&
      centerShift < Math.min(view.rect.width, view.rect.height) * 0.12
    )
      return false
    // Se l'intera geometria è già visibile, centra senza forzare un nuovo
    // zoom: evita una variazione di scala non richiesta.
    const fitZoom = inside
      ? Math.max(3, Math.min(18, Math.round(view.zoom)))
      : zoom
    const mapHash = `${fitZoom}/${lat.toFixed(5)}/${lon.toFixed(5)}`
    // OSM riconosce #map e aggiorna Leaflet senza ricaricare la pagina.
    // Su WMT la vista viene invece inquadrata dal comando nativo sopra.
    const other = location.hash
      .replace(/^#/, "")
      .split("&")
      .slice(1)
      .filter(p => !p.startsWith("map="))
    location.hash =
      "map=" + mapHash + (other.length ? "&" + other.join("&") : "")
    startOrderAnimation(1000)
    return true
  }

  function showOrderMap(issues: any) {
    clearOrderMap()
    orderMapIssues = issues
    orderMapVisible = true
    orderLastView = null
    orderDragOffset = { x: 0, y: 0 }
    orderRenderSignature = null
    renderOrderMapOverlay()
    startOrderAnimation()
  }

  // Frecce distribuite lungo i segmenti della geometria, orientate secondo
  // la sequenza selezionata. Non cambiano i layer OSM/WMT né il grafo OSM.

  function showOrderArrows(full: any, sequence: any) {
    // Mantiene anche le segnalazioni eventualmente già visualizzate.
    orderMapArrows = orderArrowsForSequence(full, sequence)
    // Le super-relazioni su OSM non hanno evidenziazione geometrica
    // nativa: traccia solo in questo caso le way già analizzate.
    orderNestedGeometryVisible =
      !isWmt() && relationGeometryMembers(full, orderRelationId).nested > 0
    orderRenderSignature = null
    orderMapArrowsVisible = orderMapArrows.length > 0
    orderRenderSignature = null
    renderOrderMapOverlay()
    startOrderAnimation()
  }

  // Raccoglie le way anche nelle sottorelazioni, preservando le occorrenze.
  // Questa vista serve SOLO all'analisi: non autorizza alcun riordino in iD.

  function renderOrderMapControls(output: any, issues: any) {
    if (!issues.length) return
    const controls = document.createElement("div")
    controls.style.cssText = "margin:10px 0;"
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = orderMapVisible
      ? "Nascondi indicatori dalla mappa"
      : "Mostra problemi sulla mappa (" + issues.length + ")"
    button.style.cssText =
      "padding:7px 10px;border-radius:5px;" +
      "border:1px solid #d25b3b;background:#b82d2d;" +
      "color:#fff;cursor:pointer;"
    button.addEventListener("click", () => {
      if (orderMapVisible) {
        orderMapVisible = false
        orderMapIssues = []
        orderRenderSignature = null
        renderOrderMapOverlay()
        button.textContent =
          "Mostra problemi sulla mappa (" + issues.length + ")"
      } else {
        orderMapIssues = issues
        orderMapVisible = true
        orderRenderSignature = null
        renderOrderMapOverlay()
        startOrderAnimation()
        button.textContent = "Nascondi indicatori dalla mappa"
      }
    })
    controls.appendChild(button)
    const list = document.createElement("div")
    list.style.cssText = "max-height:150px;overflow:auto;margin-top:8px;"
    for (const issue of issues.slice(0, 80)) {
      const link = document.createElement("a")
      link.href =
        "https://www.openstreetmap.org/edit?editor=id#map=18/" +
        issue.lat +
        "/" +
        issue.lon
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.textContent =
        issue.detail + " · node " + issue.nodeId + " · modifica in iD"
      link.style.cssText = "display:block;padding:3px 0;color:#4697f5;"
      list.appendChild(link)
    }
    controls.appendChild(list)
    output.appendChild(controls)
  }

  // Analisi topologica per occorrenza di way. Un tratto ripetuto non è
  // necessariamente un errore OSM (es. andata/ritorno), ma rende ambiguo
  // un riordino automatico basato soltanto sulle estremità.

  function openOrderInID(job: any, feedback: any, success: any) {
    if (!validateMemberReorder(job.before, job.after)) {
      feedback.textContent =
        "Riordino non valido: dati della relazione incoerenti."
      return
    }
    if (
      !/^[1-9]\d*$/.test(String(job.relationId)) ||
      !Number.isSafeInteger(Number(job.relationId)) ||
      !Number.isSafeInteger(job.version) ||
      job.version < 1
    ) {
      feedback.textContent =
        "Identificativo o versione della relazione non validi."
      return
    }
    const hash =
      "id=relation/" +
      encodeURIComponent(job.relationId) +
      "&osm2cai_members=" +
      encodeURIComponent(JSON.stringify(job))
    if (hash.length > 120000) {
      feedback.textContent =
        "Relazione troppo grande per trasferire l’ordine via URL " +
        "in modo affidabile."
      return
    }
    const opened = window.open(
      "https://www.openstreetmap.org/id#" + hash,
      "_blank",
      "noopener,noreferrer",
    )
    // Con noopener alcuni browser restituiscono null anche se la scheda
    // è aperta.
    feedback.textContent =
      opened === null
        ? "Apertura di iD richiesta. Se la scheda non compare, consenti " +
          "i popup e riprova."
        : success
  }

  // Indicatore della verifica membri: verde quando l'ordine è continuo e
  // la geometria non presenta anomalie, rosso se rileva un problema.
  // Grigio finché il full.json non è disponibile o non è verificabile.
  function setMemberOrderIndicator(kind: any) {
    const dot = $("order-dot")
    if (!dot) return
    const colors: Record<string, string> = {
      ok: "#22bd3c",
      error: "#ed3043",
      gray: "#9ca3af",
    }
    dot.style.setProperty(
      "background-color",
      colors[kind] || colors.gray,
      "important",
    )
    const button = $("order-button")
    if (button) {
      button.title =
        kind === "ok"
          ? "Ordine membri: nessun problema rilevato"
          : kind === "error"
            ? "Ordine membri: problemi rilevati; apri per i dettagli"
            : "Ordine membri: verifica non ancora disponibile"
    }
  }

  function updateMemberOrderIndicator(full: any, relationId: any) {
    if (!full) {
      setMemberOrderIndicator("gray")
      return
    }
    const result = checkMemberOrder(full, relationId)
    if ("error" in result) {
      setMemberOrderIndicator(result.incomplete ? "gray" : "error")
      return
    }
    if (result.nestedRelations) {
      const valid =
        result.continuous &&
        !result.repeated &&
        !result.branches &&
        result.connected
      setMemberOrderIndicator(valid ? "ok" : "error")
      return
    }
    const hasProblems =
      result.breaks > 0 ||
      result.repeated > 0 ||
      result.branches > 0 ||
      !result.connected ||
      !result.proposal
    setMemberOrderIndicator(hasProblems ? "error" : "ok")
  }

  function renderOrderCheck() {
    const output = $("order-results")
    if (!output) return
    output.replaceChildren()
    if (!orderFull || orderRelationId !== relationIdFromUrl()) {
      output.textContent =
        "Dati OSM non ancora disponibili: apri la barra e attendi " +
        "la risposta dell’API OSM."
      return
    }
    clearOrderMap()
    const result: any = checkMemberOrder(orderFull, orderRelationId)
    const line = (value: any, bold = false) => {
      const node = document.createElement("div")
      node.textContent = value
      node.style.cssText =
        "margin:5px 0;overflow-wrap:anywhere;" +
        (bold ? "font-weight:700;" : "")
      output.appendChild(node)
    }
    if ("error" in result) {
      line(result.error, true)
      return
    }
    const typeLabels: Record<string, string> = {
      linear: "Percorso lineare",
      ring: "Percorso ad anello",
      branching: "Percorso con diramazioni",
      disconnected: "Componenti scollegate",
      complex: "Topologia complessa",
    }
    line(
      "Topologia: " + (typeLabels[result.topology] || "Non determinata") + ".",
      true,
    )
    line(
      "Way: " +
        result.total +
        " · continuità sequenza attuale: " +
        (result.continuous ? "sì" : "no") +
        " · interruzioni rilevate: " +
        result.breaks +
        ".",
      true,
    )
    if (result.nonWays)
      line(
        "Altri membri (node/relation): " +
          result.nonWays +
          "; esclusi dalla proposta.",
      )
    if (result.repeated) line("Way ripetute: " + result.repeated)
    if (result.branches) line("Biforcazioni: " + result.branches)
    if (result.roleSensitive)
      line(
        "Sono presenti ruoli delle way: riordino automatico sospeso " +
          "per non alterarne la semantica.",
      )
    if (result.nestedRelations)
      line(
        "Sottorelazioni: " +
          result.nestedRelations +
          ". Way incluse nell’analisi geometrica; riordino automatico " +
          "disabilitato.",
      )
    if (!result.connected) line("Sono presenti componenti scollegate.")
    const issues: any = orderProblemPoints(orderFull, orderRelationId)
    if (issues.length) {
      focusOrderGeometry(orderFull, orderRelationId)
      showOrderMap(issues)
    }
    renderOrderMapControls(output, issues)
    if (!result.proposal) {
      if (
        result.nestedRelations &&
        result.continuous &&
        !result.branches &&
        result.connected
      ) {
        showOrderArrows(
          orderFull,
          relationGeometryMembers(orderFull, orderRelationId).members.map(
            (m: any) => ({ id: String(m.ref) }),
          ),
        )
      }
      line(
        "Ordinamento automatico non proposto: struttura annidata/complessa, " +
          "ruoli particolari o geometria ambigua. Verifica manualmente.",
      )
      return
    }
    if (result.continuous && result.proposal) {
      line(
        result.ring
          ? "Le way formano un anello continuo."
          : "Le way sono già in un ordine continuo.",
      )
      // Anche con ordine corretto il verso deve essere leggibile sulla mappa.
      // Seguiamo la sequenza effettiva, non una proposta alternativa.
      const currentSequence = [...result.proposal].sort(
        (a, b) => a.index - b.index,
      )
      showOrderArrows(orderFull, currentSequence)
      const actions = document.createElement("div")
      actions.style.cssText =
        "margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;"
      const force = document.createElement("button")
      force.type = "button"
      force.textContent = "Forza ordinamento inverso in iD"
      force.style.cssText =
        "padding:7px 12px;border-radius:6px;" +
        "border:1px solid #16764c;background:#168358;" +
        "color:white;cursor:pointer;"
      const feedback = document.createElement("div")
      feedback.style.cssText = "margin:7px 0;overflow-wrap:anywhere;"
      force.addEventListener("click", () => {
        // Ricontrolla che relazione e ordine non siano cambiati.
        if (orderRelationId !== relationIdFromUrl() || !orderFull) {
          feedback.textContent = "La relazione è cambiata: ripeti la verifica."
          return
        }
        const current: any = checkMemberOrder(orderFull, orderRelationId)
        if (
          current.error ||
          !current.proposal ||
          current.breaks !== 0 ||
          current.repeated ||
          current.branches ||
          !current.connected ||
          current.roleSensitive ||
          current.nestedRelations ||
          [...current.proposal]
            .sort((a, b) => a.index - b.index)
            .map(e => e.id)
            .join(",") !== currentSequence.map(e => e.id).join(",")
        ) {
          feedback.textContent =
            "L’ordine attuale non è più quello verificato: " +
            "ripeti il controllo."
          return
        }
        const rel: any = orderFull.elements.find(
          (e: any) =>
            e.type === "relation" && String(e.id) === String(orderRelationId),
        )
        if (!rel || !Number.isSafeInteger(rel.version)) {
          feedback.textContent =
            "Impossibile verificare la versione della relazione."
          return
        }
        const normalize = (m: any) => ({
          type: m.type,
          ref: String(m.ref),
          role: m.role || "",
        })
        const ways = rel.members.filter((m: any) => m.type === "way")
        if (ways.length < 2) {
          feedback.textContent =
            "Occorrono almeno due way per invertire l’ordine."
          return
        }
        const reversed = [...ways].reverse()
        let index = 0
        // I membri node/relation restano al loro posto; way e ruoli
        // viaggiano insieme.
        const after = rel.members.map((m: any) =>
          normalize(m.type === "way" ? reversed[index++] : m),
        )
        const before = rel.members.map(normalize)
        if (JSON.stringify(before) === JSON.stringify(after)) {
          feedback.textContent = "L’inversione non modifica la sequenza."
          return
        }
        if (
          !window.confirm(
            "Invertire l’ordine delle " +
              ways.length +
              " way della relazione " +
              orderRelationId +
              " in iD? Sarà richiesta conferma anche in iD. " +
              "Non verrà salvata automaticamente alcuna modifica su OSM.",
          )
        )
          return
        const job: any = {
          relationId: String(orderRelationId),
          version: rel.version,
          before,
          after,
        }
        openOrderInID(
          job,
          feedback,
          "iD aperto: conferma lì l’inversione, poi controlla " +
            "e salva manualmente.",
        )
      })
      actions.appendChild(force)
      output.append(actions, feedback)
      return
    }
    // Direzione in salita soltanto se entrambi gli estremi hanno tag ele
    // attendibili.
    const elevation = orderElevationHint(orderFull, result.proposal)
    let selectedDirection: "proposed" | "inverse" =
      elevation && elevation.start > elevation.end ? "inverse" : "proposed"
    const alternatives: Record<"proposed" | "inverse", any[]> = {
      proposed: result.proposal,
      inverse: [...result.proposal].reverse(),
    }
    const chosen = () => alternatives[selectedDirection]
    const changedCount = (seq: any) =>
      seq.filter((e: any, i: any) => e.index !== i).length
    const choices = document.createElement("div")
    choices.style.cssText =
      "display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 8px;"
    const preview = document.createElement("div")
    const summary = document.createElement("div")
    summary.style.cssText = "margin:5px 0 8px;font-weight:700;"
    const list = document.createElement("div")
    list.style.cssText =
      "max-height:220px;overflow:auto;border:1px solid #8d9aa966;" +
      "border-radius:6px;padding:5px 9px;margin-top:8px;"
    const firstLast = (seq: any) =>
      "Prima: way " + seq[0].id + " · Ultima: way " + seq[seq.length - 1].id
    const labelMap: Record<"proposed" | "inverse", string> = {
      proposed: "Ordine proposto",
      inverse: "Ordine inverso",
    }
    const radios: any = []
    for (const key of ["proposed", "inverse"] as const) {
      const label = document.createElement("label")
      label.style.cssText =
        "display:inline-flex;align-items:center;gap:6px;padding:7px 10px;" +
        "border:1px solid #8d9aa966;border-radius:6px;cursor:pointer;"
      const radio = document.createElement("input")
      radio.type = "radio"
      radio.name = "osm2cai-direction-" + orderRelationId
      radio.value = key
      radio.checked = key === selectedDirection
      const caption = document.createElement("span")
      caption.textContent = labelMap[key]
      label.append(radio, caption)
      choices.appendChild(label)
      radios.push({ key, label, radio })
      radio.addEventListener("change", () => {
        if (!radio.checked) return
        selectedDirection = key
        drawPreview()
      })
    }
    function drawPreview() {
      const seq = chosen()
      showOrderArrows(orderFull, seq)
      summary.textContent =
        "Anteprima: " +
        changedCount(seq) +
        " posizioni diverse rispetto alla sequenza attuale."
      list.replaceChildren()
      for (const [i, e] of seq.entries()) {
        const row = document.createElement("div")
        row.style.cssText = "padding:3px 0;"
        const label = document.createTextNode(i + 1 + ". ")
        const link = document.createElement("a")
        link.href =
          "https://www.openstreetmap.org/way/" + encodeURIComponent(e.id)
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        link.textContent = "way " + e.id
        link.style.cssText = "color:#4697f5;text-decoration:underline;"
        row.append(
          label,
          link,
          document.createTextNode(
            e.index !== i ? " (prima posizione " + (e.index + 1) + ")" : "",
          ),
        )
        list.appendChild(row)
      }
      for (const { key, label } of radios) {
        label.style.borderColor =
          key === selectedDirection ? "#3478ed" : "#8d9aa966"
        label.style.fontWeight = key === selectedDirection ? "700" : "400"
      }
    }
    if (elevation && elevation.start !== elevation.end) {
      const note = document.createElement("div")
      note.textContent =
        "Preselezionato il verso da quota minore a quota maggiore usando " +
        "i tag ele degli estremi OSM. Non rappresenta un profilo " +
        "altimetrico: puoi invertire il verso."
      note.style.cssText = "margin:8px 0;color:inherit;"
      preview.appendChild(note)
    }
    preview.append(choices, summary, list)
    output.appendChild(preview)
    drawPreview()
    const actions = document.createElement("div")
    actions.style.cssText =
      "margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;"
    const prepare = document.createElement("button")
    prepare.type = "button"
    prepare.textContent = "Ordina membri in iD"
    prepare.style.cssText =
      "padding:7px 12px;border-radius:6px;" +
      "border:1px solid #16764c;background:#168358;" +
      "color:white;cursor:pointer;"
    const feedback = document.createElement("div")
    feedback.style.cssText = "margin:7px 0;overflow-wrap:anywhere;"
    prepare.addEventListener("click", () => {
      if (orderRelationId !== relationIdFromUrl() || !orderFull) {
        feedback.textContent = "La relazione è cambiata: ripeti la verifica."
        return
      }
      const current: any = checkMemberOrder(orderFull, orderRelationId)
      if (
        !current.proposal ||
        current.proposal.map((e: any) => e.id).join(",") !==
          result.proposal.map((e: any) => e.id).join(",")
      ) {
        feedback.textContent =
          "La proposta non è più valida: ripeti la verifica."
        return
      }
      const rel: any = orderFull.elements.find(
        (e: any) =>
          e.type === "relation" && String(e.id) === String(orderRelationId),
      )
      if (!rel || !Number.isSafeInteger(rel.version)) {
        feedback.textContent =
          "Impossibile verificare la versione della relazione."
        return
      }
      const norm = (m: any) => ({
        type: m.type,
        ref: String(m.ref),
        role: m.role || "",
      })
      const originalWays = rel.members.filter((m: any) => m.type === "way")
      const targetSequence =
        selectedDirection === "inverse"
          ? [...current.proposal].reverse()
          : current.proposal
      if (!changedCount(targetSequence)) {
        feedback.textContent = "La sequenza scelta coincide con quella attuale."
        return
      }
      const orderedWays = targetSequence.map((e: any) => originalWays[e.index])
      let index = 0
      const after = rel.members.map((m: any) =>
        norm(m.type === "way" ? orderedWays[index++] : m),
      )
      const job: any = {
        relationId: String(orderRelationId),
        version: rel.version,
        before: rel.members.map(norm),
        after,
      }
      if (
        !window.confirm(
          "Aprire iD con " +
            labelMap[selectedDirection].toLowerCase() +
            " (" +
            firstLast(targetSequence) +
            ") per la relazione " +
            orderRelationId +
            "? In iD sarà richiesta un’ulteriore conferma. " +
            "Non verrà eseguito alcun salvataggio OSM.",
        )
      )
        return
      // Apriamo direttamente l'editor iD, perché /edit inoltra a /id
      // soltanto un insieme limitato di parametri e scarterebbe il job.
      openOrderInID(
        job,
        feedback,
        "iD aperto in una nuova scheda: conferma lì il riordino.",
      )
    })
    actions.append(prepare)
    output.append(actions, feedback)
    line(
      "Il riordino viene applicato soltanto nella sessione di iD dopo " +
        "conferma; verifica e salva manualmente su OpenStreetMap.",
    )
  }

  function setIssuesDetails(properties: any) {
    const description = $("issues-description")
    const updated = $("issues-updated")
    if (description)
      description.textContent =
        typeof properties?.issues_description === "string" &&
        properties.issues_description.trim()
          ? properties.issues_description
          : "—"
    if (updated) {
      const raw = properties?.issues_last_update
      const parsed =
        typeof raw === "string" && raw.trim() ? new Date(raw) : null
      updated.textContent =
        parsed && Number.isFinite(parsed.getTime())
          ? new Intl.DateTimeFormat("it-IT", {
              timeZone: "Europe/Rome",
              dateStyle: "short",
              timeStyle: "short",
            }).format(parsed)
          : typeof raw === "string" && raw.trim()
            ? raw
            : "—"
      if (typeof raw === "string") updated.title = raw
    }
  }

  let issuesHoverTimer: any = null
  function closeIssuesPopover() {
    clearTimeout(issuesHoverTimer)
    issuesHoverTimer = null
    const panel = $("issues-popover")
    if (panel) {
      panel.hidden = true
      panel.style.setProperty("display", "none", "important")
    }
    $("issues-trigger")?.setAttribute("aria-expanded", "false")
  }

  function newPanel(relationId: any) {
    removePanel()
    insertStyle()
    const bar = document.createElement("div")
    bar.id = "osm2cai-bar"
    // Impedisce che Turbo memorizzi il pannello nelle istantanee OSM.
    bar.setAttribute("data-turbo-temporary", "")
    bar.innerHTML = createPanelMarkup(
      SCRIPT_VERSION,
      site.alternateLink(relationId, PANEL_LINK_ICON),
    )
    // Fondament: direttamente su body, non dentro #map o sidebar
    // (che OSM può rimpiazzare).
    document.body.appendChild(bar)
    // Firefox: il solo stopPropagation non era sufficiente per aprire
    // questi due collegamenti sulla pagina OSM/WMT. Per il normale clic
    // sinistro usiamo il gestore userscript, che apre una vera scheda.
    // Ctrl/Cmd/Shift/Alt+clic, clic centrale e menu contestuale conservano
    // il comportamento nativo dei link; nessun intervento su Analisi relazione.
    const isFirefoxBrowser = /Firefox\//.test(navigator.userAgent)
    bar.querySelectorAll(".oc-actions a.oc-action").forEach(link => {
      link.style.setProperty("pointer-events", "auto", "important")
      link.addEventListener("click", (event: MouseEvent) => {
        if (
          link.getAttribute("aria-disabled") === "true" ||
          !link.getAttribute("href")
        ) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        if (
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          !isFirefoxBrowser
        )
          return
        // L'URL puo' essere aggiornato da WMT in fase di cattura
        // del click: leggerlo adesso, senza salvarne una copia vecchia.
        const url = new URL(link.href, location.href)
        if (
          url.protocol !== "https:" ||
          ![
            "osm2cai.cai.it",
            "www.openstreetmap.org",
            "hiking.waymarkedtrails.org",
          ].includes(url.hostname)
        )
          return
        if (typeof GM_openInTab !== "function") return
        try {
          GM_openInTab(url.href, { active: true, insert: true })
          event.preventDefault()
          event.stopPropagation()
        } catch (error) {
          // Il browser mantiene la navigazione HTML se l'API fallisce.
          console.warn("[OSM2CAI Tools] Apertura gestita non riuscita:", error)
        }
      })
    })
    $("close")?.addEventListener("click", () => setCollapsed(true))
    $("open")?.addEventListener("click", () => setCollapsed(false))
    const syncMetric = $("sync")?.closest(".oc-metric")
    const modifiedPopup = $("modified-popup")
    syncMetric?.addEventListener("mouseenter", () => {
      clearTimeout(modifiedHoverTimer)
      renderModifiedPopup()
    })
    syncMetric?.addEventListener("mouseleave", scheduleHideModifiedPopup)
    modifiedPopup?.addEventListener("mouseenter", () =>
      clearTimeout(modifiedHoverTimer),
    )
    modifiedPopup?.addEventListener("mouseleave", scheduleHideModifiedPopup)
    const orderButton = $("order-button")
    const orderPopover = $("order-popover")
    const orderClose = $("order-close")
    orderButton?.addEventListener("click", () => {
      if (!orderPopover) {
        return
      }
      const opening = orderPopover.hidden
      orderPopover.hidden = !opening
      orderButton.setAttribute("aria-expanded", String(opening))
      if (opening) {
        closeIssuesPopover()
        popover.hidden = true
        button?.setAttribute("aria-expanded", "false")
        renderOrderCheck()
      }
      applyInlineLayout()
    })
    orderClose?.addEventListener("click", () => {
      if (!orderPopover) {
        return
      }
      orderPopover.hidden = true
      orderButton?.setAttribute("aria-expanded", "false")
      applyInlineLayout()
    })
    const button = $("info-button")
    const popover = $("popover")
    $("popup-close")?.addEventListener("click", () => {
      popover.hidden = true
      button?.setAttribute("aria-expanded", "false")
      applyInlineLayout()
    })
    button?.addEventListener("click", () => {
      popover.hidden = !popover.hidden
      button.setAttribute("aria-expanded", String(!popover.hidden))
      if (!popover.hidden) closeIssuesPopover()
      if (!popover.hidden && orderPopover) {
        orderPopover.hidden = true
        orderButton?.setAttribute("aria-expanded", "false")
      }
      applyInlineLayout()
    })
    const issuesTrigger = $("issues-trigger")
    const issuesPanel = $("issues-popover")
    const showIssues: any = () => {
      clearTimeout(issuesHoverTimer)
      issuesHoverTimer = null
      if (!issuesPanel || !issuesTrigger) return
      issuesPanel.hidden = false
      issuesPanel.style.setProperty("display", "block", "important")
      issuesTrigger.setAttribute("aria-expanded", "true")
      popover.hidden = true
      button?.setAttribute("aria-expanded", "false")
      if (orderPopover) orderPopover.hidden = true
      orderButton?.setAttribute("aria-expanded", "false")
      // Allinea il popup alla metrica, anche con barra spostata.
      const barRect = bar.getBoundingClientRect()
      const metricRect = issuesTrigger.getBoundingClientRect()
      const width = Math.max(200, Math.min(500, window.innerWidth - 24))
      const left = Math.max(
        8 - barRect.left,
        Math.min(
          metricRect.left - barRect.left,
          window.innerWidth - width - 12 - barRect.left,
        ),
      )
      issuesPanel.style.setProperty("width", width + "px", "important")
      issuesPanel.style.setProperty("left", left + "px", "important")
      issuesPanel.style.setProperty("top", "100%", "important")
      issuesPanel.style.setProperty("margin-top", "5px", "important")
    }
    const scheduleHideIssues: any = () => {
      clearTimeout(issuesHoverTimer)
      issuesHoverTimer = setTimeout(closeIssuesPopover, 180)
    }
    issuesTrigger?.addEventListener("mouseenter", showIssues)
    issuesTrigger?.addEventListener("mouseleave", scheduleHideIssues)
    issuesPanel?.addEventListener("mouseenter", () => {
      clearTimeout(issuesHoverTimer)
      issuesHoverTimer = null
    })
    issuesPanel?.addEventListener("mouseleave", scheduleHideIssues)
    // Accessibile anche da tastiera: focus apre, Escape chiude.
    issuesTrigger?.addEventListener("focus", showIssues)
    issuesTrigger?.addEventListener("blur", scheduleHideIssues)
    issuesTrigger?.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        showIssues()
      }
    })
    $("issues-close")?.addEventListener("click", closeIssuesPopover)
    // Chiude il popup cliccando all'esterno, senza bloccare gli eventi di OSM.
    document.addEventListener("pointerdown", function onOutsidePopup(event) {
      if (!bar.isConnected) {
        document.removeEventListener("pointerdown", onOutsidePopup)
        return
      }
      if (
        popover.hidden &&
        (!orderPopover || orderPopover.hidden) &&
        (!issuesPanel || issuesPanel.hidden)
      ) {
        return
      }
      const target = event.target
      const orderBtn = $("order-button")
      const orderPanel = $("order-popover")
      const insideInfo = popover.contains(target) || button.contains(target)
      const insideOrder = !!(
        orderPanel &&
        orderBtn &&
        (orderPanel.contains(target) || orderBtn.contains(target))
      )
      const insideIssues = !!(
        issuesPanel &&
        issuesTrigger &&
        (issuesPanel.contains(target) || issuesTrigger.contains(target))
      )
      if (insideInfo || insideOrder || insideIssues) {
        return
      }
      popover.hidden = true
      button.setAttribute("aria-expanded", "false")
      closeIssuesPopover()
      if (orderPanel) {
        orderPanel.hidden = true
      }
      orderBtn?.setAttribute("aria-expanded", "false")
      applyInlineLayout()
    })
    document.addEventListener("keydown", function onEscape(e) {
      if (!bar.isConnected) {
        document.removeEventListener("keydown", onEscape)
        return
      }
      if (e.key === "Escape") {
        closeIssuesPopover()
        const orderPopover = $("order-popover")
        let changed = false
        if (!popover.hidden) {
          popover.hidden = true
          button.setAttribute("aria-expanded", "false")
          changed = true
        }
        if (orderPopover && !orderPopover.hidden) {
          orderPopover.hidden = true
          $("order-button")?.setAttribute("aria-expanded", "false")
          changed = true
        }
        if (changed) {
          applyInlineLayout()
        }
      }
    })
    applyInlineLayout()
    adjustPosition()
  }

  // Annulla tutti i trasferimenti e risolve subito le Promise in attesa.
  // Incrementare sequence rende inoffensive anche eventuali risposte tardive.
  function cancelRequests() {
    ++sequence
    for (const request of [...inFlight]) {
      request.abort()
    }
    inFlight.clear()
  }

  function setCollapsed(value: any) {
    if (collapsed === value) {
      return
    }
    if (isOsmEditing()) {
      cancelRequests()
      removePanel()
      return
    }
    collapsed = value
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0")
    if (value) {
      resetModifiedElements()
      closeIssuesPopover()
      cancelRequests()
      const popover = $("popover")
      if (popover) {
        popover.hidden = true
      }
      const orderPopover = $("order-popover")
      if (orderPopover) {
        orderPopover.hidden = true
      }
      $("info-button")?.setAttribute("aria-expanded", "false")
      $("order-button")?.setAttribute("aria-expanded", "false")
    }
    applyInlineLayout()
    if (!value) {
      // Anche quando l'URL NON cambia, una relazione già selezionata
      // deve provocare immediatamente nuove richieste API alla riapertura.
      const id = relationIdFromUrl()
      if (id) {
        cancelRequests()
        closeIssuesPopover()
        setIssuesDetails(null)
        relationIdShown = id
        const statusNode = $("status")
        if (statusNode) {
          statusNode.textContent = "⏳ Verifica"
        }
        for (const key of ["sda", "issues", "date", "sync"]) {
          const node = $(key)
          if (node) {
            node.textContent = "—"
          }
        }
        const target = $("target")
        if (target) {
          target.removeAttribute("href")
          target.setAttribute("aria-disabled", "true")
        }
        // Il pannello viene già mostrato: non va ricreato.
        load(id, false)
      } else {
        refresh(true)
      }
    }
  }

  function removePanel() {
    closeIssuesPopover()
    clearTimeout(modifiedHoverTimer)
    hideModifiedPopup()
    resetModifiedElements()
    document.getElementById("osm2cai-bar")?.remove()
  }

  // Aggiorna i dati senza distruggere/ricreare il pannello durante la
  // navigazione di OpenStreetMap (l'interazione con Turbo resta isolata).
  function resetPanelForRelation(relationId: any) {
    closeIssuesPopover()
    setIssuesDetails(null)
    resetModifiedElements()
    const statusNode = $("status")
    if (statusNode) {
      statusNode.textContent = "⏳ Verifica"
    }
    for (const key of ["sda", "issues", "date", "sync"]) {
      const node = $(key)
      if (node) {
        node.textContent = "—"
      }
    }
    const target = $("target")
    if (target) {
      target.removeAttribute("href")
      target.setAttribute("aria-disabled", "true")
    }
    setWaymarkedLink(relationId, null)
    site.updateOsmLink?.(relationId, null)
    applyInlineLayout()
  }

  // Hardening delle richieste privilegiate: accetta solo gli endpoint REST
  // effettivamente utilizzati dal progetto e mai URL estranei ai due servizi.
  const MAX_API_RESPONSE_BYTES = 32 * 1024 * 1024
  function isAllowedApiUrl(rawUrl: any) {
    try {
      const u = new URL(rawUrl)
      if (
        u.protocol !== "https:" ||
        u.username ||
        u.password ||
        u.search ||
        u.hash
      )
        return false
      if (u.origin === "https://api.openstreetmap.org") {
        return /^\/api\/0\.6\/(?:relation|way)\/[1-9]\d{0,15}\/full\.json$/.test(
          u.pathname,
        )
      }
      if (u.origin === "https://osm2cai.cai.it") {
        return /^\/api\/v2\/hiking-route-osm\/[1-9]\d{0,15}$/.test(u.pathname)
      }
      return false
    } catch (_) {
      return false
    }
  }

  function getJson(url: any) {
    if (!isAllowedApiUrl(url)) {
      console.warn("[OSM2CAI] Richiesta bloccata: endpoint non consentito")
      return Promise.resolve(null)
    }
    return new Promise(resolve => {
      let settled = false
      let requestHandle: any = null
      let timer: any = null
      const request: any = {
        abort() {
          if (settled) {
            return
          }
          // Chiudere la Promise prima di abortire evita callback duplicate.
          finish(null)
          try {
            requestHandle?.abort()
          } catch (_) {
            // L'handle può essere già stato completato.
          }
        },
      }
      function finish(value: any) {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        inFlight.delete(request)
        resolve(value)
      }
      inFlight.add(request)
      timer = setTimeout(() => request.abort(), TIMEOUT + 500)
      try {
        requestHandle = GM_xmlhttpRequest({
          method: "GET",
          url,
          timeout: TIMEOUT,
          headers: { Accept: "application/json" },
          onload: (response: any) => {
            // Non interpretare il risultato di eventuali redirect verso
            // host terzi o pagine di login come dati attendibili.
            if (
              response.status !== 200 ||
              (response.finalUrl && !isAllowedApiUrl(response.finalUrl))
            ) {
              console.warn(
                "[OSM2CAI] Risposta HTTP non valida",
                response.status,
              )
              finish(null)
              return
            }
            const body = response.responseText
            // Il limite è prudenziale: impedisce parsing di payload
            // insolitamente grandi o di contenuto inatteso.
            if (
              typeof body !== "string" ||
              body.length > MAX_API_RESPONSE_BYTES
            ) {
              console.warn("[OSM2CAI] Risposta API eccessiva o non testuale")
              finish(null)
              return
            }
            try {
              const data = JSON.parse(body)
              finish(
                data && typeof data === "object" && !Array.isArray(data)
                  ? data
                  : null,
              )
            } catch (error) {
              console.warn("[OSM2CAI] JSON non valido", error)
              finish(null)
            }
          },
          onprogress: (event: any) => {
            if (
              Number.isFinite(event.loaded) &&
              event.loaded > MAX_API_RESPONSE_BYTES
            )
              request.abort()
          },
          onerror: (error: any) => {
            console.warn("[OSM2CAI] Errore rete", url, error)
            finish(null)
          },
          ontimeout: () => finish(null),
          onabort: () => finish(null),
        })
        if (settled) {
          try {
            requestHandle?.abort()
          } catch (_) {
            // Nessuna operazione necessaria.
          }
        }
      } catch (error) {
        console.warn("[OSM2CAI] Richiesta non riuscita", error)
        finish(null)
      }
    })
  }

  // Costruisce una vista WMT che include l'intero itinerario.
  // Coordinate GeoJSON in ordine [longitudine, latitudine].

  // Su WMT il collegamento OSM presente nella sidebar può già includere
  // la bbox corretta. Preferiscilo sempre a una stima del nostro script.

  function setWaymarkedLink(relationId: any, bounds: any) {
    const link = document.querySelector(
      '#osm2cai-bar a[aria-label="Apri su Waymarked Trails"]',
    )
    if (link) {
      link.href = wmtUrlForBounds(relationId, bounds)
    }
  }

  function status(id: any, kind: any, label: any) {
    const node = $(id)
    if (!node) {
      return
    }
    node.replaceChildren()
    const dot = document.createElement("span")
    dot.className = "oc-dot " + kind
    node.append(dot, document.createTextNode(label))
    applyInlineLayout()
  }
  // Ultimo timestamp tra TUTTI gli elementi di /full.json (relazioni,
  // way e nodi). Se le date non sono complete, il confronto non è certo.

  // Età della validazione in mesi di calendario, usando la data locale
  // odierna.
  // Le date future e quelle malformate non sono classificabili.

  function fillData(data: any) {
    const p = data?.properties || {}
    status("status", "ok", "online")
    if ($("sda")) {
      $("sda").textContent = p.sda ?? "—"
    }
    setIssuesDetails(p)
    // Il colore dipende esclusivamente dal valore fornito dall'API.
    const rawIssues = String(p.issues_status ?? "").trim()
    const normalizedIssues = rawIssues
      .toLocaleLowerCase("it-IT")
      .replace(/\s+/g, " ")
    let issuesKind = "gray"
    if (normalizedIssues === "percorribile") {
      issuesKind = "ok"
    } else if (normalizedIssues === "non percorribile") {
      issuesKind = "error"
    } else if (
      normalizedIssues === "parzialmente percorribile" ||
      normalizedIssues === "percorribile parzialmente"
    ) {
      issuesKind = "orange"
    }
    const issuesText =
      issuesKind === "orange"
        ? "parzialmente percorribile"
        : rawIssues || "sconosciuto"
    status("issues", issuesKind, issuesText)
    const validationLabel =
      typeof p.validation_date === "string" && p.validation_date.trim()
        ? p.validation_date.trim()
        : "—"
    status("date", validationDateKind(p.validation_date), validationLabel)
    const link = $("target")
    if (link && p.id !== undefined && p.id !== null && p.id !== "") {
      link.href = OSM2CAI + "/" + encodeURIComponent(p.id)
      link.removeAttribute("aria-disabled")
    }
  }

  // SDA 4: confronta OSM con validation_date; se OSM è più recente,
  // segnala "da verificare". SDA 1, 2, 3: confronta con updated_at;
  // se OSM è più recente, segnala "da aggiornare".
  // Nessun fallback tra i due campi: SDA 0 o date non confrontabili => grigio.
  function fillAlignment(data: any, osmDate: any) {
    const p = data?.properties || {}
    const sda = String(p.sda ?? "").trim()
    let kind = "gray"
    let message = "non verificabile"
    const osmMs = typeof osmDate === "string" ? Date.parse(osmDate) : NaN
    const source =
      sda === "4"
        ? p.validation_date
        : ["1", "2", "3"].includes(sda)
          ? p.updated_at
          : null
    if (
      Number.isFinite(osmMs) &&
      typeof osmDate === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(osmDate) &&
      typeof source === "string"
    ) {
      const stamp = source.trim()
      const validFormat = /^\d{4}-\d{2}-\d{2}(?:$|T|\s)/.test(stamp)
      const sourceMs = validFormat ? Date.parse(stamp) : NaN
      if (Number.isFinite(sourceMs)) {
        // Le date senza orario vengono confrontate a livello di giorno.
        const aligned = /^\d{4}-\d{2}-\d{2}$/.test(stamp)
          ? stamp >= osmDate.slice(0, 10)
          : sourceMs >= osmMs
        kind = aligned ? "ok" : "error"
        message = aligned
          ? "aggiornato"
          : sda === "4"
            ? "da verificare"
            : "da aggiornare"
      }
    }
    status("sync", kind, message)
  }
  function apiError() {
    status("status", "error", "errore")
    status("sync", "gray", "non verificabile")
  }

  // /relation/ID/full include la geometria dei membri diretti, NON quella
  // delle way delle sottorelazioni. Caricare ogni sottorelazione con /full,
  // poi recuperare eventuali singole way ancora prive di nodi.
  async function expandNestedRelationGeometry(
    full: any,
    relationId: any,
    isCurrent: any,
  ) {
    if (!Array.isArray(full?.elements)) return full
    const byKey = new Map<any, any>(
      full.elements.map((e: any) => [e.type + ":" + e.id, e]),
    )
    const fetchedRelations = new Set<any>([String(relationId)])
    const fetchedWays = new Set<any>()
    const maxRelations = 36,
      maxWays = 80
    const merge = (result: any) => {
      for (const item of result?.elements || []) {
        const key = item.type + ":" + item.id
        const existing = byKey.get(key)
        // Non sostituire una way completa con una sua versione parziale.
        if (
          existing?.type === "way" &&
          Array.isArray(existing.nodes) &&
          existing.nodes.length >= 2 &&
          !Array.isArray(item.nodes)
        )
          continue
        byKey.set(key, item)
      }
    }
    // Esplora soltanto i membri relation raggiungibili dalla radice.
    // Il Set impedisce loop e richieste duplicate in caso di cicli.
    for (let pass = 0; pass < 12 && isCurrent(); pass++) {
      const known = byKey.get("relation:" + relationId)
      if (!known) break
      const nestedIds = new Set<any>()
      const seen = new Set<any>()
      function collect(id: any, depth: any) {
        if (depth > 12 || seen.has(String(id))) return
        seen.add(String(id))
        const rel = byKey.get("relation:" + id)
        for (const m of rel?.members || [])
          if (m.type === "relation") {
            nestedIds.add(String(m.ref))
            collect(m.ref, depth + 1)
          }
      }
      collect(relationId, 0)
      const todo = [...nestedIds]
        .filter(
          id =>
            /^[1-9]\d{0,15}$/.test(id) &&
            Number.isSafeInteger(Number(id)) &&
            !fetchedRelations.has(id),
        )
        .slice(0, Math.max(0, maxRelations - fetchedRelations.size))
      if (!todo.length) break
      for (const id of todo) fetchedRelations.add(id)
      const results = await Promise.all(
        todo.map(id =>
          getJson(
            "https://api.openstreetmap.org/api/0.6/relation/" +
              encodeURIComponent(id) +
              "/full.json",
          ),
        ),
      )
      if (!isCurrent()) return full
      for (const result of results) merge(result)
    }
    if (!isCurrent()) return full
    const graph = relationGeometryMembers(
      { elements: [...byKey.values()] },
      relationId,
    )
    // Fallback per geometrie parziali o mancanti, senza considerare
    // l'assenza nel JSON come errore geometrico della way su OSM.
    const missingWayIds = [
      ...new Set<any>(graph.members.map((m: any) => String(m.ref))),
    ]
      .filter((id: string) => {
        if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))
          return false
        const w = byKey.get("way:" + id)
        return !Array.isArray(w?.nodes) || w.nodes.length < 2
      })
      .slice(0, maxWays)
    for (let i = 0; i < missingWayIds.length && isCurrent(); i += 8) {
      const ids = missingWayIds.slice(i, i + 8)
      for (const id of ids) fetchedWays.add(id)
      const results = await Promise.all(
        ids.map(id =>
          getJson(
            "https://api.openstreetmap.org/api/0.6/way/" +
              encodeURIComponent(id) +
              "/full.json",
          ),
        ),
      )
      if (!isCurrent()) return full
      for (const result of results) merge(result)
    }
    return { ...full, elements: [...byKey.values()] }
  }

  async function load(relationId: any, recreate = true) {
    if (isOsmEditing()) {
      cancelRequests()
      removePanel()
      return
    }
    if (recreate && !document.getElementById("osm2cai-bar")) {
      newPanel(relationId)
    }
    if (collapsed) {
      return
    } // Nessuna richiesta API con barra chiusa.
    resetModifiedElements()
    closeIssuesPopover()
    setIssuesDetails(null)
    orderFull = null
    orderRelationId = null
    const orderOutput = $("order-results")
    if (orderOutput) orderOutput.textContent = ""
    const ticket = ++sequence
    const isCurrent = () =>
      !collapsed &&
      !isOsmEditing() &&
      ticket === sequence &&
      relationId === relationIdFromUrl()

    // Avvio simultaneo: nessuna delle due API deve bloccare l'altra.
    const osmRequest = getJson(
      "https://api.openstreetmap.org/api/0.6/relation/" +
        relationId +
        "/full.json",
    )
    const caiRequest = getJson(API + "/" + relationId)
    let full: any = null
    let data: any = null
    let osmFinished = false
    let caiFinished = false
    let unsupportedRoute = false

    function finishAlignment() {
      if (!isCurrent() || unsupportedRoute || !osmFinished || !caiFinished) {
        return
      }
      if (data) {
        fillAlignment(data, latestRelationWayTimestamp(full, relationId))
        const p = data?.properties || {}
        modifiedAfterValidation =
          String(p.sda ?? "").trim() === "4" &&
          $("sync")?.textContent === "da verificare"
            ? modifiedElementsSince(full, p.validation_date)
            : []
        hideModifiedPopup()
      } else {
        status("sync", "gray", "non verificabile")
      }
    }

    // I dati OSM2CAI appaiono subito, anche se OSM è ancora in attesa.
    caiRequest.then(result => {
      if (!isCurrent() || unsupportedRoute) {
        return
      }
      data = result
      caiFinished = true
      if (data) {
        fillData(data)
      } else {
        apiError()
      }
      finishAlignment()
      // Se OSM ha già risposto, il link Waymarked può essere completato.
      if (osmFinished && !isWmt()) {
        const bounds: any =
          boundsFromGeojson(data?.geometry || data?.features?.[0]?.geometry) ||
          boundsFromOsmFull(full, relationId)
        setWaymarkedLink(relationId, bounds)
      }
    })

    // OSM controlla la tipologia del percorso e fornisce date/geometria.
    osmRequest.then(async result => {
      if (!isCurrent()) {
        return
      }
      full = result
      if (full) {
        // Segnala temporaneamente l'analisi in corso mentre si scaricano
        // le geometrie delle sottorelazioni eventualmente assenti.
        setMemberOrderIndicator("gray")
        full = await expandNestedRelationGeometry(full, relationId, isCurrent)
        if (!isCurrent()) return
        orderFull = full
        orderRelationId = relationId
      }
      updateMemberOrderIndicator(full, relationId)
      osmFinished = true
      const osmRelation = full?.elements?.find(
        (item: any) =>
          item.type === "relation" && String(item.id) === String(relationId),
      )
      if (osmRelation?.tags?.route && osmRelation.tags.route !== "hiking") {
        unsupportedRoute = true
        cancelRequests()
        removePanel()
        return
      }
      finishAlignment()
      const linkBounds: any =
        boundsFromGeojson(data?.geometry || data?.features?.[0]?.geometry) ||
        boundsFromOsmFull(full, relationId)
      site.updateOsmLink?.(relationId, linkBounds)
      if (!isWmt()) setWaymarkedLink(relationId, linkBounds)
    })
  }

  function refresh(force = false) {
    const incomingId = relationIdFromUrl()
    if (isOsmEditing() || incomingId !== relationIdShown) {
      cancelRequests()
    }
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      if (isOsmEditing()) {
        cancelRequests()
        relationIdShown = null
        removePanel()
        return
      }
      const id = relationIdFromUrl()
      if (!id) {
        cancelRequests()
        relationIdShown = null
        removePanel()
        return
      }
      if (
        !force &&
        relationIdShown === id &&
        document.getElementById("osm2cai-bar")
      ) {
        adjustPosition()
        return
      }
      cancelRequests()
      relationIdShown = id
      // Quando è chiusa, non alterare il DOM durante la navigazione OSM.
      // Registra solo il nuovo ID; i dati verranno richiesti all'apertura.
      if (collapsed) {
        if (!document.getElementById("osm2cai-bar")) {
          newPanel(id)
        }
        return
      }
      if (!document.getElementById("osm2cai-bar")) {
        newPanel(id)
      }
      resetPanelForRelation(id)
      load(id, false)
    }, 100)
  }

  let initialized = false
  function init() {
    if (initialized) return
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", init, { once: true })
      return
    }
    initialized = true
    insertStyle()
    site.bindLinks?.(relationIdFromUrl, () =>
      boundsFromOsmFull(orderFull, relationIdFromUrl()),
    )
    refresh()
    window.addEventListener("pagehide", () => {
      clearOrderMap()
      clearTimeout(refreshTimer)
      clearTimeout(positionTimer)
      clearTimeout(modifiedHoverTimer)
      cancelRequests()
    })
    window.addEventListener("beforeunload", () => {
      clearOrderMap()
      clearTimeout(refreshTimer)
      clearTimeout(positionTimer)
      clearTimeout(modifiedHoverTimer)
      cancelRequests()
    })
    window.addEventListener("hashchange", () => refresh())
    window.addEventListener("popstate", () => refresh())
    // Non intervenire su turbo:before-cache: OSM gestisce internamente
    // la navigazione e l'evidenziazione delle relazioni. La rimozione
    // del pannello in questa fase può interferire con quel ciclo.
    // L'attributo data-turbo-temporary esclude già la barra dagli snapshot.
    // Al caricamento controlliamo semplicemente l'URL corrente, senza
    // forzare un nuovo caricamento della stessa relazione.
    document.addEventListener("turbo:load", () => refresh())
    window.addEventListener("resize", () => {
      clearTimeout(positionTimer)
      positionTimer = setTimeout(() => {
        applyInlineLayout()
        adjustPosition()
      }, 80)
    })
    // Non osservare il DOM di OpenStreetMap: le sue modifiche sono
    // gestite esclusivamente da OSM e non devono innescare interventi
    // dello userscript mentre le relazioni vengono selezionate.
    // Il solo cambio di URL è letto periodicamente, senza toccare la mappa.
    setInterval(() => {
      // In editor OSM la barra scompare anche durante transizioni SPA.
      if (isOsmEditing()) {
        if (document.getElementById("osm2cai-bar") || inFlight.size) {
          cancelRequests()
          relationIdShown = null
          removePanel()
        }
      } else {
        adjustPosition()
      }
      applyTheme()
      if (location.href !== lastUrl) {
        lastUrl = location.href
        refresh()
      }
    }, 500)
  }
  init()
}
