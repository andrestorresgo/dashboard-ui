import * as React from "react"
import type { TelemetryState } from "@/lib/telemetry-engine"
import type { MotorSpeedState } from "@/types/api"

export interface TelemetryContextValue extends TelemetryState {
  isPaused: boolean
  motorState: MotorSpeedState
  servoState: boolean
  refetchState: () => Promise<void>
}

export const TelemetryContext = React.createContext<TelemetryContextValue | null>(null)
