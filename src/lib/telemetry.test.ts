import { describe, expect, it } from "bun:test"
import {
  applyTelemetryMessage,
  applyRolloverMessage,
  applyActionMessage,
  clampBuffer,
  createDefaultSnapshot,
  resolveShapeId,
  normalizeMotorState,
  type TelemetryMessage,
  type RolloverMessage,
} from "./telemetry"
import type { StateSnapshot, ActionRecord } from "@/types/api"

describe("normalizeMotorState", () => {
  it("normalizes boolean values correctly", () => {
    expect(normalizeMotorState(true)).toBe("ON")
    expect(normalizeMotorState(false)).toBe("OFF")
  })

  it("normalizes integer values correctly", () => {
    expect(normalizeMotorState(0)).toBe("OFF")
    expect(normalizeMotorState(1)).toBe("ON")
    expect(normalizeMotorState(2)).toBe("MEDIUM")
  })

  it("normalizes string values case-insensitively", () => {
    expect(normalizeMotorState("off")).toBe("OFF")
    expect(normalizeMotorState("OFF")).toBe("OFF")
    expect(normalizeMotorState("medium")).toBe("MEDIUM")
    expect(normalizeMotorState("MEDIUM")).toBe("MEDIUM")
    expect(normalizeMotorState("on")).toBe("ON")
    expect(normalizeMotorState("ON")).toBe("ON")
    expect(normalizeMotorState("true")).toBe("ON")
  })

  it("defaults unknown or null values to OFF", () => {
    expect(normalizeMotorState(null)).toBe("OFF")
    expect(normalizeMotorState(undefined)).toBe("OFF")
    expect(normalizeMotorState("unknown")).toBe("OFF")
  })
})

describe("clampBuffer", () => {
  it("clamps values between 0 and 5", () => {
    expect(clampBuffer(-5)).toBe(0)
    expect(clampBuffer(0)).toBe(0)
    expect(clampBuffer(3)).toBe(3)
    expect(clampBuffer(5)).toBe(5)
    expect(clampBuffer(6)).toBe(5)
    expect(clampBuffer(100)).toBe(5)
  })

  it("handles non-finite or NaN values gracefully", () => {
    expect(clampBuffer(NaN)).toBe(0)
    expect(clampBuffer(Number.POSITIVE_INFINITY)).toBe(5)
    expect(clampBuffer(Number.NEGATIVE_INFINITY)).toBe(0)
  })
})

describe("resolveShapeId", () => {
  it("resolves by direct valid shape id", () => {
    expect(resolveShapeId(1)).toBe(1)
    expect(resolveShapeId(2)).toBe(2)
    expect(resolveShapeId(3)).toBe(3)
  })

  it("resolves by shape name or color string case-insensitively", () => {
    expect(resolveShapeId(undefined, "circle")).toBe(1)
    expect(resolveShapeId(undefined, "RED")).toBe(1)
    expect(resolveShapeId(undefined, "Triangle")).toBe(2)
    expect(resolveShapeId(undefined, "green")).toBe(2)
    expect(resolveShapeId(undefined, "Square")).toBe(3)
    expect(resolveShapeId(undefined, "blue")).toBe(3)
  })

  it("returns null for unknown inputs", () => {
    expect(resolveShapeId(99)).toBe(null)
    expect(resolveShapeId(undefined, "hexagon")).toBe(null)
    expect(resolveShapeId(undefined, "")).toBe(null)
  })
})

