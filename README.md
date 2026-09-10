# 🚀 Digital Makers

Aplicação desktop e web para acompanhamento e planejamento de aulas de tecnologia (**Kids** e **Teens**).

---

## 📌 1. Visão Geral e Propósito

O **Digital Makers** foi desenvolvido sob medida para a rotina de professores e coordenadores de tecnologia. O sistema atende aos seguintes requisitos pedagógicos fundamentais:

- **18 Turmas Semanais:** Os alunos vão à escola **apenas 1 vez por semana**. Por isso, a escola opera com 18 turmas independentes distribuídas em horários e dias fixos (**Segunda, Quarta e Sexta**).
- **Cálculo Automático da "Próxima Aula":** O sistema identifica em tempo real qual é a próxima aula a ser ministrada por turma, impedindo descompasso entre turmas que estão no mesmo módulo.
- **Alertas de Preparação Antecipada:** Identificação visual de aulas que necessitam de materiais antecipados (impressão de cartões, formulários do Google Forms, contas pré-configuradas, etc.).
- **Offline First & Modo Pen-drive:** Funciona como um executável para Windows (.exe) nativo, sem depender de internet, Node.js ou instalação prévia.

---

## 🏗️ 2. Arquitetura da Aplicação

O projeto adota uma arquitetura híbrida moderna e leve, sem dependências C++ externas:

```text
┌──────────────────────────────────────────────────────────┐
│                   Electron Shell                         │
│                                                          │
│  ┌─────────────────────────┐   HTTP   ┌───────────────┐  │
│  │     Frontend SPA        │ ◄──────► │ Backend Local │  │
│  │  (React 18 + Vite       │          │ (Express +    │  │
│  │   + Tailwind CSS)       │          │  node:sqlite) │  │
│  └─────────────────────────┘          └───────┬───────┘  │
│                                               │          │
└───────────────────────────────────────────────┼──────────┘
                                                ▼
                                    ┌───────────────────────┐
                                    │    digital_makers.db  │
                                    │   (SQLite Permanente) │
                                    └───────────────────────┘
```

### Tecnologias:
- **Interface (Frontend):** React 18, React Router DOM v6, Tailwind CSS, Vite
- **Servidor Local (Backend):** Node.js, Express.js
- **Banco de Dados:** SQLite utilizando o driver nativo `node:sqlite` do Node 22+ (sem necessidade de `better-sqlite3` ou compilações C++)
- **Desktop Packaging:** Electron 44 e `electron-builder` (Instalador NSIS e Versão Portátil)

---

## 📂 3. Estrutura do Projeto

```text
app/
├── dist/                      # Build otimizado do React (Vite)
├── dist-electron/             # Executáveis compilados para Windows (.exe)
│   ├── Digital Makers Setup 1.0.0.exe      # Instalador com atalho
│   └── Digital Makers-Portatil-1.0.0.exe   # Versão portátil (sem instalação)
├── electron/                  # Processo principal do Electron
│   ├── main.cjs               # Inicializador do backend e janela desktop
│   └── preload.cjs            # Script de isolamento de contexto
├── server/                    # API REST e banco de dados
│   ├── db.js                  # Conexão SQLite, migrations e seeds
│   ├── index.js               # Rotas Express
│   └── seed.js                # Catálogo pedagógico (módulos, aulas e 18 turmas)
├── src/                       # Frontend React
│   ├── components/            # Componentes visuais (Header, Modais, Cards)
│   ├── lib/                   # Cliente HTTP e utilitários
│   ├── pages/                 # Telas da aplicação (Dashboard, Turmas, Módulos, etc.)
│   ├── App.jsx                # Configuração de rotas
│   └── main.jsx               # Ponto de montagem da SPA
├── electron-builder.json      # Configurações do instalador Windows
└── package.json               # Dependências e scripts
```

---

## 🗄️ 4. Modelo de Dados (SQLite)

O banco de dados relacional é estruturado em 4 tabelas principais:

### `modulo`
- `id` (TEXT, PK): `'kids-m1'`, `'kids-m2'`, `'teens-m1'`, `'teens-m2'`
- `nome` (TEXT): Nome descritivo (ex.: *"Kids — Módulo 1 (8-11 anos)"*)
- `faixa_etaria` (TEXT): `'kids'` ou `'teens'`

### `aula`
- `id` (TEXT, PK): Identificador único (ex.: `'kids-m2-01'`)
- `modulo_id` (TEXT, FK): Módulo pertencente
- `ordem` (INTEGER): Posição da aula na sequência (1 a 20)
- `codigo` (TEXT): Código amigável (ex.: `'Aula 1'`, `'A4 - A5'`)
- `titulo` (TEXT): Tema da aula
- `resumo_conteudo` (TEXT): Base conceitual
- `resumo_pratica` (TEXT): Atividade prática de laboratório
- `requer_preparo` (INTEGER, 0 ou 1): Sinalizador de materiais prévios
- `nota_preparo` (TEXT): Orientações para o professor

