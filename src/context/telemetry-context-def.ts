import * as React from "react"
import type { TelemetryState } from "@/lib/telemetry-engine"

export interface TelemetryContextValue extends TelemetryState {
  isPaused: boolean
  motorState: boolean
  servoState: boolean
  refetchState: () => Promise<void>
}

export const TelemetryContext = React.createContext<TelemetryContextValue | null>(null)
