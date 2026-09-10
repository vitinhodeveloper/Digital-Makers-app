import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'
import { modulos, aulas, turmas } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'digital_makers.db')

// Garantir que a pasta do banco existe
mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new DatabaseSync(DB_PATH)

// Adicionar compatibilidade com pragma e transaction
db.pragma = (sql) => db.exec('PRAGMA ' + sql)
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN')
  try {
    const res = fn(...args)
    db.exec('COMMIT')
    return res
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// Ativar WAL para melhor performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Criação das tabelas ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS modulo (
    id           TEXT PRIMARY KEY,
    nome         TEXT NOT NULL,
    faixa_etaria TEXT NOT NULL CHECK (faixa_etaria IN ('kids','teens'))
  );

  CREATE TABLE IF NOT EXISTS aula (
    id              TEXT PRIMARY KEY,
    modulo_id       TEXT NOT NULL REFERENCES modulo(id),
    ordem           INTEGER NOT NULL,
    codigo          TEXT NOT NULL,
    titulo          TEXT NOT NULL,
    resumo_conteudo TEXT NOT NULL,
    resumo_pratica  TEXT NOT NULL,
    requer_preparo  INTEGER NOT NULL DEFAULT 0,
    nota_preparo    TEXT
  );

  CREATE TABLE IF NOT EXISTS turma (
    id           TEXT PRIMARY KEY,
    nome         TEXT NOT NULL,
    faixa_etaria TEXT NOT NULL CHECK (faixa_etaria IN ('kids','teens')),
    dia_semana   TEXT NOT NULL CHECK (dia_semana IN ('segunda','quarta','sexta')),
    horario      TEXT NOT NULL,
    modulo_id    TEXT NOT NULL REFERENCES modulo(id),
    criado_em    TEXT NOT NULL DEFAULT (date('now')),
    ativa        INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS progresso (
    id              TEXT PRIMARY KEY,
    turma_id        TEXT NOT NULL REFERENCES turma(id),
    aula_id         TEXT NOT NULL REFERENCES aula(id),
    data_ministrada TEXT NOT NULL,
    observacoes     TEXT,
    UNIQUE(turma_id, aula_id)
  );
`)

// ── Seed automático ─────────────────────────────────────────────────────────
const jaTemModulos = db.prepare('SELECT COUNT(*) as n FROM modulo').get().n > 0

const insModulo = db.prepare(
  'INSERT OR IGNORE INTO modulo (id, nome, faixa_etaria) VALUES (?, ?, ?)'
)
const insAula = db.prepare(`
  INSERT OR IGNORE INTO aula
    (id, modulo_id, ordem, codigo, titulo, resumo_conteudo, resumo_pratica, requer_preparo, nota_preparo)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const insTurma = db.prepare(`
  INSERT OR REPLACE INTO turma
    (id, nome, faixa_etaria, dia_semana, horario, modulo_id)
  VALUES (?, ?, ?, ?, ?, ?)
`)

if (!jaTemModulos) {
  console.log('🌱 Populando banco de dados com seed inicial…')
  const seedBase = db.transaction(() => {
    for (const m of modulos) insModulo.run(m.id, m.nome, m.faixa_etaria)
    for (const a of aulas)   insAula.run(a.id, a.modulo_id, a.ordem, a.codigo, a.titulo, a.resumo_conteudo, a.resumo_pratica, a.requer_preparo, a.nota_preparo)
    for (const t of turmas)  insTurma.run(t.id, t.nome, t.faixa_etaria, t.dia_semana, t.horario, t.modulo_id)
  })
  seedBase()
  console.log(`✅ Seed concluído: ${modulos.length} módulos, ${aulas.length} aulas, ${turmas.length} turmas.`)
} else {
  // Se o banco já tiver rodado com o seed antigo (ex: menos de 18 turmas ou turma-1 antiga)
  const temSeedNovo = db.prepare("SELECT COUNT(*) as n FROM turma WHERE id = 'turma-01'").get().n > 0
  if (!temSeedNovo) {
    console.log('🔄 Atualizando turmas para o seed oficial de 18 turmas…')
    const seedTurmas = db.transaction(() => {
      db.prepare("DELETE FROM turma WHERE id NOT IN (SELECT DISTINCT turma_id FROM progresso)").run()
      for (const t of turmas) {
        insTurma.run(t.id, t.nome, t.faixa_etaria, t.dia_semana, t.horario, t.modulo_id)
      }
    })
    seedTurmas()
    console.log(`✅ Turmas atualizadas com sucesso para ${turmas.length} turmas semanais.`)
  }
}

export default db
