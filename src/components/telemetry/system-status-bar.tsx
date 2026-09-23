import * as React from "react"
import {
  Radio,
  RefreshCw,
  PowerOff,
  Zap,
  CircleSlash,
  Clock,
  Sliders,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TelemetryContext } from "@/hooks/use-telemetry"
import type { TransportMode } from "@/lib/telemetry-engine"

export interface SystemStatusBarProps {
  transportMode?: TransportMode
  wsConnected?: boolean
  isPaused?: boolean
  motorState?: boolean
  servoState?: boolean
  lastUpdated?: Date | null
  onRefresh?: () => void
  className?: string
}

export function SystemStatusBar({
  transportMode: propTransportMode,
  wsConnected: propWsConnected,
  isPaused: propIsPaused,
  motorState: propMotorState,
  servoState: propServoState,
  lastUpdated: propLastUpdated,
  onRefresh: propOnRefresh,
  className,
}: SystemStatusBarProps = {}) {
  const telemetry = React.useContext(TelemetryContext)

  const transportMode = propTransportMode ?? telemetry?.transportMode ?? "connecting"
  const isPaused = propIsPaused ?? telemetry?.isPaused ?? false
  const motorState = propMotorState ?? telemetry?.motorState ?? false
  const servoState = propServoState ?? telemetry?.servoState ?? false
  const lastUpdated = propLastUpdated ?? telemetry?.lastUpdated ?? null
  const onRefresh = propOnRefresh ?? telemetry?.refetchState
  const _wsConnected = propWsConnected ?? telemetry?.wsConnected ?? false

  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getTransportBadge = () => {
    switch (transportMode) {
      case "websocket":
        return (
          <Badge variant="default" className="gap-1.5 px-2.5 py-1" data-testid="transport-badge-ws">
            <Radio className="size-3.5 animate-pulse text-primary-foreground" />
            <span>WebSocket (Live)</span>
          </Badge>
        )
      case "polling":
        return (
          <Badge
            variant="secondary"
            className="gap-1.5 border-border/80 px-2.5 py-1 text-foreground"
            data-testid="transport-badge-polling"
          >
            <RefreshCw className="size-3.5" />
            <span>REST Polling (2.5s)</span>
          </Badge>
        )
      case "connecting":
        return (
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1" data-testid="transport-badge-connecting">
            <RefreshCw className="size-3.5 animate-spin text-muted-foreground" />
            <span>Connecting Broker...</span>
          </Badge>
        )
      case "offline":
      default:
        return (
          <Badge variant="destructive" className="gap-1.5 px-2.5 py-1" data-testid="transport-badge-offline">
            <CircleSlash className="size-3.5" />
            <span>Telemetry Offline</span>
          </Badge>
        )
    }
  }

  const getMotorBadge = () => {
    if (isPaused) {
      return (
        <Badge
          variant="destructive"
          className="gap-1.5 px-2.5 py-1 font-semibold"
          data-testid="motor-badge-paused"
        >
          <PowerOff className="size-3.5" />
          <span>HALTED / DE-ENERGIZED</span>
        </Badge>
      )
    }
    if (motorState) {
      return (
        <Badge
          variant="default"
          className="gap-1.5 px-2.5 py-1 font-semibold shadow-xs"
          data-testid="motor-badge-running"
        >
          <Zap className="size-3.5 text-primary-foreground" />
          <span>RUNNING</span>
        </Badge>
      )
    }
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 px-2.5 py-1 font-medium"
        data-testid="motor-badge-halted"
      >
        <CircleSlash className="size-3.5 text-muted-foreground" />
        <span>HALTED</span>
      </Badge>
    )
  }

  const getServoBadge = () => {
    if (isPaused) {
      return (
        <Badge variant="outline" className="gap-1.5 border-destructive/40 text-destructive">
          <CircleSlash className="size-3.5" />
          <span>LOCKED</span>
        </Badge>
      )
    }
    if (servoState) {
      return (
        <Badge variant="default" className="gap-1.5">
          <CheckCircle2 className="size-3.5" />
          <span>OPEN</span>
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <Sliders className="size-3.5" />
        <span>CLOSED</span>
      </Badge>
    )
  }

  return (
    <Card className={`border border-border/80 bg-card shadow-xs ${className || ""}`}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        {/* Left: Operational Indicators */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Motor Drive Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">DC Motor:</span>
            {getMotorBadge()}
          </div>

          {/* Servo Gate Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Servo Gate:</span>
            {getServoBadge()}
          </div>

          {/* Telemetry Stream Channel */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Transport:</span>
            {getTransportBadge()}
          </div>
        </div>

        {/* Right: Telemetry Heartbeat & Manual Refresh */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>Updated:</span>
            <span className="font-mono text-foreground font-medium">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : _wsConnected ? "Live" : "Pending"}
            </span>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="size-7 p-0"
              aria-label="Refresh telemetry snapshot"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
