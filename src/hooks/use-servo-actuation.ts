import * as React from "react"
import {
  ServoActuationController,
  type ServoGatePosition,
  type ServoActuationState,
  type ServoActuationOptions,
} from "@/lib/servo-actuation"
import { TelemetryContext } from "@/context/telemetry-context-def"

export interface UseServoActuationProps extends ServoActuationOptions {
  servoState?: boolean
  isPaused?: boolean
}

export function useServoActuation(props: UseServoActuationProps = {}) {
  const telemetry = React.useContext(TelemetryContext)

  const servoState = props.servoState ?? telemetry?.servoState ?? false
  const isPaused = props.isPaused ?? telemetry?.isPaused ?? false

  const [controller] = React.useState(
    () =>
      new ServoActuationController({
        apiClient: props.apiClient,
        timeoutMs: props.timeoutMs,
      })
  )

  const [state, setState] = React.useState<ServoActuationState>(() => controller.getState())

  React.useEffect(() => {
    return controller.subscribe((newState) => {
      setState(newState)
    })
  }, [controller])

  React.useEffect(() => {
    controller.handleTelemetryUpdate(servoState)
  }, [controller, servoState])

  React.useEffect(() => {
    controller.handlePauseUpdate(isPaused)
  }, [controller, isPaused])

  React.useEffect(() => {
    return () => {
      controller.destroy()
    }
  }, [controller])

  const toggleGate = React.useCallback(
    async (targetOverride?: ServoGatePosition | boolean) => {
      let target: ServoGatePosition
      if (typeof targetOverride === "string") {
        target = targetOverride
      } else if (typeof targetOverride === "boolean") {
        target = targetOverride ? "OPEN" : "CLOSED"
      } else {
        target = servoState ? "CLOSED" : "OPEN"
      }

      await controller.commandGate(target, isPaused, servoState)
    },
    [controller, isPaused, servoState]
  )

  const clearError = React.useCallback(() => {
    controller.clearError()
  }, [controller])

  return {
    ...state,
    servoState,
    isPaused,
    toggleGate,
    clearError,
  }
}
