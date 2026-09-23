import * as React from "react"
import {
  ShieldCheck,
  Keyboard,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserX,
  RefreshCw,
  Clock,
  History,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TelemetryContext } from "@/context/telemetry-context-def"
import { OPERATOR_PRESETS } from "@/config/operators"
import type { AuditRecord, AuditStatus, AuthSource } from "@/types/api"

export interface AccessAuditTrailProps {
  audits?: AuditRecord[]
  onRefresh?: () => void | Promise<void>
  className?: string
}

function resolveOperator(userId: number | null): { name: string; subtitle: string } {
  if (userId === null || userId === undefined) {
    return { name: "Unidentified User", subtitle: "No User ID" }
  }
  const preset = OPERATOR_PRESETS.find((p) => p.id === userId)
  if (preset) {
    return { name: preset.name, subtitle: `ID ${userId}` }
  }
  return { name: `Operator #${userId}`, subtitle: `ID ${userId}` }
}

function getSourceBadge(source: AuthSource) {
  if (source === "KEYPAD") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-border/80 text-foreground font-medium"
        data-testid="audit-source-keypad"
      >
        <Keyboard className="size-3 text-muted-foreground" />
        <span>KEYPAD (Board A)</span>
      </Badge>
    )
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 border-border/60 text-foreground font-medium"
      data-testid="audit-source-dashboard"
    >
      <Monitor className="size-3 text-primary" />
      <span>DASHBOARD (Web UI)</span>
    </Badge>
  )
}

function getStatusBadge(status: AuditStatus) {
  switch (status) {
    case "SUCCESS":
      return (
        <Badge
          variant="default"
          className="gap-1 bg-primary text-primary-foreground font-medium shadow-xs"
          data-testid="audit-status-success"
        >
          <CheckCircle2 className="size-3" />
          <span>SUCCESS</span>
        </Badge>
      )
    case "INVALID_PIN":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-destructive/50 text-destructive font-medium"
          data-testid="audit-status-invalid-pin"
        >
          <AlertTriangle className="size-3" />
          <span>INVALID_PIN</span>
        </Badge>
      )
    case "USER_LOCKED":
      return (
        <Badge
          variant="destructive"
          className="gap-1 font-semibold shadow-xs"
          data-testid="audit-status-user-locked"
        >
          <Lock className="size-3" />
          <span>USER_LOCKED</span>
        </Badge>
      )
    case "USER_NOT_FOUND":
      return (
        <Badge
          variant="secondary"
          className="gap-1 border-border/80 text-muted-foreground font-medium"
          data-testid="audit-status-user-not-found"
        >
          <UserX className="size-3" />
          <span>USER_NOT_FOUND</span>
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatTimestamp(tsStr: string): string {
  try {
    const d = new Date(tsStr)
    if (isNaN(d.getTime())) return tsStr
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
  } catch {
    return tsStr
  }
}

export function AccessAuditTrail({
  audits: propAudits,
  onRefresh: propOnRefresh,
  className,
}: AccessAuditTrailProps = {}) {
  const telemetry = React.useContext(TelemetryContext)

  const audits = propAudits ?? telemetry?.snapshot.recent_audits ?? []
  const onRefresh = propOnRefresh ?? telemetry?.refetchState

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

  return (
    <Card className={`border border-border/80 bg-card shadow-xs ${className || ""}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Security Access Audit Trail
              </CardTitle>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>{`${audits.length} Records`}</span>
            </Badge>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="size-7 p-0"
                aria-label="Refresh audit logs"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        {audits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <ShieldCheck className="size-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              No authentication audit logs recorded yet
            </h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Operator PIN submissions from Board A matrix keypad or the factory dashboard will be securely recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/40 text-xs">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[170px]">Access Surface</TableHead>
                  <TableHead>Operator Identity</TableHead>
                  <TableHead className="w-[140px]">Auth Outcome</TableHead>
                  <TableHead className="w-[120px] text-right">Audit Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {audits.map((record) => {
                  const operator = resolveOperator(record.user_id)
                  return (
                    <TableRow key={record.id} className="transition-colors hover:bg-muted/30">
                      {/* Timestamp */}
                      <TableCell className="font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 shrink-0 text-muted-foreground/80" />
                          <span>{formatTimestamp(record.timestamp)}</span>
                        </div>
                      </TableCell>

                      {/* Source */}
                      <TableCell>{getSourceBadge(record.source)}</TableCell>

                      {/* Operator Identity */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {operator.name}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {operator.subtitle}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>{getStatusBadge(record.status)}</TableCell>

                      {/* Audit ID */}
                      <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                        <span title={record.id}>
                          {record.id.length > 12 ? `${record.id.slice(0, 10)}...` : record.id}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
