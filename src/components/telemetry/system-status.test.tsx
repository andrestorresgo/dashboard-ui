import { describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import { MachinePauseBanner } from "./machine-pause-banner"
import { SystemStatusBar } from "./system-status-bar"

describe("MachinePauseBanner", () => {
  it("renders null when isPaused is false", () => {
    const html = renderToString(<MachinePauseBanner isPaused={false} />)
    expect(html).toBe("")
  })

  it("renders destructive emergency alert when isPaused is true", () => {
    const html = renderToString(<MachinePauseBanner isPaused={true} />)
    expect(html).toContain("EMERGENCY SAFETY HALT: Machine Pause Active")
    expect(html).toContain("Lockout Active")
    expect(html).toContain("bg-destructive/10")
    expect(html).toContain("text-destructive")
  })
})

describe("SystemStatusBar", () => {
  it("renders HALTED / DE-ENERGIZED motor badge when isPaused is true even if motorState is true", () => {
    const html = renderToString(
      <SystemStatusBar
        isPaused={true}
        motorState={true}
        transportMode="websocket"
      />
    )
    expect(html).toContain("HALTED / DE-ENERGIZED")
    expect(html).not.toContain(">RUNNING<")
  })

  it("renders RUNNING motor badge when machine is unpaused and motorState is true", () => {
    const html = renderToString(
      <SystemStatusBar
        isPaused={false}
        motorState={true}
        transportMode="websocket"
      />
    )
    expect(html).toContain("RUNNING")
    expect(html).not.toContain("HALTED / DE-ENERGIZED")
  })

  it("renders MEDIUM (70%) motor badge when machine is unpaused and motorState is MEDIUM", () => {
    const html = renderToString(
      <SystemStatusBar
        isPaused={false}
        motorState="MEDIUM"
        transportMode="websocket"
      />
    )
    expect(html).toContain("MEDIUM (70%)")
    expect(html).not.toContain("HALTED / DE-ENERGIZED")
  })

  it("renders HALTED motor badge when machine is unpaused and motorState is false", () => {
    const html = renderToString(
      <SystemStatusBar
        isPaused={false}
        motorState={false}
        transportMode="websocket"
      />
    )
    expect(html).toContain("HALTED")
    expect(html).not.toContain("HALTED / DE-ENERGIZED")
    expect(html).not.toContain("RUNNING")
  })

  it("renders WebSocket (Live) badge when transportMode is websocket", () => {
    const html = renderToString(
      <SystemStatusBar
        transportMode="websocket"
      />
    )
    expect(html).toContain("WebSocket (Live)")
  })

  it("renders REST Polling (2.5s) badge when transportMode is polling", () => {
    const html = renderToString(
      <SystemStatusBar
        transportMode="polling"
      />
    )
    expect(html).toContain("REST Polling (2.5s)")
  })

  it("renders Telemetry Offline badge when transportMode is offline", () => {
    const html = renderToString(
      <SystemStatusBar
        transportMode="offline"
      />
    )
    expect(html).toContain("Telemetry Offline")
  })

  it("renders locked servo badge during pause, open when active, and closed when idle", () => {
    const pausedHtml = renderToString(
      <SystemStatusBar isPaused={true} servoState={true} />
    )
    expect(pausedHtml).toContain("LOCKED")

    const openHtml = renderToString(
      <SystemStatusBar isPaused={false} servoState={true} />
    )
    expect(openHtml).toContain("OPEN")

    const closedHtml = renderToString(
      <SystemStatusBar isPaused={false} servoState={false} />
    )
    expect(closedHtml).toContain("CLOSED")
  })
})
