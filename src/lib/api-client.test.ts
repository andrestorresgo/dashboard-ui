import { describe, expect, it, mock } from "bun:test"
import { ApiClient, ApiError } from "./api-client"
import type { HealthResponse, StateSnapshot, AuthResponse, ServoCommandResult } from "@/types/api"

describe("ApiClient", () => {
  const BASE_URL = "http://mock-backend:8080"

  it("fetches health status from /healthz", async () => {
    const mockHealth: HealthResponse = {
      status: "ok",
      service: "backend-service",
      database: { status: "connected" },
      mqtt: { status: "connected" },
    }

    const mockFetch = mock(async (url: string | URL | Request) => {
      expect(url.toString()).toBe(`${BASE_URL}/healthz`)
      return new Response(JSON.stringify(mockHealth), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const result = await client.getHealth()

    expect(result).toEqual(mockHealth)
  })

  it("fetches state snapshot from /api/v1/state", async () => {
    const mockState: StateSnapshot = {
      system_state: {
        id: 1,
        is_paused: false,
        motor_state: true,
        servo_state: false,
        last_telemetry_at: "2026-09-23T15:00:00Z",
      },
      shape_counts: [
        {
          shape_id: 1,
          shape_name: "Circle",
          color_label: "Red",
          live_buffer: 3,
          total_lifetime: 15,
          updated_at: "2026-09-23T15:00:00Z",
        },
      ],
      recent_audits: [],
      mqtt_connected: true,
    }

    const mockFetch = mock(async (url: string | URL | Request) => {
      expect(url.toString()).toBe(`${BASE_URL}/api/v1/state`)
      return new Response(JSON.stringify(mockState), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const result = await client.getState()

    expect(result).toEqual(mockState)
  })

  it("handles successful login from /api/v1/auth/login", async () => {
    const mockAuthResp: AuthResponse = {
      status: "AUTH_OK",
      username: "Andres",
      remaining_attempts: 2,
      lockout_seconds: 0,
    }

    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url.toString()).toBe(`${BASE_URL}/api/v1/auth/login`)
      expect(init?.method).toBe("POST")
      expect(JSON.parse(init?.body as string)).toEqual({ user_id: 1, pin: "1234" })
      return new Response(JSON.stringify(mockAuthResp), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const result = await client.login({ user_id: 1, pin: "1234" })

    expect(result).toEqual(mockAuthResp)
  })

  it("handles 401 INVALID_PIN and 403 USER_LOCKED login responses without throwing unhandled exceptions", async () => {
    const invalidPinResp: AuthResponse = {
      status: "INVALID_PIN",
      remaining_attempts: 1,
      lockout_seconds: 0,
    }

    let mockFetch = mock(async () => {
      return new Response(JSON.stringify(invalidPinResp), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    })

    let client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    let result = await client.login({ user_id: 1, pin: "9999" })
    expect(result.status).toBe("INVALID_PIN")
    expect(result.remaining_attempts).toBe(1)

    const lockedResp: AuthResponse = {
      status: "USER_LOCKED",
      remaining_attempts: 0,
      lockout_seconds: 60,
    }

    mockFetch = mock(async () => {
      return new Response(JSON.stringify(lockedResp), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    })

    client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    result = await client.login({ user_id: 1, pin: "9999" })
    expect(result.status).toBe("USER_LOCKED")
    expect(result.lockout_seconds).toBe(60)
  })

  it("dispatches servo command to /api/v1/actuator/servo", async () => {
    const mockResult: ServoCommandResult = {
      status: "dispatched",
      state: "OPEN",
    }

    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url.toString()).toBe(`${BASE_URL}/api/v1/actuator/servo`)
      expect(init?.method).toBe("POST")
      expect(JSON.parse(init?.body as string)).toEqual({ state: "OPEN" })
      return new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const result = await client.commandServo({ state: "OPEN" })

    expect(result).toEqual(mockResult)
  })

  it("dispatches motor command to /api/v1/actuator/motor", async () => {
    const mockResult = {
      status: "dispatched",
      state: "MEDIUM",
    }

    const mockFetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      expect(url.toString()).toBe(`${BASE_URL}/api/v1/actuator/motor`)
      expect(init?.method).toBe("POST")
      expect(JSON.parse(init?.body as string)).toEqual({ state: "MEDIUM" })
      return new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const result = await client.commandMotor({ state: "MEDIUM" })

    expect(result).toEqual(mockResult)
  })

  it("throws ApiError when server returns 500 Internal Server Error", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ error: "database connection failed" }), {
        status: 500,
        statusText: "Internal Server Error",
        headers: { "Content-Type": "application/json" },
      })
    })

    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)

    expect(client.getState()).rejects.toThrow(ApiError)
  })
})
