import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ── Helpers ──────────────────────────────────────────────────────────────────

// Mapeia nome do dia JS (0=Dom, 1=Seg…) → campo da grade semanal
function diaDaSemanaAtual(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const dia = d.getDay() // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  const map = { 1: 'segunda', 3: 'quarta', 5: 'sexta' }
  return map[dia] || null
}

// Próximo dia letivo se hoje não for S/Q/S
function proximoDiaLetivo() {
  const hoje = new Date()
  let d = new Date(hoje)
  for (let i = 1; i <= 7; i++) {
    d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    const dia = d.getDay()
    if (dia === 1 || dia === 3 || dia === 5) break
  }
  return d.toISOString().split('T')[0]
}

function turmaFromRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    faixa_etaria: row.faixa_etaria,
    dia_semana: row.dia_semana,
    horario: row.horario,
    modulo_id: row.modulo_id,
    criado_em: row.criado_em,
    ativa: row.ativa === 1,
  }
}

function proximaAula(turmaId, moduloId) {
  return db.prepare(`
    SELECT a.*
    FROM aula a
    WHERE a.modulo_id = ?
      AND a.id NOT IN (
        SELECT aula_id FROM progresso WHERE turma_id = ?
      )
    ORDER BY a.ordem ASC
    LIMIT 1
  `).get(moduloId, turmaId)
}

// ── Turmas ────────────────────────────────────────────────────────────────────

app.get('/api/turmas', (_req, res) => {
  const rows = db.prepare('SELECT * FROM turma ORDER BY horario').all()
  res.json(rows.map(turmaFromRow))
})

app.get('/api/turmas/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM turma WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Turma não encontrada' })

  const turma = turmaFromRow(row)

  // Progressos desta turma com detalhes da aula
  const progressos = db.prepare(`
    SELECT p.*, a.modulo_id, a.ordem, a.codigo, a.titulo, a.resumo_conteudo, a.resumo_pratica, a.requer_preparo, a.nota_preparo
    FROM progresso p
    JOIN aula a ON a.id = p.aula_id
    WHERE p.turma_id = ?
    ORDER BY a.modulo_id, a.ordem
  `).all(req.params.id)

  // Todas as aulas dos módulos desta turma
  const modulosIds = [turma.modulo_id]
  const aulas = db.prepare(
    `SELECT * FROM aula WHERE modulo_id IN (${modulosIds.map(() => '?').join(',')}) ORDER BY modulo_id, ordem`
  ).all(...modulosIds)

  res.json({ turma, progressos, aulas })
})

app.post('/api/turmas', (req, res) => {
  const { nome, faixa_etaria, dia_semana, horario, modulo_id } = req.body
  if (!nome || !faixa_etaria || !dia_semana || !horario || !modulo_id) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, faixa_etaria, dia_semana, horario, modulo_id' })
  }
  const id = randomUUID()
  db.prepare(`
    INSERT INTO turma (id, nome, faixa_etaria, dia_semana, horario, modulo_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, nome, faixa_etaria, dia_semana, horario, modulo_id)
  const row = db.prepare('SELECT * FROM turma WHERE id = ?').get(id)
  res.status(201).json(turmaFromRow(row))
})

app.put('/api/turmas/:id', (req, res) => {
  const { nome, faixa_etaria, dia_semana, horario, modulo_id, ativa } = req.body
  const existing = db.prepare('SELECT id FROM turma WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Turma não encontrada' })

  db.prepare(`
    UPDATE turma
    SET nome = COALESCE(?, nome),
        faixa_etaria = COALESCE(?, faixa_etaria),
        dia_semana = COALESCE(?, dia_semana),
        horario = COALESCE(?, horario),
        modulo_id = COALESCE(?, modulo_id),
        ativa = COALESCE(?, ativa)
    WHERE id = ?
  `).run(
    nome, faixa_etaria, dia_semana, horario, modulo_id,
    ativa !== undefined ? (ativa ? 1 : 0) : null,
    req.params.id
  )
  const row = db.prepare('SELECT * FROM turma WHERE id = ?').get(req.params.id)
  res.json(turmaFromRow(row))
})

app.delete('/api/turmas/:id', (req, res) => {
  db.prepare('UPDATE turma SET ativa = 0 WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ── Módulos e Aulas ───────────────────────────────────────────────────────────

app.get('/api/modulos', (_req, res) => {
  const rows = db.prepare('SELECT * FROM modulo').all()
  res.json(rows)
})

app.get('/api/aulas', (req, res) => {
  const { modulo_id, q } = req.query
  let sql = 'SELECT * FROM aula WHERE 1=1'
  const params = []
  if (modulo_id) { sql += ' AND modulo_id = ?'; params.push(modulo_id) }
  if (q)         { sql += ' AND (titulo LIKE ? OR resumo_conteudo LIKE ? OR resumo_pratica LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`) }
  sql += ' ORDER BY modulo_id, ordem'
  res.json(db.prepare(sql).all(...params))
})

// ── Dashboard ────────────────────────────────────────────────────────────────

