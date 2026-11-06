export function boundsFromGeojson(geometry: any) {
  if (!geometry) {
    return null
  }
  const values = []
  function visit(value: any) {
    if (!Array.isArray(value)) {
      return
    }
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      const lon = value[0],
        lat = value[1]
      if (
        Number.isFinite(lon) &&
        Number.isFinite(lat) &&
        lat >= -85 &&
        lat <= 85
      ) {
        values.push([lat, lon])
      }
      return
    }
    for (const item of value) {
      visit(item)
    }
  }
  if (
    geometry.type === "GeometryCollection" &&
    Array.isArray(geometry.geometries)
  ) {
    for (const part of geometry.geometries) {
      const bounds: any = boundsFromGeojson(part)
      if (bounds) {
        values.push(
          [bounds.minLat, bounds.minLon],
          [bounds.maxLat, bounds.maxLon],
        )
      }
    }
  } else {
    visit(geometry.coordinates)
  }
  return makeBounds(values)
}

export function makeBounds(points: any) {
  if (!points.length) {
    return null
  }
  const bounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLon: Infinity,
    maxLon: -Infinity,
  }
  for (const [lat, lon] of points) {
    bounds.minLat = Math.min(bounds.minLat, lat)
    bounds.maxLat = Math.max(bounds.maxLat, lat)
    bounds.minLon = Math.min(bounds.minLon, lon)
    bounds.maxLon = Math.max(bounds.maxLon, lon)
  }
  return bounds
}

export function boundsFromOsmFull(data: any, relationId: any) {
  if (!Array.isArray(data?.elements)) {
    return null
  }
  const relation = data.elements.find(
    (item: any) =>
      item.type === "relation" && String(item.id) === String(relationId),
  )
  if (!relation) {
    return null
  }
  const ways = new Map<any, any>(
    data.elements
      .filter((item: any) => item.type === "way")
      .map((item: any) => [item.id, item]),
  )
  const nodes = new Map<any, any>(
    data.elements
      .filter((item: any) => item.type === "node")
      .map((item: any) => [item.id, item]),
  )
  const relations = new Map<any, any>(
    data.elements
      .filter((item: any) => item.type === "relation")
      .map((item: any) => [item.id, item]),
  )
  const visited = new Set<any>()
  const points: any = []
  function addNode(id: any) {
    const node = nodes.get(id)
    if (Number.isFinite(node?.lat) && Number.isFinite(node?.lon)) {
      points.push([node.lat, node.lon])
    }
  }
  function walk(rel: any) {
    if (visited.has(rel.id)) {
      return
    }
    visited.add(rel.id)
    for (const member of rel.members || []) {
      if (member.type === "node") {
        addNode(member.ref)
      } else if (member.type === "way") {
        for (const nodeId of ways.get(member.ref)?.nodes || []) {
          addNode(nodeId)
        }
      } else if (member.type === "relation" && relations.has(member.ref)) {
        walk(relations.get(member.ref))
      }
    }
  }
  walk(relation)
  return makeBounds(points)
}

export function wmtUrlForBounds(relationId: any, bounds: any) {
  const base =
    "https://hiking.waymarkedtrails.org/#route?id=" +
    encodeURIComponent(relationId)
  if (!bounds) {
    return base
  }
  // Proiezione Web Mercator, con margine per includere tutto il tracciato.
  const mercatorY = (lat: any) =>
    (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2
  const minY = mercatorY(Math.min(85, bounds.maxLat))
  const maxY = mercatorY(Math.max(-85, bounds.minLat))
  const dx = Math.max(1e-9, (bounds.maxLon - bounds.minLon) / 360)
  const dy = Math.max(1e-9, maxY - minY)
  const viewportWidth = Math.max(300, Math.min(window.innerWidth - 350, 1100))
  const viewportHeight = Math.max(300, window.innerHeight - 180)
  const zoom = Math.max(
    1,
    Math.min(
      18,
      Math.log2(
        Math.min(viewportWidth / (256 * dx), viewportHeight / (256 * dy)),
      ) - 0.4,
    ),
  )
  const centerY = (minY + maxY) / 2
  const centerLat =
    (Math.atan(Math.sinh(Math.PI * (1 - 2 * centerY))) * 180) / Math.PI
  const centerLon = (bounds.minLon + bounds.maxLon) / 2
  return (
    base +
    "&map=" +
    zoom.toFixed(1) +
    "/" +
    centerLat.toFixed(5) +
    "/" +
    centerLon.toFixed(5)
  )
}
