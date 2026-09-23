import * as React from "react"
import { TelemetryContext } from "@/hooks/use-telemetry"
import type { ShapeCount } from "@/types/api"
import { ShapeCard } from "./shape-card"
import { createDefaultShapeCounts } from "@/lib/telemetry"

export interface ShapeTelemetryGridProps {
  shapeCounts?: ShapeCount[]
  isPaused?: boolean
  className?: string
}

export function ShapeTelemetryGrid({
  shapeCounts: propShapeCounts,
  isPaused: propIsPaused,
  className,
}: ShapeTelemetryGridProps = {}) {
  const telemetry = React.useContext(TelemetryContext)

  const isPaused = propIsPaused ?? telemetry?.isPaused ?? false
  const activeShapes = propShapeCounts ?? telemetry?.snapshot?.shape_counts ?? []

  // Ensure all 3 shapes (Circle=1, Triangle=2, Square=3) exist and are presented in order
  const defaultShapes = React.useMemo(() => createDefaultShapeCounts(), [])

  const shapeMap = new Map<number, ShapeCount>()
  for (const s of activeShapes) {
    shapeMap.set(s.shape_id, s)
  }

  const resolvedShapes: ShapeCount[] = [
    shapeMap.get(1) ?? defaultShapes[0],
    shapeMap.get(2) ?? defaultShapes[1],
    shapeMap.get(3) ?? defaultShapes[2],
  ]

  return (
    <section className={className} aria-label="Shape Telemetry Counters">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
          Shape Counter LED Banks (Board B)
        </h3>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {resolvedShapes.map((shape) => (
          <ShapeCard
            key={shape.shape_id}
            shape={shape}
            isPaused={isPaused}
          />
        ))}
      </div>
    </section>
  )
}
