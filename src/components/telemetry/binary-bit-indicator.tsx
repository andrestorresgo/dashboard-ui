import { cn } from "@/lib/utils"
import { getThreeBitDecomposition } from "@/lib/binary"

export type BinaryVariant = "destructive" | "primary" | "secondary" | "accent"

export interface BinaryBitIndicatorProps {
  value: number
  variant?: BinaryVariant
  className?: string
  showPower?: boolean
}

export function BinaryBitIndicator({
  value,
  variant = "primary",
  className,
  showPower = true,
}: BinaryBitIndicatorProps) {
  const bits = getThreeBitDecomposition(value)

  const getVariantActiveClasses = (v: BinaryVariant) => {
    switch (v) {
      case "destructive":
        return "bg-destructive text-destructive-foreground ring-1 ring-destructive/40 shadow-xs"
      case "primary":
        return "bg-primary text-primary-foreground ring-1 ring-primary/40 shadow-xs"
      case "secondary":
        return "bg-secondary text-secondary-foreground ring-1 ring-secondary-foreground/30 shadow-xs border border-border"
      case "accent":
        return "bg-accent text-accent-foreground ring-1 ring-accent-foreground/20 shadow-xs border border-border"
      default:
        return "bg-primary text-primary-foreground ring-1 ring-primary/40 shadow-xs"
    }
  }

  const activeClasses = getVariantActiveClasses(variant)
  const mutedClasses = "bg-muted/40 text-muted-foreground/40 border border-border/30"

  return (
    <div
      role="group"
      aria-label={`3-bit binary indicator: ${bits.map((b) => b.value).join(" ")} (decimal ${value})`}
      className={cn("flex items-center gap-1.5 sm:gap-2", className)}
    >
      {bits.map((bitInfo) => {
        const isCurrentActive = bitInfo.isActive

        return (
          <div
            key={bitInfo.bit}
            data-bit={bitInfo.bit}
            data-active={isCurrentActive}
            data-weight={bitInfo.weight}
            className={cn(
              "flex flex-1 items-center justify-between gap-1 rounded-md px-2 py-1 text-xs font-mono transition-all sm:px-2.5",
              isCurrentActive ? activeClasses : mutedClasses
            )}
            title={`Bit ${bitInfo.bit} (${bitInfo.power} = ${bitInfo.weight}): ${isCurrentActive ? "ACTIVE (1)" : "MUTED (0)"}`}
          >
            {showPower && (
              <span
                className={cn(
                  "text-[10px] font-sans font-semibold tracking-tight uppercase",
                  isCurrentActive ? "opacity-85" : "opacity-50"
                )}
              >
                {bitInfo.power}
              </span>
            )}
            <span className="font-mono text-xs font-bold leading-none">
              {bitInfo.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
