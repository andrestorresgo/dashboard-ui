import { getLockoutExpiry, clearLockoutExpiry } from "./session"

export interface LockoutStatus {
  isLocked: boolean
  remainingSeconds: number
}

/**
 * Computes whether a specific operator is locked out and the remaining countdown seconds.
 * Pure function suitable for direct testing and React hook state computation.
 */
export function computeLockoutStatus(
  userId: number | null | undefined,
  now = Date.now(),
  storage?: Storage
): LockoutStatus {
  if (!userId || userId <= 0) {
    return { isLocked: false, remainingSeconds: 0 }
  }

  const expiry = getLockoutExpiry(userId, storage, now)
  if (!expiry) {
    return { isLocked: false, remainingSeconds: 0 }
  }

  const diffMs = expiry - now
  if (diffMs <= 0) {
    clearLockoutExpiry(userId, storage)
    return { isLocked: false, remainingSeconds: 0 }
  }

  const remainingSeconds = Math.ceil(diffMs / 1000)
  return { isLocked: true, remainingSeconds }
}
