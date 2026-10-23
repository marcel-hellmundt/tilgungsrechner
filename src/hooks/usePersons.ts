import { useEffect, useState } from 'react'
import { parsePersons, type Person } from '../lib/persons'

const STORAGE_KEY = 'loan-persons'

/** List of borrowers, persisted to localStorage on every change. */
export function usePersons() {
  const [persons, setPersons] = useState<Person[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persons))
    } catch {
      // storage unavailable – state still works for this session
    }
  }, [persons])

  return [persons, setPersons] as const
}

function load(): Person[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return (raw && parsePersons(JSON.parse(raw))) || []
  } catch {
    return []
  }
}
