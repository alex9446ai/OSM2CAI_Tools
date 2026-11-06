import type { SiteAdapter } from "../shared/main"
import { applyOrderInsideID } from "./id-reorder"
import { visibleTileView } from "./map-view"

export const openStreetMapSite = {
  isWaymarkedTrails: false,
  mapSelectors: ["#map", ".leaflet-container"],
  tileView: visibleTileView,

  isOsmEditing() {
    return /^\/edit(?:\/|$)/i.test(location.pathname)
  },

  relationIdFromUrl() {
    if (this.isOsmEditing()) {
      return null
    }

    const direct = location.pathname.match(/\/relation\/(\d+)(?:\/|$)/)?.[1]
    if (direct) {
      return direct
    }

    const routeInHash = location.hash.match(/\/relation\/(\d+)/)?.[1]
    if (routeInHash) {
      return routeInHash
    }

    const queryId = new URLSearchParams(location.search).get("relation")
    return queryId && /^\d+$/.test(queryId) ? queryId : null
  },

  alternateLink(relationId, icon) {
    const href =
      "https://hiking.waymarkedtrails.org/#route?id=" +
      encodeURIComponent(relationId)
    return [
      '<a class="oc-action" href="',
      href,
      '" target="_blank" rel="noopener noreferrer"',
      ' aria-label="Apri su Waymarked Trails"',
      ' title="Apri su Waymarked Trails">',
      '<span class="oc-action-icon">',
      icon,
      "</span><span>Waymarked Trails</span></a>",
    ].join("")
  },

  initializeEditor() {
    if (!/^\/id(?:\/|$)/i.test(location.pathname)) return false
    applyOrderInsideID()
    return true
  },
} satisfies SiteAdapter
