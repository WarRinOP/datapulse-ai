// Session management for DataPulse demo mode
// Stores session ID + remaining analysis count in localStorage

export const MAX_ANALYSES = 5

const SESSION_KEY = 'dp_session_id'
const REMAINING_KEY = 'dp_remaining'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
    localStorage.setItem(REMAINING_KEY, String(MAX_ANALYSES))
  }
  return id
}

export function getStoredRemaining(): number {
  if (typeof window === 'undefined') return MAX_ANALYSES
  const val = localStorage.getItem(REMAINING_KEY)
  if (val === null) return MAX_ANALYSES
  const n = parseInt(val, 10)
  return isNaN(n) ? MAX_ANALYSES : n
}

export function setStoredRemaining(count: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(REMAINING_KEY, String(Math.max(0, count)))
}
