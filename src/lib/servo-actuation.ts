import { apiClient as defaultApiClient, ApiClient } from "@/lib/api-client"

export type ServoGatePosition = "OPEN" | "CLOSED"

export interface ServoActuationState {
  isPending: boolean
  pendingTarget: ServoGatePosition | null
  error: string | null
  lastDispatchedAt: Date | null
}

export interface ServoActuationOptions {
  apiClient?: ApiClient
  timeoutMs?: number
}

export const DEFAULT_SERVO_TIMEOUT_MS = 3000

/**
 * Coordinates authoritative physical servo gate actuation per ADR-0004, ADR-0006, and ADR-0008.
 *
 * Dispatches commands via POST /api/v1/actuator/servo without optimistic toggle.
 * Enforces a 3-second acknowledgment window waiting for verified Board A telemetry.
 * Automatically enforces total hardware lockout when Machine Pause is active.
 */
export class ServoActuationController {
  private apiClient: ApiClient
  private timeoutMs: number
  private state: ServoActuationState
  private listeners: Set<(state: ServoActuationState) => void> = new Set()
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: ServoActuationOptions = {}) {
    this.apiClient = options.apiClient || defaultApiClient
    this.timeoutMs = options.timeoutMs ?? DEFAULT_SERVO_TIMEOUT_MS

    this.state = {
      isPending: false,
      pendingTarget: null,
      error: null,
      lastDispatchedAt: null,
    }
  }

  public getState(): ServoActuationState {
    return this.state
  }

  public subscribe(listener: (state: ServoActuationState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state)
      } catch (err) {
        console.error("Error in servo actuation listener:", err)
      }
    }
  }

  private setState(partial: Partial<ServoActuationState>): void {
    this.state = {
      ...this.state,
      ...partial,
    }
    this.notify()
  }

  private clearTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
  }

  /**
   * Dispatches command to open or close the sorting servo gate.
   */
  public async commandGate(
    target: ServoGatePosition,
    isPaused: boolean,
    currentServoState: boolean
  ): Promise<void> {
    if (isPaused) {
      this.setState({
        error: "Actuation locked out: Machine Pause active (ADR-0004). Remote gate commands are disabled.",
      })
      return
    }

    const currentMatchesTarget = currentServoState === (target === "OPEN")
    if (currentMatchesTarget) {
      return
    }

    if (this.state.isPending) {
      return
    }

    this.clearTimer()
    this.setState({
      isPending: true,
      pendingTarget: target,
      error: null,
      lastDispatchedAt: new Date(),
    })

    // 3-second acknowledgment window per ADR-0008
    this.timeoutTimer = setTimeout(() => {
      this.timeoutTimer = null
      if (this.state.isPending) {
        this.setState({
          isPending: false,
          pendingTarget: null,
          error:
            "Actuation Timeout: Board A telemetry did not confirm gate position within 3.0s. Reverted to authoritative state (ADR-0008).",
        })
      }
    }, this.timeoutMs)

    try {
      await this.apiClient.commandServo({ state: target })
    } catch (err: unknown) {
      this.clearTimer()
      const msg = err instanceof Error ? err.message : "Failed to dispatch servo command"
      this.setState({
        isPending: false,
        pendingTarget: null,
        error: `Actuation Dispatch Error: ${msg}`,
      })
    }
  }

  /**
   * Ingests verified hardware telemetry frames from Board A (ADR-0006).
   */
  public handleTelemetryUpdate(servoState: boolean): void {
    if (!this.state.isPending || !this.state.pendingTarget) {
      return
    }

    const targetBool = this.state.pendingTarget === "OPEN"
    if (servoState === targetBool) {
      this.clearTimer()
      this.setState({
        isPending: false,
        pendingTarget: null,
        error: null,
      })
    }
  }

  /**
   * Enforces total actuation lockout if Machine Pause activates mid-flight (ADR-0004).
   */
  public handlePauseUpdate(isPaused: boolean): void {
    if (isPaused && this.state.isPending) {
      this.clearTimer()
      this.setState({
        isPending: false,
        pendingTarget: null,
        error: "Actuation cancelled: Machine Pause engaged (ADR-0004). Gate locked.",
      })
    }
  }

  /**
   * Clears the current error alert.
   */
  public clearError(): void {
    this.setState({ error: null })
  }

  /**
   * Cleans up timers and active subscriptions.
   */
  public destroy(): void {
    this.clearTimer()
    this.listeners.clear()
  }
}
