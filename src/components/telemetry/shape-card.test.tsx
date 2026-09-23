import { describe, expect, it } from "bun:test"
import { renderToString } from "react-dom/server"
import { BinaryBitIndicator } from "./binary-bit-indicator"
import { ShapeCard } from "./shape-card"
import { ShapeTelemetryGrid } from "./shape-telemetry-grid"
import type { ShapeCount } from "@/types/api"
import {
  createDefaultSnapshot,
  applyTelemetryMessage,
  applyRolloverMessage,
} from "@/lib/telemetry"

describe("BinaryBitIndicator", () => {
  it("renders 3 pills in MSB-to-LSB order with correct power indicators", () => {
    const html = renderToString(<BinaryBitIndicator value={0} />)
    expect(html).toContain("2²")
    expect(html).toContain("2¹")
    expect(html).toContain("2⁰")

    // Check MSB appears before middle and middle before LSB
    const idxBit2 = html.indexOf("2²")
    const idxBit1 = html.indexOf("2¹")
    const idxBit0 = html.indexOf("2⁰")
    expect(idxBit2).toBeLessThan(idxBit1)
    expect(idxBit1).toBeLessThan(idxBit0)
  })

  it("renders all pills muted with 0 for decimal value 0", () => {
    const html = renderToString(<BinaryBitIndicator value={0} />)
    expect(html).toContain('data-bit="2"')
    expect(html).toContain('data-bit="1"')
    expect(html).toContain('data-bit="0"')
    // No active pill class
    expect(html).toContain('data-active="false"')
    expect(html).not.toContain('data-active="true"')
  })

  it("renders 101 with active MSB and LSB for decimal value 5 (Observation Delay)", () => {
    const html = renderToString(<BinaryBitIndicator value={5} />)
    // Bit 2 (MSB) active
    expect(html).toContain('data-bit="2" data-active="true"')
    // Bit 1 (Middle) muted
    expect(html).toContain('data-bit="1" data-active="false"')
    // Bit 0 (LSB) active
    expect(html).toContain('data-bit="0" data-active="true"')
  })

  it("applies semantic destructive tokens for Circle/Red", () => {
    const html = renderToString(<BinaryBitIndicator value={5} variant="destructive" />)
    expect(html).toContain("bg-destructive")
    expect(html).toContain("text-destructive-foreground")
  })

  it("applies semantic primary tokens for Triangle/Green", () => {
    const html = renderToString(<BinaryBitIndicator value={5} variant="primary" />)
    expect(html).toContain("bg-primary")
    expect(html).toContain("text-primary-foreground")
  })

  it("applies semantic secondary tokens for Square/Blue", () => {
    const html = renderToString(<BinaryBitIndicator value={5} variant="secondary" />)
    expect(html).toContain("bg-secondary")
    expect(html).toContain("text-secondary-foreground")
  })
})

describe("ShapeCard", () => {
  const mockCircle: ShapeCount = {
    shape_id: 1,
    shape_name: "Circle",
    color_label: "RED",
    live_buffer: 3,
    total_lifetime: 45,
    updated_at: new Date().toISOString(),
  }

  const mockTriangle: ShapeCount = {
    shape_id: 2,
    shape_name: "Triangle",
    color_label: "GREEN",
    live_buffer: 5,
    total_lifetime: 70,
    updated_at: new Date().toISOString(),
  }

  const mockSquare: ShapeCount = {
    shape_id: 3,
    shape_name: "Square",
    color_label: "BLUE",
    live_buffer: 0,
    total_lifetime: 10,
    updated_at: new Date().toISOString(),
  }

  it("renders Circle card with destructive tokens, bank 1 pins, and decimal count 3", () => {
    const html = renderToString(<ShapeCard shape={mockCircle} />)
    expect(html).toContain("Circle")
    expect(html).toContain("RED")
    expect(html).toContain("Bank 1")
    expect(html).toContain("GPIO 15, 2, 4")
    expect(html).toContain(">3<")
    expect(html).toContain("45")
    expect(html).toContain("9 batches")
    expect(html).not.toContain("Observation Delay (800ms)")
  })

  it("renders Triangle card with Observation Delay badge when buffer reaches 5", () => {
    const html = renderToString(<ShapeCard shape={mockTriangle} />)
    expect(html).toContain("Triangle")
    expect(html).toContain("GREEN")
    expect(html).toContain("Bank 2")
    expect(html).toContain("GPIO 16, 17, 5")
    expect(html).toContain(">5<")
    expect(html).toContain("Observation Delay (800ms)")
    expect(html).toContain("70")
    expect(html).toContain("14 batches")
  })

  it("renders Square card with secondary tokens, bank 3 pins, and decimal count 0", () => {
    const html = renderToString(<ShapeCard shape={mockSquare} />)
    expect(html).toContain("Square")
    expect(html).toContain("BLUE")
    expect(html).toContain("Bank 3")
    expect(html).toContain("GPIO 18, 19, 21")
    expect(html).toContain(">0<")
    expect(html).toContain("10")
    expect(html).toContain("2 batches")
  })

  it("displays Machine Pause Active alert when isPaused is true", () => {
    const pausedHtml = renderToString(<ShapeCard shape={mockCircle} isPaused={true} />)
    expect(pausedHtml).toContain("Machine Pause Active — Counting Interlocked")

    const unpausedHtml = renderToString(<ShapeCard shape={mockCircle} isPaused={false} />)
    expect(unpausedHtml).not.toContain("Machine Pause Active — Counting Interlocked")
  })
})

describe("ShapeTelemetryGrid & Real-Time Reducer Integration", () => {
  it("renders 3 shape cards in default state", () => {
    const html = renderToString(<ShapeTelemetryGrid />)
    expect(html).toContain("Circle")
    expect(html).toContain("Triangle")
    expect(html).toContain("Square")
    expect(html).toContain("Shape Counter LED Banks (Board B)")
  })

  it("reflects incoming factory/telemetry frame updates immediately", () => {
    const initial = createDefaultSnapshot()
    const updated = applyTelemetryMessage(initial, {
      is_paused: false,
      motor_state: true,
      servo_state: false,
      red_count: 2,
      green_count: 4,
      blue_count: 5,
    })

    const html = renderToString(
      <ShapeTelemetryGrid shapeCounts={updated.shape_counts} isPaused={false} />
    )

    // Red Circle should be 2
    expect(html).toContain(">2<")
    // Green Triangle should be 4
    expect(html).toContain(">4<")
    // Blue Square should be 5 and show observation delay
    expect(html).toContain(">5<")
    expect(html).toContain("Observation Delay (800ms)")
  })

  it("increments lifetime total and resets live buffer when factory/rollover batch arrives", () => {
    const initial = createDefaultSnapshot()
    const withTelemetry = applyTelemetryMessage(initial, {
      is_paused: false,
      motor_state: true,
      servo_state: false,
      red_count: 5,
      green_count: 3,
      blue_count: 1,
    })

    // Rollover occurs for Red Circle (shape_id: 1)
    const afterRollover = applyRolloverMessage(withTelemetry, {
      shape_id: 1,
      shape_name: "Circle",
      timestamp: Date.now(),
    })

    const circleAfter = afterRollover.shape_counts.find((s) => s.shape_id === 1)
    expect(circleAfter?.live_buffer).toBe(0)
    expect(circleAfter?.total_lifetime).toBe(5)

    const html = renderToString(
      <ShapeTelemetryGrid shapeCounts={afterRollover.shape_counts} isPaused={false} />
    )

    // Circle buffer is now 0, lifetime total is 5
    expect(html).toContain("5")
    expect(html).toContain("1 batches")
  })
})
