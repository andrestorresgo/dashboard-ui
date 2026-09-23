import * as React from "react"
import { OctagonAlert, ShieldAlert } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { TelemetryContext } from "@/hooks/use-telemetry"

export interface MachinePauseBannerProps {
  /**
   * Optional manual override. If not specified, reads from useTelemetry context.
   */
  isPaused?: boolean
  className?: string
}

export function MachinePauseBanner({ isPaused: explicitIsPaused, className }: MachinePauseBannerProps = {}) {
  const telemetry = React.useContext(TelemetryContext)
  const isPaused = explicitIsPaused !== undefined ? explicitIsPaused : (telemetry?.isPaused ?? false)

  if (!isPaused) {
    return null
  }

  return (
    <Alert
      variant="destructive"
      role="alert"
      data-testid="machine-pause-banner"
      className={`border-destructive/40 bg-destructive/10 text-destructive shadow-sm ${className || ""}`}
    >
      <OctagonAlert className="size-5 shrink-0 animate-pulse text-destructive" />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AlertTitle className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-destructive">
            <span>EMERGENCY SAFETY HALT: Machine Pause Active</span>
          </AlertTitle>
          <AlertDescription className="text-xs text-destructive/90 sm:text-sm">
            Physical emergency push-button engaged on Actuator (Board B). DC conveyor motor is de-energized,
            servo gate is locked, and sorting counters are halted.
          </AlertDescription>
        </div>
        <div className="mt-2 shrink-0 sm:mt-0">
          <Badge variant="destructive" className="gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider">
            <ShieldAlert className="size-3.5" />
            <span>Lockout Active</span>
          </Badge>
        </div>
      </div>
    </Alert>
  )
}
