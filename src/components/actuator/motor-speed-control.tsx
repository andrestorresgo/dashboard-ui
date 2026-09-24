import * as React from "react"
import {
  PowerOff,
  Zap,
  Gauge,
  CircleSlash,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  X,
  Info,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useMotorActuation, type UseMotorActuationProps } from "@/hooks/use-motor-actuation"
import type { MotorSpeedState } from "@/types/api"

export interface MotorSpeedControlProps extends UseMotorActuationProps {
  initialError?: string
  initialPending?: boolean
  initialPendingTarget?: MotorSpeedState
  className?: string
}

const SPEED_OPTIONS: Array<{
  state: MotorSpeedState
  label: string
  dutyLabel: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  {
    state: "OFF",
    label: "OFF",
    dutyLabel: "0% Duty",
    icon: PowerOff,
    description: "De-energize conveyor motor (0% PWM duty cycle).",
  },
  {
    state: "MEDIUM",
    label: "MEDIUM",
    dutyLabel: "50% Duty",
    icon: Gauge,
    description: "Run conveyor motor at moderate sorting speed (50% PWM duty cycle).",
  },
  {
    state: "ON",
    label: "ON",
    dutyLabel: "80% Duty",
    icon: Zap,
    description: "Run conveyor motor at standard conveyor speed (80% PWM duty cycle).",
  },
]

export function MotorSpeedControl({
  motorState: propMotorState,
  isPaused: propIsPaused,
  apiClient,
  timeoutMs,
  initialError,
  initialPending,
  initialPendingTarget,
  className,
}: MotorSpeedControlProps = {}) {
  const {
    motorState,
    isPaused,
    isPending: hookIsPending,
    pendingTarget: hookPendingTarget,
    error: hookError,
    setSpeed,
    clearError: hookClearError,
  } = useMotorActuation({
    motorState: propMotorState,
    isPaused: propIsPaused,
    apiClient,
    timeoutMs,
  })

  // Props override hook state if provided (useful for deterministic rendering & unit tests)
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

  const handleSelectSpeed = async (target: MotorSpeedState) => {
    if (isPaused || isPending || motorState === target) return
    await setSpeed(target)
  }

  const getHeaderBadge = () => {
    if (isPaused) {
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-destructive/40 bg-destructive/10 text-destructive font-medium"
          data-testid="motor-control-badge-paused"
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
          data-testid="motor-control-badge-pending"
        >
          <Loader2 className="size-3.5 animate-spin" />
          <span>{`Awaiting Board A (${pendingTarget})...`}</span>
        </Badge>
      )
    }
    if (motorState === "ON") {
      return (
        <Badge
          variant="default"
          className="gap-1.5 shadow-xs"
          data-testid="motor-control-badge-on"
        >
          <Zap className="size-3.5" />
          <span>MOTOR ON (80% Speed)</span>
        </Badge>
      )
    }
    if (motorState === "MEDIUM") {
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 border-amber-500/30 text-amber-500 font-medium shadow-xs"
          data-testid="motor-control-badge-medium"
        >
          <Gauge className="size-3.5" />
          <span>MEDIUM (50% Speed)</span>
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="gap-1.5 text-muted-foreground"
        data-testid="motor-control-badge-off"
      >
        <CircleSlash className="size-3.5" />
        <span>MOTOR OFF (0% Speed)</span>
      </Badge>
    )
  }

  return (
    <Card className={`border border-border/80 bg-card shadow-xs ${className || ""}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Gauge className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Authoritative DC Conveyor Motor Control
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
                Conveyor Drive Operational Speed
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                [L298N / PWM GPIO]
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPaused
                ? "Physical actuation disabled. Hardware interlock de-energizes motor during Machine Pause."
                : isPending
                  ? `Dispatching command to set motor ${pendingTarget}. Awaiting Board A telemetry confirmation (3.0s window)...`
                  : `Conveyor speed is currently ${motorState === "ON" ? "ON (80% PWM standard feed)" : motorState === "MEDIUM" ? "MEDIUM (50% PWM sorting feed)" : "OFF (0% PWM halted)"}.`}
            </p>
          </div>

          {/* 3-State Segmented Speed Controller */}
          <div className="flex items-center gap-2">
            {SPEED_OPTIONS.map((opt) => {
              const isSelected = motorState === opt.state
              const Icon = opt.icon
              const testId = `motor-btn-${opt.state.toLowerCase()}`

              return (
                <Tooltip key={opt.state}>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? (opt.state === "ON" ? "default" : opt.state === "MEDIUM" ? "secondary" : "outline") : "outline"}
                        disabled={isPaused || isPending}
                        onClick={() => void handleSelectSpeed(opt.state)}
                        className={`gap-1.5 px-3 py-1.5 text-xs transition-all ${
                          isSelected
                            ? opt.state === "ON"
                              ? "shadow-sm font-semibold"
                              : opt.state === "MEDIUM"
                                ? "border-amber-500/50 bg-amber-500/15 text-amber-500 font-semibold"
                                : "border-border/80 bg-accent text-accent-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground opacity-80"
                        } ${isPaused || isPending ? "cursor-not-allowed opacity-60" : ""}`}
                        data-testid={testId}
                        aria-pressed={isSelected}
                      >
                        <Icon className="size-3.5" />
                        <span className="font-semibold">{opt.label}</span>
                        <span className="font-mono text-[10px] opacity-75">({opt.dutyLabel})</span>
                      </Button>
                    }
                  />
                  <TooltipContent className="max-w-xs text-xs">
                    {isPaused
                      ? "Actuator Lockout: Motor control is disabled while Machine Pause is active."
                      : isPending
                        ? `Awaiting verified telemetry confirmation from Board A (${pendingTarget})...`
                        : opt.description}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>

        {/* Pending Acknowledgment Banner */}
        {isPending && (
          <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <div className="flex-1">
              <span className="font-semibold text-primary">Acknowledgment Pending:</span>{" "}
              Dispatched <code className="font-mono text-xs">POST /api/v1/actuator/motor</code> ({pendingTarget}). Holding visual state until authoritative Board A heartbeat arrives.
            </div>
          </div>
        )}

        {/* Explanatory Safety Alert on Pause */}
        {isPaused && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <ShieldAlert className="size-4 shrink-0" />
            <div>
              <span className="font-semibold">Actuator Lockout:</span> Conveyor motor speed actuation is halted. Push button on Board B must be toggled to resume remote actuation.
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
            <span>Endpoint: <span className="font-mono text-foreground font-medium">POST /api/v1/actuator/motor</span></span>
          </div>
          <div>
            <span>States: <span className="font-mono text-foreground font-medium">OFF (0%), MEDIUM (50%), ON (80%)</span></span>
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
