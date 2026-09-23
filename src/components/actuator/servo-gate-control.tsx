import * as React from "react"
import {
  Sliders,
  CheckCircle2,
  CircleSlash,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  X,
  Info,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useServoActuation, type UseServoActuationProps } from "@/hooks/use-servo-actuation"
import type { ServoGatePosition } from "@/lib/servo-actuation"

export interface ServoGateControlProps extends UseServoActuationProps {
  initialError?: string
  initialPending?: boolean
  initialPendingTarget?: ServoGatePosition
  className?: string
}

export function ServoGateControl({
  servoState: propServoState,
  isPaused: propIsPaused,
  apiClient,
  timeoutMs,
  initialError,
  initialPending,
  initialPendingTarget,
  className,
}: ServoGateControlProps = {}) {
  const {
    servoState,
    isPaused,
    isPending: hookIsPending,
    pendingTarget: hookPendingTarget,
    error: hookError,
    toggleGate,
    clearError: hookClearError,
  } = useServoActuation({
    servoState: propServoState,
    isPaused: propIsPaused,
    apiClient,
    timeoutMs,
  })

  // Props override hook state if provided (useful for direct testing and deterministic rendering)
  const isPending = initialPending ?? hookIsPending
  const pendingTarget = initialPendingTarget ?? hookPendingTarget
  const [localDismissedError, setLocalDismissedError] = React.useState<string | null>(null)

  const activeError =
    (initialError || hookError) === localDismissedError ? null : initialError || hookError

  const handleClearError = () => {
    if (activeError) {
      setLocalDismissedError(activeError)
    }
    hookClearError()
  }

  const handleCheckedChange = async (checked: boolean) => {
    if (isPaused || isPending) return
    const targetState: ServoGatePosition = checked ? "OPEN" : "CLOSED"
    await toggleGate(targetState)
  }

  const getHeaderBadge = () => {
    if (isPaused) {
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-destructive/40 bg-destructive/10 text-destructive font-medium"
          data-testid="servo-gate-badge-paused"
        >
          <CircleSlash className="size-3.5" />
          <span>LOCKED (Pause Active)</span>
        </Badge>
      )
    }
    if (isPending) {
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 border-primary/40 bg-primary/10 text-primary font-medium"
          data-testid="servo-gate-badge-pending"
        >
          <Loader2 className="size-3.5 animate-spin" />
          <span>{`Awaiting Board A (${pendingTarget})...`}</span>
        </Badge>
      )
    }
    if (servoState) {
      return (
        <Badge
          variant="default"
          className="gap-1.5 shadow-xs"
          data-testid="servo-gate-badge-open"
        >
          <CheckCircle2 className="size-3.5" />
          <span>GATE OPEN</span>
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="gap-1.5 text-muted-foreground"
        data-testid="servo-gate-badge-closed"
      >
        <Sliders className="size-3.5" />
        <span>GATE CLOSED</span>
      </Badge>
    )
  }

  const tooltipText = isPaused
    ? "Actuator Lockout: Servo gate actuation is disabled while Machine Pause is active."
    : isPending
      ? `Awaiting verified telemetry confirmation from Board A (${pendingTarget})...`
      : `Click to ${servoState ? "CLOSE" : "OPEN"} the physical sorting servo gate.`

  return (
    <Card className={`border border-border/80 bg-card shadow-xs ${className || ""}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sliders className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Authoritative Servo Gate Actuation
              </CardTitle>
            </div>
          </div>
          {getHeaderBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Interactive Actuation Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Sorting Servo Gate Position
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                [GPIO / PWM Servo]
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPaused
                ? "Physical actuation disabled. Hardware interlock de-energizes actuators during Machine Pause."
                : isPending
                  ? `Dispatching command to set gate ${pendingTarget}. Awaiting Board A telemetry confirmation (3.0s window)...`
                  : `Gate position is currently ${servoState ? "OPEN (Diverting geometric shapes)" : "CLOSED (Direct conveyor path)"}.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              {servoState ? "OPEN" : "CLOSED"}
            </span>

            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={`inline-flex items-center ${isPaused || isPending ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                  />
                }
              >
                <Switch
                  checked={servoState}
                  disabled={isPaused || isPending}
                  onCheckedChange={handleCheckedChange}
                  aria-label="Toggle sorting servo gate position"
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                {tooltipText}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Pending Acknowledgment Banner */}
        {isPending && (
          <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <div className="flex-1">
              <span className="font-semibold text-primary">Acknowledgment Pending:</span>{" "}
              Dispatched <code className="font-mono text-xs">POST /api/v1/actuator/servo</code> ({pendingTarget}). Holding visual position until authoritative Board A heartbeat arrives.
            </div>
          </div>
        )}

        {/* Explanatory Safety Alert on Pause */}
        {isPaused && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <ShieldAlert className="size-4 shrink-0" />
            <div>
              <span className="font-semibold">Actuator Lockout:</span> Servo gate actuation is halted. Push button on Board B must be toggled to resume remote actuation.
            </div>
          </div>
        )}

        {/* Explanatory Alert (Timeout or Dispatch Error) */}
        {activeError && (
          <Alert variant="destructive" className="relative pr-9 text-xs">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-semibold">Actuation Alert</AlertTitle>
            <AlertDescription className="text-xs">
              {activeError}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearError}
              className="absolute right-2 top-2 size-6 p-0 hover:bg-destructive/20 text-destructive"
              aria-label="Dismiss actuation alert"
            >
              <X className="size-3.5" />
            </Button>
          </Alert>
        )}

        {/* Operational Specs Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Info className="size-3 text-muted-foreground" />
            <span>Endpoint: <span className="font-mono text-foreground font-medium">POST /api/v1/actuator/servo</span></span>
          </div>
          <div>
            <span>Acknowledgment Window: <span className="font-mono text-foreground font-medium">3.0s Timeout</span></span>
          </div>
          <div>
            <span>Authoritative Source: <span className="font-mono text-foreground font-medium">Board A Telemetry</span></span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
