import { useMemo, useRef, useState } from 'react'
import { exportData, importData } from '../lib/storage.js'

export default function BackupModal({ onClose, onImported }) {
  const json = useMemo(() => JSON.stringify(exportData(), null, 2), [])
  const [texto, setTexto] = useState('') // área de colar para restaurar
  const [status, setStatus] = useState(null)
  const fileRef = useRef(null)

  const resumo = useMemo(() => {
    const d = exportData()
    return `${d.games.length} jogos · ${d.favs.length} favoritos · ${d.history.length} partidas`
  }, [])

  function baixar() {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dia = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `roleta-tabuleiro-backup-${dia}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setStatus({ ok: true, msg: 'Arquivo de backup gerado.' })
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(json)
      setStatus({ ok: true, msg: 'Backup copiado! Cole num bloco de notas, e-mail ou Drive.' })
    } catch {
      setStatus({ ok: false, msg: 'Não foi possível copiar — selecione o texto manualmente.' })
    }
  }

  function aoEscolherArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => restaurar(String(reader.result))
    reader.readAsText(file)
  }

  function restaurar(conteudo) {
    try {
      const obj = JSON.parse(conteudo)
      importData(obj)
      setStatus({ ok: true, msg: 'Backup restaurado com sucesso!' })
      onImported?.()
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'JSON inválido.' })
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>💾 Backup e restauração</h3>
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, color: 'var(--text-soft)', fontSize: '0.88rem' }}>
            Guarde este backup fora do app (Drive, e-mail, bloco de notas) para não perder seus
            dados ao reinstalar ou trocar de aparelho.
          </p>

          <h4 className="detail-section">Exportar — {resumo}</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <button className="btn btn-green btn-sm" onClick={baixar}>⬇ Baixar arquivo</button>
            <button className="btn btn-outline btn-sm" onClick={copiar}>📋 Copiar backup</button>
          </div>
          <textarea readOnly value={json} className="backup-text" onFocus={(e) => e.target.select()} />

          <h4 className="detail-section">Restaurar</h4>
          <p style={{ margin: '0 0 8px', color: 'var(--text-soft)', fontSize: '0.85rem' }}>
            Escolha um arquivo de backup <b>ou</b> cole o conteúdo abaixo. Isso substitui os dados atuais.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
              📂 Escolher arquivo…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={aoEscolherArquivo}
            />
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="…ou cole aqui o conteúdo do backup"
            className="backup-text"
          />
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-green btn-sm"
              disabled={!texto.trim()}
              onClick={() => restaurar(texto)}
            >
              Restaurar do texto colado
            </button>
          </div>

          {status && (
            <p className={status.ok ? 'busca-ok' : 'busca-erro'} style={{ marginTop: 12 }}>
              {status.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
