import * as React from "react"
import {
  Activity,
  Sliders,
  Gauge,
  Eye,
  ShieldAlert,
  RefreshCw,
  Clock,
  Terminal,
  Layers,
  Monitor,
  Keyboard,
  Camera,
  Cpu,
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
import type { ActionRecord, ActionType } from "@/types/api"

export interface ActionAuditTrailProps {
  actions?: ActionRecord[]
  onRefresh?: () => void | Promise<void>
  className?: string
}

type FilterCategory = "ALL" | ActionType

const EMPTY_ACTIONS: ActionRecord[] = []

function getCategoryBadge(actionType: ActionType) {
  switch (actionType) {
    case "SERVO":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium"
          data-testid="action-category-servo"
        >
          <Sliders className="size-3 text-cyan-600 dark:text-cyan-400" />
          <span>SERVO</span>
        </Badge>
      )
    case "MOTOR":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
          data-testid="action-category-motor"
        >
          <Gauge className="size-3 text-amber-600 dark:text-amber-400" />
          <span>MOTOR</span>
        </Badge>
      )
    case "DETECTION":
      return (
        <Badge
          variant="outline"
          className="gap-1 border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
          data-testid="action-category-detection"
        >
          <Eye className="size-3 text-indigo-600 dark:text-indigo-400" />
          <span>DETECTION</span>
        </Badge>
      )
    case "LOCKDOWN":
      return (
        <Badge
          variant="destructive"
          className="gap-1 font-semibold shadow-xs"
          data-testid="action-category-lockdown"
        >
          <ShieldAlert className="size-3" />
          <span>LOCKDOWN</span>
        </Badge>
      )
    default:
      return <Badge variant="outline">{actionType}</Badge>
  }
}

function getSourceBadge(source: string) {
  const upper = source.trim().toUpperCase()
  if (upper === "DASHBOARD") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-[11px] border-border/60 text-foreground font-medium"
        data-testid="action-source-dashboard"
      >
        <Monitor className="size-2.5 text-primary" />
        <span>DASHBOARD</span>
      </Badge>
    )
  }
  if (upper === "VISION_SERVICE" || upper === "VISION") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-[11px] border-border/60 text-foreground font-medium"
        data-testid="action-source-vision"
      >
        <Camera className="size-2.5 text-indigo-500" />
        <span>VISION</span>
      </Badge>
    )
  }
  if (upper === "HARDWARE" || upper === "ACTUATOR") {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-[11px] border-border/80 text-foreground font-medium"
        data-testid="action-source-hardware"
      >
        <Cpu className="size-2.5 text-muted-foreground" />
        <span>HARDWARE</span>
      </Badge>
    )
  }
  if (upper === "KEYPAD") {
    return (
      <Badge
        variant="outline"
        className="gap-1 text-[11px] border-border/80 text-foreground font-medium"
        data-testid="action-source-keypad"
      >
        <Keyboard className="size-2.5 text-muted-foreground" />
        <span>KEYPAD</span>
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 text-[11px] border-border/60 text-foreground font-medium"
    >
      <Terminal className="size-2.5 text-muted-foreground" />
      <span>{upper}</span>
    </Badge>
  )
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

export function ActionAuditTrail({
  actions: propActions,
  onRefresh: propOnRefresh,
  className,
}: ActionAuditTrailProps = {}) {
  const telemetry = React.useContext(TelemetryContext)

  const snapshotActions = telemetry?.snapshot.recent_actions
  const rawActions = React.useMemo(
    () => propActions ?? snapshotActions ?? EMPTY_ACTIONS,
    [propActions, snapshotActions]
  )
  const onRefresh = propOnRefresh ?? telemetry?.refetchState

  const [activeFilter, setActiveFilter] = React.useState<FilterCategory>("ALL")
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

  const filteredActions = React.useMemo(() => {
    if (activeFilter === "ALL") return rawActions
    return rawActions.filter((a) => a.action_type === activeFilter)
  }, [rawActions, activeFilter])

  // Category counts for quick filter buttons
  const counts = React.useMemo(() => {
    return {
      ALL: rawActions.length,
      SERVO: rawActions.filter((a) => a.action_type === "SERVO").length,
      MOTOR: rawActions.filter((a) => a.action_type === "MOTOR").length,
      DETECTION: rawActions.filter((a) => a.action_type === "DETECTION").length,
      LOCKDOWN: rawActions.filter((a) => a.action_type === "LOCKDOWN").length,
    }
  }, [rawActions])

  return (
    <Card className={`border border-border/80 bg-card shadow-xs ${className || ""}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                System Action Audit Trail
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Live chronological ledger of physical actuations, figure detections, and safety lockouts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
              <Layers className="size-3.5 text-primary" />
              <span>{`${filteredActions.length} Records`}</span>
            </Badge>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="size-7 p-0"
                aria-label="Refresh action logs"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3">
          {(["ALL", "SERVO", "MOTOR", "DETECTION", "LOCKDOWN"] as FilterCategory[]).map((cat) => {
            const count = counts[cat]
            const isSelected = activeFilter === cat
            return (
              <Button
                key={cat}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(cat)}
                className={`h-7 px-2.5 text-xs font-medium transition-all ${
                  isSelected ? "" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`filter-${cat.toLowerCase()}`}
              >
                <span>{cat}</span>
                <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0.2 ${
                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        {filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Activity className="size-5" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              {activeFilter === "ALL"
                ? "No system actions recorded yet"
                : `No ${activeFilter} actions recorded yet`}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {activeFilter === "ALL"
                ? "Servo commands, conveyor motor adjustments, figure detections, and machine pause lockouts will appear in this real-time ledger."
                : `Actions matching category '${activeFilter}' will automatically appear here when triggered.`}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table>
              <TableHeader className="bg-muted/40 text-xs">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[130px]">Category</TableHead>
                  <TableHead className="w-[180px]">Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[140px]">Origin Surface</TableHead>
                  <TableHead className="w-[120px] text-right">Log Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredActions.map((record, idx) => {
                  return (
                    <TableRow
                      key={record.id || `act-${idx}`}
                      className="transition-colors hover:bg-muted/30"
                      data-testid={`action-row-${record.action_type.toLowerCase()}`}
                    >
                      {/* Timestamp */}
                      <TableCell className="font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 shrink-0 text-muted-foreground/80" />
                          <span>{formatTimestamp(record.timestamp)}</span>
                        </div>
                      </TableCell>

                      {/* Category Badge */}
                      <TableCell>{getCategoryBadge(record.action_type)}</TableCell>

                      {/* Action Name */}
                      <TableCell>
                        <span className="font-mono font-semibold text-foreground">
                          {record.action_name}
                        </span>
                      </TableCell>

                      {/* Action Details */}
                      <TableCell>
                        <span className="text-muted-foreground font-normal">
                          {record.details || "-"}
                        </span>
                      </TableCell>

                      {/* Source */}
                      <TableCell>{getSourceBadge(record.source)}</TableCell>

                      {/* Log ID */}
                      <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                        <span title={record.id}>
                          {record.id && record.id.length > 12
                            ? `${record.id.slice(0, 10)}...`
                            : record.id || `#${idx + 1}`}
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
