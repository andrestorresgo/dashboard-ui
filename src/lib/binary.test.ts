import { describe, expect, it } from "bun:test"
import { getThreeBitDecomposition } from "./binary"

describe("getThreeBitDecomposition", () => {
  it("decomposes 0 into all muted bits (000)", () => {
    const bits = getThreeBitDecomposition(0)
    expect(bits).toHaveLength(3)

    // MSB (Bit 2, 2^2 = 4)
    expect(bits[0]).toEqual({
      bit: 2,
      power: "2²",
      weight: 4,
      value: 0,
      isActive: false,
    })
    // Middle (Bit 1, 2^1 = 2)
    expect(bits[1]).toEqual({
      bit: 1,
      power: "2¹",
      weight: 2,
      value: 0,
      isActive: false,
    })
    // LSB (Bit 0, 2^0 = 1)
    expect(bits[2]).toEqual({
      bit: 0,
      power: "2⁰",
      weight: 1,
      value: 0,
      isActive: false,
    })
  })

  it("decomposes 1 into 001 (only LSB active)", () => {
    const bits = getThreeBitDecomposition(1)
    expect(bits[0].isActive).toBe(false)
    expect(bits[1].isActive).toBe(false)
    expect(bits[2].isActive).toBe(true)

    expect(bits[0].value).toBe(0)
    expect(bits[1].value).toBe(0)
    expect(bits[2].value).toBe(1)
  })

  it("decomposes 2 into 010 (only middle bit active)", () => {
    const bits = getThreeBitDecomposition(2)
    expect(bits[0].isActive).toBe(false)
    expect(bits[1].isActive).toBe(true)
    expect(bits[2].isActive).toBe(false)
  })

  it("decomposes 3 into 011 (middle and LSB active)", () => {
    const bits = getThreeBitDecomposition(3)
    expect(bits[0].isActive).toBe(false)
    expect(bits[1].isActive).toBe(true)
    expect(bits[2].isActive).toBe(true)
  })

  it("decomposes 4 into 100 (only MSB active)", () => {
    const bits = getThreeBitDecomposition(4)
    expect(bits[0].isActive).toBe(true)
    expect(bits[1].isActive).toBe(false)
    expect(bits[2].isActive).toBe(false)
  })

  it("decomposes 5 into 101 (Observation Delay state: MSB and LSB active)", () => {
    const bits = getThreeBitDecomposition(5)
    expect(bits[0].isActive).toBe(true)
    expect(bits[1].isActive).toBe(false)
    expect(bits[2].isActive).toBe(true)
  })

  it("strictly clamps values below 0 to 0", () => {
    const bits = getThreeBitDecomposition(-3)
    expect(bits[0].isActive).toBe(false)
    expect(bits[1].isActive).toBe(false)
    expect(bits[2].isActive).toBe(false)
  })

  it("strictly clamps values above 5 to 5 (hardware buffer maximum)", () => {
    const bits = getThreeBitDecomposition(10)
    expect(bits[0].isActive).toBe(true)
    expect(bits[1].isActive).toBe(false)
    expect(bits[2].isActive).toBe(true)
  })

  it("handles NaN or non-finite inputs by defaulting to 0", () => {
    const bits = getThreeBitDecomposition(Number.NaN)
    expect(bits[0].isActive).toBe(false)
    expect(bits[1].isActive).toBe(false)
    expect(bits[2].isActive).toBe(false)
  })

  it("preserves MSB-to-LSB ordering ($2^2, 2^1, 2^0$)", () => {
    const bits = getThreeBitDecomposition(5)
    expect(bits.map((b) => b.power)).toEqual(["2²", "2¹", "2⁰"])
    expect(bits.map((b) => b.weight)).toEqual([4, 2, 1])
  })
})
