export function daysBetween(date, offset = 0) {
  const result = new Date(`${date}T12:00:00`)
  result.setDate(result.getDate() + Number(offset))
  return result
}

export function tripDuration(trip) {
  if (!trip?.startDate || !trip?.endDate) return 1
  const start = new Date(`${trip.startDate}T12:00:00`)
  const end = new Date(`${trip.endDate}T12:00:00`)
  return Math.max(1, Math.round((end - start) / 86400000) + 1)
}

export function formatDate(value) {
  if (!value) return 'Date not set'
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Date not set'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)
}
