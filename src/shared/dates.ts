export function latestRelationWayTimestamp(full: any, relationId: any) {
  const elements = full?.elements
  if (
    !Array.isArray(elements) ||
    elements.length === 0 ||
    !elements.some(
      item =>
        item.type === "relation" && String(item.id) === String(relationId),
    )
  ) {
    return null
  }
  let mostRecent = -Infinity
  for (const item of elements) {
    const stamp =
      typeof item.timestamp === "string" ? Date.parse(item.timestamp) : NaN
    if (!Number.isFinite(stamp)) {
      return null
    }
    mostRecent = Math.max(mostRecent, stamp)
  }
  return new Date(mostRecent).toISOString()
}

export function validationDateKind(value: any) {
  if (typeof value !== "string") {
    return "gray"
  }
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/)
  if (!match) {
    return "gray"
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "gray"
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date > today) {
    return "gray"
  }
  const monthsAgo = (count: any) => {
    const threshold = new Date(today.getFullYear(), today.getMonth() - count, 1)
    // Se il mese di confronto è più corto, usare l'ultimo giorno di quel
    // mese.
    const lastDay = new Date(
      threshold.getFullYear(),
      threshold.getMonth() + 1,
      0,
    ).getDate()
    threshold.setDate(Math.min(today.getDate(), lastDay))
    return threshold
  }
  if (date >= monthsAgo(12)) {
    return "ok"
  }
  if (date >= monthsAgo(24)) {
    return "validation-orange"
  }
  return "error"
}
