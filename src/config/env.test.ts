import { describe, expect, it } from "bun:test"
import { parseConfig } from "./env"

describe("parseConfig", () => {
  it("provides safe fallback defaults when no env variables are specified", () => {
    const config = parseConfig({})

    expect(config.apiUrl).toBe("http://localhost:8080")
    expect(config.mqttBrokerHost).toBe("broker.hivemq.com")
    expect(config.mqttWsPort).toBe(8884)
    expect(config.mqttWsPath).toBe("/mqtt")
    expect(config.mqttUsername).toBe("")
    expect(config.mqttPassword).toBe("")
    expect(config.getMqttWsUrl()).toBe("wss://broker.hivemq.com:8884/mqtt")
  })

  it("reads configuration from custom environment variables", () => {
    const config = parseConfig({
      VITE_API_URL: "https://api.factory.internal",
      VITE_MQTT_BROKER_HOST: "hivemq.factory.internal",
      VITE_MQTT_WS_PORT: "9001",
      VITE_MQTT_WS_PATH: "/custom/mqtt",
      VITE_MQTT_USERNAME: "operator_andres",
      VITE_MQTT_PASSWORD: "secure_password",
    })

    expect(config.apiUrl).toBe("https://api.factory.internal")
    expect(config.mqttBrokerHost).toBe("hivemq.factory.internal")
    expect(config.mqttWsPort).toBe(9001)
    expect(config.mqttWsPath).toBe("/custom/mqtt")
    expect(config.mqttUsername).toBe("operator_andres")
    expect(config.mqttPassword).toBe("secure_password")
    expect(config.getMqttWsUrl()).toBe("wss://hivemq.factory.internal:9001/custom/mqtt")
  })

  it("normalizes trailing slashes on apiUrl and missing leading slash on mqttWsPath", () => {
    const config = parseConfig({
      VITE_API_URL: "http://localhost:8080///",
      VITE_MQTT_WS_PATH: "mqtt",
    })

    expect(config.apiUrl).toBe("http://localhost:8080")
    expect(config.mqttWsPath).toBe("/mqtt")
    expect(config.getMqttWsUrl()).toBe("wss://broker.hivemq.com:8884/mqtt")
  })

  it("falls back to default port if port string is non-numeric or out of range", () => {
    const config = parseConfig({
      VITE_MQTT_WS_PORT: "invalid_port",
    })

    expect(config.mqttWsPort).toBe(8884)
  })
})
