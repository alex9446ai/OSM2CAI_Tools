import type { SiteAdapter } from "../shared/main"
import { bindOpenStreetMapLink, updateOpenStreetMapLink } from "./links"
import { createWaymarkedMapHelpers } from "./map"

const mapHelpers = createWaymarkedMapHelpers()

export const waymarkedTrailsSite = {
  isWaymarkedTrails: true,
  mapSelectors: [
    ".ol-viewport",
    ".ol-layers",
    ".maplibregl-map",
    ".mapboxgl-map",
    ".leaflet-container",
    "#map",
    '[class*="map-container"]',
    '[class*="mapContainer"]',
  ],
  canvasFrame: mapHelpers.canvasFrame,
  panelInsets: mapHelpers.panelInsets,
  resetMapState: mapHelpers.reset,

  isOsmEditing() {
    return false
  },

  relationIdFromUrl() {
    return location.hash.match(/route\?id=(\d+)/)?.[1] || null
  },

  alternateLink(relationId, icon) {
    const href =
      "https://www.openstreetmap.org/relation/" + encodeURIComponent(relationId)
    return [
      '<a class="oc-action" href="',
      href,
      '" target="_blank" rel="noopener noreferrer"',
      ' aria-label="Apri su OpenStreetMap"',
      ' title="Apri su OpenStreetMap">',
      '<span class="oc-action-icon">',
      icon,
      "</span><span>OpenStreetMap</span></a>",
    ].join("")
  },

  updateOsmLink: updateOpenStreetMapLink,

  bindLinks(getRelationId, getBounds) {
    bindOpenStreetMapLink(getRelationId, getBounds)
  },
} satisfies SiteAdapter
