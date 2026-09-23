import { ConnectivityHeader } from "@/components/connectivity-header"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layers, ShieldCheck, Cpu, ArrowUpRight } from "lucide-react"

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConnectivityHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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

          {/* Card: Auth Gate Preparation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <span>Operator Auth Gate</span>
                </CardTitle>
                <Badge variant="outline">Ticket 02 Next</Badge>
              </div>
              <CardDescription>
                Two-step operator authentication with quick-select and lockout countdown.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Typed client contract implemented for <code className="font-mono text-foreground">POST /api/v1/auth/login</code>.</p>
              <div className="flex items-center gap-1.5 text-primary">
                <ArrowUpRight className="size-3.5" />
                <span>Ready for Operator Login UI integration</span>
              </div>
            </CardContent>
          </Card>

          {/* Card: Hybrid Telemetry Engine */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="size-4 text-muted-foreground" />
                  <span>Hybrid Telemetry</span>
                </CardTitle>
                <Badge variant="outline">ADR-0007</Badge>
              </div>
              <CardDescription>
                REST snapshot hydration via Go backend and direct WebSocket streaming.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>State snapshot contract implemented for <code className="font-mono text-foreground">GET /api/v1/state</code>.</p>
              <div className="flex items-center gap-1.5 text-primary">
                <ArrowUpRight className="size-3.5" />
                <span>Prepared for factory/telemetry sub-second feeds</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default App
