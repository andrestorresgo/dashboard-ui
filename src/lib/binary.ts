import { clampBuffer } from "./telemetry"

export interface BitInfo {
  bit: number
  power: string
  weight: number
  value: 0 | 1
  isActive: boolean
}

/**
 * Decomposes a shape counter buffer value (0 to 5) into 3 binary bits
 * arranged strictly MSB-to-LSB ($2^2, 2^1, 2^0$), visually mirroring
 * the physical 3-LED banks on Board B.
 *
 * Index 0: Bit 2 ($2^2 = 4$, MSB)
 * Index 1: Bit 1 ($2^1 = 2$, Middle)
 * Index 2: Bit 0 ($2^0 = 1$, LSB)
 */
export function getThreeBitDecomposition(val: number): [BitInfo, BitInfo, BitInfo] {
  const clamped = clampBuffer(val)

  const bit2Active = (clamped & 4) !== 0
  const bit1Active = (clamped & 2) !== 0
  const bit0Active = (clamped & 1) !== 0

  return [
    {
      bit: 2,
      power: "2²",
      weight: 4,
      value: bit2Active ? 1 : 0,
      isActive: bit2Active,
    },
    {
      bit: 1,
      power: "2¹",
      weight: 2,
      value: bit1Active ? 1 : 0,
      isActive: bit1Active,
    },
    {
      bit: 0,
      power: "2⁰",
      weight: 1,
      value: bit0Active ? 1 : 0,
      isActive: bit0Active,
    },
  ]
}
