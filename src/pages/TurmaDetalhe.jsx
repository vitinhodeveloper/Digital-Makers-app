// src/pages/TurmaDetalhe.jsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtData, moduloBadgeClass, moduloNomeCurto } from '../lib/utils'
import ProgressoBar from '../components/ProgressoBar'
import MarcarAulaModal from '../components/MarcarAulaModal'

const DIAS_LABEL = { segunda: 'Seg', quarta: 'Qua', sexta: 'Sex' }

export default function TurmaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)   // { aula, progresso|null }
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getTurma(id)
      setDados(res)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  if (loading) return <Loading />
  if (!dados) return null

  const { turma, progressos, aulas } = dados
  const moduloId = turma.modulo_id

  function aulasDoModulo() {
    return aulas.filter(a => a.modulo_id === moduloId)
  }

  function progressoDaAula(aulaId) {
    return progressos.find(p => p.aula_id === aulaId) || null
  }

  function aulasFeitas() {
    return progressos.filter(p => p.modulo_id === moduloId).length
  }

  async function salvarProgresso({ data_ministrada, observacoes }) {
    if (modal.progresso) {
      await api.editarProgresso(modal.progresso.id, { data_ministrada, observacoes })
    } else {
      await api.marcarAula({ turma_id: turma.id, aula_id: modal.aula.id, data_ministrada, observacoes })
    }
    await carregar()
  }

  async function desmarcar() {
    if (modal.progresso) {
      await api.desmarcarAula(modal.progresso.id)
      await carregar()
    }
  }

  const listagemFiltrada = () => {
    const lista = aulasDoModulo()
    if (!busca.trim()) return lista
    const q = busca.toLowerCase()
    return lista.filter(a =>
      a.titulo.toLowerCase().includes(q) ||
      a.resumo_conteudo.toLowerCase().includes(q) ||
      a.resumo_pratica.toLowerCase().includes(q)
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Voltar
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0
            ${turma.faixa_etaria === 'kids'
              ? 'bg-kids/15 border border-kids/30'
              : 'bg-teens/15 border border-teens/30'}`}>
            {turma.faixa_etaria === 'kids' ? '🧒' : '🧑'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{turma.nome}</h1>
            <p className="text-slate-400 text-sm mt-0.5">⏰ {turma.horario}</p>

            {/* Grade */}
            <div className="flex gap-2 mt-3">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-700/60 rounded-lg">
                <span className="text-xs font-semibold text-slate-400">{DIAS_LABEL[turma.dia_semana]}</span>
                <span className={`text-xs font-bold ${turma.modulo_id.includes('m2') ? 'text-orange-400' : 'text-violet-400'}`}>
                  {turma.modulo_id.includes('m1') ? 'M1' : 'M2'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo do Módulo */}
      {(() => {
        const totalM = aulasDoModulo().length
        const feitasM = aulasFeitas()
        const listagem = listagemFiltrada()

        return (
          <div className="animate-fade-in">
            {/* Progresso do módulo */}
            <div className="card mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`${moduloBadgeClass(moduloId)}`}>
                  {moduloNomeCurto(moduloId)}
                  {moduloId.includes('m1') ? 'Módulo 1' : 'Módulo 2'}
                </span>
                {feitasM === totalM && totalM > 0 && (
                  <span className="badge-done">🏆 Concluído</span>
                )}
              </div>
              <ProgressoBar feitas={feitasM} total={totalM} moduloId={moduloId} />
            </div>

            {/* Busca */}
            <div className="relative mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="input pl-9"
                placeholder="Buscar aula por título, conteúdo ou prática…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              {busca && (
                <button
                  onClick={() => setBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >✕</button>
              )}
            </div>

            {/* Timeline */}
            <div className="card">
              {listagem.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhuma aula encontrada para "{busca}"</p>
              ) : (
                <div className="space-y-1">
                  {listagem.map((aula, idx) => {
                    const prog = progressoDaAula(aula.id)
                    const proximo = !prog && listagemFiltrada().find(a => !progressoDaAula(a.id))?.id === aula.id
                    return (
                      <TimelineItem
                        key={aula.id}
                        aula={aula}
                        progresso={prog}
                        isProximo={proximo}
                        isFiltrado={!!busca}
                        onClick={() => setModal({ aula, progresso: prog })}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Modal */}
      {modal && (
        <MarcarAulaModal
          aula={modal.aula}
          turma={turma}
          modulo={{ id: moduloId, nome: `Módulo ${moduloId?.includes('m2') ? '2' : '1'}` }}
          progressoExistente={modal.progresso}
          onClose={() => setModal(null)}
          onSave={salvarProgresso}
          onDelete={desmarcar}
        />
      )}
    </div>
  )
}

function TimelineItem({ aula, progresso, isProximo, isFiltrado, onClick }) {
  const done = !!progresso
  const className = done
    ? 'timeline-item-done cursor-pointer'
    : isProximo
      ? 'timeline-item-current cursor-pointer'
      : 'timeline-item-future cursor-pointer'

  return (
    <div className={className} onClick={onClick}>
      {/* Ícone de status */}
      <div className="flex-shrink-0 mt-0.5">
        {done ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-500/50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : isProximo ? (
          <div className="w-6 h-6 rounded-full bg-primary-500/30 border-2 border-primary-400 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse-slow" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-surface-600 border border-surface-500 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-mono">{aula.codigo}</span>
              {isProximo && <span className="badge bg-primary-500/20 text-primary-300 border border-primary-500/30">Próxima</span>}
              {aula.requer_preparo && !done && <span className="badge-prep">⚠ Preparo</span>}
            </div>
            <p className={`text-sm font-semibold mt-0.5 ${done ? 'text-emerald-200' : isProximo ? 'text-white' : 'text-slate-400'}`}>
              {aula.titulo}
            </p>
            {(done || isProximo) && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{aula.resumo_conteudo}</p>
            )}
          </div>

          {/* Data + ação */}
          <div className="flex-shrink-0 text-right">
            {done && (
              <>
                <p className="text-xs text-emerald-400 font-medium">{fmtData(progresso.data_ministrada)}</p>
                {progresso.observacoes && (
                  <p className="text-xs text-slate-600 mt-0.5 max-w-24 truncate" title={progresso.observacoes}>
                    📝 obs.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-6 w-32 bg-surface-700 rounded animate-pulse mb-4" />
      <div className="card mb-6 h-28 animate-pulse" />
      <div className="card h-64 animate-pulse" />
    </div>
  )
}
