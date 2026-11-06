export function validateMemberReorder(before: any, after: any) {
  if (
    !Array.isArray(before) ||
    !Array.isArray(after) ||
    before.length < 2 ||
    before.length > 10000 ||
    after.length !== before.length
  )
    return false
  // La sequenza arriva anche dall'hash della pagina iD: non fidarsi di
  // identificativi enormi, nulli o non rappresentabili senza perdita.
  const valid = (m: any) =>
    m &&
    !Array.isArray(m) &&
    ["way", "relation", "node"].includes(m.type) &&
    typeof m.ref === "string" &&
    /^[1-9]\d{0,15}$/.test(m.ref) &&
    Number.isSafeInteger(Number(m.ref)) &&
    typeof m.role === "string" &&
    m.role.length <= 255
  if (!before.every(valid) || !after.every(valid)) return false
  const key = (m: any) => JSON.stringify([m.type, m.ref, m.role])
  const counts = new Map<any, any>()
  let ways = 0
  for (let i = 0; i < before.length; i++) {
    const b = before[i],
      a = after[i]
    if (b.type === "way") {
      if (a.type !== "way") return false
      ways++
    } else if (key(b) !== key(a)) return false
    counts.set(key(b), (counts.get(key(b)) || 0) + 1)
  }
  if (ways < 2) return false
  for (const m of after) {
    const k = key(m),
      count = counts.get(k) || 0
    if (!count) return false
    counts.set(k, count - 1)
  }
  return [...counts.values()].every(n => n === 0)
}

export function orderArrowsForSequence(full: any, sequence: any) {
  const ways = new Map<any, any>(
    (full?.elements || [])
      .filter((e: any) => e.type === "way")
      .map((e: any) => [String(e.id), e]),
  )
  const nodes = new Map<any, any>(
    (full?.elements || [])
      .filter((e: any) => e.type === "node")
      .map((e: any) => [String(e.id), e]),
  )
  const segments = []
  let cursor = null
  for (let i = 0; i < sequence.length; i++) {
    const way = ways.get(String(sequence[i].id))
    const ids = way?.nodes
    if (!ids || ids.length < 2) continue
    const a = String(ids[0]),
      b = String(ids[ids.length - 1])
    if (i === 0) {
      const next = ways.get(String(sequence[1]?.id))
      const na = String(next?.nodes?.[0]),
        nb = String(next?.nodes?.[next?.nodes?.length - 1])
      cursor = (a === na || a === nb) && !(b === na || b === nb) ? b : a
    }
    const oriented: any = cursor === b ? [...ids].reverse() : ids
    cursor = String(oriented[oriented.length - 1])
    for (let j = 0; j < oriented.length - 1; j++) {
      const n1 = nodes.get(String(oriented[j]))
      const n2 = nodes.get(String(oriented[j + 1]))
      if ([n1?.lat, n1?.lon, n2?.lat, n2?.lon].every(Number.isFinite)) {
        segments.push({
          id: String(sequence[i].id),
          a: { lat: n1.lat, lon: n1.lon },
          b: { lat: n2.lat, lon: n2.lon },
        })
      }
    }
  }
  return segments
}

export function orderElevationHint(full: any, sequence: any) {
  // In OSM full.json la quota non è un attributo geometrico: può essere
  // presente soltanto nel tag ele dei nodi (e non va inventata).
  const ways = new Map<any, any>(
    (full?.elements || [])
      .filter((e: any) => e.type === "way")
      .map((e: any) => [String(e.id), e]),
  )
  const nodes = new Map<any, any>(
    (full?.elements || [])
      .filter((e: any) => e.type === "node")
      .map((e: any) => [String(e.id), e]),
  )
  if (!sequence?.length || sequence.length < 2) return null
  const first = ways.get(String(sequence[0].id))
  const second = ways.get(String(sequence[1].id))
  const last = ways.get(String(sequence[sequence.length - 1].id))
  const beforeLast = ways.get(String(sequence[sequence.length - 2].id))
  if (![first, second, last, beforeLast].every(w => w?.nodes?.length >= 2))
    return null
  const terminal = (way: any, neighbor: any) => {
    const ends = [String(way.nodes[0]), String(way.nodes[way.nodes.length - 1])]
    const adjacent = new Set<any>([
      String(neighbor.nodes[0]),
      String(neighbor.nodes[neighbor.nodes.length - 1]),
    ])
    const unique = ends.filter(id => !adjacent.has(id))
    return unique.length === 1 ? unique[0] : null
  }
  const startId = terminal(first, second),
    endId = terminal(last, beforeLast)
  if (!startId || !endId || startId === endId) return null
  const ele = (id: any) => {
    const raw = nodes.get(id)?.tags?.ele
    if (
      typeof raw !== "string" ||
      !/^[-+]?\d+(?:[.,]\d+)?(?:\s*m)?$/i.test(raw.trim())
    )
      return null
    const value = Number(raw.trim().replace(/\s*m$/i, "").replace(",", "."))
    return Number.isFinite(value) && value >= -500 && value <= 9000
      ? value
      : null
  }
  const start = ele(startId),
    end = ele(endId)
  return start === null || end === null ? null : { start, end }
}

