// src/pages/Configuracoes.jsx
import { useState, useRef } from 'react'
import { api } from '../lib/api'

export default function Configuracoes() {
  const [status, setStatus] = useState(null) // { tipo: 'ok'|'erro', msg }
  const [importando, setImportando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [preview, setPreview] = useState(null)  // dados do JSON lido antes de confirmar
  const [modoImport, setModoImport] = useState('mesclar') // 'mesclar' | 'substituir'
  const fileRef = useRef(null)

  function msg(tipo, texto) {
    setStatus({ tipo, msg: texto })
    setTimeout(() => setStatus(null), 5000)
  }

  async function handleExportar() {
    setExportando(true)
    try {
      await api.exportar()
      msg('ok', 'Backup exportado com sucesso!')
    } catch (e) {
      msg('erro', e.message)
    } finally {
      setExportando(false)
    }
  }

  function handleArquivoSelecionado(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result)
        if (!dados.turmas || !dados.progressos) {
          msg('erro', 'Arquivo JSON inválido: deve conter { turmas, progressos }')
          return
        }
        setPreview(dados)
      } catch {
        msg('erro', 'Arquivo inválido — não é um JSON correto.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmarImport() {
    if (!preview) return
    setImportando(true)
    try {
      const res = await api.importar({ ...preview, modo: modoImport })
      setPreview(null)
      msg('ok', `Importado: ${res.turmas_importadas} turmas, ${res.progressos_importados} registros de progresso.`)
    } catch (e) {
      msg('erro', e.message)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-slate-400 text-sm mt-1">Backup, importação e exportação de dados</p>
      </div>

      {/* Status */}
      {status && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium animate-slide-up ${
          status.tipo === 'ok'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300'
        }`}>
          {status.tipo === 'ok' ? '✅ ' : '❌ '}{status.msg}
        </div>
      )}

      {/* Exportar */}
      <div className="card mb-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-primary-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white mb-1">Exportar backup</h2>
            <p className="text-sm text-slate-400 mb-4">
              Baixa um arquivo <code className="font-mono text-xs bg-surface-600 px-1 py-0.5 rounded">.json</code> com
              todas as turmas, módulos, aulas e histórico de progresso. Use para backup manual ou para migrar entre computadores.
            </p>
            <button className="btn-primary" onClick={handleExportar} disabled={exportando}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exportando ? 'Exportando…' : 'Baixar backup (.json)'}
            </button>
          </div>
        </div>
      </div>

      {/* Importar */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white mb-1">Importar backup</h2>
            <p className="text-sm text-slate-400 mb-4">
              Selecione um arquivo <code className="font-mono text-xs bg-surface-600 px-1 py-0.5 rounded">.json</code> exportado
              anteriormente para restaurar turmas e histórico de progresso.
            </p>

            {/* Modo */}
            <div className="mb-4">
              <p className="label mb-2">Modo de importação</p>
              <div className="flex gap-3">
                {[
                  { v: 'mesclar',    l: 'Mesclar',   d: 'Adiciona sem apagar dados existentes' },
                  { v: 'substituir', l: 'Substituir', d: 'Apaga tudo e restaura o backup' },
                ].map(opt => (
                  <label key={opt.v}
                    className={`flex-1 cursor-pointer p-3 rounded-xl border text-sm transition-all ${
                      modoImport === opt.v
                        ? 'border-primary-500/50 bg-primary-500/10 text-white'
                        : 'border-white/10 bg-surface-700/50 text-slate-400 hover:border-white/20'
                    }`}>
                    <input type="radio" className="sr-only" value={opt.v}
                      checked={modoImport === opt.v} onChange={() => setModoImport(opt.v)} />
                    <p className="font-semibold">{opt.l}</p>
                    <p className="text-xs opacity-70 mt-0.5">{opt.d}</p>
                  </label>
                ))}
              </div>
            </div>

            {modoImport === 'substituir' && (
              <div className="alert-warn mb-4">
                <span>⚠️</span>
                <p>
                  <strong>Atenção:</strong> o modo "Substituir" apaga todo o histórico de progresso atual
                  antes de importar. Esta ação não pode ser desfeita.
                </p>
              </div>
            )}

            <input ref={fileRef} type="file" accept=".json" className="hidden"
              onChange={handleArquivoSelecionado} />

            {!preview ? (
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Selecionar arquivo JSON
              </button>
            ) : (
              <div className="p-4 bg-surface-700/50 rounded-xl border border-primary-500/20 animate-slide-up">
                <p className="text-sm font-semibold text-white mb-1">Arquivo lido com sucesso!</p>
                <div className="text-xs text-slate-400 space-y-0.5 mb-4">
                  <p>📅 Exportado em: {preview.exportado_em ? new Date(preview.exportado_em).toLocaleString('pt-BR') : '—'}</p>
                  <p>🏫 Turmas: {preview.turmas?.length || 0}</p>
                  <p>📚 Registros de progresso: {preview.progressos?.length || 0}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => setPreview(null)}>Cancelar</button>
                  <button className="btn-primary btn-sm" onClick={confirmarImport} disabled={importando}>
                    {importando ? 'Importando…' : `Confirmar ${modoImport === 'substituir' ? 'substituição' : 'mesclagem'}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-surface-800/50 border border-white/5 rounded-xl">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sobre os dados</h3>
        <p className="text-xs text-slate-600">
          Todos os dados são armazenados localmente em um banco SQLite dentro da pasta <code className="font-mono bg-surface-700 px-1 rounded">data/digital_makers.db</code>.
          Faça backups periódicos usando o botão acima para não perder o histórico de progresso.
        </p>
      </div>
    </div>
  )
}
