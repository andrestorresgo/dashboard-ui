import * as React from "react"
import { TelemetryEngine, type TelemetryState, type TelemetryEngineOptions } from "@/lib/telemetry-engine"
import { normalizeMotorState } from "@/lib/telemetry"
import { TelemetryContext, type TelemetryContextValue } from "./telemetry-context-def"

export interface TelemetryProviderProps {
  children: React.ReactNode
  engineOptions?: TelemetryEngineOptions
  customEngine?: TelemetryEngine
}

export function TelemetryProvider({
  children,
  engineOptions,
  customEngine,
}: TelemetryProviderProps) {
  const [engine] = React.useState<TelemetryEngine>(
    () => customEngine || new TelemetryEngine(engineOptions)
  )
  const [telemetryState, setTelemetryState] = React.useState<TelemetryState>(() => engine.getState())

  React.useEffect(() => {
    const unsubscribe = engine.subscribe((newState) => {
      setTelemetryState(newState)
    })

    void engine.start()

    return () => {
      unsubscribe()
      engine.stop()
    }
  }, [engine])

  const refetchState = React.useCallback(async () => {
    await engine.refreshSnapshot()
  }, [engine])

  const isPaused = Boolean(telemetryState.snapshot.system_state?.is_paused)
  const motorState = normalizeMotorState(telemetryState.snapshot.system_state?.motor_state)
  const servoState = Boolean(telemetryState.snapshot.system_state?.servo_state)

  const value = React.useMemo<TelemetryContextValue>(
    () => ({
      ...telemetryState,
      isPaused,
      motorState,
      servoState,
      refetchState,
    }),
    [telemetryState, isPaused, motorState, servoState, refetchState]
  )

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}
