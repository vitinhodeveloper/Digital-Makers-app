// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { fmtData, moduloBadgeClass, moduloNomeCurto, faixaBadgeClass } from '../lib/utils'
import MarcarAulaModal from '../components/MarcarAulaModal'
import ProgressoBar from '../components/ProgressoBar'

const DIAS_PT = { segunda: 'Segunda-feira', quarta: 'Quarta-feira', sexta: 'Sexta-feira' }

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { card }
  const [diaCustom, setDiaCustom] = useState('')
  const navigate = useNavigate()

  const carregar = useCallback(async (dia) => {
    setLoading(true)
    try {
      const res = await api.getDashboard(dia || undefined)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function marcarMinistrada(card, datas, obs) {
    await api.marcarAula({
      turma_id: card.turma.id,
      aula_id: card.proxima_aula.id,
      data_ministrada: datas,
      observacoes: obs,
    })
    await carregar(diaCustom)
  }

  if (loading) return <LoadingState />

  const { cards, dia, proximo_dia_letivo: proximoLetivoUsado, data: dataRef } = data

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            {proximoLetivoUsado
              ? `Sem aulas hoje — mostrando próximo dia letivo (${fmtData(dataRef)})`
              : `Hoje é ${DIAS_PT[dia] || dia}, ${fmtData(dataRef)}`
            }
          </p>
        </div>
        {/* Seletor de dia */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input !w-auto text-xs"
            value={diaCustom}
            onChange={e => { setDiaCustom(e.target.value); carregar(e.target.value) }}
          />
          {diaCustom && (
            <button className="btn-ghost btn-sm" onClick={() => { setDiaCustom(''); carregar() }}>
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Sem cards */}
      {cards.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-slate-300 font-semibold">Nenhuma aula hoje!</p>
          <p className="text-slate-500 text-sm mt-1">Selecione outra data para ver o planejamento.</p>
        </div>
      )}

      {/* Cards por horário */}
      <div className="space-y-4">
        {cards.map(card => (
          <CardTurmasDia
            key={card.turma.id}
            card={card}
            onMarcar={() => setModal({ card })}
            onVerTurma={() => navigate(`/turma/${card.turma.id}`)}
          />
        ))}
      </div>

      {/* Modal */}
      {modal && !modal.card.modulo_concluido && (
        <MarcarAulaModal
          aula={modal.card.proxima_aula}
          turma={modal.card.turma}
          modulo={modal.card.modulo}
          progressoExistente={null}
          onClose={() => setModal(null)}
          onSave={({ data_ministrada, observacoes }) =>
            marcarMinistrada(modal.card, data_ministrada, observacoes)
          }
          onDelete={() => {}}
        />
      )}
    </div>
  )
}

function CardTurmasDia({ card, onMarcar, onVerTurma }) {
  const { turma, modulo, proxima_aula, total_aulas, aulas_feitas, modulo_concluido, alerta_amanha } = card
  const pct = total_aulas > 0 ? Math.round((aulas_feitas / total_aulas) * 100) : 0

  return (
    <div className="card-hover group">
      {/* Topo: turma + horário */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0
            ${turma.faixa_etaria === 'kids'
              ? 'bg-kids/15 text-kids border border-kids/30'
              : 'bg-teens/15 text-teens border border-teens/30'}`}>
            {turma.faixa_etaria === 'kids' ? '🧒' : '🧑'}
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm leading-tight">{turma.nome}</h2>
            <p className="text-xs text-slate-400 mt-0.5">⏰ {turma.horario}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={moduloBadgeClass(modulo?.id)}>
            {moduloNomeCurto(modulo?.nome)}
          </span>
          <button className="btn-ghost btn-sm" onClick={onVerTurma} title="Ver turma completa">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-4">
        <ProgressoBar feitas={aulas_feitas} total={total_aulas} moduloId={modulo?.id} />
      </div>

      {/* Próxima aula / concluído */}
      {modulo_concluido ? (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-semibold text-emerald-300 text-sm">Módulo concluído!</p>
            <p className="text-xs text-slate-400">Todas as {total_aulas} aulas foram ministradas.</p>
          </div>
        </div>
      ) : proxima_aula ? (
        <div className="space-y-3">
          {/* Info da aula */}
          <div className="p-3 bg-surface-700/50 rounded-xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                  Aula {proxima_aula.ordem} · {proxima_aula.codigo}
                </p>
                <p className="font-semibold text-white text-sm leading-snug">{proxima_aula.titulo}</p>
              </div>
              {proxima_aula.requer_preparo ? (
                <span className="badge-prep flex-shrink-0">⚠ Preparo</span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">{proxima_aula.resumo_conteudo}</p>
            {proxima_aula.nota_preparo && (
              <div className="alert-warn mt-2 !py-2">
                <span>📋</span>
                <span className="text-xs">{proxima_aula.nota_preparo}</span>
              </div>
            )}
          </div>

          {/* Alerta amanhã */}
          {alerta_amanha && (
            <div className="alert-warn">
              <span>🔔</span>
              <div>
                <p className="font-semibold text-xs">Preparo para amanhã!</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Próxima aula ({alerta_amanha.codigo}) requer: {alerta_amanha.nota_preparo}
                </p>
              </div>
            </div>
          )}

          {/* Botão marcar */}
          <button className="btn-success w-full justify-center" onClick={onMarcar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Marcar como ministrada
          </button>
        </div>
      ) : null}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="h-8 w-48 bg-surface-700 rounded-xl animate-pulse mb-2" />
      <div className="h-4 w-72 bg-surface-700 rounded-lg animate-pulse mb-8" />
      {[1,2,3].map(i => (
        <div key={i} className="card mb-4">
          <div className="h-4 w-40 bg-surface-600 rounded animate-pulse mb-3" />
          <div className="h-2 w-full bg-surface-600 rounded animate-pulse mb-3" />
          <div className="h-16 bg-surface-600 rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  )
}
