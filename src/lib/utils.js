// src/lib/utils.js — funções utilitárias
export function fmtData(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function diaNome(dia) {
  const nomes = { segunda: 'Segunda', quarta: 'Quarta', sexta: 'Sexta' }
  return nomes[dia] || dia
}

export function moduloBadgeClass(moduloId) {
  if (!moduloId) return 'badge-m1'
  return moduloId.includes('m2') ? 'badge-m2' : 'badge-m1'
}

export function moduloNomeCurto(nome) {
  if (!nome) return ''
  return nome.replace('KIDS — ', '').replace('TEENS — ', '')
}

export function faixaBadgeClass(faixa) {
  return faixa === 'kids' ? 'badge-kids' : 'badge-teens'
}