describe("applyTelemetryMessage", () => {
  it("updates system state and live buffer counts accurately", () => {
    const initial = createDefaultSnapshot()
    const telemetryMsg: TelemetryMessage = {
      is_paused: false,
      motor_state: true,
      servo_state: true,
      red_count: 3,
      green_count: 5,
      blue_count: 1,
    }

    const updated = applyTelemetryMessage(initial, telemetryMsg)

    expect(updated.system_state?.is_paused).toBe(false)
    expect(updated.system_state?.motor_state).toBe("ON")
    expect(updated.system_state?.servo_state).toBe(true)
    expect(updated.system_state?.last_telemetry_at).toBeTruthy()

    // Shapes: Circle (1), Triangle (2), Square (3)
    const red = updated.shape_counts.find((s) => s.shape_id === 1)
    const green = updated.shape_counts.find((s) => s.shape_id === 2)
    const blue = updated.shape_counts.find((s) => s.shape_id === 3)

    expect(red?.live_buffer).toBe(3)
    expect(green?.live_buffer).toBe(5)
    expect(blue?.live_buffer).toBe(1)
  })

  it("updates motor_state to MEDIUM when receiving medium telemetry", () => {
    const initial = createDefaultSnapshot()
    const telemetryMsg: TelemetryMessage = {
      is_paused: false,
      motor_state: "MEDIUM",
      servo_state: false,
      red_count: 1,
      green_count: 2,
      blue_count: 3,
    }

    const updated = applyTelemetryMessage(initial, telemetryMsg)
    expect(updated.system_state?.motor_state).toBe("MEDIUM")
  })

  it("clamps incoming counts that exceed the 5-item buffer constraint", () => {
    const initial = createDefaultSnapshot()
    const telemetryMsg: TelemetryMessage = {
      is_paused: true,
      motor_state: false,
      servo_state: false,
      red_count: 12,
      green_count: -1,
      blue_count: 4,
    }

    const updated = applyTelemetryMessage(initial, telemetryMsg)

    expect(updated.system_state?.is_paused).toBe(true)
    expect(updated.system_state?.motor_state).toBe("OFF")
    expect(updated.system_state?.servo_state).toBe(false)

    const red = updated.shape_counts.find((s) => s.shape_id === 1)
    const green = updated.shape_counts.find((s) => s.shape_id === 2)
    const blue = updated.shape_counts.find((s) => s.shape_id === 3)

    expect(red?.live_buffer).toBe(5)
    expect(green?.live_buffer).toBe(0)
    expect(blue?.live_buffer).toBe(4)
  })

  it("preserves total_lifetime and recent audits when telemetry is applied", () => {
    const initial: StateSnapshot = {
      system_state: {
        id: 1,
        is_paused: false,
        motor_state: true,
        servo_state: false,
        last_telemetry_at: null,
      },
      shape_counts: [
        {
          shape_id: 1,
          shape_name: "Circle",
          color_label: "RED",
          live_buffer: 0,
          total_lifetime: 25,
          updated_at: "2026-09-23T16:00:00Z",
        },
      ],
      recent_audits: [
        {
          id: "audit-1",
          source: "KEYPAD",
          user_id: 1,
          status: "SUCCESS",
          timestamp: "2026-09-23T16:00:00Z",
        },
      ],
      recent_actions: [],
      mqtt_connected: true,
    }

    const updated = applyTelemetryMessage(initial, {
      is_paused: false,
      motor_state: true,
      servo_state: true,
      red_count: 2,
      green_count: 0,
      blue_count: 0,
    })

    const red = updated.shape_counts.find((s) => s.shape_id === 1)
    expect(red?.total_lifetime).toBe(25)
    expect(red?.live_buffer).toBe(2)
    expect(updated.recent_audits.length).toBe(1)
  })
})

