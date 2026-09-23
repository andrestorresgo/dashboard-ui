import * as React from "react"
import { ConnectivityHeader } from "@/components/connectivity-header"
import { OperatorLoginCard } from "@/components/auth/operator-login-card"
import { getSession, clearSession, type OperatorSession } from "@/lib/session"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layers, ShieldCheck, Cpu, UserCheck, CheckCircle2 } from "lucide-react"
import { TelemetryProvider } from "@/context/telemetry-context"
import { useTelemetry } from "@/hooks/use-telemetry"
import { MachinePauseBanner } from "@/components/telemetry/machine-pause-banner"
import { SystemStatusBar } from "@/components/telemetry/system-status-bar"

function AuthenticatedWorkspace({ session }: { session: OperatorSession }) {
  const telemetry = useTelemetry()

  return (
    <div className="space-y-6">
      {/* Machine Pause Emergency Safety Banner (ADR-0004) */}
      <MachinePauseBanner />

      {/* Authenticated Operator Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <UserCheck className="size-5" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground sm:text-lg">
              Welcome, {session.username}
            </h2>
            <p className="text-xs text-muted-foreground">
              Operator ID: <span className="font-mono text-foreground font-medium">{session.userId}</span> | Session established at{" "}
              <span className="font-mono">{new Date(session.authenticatedAt).toLocaleTimeString()}</span>
            </p>
          </div>
        </div>
        <Badge variant="default" className="gap-1.5 px-3 py-1">
          <ShieldCheck className="size-3.5" />
          <span>Authorized Session</span>
        </Badge>
      </div>

      {/* Authoritative System Status Bar (ADR-0007 / Ticket 03) */}
      <SystemStatusBar />

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Card: System Architecture Ready */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="size-4 text-primary" />
                <span>Client Scaffolding</span>
              </CardTitle>
              <Badge variant="default">Ticket 01 Verified</Badge>
            </div>
            <CardDescription>
              Base UI and shadcn primitives initialized with Emerald theme tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span>UI Primitives:</span>
              <span className="font-mono text-foreground">card, badge, alert, input, separator</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span>MQTT Client:</span>
              <span className="font-mono text-foreground">v5.16.0 (WebSocket)</span>
            </div>
            <div className="flex items-center justify-between">
              <span>12-Factor Config:</span>
              <span className="font-mono text-foreground">Active with fallbacks</span>
            </div>
          </CardContent>
        </Card>

        {/* Card: Auth Gate Complete */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="size-4 text-primary" />
                <span>Operator Auth Gate</span>
              </CardTitle>
              <Badge variant="default">Ticket 02 Verified</Badge>
            </div>
            <CardDescription>
              Two-step operator authentication with quick-select and lockout countdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span>Active Operator:</span>
              <span className="font-mono text-foreground">{session.username} (ID {session.userId})</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span>Session Storage:</span>
              <span className="font-mono text-foreground">localStorage active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Lockout Protection:</span>
              <span className="font-mono text-foreground">60s cooldown / per-user</span>
            </div>
          </CardContent>
        </Card>

        {/* Card: Hybrid Telemetry Engine */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="size-4 text-primary" />
                <span>Hybrid Telemetry Engine</span>
              </CardTitle>
              <Badge variant="default">Ticket 03 Verified</Badge>
            </div>
            <CardDescription>
              Authoritative REST snapshot hydration with direct WebSocket streaming and 2.5s fallback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span>Transport Channel:</span>
              <span className="font-mono text-foreground">
                {telemetry.transportMode === "websocket"
                  ? "WebSocket (Live wss://)"
                  : telemetry.transportMode === "polling"
                    ? "REST Polling (2.5s fallback)"
                    : "Connecting..."}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
              <span>State Hydration:</span>
              <span className="flex items-center gap-1 font-mono text-foreground">
                <CheckCircle2 className="size-3 text-primary" />
                {telemetry.isHydrated ? "GET /api/v1/state loaded" : "Hydrating..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Machine Pause Interlock:</span>
              <span className="font-mono text-foreground">
                {telemetry.isPaused ? "PAUSE ACTIVE (Locked)" : "Clear (Armed)"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function App() {
  const [session, setSession] = React.useState<OperatorSession | null>(() => getSession())

  const handleLoginSuccess = (newSession: OperatorSession) => {
    setSession(newSession)
  }

  const handleSignOut = () => {
    clearSession()
    setSession(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConnectivityHeader session={session} onSignOut={handleSignOut} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!session ? (
          <div className="flex flex-col items-center justify-center py-6 sm:py-12">
            <div className="mb-8 text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground font-heading">
                Factory Terminal Access Gate
              </h2>
              <p className="max-w-md mx-auto text-sm text-muted-foreground">
                Authenticate with an authorized operator PIN to supervise physical actuation and live telemetry.
              </p>
            </div>

            <OperatorLoginCard onLoginSuccess={handleLoginSuccess} />
          </div>
        ) : (
          <TelemetryProvider>
            <AuthenticatedWorkspace session={session} />
          </TelemetryProvider>
        )}
      </main>
    </div>
  )
}

export default App

