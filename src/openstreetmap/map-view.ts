export function visibleTileView(
  map: Element,
  rect: DOMRect,
): { zoom: number; lat: number; lon: number } | null {
  const images = map.querySelectorAll<HTMLImageElement>(
    "img.leaflet-tile, .leaflet-tile-pane img",
  )

  if (!images.length) return null

  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const tiles: Array<{
    zoom: number
    x: number
    y: number
    rect: DOMRect
    distance: number
  }> = []

  for (const image of images) {
    const url = image.currentSrc || image.src || ""
    const match = url.match(
      /\/(\d{1,2})\/(\d+)\/(\d+)(?:@2x)?\.(?:png|jpe?g|webp)(?:[?#]|$)/i,
    )

    if (!match) continue

    const zoom = Number(match[1])
    const tileX = Number(match[2])
    const tileY = Number(match[3])

    if (zoom < 0 || zoom > 22 || tileX >= 2 ** zoom || tileY >= 2 ** zoom) {
      continue
    }

    const tileRect = image.getBoundingClientRect()

    if (
      tileRect.width < 80 ||
      tileRect.height < 80 ||
      !Number.isFinite(tileRect.left) ||
      tileRect.right < rect.left ||
      tileRect.left > rect.right ||
      tileRect.bottom < rect.top ||
      tileRect.top > rect.bottom
    ) {
      continue
    }

    const style = getComputedStyle(image)
    if (
      style.visibility === "hidden" ||
      style.display === "none" ||
      Number(style.opacity) === 0
    ) {
      continue
    }

    const distance = Math.hypot(
      Math.max(0, tileRect.left - centerX, centerX - tileRect.right),
      Math.max(0, tileRect.top - centerY, centerY - tileRect.bottom),
    )

    tiles.push({ zoom, x: tileX, y: tileY, rect: tileRect, distance })
  }

  if (!tiles.length) return null

  const counts = new Map<number, number>()
  for (const tile of tiles) {
    counts.set(tile.zoom, (counts.get(tile.zoom) || 0) + 1)
  }

  tiles.sort(
    (first, second) =>
      first.distance - second.distance ||
      (counts.get(second.zoom) || 0) - (counts.get(first.zoom) || 0),
  )

  const tile = tiles[0]
  const scaleX = tile.rect.width / 256
  const scaleY = tile.rect.height / 256

  if (!(scaleX > 0 && scaleY > 0) || Math.abs(scaleX / scaleY - 1) > 0.1) {
    return null
  }

  const zoom = tile.zoom + Math.log2((scaleX + scaleY) / 2)
  const worldSize = 2 ** tile.zoom
  const x = (tile.x + (centerX - tile.rect.left) / tile.rect.width) / worldSize
  const y = (tile.y + (centerY - tile.rect.top) / tile.rect.height) / worldSize
  const lon = (x - Math.floor(x)) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI

  if (
    ![zoom, lat, lon].every(Number.isFinite) ||
    Math.abs(lat) > 85 ||
    zoom > 25
  ) {
    return null
  }

  return { zoom, lat, lon }
}
