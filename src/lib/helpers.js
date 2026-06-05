// Divide "Party / Música / Blefe" em ["Party", "Música", "Blefe"].
export function categoriasDe(estilo) {
  if (!estilo) return []
  return estilo
    .split('/')
    .map((s) => s.trim().replace(/\+$/, '')) // "Família+" -> "Família"
    .filter(Boolean)
}

// Conjunto de todas as categorias presentes na coleção (para os chips de filtro).
export function todasCategorias(jogos) {
  const set = new Set()
  for (const g of jogos) for (const c of categoriasDe(g.estilo)) set.add(c)
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

const PALETA = [
  '#0a7d6e', '#2e7d32', '#6b3fa0', '#c0392b', '#1565c0',
  '#d4860b', '#00838f', '#ad1457', '#5d4037', '#37474f',
]

// Cor estável a partir do nome (para o placeholder quando não há imagem).
export function corPlaceholder(nome) {
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0
  return PALETA[h % PALETA.length]
}

export function inicial(nome) {
  return (nome.trim()[0] || '?').toUpperCase()
}

// Resolve a fonte da imagem: capa local (public/capas) ou URL externa.
export function imgSrc(url) {
  if (!url) return null
  if (/^(https?:|data:|blob:)/.test(url)) return url
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return base + url.replace(/^\//, '')
}

export function formatJogadores(g) {
  if (g.jogadores_min == null && g.jogadores_max == null) return '—'
  if (g.jogadores_min === g.jogadores_max) return `${g.jogadores_min}`
  return `${g.jogadores_min ?? '?'}–${g.jogadores_max ?? '?'}`
}

export function formatTempo(g) {
  if (g.tempo_min == null && g.tempo_max == null) return '—'
  if (g.tempo_min === g.tempo_max) return `${g.tempo_min} min`
  return `${g.tempo_min ?? '?'}–${g.tempo_max ?? '?'} min`
}

// Extrai o ano (4 dígitos) de strings como "2022", "1960 (original)", "déc. de 1990".
export function anoNum(ano) {
  if (ano == null) return null
  const m = String(ano).match(/(\d{4})/)
  return m ? Number(m[1]) : null
}

export function formatPreco(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatData(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
