import { describe, expect, it, beforeEach } from "bun:test"
import {
  getSession,
  saveSession,
  clearSession,
  getLockoutExpiry,
  setLockoutExpiry,
  clearLockoutExpiry,
  SESSION_STORAGE_KEY,
  type OperatorSession,
} from "./session"

class MockStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

describe("Session Manager", () => {
  let mockStorage: MockStorage

  beforeEach(() => {
    mockStorage = new MockStorage()
  })

  it("returns null when no session is stored", () => {
    expect(getSession(mockStorage)).toBeNull()
  })

  it("saves and retrieves a valid operator session", () => {
    const session: OperatorSession = {
      userId: 1,
      username: "Andres",
      authenticatedAt: new Date().toISOString(),
    }

    saveSession(session, mockStorage)
    const retrieved = getSession(mockStorage)

    expect(retrieved).toEqual(session)
  })

  it("clears stored session properly", () => {
    const session: OperatorSession = {
      userId: 2,
      username: "Aldo",
      authenticatedAt: new Date().toISOString(),
    }

    saveSession(session, mockStorage)
    expect(getSession(mockStorage)).not.toBeNull()

    clearSession(mockStorage)
    expect(getSession(mockStorage)).toBeNull()
    expect(mockStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it("handles corrupt JSON in storage gracefully by returning null and clearing it", () => {
    mockStorage.setItem(SESSION_STORAGE_KEY, "{invalid-json-content")
    const retrieved = getSession(mockStorage)

    expect(retrieved).toBeNull()
    expect(mockStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it("rejects invalid session objects missing required fields", () => {
    mockStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: "not-a-number" }))
    expect(getSession(mockStorage)).toBeNull()
  })

  it("tracks and retrieves per-user lockout expiry", () => {
    const userId = 1
    const seconds = 60
    const beforeMs = Date.now()

    const expiryMs = setLockoutExpiry(userId, seconds, mockStorage)
    expect(expiryMs).toBeGreaterThanOrEqual(beforeMs + 59000)

    const retrievedExpiry = getLockoutExpiry(userId, mockStorage)
    expect(retrievedExpiry).toBe(expiryMs)
  })

  it("returns null for expired lockout timestamps", () => {
    const userId = 2
    // Manually set an expired timestamp in the past
    mockStorage.setItem("factory_lockout_until_2", String(Date.now() - 5000))

    const retrieved = getLockoutExpiry(userId, mockStorage)
    expect(retrieved).toBeNull()
  })

  it("clears lockout expiry for specific user", () => {
    const userId = 1
    setLockoutExpiry(userId, 60, mockStorage)
    expect(getLockoutExpiry(userId, mockStorage)).not.toBeNull()

    clearLockoutExpiry(userId, mockStorage)
    expect(getLockoutExpiry(userId, mockStorage)).toBeNull()
  })
})
