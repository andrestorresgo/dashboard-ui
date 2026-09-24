import * as React from "react"
import {
  MotorActuationController,
  type MotorActuationState,
  type MotorActuationOptions,
} from "@/lib/motor-actuation"
import type { MotorSpeedState } from "@/types/api"
import { TelemetryContext } from "@/context/telemetry-context-def"

export interface UseMotorActuationProps extends MotorActuationOptions {
  motorState?: MotorSpeedState
  isPaused?: boolean
}

export function useMotorActuation(props: UseMotorActuationProps = {}) {
  const telemetry = React.useContext(TelemetryContext)

  const motorState: MotorSpeedState = props.motorState ?? telemetry?.motorState ?? "OFF"
  const isPaused = props.isPaused ?? telemetry?.isPaused ?? false

  const [controller] = React.useState(
    () =>
      new MotorActuationController({
        apiClient: props.apiClient,
        timeoutMs: props.timeoutMs,
      })
  )

  const [state, setState] = React.useState<MotorActuationState>(() => controller.getState())

  React.useEffect(() => {
    return controller.subscribe((newState) => {
      setState(newState)
    })
  }, [controller])

  React.useEffect(() => {
    controller.handleTelemetryUpdate(motorState)
  }, [controller, motorState])

  React.useEffect(() => {
    controller.handlePauseUpdate(isPaused)
  }, [controller, isPaused])

  React.useEffect(() => {
    return () => {
      controller.destroy()
    }
  }, [controller])

  const setSpeed = React.useCallback(
    async (target: MotorSpeedState) => {
      await controller.commandMotor(target, isPaused, motorState)
    },
    [controller, isPaused, motorState]
  )

  const clearError = React.useCallback(() => {
    controller.clearError()
  }, [controller])

  return {
    ...state,
    motorState,
    isPaused,
    setSpeed,
    clearError,
  }
}
