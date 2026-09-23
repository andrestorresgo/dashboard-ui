export interface OperatorPreset {
  id: number
  name: string
  label: string
}

export const OPERATOR_PRESETS: readonly OperatorPreset[] = [
  { id: 1, name: "Andres", label: "Andres - ID 1" },
  { id: 2, name: "Aldo", label: "Aldo - ID 2" },
] as const
