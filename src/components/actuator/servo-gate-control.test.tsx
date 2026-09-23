import { describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import { ServoGateControl } from "./servo-gate-control"

describe("ServoGateControl Component (ADR-0004, ADR-0006, ADR-0008)", () => {
  it("renders closed gate state when servoState is false and unpaused", () => {
    const html = renderToString(
      <ServoGateControl
        servoState={false}
        isPaused={false}
      />
    )

    expect(html).toContain("Authoritative Servo Gate Actuation")
    expect(html).toContain("GATE CLOSED")
    expect(html).toContain("data-slot=\"switch\"")
    // When closed, switch should have data-unchecked
    expect(html).toContain("data-unchecked")
  })

  it("renders open gate state when servoState is true and unpaused", () => {
    const html = renderToString(
      <ServoGateControl
        servoState={true}
        isPaused={false}
      />
    )

    expect(html).toContain("GATE OPEN")
    expect(html).toContain("data-checked")
  })

  it("renders total actuation lockout with safety tooltip explanation when isPaused is true (ADR-0004)", () => {
    const html = renderToString(
      <ServoGateControl
        servoState={false}
        isPaused={true}
      />
    )

    expect(html).toContain("LOCKED (Pause Active)")
    expect(html).toContain("Actuator Lockout (ADR-0004)")
    expect(html).toContain("data-disabled")
  })

  it("displays explanatory alert when error occurs", () => {
    const html = renderToString(
      <ServoGateControl
        servoState={false}
        isPaused={false}
        initialError="Actuation Timeout: Board A telemetry did not confirm gate position within 3.0s"
      />
    )

    expect(html).toContain("Actuation Alert")
    expect(html).toContain("Board A telemetry did not confirm gate position within 3.0s")
  })

  it("renders pending acknowledgment indicator when command is awaiting telemetry (ADR-0008)", () => {
    const html = renderToString(
      <ServoGateControl
        servoState={false}
        isPaused={false}
        initialPending={true}
        initialPendingTarget="OPEN"
      />
    )

    expect(html).toContain('data-testid="servo-gate-badge-pending"')
    expect(html).toContain("Awaiting Board A")
    expect(html).toContain("Acknowledgment Pending")
    expect(html).toContain("data-disabled")
  })
})
