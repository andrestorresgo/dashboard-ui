export interface AppConfig {
  apiUrl: string
  mqttBrokerHost: string
  mqttWsPort: number
  mqttWsPath: string
  mqttUsername: string
  mqttPassword: string
  getMqttWsUrl: () => string
}

const DEFAULT_API_URL = "http://localhost:8080"
const DEFAULT_MQTT_BROKER_HOST = "broker.hivemq.com"
const DEFAULT_MQTT_WS_PORT = 8884
const DEFAULT_MQTT_WS_PATH = "/mqtt"

export function parseConfig(rawEnv: Record<string, string | undefined> = {}): AppConfig {
  const rawApiUrl = rawEnv.VITE_API_URL?.trim() || DEFAULT_API_URL
  const apiUrl = rawApiUrl.replace(/\/+$/, "")

  const mqttBrokerHost = rawEnv.VITE_MQTT_BROKER_HOST?.trim() || DEFAULT_MQTT_BROKER_HOST

  const parsedPort = Number.parseInt(rawEnv.VITE_MQTT_WS_PORT || "", 10)
  const mqttWsPort =
    Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
      ? parsedPort
      : DEFAULT_MQTT_WS_PORT

  let mqttWsPath = rawEnv.VITE_MQTT_WS_PATH?.trim() || DEFAULT_MQTT_WS_PATH
  if (!mqttWsPath.startsWith("/")) {
    mqttWsPath = `/${mqttWsPath}`
  }

  const mqttUsername = rawEnv.VITE_MQTT_USERNAME?.trim() || ""
  const mqttPassword = rawEnv.VITE_MQTT_PASSWORD?.trim() || ""

  return {
    apiUrl,
    mqttBrokerHost,
    mqttWsPort,
    mqttWsPath,
    mqttUsername,
    mqttPassword,
    getMqttWsUrl: () => `wss://${mqttBrokerHost}:${mqttWsPort}${mqttWsPath}`,
  }
}

// Singleton config instance reading Vite environment
export const config: AppConfig = parseConfig(
  (typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : {})
)
