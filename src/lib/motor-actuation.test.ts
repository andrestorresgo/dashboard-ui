import { describe, expect, it, mock } from "bun:test"
import { ApiClient } from "@/lib/api-client"
import { MotorActuationController } from "./motor-actuation"

describe("MotorActuationController (ADR-0004, ADR-0006, ADR-0008)", () => {
  const BASE_URL = "http://mock-backend:8080"

  it("initializes with idle pending state and null error", () => {
    const controller = new MotorActuationController()
    const state = controller.getState()

    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toBe(null)
  })

  it("strictly enforces total actuation lockout when isPaused is true (ADR-0004)", async () => {
    let apiCalled = false
    const mockFetch = mock(async () => {
      apiCalled = true
      return new Response(JSON.stringify({ status: "dispatched", state: "MEDIUM" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client })

    await controller.commandMotor("MEDIUM", true, "OFF")

    expect(apiCalled).toBe(false)
    expect(controller.getState().isPending).toBe(false)
    expect(controller.getState().error).toContain("Machine Pause active")
  })

  it("dispatches motor command and enters pending acknowledgment state without optimistic toggle (ADR-0008)", async () => {
    let payloadSent: unknown = null
    const mockFetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
      payloadSent = JSON.parse(init?.body as string)
      return new Response(JSON.stringify({ status: "dispatched", state: "MEDIUM" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client })

    await controller.commandMotor("MEDIUM", false, "OFF")

    expect(payloadSent).toEqual({ state: "MEDIUM" })
    const state = controller.getState()
    expect(state.isPending).toBe(true)
    expect(state.pendingTarget).toBe("MEDIUM")
    expect(state.error).toBe(null)
  })

  it("clears pending state when authoritative telemetry frame confirms target speed (ADR-0006, ADR-0008)", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "MEDIUM" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client })

    await controller.commandMotor("MEDIUM", false, "OFF")
    expect(controller.getState().isPending).toBe(true)

    // Unrelated telemetry (still OFF) does NOT clear pending
    controller.handleTelemetryUpdate("OFF")
    expect(controller.getState().isPending).toBe(true)

    // Authoritative telemetry from Board A arrives confirming MEDIUM
    controller.handleTelemetryUpdate("MEDIUM")

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toBe(null)
  })

  it("reverts and presents explanatory alert if unacknowledged within 3-second timeout window (ADR-0008)", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "ON" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client, timeoutMs: 40 })

    await controller.commandMotor("ON", false, "OFF")
    expect(controller.getState().isPending).toBe(true)

    // Wait for timeout window to expire
    await new Promise((resolve) => setTimeout(resolve, 70))

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toContain("Board A telemetry did not confirm motor speed within 3.0s")
  })

  it("immediately aborts pending actuation if machine pause engages mid-flight (ADR-0004)", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "ON" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client })

    await controller.commandMotor("ON", false, "OFF")
    expect(controller.getState().isPending).toBe(true)

    controller.handlePauseUpdate(true)

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toContain("Machine Pause engaged")
  })

  it("handles HTTP dispatch failure and reports explanatory error", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ error: "ESP-NOW link timeout to Board B" }), {
        status: 504,
        statusText: "Gateway Timeout",
      })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client })

    await controller.commandMotor("MEDIUM", false, "OFF")

    const state = controller.getState()
    expect(state.isPending).toBe(false)
    expect(state.pendingTarget).toBe(null)
    expect(state.error).toContain("Actuation Dispatch Error")
  })

  it("ignores redundant command when motor is already in requested state", async () => {
    let apiCalled = false
    const mockFetch = mock(async () => {
      apiCalled = true
      return new Response(JSON.stringify({ status: "dispatched", state: "MEDIUM" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client })

    await controller.commandMotor("MEDIUM", false, "MEDIUM")

    expect(apiCalled).toBe(false)
    expect(controller.getState().isPending).toBe(false)
  })

  it("notifies listeners on state changes and handles unsubscribe", async () => {
    const mockFetch = mock(async () => {
      return new Response(JSON.stringify({ status: "dispatched", state: "OFF" }), { status: 200 })
    })
    const client = new ApiClient(BASE_URL, mockFetch as unknown as typeof fetch)
    const controller = new MotorActuationController({ apiClient: client })

    const snapshots: boolean[] = []
    const unsub = controller.subscribe((s) => {
      snapshots.push(s.isPending)
    })

    await controller.commandMotor("OFF", false, "ON")
    controller.handleTelemetryUpdate("OFF")
    unsub()

    await controller.commandMotor("ON", false, "OFF")
    // Subscriber was unsubscribed, so snapshot count stops
    expect(snapshots).toEqual([false, true, false])
  })
})
