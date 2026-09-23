import { describe, expect, it, mock } from "bun:test"
import { ApiClient } from "@/lib/api-client"
import { ServoActuationController } from "./servo-actuation"

describe("ServoActuationController (ADR-0004, ADR-0006, ADR-0008)", () => {
  const BASE_URL = "http://mock-backend:8080"

  it("initializes with idle pending state and null error", () => {
    const controller = new ServoActuationController()
    const state = controller.getState()

    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toBe(null)
  })

  it("strictly enforces total actuation lockout when isPaused is true (ADR-0004)", async () => {
    let apiCalled = false
    const mockFetch = mock(async () => {
      apiCalled = true
      return new Response(JSON.stringify({ status: "dispatched", state: "OPEN" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client })

    await controller.commandGate("OPEN", true, false)

    expect(apiCalled).toBe(false)
    expect(controller.getState().isPending).toBe(false)
    expect(controller.getState().error).toContain("Machine Pause active")
  })

  it("dispatches servo command and enters pending acknowledgment state without optimistic toggle (ADR-0008)", async () => {
    let payloadSent: unknown = null
    const mockFetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
      payloadSent = JSON.parse(init?.body as string)
      return new Response(JSON.stringify({ status: "dispatched", state: "OPEN" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client })

    await controller.commandGate("OPEN", false, false)

    expect(payloadSent).toEqual({ state: "OPEN" })
    const state = controller.getState()
    expect(state.isPending).toBe(true)
    expect(state.pendingTarget).toBe("OPEN")
    expect(state.error).toBe(null)
  })

  it("clears pending state when authoritative telemetry frame confirms target position (ADR-0006, ADR-0008)", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "OPEN" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client })

    await controller.commandGate("OPEN", false, false)
    expect(controller.getState().isPending).toBe(true)

    // Unrelated telemetry (e.g. still CLOSED) does NOT clear pending
    controller.handleTelemetryUpdate(false)
    expect(controller.getState().isPending).toBe(true)

    // Authoritative telemetry from Board A arrives confirming OPEN (servoState: true)
    controller.handleTelemetryUpdate(true)

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toBe(null)
  })

  it("reverts and presents explanatory alert if unacknowledged within 3-second timeout window (ADR-0008)", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "OPEN" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client, timeoutMs: 40 })

    await controller.commandGate("OPEN", false, false)
    expect(controller.getState().isPending).toBe(true)

    // Wait for timeout window to expire
    await new Promise((resolve) => setTimeout(resolve, 70))

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toContain("Board A telemetry did not confirm gate position within 3.0s")
  })

  it("immediately aborts pending actuation if machine pause engages mid-flight (ADR-0004)", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "OPEN" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client })

    await controller.commandGate("OPEN", false, false)
    expect(controller.getState().isPending).toBe(true)

    // Hardware button pressed on Board B: pause activates
    controller.handlePauseUpdate(true)

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toContain("Actuation cancelled: Machine Pause engaged")
  })

  it("handles HTTP dispatch failure and reports explanatory error", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ error: "actuator publisher unavailable" }), { status: 503 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client })

    await controller.commandGate("OPEN", false, false)

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toContain("actuator publisher unavailable")
  })

  it("ignores redundant command when gate is already in the requested state", async () => {
    let apiCalled = false
    const mockFetch = mock(async () => {
      apiCalled = true
      return new Response(JSON.stringify({ status: "dispatched", state: "OPEN" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client })

    // Gate is already OPEN (true), trying to command OPEN
    await controller.commandGate("OPEN", false, true)

    expect(apiCalled).toBe(false)
    expect(controller.getState().isPending).toBe(false)
  })

  it("notifies listeners on state changes and handles unsubscribe", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "CLOSED" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new ServoActuationController({ apiClient: client })

    const updates: boolean[] = []
    const unsub = controller.subscribe((s) => {
      updates.push(s.isPending)
    })

    await controller.commandGate("CLOSED", false, true)
    controller.handleTelemetryUpdate(false)

    unsub()
    controller.clearError()

    expect(updates).toEqual([false, true, false])
  })
})
