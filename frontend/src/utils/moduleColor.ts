const MODULE_COLORS: Record<string, string> = {
  GreenRAG: '#16a34a',
  'Doc-Intelli': '#2563eb',
  Infra: '#d97706',
  Integration: '#7c3aed',
  Milestone: '#db2777',
  Release: '#0891b2',
}

const PALETTE = [
  '#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2',
  '#ea580c', '#0d9488', '#65a30d', '#dc2626', '#9333ea', '#0284c7',
]

export function moduleColor(mod: string): string {
  if (MODULE_COLORS[mod]) return MODULE_COLORS[mod]
  let hash = 0
  for (let i = 0; i < mod.length; i++) hash = (hash * 31 + mod.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}
