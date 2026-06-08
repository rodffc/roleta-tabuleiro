export default function Filters({ filtros, setFiltros, categorias, onReset }) {
  const toggleCat = (cat) => {
    setFiltros((f) => ({
      ...f,
      categorias: f.categorias.includes(cat)
        ? f.categorias.filter((c) => c !== cat)
        : [...f.categorias, cat],
    }))
  }
  const set = (patch) => setFiltros((f) => ({ ...f, ...patch }))

  return (
    <div className="filters">
      <div className="filters-grid">
        <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
          <h4>Categoria / Estilo</h4>
          <div className="chips">
            {categorias.map((c) => (
              <button
                key={c}
                className={'chip' + (filtros.categorias.includes(c) ? ' active' : '')}
                onClick={() => toggleCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Tipo</h4>
          <div className="chips">
            {['Todos', 'Base', 'Expansão'].map((t) => (
              <button
                key={t}
                className={'chip' + (filtros.tipo === t ? ' active' : '')}
                onClick={() => set({ tipo: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Nº de jogadores</h4>
          <div className="range-row">
            <input
              type="range"
              min="0"
              max="16"
              value={filtros.jogadores}
              onChange={(e) => set({ jogadores: Number(e.target.value) })}
            />
            <b>{filtros.jogadores === 0 ? 'Qualquer' : `${filtros.jogadores} jog.`}</b>
          </div>
          <small style={{ color: 'var(--text-soft)' }}>
            Mostra jogos que suportam essa quantidade.
          </small>
        </div>

        <div className="filter-group">
          <h4>Duração máxima</h4>
          <div className="range-row">
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={filtros.tempoMax}
              onChange={(e) => set({ tempoMax: Number(e.target.value) })}
            />
            <b>{filtros.tempoMax >= 60 ? 'Qualquer' : `≤ ${filtros.tempoMax}m`}</b>
          </div>
        </div>

        <div className="filter-group">
          <h4>Idade mínima</h4>
          <div className="range-row">
            <input
              type="range"
              min="0"
              max="16"
              step="1"
              value={filtros.idadeMax}
              onChange={(e) => set({ idadeMax: Number(e.target.value) })}
            />
            <b>{filtros.idadeMax >= 16 ? 'Qualquer' : `até ${filtros.idadeMax}+`}</b>
          </div>
          <small style={{ color: 'var(--text-soft)' }}>
            Jogos indicados para essa idade ou menos.
          </small>
        </div>

        <div className="filter-group">
          <h4>Partidas jogadas</h4>
          <div className="chips">
            {[
              ['qualquer', 'Qualquer'],
              ['nunca', 'Nunca jogados'],
              ['1', '1+'],
              ['3', '3+'],
              ['5', '5+'],
            ].map(([v, label]) => (
              <button
                key={v}
                className={'chip' + (filtros.partidas === v ? ' active' : '')}
                onClick={() => set({ partidas: v })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>Coleção</h4>
          <div className="chips">
            <button
              className={'chip' + (filtros.soFavoritos ? ' active' : '')}
              onClick={() => set({ soFavoritos: !filtros.soFavoritos })}
            >
              ⭐ Só favoritos
            </button>
          </div>
        </div>
      </div>

      <div className="filters-footer">
        <button className="btn btn-outline btn-sm" onClick={onReset}>
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
