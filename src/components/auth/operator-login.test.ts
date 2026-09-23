import { describe, expect, it, mock } from "bun:test"
import { OPERATOR_PRESETS } from "@/config/operators"
import { ApiClient } from "@/lib/api-client"
import { saveSession, getSession, clearSession, type OperatorSession } from "@/lib/session"
import { computeLockoutStatus } from "@/lib/lockout"
import type { AuthResponse } from "@/types/api"

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

describe("Operator Authentication & Lifecycle Flow", () => {
  const BASE_URL = "http://mock-backend:8080"

  it("verifies configured operator presets match factory specification", () => {
    expect(OPERATOR_PRESETS).toHaveLength(2)
    expect(OPERATOR_PRESETS[0]).toEqual({ id: 1, name: "Andres", label: "Andres - ID 1" })
    expect(OPERATOR_PRESETS[1]).toEqual({ id: 2, name: "Aldo", label: "Aldo - ID 2" })
  })

  it("completes AUTH_OK login cycle and persists session to storage", async () => {
    const mockStorage = new MockStorage()
    const mockAuthResponse: AuthResponse = {
      status: "AUTH_OK",
      username: "Andres",
      remaining_attempts: 2,
      lockout_seconds: 0,
    }

    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url.toString()).toBe(`${BASE_URL}/api/v1/auth/login`)
      expect(init?.method).toBe("POST")
      expect(JSON.parse(init?.body as string)).toEqual({ user_id: 1, pin: "1234" })

      return new Response(JSON.stringify(mockAuthResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const resp = await client.login({ user_id: 1, pin: "1234" })

    expect(resp.status).toBe("AUTH_OK")
    expect(resp.username).toBe("Andres")

    // Simulate session persistence upon AUTH_OK
    const session: OperatorSession = {
      userId: 1,
      username: resp.username ?? "Andres",
      authenticatedAt: new Date().toISOString(),
    }
    saveSession(session, mockStorage)

    const saved = getSession(mockStorage)
    expect(saved).not.toBeNull()
    expect(saved?.userId).toBe(1)
    expect(saved?.username).toBe("Andres")

    // Simulate Sign Out
    clearSession(mockStorage)
    expect(getSession(mockStorage)).toBeNull()
  })

  it("handles INVALID_PIN status and tracks remaining attempts", async () => {
    const mockInvalidResponse: AuthResponse = {
      status: "INVALID_PIN",
      remaining_attempts: 1,
      lockout_seconds: 0,
    }

    const mockFetch = mock(async () => {
      return new Response(JSON.stringify(mockInvalidResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const resp = await client.login({ user_id: 1, pin: "9999" })

    expect(resp.status).toBe("INVALID_PIN")
    expect(resp.remaining_attempts).toBe(1)
  })

  it("handles USER_LOCKED status and enforces real-time cooldown per operator", async () => {
    const mockStorage = new MockStorage()
    const now = 1700000000000
    const mockLockedResponse: AuthResponse = {
      status: "USER_LOCKED",
      remaining_attempts: 0,
      lockout_seconds: 60,
    }

    const mockFetch = mock(async () => {
      return new Response(JSON.stringify(mockLockedResponse), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const resp = await client.login({ user_id: 1, pin: "0000" })

    expect(resp.status).toBe("USER_LOCKED")
    expect(resp.lockout_seconds).toBe(60)

    // Simulate applying lockout to storage
    mockStorage.setItem(`factory_lockout_until_1`, String(now + resp.lockout_seconds * 1000))

    // Verify operator 1 is locked for 60s
    const status1 = computeLockoutStatus(1, now, mockStorage)
    expect(status1.isLocked).toBe(true)
    expect(status1.remainingSeconds).toBe(60)

    // Verify operator 2 (Aldo) is NOT locked
    const status2 = computeLockoutStatus(2, now, mockStorage)
    expect(status2.isLocked).toBe(false)
    expect(status2.remainingSeconds).toBe(0)

    // Verify countdown advancement for operator 1
    const status1After10s = computeLockoutStatus(1, now + 10000, mockStorage)
    expect(status1After10s.isLocked).toBe(true)
    expect(status1After10s.remainingSeconds).toBe(50)

    // Verify unfreezing after 60s
    const status1After60s = computeLockoutStatus(1, now + 60000, mockStorage)
    expect(status1After60s.isLocked).toBe(false)
    expect(status1After60s.remainingSeconds).toBe(0)
  })

  it("handles USER_NOT_FOUND status for non-existent operators", async () => {
    const mockNotFoundResponse: AuthResponse = {
      status: "USER_NOT_FOUND",
      remaining_attempts: 0,
      lockout_seconds: 0,
    }

    const mockFetch = mock(async () => {
      return new Response(JSON.stringify(mockNotFoundResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const resp = await client.login({ user_id: 99, pin: "1234" })

    expect(resp.status).toBe("USER_NOT_FOUND")
  })
})
