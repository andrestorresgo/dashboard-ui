import mqtt, { type MqttClient, type IClientOptions } from "mqtt"
import { apiClient as defaultApiClient, ApiClient } from "@/lib/api-client"
import { config } from "@/config/env"
import type { StateSnapshot, ActionRecord } from "@/types/api"
import {
  applyTelemetryMessage,
  applyRolloverMessage,
  applyActionMessage,
  createDefaultSnapshot,
  type TelemetryMessage,
  type RolloverMessage,
} from "./telemetry"

export type TransportMode = "websocket" | "polling" | "connecting" | "offline"

export interface TelemetryState {
  snapshot: StateSnapshot
  isHydrated: boolean
  wsConnected: boolean
  transportMode: TransportMode
  lastUpdated: Date | null
  error: string | null
}

export interface TelemetryEngineOptions {
  apiClient?: ApiClient
  mqttConnect?: (url: string, opts?: IClientOptions) => MqttClient
  wsUrl?: string
  pollIntervalMs?: number
  mqttOptions?: IClientOptions
}

const TOPIC_TELEMETRY = "factory/telemetry"
const TOPIC_ROLLOVER = "factory/rollover"
const TOPIC_ACTIONS = "factory/actions"
const DEFAULT_POLL_INTERVAL_MS = 2500

export class TelemetryEngine {
  private apiClient: ApiClient
  private mqttConnect: (url: string, opts?: IClientOptions) => MqttClient
  private wsUrl: string
  private pollIntervalMs: number
  private mqttOptions?: IClientOptions

  private state: TelemetryState
  private listeners: Set<(state: TelemetryState) => void> = new Set()
  private client: MqttClient | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private isRunning = false

  constructor(options: TelemetryEngineOptions = {}) {
    this.apiClient = options.apiClient || defaultApiClient
    this.mqttConnect = options.mqttConnect || mqtt.connect
    this.wsUrl = options.wsUrl || config.getMqttWsUrl()
    this.pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS
    this.mqttOptions = options.mqttOptions

    this.state = {
      snapshot: createDefaultSnapshot(),
      isHydrated: false,
      wsConnected: false,
      transportMode: "connecting",
      lastUpdated: null,
      error: null,
    }
  }

  public getState(): TelemetryState {
    return this.state
  }

  public subscribe(listener: (state: TelemetryState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state)
      } catch (err) {
        console.error("Error in telemetry listener:", err)
      }
    }
  }

  private setState(partial: Partial<TelemetryState>) {
    this.state = {
      ...this.state,
      ...partial,
    }
    this.notify()
  }

  /**
   * Refreshes state snapshot via GET /api/v1/state
   */
  public async refreshSnapshot(): Promise<void> {
    try {
      const snapshot = await this.apiClient.getState()
      this.setState({
        snapshot,
        isHydrated: true,
        lastUpdated: new Date(),
        error: null,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch state snapshot"
      this.setState({
        error: message,
      })
    }
  }

  /**
   * Starts telemetry engine: hydrates state, initializes MQTT WebSocket connection,
   * and prepares fallback polling.
   */
  public async start(): Promise<void> {
    if (this.isRunning) return
    this.isRunning = true

    // 1. Initial snapshot hydration
    await this.refreshSnapshot()

    // 2. Initialize WebSocket connection to HiveMQ Cloud
    this.initMqtt()
  }

  private initMqtt() {
    const opts: IClientOptions = {
      clientId: `dashboard-ui-${Math.random().toString(16).substring(2, 10)}`,
      clean: true,
      reconnectPeriod: 2500,
      connectTimeout: 5000,
      keepalive: 30,
      ...this.mqttOptions,
    }

    if (config.mqttUsername) {
      opts.username = config.mqttUsername
    }
    if (config.mqttPassword) {
      opts.password = config.mqttPassword
    }

    try {
      const client = this.mqttConnect(this.wsUrl, opts)
      this.client = client

      client.on("connect", () => {
        this.stopPolling()
        this.setState({
          wsConnected: true,
          transportMode: "websocket",
          error: null,
        })

        client.subscribe([TOPIC_TELEMETRY, TOPIC_ROLLOVER, TOPIC_ACTIONS], (err) => {
          if (err) {
            console.error("MQTT subscription error:", err)
            this.setState({ error: `Subscription error: ${err.message}` })
          }
        })
      })

      client.on("message", (topic: string, message: Buffer | string) => {
        try {
          const rawStr = typeof message === "string" ? message : message.toString("utf-8")
          const parsed = JSON.parse(rawStr)

          if (topic === TOPIC_TELEMETRY) {
            const updatedSnapshot = applyTelemetryMessage(
              this.state.snapshot,
              parsed as TelemetryMessage
            )
            this.setState({
              snapshot: updatedSnapshot,
              lastUpdated: new Date(),
            })
          } else if (topic === TOPIC_ROLLOVER) {
            const updatedSnapshot = applyRolloverMessage(
              this.state.snapshot,
              parsed as RolloverMessage
            )
            this.setState({
              snapshot: updatedSnapshot,
              lastUpdated: new Date(),
            })
          } else if (topic === TOPIC_ACTIONS) {
            const updatedSnapshot = applyActionMessage(
              this.state.snapshot,
              parsed as ActionRecord
            )
            this.setState({
              snapshot: updatedSnapshot,
              lastUpdated: new Date(),
            })
          }
        } catch (parseErr) {
          console.warn("Failed to parse incoming telemetry message:", parseErr)
        }
      })

      client.on("reconnect", () => {
        if (!this.state.wsConnected) {
          this.setState({ transportMode: "connecting" })
        }
      })

      client.on("close", () => {
        this.handleDisconnect()
      })

      client.on("offline", () => {
        this.handleDisconnect()
      })

      client.on("error", (err: Error) => {
        console.warn("MQTT client error:", err.message)
        this.handleDisconnect(err.message)
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "MQTT connection failed"
      console.error("Failed to initialize MQTT:", msg)
      this.handleDisconnect(msg)
    }
  }

  private handleDisconnect(errorMsg?: string) {
    if (!this.isRunning) return

    this.setState({
      wsConnected: false,
      transportMode: "polling",
      error: errorMsg || this.state.error,
    })

    // Start fallback polling if not already active
    this.startPolling()
  }

  private startPolling() {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => {
      void this.refreshSnapshot()
    }, this.pollIntervalMs)
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  /**
   * Stops the engine, clears polling intervals, and closes MQTT WebSocket connection.
   */
  public stop(): void {
    this.isRunning = false
    this.stopPolling()

    if (this.client) {
      try {
        this.client.end(true)
      } catch (err) {
        console.error("Error closing MQTT client:", err)
      }
      this.client = null
    }

    this.setState({
      wsConnected: false,
      transportMode: "offline",
    })
  }
}
