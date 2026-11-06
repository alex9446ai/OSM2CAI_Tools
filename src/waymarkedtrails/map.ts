interface PanelInsets {
  until: number
  left: number
  right: number
}

export function createWaymarkedMapHelpers() {
  let panelCache: PanelInsets = { until: 0, left: 0, right: 0 }

  function canvasFrame(
    map: Element,
  ): { canvas: HTMLCanvasElement; matrix: DOMMatrix } | null {
    if (typeof DOMMatrix === "undefined") return null

    const canvases = [
      ...map.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas"),
    ].filter(canvas => {
      const rect = canvas.getBoundingClientRect()
      return (
        rect.width > 200 &&
        rect.height > 150 &&
        getComputedStyle(canvas).display !== "none"
      )
    })

    if (!canvases.length) return null

    const canvas = canvases[0]
    const style = getComputedStyle(canvas)
    const transform =
      style.transform === "none"
        ? new DOMMatrix()
        : new DOMMatrix(style.transform)

    if (!transform.is2D) return null

    const viewport = map.getBoundingClientRect()
    const originX = parseFloat(style.transformOrigin.split(" ")[0]) || 0
    const originY = parseFloat(style.transformOrigin.split(" ")[1]) || 0
    const parent = canvas.offsetParent
    const parentRect = parent?.getBoundingClientRect()

    if (!parentRect) return null

    const topLeft = new DOMMatrix().translate(
      parentRect.left - viewport.left + canvas.offsetLeft,
      parentRect.top - viewport.top + canvas.offsetTop,
    )
    const matrix = topLeft
      .translate(originX, originY)
      .multiply(transform)
      .translate(-originX, -originY)
    const values = [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]

    if (
      !values.every(Number.isFinite) ||
      Math.abs(matrix.a * matrix.d - matrix.b * matrix.c) < 1e-9
    ) {
      return null
    }

    return { canvas, matrix }
  }

  function panelInsets(rect: DOMRect, map: Element): PanelInsets {
    const now = performance.now()
    if (now < panelCache.until) return panelCache

    const candidates = new Set(
      document.querySelectorAll(
        'aside,[id*="sidebar"],[class*="sidebar"],[class*="sidepanel"],' +
          '[id*="details"],[class*="details"],[id*="route"],' +
          '[class*="route-panel"],' +
          '[class*="info-panel"],[role="complementary"]',
      ),
    )

    for (const x of [
      rect.left + Math.min(20, rect.width * 0.03),
      rect.right - Math.min(20, rect.width * 0.03),
    ]) {
      const y = Math.min(
        window.innerHeight - 5,
        Math.max(5, rect.top + rect.height * 0.53),
      )

      for (const top of document.elementsFromPoint(x, y).slice(0, 12)) {
        for (
          let element: Element | null = top, depth = 0;
          element && depth < 7;
          element = element.parentElement, depth++
        ) {
          if (element !== map) candidates.add(element)
        }
      }
    }

    let left = 0
    let right = 0

    for (const panel of candidates) {
      if (panel === map || panel.contains(map)) continue

      const panelRect = panel.getBoundingClientRect()
      if (
        panelRect.height < rect.height * 0.32 ||
        panelRect.width < 170 ||
        panelRect.width > rect.width * 0.85 ||
        panelRect.bottom < rect.top + rect.height * 0.32 ||
        panelRect.top > rect.bottom - rect.height * 0.25
      ) {
        continue
      }

      const style = getComputedStyle(panel)
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        continue
      }

      const text = (panel.textContent || "").slice(0, 3500)
      const semantic = panel.matches(
        'aside,[id*="sidebar"],[class*="sidebar"],[class*="sidepanel"],' +
          '[role="complementary"]',
      )
      const hasRouteDetails = new RegExp(
        "Relazione\\s*\\d+|Etichette OpenStreetMap|Download route|" +
          "Profilo altimetrico|Analizza relazione",
        "i",
      ).test(text)

      if (!semantic && !hasRouteDetails) continue

      if (
        panelRect.left <= rect.left + 85 &&
        panelRect.right > rect.left + 170 &&
        panelRect.right < rect.right - 90
      ) {
        left = Math.max(left, panelRect.right - rect.left)
      }

      if (
        panelRect.right >= rect.right - 85 &&
        panelRect.left > rect.left + 90 &&
        panelRect.left < rect.right - 170
      ) {
        right = Math.max(right, rect.right - panelRect.left)
      }
    }

    panelCache = {
      until: now + 260,
      left: Math.ceil(Math.max(0, left)),
      right: Math.ceil(Math.max(0, right)),
    }

    return panelCache
  }

  return {
    canvasFrame,
    panelInsets,
    reset() {
      panelCache.until = 0
    },
  }
}
