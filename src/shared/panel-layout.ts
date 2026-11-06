import { CSS } from "./styles"

export function createPanelLayout(
  isWmt: () => boolean,
  isCollapsed: () => boolean,
) {
  const $ = (id: string) => document.getElementById("osm2cai-" + id)
  const MAIN_BAR_HEIGHT = 60
  const MEMBER_ROW_HEIGHT = 38
  const BAR_HEIGHT = MAIN_BAR_HEIGHT + MEMBER_ROW_HEIGHT
  const RAIL_WIDTH = 34
  const BAR_WIDTH = 710
  const METRIC_WIDTHS = [90, 55, 220, 135, 145]
  function insertStyle() {
    if (document.getElementById("osm2cai-global-style")) {
      return
    }
    const style = document.createElement("style")
    style.id = "osm2cai-global-style"
    style.textContent = CSS
    const root = document.head || document.documentElement
    root.appendChild(style)
  }

  // Misura la posizione visibile della sidebar, inclusi i ridimensionamenti
  // effettuati da Better OSM Org (che usa #sidebar e resize:horizontal).
  function getSidebarRight() {
    if (isWmt()) {
      // Waymarked Trails: le classi Svelte possono comparire anche su
      // contenitori larghi quanto tutta la pagina. Non usare il primo
      // match: scegli solo un elemento ancorato al bordo sinistro e
      // con dimensioni compatibili con una sidebar.
      const selectors = [
        "aside",
        '[class*="sidebar"]',
        '[class*="sidepanel"]',
        '[class*="svelte-q14p2h"]',
      ]
      const found = new Set<any>()
      const candidates = []
      for (const selector of selectors) {
        for (const element of document.querySelectorAll(selector)) {
          if (found.has(element)) {
            continue
          }
          found.add(element)
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          if (style.display === "none" || style.visibility === "hidden") {
            continue
          }
          // Evita wrapper, modali e pannelli interni non ancorati a sinistra.
          if (
            rect.left < -10 ||
            rect.left > 70 ||
            rect.width < 220 ||
            rect.width > Math.min(650, window.innerWidth * 0.6) ||
            rect.height < 180 ||
            rect.right > window.innerWidth * 0.65
          ) {
            continue
          }
          candidates.push(rect.right)
        }
      }
      if (candidates.length > 0) {
        // L'estremità maggiore tra i candidati plausibili rappresenta
        // il bordo esterno della sidebar, non quello di un figlio.
        return Math.round(Math.max(...candidates))
      }
      // Fallback WMT: usa la distanza originaria, senza agganciarti
      // accidentalmente a un contenitore Svelte a tutta larghezza.
      return 350
    }

    const sidebar = document.querySelector("#sidebar")
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect()
      const style = getComputedStyle(sidebar)
      if (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width >= 40 &&
        rect.right > 0
      ) {
        return Math.round(rect.right)
      }
    }
    return 350
  }

  function adjustPosition() {
    const bar = document.getElementById("osm2cai-bar")
    if (!bar) {
      return
    }
    // WMT: mantieni libero il comando zoom +/- (in alto a sinistra).
    // La barra inizia dopo la colonna dei controlli OpenLayers, non
    // dopo la sidebar che su WMT può variare notevolmente.
    const desiredLeft = isWmt() ? 35 : getSidebarRight() + 5
    const left = Math.max(
      8,
      Math.min(desiredLeft, window.innerWidth - RAIL_WIDTH - 8),
    )
    const available = Math.max(RAIL_WIDTH, window.innerWidth - left - 8)
    bar.style.setProperty("position", "fixed", "important")
    bar.style.setProperty("left", left + "px", "important")
    bar.style.setProperty("top", "64px", "important")
    bar.style.setProperty("right", "auto", "important")
    bar.style.setProperty(
      "width",
      (isCollapsed()
        ? Math.min(RAIL_WIDTH, available)
        : Math.min(BAR_WIDTH + RAIL_WIDTH, available)) + "px",
      "important",
    )
    bar.style.setProperty("max-width", available + "px", "important")
  }

  // Fallback CSP: su openstreetmap.org i fogli <style> degli userscript
  // possono risultare presenti nel DOM ma non applicati. Gli stili
  // impostati via element.style.setProperty funzionano anche in quel caso.
  function applyInlineLayout() {
    const root = document.getElementById("osm2cai-bar")
    if (!root) {
      return
    }
    function set(node: any, values: any) {
      if (!node) {
        return
      }
      for (const [prop, value] of Object.entries(values)) {
        node.style.setProperty(prop, value, "important")
      }
    }
    function all(selector: any, values: any) {
      root!.querySelectorAll(selector).forEach(node => set(node, values))
    }
    set(root, {
      "box-sizing": "border-box",
      position: "fixed",
      top: "60px",
      left: "355px",
      right: "auto",
      width: BAR_WIDTH + RAIL_WIDTH + "px",
      "z-index": "2147483000",
      display: "block",
      visibility: "visible",
      opacity: "1",
      "pointer-events": "none",
      font: "13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif",
      color: "#233344",
    })
    set(root.querySelector(".oc-card"), {
      "box-sizing": "border-box",
      "pointer-events": "auto",
      background: "white",
      border: "1px solid #d8dfe7",
      "border-radius": "0 7px 7px 0",
      "margin-left": RAIL_WIDTH + "px",
      width: "calc(100% - " + RAIL_WIDTH + "px)",
      height: BAR_HEIGHT + "px",
      "box-shadow": "0 2px 9px rgba(0,0,0,.16)",
      overflow: "hidden",
    })
    set(root.querySelector(".oc-main"), {
      "box-sizing": "border-box",
      display: "flex",
      "align-items": "center",
      "flex-wrap": "nowrap",
      height: MAIN_BAR_HEIGHT + "px",
      "min-height": "0",
      padding: "6px 12px",
      gap: "10px",
      "border-bottom": "1px solid #d8dfe7",
    })
    set(root.querySelector(".oc-metrics"), {
      display: "flex",
      "align-items": "center",
      "min-width": "0",
      flex: "1 1 auto",
      gap: "8px",
      "overflow-x": "auto",
      "scrollbar-width": "thin",
    })
    root.querySelectorAll(".oc-metric").forEach((node, index) => {
      const width = METRIC_WIDTHS[index] + "px"
      set(node, {
        display: "flex",
        "align-items": "center",
        flex: "0 0 " + width,
        width: width,
        "min-width": width,
        "max-width": width,
        overflow: "hidden",
      })
      set(node.firstElementChild, { width: "100%", "min-width": "0" })
    })
    all(".oc-label", {
      "font-size": "12px",
      "font-weight": "400",
      "line-height": "1.25",
      color: "#5a6574",
      "white-space": "nowrap",
    })
    all(".oc-value", {
      "font-size": "13px",
      "line-height": "1.3",
      "font-weight": "600",
      color: "#233344",
      "white-space": "nowrap",
      overflow: "hidden",
      "text-overflow": "ellipsis",
    })
    all(".oc-dot", {
      display: "inline-block",
      width: "12px",
      height: "12px",
      "border-radius": "50%",
      background: "#e7b743",
      "vertical-align": "-1px",
      "margin-right": "5px",
    })
    all(".oc-dot.ok", { background: "#22bd3c" })
    all(".oc-dot.error", { background: "#ed3043" })
    all(".oc-dot.warning", { background: "#e7b743" })
    all(".oc-dot.gray", { background: "#9ca3af" })
    all(".oc-dot.orange", { background: "#f59e0b" })
    all(".oc-dot.validation-orange", { background: "#f97316" })
    set(root.querySelector(".oc-actions"), {
      display: "flex",
      "align-items": "center",
      "justify-content": "flex-end",
      gap: "8px",
      flex: "0 0 auto",
      width: "auto",
      "min-width": "0",
      height: "100%",
      "align-self": "center",
      "margin-left": "auto",
    })
    all(".oc-action", {
      display: "inline-flex",
      "flex-direction": "row",
      "flex-wrap": "nowrap",
      "align-items": "center",
      "justify-content": "center",
      gap: "6px",
      flex: "0 0 auto",
      width: "auto",
      "min-width": "0",
      height: "29px",
      padding: "0 10px",
      border: "1px solid #6682aa",
      "border-radius": "6px",
      background: "white",
      "font-size": "12px",
      "font-weight": "600",
      "white-space": "nowrap",
      "text-decoration": "none",
      color: "#356293",
      "pointer-events": "auto",
      cursor: "pointer",
    })
    all(".oc-action-icon", {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      width: "17px",
      height: "17px",
      flex: "0 0 17px",
      "border-radius": "0",
      background: "transparent",
      color: "#356293",
      "box-shadow": "none",
    })
    all(".oc-action-icon svg", { width: "15px", height: "15px" })
    // Pulsante informazioni centrato verticalmente nella barra.
    set(root.querySelector(".oc-help-wrap"), {
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      height: "100%",
      "align-self": "stretch",
      width: "32px",
      flex: "0 0 32px",
      margin: "0",
      padding: "0",
    })
    all(".oc-info-button", {
      "box-sizing": "border-box",
      appearance: "none",
      "-webkit-appearance": "none",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      width: "28px",
      height: "28px",
      "min-width": "28px",
      "min-height": "28px",
      flex: "0 0 28px",
      margin: "0",
      padding: "0",
      border: "1px solid #6682aa",
      "border-radius": "50%",
      background: "white",
      color: "#356293",
      font: "700 16px/1 system-ui,sans-serif",
      cursor: "pointer",
    })
    set(root.querySelector(".oc-member-row"), {
      display: "flex",
      "align-items": "center",
      "justify-content": "flex-start",
      height: MEMBER_ROW_HEIGHT + "px",
      padding: "0 12px",
      gap: "10px",
      background: "rgba(52,120,237,0.04)",
    })
    set(root.querySelector(".oc-member-button"), {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      gap: "8px",
      height: "30px",
      padding: "0 16px",
      border: "1px solid #1650b0",
      "border-radius": "6px",
      background: "linear-gradient(#3478ed,#1451aa)",
      "box-shadow": "0 1px 3px #0002",
      color: "white",
      font: "700 13px/1 system-ui,sans-serif",
      "white-space": "nowrap",
      cursor: "pointer",
    })
    set(root.querySelector(".oc-member-icon"), {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      color: "#356293",
    })
    all(".oc-member-icon svg", { width: "18px", height: "18px" })
    set(root.querySelector(".oc-member-dot"), {
      display: "inline-block",
      flex: "0 0 10px",
      width: "10px",
      height: "10px",
      "border-radius": "50%",
    })
    // Linguetta di chiusura: sul bordo sinistro, nello stesso punto
    // di apertura.
    set(root.querySelector(".oc-close-rail"), {
      position: "absolute",
      top: "0",
      left: "0",
      right: "auto",
      width: RAIL_WIDTH + "px",
      height: "100%",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      background: "white",
      border: "1px solid #d8dee6",
      "border-right": "0",
      "border-radius": "7px 0 0 7px",
      "pointer-events": "auto",
      "box-shadow": "2px 2px 7px rgba(0,0,0,.07)",
    })
    set(root.querySelector(".oc-close-button"), {
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      width: "100%",
      height: "100%",
      margin: "0",
      padding: "0",
      border: "0",
      background: "transparent",
      color: "#356293",
      font: "700 20px/1 system-ui,sans-serif",
      cursor: "pointer",
    })
    // La linguetta di riapertura condivide posizione, altezza, larghezza,
    // bordo e sfondo con quella di chiusura.
    set(root.querySelector(".oc-closed"), {
      "box-sizing": "border-box",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      width: RAIL_WIDTH + "px",
      height: BAR_HEIGHT + "px",
      margin: "0",
      padding: "0",
      border: "1px solid #d8dee6",
      "border-radius": "7px 0 0 7px",
      background: "white",
      "box-shadow": "2px 2px 7px rgba(0,0,0,.07)",
      "pointer-events": "auto",
      cursor: "pointer",
      color: "#356293",
      font: "700 20px/1 system-ui,sans-serif",
    })
    set(root.querySelector(".oc-popover"), {
      position: "absolute",
      left: RAIL_WIDTH + "px",
      top: "100%",
      "margin-top": "5px",
      width: "calc(100% - " + RAIL_WIDTH + "px)",
      "max-width": "calc(100vw - 24px)",
      "max-height": "70vh",
      height: "auto",
      overflow: "auto",
      background: "white",
      border: "1px solid #cbd5e1",
      "border-radius": "8px",
      "box-shadow": "0 3px 12px rgba(0,0,0,.2)",
      "pointer-events": "auto",
      "z-index": "3",
      display: root.querySelector(".oc-popover")?.hidden ? "none" : "block",
    })
    set(root.querySelector(".oc-order-popover"), {
      position: "absolute",
      left: RAIL_WIDTH + "px",
      top: "100%",
      "margin-top": "5px",
      width: "450px",
      "max-width": "calc(100vw - 24px)",
      "max-height": "70vh",
      height: "auto",
      overflow: "auto",
      background: "white",
      border: "1px solid #cbd5e1",
      "border-radius": "8px",
      "box-shadow": "0 3px 12px rgba(0,0,0,.2)",
      "pointer-events": "auto",
      "z-index": "2",
      display: root.querySelector(".oc-order-popover")?.hidden
        ? "none"
        : "block",
    })
    // Lo stile iniettato può essere bloccato dalla CSP di OSM: il popup
    // percorribilità deve ricevere gli stessi stili inline degli altri popup.
    const issuesPopup = root.querySelector(".oc-issues-popover")
    set(issuesPopup, {
      "box-sizing": "border-box",
      position: "absolute",
      top: "100%",
      left: RAIL_WIDTH + "px",
      "margin-top": "5px",
      width: "500px",
      "max-width": "calc(100vw - 24px)",
      "max-height": "65vh",
      height: "auto",
      overflow: "auto",
      background: "#ffffff",
      color: "#233344",
      border: "1px solid #9ca9bb",
      "border-radius": "8px",
      "box-shadow": "0 7px 22px rgba(0,0,0,.2)",
      padding: "12px 14px",
      "pointer-events": "auto",
      font: "13px/1.45 system-ui,sans-serif",
      "z-index": "4",
      display: issuesPopup?.hidden ? "none" : "block",
    })
    // Stessa intestazione su OSM e WMT: il CSS di OSM può prevalere
    // sugli attributi style HTML e rendere la X un pulsante quadrato
    // vicino al titolo. Applichiamo !important direttamente agli elementi.
    set(root.querySelector(".oc-issues-heading"), {
      "box-sizing": "border-box",
      display: "flex",
      "flex-direction": "row",
      "align-items": "center",
      "justify-content": "space-between",
      width: "100%",
      "min-height": "30px",
      gap: "12px",
      margin: "0 0 8px",
      padding: "0",
    })
    set(root.querySelector(".oc-issues-heading-title"), {
      display: "block",
      flex: "1 1 auto",
      "min-width": "0",
      margin: "0",
      padding: "0",
      font: "700 15px/1.3 system-ui,-apple-system,Segoe UI,sans-serif",
    })
    set(root.querySelector("#osm2cai-issues-close"), {
      "box-sizing": "border-box",
      appearance: "none",
      "-webkit-appearance": "none",
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      position: "static",
      flex: "0 0 26px",
      width: "26px",
      height: "26px",
      "min-width": "26px",
      "min-height": "26px",
      margin: "0",
      padding: "0",
      border: "1px solid #8797ac",
      "border-radius": "50%",
      background: "#fff",
      color: "#356293",
      font: "600 18px/1 system-ui,-apple-system,Segoe UI,sans-serif",
      "text-align": "center",
      cursor: "pointer",
      "box-shadow": "none",
    })
    set(root.querySelector(".oc-issues-table"), {
      "box-sizing": "border-box",
      width: "100%",
      "border-collapse": "collapse",
      "table-layout": "fixed",
      margin: "0",
      font: "inherit",
      color: "inherit",
    })
    all(".oc-issues-table th, .oc-issues-table td", {
      "box-sizing": "border-box",
      "text-align": "left",
      "vertical-align": "top",
      padding: "10px 7px",
      "border-bottom": "1px solid #d8dfe7",
      "overflow-wrap": "anywhere",
      "font-size": "13px",
    })
    all(".oc-issues-table th", { width: "33%", "font-weight": "650" })
    set(root.querySelector(".oc-issues-description"), {
      "white-space": "pre-wrap",
      "overflow-wrap": "anywhere",
    })
    set(root.querySelector(".oc-order-popover-content"), {
      padding: "14px 16px",
    })
    set(root.querySelector(".oc-order-header"), {
      display: "flex",
      "align-items": "center",
      "justify-content": "space-between",
      gap: "12px",
      "margin-bottom": "10px",
    })
    set(root.querySelector(".oc-order-title"), {
      "font-size": "15px",
      "font-weight": "700",
      "line-height": "1.3",
    })
    set(root.querySelector(".oc-order-close"), {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      width: "26px",
      height: "26px",
      border: "1px solid #6682aa",
      "border-radius": "999px",
      background: "white",
      color: "#356293",
      font: "700 18px/1 system-ui,sans-serif",
      cursor: "pointer",
    })
    // La modalità compatta mostra soltanto il pulsante per riaprire.
    const card = root.querySelector(".oc-card")
    const opener = root.querySelector(".oc-closed")
    set(card, { display: isCollapsed() ? "none" : "block" })
    set(root.querySelector(".oc-close-rail"), {
      display: isCollapsed() ? "none" : "flex",
    })
    set(opener, { display: isCollapsed() ? "flex" : "none" })
    adjustPosition()
    applyTheme(true)
  }

  // Tema automatico. Prima rileva il tema del sito, poi la sidebar
  // e infine il sistema.
  function darkThemeEnabled() {
    const html = document.documentElement
    const body = document.body
    const flags = [html, body].filter(Boolean)
    for (const el of flags) {
      const explicit =
        el.getAttribute("data-bs-theme") || el.getAttribute("data-theme")
      if (explicit === "dark") {
        return true
      }
      if (explicit === "light") {
        return false
      }
      if (el.classList.contains("dark") || el.classList.contains("dark-mode")) {
        return true
      }
      if (
        el.classList.contains("light") ||
        el.classList.contains("light-mode")
      ) {
        return false
      }
    }
    // Better OSM Org e OSM possono colorare il pannello separatamente dal body.
    const sidebar = document.querySelector(
      isWmt() ? '[class*="svelte-q14p2h"]' : "#sidebar_content, #sidebar",
    )
    const candidates = [sidebar, body, html]
    for (const el of candidates) {
      if (!el) {
        continue
      }
      const bg = getComputedStyle(el).backgroundColor
      const match = bg.match(
        /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s\/]+([\d.]+))?\)/,
      )
      if (!match || (match[4] !== undefined && Number(match[4]) < 0.5)) {
        continue
      }
      const [, r, g, b] = match.map(Number)
      const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return brightness < 120
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }

  let lastDarkTheme: any = null
  function applyTheme(force = false) {
    const root = document.getElementById("osm2cai-bar")
    if (!root) {
      return
    }
    const dark = darkThemeEnabled()
    if (!force && lastDarkTheme === dark) {
      return
    }
    lastDarkTheme = dark
    const palette = dark
      ? {
          background: "#26282b",
          text: "#e4e8ed",
          muted: "#b0b9c5",
          line: "#565e68",
          action: "#dce6f4",
          button: "#343a42",
          shadow: "0 2px 9px rgba(0,0,0,.4)",
        }
      : {
          background: "#ffffff",
          text: "#233344",
          muted: "#5a6574",
          line: "#d8dfe7",
          action: "#334155",
          button: "#ffffff",
          shadow: "0 2px 9px rgba(0,0,0,.16)",
        }
    function style(selector: any, values: any) {
      root!.querySelectorAll(selector).forEach(node => {
        for (const [key, value] of Object.entries(values)) {
          node.style.setProperty(key, value, "important")
        }
      })
    }
    style(":scope", {
      color: palette.text,
      "color-scheme": dark ? "dark" : "light",
    })
    style(".oc-card", {
      background: palette.background,
      "border-color": palette.line,
      "box-shadow": palette.shadow,
    })
    style(".oc-main", { "border-bottom": "1px solid " + palette.line })
    style(".oc-member-row", {
      background: dark ? "rgba(168,199,255,0.08)" : "rgba(52,120,237,0.04)",
    })
    style(".oc-member-button", {
      color: "#ffffff",
      "border-color": dark ? "#86b2f1" : "#1650b0",
    })
    style(".oc-member-icon", { color: dark ? "#a8c7ff" : "#356293" })
    style(".oc-label", { color: palette.muted })
    style(".oc-value", { color: palette.text })
    style(".oc-action", {
      color: dark ? "#c5dafa" : "#356293",
      background: palette.button,
      "border-color": dark ? "#8099b6" : "#6682aa",
    })
    style(".oc-action-icon", { color: dark ? "#c5dafa" : "#356293" })
    style(".oc-close-rail, .oc-closed", {
      background: palette.background,
      "border-color": palette.line,
      color: dark ? "#a8c7ff" : "#356293",
    })
    style(".oc-close-button", { color: dark ? "#a8c7ff" : "#356293" })
    style(".oc-info-button", {
      background: palette.button,
      "border-color": dark ? "#8099b6" : "#6682aa",
      color: dark ? "#c5dafa" : "#356293",
    })
    style(".oc-popover", {
      background: palette.background,
      "border-color": palette.line,
      color: palette.text,
    })
    style(".oc-order-popover", {
      background: palette.background,
      "border-color": palette.line,
      color: palette.text,
    })
    style(".oc-issues-popover", {
      background: palette.background,
      "border-color": palette.line,
      color: palette.text,
    })
    style(".oc-issues-heading-title", { color: palette.text })
    style(".oc-issues-table th, .oc-issues-table td", {
      "border-bottom": "1px solid " + palette.line,
      color: palette.text,
    })
    style("#osm2cai-issues-close", {
      background: palette.button,
      "border-color": palette.line,
      color: dark ? "#a8c7ff" : "#356293",
    })
    style(".oc-order-title", { color: palette.text })
    style(".oc-order-close", {
      background: palette.button,
      "border-color": dark ? "#8099b6" : "#6682aa",
      color: dark ? "#c5dafa" : "#356293",
    })
    style(".oc-popover th", {
      background: "transparent",
      color: palette.text,
      border: "0",
      "border-bottom": "1px solid " + palette.line,
    })
    style(".oc-popover td", {
      background: "transparent",
      color: palette.muted,
      border: "0",
      "border-bottom": "1px solid " + (dark ? "#363d44" : "#edf0f4"),
      padding: "8px 12px 8px 0",
      "vertical-align": "top",
    })
    style(".oc-popover tbody td:first-child", {
      color: palette.text,
      "font-weight": "500",
      width: "32%",
    })
    style(".oc-popover tbody tr:last-child td", { "border-bottom": "0" })
    style(".oc-popover .oc-popup-title, .oc-popover .oc-popup-subtitle", {
      color: palette.text,
    })
    style(".oc-popover .oc-help-legend", { color: palette.muted })
    style(".oc-popover .oc-help-table-heading", { color: palette.text })
    style(".oc-popover .oc-help-more", { color: palette.muted })
    styleHelpPopup(palette, dark)
    applyModifiedPopupTheme()
    // I pallini API/percorribilità/allineamento restano semanticamente
    // colorati.
  }

  // Aspetto del popup applicato elemento per elemento: OSM può bloccare
  // i fogli <style> iniettati, quindi non dipendiamo dal CSS esterno.
  function styleHelpPopup(palette: any, dark: any) {
    const root = document.getElementById("osm2cai-bar")
    const popup = root?.querySelector(".oc-popover")
    if (!popup) {
      return
    }
    const set = (node: any, rules: any) => {
      if (!node) {
        return
      }
      for (const [key, value] of Object.entries(rules)) {
        node.style.setProperty(key, value, "important")
      }
    }
    const many = (selector: any, rules: any) => {
      popup.querySelectorAll(selector).forEach((node: any) => set(node, rules))
    }
    const divider = dark ? "#394047" : "#e9edf2"
    set(popup, {
      "box-sizing": "border-box",
      width: "calc(100% - " + RAIL_WIDTH + "px)",
      "max-width": "calc(100vw - 24px)",
      "max-height": "min(70vh, 570px)",
      "overflow-y": "auto",
      "overflow-x": "hidden",
      "background-color": palette.background,
      color: palette.text,
      border: "1px solid " + palette.line,
      "border-radius": "10px",
      "box-shadow": dark
        ? "0 12px 32px rgba(0,0,0,.38)"
        : "0 12px 32px rgba(0,0,0,.18)",
      "font-family": "system-ui,-apple-system,Segoe UI,sans-serif",
      "line-height": "1.5",
      "text-align": "left",
    })
    set(popup.querySelector(".oc-popup-content"), {
      "box-sizing": "border-box",
      padding: "14px 18px 16px",
      font: "13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif",
      color: palette.text,
    })
    set(popup.querySelector(".oc-popup-title"), {
      display: "block",
      "font-size": "16px",
      "font-weight": "700",
      "line-height": "1.3",
      margin: "0",
      padding: "0",
      color: palette.text,
    })
    const table = popup.querySelector(".oc-help-table")
    set(table, {
      width: "100%",
      "table-layout": "fixed",
      "border-collapse": "collapse",
      "border-spacing": "0",
      margin: "0",
      padding: "0",
      background: "transparent",
      "font-size": "13px",
      "line-height": "1.4",
      color: palette.text,
    })
    many("thead tr, tbody tr", { background: "transparent", border: "0" })
    many("th", {
      "box-sizing": "border-box",
      "text-align": "left",
      "vertical-align": "bottom",
      padding: "0 10px 7px 0",
      "font-weight": "650",
      "font-size": "13px",
      border: "0",
      "border-bottom": "1px solid " + divider,
      background: "transparent",
      color: palette.text,
    })
    many("tbody td", {
      "box-sizing": "border-box",
      padding: "9px 10px 9px 0",
      "font-size": "13px",
      "font-weight": "400",
      "line-height": "1.4",
      "vertical-align": "top",
      "text-align": "left",
      border: "0",
      "border-bottom": "1px solid " + divider,
      background: "transparent",
      color: palette.muted,
      "overflow-wrap": "break-word",
      "white-space": "normal",
    })
    many("thead th:first-child, tbody td:first-child", {
      width: "30%",
      "padding-right": "12px",
      color: palette.text,
    })
    many("tbody td:first-child", { "font-weight": "550" })
    many("tbody tr:last-child td", { "border-bottom": "0" })
    set(popup.querySelector(".oc-popup-subtitle"), {
      margin: "15px 0 9px",
      padding: "0",
      "font-size": "15px",
      "font-weight": "700",
      "line-height": "1.3",
      color: palette.text,
    })
    set(popup.querySelector(".oc-popup-heading"), {
      display: "flex",
      "align-items": "flex-start",
      "justify-content": "space-between",
      "flex-wrap": "nowrap",
      "column-gap": "12px",
      "margin-bottom": "12px",
    })
    set(popup.querySelector(".oc-popup-brand"), {
      display: "flex",
      "flex-direction": "column",
      "min-width": "0",
      gap: "3px",
      flex: "1 1 auto",
    })
    set(popup.querySelector(".oc-popup-version"), {
      "font-size": "11px",
      "line-height": "1.4",
      color: palette.muted,
    })
    set(popup.querySelector(".oc-popup-close"), {
      appearance: "none",
      "-webkit-appearance": "none",
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      "box-sizing": "border-box",
      flex: "0 0 28px",
      width: "28px",
      height: "28px",
      padding: "0",
      margin: "-2px 0 0",
      border: "1px solid " + palette.line,
      "border-radius": "50%",
      background: palette.button,
      font: "600 20px/1 system-ui,sans-serif",
      color: dark ? "#a8c7ff" : "#356293",
      cursor: "pointer",
    })
    set(popup.querySelector(".oc-popup-documentation"), {
      display: "flex",
      "flex-direction": "column",
      gap: "10px",
      padding: "11px 0 12px",
      margin: "0 0 12px",
      "border-top": "1px solid " + divider,
      "border-bottom": "1px solid " + divider,
    })
    many(".oc-popup-doc-section", {
      display: "flex",
      "flex-direction": "column",
      gap: "6px",
    })
    many(".oc-popup-doc-label", {
      "font-size": "12px",
      "font-weight": "700",
      "line-height": "1.35",
      color: palette.text,
    })
    many(".oc-popup-links", {
      display: "flex",
      "flex-wrap": "wrap",
      "align-items": "center",
      "column-gap": "8px",
      "row-gap": "7px",
      margin: "0",
      padding: "0",
    })
    many(".oc-popup-links a", {
      display: "inline-flex",
      "align-items": "center",
      gap: "6px",
      "box-sizing": "border-box",
      "max-width": "100%",
      padding: "5px 9px",
      border: "1px solid " + palette.line,
      "border-radius": "6px",
      background: dark ? "#283241" : "#f5f8fc",
      color: dark ? "#a8c7ff" : "#2563b6",
      "font-size": "12px",
      "font-weight": "600",
      "line-height": "1.4",
      "text-decoration": "none",
      "white-space": "normal",
      "overflow-wrap": "break-word",
      cursor: "pointer",
    })
    many(".oc-popup-links a span", {
      "font-size": "11px",
      opacity: "0.75",
    })
    set(popup.querySelector(".oc-help-legend-heading"), {
      "font-size": "13px",
      "font-weight": "700",
      margin: "0 0 6px",
      color: palette.text,
    })
    set(popup.querySelector(".oc-help-legend"), {
      display: "flex",
      "flex-wrap": "wrap",
      "align-items": "center",
      "column-gap": "14px",
      "row-gap": "7px",
      "font-size": "12px",
      "line-height": "1.4",
      color: palette.muted,
      margin: "0 0 12px",
      padding: "0",
    })
    many(".oc-help-legend > span", {
      display: "inline-flex",
      "align-items": "center",
      gap: "5px",
      "white-space": "nowrap",
      margin: "0",
      padding: "0",
    })
    popup
      .querySelectorAll(".oc-help-legend > span > span")
      .forEach((dot: any, i: number) => {
        set(dot, {
          display: "inline-block",
          flex: "0 0 10px",
          width: "10px",
          height: "10px",
          "min-width": "10px",
          "min-height": "10px",
          "border-radius": "50%",
          "background-color":
            ["#22bd3c", "#ed3043", "#f59e0b", "#9ca3af"][i] || "#9ca3af",
          margin: "0",
          padding: "0",
          "vertical-align": "middle",
        })
      })
  }

  // Dati di dettaglio della percorribilità: usa solo campi API, senza HTML.
  function applyModifiedPopupTheme() {
    const popup = $("modified-popup")
    if (!popup) return
    const dark = darkThemeEnabled()
    popup.style.setProperty(
      "background",
      dark ? "#26282b" : "#fff",
      "important",
    )
    popup.style.setProperty("color", dark ? "#e4e8ed" : "#233344", "important")
  }

  return {
    insertStyle,
    adjustPosition,
    applyInlineLayout,
    applyTheme,
    applyModifiedPopupTheme,
  }
}
