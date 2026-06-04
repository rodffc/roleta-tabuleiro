// Converte o JSON original (jogos_de_tabuleiro.json) para o formato usado pelo app.
// Uso: node scripts/build-data.mjs <caminho-do-json-original>
// Padrão: ../jogos_de_tabuleiro.json (na raiz que você separou em C:\Dev\roleta-tabuleiro)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const srcArg = process.argv[2]
const srcPath = srcArg ? resolve(process.cwd(), srcArg) : join(root, 'jogos_de_tabuleiro.json')
const outPath = join(root, 'src', 'data', 'games.json')

function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Idade vem como "8+", "16+", "clássico"... extrai o número quando existir.
function parseAge(idade) {
  if (idade == null) return null
  const m = String(idade).match(/(\d+)/)
  return m ? Number(m[1]) : null
}

const raw = JSON.parse(readFileSync(srcPath, 'utf8'))
const games = (raw.jogos || []).map((g, i) => ({
  id: slug(g.nome) || `jogo-${i}`,
  nome: g.nome,
  busca: g.busca || [],
  tipo: g.tipo || 'Base',
  estilo: g.estilo || '',
  jogadores_min: g.jogadores_min ?? null,
  jogadores_max: g.jogadores_max ?? null,
  idade: g.idade ?? null,
  idade_min: parseAge(g.idade),
  tempo_min: g.tempo_min ?? null,
  tempo_max: g.tempo_max ?? null,
  ano: g.ano ?? null,
  editora: g.editora ?? null,
  nota_ludopedia: g.nota_ludopedia ?? null,
  rank_ludopedia: g.rank_ludopedia ?? null,
  descricao: g.descricao ?? '',
  // preenchidos por scripts/enrich-images.mjs (BGG) ou manualmente no app
  imageUrl: null,
  bggId: null,
}))

const out = {
  fonte: raw.fonte || 'Ludopedia',
  consultado_em: raw.consultado_em || null,
  total: games.length,
  jogos: games,
}

writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8')
console.log(`OK: ${games.length} jogos -> ${outPath}`)
