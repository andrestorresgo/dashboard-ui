import * as React from "react"
import { TelemetryContext, type TelemetryContextValue } from "@/context/telemetry-context-def"

export function useTelemetry(): TelemetryContextValue {
  const context = React.useContext(TelemetryContext)
  if (!context) {
    throw new Error("useTelemetry must be used within a TelemetryProvider")
  }
  return context
}

export { TelemetryContext, type TelemetryContextValue }