app.get('/api/dashboard', (req, res) => {
  // dia=YYYY-MM-DD (opcional; default hoje)
  const diaParam = req.query.dia || null
  let diaLabel = diaDaSemanaAtual(diaParam)
  let dataRef = diaParam || new Date().toISOString().split('T')[0]
  let proximoLetivoUsado = false

  if (!diaLabel) {
    // hoje não é dia letivo → próximo dia letivo
    dataRef = proximoDiaLetivo()
    diaLabel = diaDaSemanaAtual(dataRef)
    proximoLetivoUsado = true
  }

  const turmasAtivas = db.prepare('SELECT * FROM turma WHERE ativa = 1').all().map(turmaFromRow)

  const cards = turmasAtivas.map(turma => {
    if (turma.dia_semana !== diaLabel) return null

    const moduloId = turma.modulo_id
    const modulo = db.prepare('SELECT * FROM modulo WHERE id = ?').get(moduloId)
    const proxAula = proximaAula(turma.id, moduloId)

    // Contagem de aulas já ministradas neste módulo para esta turma
    const totalAulas = db.prepare('SELECT COUNT(*) as n FROM aula WHERE modulo_id = ?').get(moduloId).n
    const aulasFeitas = db.prepare(
      'SELECT COUNT(*) as n FROM progresso p JOIN aula a ON a.id = p.aula_id WHERE p.turma_id = ? AND a.modulo_id = ?'
    ).get(turma.id, moduloId).n

    return {
      turma,
      modulo,
      proxima_aula: proxAula || null,
      total_aulas: totalAulas,
      aulas_feitas: aulasFeitas,
      modulo_concluido: !proxAula,
      alerta_amanha: null, // Como a turma é 1x na semana, não há aula amanhã para a mesma turma
    }
  }).filter(Boolean)

  res.json({ cards, dia: diaLabel, data: dataRef, proximo_dia_letivo: proximoLetivoUsado })
})

// ── Progresso ─────────────────────────────────────────────────────────────────

app.post('/api/progresso', (req, res) => {
  const { turma_id, aula_id, data_ministrada, observacoes } = req.body
  if (!turma_id || !aula_id || !data_ministrada) {
    return res.status(400).json({ error: 'Campos obrigatórios: turma_id, aula_id, data_ministrada' })
  }
  const id = randomUUID()
  try {
    db.prepare(`
      INSERT INTO progresso (id, turma_id, aula_id, data_ministrada, observacoes)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, turma_id, aula_id, data_ministrada, observacoes || null)
    res.status(201).json(db.prepare('SELECT * FROM progresso WHERE id = ?').get(id))
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Esta aula já foi marcada como ministrada para esta turma.' })
    }
    throw e
  }
})

app.put('/api/progresso/:id', (req, res) => {
  const { data_ministrada, observacoes } = req.body
  const existing = db.prepare('SELECT id FROM progresso WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Registro não encontrado' })
  db.prepare(`
    UPDATE progresso SET data_ministrada = COALESCE(?, data_ministrada), observacoes = ? WHERE id = ?
  `).run(data_ministrada, observacoes ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM progresso WHERE id = ?').get(req.params.id))
})

app.delete('/api/progresso/:id', (req, res) => {
  db.prepare('DELETE FROM progresso WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ── Export / Import ───────────────────────────────────────────────────────────

app.get('/api/export', (_req, res) => {
  const turmasAll = db.prepare('SELECT * FROM turma').all().map(turmaFromRow)
  const progressosAll = db.prepare('SELECT * FROM progresso').all()
  const modulosAll = db.prepare('SELECT * FROM modulo').all()
  const aulasAll = db.prepare('SELECT * FROM aula').all()

  const payload = {
    exportado_em: new Date().toISOString(),
    versao: '1.0',
    turmas: turmasAll,
    modulos: modulosAll,
    aulas: aulasAll,
    progressos: progressosAll,
  }

  res.setHeader('Content-Disposition', `attachment; filename="digital_makers_backup_${new Date().toISOString().split('T')[0]}.json"`)
  res.setHeader('Content-Type', 'application/json')
  res.json(payload)
})

app.post('/api/import', (req, res) => {
  const { turmas: tImport, progressos: pImport, modo } = req.body
  if (!tImport || !pImport) {
    return res.status(400).json({ error: 'JSON inválido: esperado { turmas, progressos }' })
  }

  const doImport = db.transaction(() => {
    if (modo === 'substituir') {
      db.prepare('DELETE FROM progresso').run()
      db.prepare('DELETE FROM turma').run()
    }

    for (const t of tImport) {
      db.prepare(`
        INSERT OR REPLACE INTO turma (id, nome, faixa_etaria, dia_semana, horario, modulo_id, criado_em, ativa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        t.id, t.nome, t.faixa_etaria, t.dia_semana, t.horario, t.modulo_id,
        t.criado_em, t.ativa ? 1 : 0
      )
    }

    for (const p of pImport) {
      db.prepare(`
        INSERT OR IGNORE INTO progresso (id, turma_id, aula_id, data_ministrada, observacoes)
        VALUES (?, ?, ?, ?, ?)
      `).run(p.id, p.turma_id, p.aula_id, p.data_ministrada, p.observacoes)
    }
  })

  doImport()
  res.json({ ok: true, turmas_importadas: tImport.length, progressos_importados: pImport.length })
})

// ── Servir Frontend em Produção ─────────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Digital Makers API rodando em http://localhost:${PORT}`)
})
