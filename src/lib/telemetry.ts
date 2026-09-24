import type { StateSnapshot, ShapeCount, SystemState, MotorSpeedState } from "@/types/api"

export const SHAPE_CIRCLE_ID = 1
export const SHAPE_TRIANGLE_ID = 2
export const SHAPE_SQUARE_ID = 3

export const MIN_LIVE_BUFFER = 0
export const MAX_LIVE_BUFFER = 5
export const ROLLOVER_BATCH_INCREMENT = 5

export function normalizeMotorState(val: unknown): MotorSpeedState {
  if (typeof val === "string") {
    const upper = val.trim().toUpperCase()
    if (upper === "MEDIUM" || upper === "2") return "MEDIUM"
    if (upper === "ON" || upper === "1" || upper === "TRUE") return "ON"
    return "OFF"
  }
  if (val === 2) return "MEDIUM"
  if (val === true || val === 1) return "ON"
  return "OFF"
}

export interface TelemetryMessage {
  is_paused: boolean
  motor_state: MotorSpeedState | boolean | number | string
  servo_state: boolean
  red_count: number
  green_count: number
  blue_count: number
}

export interface RolloverMessage {
  shape_id?: number
  shape_name?: string
  timestamp?: number
}

/**
 * Clamps buffer value between 0 and 5, treating non-finite or invalid numbers as 0.
 */
export function clampBuffer(val: number): number {
  if (typeof val !== "number" || Number.isNaN(val)) {
    return MIN_LIVE_BUFFER
  }
  if (val < MIN_LIVE_BUFFER) {
    return MIN_LIVE_BUFFER
  }
  if (val > MAX_LIVE_BUFFER) {
    return MAX_LIVE_BUFFER
  }
  return Math.floor(val)
}

/**
 * Resolves shape ID (1, 2, or 3) from shape_id or shape_name/color_label string.
 */
export function resolveShapeId(id?: number | null, name?: string | null): number | null {
  if (typeof id === "number" && id >= 1 && id <= 3) {
    return id
  }
  if (!name) {
    return null
  }
  const normalized = name.trim().toLowerCase()
  switch (normalized) {
    case "circle":
    case "red":
      return SHAPE_CIRCLE_ID
    case "triangle":
    case "green":
      return SHAPE_TRIANGLE_ID
    case "square":
    case "blue":
      return SHAPE_SQUARE_ID
    default:
      return null
  }
}

/**
 * Creates default shape count array if not yet populated.
 */
export function createDefaultShapeCounts(): ShapeCount[] {
  const now = new Date().toISOString()
  return [
    {
      shape_id: SHAPE_CIRCLE_ID,
      shape_name: "Circle",
      color_label: "RED",
      live_buffer: 0,
      total_lifetime: 0,
      updated_at: now,
    },
    {
      shape_id: SHAPE_TRIANGLE_ID,
      shape_name: "Triangle",
      color_label: "GREEN",
      live_buffer: 0,
      total_lifetime: 0,
      updated_at: now,
    },
    {
      shape_id: SHAPE_SQUARE_ID,
      shape_name: "Square",
      color_label: "BLUE",
      live_buffer: 0,
      total_lifetime: 0,
      updated_at: now,
    },
  ]
}

/**
 * Creates initial default state snapshot.
 */
export function createDefaultSnapshot(): StateSnapshot {
  return {
    system_state: {
      id: 1,
      is_paused: false,
      motor_state: "OFF",
      servo_state: false,
      last_telemetry_at: null,
    },
    shape_counts: createDefaultShapeCounts(),
    recent_audits: [],
    mqtt_connected: false,
  }
}

/**
 * Pure reducer: updates snapshot state from a factory/telemetry message.
 */
export function applyTelemetryMessage(
  prev: StateSnapshot,
  msg: TelemetryMessage
): StateSnapshot {
  const now = new Date().toISOString()

  const updatedSystemState: SystemState = {
    id: prev.system_state?.id ?? 1,
    is_paused: Boolean(msg.is_paused),
    motor_state: normalizeMotorState(msg.motor_state),
    servo_state: Boolean(msg.servo_state),
    last_telemetry_at: now,
  }

  // Ensure all 3 shapes exist
  const existingMap = new Map<number, ShapeCount>()
  for (const s of prev.shape_counts) {
    existingMap.set(s.shape_id, s)
  }

  const redShape = existingMap.get(SHAPE_CIRCLE_ID) ?? {
    shape_id: SHAPE_CIRCLE_ID,
    shape_name: "Circle",
    color_label: "RED",
    live_buffer: 0,
    total_lifetime: 0,
    updated_at: now,
  }

  const greenShape = existingMap.get(SHAPE_TRIANGLE_ID) ?? {
    shape_id: SHAPE_TRIANGLE_ID,
    shape_name: "Triangle",
    color_label: "GREEN",
    live_buffer: 0,
    total_lifetime: 0,
    updated_at: now,
  }

  const blueShape = existingMap.get(SHAPE_SQUARE_ID) ?? {
    shape_id: SHAPE_SQUARE_ID,
    shape_name: "Square",
    color_label: "BLUE",
    live_buffer: 0,
    total_lifetime: 0,
    updated_at: now,
  }

  const updatedShapes: ShapeCount[] = [
    {
      ...redShape,
      live_buffer: clampBuffer(msg.red_count),
      updated_at: now,
    },
    {
      ...greenShape,
      live_buffer: clampBuffer(msg.green_count),
      updated_at: now,
    },
    {
      ...blueShape,
      live_buffer: clampBuffer(msg.blue_count),
      updated_at: now,
    },
  ]

  return {
    ...prev,
    system_state: updatedSystemState,
    shape_counts: updatedShapes,
  }
}

/**
 * Pure reducer: updates snapshot state from a factory/rollover message.
 */
export function applyRolloverMessage(
  prev: StateSnapshot,
  msg: RolloverMessage
): StateSnapshot {
  const targetShapeId = resolveShapeId(msg.shape_id, msg.shape_name)
  if (!targetShapeId) {
    return prev
  }

  const now = new Date().toISOString()
  let modified = false

  const updatedShapes = prev.shape_counts.map((shape) => {
    if (shape.shape_id === targetShapeId) {
      modified = true
      return {
        ...shape,
        total_lifetime: shape.total_lifetime + ROLLOVER_BATCH_INCREMENT,
        live_buffer: 0,
        updated_at: now,
      }
    }
    return shape
  })

  if (!modified) {
    return prev
  }

  return {
    ...prev,
    shape_counts: updatedShapes,
  }
}
