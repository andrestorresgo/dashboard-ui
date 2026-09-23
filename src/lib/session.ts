/**
 * Session and per-user lockout management for factory operators.
 * Uses localStorage with in-memory fallbacks when running in headless or SSR environments.
 */

export interface OperatorSession {
  userId: number
  username: string
  authenticatedAt: string
}

export const SESSION_STORAGE_KEY = "factory_operator_session"
export const LOCKOUT_KEY_PREFIX = "factory_lockout_until_"

// Fallback in-memory map for environments where window.localStorage is unavailable
const memoryStorage = new Map<string, string>()

function getDefaultStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage
  }
  return null
}

function getItem(key: string, storage?: Storage): string | null {
  const target = storage ?? getDefaultStorage()
  if (target) {
    try {
      return target.getItem(key)
    } catch {
      return memoryStorage.get(key) ?? null
    }
  }
  return memoryStorage.get(key) ?? null
}

function setItem(key: string, value: string, storage?: Storage): void {
  const target = storage ?? getDefaultStorage()
  if (target) {
    try {
      target.setItem(key, value)
      return
    } catch {
      memoryStorage.set(key, value)
      return
    }
  }
  memoryStorage.set(key, value)
}

function removeItem(key: string, storage?: Storage): void {
  const target = storage ?? getDefaultStorage()
  if (target) {
    try {
      target.removeItem(key)
      return
    } catch {
      memoryStorage.delete(key)
      return
    }
  }
  memoryStorage.delete(key)
}

/**
 * Retrieves the currently persisted operator session.
 * Returns null if not found, invalid, or corrupted.
 */
export function getSession(storage?: Storage): OperatorSession | null {
  const raw = getItem(SESSION_STORAGE_KEY, storage)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "userId" in parsed &&
      typeof (parsed as { userId: unknown }).userId === "number" &&
      "username" in parsed &&
      typeof (parsed as { username: unknown }).username === "string" &&
      "authenticatedAt" in parsed &&
      typeof (parsed as { authenticatedAt: unknown }).authenticatedAt === "string"
    ) {
      return parsed as OperatorSession
    }
    // Malformed session data
    removeItem(SESSION_STORAGE_KEY, storage)
    return null
  } catch {
    removeItem(SESSION_STORAGE_KEY, storage)
    return null
  }
}

/**
 * Persists an authenticated operator session.
 */
export function saveSession(session: OperatorSession, storage?: Storage): void {
  setItem(SESSION_STORAGE_KEY, JSON.stringify(session), storage)
}

/**
 * Clears the active operator session.
 */
export function clearSession(storage?: Storage): void {
  removeItem(SESSION_STORAGE_KEY, storage)
}

/**
 * Returns unix epoch timestamp (ms) until which the operator is locked out,
 * or null if no active lockout exists.
 */
export function getLockoutExpiry(
  userId: number,
  storage?: Storage,
  now = Date.now()
): number | null {
  const key = `${LOCKOUT_KEY_PREFIX}${userId}`
  const raw = getItem(key, storage)
  if (!raw) return null

  const expiryMs = Number(raw)
  if (isNaN(expiryMs)) {
    removeItem(key, storage)
    return null
  }

  // If already expired in the past, clean it up
  if (now >= expiryMs) {
    removeItem(key, storage)
    return null
  }

  return expiryMs
}

/**
 * Stores a lockout duration (in seconds) for a specific user ID.
 * Returns the computed expiry timestamp (ms).
 */
export function setLockoutExpiry(userId: number, seconds: number, storage?: Storage): number {
  const expiryMs = Date.now() + Math.max(1, seconds) * 1000
  const key = `${LOCKOUT_KEY_PREFIX}${userId}`
  setItem(key, String(expiryMs), storage)
  return expiryMs
}

/**
 * Clears the lockout state for a specific user ID.
 */
export function clearLockoutExpiry(userId: number, storage?: Storage): void {
  const key = `${LOCKOUT_KEY_PREFIX}${userId}`
  removeItem(key, storage)
}