### `turma`
- `id` (TEXT, PK): Identificador da turma (`'turma-01'` até `'turma-18'`)
- `nome` (TEXT): Nome da turma (ex.: *"Kids 8-11 anos — 8h00 — Segunda"*)
- `faixa_etaria` (TEXT): `'kids'` ou `'teens'`
- `dia_semana` (TEXT): `'segunda'`, `'quarta'` ou `'sexta'` (dia fixo semanal)
- `horario` (TEXT): Horário de aula (ex.: `'8h00 às 9h00'`)
- `modulo_id` (TEXT, FK): Módulo curricular fixo
- `criado_em` (TEXT): Data de cadastro
- `ativa` (INTEGER, 0 ou 1): Estado da turma

### `progresso`
- `id` (TEXT, PK): Identificador do registro
- `turma_id` (TEXT, FK): Turma que realizou a aula
- `aula_id` (TEXT, FK): Aula concluída
- `data_ministrada` (TEXT): Data de realização (YYYY-MM-DD)
- `observacoes` (TEXT, opcional): Anotações pedagógicas
- **Restrição:** `UNIQUE(turma_id, aula_id)` para impedir duplicação acidental.

---

## 🧠 5. Regras de Negócio Pedagógicas

### Cálculo da Próxima Aula
1. Busca todas as aulas do módulo da turma ordenadas por `ordem ASC`.
2. Filtra contra a tabela `progresso` daquela turma específica.
3. A **próxima aula** é a primeira aula com menor ordem que ainda não foi registrada.
4. Quando todas as aulas do módulo forem cumpridas, a turma recebe o status de **Módulo Concluído**.

### Dashboard Semanal Inteligente
- Exibe automaticamente as turmas do dia atual (**Segunda**, **Quarta** ou **Sexta**).
- Em dias não letivos (Terça, Quinta, Sábado ou Domingo), o painel avança automaticamente para o **próximo dia letivo**, permitindo ao professor preparar os materiais com antecedência.

---

## 🌐 6. Endpoints da API REST (Porta 3001)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/dashboard` | Retorna os cards das turmas do dia e resumo pedagógico |
| `GET` | `/api/turmas` | Lista as 18 turmas com porcentagem de progresso |
| `POST` | `/api/turmas` | Cria uma nova turma |
| `GET` | `/api/turmas/:id` | Detalhes da turma, aulas do módulo e histórico ministrado |
| `PUT` | `/api/turmas/:id` | Atualiza informações de uma turma |
| `DELETE` | `/api/turmas/:id` | Desativação lógica da turma (`ativa = 0`) |
| `GET` | `/api/modulos` | Lista os 4 módulos curriculares |
| `GET` | `/api/aulas` | Consulta aulas (suporta filtros por módulo e busca de texto) |
| `POST` | `/api/progresso` | Registra uma aula ministrada |
| `DELETE` | `/api/progresso/:id` | Remove o registro de uma aula ministrada |
| `GET` | `/api/exportar` | Exporta backup completo em JSON |
| `POST` | `/api/importar` | Restaura turmas e progresso via arquivo JSON |

---

## 💾 7. Persistência de Dados e Backup

### Local de Armazenamento Seguro
Por padrão no Windows, o banco SQLite é persistido em:
```text
%APPDATA%\digital-makers-app\digital_makers.db
```

### Modo Pen-Drive (100% Portátil)
Para utilizar o app em diferentes computadores da escola sem precisar instalar nada:
1. Copie o arquivo `Digital Makers-Portatil-1.0.0.exe` para o pen-drive.
2. Crie uma pasta chamada `data` ao lado do executável e insira o seu banco `digital_makers.db`.
3. O app detectará a pasta automaticamente e salvará todos os registros diretamente no pen-drive.

### Backup e Restauração via Interface
Acesse o menu **Configurações** na barra lateral para **Exportar** ou **Importar** backups completos em arquivo `.json` a qualquer momento.

---

## 🛠️ 8. Como Executar e Compilar

### Pré-requisitos
- [Node.js](https://nodejs.org/) v22+ instalado

### Instalação de Dependências
```bash
npm install
```

### Executar em Desenvolvimento
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### Gerar Executáveis Windows (.exe)
```bash
npm run dist:win
```
Os executáveis serão gerados na pasta `dist-electron/`.

## 📄 Licença
Uso educacional.
