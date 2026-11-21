import { useEffect, useState } from 'react'

function isTripList(value) {
  if (!Array.isArray(value)) return false
  return value.every((trip) => {
    if (!trip || typeof trip !== 'object') return false
    if (!['id', 'name', 'destination', 'startDate', 'endDate'].every((key) => typeof trip[key] === 'string')) return false
    if (!Number.isFinite(Number(trip.budget)) || !Array.isArray(trip.activities) || !Array.isArray(trip.packing)) return false
    if (!trip.expenses || typeof trip.expenses !== 'object' || Array.isArray(trip.expenses)) return false
    const validActivities = trip.activities.every((activity) =>
      activity && typeof activity.id === 'string' && typeof activity.name === 'string'
      && typeof activity.location === 'string' && typeof activity.time === 'string'
      && Number.isFinite(Number(activity.day)))
    const validPacking = trip.packing.every((item) =>
      item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.packed === 'boolean')
    return validActivities && validPacking
  })
}

export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (key === 'tripmate-trips' && isTripList(parsed)) return parsed
      }
    } catch (error) {
      console.error(`Could not read "${key}" from local storage.`, error)
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Could not save "${key}" to local storage.`, error)
    }
  }, [key, value])

  return [value, setValue]
}
