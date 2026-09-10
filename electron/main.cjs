const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const PORT = process.env.PORT || 3001

// Definir local seguro e gravável para o banco de dados SQLite
if (!isDev) {
  // Se existir pasta 'data' ao lado do executável (.exe), opera em modo portátil (ideal para pen-drive)
  const portableDataDir = path.join(path.dirname(process.execPath), 'data')
  if (fs.existsSync(portableDataDir)) {
    process.env.DATABASE_PATH = path.join(portableDataDir, 'digital_makers.db')
  } else {
    process.env.DATABASE_PATH = path.join(app.getPath('userData'), 'digital_makers.db')
  }
}

async function startServer() {
  try {
    await import('../server/index.js')
    console.log('[Electron] Servidor backend iniciado com sucesso.')
  } catch (err) {
    console.error('[Electron] Erro ao iniciar backend:', err)
  }
}

function waitForServer(url, timeout = 10000) {
  const start = Date.now()
  return new Promise((resolve) => {
    const check = () => {
      http.get(url, () => {
        resolve(true)
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          resolve(false)
        } else {
          setTimeout(check, 200)
        }
      })
    }
    check()
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 650,
    title: 'Digital Makers',
    backgroundColor: '#090d16',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  win.setMenuBarVisibility(false)

  // Abrir links externos (como GitHub, materiais) no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const targetUrl = isDev && process.env.VITE_DEV_SERVER_URL 
    ? process.env.VITE_DEV_SERVER_URL 
    : `http://localhost:${PORT}`

  win.loadURL(targetUrl)

  win.once('ready-to-show', () => {
    win.show()
  })
}

app.whenReady().then(async () => {
  await startServer()
  await waitForServer(`http://localhost:${PORT}/api/turmas`, 8000)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
