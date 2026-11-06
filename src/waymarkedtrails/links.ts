import { wmtUrlForBounds } from "../shared/geo"

function mapFragment(): string | null {
  const mapMatch = new RegExp(
    "(?:^|[&#])map=([0-9]+(?:\\.[0-9]+)?)\\/" +
      "(-?[0-9]+(?:\\.[0-9]+)?)\\/" +
      "(-?[0-9]+(?:\\.[0-9]+)?)",
  )
  const hashMatch = location.hash.match(mapMatch)
  const storedMatch = !hashMatch
    ? (localStorage.getItem("position") || "").match(
        new RegExp(
          "^([0-9]+(?:\\.[0-9]+)?)\\/" +
            "(-?[0-9]+(?:\\.[0-9]+)?)\\/" +
            "(-?[0-9]+(?:\\.[0-9]+)?)$",
        ),
      )
    : null
  const values = hashMatch || storedMatch

  if (!values) return null

  const zoom = Number(values[1])
  const lat = Number(values[2])
  const lon = Number(values[3])

  if (
    ![zoom, lat, lon].every(Number.isFinite) ||
    zoom < 0 ||
    zoom > 25 ||
    Math.abs(lat) > 85.05112878 ||
    Math.abs(lon) > 180
  ) {
    return null
  }

  return `#map=${zoom}/${lat.toFixed(5)}/${lon.toFixed(5)}`
}

export function updateOpenStreetMapLink(
  relationId: string | null,
  bounds: any,
): void {
  if (!relationId || !/^\d+$/.test(relationId)) return

  const link = document.querySelector<HTMLAnchorElement>(
    '#osm2cai-bar a[aria-label="Apri su OpenStreetMap"]',
  )

  if (!link) return

  const base =
    "https://www.openstreetmap.org/relation/" + encodeURIComponent(relationId)
  let fragment = mapFragment()

  if (!fragment) {
    for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
      'a[href*="openstreetmap.org"]',
    )) {
      if (anchor.closest("#osm2cai-bar")) continue

      try {
        const url = new URL(anchor.href, location.href)
        const supportedHosts = ["www.openstreetmap.org", "openstreetmap.org"]

        if (
          !supportedHosts.includes(url.hostname) ||
          url.pathname.replace(/\/$/, "") !== "/relation/" + relationId ||
          !/^#map=[\d.]+\/-?[\d.]+\/-?[\d.]+$/.test(url.hash)
        ) {
          continue
        }

        fragment = url.hash
        break
      } catch {
        continue
      }
    }
  }

  if (
    !fragment &&
    bounds &&
    [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon].every(
      Number.isFinite,
    )
  ) {
    const mapMatch = wmtUrlForBounds(relationId, bounds).match(
      /(?:^|&)map=([\d.]+\/-?[\d.]+\/-?[\d.]+)/,
    )

    if (mapMatch) fragment = "#map=" + mapMatch[1]
  }

  link.href = base + (fragment || "")
}

export function bindOpenStreetMapLink(
  getRelationId: () => string | null,
  getBounds: () => any,
): void {
  document.addEventListener(
    "click",
    event => {
      const target = event.target
      if (!(target instanceof Element)) return

      const link = target.closest(
        '#osm2cai-bar a[aria-label="Apri su OpenStreetMap"]',
      )

      if (link) updateOpenStreetMapLink(getRelationId(), getBounds())
    },
    true,
  )
}