describe("applyRolloverMessage", () => {
  it("increments total_lifetime by 5 and resets live buffer for matched shape id", () => {
    const initial: StateSnapshot = {
      system_state: null,
      shape_counts: [
        {
          shape_id: 1,
          shape_name: "Circle",
          color_label: "RED",
          live_buffer: 5,
          total_lifetime: 20,
          updated_at: "2026-09-23T16:00:00Z",
        },
        {
          shape_id: 2,
          shape_name: "Triangle",
          color_label: "GREEN",
          live_buffer: 2,
          total_lifetime: 10,
          updated_at: "2026-09-23T16:00:00Z",
        },
      ],
      recent_audits: [],
      recent_actions: [],
      mqtt_connected: true,
    }

    const rolloverMsg: RolloverMessage = {
      shape_id: 1,
      shape_name: "Circle",
      timestamp: Date.now(),
    }

    const updated = applyRolloverMessage(initial, rolloverMsg)

    const circle = updated.shape_counts.find((s) => s.shape_id === 1)
    const triangle = updated.shape_counts.find((s) => s.shape_id === 2)

    expect(circle?.total_lifetime).toBe(25)
    expect(circle?.live_buffer).toBe(0)
    expect(triangle?.total_lifetime).toBe(10)
    expect(triangle?.live_buffer).toBe(2)
  })

  it("resolves shape by shape_name when shape_id is 0 or missing", () => {
    const initial = createDefaultSnapshot()
    const rolloverMsg: RolloverMessage = {
      shape_id: 0,
      shape_name: "Triangle",
      timestamp: Date.now(),
    }

    const updated = applyRolloverMessage(initial, rolloverMsg)

    const triangle = updated.shape_counts.find((s) => s.shape_id === 2)
    expect(triangle?.total_lifetime).toBe(5)
    expect(triangle?.live_buffer).toBe(0)
  })

  it("leaves snapshot unchanged if shape cannot be resolved", () => {
    const initial = createDefaultSnapshot()
    const rolloverMsg: RolloverMessage = {
      shape_id: 999,
      shape_name: "UnknownHexagon",
    }

    const updated = applyRolloverMessage(initial, rolloverMsg)
    expect(updated).toEqual(initial)
  })
})

describe("applyActionMessage", () => {
  it("prepends incoming action record to recent_actions", () => {
    const initial = createDefaultSnapshot()
    const action1: ActionRecord = {
      id: "act-1",
      action_type: "SERVO",
      action_name: "SERVO_OPEN",
      details: "Dispensed Circle",
      source: "DASHBOARD",
      timestamp: "2026-09-24T01:00:00Z",
    }
    const action2: ActionRecord = {
      id: "act-2",
      action_type: "MOTOR",
      action_name: "MOTOR_ON",
      details: "Conveyor started",
      source: "HARDWARE",
      timestamp: "2026-09-24T01:01:00Z",
    }

    const state1 = applyActionMessage(initial, action1)
    expect(state1.recent_actions?.length).toBe(1)
    expect(state1.recent_actions?.[0].id).toBe("act-1")

    const state2 = applyActionMessage(state1, action2)
    expect(state2.recent_actions?.length).toBe(2)
    expect(state2.recent_actions?.[0].id).toBe("act-2")
    expect(state2.recent_actions?.[1].id).toBe("act-1")
  })

  it("deduplicates action records with the same id", () => {
    const initial = createDefaultSnapshot()
    const action: ActionRecord = {
      id: "act-dup",
      action_type: "DETECTION",
      action_name: "FIGURE_DETECTED",
      details: "Detected Red Circle",
      source: "VISION",
      timestamp: "2026-09-24T01:00:00Z",
    }

    const state1 = applyActionMessage(initial, action)
    const state2 = applyActionMessage(state1, action)
    expect(state2.recent_actions?.length).toBe(1)
    expect(state2).toBe(state1)
  })

  it("respects maxRetention limit by truncating older actions", () => {
    let state = createDefaultSnapshot()
    for (let i = 0; i < 10; i++) {
      state = applyActionMessage(
        state,
        {
          id: `act-${i}`,
          action_type: "MOTOR",
          action_name: "MOTOR_ON",
          details: `Motor step ${i}`,
          source: "HARDWARE",
          timestamp: `2026-09-24T01:0${i}:00Z`,
        },
        5 // retention limit of 5
      )
    }

    expect(state.recent_actions?.length).toBe(5)
    // Most recent was act-9, oldest kept should be act-5
    expect(state.recent_actions?.[0].id).toBe("act-9")
    expect(state.recent_actions?.[4].id).toBe("act-5")
  })
})

describe("createDefaultSnapshot", () => {
  it("initializes recent_actions as empty array", () => {
    const snapshot = createDefaultSnapshot()
    expect(snapshot.recent_actions).toBeDefined()
    expect(Array.isArray(snapshot.recent_actions)).toBe(true)
    expect(snapshot.recent_actions?.length).toBe(0)
  })
})

