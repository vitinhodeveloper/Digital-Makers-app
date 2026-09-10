// src/pages/Turmas.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { faixaBadgeClass, moduloBadgeClass } from '../lib/utils'

const MODULO_OPTS = [
  { value: 'kids-m1',  label: 'Kids — Módulo 1' },
  { value: 'kids-m2',  label: 'Kids — Módulo 2' },
  { value: 'teens-m1', label: 'Teens — Módulo 1' },
  { value: 'teens-m2', label: 'Teens — Módulo 2' },
]

const FORM_INICIAL = {
  nome: '',
  faixa_etaria: 'kids',
  dia_semana: 'segunda',
  horario: '',
  modulo_id: 'kids-m1',
}

export default function Turmas() {
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null) // turma em edição
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const navigate = useNavigate()

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getTurmas()
      setTurmas(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function iniciarEdicao(turma) {
    setEditando(turma)
    setForm({
      nome: turma.nome,
      faixa_etaria: turma.faixa_etaria,
      dia_semana: turma.dia_semana,
      horario: turma.horario,
      modulo_id: turma.modulo_id,
    })
    setShowForm(true)
  }

  function cancelar() {
    setShowForm(false)
    setEditando(null)
    setForm(FORM_INICIAL)
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const payload = {
      nome: form.nome,
      faixa_etaria: form.faixa_etaria,
      dia_semana: form.dia_semana,
      horario: form.horario,
      modulo_id: form.modulo_id,
    }
    try {
      if (editando) {
        await api.editarTurma(editando.id, payload)
      } else {
        await api.criarTurma(payload)
      }
      cancelar()
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function arquivar(turma) {
    if (!confirm(`Arquivar a turma "${turma.nome}"? O histórico de progresso será preservado.`)) return
    await api.arquivarTurma(turma.id)
    await carregar()
  }

  const turmasAtivas   = turmas.filter(t => t.ativa)
  const turmasArquiv   = turmas.filter(t => !t.ativa)

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Turmas</h1>
          <p className="text-slate-400 text-sm mt-1">{turmasAtivas.length} turma(s) ativa(s)</p>
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => { setShowForm(true); setEditando(null); setForm(FORM_INICIAL) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova turma
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="card mb-6 border border-primary-500/20 animate-slide-up">
          <h2 className="text-base font-bold text-white mb-5">
            {editando ? `Editando: ${editando.nome}` : 'Nova turma'}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label" htmlFor="nome">Nome da turma</label>
                <input id="nome" className="input" required placeholder="Ex: Kids 8-11 anos — 8h00"
                  value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="label" htmlFor="faixa">Faixa etária</label>
                <select id="faixa" className="select" value={form.faixa_etaria}
                  onChange={e => setForm(f => ({ ...f, faixa_etaria: e.target.value }))}>
                  <option value="kids">Kids (8-11 anos)</option>
                  <option value="teens">Teens (12-15 anos)</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="horario">Horário</label>
                <input id="horario" className="input" required placeholder="Ex: 8h00 às 9h00"
                  value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="dia_semana">Dia da Semana</label>
                <select id="dia_semana" className="select" value={form.dia_semana}
                  onChange={e => setForm(f => ({ ...f, dia_semana: e.target.value }))}>
                  <option value="segunda">Segunda-feira</option>
                  <option value="quarta">Quarta-feira</option>
                  <option value="sexta">Sexta-feira</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="modulo_id">Módulo Atual</label>
                <select id="modulo_id" className="select" value={form.modulo_id}
                  onChange={e => setForm(f => ({ ...f, modulo_id: e.target.value }))}>
                  {MODULO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-ghost" onClick={cancelar}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={salvando}>
                {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar turma'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de turmas ativas */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {turmasAtivas.map(turma => (
            <TurmaCard key={turma.id} turma={turma}
              onVer={() => navigate(`/turma/${turma.id}`)}
              onEditar={() => iniciarEdicao(turma)}
              onArquivar={() => arquivar(turma)}
            />
          ))}
        </div>
      )}

      {/* Arquivadas */}
      {turmasArquiv.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-slate-500 text-sm font-semibold hover:text-slate-300 transition-colors">
            {turmasArquiv.length} turma(s) arquivada(s)
          </summary>
          <div className="space-y-3 mt-3 opacity-60">
            {turmasArquiv.map(turma => (
              <TurmaCard key={turma.id} turma={turma} arquivada
                onVer={() => navigate(`/turma/${turma.id}`)}
                onEditar={() => iniciarEdicao(turma)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function TurmaCard({ turma, arquivada, onVer, onEditar, onArquivar }) {
  const DIAS = { segunda: 'Seg', quarta: 'Qua', sexta: 'Sex' }

  return (
    <div className="card-hover flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
        ${turma.faixa_etaria === 'kids'
          ? 'bg-kids/15 border border-kids/30'
          : 'bg-teens/15 border border-teens/30'}`}>
        {turma.faixa_etaria === 'kids' ? '🧒' : '🧑'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-white text-sm">{turma.nome}</p>
          <span className={faixaBadgeClass(turma.faixa_etaria)}>
            {turma.faixa_etaria === 'kids' ? 'Kids' : 'Teens'}
          </span>
          {arquivada && <span className="badge bg-slate-500/20 text-slate-400 border border-slate-500/30">Arquivada</span>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">⏰ {turma.horario}</p>
        <div className="flex gap-2 mt-2">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-700/60 rounded text-xs">
            <span className="text-slate-500">{DIAS[turma.dia_semana]}</span>
            <span className={turma.modulo_id.includes('m2') ? 'text-orange-400 font-bold' : 'text-violet-400 font-bold'}>
              {turma.modulo_id.includes('m1') ? 'M1' : 'M2'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button className="btn-ghost btn-sm" onClick={onVer}>Ver trilha</button>
        <button className="btn-ghost btn-sm btn-icon" onClick={onEditar} title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        {!arquivada && onArquivar && (
          <button className="btn-ghost btn-sm btn-icon text-slate-600 hover:text-red-400" onClick={onArquivar} title="Arquivar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
