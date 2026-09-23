import { config } from "@/config/env"
import type {
  HealthResponse,
  StateSnapshot,
  LoginRequest,
  AuthResponse,
  ServoCommandRequest,
  ServoCommandResult,
} from "@/types/api"

export class ApiError extends Error {
  public status: number
  public statusText: string
  public data: unknown

  constructor(status: number, statusText: string, data: unknown, message?: string) {
    super(message || `API Error ${status}: ${statusText}`)
    this.name = "ApiError"
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

export class ApiClient {
  private baseUrl: string
  private fetchFn: typeof fetch

  constructor(baseUrl?: string, fetchFn?: typeof fetch) {
    this.baseUrl = (baseUrl || config.apiUrl).replace(/\/+$/, "")
    this.fetchFn = fetchFn || (typeof window !== "undefined" ? window.fetch.bind(window) : fetch)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`
    const headers = new Headers(init?.headers)

    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json")
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json")
    }

    const response = await this.fetchFn(url, {
      ...init,
      headers,
    })

    if (!response.ok) {
      let errorData: unknown
      try {
        errorData = await response.json()
      } catch {
        errorData = await response.text()
      }
      const errMsg =
        typeof errorData === "object" && errorData !== null && "error" in errorData
          ? String((errorData as { error: unknown }).error)
          : response.statusText

      throw new ApiError(response.status, response.statusText, errorData, errMsg)
    }

    return (await response.json()) as T
  }

  /**
   * Probes system health from GET /healthz
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/healthz")
  }

  /**
   * Retrieves full state snapshot from GET /api/v1/state
   */
  async getState(): Promise<StateSnapshot> {
    return this.request<StateSnapshot>("/api/v1/state")
  }

  /**
   * Performs operator authentication via POST /api/v1/auth/login.
   * Handles semantic HTTP status responses (200, 401, 403, 404) gracefully.
   */
  async login(req: LoginRequest): Promise<AuthResponse> {
    const url = `${this.baseUrl}/api/v1/auth/login`
    const response = await this.fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(req),
    })

    // 200 (AUTH_OK), 401 (INVALID_PIN), 403 (USER_LOCKED), 404 (USER_NOT_FOUND)
    // all carry structured AuthResponse bodies from Go backend.
    if ([200, 401, 403, 404].includes(response.status)) {
      try {
        return (await response.json()) as AuthResponse
      } catch {
        // Fallback if body parsing failed
      }
    }

    let errorData: unknown
    try {
      errorData = await response.json()
    } catch {
      errorData = await response.text()
    }
    const errMsg =
      typeof errorData === "object" && errorData !== null && "error" in errorData
        ? String((errorData as { error: unknown }).error)
        : response.statusText

    throw new ApiError(response.status, response.statusText, errorData, errMsg)
  }

  /**
   * Commands the physical sorting servo gate via POST /api/v1/actuator/servo.
   */
  async commandServo(req: ServoCommandRequest): Promise<ServoCommandResult> {
    return this.request<ServoCommandResult>("/api/v1/actuator/servo", {
      method: "POST",
      body: JSON.stringify(req),
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
