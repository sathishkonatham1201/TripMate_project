export default function splitBudget(total, count) {
  const amount = Number(total)
  const members = Number(count)
  if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(members) || members < 1) return []
  const totalPaise = Math.round(amount * 100)
  const base = Math.floor(totalPaise / members)
  const leftover = totalPaise % members
  return Array.from({ length: members }, (_, index) => ((base + (index < leftover ? 1 : 0)) / 100))
}
