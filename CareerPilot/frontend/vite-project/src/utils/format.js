// The API sends ISO-8601 strings. A plain number is treated as epoch seconds (or milliseconds) just in case.
function toDate(value) {
  if (typeof value === 'number') return new Date(value < 1e11 ? value * 1000 : value)
  return new Date(value)
}

export function formatDate(iso) {
  if (!iso) return '-'
  const d = toDate(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  const d = toDate(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function clock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** good >= 70, ok >= 50, otherwise low. Used for colours only. */
export function scoreTone(score) {
  if (score === null || score === undefined) return 'neutral'
  if (score >= 70) return 'good'
  if (score >= 50) return 'ok'
  return 'low'
}

export function firstName(name) {
  return (name || '').trim().split(/\s+/)[0] || 'there'
}

export function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function joinText(a, b) {
  const left = (a || '').trimEnd()
  const right = (b || '').trim()
  if (!right) return left
  return left ? `${left} ${right}` : right
}
