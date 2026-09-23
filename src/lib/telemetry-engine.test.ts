import { describe, expect, it, beforeEach, mock } from "bun:test"
import { TelemetryEngine, type TelemetryState } from "./telemetry-engine"
import type { StateSnapshot } from "@/types/api"
import type { ApiClient } from "./api-client"
import type { MqttClient } from "mqtt"
import { EventEmitter } from "node:events"

class MockMqttClient extends EventEmitter {
  public subscribedTopics: string[] = []
  public ended = false

  subscribe(topic: string | string[], callback?: (err: Error | null) => void) {
    if (Array.isArray(topic)) {
      this.subscribedTopics.push(...topic)
    } else {
      this.subscribedTopics.push(topic)
    }
    if (callback) callback(null)
    return this
  }

  end(_force?: boolean, _opts?: unknown, callback?: () => void) {
    this.ended = true
    if (callback) callback()
    return this
  }
}

describe("TelemetryEngine", () => {
  let mockApiClient: { getState: ReturnType<typeof mock> }
  let mockMqtt: MockMqttClient

  const mockSnapshot: StateSnapshot = {
    system_state: {
      id: 1,
      is_paused: false,
      motor_state: false,
      servo_state: false,
      last_telemetry_at: "2026-09-23T16:00:00Z",
    },
    shape_counts: [
      {
        shape_id: 1,
        shape_name: "Circle",
        color_label: "RED",
        live_buffer: 0,
        total_lifetime: 10,
        updated_at: "2026-09-23T16:00:00Z",
      },
      {
        shape_id: 2,
        shape_name: "Triangle",
        color_label: "GREEN",
        live_buffer: 0,
        total_lifetime: 5,
        updated_at: "2026-09-23T16:00:00Z",
      },
      {
        shape_id: 3,
        shape_name: "Square",
        color_label: "BLUE",
        live_buffer: 0,
        total_lifetime: 15,
        updated_at: "2026-09-23T16:00:00Z",
      },
    ],
    recent_audits: [],
    mqtt_connected: true,
  }

  beforeEach(() => {
    mockApiClient = {
      getState: mock(async () => mockSnapshot),
    }
    mockMqtt = new MockMqttClient()
  })

  it("hydrates initial state via GET /api/v1/state on start", async () => {
    const engine = new TelemetryEngine({
      apiClient: mockApiClient as unknown as ApiClient,
      mqttConnect: () => mockMqtt as unknown as MqttClient,
      pollIntervalMs: 50,
    })

    const states: TelemetryState[] = []
    engine.subscribe((s) => states.push(s))

    await engine.start()

    expect(mockApiClient.getState).toHaveBeenCalledTimes(1)
    const latest = engine.getState()
    expect(latest.isHydrated).toBe(true)
    expect(latest.snapshot.system_state?.is_paused).toBe(false)
    expect(latest.snapshot.shape_counts[0].total_lifetime).toBe(10)

    engine.stop()
  })

  it("establishes MQTT subscription to factory/telemetry and factory/rollover", async () => {
    const engine = new TelemetryEngine({
      apiClient: mockApiClient as unknown as ApiClient,
      mqttConnect: () => mockMqtt as unknown as MqttClient,
      pollIntervalMs: 50,
    })

    await engine.start()
    mockMqtt.emit("connect")

    expect(mockMqtt.subscribedTopics).toContain("factory/telemetry")
    expect(mockMqtt.subscribedTopics).toContain("factory/rollover")

    const state = engine.getState()
    expect(state.wsConnected).toBe(true)
    expect(state.transportMode).toBe("websocket")

    engine.stop()
    expect(mockMqtt.ended).toBe(true)
  })

  it("decodes factory/telemetry frames and updates system state & live buffer", async () => {
    const engine = new TelemetryEngine({
      apiClient: mockApiClient as unknown as ApiClient,
      mqttConnect: () => mockMqtt as unknown as MqttClient,
    })

    await engine.start()
    mockMqtt.emit("connect")

    const telemetryPayload = Buffer.from(
      JSON.stringify({
        is_paused: true,
        motor_state: true,
        servo_state: false,
        red_count: 4,
        green_count: 2,
        blue_count: 0,
      })
    )

    mockMqtt.emit("message", "factory/telemetry", telemetryPayload)

    const state = engine.getState()
    expect(state.snapshot.system_state?.is_paused).toBe(true)
    expect(state.snapshot.system_state?.motor_state).toBe(true)
    expect(state.snapshot.system_state?.servo_state).toBe(false)

    const red = state.snapshot.shape_counts.find((s) => s.shape_id === 1)
    const green = state.snapshot.shape_counts.find((s) => s.shape_id === 2)
    expect(red?.live_buffer).toBe(4)
    expect(green?.live_buffer).toBe(2)

    engine.stop()
  })

  it("decodes factory/rollover events and updates cumulative total", async () => {
    const engine = new TelemetryEngine({
      apiClient: mockApiClient as unknown as ApiClient,
      mqttConnect: () => mockMqtt as unknown as MqttClient,
    })

    await engine.start()
    mockMqtt.emit("connect")

    const rolloverPayload = Buffer.from(
      JSON.stringify({
        shape_id: 1,
        shape_name: "Circle",
        timestamp: Date.now(),
      })
    )

    mockMqtt.emit("message", "factory/rollover", rolloverPayload)

    const state = engine.getState()
    const red = state.snapshot.shape_counts.find((s) => s.shape_id === 1)
    expect(red?.total_lifetime).toBe(15) // 10 initial + 5
    expect(red?.live_buffer).toBe(0)

    engine.stop()
  })

  it("activates 2.5s fallback polling when WebSocket is disconnected and recovers upon reconnection", async () => {
    let callCount = 0
    mockApiClient.getState = mock(async () => {
      callCount++
      return {
        ...mockSnapshot,
        system_state: {
          ...mockSnapshot.system_state!,
          is_paused: callCount > 1, // simulates change on poll
        },
      }
    })

    const engine = new TelemetryEngine({
      apiClient: mockApiClient as unknown as ApiClient,
      mqttConnect: () => mockMqtt as unknown as MqttClient,
      pollIntervalMs: 30, // speed up test interval
    })

    await engine.start()
    expect(callCount).toBe(1) // initial hydration

    // Connects via WebSocket
    mockMqtt.emit("connect")
    expect(engine.getState().transportMode).toBe("websocket")

    // WebSocket drops offline
    mockMqtt.emit("offline")
    expect(engine.getState().wsConnected).toBe(false)
    expect(engine.getState().transportMode).toBe("polling")

    // Wait for at least one polling cycle to trigger
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(callCount).toBeGreaterThan(1)
    expect(engine.getState().snapshot.system_state?.is_paused).toBe(true)

    // Reconnects via WebSocket
    mockMqtt.emit("connect")
    expect(engine.getState().wsConnected).toBe(true)
    expect(engine.getState().transportMode).toBe("websocket")

    const countAfterReconnect = callCount
    // Wait another interval: polling should NOT increment since WS is active
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(callCount).toBe(countAfterReconnect)

    engine.stop()
  })
})
