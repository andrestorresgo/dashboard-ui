import { apiClient as defaultApiClient, ApiClient } from "@/lib/api-client"
import type { MotorSpeedState } from "@/types/api"

export interface MotorActuationState {
  isPending: boolean
  pendingTarget: MotorSpeedState | null
  error: string | null
  lastDispatchedAt: Date | null
}

export interface MotorActuationOptions {
  apiClient?: ApiClient
  timeoutMs?: number
}

export const DEFAULT_MOTOR_TIMEOUT_MS = 3000

/**
 * Coordinates authoritative physical DC conveyor motor actuation per ADR-0004, ADR-0006, and ADR-0008.
 *
 * Dispatches commands via POST /api/v1/actuator/motor without optimistic toggle.
 * Enforces a 3-second acknowledgment window waiting for verified Board A telemetry.
 * Automatically enforces total hardware lockout when Machine Pause is active.
 */
export class MotorActuationController {
  private apiClient: ApiClient
  private timeoutMs: number
  private state: MotorActuationState
  private listeners: Set<(state: MotorActuationState) => void> = new Set()
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: MotorActuationOptions = {}) {
    this.apiClient = options.apiClient || defaultApiClient
    this.timeoutMs = options.timeoutMs ?? DEFAULT_MOTOR_TIMEOUT_MS

    this.state = {
      isPending: false,
      pendingTarget: null,
      error: null,
      lastDispatchedAt: null,
    }
  }

  public getState(): MotorActuationState {
    return this.state
  }

  public subscribe(listener: (state: MotorActuationState) => void): () => void {
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
        console.error("Error in motor actuation listener:", err)
      }
    }
  }

  private setState(partial: Partial<MotorActuationState>): void {
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
   * Dispatches command to set DC motor speed state (OFF, MEDIUM, ON).
   */
  public async commandMotor(
    target: MotorSpeedState,
    isPaused: boolean,
    currentMotorState: MotorSpeedState
  ): Promise<void> {
    if (isPaused) {
      this.setState({
        error: "Actuation locked out: Machine Pause active. Conveyor motor commands are disabled.",
      })
      return
    }

    if (currentMotorState === target) {
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
            "Actuation Timeout: Board A telemetry did not confirm motor speed within 3.0s. Reverted to authoritative state.",
        })
      }
    }, this.timeoutMs)

    try {
      await this.apiClient.commandMotor({ state: target })
    } catch (err: unknown) {
      this.clearTimer()
      const msg = err instanceof Error ? err.message : "Failed to dispatch motor command"
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
  public handleTelemetryUpdate(motorState: MotorSpeedState): void {
    if (!this.state.isPending || !this.state.pendingTarget) {
      return
    }

    if (motorState === this.state.pendingTarget) {
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
        error: "Actuation cancelled: Machine Pause engaged. Motor locked.",
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
