import { describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import { ActionAuditTrail } from "./action-audit-trail"
import type { ActionRecord } from "@/types/api"

describe("ActionAuditTrail Component", () => {
  const sampleActions: ActionRecord[] = [
    {
      id: "act-001",
      action_type: "SERVO",
      action_name: "SERVO_OPEN",
      details: "Dispensed shape Circle to sorting bin",
      source: "DASHBOARD",
      timestamp: "2026-09-24T01:00:00Z",
    },
    {
      id: "act-002",
      action_type: "MOTOR",
      action_name: "MOTOR_ON",
      details: "Conveyor started at high speed",
      source: "HARDWARE",
      timestamp: "2026-09-24T01:01:00Z",
    },
    {
      id: "act-003",
      action_type: "DETECTION",
      action_name: "FIGURE_DETECTED",
      details: "Detected Triangle (Green) at x=120, y=85",
      source: "VISION",
      timestamp: "2026-09-24T01:02:00Z",
    },
    {
      id: "act-004",
      action_type: "LOCKDOWN",
      action_name: "LOCKDOWN_ENGAGED",
      details: "Safety pause triggered via hardware interlock",
      source: "HARDWARE",
      timestamp: "2026-09-24T01:03:00Z",
    },
    {
      id: "act-005",
      action_type: "LOCKDOWN",
      action_name: "USER_LOCKOUT",
      details: "Operator keypad locked after 2 failed PIN attempts",
      source: "KEYPAD",
      timestamp: "2026-09-24T01:04:00Z",
    },
  ]

  it("renders empty state notice when actions list is empty", () => {
    const html = renderToString(<ActionAuditTrail actions={[]} />)

    expect(html).toContain("System Action Audit Trail")
    expect(html).toContain("No system actions recorded yet")
    expect(html).toContain("0 Records")
    expect(html).toContain("ALL")
    expect(html).toContain("SERVO")
    expect(html).toContain("MOTOR")
    expect(html).toContain("DETECTION")
    expect(html).toContain("LOCKDOWN")
  })

  it("renders table with records and displays category badges", () => {
    const html = renderToString(<ActionAuditTrail actions={sampleActions} />)

    expect(html).toContain("5 Records")
    expect(html).toContain("SERVO")
    expect(html).toContain("MOTOR")
    expect(html).toContain("DETECTION")
    expect(html).toContain("LOCKDOWN")

    // Action names
    expect(html).toContain("SERVO_OPEN")
    expect(html).toContain("MOTOR_ON")
    expect(html).toContain("FIGURE_DETECTED")
    expect(html).toContain("LOCKDOWN_ENGAGED")
    expect(html).toContain("USER_LOCKOUT")

    // Details
    expect(html).toContain("Dispensed shape Circle to sorting bin")
    expect(html).toContain("Conveyor started at high speed")
    expect(html).toContain("Detected Triangle (Green) at x=120, y=85")
    expect(html).toContain("Safety pause triggered via hardware interlock")
    expect(html).toContain("Operator keypad locked after 2 failed PIN attempts")
  })

  it("renders origin surface badges for DASHBOARD, HARDWARE, VISION, and KEYPAD", () => {
    const html = renderToString(<ActionAuditTrail actions={sampleActions} />)

    expect(html).toContain("DASHBOARD")
    expect(html).toContain("HARDWARE")
    expect(html).toContain("VISION")
    expect(html).toContain("KEYPAD")
  })

  it("renders category count badges in the filter pills", () => {
    const html = renderToString(<ActionAuditTrail actions={sampleActions} />)

    // Total 5, SERVO 1, MOTOR 1, DETECTION 1, LOCKDOWN 2
    expect(html).toContain("data-testid=\"filter-all\"")
    expect(html).toContain("data-testid=\"filter-servo\"")
    expect(html).toContain("data-testid=\"filter-motor\"")
    expect(html).toContain("data-testid=\"filter-detection\"")
    expect(html).toContain("data-testid=\"filter-lockdown\"")
  })
})