export function relationGeometryMembers(full: any, relationId: any) {
  const elements = full?.elements || []
  const relations = new Map<any, any>(
    elements
      .filter((e: any) => e.type === "relation")
      .map((e: any) => [String(e.id), e]),
  )
  const members: any = [],
    missing = new Set<any>(),
    cycles = new Set<any>()
  let nested = 0
  function visit(id: any, ancestors: any, depth: any) {
    const key = String(id)
    if (ancestors.has(key)) {
      cycles.add(key)
      return
    }
    if (depth > 12) {
      missing.add(key)
      return
    }
    const rel = relations.get(key)
    if (!rel || !Array.isArray(rel.members)) {
      missing.add(key)
      return
    }
    const next = new Set<any>(ancestors)
    next.add(key)
    for (const member of rel.members) {
      if (member.type === "way") members.push(member)
      else if (member.type === "relation") {
        nested++
        visit(member.ref, next, depth + 1)
      }
    }
  }
  visit(relationId, new Set<any>(), 0)
  return { members, nested, missing: [...missing], cycles: [...cycles] }
}

export function orderProblemPoints(full: any, relationId: any) {
  const rel = full?.elements?.find(
    (e: any) => e.type === "relation" && String(e.id) === String(relationId),
  )
  if (!rel) return []
  const ways = new Map<any, any>(
    full.elements
      .filter((e: any) => e.type === "way")
      .map((e: any) => [String(e.id), e]),
  )
  const nodes = new Map<any, any>(
    full.elements
      .filter((e: any) => e.type === "node")
      .map((e: any) => [String(e.id), e]),
  )
  const adj = new Map<any, any>()
  const edges: Array<{ id: string; a: string; b: string }> = []
  for (const member of relationGeometryMembers(full, relationId).members) {
    const w = ways.get(String(member.ref))
    if (!w?.nodes?.length || w.nodes.length < 2) continue
    const a = String(w.nodes[0]),
      b = String(w.nodes[w.nodes.length - 1])
    const i = edges.length
    edges.push({ a, b, id: String(member.ref) })
    for (const n of [a, b]) {
      if (!adj.has(n)) adj.set(n, [])
      adj.get(n).push(i)
    }
  }
  const components = []
  const visited = new Set<any>()
  for (const root of adj.keys()) {
    if (visited.has(root)) continue
    const group = []
    const stack = [root]
    while (stack.length) {
      const n = stack.pop()
      if (visited.has(n)) continue
      visited.add(n)
      group.push(n)
      for (const i of adj.get(n) || []) {
        stack.push(edges[i].a, edges[i].b)
      }
    }
    components.push(group)
  }
  const issues: any = []
  const add = (nodeId: any, type: any, label: any, detail: any) => {
    const node = nodes.get(nodeId)
    if (!Number.isFinite(node?.lat) || !Number.isFinite(node?.lon)) return
    issues.push({ lat: node.lat, lon: node.lon, nodeId, type, label, detail })
  }
  if (components.length > 1) {
    components.forEach((group, i) => {
      const ends = group.filter(n => (adj.get(n) || []).length === 1)
      // Se è una componente chiusa (anello), indica un nodo rappresentativo.
      ;(ends.length ? ends : group.slice(0, 1)).forEach(n =>
        add(n, "disconnected", String(i + 1), "Componente " + (i + 1)),
      )
    })
  }
  for (const [n, e] of adj)
    if (e.length > 2)
      add(n, "branch", "!", "Biforcazione (" + e.length + " estremità)")
  return issues
}

