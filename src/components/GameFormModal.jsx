import { useState } from 'react'
import { slug } from '../lib/helpers.js'
import { buscarNaLudopedia } from '../lib/ludopedia.js'

const vazio = {
  nome: '',
  estilo: '',
  tipo: 'Base',
  jogadores_min: '',
  jogadores_max: '',
  idade: '',
  tempo_min: '',
  tempo_max: '',
  ano: '',
  editora: '',
  nota_ludopedia: '',
  rank_ludopedia: '',
  descricao: '',
  imageUrl: '',
  ludopediaUrl: '',
  preco: '',
}

export default function GameFormModal({ game, onClose, onSave }) {
  const editando = !!game
  const [f, setF] = useState(() => (game ? { ...vazio, ...sanitiza(game) } : vazio))
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const [buscando, setBuscando] = useState(false)
  const [statusBusca, setStatusBusca] = useState(null) // {ok, msg}

  async function buscarLudopedia() {
    const q = f.nome.trim()
    if (!q) {
      setStatusBusca({ ok: false, msg: 'Digite o nome do jogo primeiro.' })
      return
    }
    setBuscando(true)
    setStatusBusca(null)
    try {
      const r = await buscarNaLudopedia(q)
      if (!r) {
        setStatusBusca({ ok: false, msg: 'Nenhum jogo encontrado na Ludopedia.' })
        return
      }
      // preenche apenas os campos vazios + sempre atualiza nota/rank/imagem/link
      setF((s) => ({
        ...s,
        nome: r.nome || s.nome,
        idade: s.idade || r.idade || '',
        jogadores_min: s.jogadores_min || (r.jogadores_min ?? ''),
        jogadores_max: s.jogadores_max || (r.jogadores_max ?? ''),
        tempo_min: s.tempo_min || (r.tempo_min ?? ''),
        tempo_max: s.tempo_max || (r.tempo_max ?? ''),
        nota_ludopedia: r.nota_ludopedia ?? s.nota_ludopedia,
        rank_ludopedia: r.rank_ludopedia ?? s.rank_ludopedia,
        imageUrl: r.imageUrl || s.imageUrl,
        ludopediaUrl: r.ludopediaUrl || s.ludopediaUrl,
      }))
      setStatusBusca({ ok: true, msg: `Encontrado: ${r.nome} (nota ${r.nota_ludopedia ?? '—'}, rank ${r.rank_ludopedia ?? '—'}).` })
    } catch (e) {
      setStatusBusca({
        ok: false,
        msg: 'Erro ao buscar (verifique a conexão). No navegador o proxy só funciona em "npm run dev".',
      })
    } finally {
      setBuscando(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    if (!f.nome.trim()) return
    const num = (v) => (v === '' || v == null ? null : Number(v))
    const ageMatch = String(f.idade).match(/(\d+)/)
    const salvo = {
      id: game?.id || slug(f.nome) || `jogo-${Date.now()}`,
      nome: f.nome.trim(),
      busca: game?.busca || [f.nome.toLowerCase()],
      tipo: f.tipo,
      estilo: f.estilo.trim(),
      jogadores_min: num(f.jogadores_min),
      jogadores_max: num(f.jogadores_max),
      idade: f.idade.trim() || null,
      idade_min: ageMatch ? Number(ageMatch[1]) : null,
      tempo_min: num(f.tempo_min),
      tempo_max: num(f.tempo_max),
      ano: f.ano.trim() || null,
      editora: f.editora.trim() || null,
      nota_ludopedia: num(f.nota_ludopedia),
      rank_ludopedia: num(f.rank_ludopedia),
      descricao: f.descricao.trim(),
      imageUrl: f.imageUrl.trim() || null,
      ludopediaUrl: f.ludopediaUrl.trim() || game?.ludopediaUrl || null,
      preco: num(f.preco),
      bggId: game?.bggId || null,
    }
    onSave(salvo, editando)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{editando ? 'Editar jogo' : 'Adicionar jogo'}</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <label>Nome *</label>
              <div className="busca-row">
                <input
                  value={f.nome}
                  onChange={set('nome')}
                  autoFocus
                  required
                  placeholder="Ex: Wingspan"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      buscarLudopedia()
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-green btn-sm"
                  onClick={buscarLudopedia}
                  disabled={buscando}
                >
                  {buscando ? '⏳…' : '🔎 Ludopedia'}
                </button>
              </div>
              {statusBusca && (
                <small className={statusBusca.ok ? 'busca-ok' : 'busca-erro'}>
                  {statusBusca.msg}
                </small>
              )}
            </div>
            <div className="form-row">
              <label>Estilo / categorias (separe por “/”)</label>
              <input value={f.estilo} onChange={set('estilo')} placeholder="Party / Cartas" />
            </div>
            <div className="form-two">
              <div className="form-row">
                <label>Tipo</label>
                <select value={f.tipo} onChange={set('tipo')}>
                  <option>Base</option>
                  <option>Expansão</option>
                </select>
              </div>
              <div className="form-row">
                <label>Idade (ex: 8+)</label>
                <input value={f.idade} onChange={set('idade')} placeholder="8+" />
              </div>
            </div>
            <div className="form-two">
              <div className="form-row">
                <label>Jogadores mín.</label>
                <input type="number" min="1" value={f.jogadores_min} onChange={set('jogadores_min')} />
              </div>
              <div className="form-row">
                <label>Jogadores máx.</label>
                <input type="number" min="1" value={f.jogadores_max} onChange={set('jogadores_max')} />
              </div>
            </div>
            <div className="form-two">
              <div className="form-row">
                <label>Tempo mín. (min)</label>
                <input type="number" min="0" value={f.tempo_min} onChange={set('tempo_min')} />
              </div>
              <div className="form-row">
                <label>Tempo máx. (min)</label>
                <input type="number" min="0" value={f.tempo_max} onChange={set('tempo_max')} />
              </div>
            </div>
            <div className="form-two">
              <div className="form-row">
                <label>Ano</label>
                <input value={f.ano} onChange={set('ano')} />
              </div>
              <div className="form-row">
                <label>Editora</label>
                <input value={f.editora} onChange={set('editora')} />
              </div>
            </div>
            <div className="form-two">
              <div className="form-row">
                <label>Nota Ludopedia</label>
                <input type="number" step="0.1" min="0" max="10" value={f.nota_ludopedia} onChange={set('nota_ludopedia')} />
              </div>
              <div className="form-row">
                <label>Rank Ludopedia</label>
                <input type="number" min="1" value={f.rank_ludopedia} onChange={set('rank_ludopedia')} />
              </div>
            </div>
            <div className="form-row">
              <label>Preço médio (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={f.preco}
                onChange={set('preco')}
                placeholder="ex: 199.90"
              />
            </div>
            <div className="form-row">
              <label>URL da imagem (opcional)</label>
              <input value={f.imageUrl} onChange={set('imageUrl')} placeholder="https://…" />
            </div>
            <div className="form-row">
              <label>Descrição</label>
              <textarea value={f.descricao} onChange={set('descricao')} />
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-green">
              {editando ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Converte valores nulos em '' para os inputs controlados.
function sanitiza(g) {
  const out = {}
  for (const k of Object.keys(vazio)) out[k] = g[k] == null ? '' : g[k]
  return out
}
