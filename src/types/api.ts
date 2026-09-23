/**
 * API types for communication with Go backend-service.
 */

// /healthz response
export interface DatabaseStatus {
  status: "connected" | "disconnected" | "not_configured" | string
  error?: string
}

export interface MQTTStatus {
  status: "connected" | "disconnected" | "not_configured" | string
}

export interface HealthResponse {
  status: "ok" | "degraded" | string
  service: string
  database: DatabaseStatus
  mqtt: MQTTStatus
}

// /api/v1/state response
export interface SystemState {
  id: number
  is_paused: boolean
  motor_state: boolean
  servo_state: boolean
  last_telemetry_at: string | null
}

export interface ShapeCount {
  shape_id: number
  shape_name: string
  color_label: string
  live_buffer: number
  total_lifetime: number
  updated_at: string
}

export type AuthSource = "KEYPAD" | "DASHBOARD"

export type AuditStatus = "SUCCESS" | "INVALID_PIN" | "USER_LOCKED" | "USER_NOT_FOUND"

export interface AuditRecord {
  id: string
  source: AuthSource
  user_id: number | null
  status: AuditStatus
  timestamp: string
}

export interface StateSnapshot {
  system_state: SystemState | null
  shape_counts: ShapeCount[]
  recent_audits: AuditRecord[]
  mqtt_connected: boolean
}

// /api/v1/auth/login request and response
export type AuthResponseStatus = "AUTH_OK" | "INVALID_PIN" | "USER_LOCKED" | "USER_NOT_FOUND"

export interface LoginRequest {
  user_id: number
  pin: string
}

export interface AuthResponse {
  status: AuthResponseStatus
  username?: string
  remaining_attempts: number
  lockout_seconds: number
}

// /api/v1/actuator/servo request and response
export interface ServoCommandRequest {
  state?: "OPEN" | "CLOSED"
  open?: boolean
}

export interface ServoCommandResult {
  status: string
  state: string
}
