// src/components/MarcarAulaModal.jsx
import { useState } from 'react'

export default function MarcarAulaModal({ aula, turma, modulo, progressoExistente, onClose, onSave, onDelete }) {
  const hoje = new Date().toISOString().split('T')[0]
  const [data, setData] = useState(progressoExistente?.data_ministrada || hoje)
  const [obs, setObs] = useState(progressoExistente?.observacoes || '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  async function handleSave() {
    setLoading(true)
    setErro(null)
    try {
      await onSave({ data_ministrada: data, observacoes: obs })
      onClose()
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Desmarcar esta aula?')) return
    setLoading(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md card animate-slide-up border border-primary-500/20">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
              {turma.nome} · {modulo.nome}
            </p>
            <h2 className="text-base font-bold text-white leading-snug">{aula.titulo}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{aula.codigo}</p>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost ml-3 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo resumo */}
        <div className="mb-4 p-3 bg-surface-700/60 rounded-xl text-sm text-slate-300 space-y-2">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Conteúdo</span>
            <p className="mt-0.5">{aula.resumo_conteudo}</p>
          </div>
          <div className="divider !my-2" />
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Prática</span>
            <p className="mt-0.5">{aula.resumo_pratica}</p>
          </div>
        </div>

        {/* Data */}
        <div className="mb-3">
          <label className="label" htmlFor="data-ministrada">Data da aula</label>
          <input
            id="data-ministrada"
            type="date"
            className="input"
            value={data}
            onChange={e => setData(e.target.value)}
          />
        </div>

        {/* Observações */}
        <div className="mb-5">
          <label className="label" htmlFor="obs">Observações (opcional)</label>
          <textarea
            id="obs"
            className="input h-20"
            placeholder="Como foi a aula? Quem faltou? O que reforçar?"
            value={obs}
            onChange={e => setObs(e.target.value)}
          />
        </div>

        {erro && <p className="text-red-400 text-sm mb-3">⚠️ {erro}</p>}

        {/* Ações */}
        <div className="flex gap-2 justify-between">
          {progressoExistente && (
            <button className="btn-danger btn-sm" onClick={handleDelete} disabled={loading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Desmarcar
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button className="btn-ghost btn-sm" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn-success btn-sm" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando…' : progressoExistente ? 'Atualizar' : '✓ Marcar ministrada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
