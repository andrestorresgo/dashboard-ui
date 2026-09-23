import { describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import { AccessAuditTrail } from "./access-audit-trail"
import type { AuditRecord } from "@/types/api"

describe("AccessAuditTrail Component (ADR-0005)", () => {
  const sampleAudits: AuditRecord[] = [
    {
      id: "audit-001",
      source: "DASHBOARD",
      user_id: 1,
      status: "SUCCESS",
      timestamp: "2026-09-23T14:30:00Z",
    },
    {
      id: "audit-002",
      source: "KEYPAD",
      user_id: 2,
      status: "INVALID_PIN",
      timestamp: "2026-09-23T14:28:00Z",
    },
    {
      id: "audit-003",
      source: "KEYPAD",
      user_id: 2,
      status: "USER_LOCKED",
      timestamp: "2026-09-23T14:28:30Z",
    },
    {
      id: "audit-004",
      source: "DASHBOARD",
      user_id: null,
      status: "USER_NOT_FOUND",
      timestamp: "2026-09-23T14:20:00Z",
    },
  ]

  it("renders empty state notice when recent audits list is empty", () => {
    const html = renderToString(<AccessAuditTrail audits={[]} />)

    expect(html).toContain("Security Access Audit Trail")
    expect(html).toContain("No authentication audit logs recorded yet")
    expect(html).toContain("0 Records")
  })

  it("renders table with records and resolves known operator names", () => {
    const html = renderToString(<AccessAuditTrail audits={sampleAudits} />)

    expect(html).toContain("4 Records")
    expect(html).toContain("audit-001")
    expect(html).toContain("audit-002")
    expect(html).toContain("audit-003")
    expect(html).toContain("audit-004")

    // Resolved names
    expect(html).toContain("Andres")
    expect(html).toContain("Aldo")
    expect(html).toContain("Unidentified")
  })

  it("renders source badges for KEYPAD and DASHBOARD", () => {
    const html = renderToString(<AccessAuditTrail audits={sampleAudits} />)

    expect(html).toContain("KEYPAD (Board A)")
    expect(html).toContain("DASHBOARD (Web UI)")
  })

  it("renders semantic status badges for SUCCESS, INVALID_PIN, USER_LOCKED, and USER_NOT_FOUND", () => {
    const html = renderToString(<AccessAuditTrail audits={sampleAudits} />)

    expect(html).toContain("SUCCESS")
    expect(html).toContain("INVALID_PIN")
    expect(html).toContain("USER_LOCKED")
    expect(html).toContain("USER_NOT_FOUND")
  })
})
