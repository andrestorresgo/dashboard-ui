import { describe, expect, it, beforeEach } from "bun:test"
import { computeLockoutStatus } from "./lockout"

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

describe("Lockout Computation Engine", () => {
  let mockStorage: MockStorage

  beforeEach(() => {
    mockStorage = new MockStorage()
  })

  it("reports unlocked when user ID is null or invalid", () => {
    expect(computeLockoutStatus(null, Date.now(), mockStorage)).toEqual({
      isLocked: false,
      remainingSeconds: 0,
    })
    expect(computeLockoutStatus(0, Date.now(), mockStorage)).toEqual({
      isLocked: false,
      remainingSeconds: 0,
    })
    expect(computeLockoutStatus(-1, Date.now(), mockStorage)).toEqual({
      isLocked: false,
      remainingSeconds: 0,
    })
  })

  it("reports unlocked when no lockout has been registered for user", () => {
    expect(computeLockoutStatus(1, Date.now(), mockStorage)).toEqual({
      isLocked: false,
      remainingSeconds: 0,
    })
  })

  it("calculates remaining lockout seconds accurately", () => {
    const userId = 1
    const baseTime = 1700000000000
    // Set 60s lockout
    const expiry = baseTime + 60000
    mockStorage.setItem(`factory_lockout_until_${userId}`, String(expiry))

    // At base time
    const statusAt0 = computeLockoutStatus(userId, baseTime, mockStorage)
    expect(statusAt0.isLocked).toBe(true)
    expect(statusAt0.remainingSeconds).toBe(60)

    // After 20.5 seconds
    const statusAt20 = computeLockoutStatus(userId, baseTime + 20500, mockStorage)
    expect(statusAt20.isLocked).toBe(true)
    expect(statusAt20.remainingSeconds).toBe(40) // Math.ceil(39.5) = 40

    // After 59.1 seconds (0.9s left)
    const statusAt59 = computeLockoutStatus(userId, baseTime + 59100, mockStorage)
    expect(statusAt59.isLocked).toBe(true)
    expect(statusAt59.remainingSeconds).toBe(1)
  })

  it("automatically expires and clears storage when time exceeds lockout", () => {
    const userId = 1
    const baseTime = 1700000000000
    const expiry = baseTime + 60000
    mockStorage.setItem(`factory_lockout_until_${userId}`, String(expiry))

    // At expiry exactly
    const statusAtExpiry = computeLockoutStatus(userId, expiry, mockStorage)
    expect(statusAtExpiry.isLocked).toBe(false)
    expect(statusAtExpiry.remainingSeconds).toBe(0)
    expect(mockStorage.getItem(`factory_lockout_until_${userId}`)).toBeNull()

    // Past expiry
    const statusPast = computeLockoutStatus(userId, expiry + 5000, mockStorage)
    expect(statusPast.isLocked).toBe(false)
    expect(statusPast.remainingSeconds).toBe(0)
  })

  it("maintains separate lockouts per operator ID", () => {
    const baseTime = 1700000000000
    const andresId = 1
    const aldoId = 2

    // Lock Andres for 60s
    mockStorage.setItem(`factory_lockout_until_${andresId}`, String(baseTime + 60000))

    // Andres is locked
    const andresStatus = computeLockoutStatus(andresId, baseTime, mockStorage)
    expect(andresStatus.isLocked).toBe(true)
    expect(andresStatus.remainingSeconds).toBe(60)

    // Aldo is NOT locked
    const aldoStatus = computeLockoutStatus(aldoId, baseTime, mockStorage)
    expect(aldoStatus.isLocked).toBe(false)
    expect(aldoStatus.remainingSeconds).toBe(0)

    // Now lock Aldo for 30s
    mockStorage.setItem(`factory_lockout_until_${aldoId}`, String(baseTime + 30000))

    // Both are locked with independent remaining times
    expect(computeLockoutStatus(andresId, baseTime + 10000, mockStorage).remainingSeconds).toBe(50)
    expect(computeLockoutStatus(aldoId, baseTime + 10000, mockStorage).remainingSeconds).toBe(20)
  })
})
