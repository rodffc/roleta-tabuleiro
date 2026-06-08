// Correções pontuais na lista inicial (src/data/games.json):
//  - Detetive  -> versão "detetive-com-aplicativo"
//  - Jogo da Vida -> versão Estrela 1986 ("the-game-of-life")
//  - adiciona "Hamburgueria Maluca"
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { dadosPorSlug, precoPorSlug, buscarPorNome } from '../src/lib/ludopedia.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dataPath = join(root, 'src', 'data', 'games.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function baixarCapa(imageUrl, id) {
  if (!imageUrl) return null
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } })
  if (!res.ok) return imageUrl
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(join(root, 'public', 'capas', `${id}.jpg`), buf)
  return `capas/${id}.jpg`
}

async function montar(slug, id) {
  const d = await dadosPorSlug(slug)
  const preco = await precoPorSlug(slug).catch(() => null)
  const local = await baixarCapa(d.imageUrl, id)
  return {
    nome: d.nome,
    idade: d.idade,
    idade_min: d.idade ? Number(String(d.idade).match(/\d+/)?.[0]) : null,
    jogadores_min: d.jogadores_min,
    jogadores_max: d.jogadores_max,
    tempo_min: d.tempo_min,
    tempo_max: d.tempo_max,
    nota_ludopedia: d.nota_ludopedia,
    rank_ludopedia: d.rank_ludopedia,
    descricao: d.descricao || '',
    preco,
    imageUrl: local,
    ludopediaUrl: d.ludopediaUrl,
  }
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'))
const byId = Object.fromEntries(data.jogos.map((g) => [g.id, g]))

// 1) Detetive com aplicativo
{
  const novo = await montar('detetive-com-aplicativo', 'detetive-estrela')
  Object.assign(byId['detetive-estrela'], novo, { nome: 'Detetive (com Aplicativo)' })
  console.log('✔ Detetive ->', novo.ludopediaUrl, '| nota', novo.nota_ludopedia, '| R$', novo.preco)
}

// 2) Jogo da Vida (Estrela 1986)
{
  const novo = await montar('the-game-of-life', 'jogo-da-vida')
  Object.assign(byId['jogo-da-vida'], novo, { nome: 'Jogo da Vida', ano: '1986', editora: 'Estrela' })
  console.log('✔ Jogo da Vida ->', novo.ludopediaUrl, '| nota', novo.nota_ludopedia, '| R$', novo.preco)
}

// 3) Hamburgueria Maluca (novo)
if (!byId['hamburgueria-maluca']) {
  const lista = await buscarPorNome('Hamburgueria Maluca')
  const escolha = lista[0]
  if (escolha) {
    const novo = await montar(escolha.slug, 'hamburgueria-maluca')
    data.jogos.push({
      id: 'hamburgueria-maluca',
      nome: novo.nome,
      busca: ['hamburgueria maluca', 'estrela', 'habilidade', 'infantil'],
      tipo: 'Base',
      estilo: 'Infantil / Habilidade',
      editora: 'Estrela',
      ano: novo.ano || null,
      bggId: null,
      ...novo,
    })
    data.total = data.jogos.length
    console.log('✔ Hamburgueria Maluca adicionada ->', novo.ludopediaUrl)
  } else {
    console.log('… Hamburgueria Maluca não encontrada na busca')
  }
}

data.atualizado_em = new Date().toISOString()
writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
console.log('games.json atualizado. Total:', data.jogos.length)
