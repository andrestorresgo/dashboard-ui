import * as React from "react"
import {
  Activity,
  Database,
  Radio,
  RefreshCw,
  Server,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserCheck,
  LogOut,
  Lock,
} from "lucide-react"

import { apiClient, ApiError } from "@/lib/api-client"
import { config } from "@/config/env"
import type { HealthResponse } from "@/types/api"
import type { OperatorSession } from "@/lib/session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/components/theme-provider"

type ProbeStatus = "checking" | "connected" | "degraded" | "disconnected"

export interface ConnectivityHeaderProps {
  session?: OperatorSession | null
  onSignOut?: () => void
}

export function ConnectivityHeader({ session, onSignOut }: ConnectivityHeaderProps = {}) {
  const { theme, setTheme } = useTheme()
  const [health, setHealth] = React.useState<HealthResponse | null>(null)
  const [status, setStatus] = React.useState<ProbeStatus>("checking")
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false)
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const probeConnectivity = React.useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true)
    }
    try {
      const data = await apiClient.getHealth()
      setErrorMessage(null)
      setHealth(data)
      setLastChecked(new Date())

      if (data.status === "ok") {
        setStatus("connected")
      } else {
        setStatus("degraded")
      }
    } catch (err: unknown) {
      setStatus("disconnected")
      setHealth(null)
      setLastChecked(new Date())
      if (err instanceof ApiError) {
        setErrorMessage(`Backend returned HTTP ${err.status}: ${err.message}`)
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage("Failed to connect to Go backend service")
      }
    } finally {
      if (showRefreshing) {
        setIsRefreshing(false)
      }
    }
  }, [])

  React.useEffect(() => {
    // Initial probe on mount
    const timer = setTimeout(() => {
      void probeConnectivity(false)
    }, 0)

    // Automatic probe interval every 15 seconds
    const interval = setInterval(() => {
      void probeConnectivity(false)
    }, 15000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [probeConnectivity])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="gap-1.5 px-2.5 py-1">
            <CheckCircle2 className="size-3.5" />
            <span>API Online</span>
          </Badge>
        )
      case "degraded":
        return (
          <Badge variant="secondary" className="gap-1.5 border-destructive/30 px-2.5 py-1 text-destructive">
            <AlertCircle className="size-3.5" />
            <span>Degraded</span>
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="destructive" className="gap-1.5 px-2.5 py-1">
            <XCircle className="size-3.5" />
            <span>Backend Offline</span>
          </Badge>
        )
      case "checking":
      default:
        return (
          <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
            <RefreshCw className="size-3.5 animate-spin" />
            <span>Probing...</span>
          </Badge>
        )
    }
  }

  const getSubServiceBadge = (subStatus: string | undefined) => {
    if (!subStatus) {
      return (
        <Badge variant="outline" className="text-[10px]">
          Unknown
        </Badge>
      )
    }
    if (subStatus === "connected") {
      return (
        <Badge variant="default" className="text-[10px]">
          Connected
        </Badge>
      )
    }
    if (subStatus === "not_configured") {
      return (
        <Badge variant="outline" className="text-[10px]">
          Not Configured
        </Badge>
      )
    }
    return (
      <Badge variant="destructive" className="text-[10px]">
        {subStatus}
      </Badge>
    )
  }

  return (
    <header className="border-b border-border bg-card shadow-xs">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Connectivity Title */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  Factory Control Hub
                </h1>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-muted-foreground">
                Distributed Sorting &amp; Counting System | Board A &amp; Board B Supervisor
              </p>
            </div>
          </div>

          {/* Action Bar (Operator Badge, Sign Out, Probe button, Theme toggle) */}
          <div className="flex flex-wrap items-center gap-2">
            {session ? (
              <>
                <Badge variant="outline" className="gap-1.5 border-primary/40 bg-primary/10 px-2.5 py-1 text-foreground">
                  <UserCheck className="size-3.5 text-primary" />
                  <span className="font-medium">{session.username}</span>
                  <span className="text-[11px] text-muted-foreground">(ID {session.userId})</span>
                </Badge>
                {onSignOut && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSignOut}
                    className="gap-1.5 text-xs font-medium hover:border-destructive/40 hover:text-destructive hover:bg-destructive/10"
                    aria-label="Sign Out"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </Button>
                )}
              </>
            ) : (
              <Badge variant="outline" className="gap-1.5 border-border/80 px-2.5 py-1 text-muted-foreground">
                <Lock className="size-3.5" />
                <span>Gate Locked</span>
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => void probeConnectivity(true)}
              disabled={isRefreshing}
              className="gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Probe</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="size-8 p-0"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Diagnostic Connectivity Sub-bar */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Go API Probe */}
            <div className="flex items-center gap-1.5">
              <Server className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">Go REST API:</span>
              <span className="font-mono text-[11px]">{config.apiUrl}</span>
            </div>

            {/* DB Probe */}
            <div className="flex items-center gap-1.5">
              <Database className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">PostgreSQL:</span>
              {getSubServiceBadge(health?.database?.status)}
            </div>

            {/* MQTT Broker Probe */}
            <div className="flex items-center gap-1.5">
              <Radio className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">HiveMQ Broker:</span>
              <span className="font-mono text-[11px]">{config.mqttBrokerHost}:{config.mqttWsPort}</span>
              {health?.mqtt?.status && getSubServiceBadge(health.mqtt.status)}
            </div>
          </div>

          {/* Timestamp and Notice */}
          <div className="text-[11px] text-muted-foreground">
            {lastChecked ? (
              <span>Last checked: {lastChecked.toLocaleTimeString()}</span>
            ) : (
              <span>Initializing probe...</span>
            )}
          </div>
        </div>

        {/* Offline Alert Banner if backend is unreachable */}
        {status === "disconnected" && errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Backend unreachable: {errorMessage} (Verify Go backend is running on {config.apiUrl})</span>
          </div>
        )}
      </div>
    </header>
  )
}
