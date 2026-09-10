// src/lib/api.js — helpers para chamar a API REST do backend
const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Turmas
  getTurmas: ()             => req('GET',  '/turmas'),
  getTurma:  (id)           => req('GET',  `/turmas/${id}`),
  criarTurma: (data)        => req('POST', '/turmas', data),
  editarTurma: (id, data)   => req('PUT',  `/turmas/${id}`, data),
  arquivarTurma: (id)       => req('DELETE', `/turmas/${id}`),

  // Módulos e Aulas
  getModulos: ()            => req('GET', '/modulos'),
  getAulas: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return req('GET', `/aulas${q ? '?' + q : ''}`)
  },

  // Dashboard
  getDashboard: (dia) => {
    const q = dia ? `?dia=${dia}` : ''
    return req('GET', `/dashboard${q}`)
  },

  // Progresso
  marcarAula: (data)          => req('POST',   '/progresso', data),
  editarProgresso: (id, data) => req('PUT',    `/progresso/${id}`, data),
  desmarcarAula: (id)         => req('DELETE', `/progresso/${id}`),

  // Export / Import
  exportar: async () => {
    const res = await fetch(`${BASE}/export`)
    if (!res.ok) throw new Error('Erro ao exportar')
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `digital_makers_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  },
  importar: (payload) => req('POST', '/import', payload),
}