export function checkMemberOrder(full: any, relationId: any) {
  const rel = full?.elements?.find(
    (e: any) => e.type === "relation" && String(e.id) === String(relationId),
  )
  if (!rel || !Array.isArray(rel.members))
    return { error: "Relazione non disponibile nel full.json." }
  const geometry = relationGeometryMembers(full, relationId)
  const members = geometry.members
  if (geometry.missing.length || geometry.cycles.length)
    return {
      error:
        "Analisi incompleta: sottorelazioni non disponibili o " +
        "riferimento circolare (" +
        [...geometry.missing, ...geometry.cycles].join(", ") +
        ").",
      incomplete: true,
    }
  if (!members.length)
    return { error: "La relazione e le sottorelazioni non contengono way." }
  const wayMap = new Map<any, any>(
    (full.elements || [])
      .filter((e: any) => e.type === "way")
      .map((e: any) => [String(e.id), e]),
  )
  const edges: Array<{
    id: string
    a: string
    b: string
    index: number
    role: string
  }> = []
  for (const [index, member] of members.entries()) {
    const way = wayMap.get(String(member.ref))
    if (!way || !Array.isArray(way.nodes) || way.nodes.length < 2)
      return {
        error:
          "Geometria della way " +
          member.ref +
          " non disponibile nei dati caricati. Analisi incompleta: " +
          "riprova più tardi.",
        incomplete: true,
      }
    const a = String(way.nodes[0]),
      b = String(way.nodes[way.nodes.length - 1])
    edges.push({ id: String(member.ref), a, b, index, role: member.role || "" })
  }
  const adjacency = new Map<any, any>()
  for (const [i, e] of edges.entries()) {
    // Una way chiusa contribuisce due estremità allo stesso nodo.
    for (const endpoint of [e.a, e.b]) {
      if (!adjacency.has(endpoint)) adjacency.set(endpoint, [])
      adjacency.get(endpoint).push(i)
    }
  }
  const repeated = edges.length - new Set<any>(edges.map((e: any) => e.id)).size
  const branches = [...adjacency.values()].filter(
    items => items.length > 2,
  ).length
  const ends = [...adjacency.entries()]
    .filter(([, items]) => items.length === 1)
    .map(([id]) => id)
  const visited = new Set<any>(),
    stack = [edges[0].a]
  while (stack.length) {
    const node = stack.pop()
    if (visited.has(node)) continue
    visited.add(node)
    for (const i of adjacency.get(node) || []) {
      const e = edges[i]
      stack.push(e.a === node ? e.b : e.a)
    }
  }
  const connected = visited.size === adjacency.size
  const ring = connected && ends.length === 0 && branches === 0
  const linear = connected && ends.length === 2 && branches === 0
  const topology = !connected
    ? "disconnected"
    : branches
      ? "branching"
      : ring
        ? "ring"
        : linear
          ? "linear"
          : "complex"
  const nonWays = rel.members.filter((m: any) => m.type !== "way").length
  const nestedRelations = geometry.nested
  const roleSensitive = edges.some((e: any) => e.role.trim() !== "")

  // Verifica se esiste un verso globale continuo nell'ordine ATTUALE.
  // Il solo confronto tra coppie consecutive genera falsi positivi.
  function traverseCurrent(start: any) {
    let cursor = start,
      breaks = 0
    for (const e of edges) {
      if (e.a === cursor) cursor = e.b
      else if (e.b === cursor) cursor = e.a
      else {
        breaks++
        cursor = e.b
      }
    }
    return breaks
  }
  const breaks = Math.min(
    traverseCurrent(edges[0].a),
    traverseCurrent(edges[0].b),
  )
  const continuous = breaks === 0

  // Riordino suggerito solo per catene/anelli semplici, con membri way
  // unici e ruoli vuoti. Le altre topologie richiedono verifica manuale.
  const safe =
    !repeated && !roleSensitive && !nestedRelations && (linear || ring)
  let proposal = null
  if (safe) {
    const first = edges[0]
    const starts = linear
      ? [
          ends.includes(first.a)
            ? first.a
            : ends.includes(first.b)
              ? first.b
              : ends[0],
        ]
      : [first.a, first.b]
    for (const start of [...new Set<any>(starts)]) {
      const used = new Set<any>(),
        result = []
      let cursor = start
      while (result.length < edges.length) {
        const available = (adjacency.get(cursor) || []).filter(
          (i: any) => !used.has(i),
        )
        if (!available.length) break
        // Per un anello il primo passo può avere due alternative;
        // dopo il primo ogni vertice ha un'unica uscita inutilizzata.
        const idx: any =
          result.length === 0
            ? available.includes(first.index)
              ? first.index
              : available[0]
            : available[0]
        const e: any = edges[idx]
        if (e.a !== cursor && e.b !== cursor) break
        used.add(idx)
        result.push(e)
        cursor = e.a === cursor ? e.b : e.a
      }
      if (result.length === edges.length && (!ring || cursor === start)) {
        proposal = result
        break
      }
    }
  }
  const changes = proposal ? proposal.filter((e, i) => e.index !== i).length : 0
  return {
    total: edges.length,
    breaks,
    continuous,
    repeated,
    branches,
    connected,
    ends: ends.length,
    ring,
    topology,
    roleSensitive,
    nestedRelations,
    proposal,
    changes,
    nonWays,
  }
}
