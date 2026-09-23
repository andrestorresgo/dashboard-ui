import * as React from "react"
import { computeLockoutStatus } from "@/lib/lockout"
import { setLockoutExpiry, clearLockoutExpiry } from "@/lib/session"

export interface UseLockoutTimerReturn {
  isLocked: boolean
  remainingSeconds: number
  setLockout: (targetUserId: number, seconds: number) => void
  clearLockout: (targetUserId: number) => void
}

/**
 * Hook to manage real-time 1-second interval countdown for operator lockout.
 * Automatically unfreezes when the timer reaches 0.
 * Operates on a per-user basis.
 */
export function useLockoutTimer(userId: number | null | undefined): UseLockoutTimerReturn {
  // Tick state triggers re-renders on every second of the countdown or manual update
  const [, setTick] = React.useState<number>(0)

  // Status is computed directly during render from current time and storage
  const status = computeLockoutStatus(userId)

  // Active 1-second countdown interval while locked
  React.useEffect(() => {
    if (!userId || !status.isLocked) {
      return
    }

    const interval = setInterval(() => {
      setTick((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [userId, status.isLocked])

  const setLockout = React.useCallback(
    (targetUserId: number, seconds: number) => {
      setLockoutExpiry(targetUserId, seconds)
      setTick((prev) => prev + 1)
    },
    []
  )

  const clearLockout = React.useCallback(
    (targetUserId: number) => {
      clearLockoutExpiry(targetUserId)
      setTick((prev) => prev + 1)
    },
    []
  )

  return {
    isLocked: status.isLocked,
    remainingSeconds: status.remainingSeconds,
    setLockout,
    clearLockout,
  }
}
