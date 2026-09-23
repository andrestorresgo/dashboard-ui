import * as React from "react"
import { ShieldCheck, Lock, AlertCircle, KeyRound, User, Loader2, ArrowRight } from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { apiClient, ApiError } from "@/lib/api-client"
import { useLockoutTimer } from "@/hooks/use-lockout-timer"
import { saveSession, type OperatorSession } from "@/lib/session"
import { OPERATOR_PRESETS, type OperatorPreset } from "@/config/operators"
import type { AuthResponse } from "@/types/api"

export interface OperatorLoginCardProps {
  onLoginSuccess: (session: OperatorSession) => void
  defaultUserId?: number
}

export function OperatorLoginCard({ onLoginSuccess, defaultUserId = 1 }: OperatorLoginCardProps) {
  const [selectedUserId, setSelectedUserId] = React.useState<number>(defaultUserId)
  const [isManualId, setIsManualId] = React.useState<boolean>(false)
  const [manualIdInput, setManualIdInput] = React.useState<string>("")
  const [pin, setPin] = React.useState<string>("")

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false)
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [remainingAttempts, setRemainingAttempts] = React.useState<number | null>(null)

  const effectiveUserId = isManualId ? (parseInt(manualIdInput, 10) || null) : selectedUserId

  const { isLocked, remainingSeconds, setLockout, clearLockout } = useLockoutTimer(effectiveUserId)

  // Reset errors when switching operator
  const handleSelectPreset = (preset: OperatorPreset) => {
    setIsManualId(false)
    setSelectedUserId(preset.id)
    setPin("")
    setAuthError(null)
    setRemainingAttempts(null)
  }

  const handleToggleManual = () => {
    setIsManualId(true)
    setManualIdInput("")
    setPin("")
    setAuthError(null)
    setRemainingAttempts(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveUserId || effectiveUserId <= 0) {
      setAuthError("Please specify a valid numeric Operator ID.")
      return
    }

    if (!pin.trim()) {
      setAuthError("Please enter your numeric operator PIN.")
      return
    }

    if (isLocked) {
      return
    }

    setIsSubmitting(true)
    setAuthError(null)

    try {
      const resp: AuthResponse = await apiClient.login({
        user_id: effectiveUserId,
        pin: pin.trim(),
      })

      switch (resp.status) {
        case "AUTH_OK": {
          clearLockout(effectiveUserId)
          const matchedPreset = OPERATOR_PRESETS.find((p) => p.id === effectiveUserId)
          const username = resp.username || matchedPreset?.name || `Operator ${effectiveUserId}`
          const session: OperatorSession = {
            userId: effectiveUserId,
            username,
            authenticatedAt: new Date().toISOString(),
          }
          saveSession(session)
          onLoginSuccess(session)
          break
        }

        case "INVALID_PIN": {
          setRemainingAttempts(resp.remaining_attempts)
          setAuthError(`Invalid PIN. ${resp.remaining_attempts} attempt${resp.remaining_attempts === 1 ? "" : "s"} left before lockout.`)
          setPin("")
          break
        }

        case "USER_LOCKED": {
          const lockoutDuration = resp.lockout_seconds > 0 ? resp.lockout_seconds : 60
          setLockout(effectiveUserId, lockoutDuration)
          setRemainingAttempts(0)
          setAuthError(`User Locked! Retry in ${lockoutDuration}s...`)
          setPin("")
          break
        }

        case "USER_NOT_FOUND": {
          setRemainingAttempts(null)
          setAuthError(`Operator ID ${effectiveUserId} not found in factory registry.`)
          setPin("")
          break
        }

        default: {
          setAuthError("Unexpected authentication response from backend.")
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setAuthError(`Backend returned error (${err.status}): ${err.message}`)
      } else if (err instanceof Error) {
        setAuthError(err.message)
      } else {
        setAuthError("Unable to reach backend authentication service.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md shadow-md border-border/80">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <Badge variant={isLocked ? "destructive" : "outline"} className="gap-1 px-2.5 py-0.5">
            {isLocked ? (
              <>
                <Lock className="size-3 text-destructive animate-pulse" />
                <span>Operator Locked</span>
              </>
            ) : (
              <>
                <KeyRound className="size-3 text-primary" />
                <span>Two-Step Gate</span>
              </>
            )}
          </Badge>
        </div>
        <CardTitle className="pt-2 text-xl font-semibold tracking-tight">Operator Authentication</CardTitle>
        <CardDescription>
          Select an authorized operator profile or provide credentials to operate the factory line.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Step 1: Operator Selection Presets & Manual Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Step 1: Select Operator Profile</span>
              {isManualId && <span className="text-primary font-mono">Manual Mode</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {OPERATOR_PRESETS.map((preset) => {
                const isSelected = !isManualId && selectedUserId === preset.id
                return (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    className={`h-11 justify-start gap-2 px-3 text-xs font-medium transition-all ${
                      isSelected ? "ring-2 ring-primary/40 shadow-xs" : "border-border/60 hover:bg-accent/40"
                    }`}
                    onClick={() => handleSelectPreset(preset)}
                    disabled={isSubmitting}
                  >
                    <User className="size-3.5 shrink-0" />
                    <span className="truncate">{preset.label}</span>
                  </Button>
                )
              })}
            </div>

            {/* Manual ID Alternative Toggle */}
            <div className="pt-1">
              {!isManualId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleToggleManual}
                  disabled={isSubmitting}
                >
                  Enter alternative numeric User ID...
                </Button>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <label htmlFor="operator-id-input" className="text-xs font-medium text-muted-foreground">
                    Numeric Operator ID:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="operator-id-input"
                      type="number"
                      min={1}
                      placeholder="e.g. 1"
                      value={manualIdInput}
                      onChange={(e) => setManualIdInput(e.target.value)}
                      disabled={isSubmitting || isLocked}
                      className="font-mono text-sm"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectPreset(OPERATOR_PRESETS[0])}
                      className="text-xs shrink-0"
                    >
                      Presets
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Masked Numeric PIN Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <label htmlFor="operator-pin-input">Step 2: Security PIN</label>
              {remainingAttempts !== null && remainingAttempts > 0 && !isLocked && (
                <span className="text-destructive font-semibold">
                  {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} left
                </span>
              )}
            </div>

            <div className="relative">
              <Input
                id="operator-pin-input"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={10}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isSubmitting || isLocked}
                className="font-mono text-center tracking-widest text-base"
              />
            </div>
          </div>

          {/* Active Real-time Lockout Banner (HTTP 403 USER_LOCKED) */}
          {isLocked && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 animate-in fade-in">
              <Lock className="size-4 text-destructive" />
              <AlertTitle className="font-semibold">Security Lockout Active</AlertTitle>
              <AlertDescription className="text-xs">
                User Locked! Retry in <span className="font-mono font-bold text-destructive underline">{remainingSeconds}s</span>...
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Consecutive failed attempts triggered a safety cooldown. Inputs are frozen for this operator until the timer expires.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Attempt Warning Banner (HTTP 401 INVALID_PIN) */}
          {!isLocked && authError && remainingAttempts !== null && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
              <AlertCircle className="size-4" />
              <AlertTitle className="font-semibold">Authentication Warning</AlertTitle>
              <AlertDescription className="text-xs">
                {authError}
              </AlertDescription>
            </Alert>
          )}

          {/* Generic / Network / User Not Found Error */}
          {!isLocked && authError && remainingAttempts === null && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
              <AlertCircle className="size-4" />
              <AlertTitle className="font-semibold">Access Denied</AlertTitle>
              <AlertDescription className="text-xs">
                {authError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            className="w-full gap-2 font-medium"
            disabled={isSubmitting || isLocked || !effectiveUserId || !pin.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : isLocked ? (
              <>
                <Lock className="size-4" />
                <span>Locked ({remainingSeconds}s)</span>
              </>
            ) : (
              <>
                <span>Authorize Operator</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
