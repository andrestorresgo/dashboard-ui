import { describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import { MotorSpeedControl } from "./motor-speed-control"

describe("MotorSpeedControl Component (ADR-0004, ADR-0006, ADR-0008)", () => {
  it("renders OFF state when motorState is OFF and unpaused", () => {
    const html = renderToString(
      <MotorSpeedControl
        motorState="OFF"
        isPaused={false}
      />
    )

    expect(html).toContain("Authoritative DC Conveyor Motor Control")
    expect(html).toContain("MOTOR OFF")
    expect(html).toContain("data-testid=\"motor-btn-off\"")
    expect(html).toContain("data-testid=\"motor-btn-medium\"")
    expect(html).toContain("data-testid=\"motor-btn-on\"")
    expect(html).toContain("0% Duty")
    expect(html).toContain("70% Duty")
    expect(html).toContain("90% Duty")
  })

  it("renders MEDIUM state when motorState is MEDIUM and unpaused", () => {
    const html = renderToString(
      <MotorSpeedControl
        motorState="MEDIUM"
        isPaused={false}
      />
    )

    expect(html).toContain("MEDIUM (70% Speed)")
    expect(html).toContain("data-testid=\"motor-control-badge-medium\"")
  })

  it("renders ON state when motorState is ON and unpaused", () => {
    const html = renderToString(
      <MotorSpeedControl
        motorState="ON"
        isPaused={false}
      />
    )

    expect(html).toContain("MOTOR ON (90% Speed)")
    expect(html).toContain("data-testid=\"motor-control-badge-on\"")
  })

  it("renders total actuation lockout with safety explanation when isPaused is true (ADR-0004)", () => {
    const html = renderToString(
      <MotorSpeedControl
        motorState="OFF"
        isPaused={true}
      />
    )

    expect(html).toContain("LOCKED (Pause Active)")
    expect(html).toContain("Actuator Lockout:")
    expect(html).toContain("disabled")
  })

  it("displays explanatory alert when error occurs", () => {
    const html = renderToString(
      <MotorSpeedControl
        motorState="OFF"
        isPaused={false}
        initialError="Actuation Timeout: Board A telemetry did not confirm motor speed within 3.0s"
      />
    )

    expect(html).toContain("Actuation Alert")
    expect(html).toContain("Board A telemetry did not confirm motor speed within 3.0s")
  })

  it("renders pending acknowledgment indicator when command is awaiting telemetry (ADR-0008)", () => {
    const html = renderToString(
      <MotorSpeedControl
        motorState="OFF"
        isPaused={false}
        initialPending={true}
        initialPendingTarget="MEDIUM"
      />
    )

    expect(html).toContain("data-testid=\"motor-control-badge-pending\"")
    expect(html).toContain("Awaiting Board A (MEDIUM)")
    expect(html).toContain("Acknowledgment Pending")
  })
})
