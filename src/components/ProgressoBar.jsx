// src/components/ProgressoBar.jsx
export default function ProgressoBar({ feitas, total, faixaEtaria, moduloId }) {
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0

  const colorClass = moduloId?.includes('m2')
    ? 'bg-gradient-to-r from-orange-500 to-amber-400'
    : 'bg-gradient-to-r from-violet-600 to-primary-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>{feitas} de {total} aulas</span>
        <span className="font-semibold text-slate-300">{pct}%</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
