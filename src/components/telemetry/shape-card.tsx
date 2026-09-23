import { Circle, Triangle, Square } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ShapeCount } from "@/types/api"
import {
  BinaryBitIndicator,
  type BinaryVariant,
} from "./binary-bit-indicator"

export interface ShapeCardProps {
  shape: ShapeCount
  isPaused?: boolean
  className?: string
}

interface ShapeMeta {
  name: string
  colorLabel: string
  Icon: typeof Circle
  variant: BinaryVariant
  badgeVariant: "destructive" | "default" | "secondary"
  iconBgClass: string
  iconColorClass: string
  cardBorderClass: string
  bankLabel: string
  pinsLabel: string
}

function resolveShapeMeta(shapeId: number, shapeName?: string): ShapeMeta {
  const normalized = (shapeName || "").toLowerCase().trim()

  if (shapeId === 1 || normalized === "circle" || normalized === "red") {
    return {
      name: "Circle",
      colorLabel: "RED",
      Icon: Circle,
      variant: "destructive",
      badgeVariant: "destructive",
      iconBgClass: "bg-destructive/10",
      iconColorClass: "text-destructive",
      cardBorderClass: "border-destructive/20 hover:border-destructive/40",
      bankLabel: "Bank 1",
      pinsLabel: "GPIO 15, 2, 4",
    }
  }

  if (shapeId === 2 || normalized === "triangle" || normalized === "green") {
    return {
      name: "Triangle",
      colorLabel: "GREEN",
      Icon: Triangle,
      variant: "primary",
      badgeVariant: "default",
      iconBgClass: "bg-primary/10",
      iconColorClass: "text-primary",
      cardBorderClass: "border-primary/20 hover:border-primary/40",
      bankLabel: "Bank 2",
      pinsLabel: "GPIO 16, 17, 5",
    }
  }

  // Default to Square / Blue (ID 3)
  return {
    name: "Square",
    colorLabel: "BLUE",
    Icon: Square,
    variant: "secondary",
    badgeVariant: "secondary",
    iconBgClass: "bg-secondary text-secondary-foreground",
    iconColorClass: "text-secondary-foreground",
    cardBorderClass: "border-border hover:border-border/80",
    bankLabel: "Bank 3",
    pinsLabel: "GPIO 18, 19, 21",
  }
}

export function ShapeCard({ shape, isPaused = false, className }: ShapeCardProps) {
  const meta = resolveShapeMeta(shape.shape_id, shape.shape_name)
  const Icon = meta.Icon
  const isRolloverPending = shape.live_buffer >= 5
  const completedBatches = Math.floor(shape.total_lifetime / 5)

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        meta.cardBorderClass,
        className
      )}
      data-testid={`shape-card-${meta.name.toLowerCase()}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-lg shadow-2xs",
                meta.iconBgClass,
                meta.iconColorClass
              )}
            >
              <Icon className="size-5 fill-current" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                {meta.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {`${meta.bankLabel} • ${meta.pinsLabel}`}
              </CardDescription>
            </div>
          </div>
          <Badge variant={meta.badgeVariant} className="font-mono text-[11px] font-semibold">
            {meta.colorLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Live Buffer Metric */}
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium">Live Buffer</span>
            {isRolloverPending ? (
              <span className="font-mono text-[11px] font-semibold text-amber-500 animate-pulse">
                Observation Delay (800ms)
              </span>
            ) : (
              <span className="font-mono text-[11px]">Capacity: 5</span>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
                {shape.live_buffer}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/ 5</span>
            </div>

            {/* Visual Mini Progress Bar */}
            <div className="flex h-2 w-24 overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn(
                  "transition-all duration-300 rounded-full",
                  meta.variant === "destructive" && "bg-destructive",
                  meta.variant === "primary" && "bg-primary",
                  (meta.variant === "secondary" || meta.variant === "accent") && "bg-secondary-foreground"
                )}
                style={{ width: `${Math.min(100, (shape.live_buffer / 5) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3-Bit Binary Bit Indicator Mirroring Hardware LED Bank */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              3-Bit Binary Indicator
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              MSB → LSB (2², 2¹, 2⁰)
            </span>
          </div>

          <BinaryBitIndicator
            value={shape.live_buffer}
            variant={meta.variant}
          />
        </div>

        <Separator />

        {/* Cumulative Lifetime Total */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cumulative Lifetime Total:</span>
            <span className="font-mono font-bold text-foreground text-sm">
              {shape.total_lifetime.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground/80">
            <span>Completed Rollovers:</span>
            <span className="font-mono text-xs">
              {`${completedBatches} batches`}
            </span>
          </div>
        </div>

        {isPaused && (
          <div className="rounded border border-destructive/20 bg-destructive/5 px-2 py-1 text-[11px] text-destructive text-center font-medium">
            Machine Pause Active — Counting Interlocked
          </div>
        )}
      </CardContent>
    </Card>
  )
}
