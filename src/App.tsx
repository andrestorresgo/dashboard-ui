import * as React from "react"
import { ConnectivityHeader } from "@/components/connectivity-header"
import { OperatorLoginCard } from "@/components/auth/operator-login-card"
import { getSession, clearSession, type OperatorSession } from "@/lib/session"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, UserCheck } from "lucide-react"
import { TelemetryProvider } from "@/context/telemetry-context"
import { MachinePauseBanner } from "@/components/telemetry/machine-pause-banner"
import { SystemStatusBar } from "@/components/telemetry/system-status-bar"
import { ServoGateControl } from "@/components/actuator/servo-gate-control"
import { ShapeTelemetryGrid } from "@/components/telemetry/shape-telemetry-grid"
import { AccessAuditTrail } from "@/components/audit/access-audit-trail"

function AuthenticatedWorkspace({ session }: { session: OperatorSession }) {
  return (
    <div className="space-y-6">
      {/* Machine Pause Emergency Safety Banner */}
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

      {/* Authoritative System Status Bar */}
      <SystemStatusBar />

      {/* Authoritative Sorting Servo Gate Actuation */}
      <ServoGateControl />

      {/* Geometric Shape Telemetry Cards with 3-Bit Binary Indicators */}
      <ShapeTelemetryGrid />

      {/* Access Audit Trail */}
      <AccessAuditTrail />
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

