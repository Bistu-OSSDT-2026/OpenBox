import { app, BrowserWindow, shell, globalShortcut, protocol } from 'electron'
import { join } from 'path'
import { initDatabase } from '../database/index'
import { PluginManager } from '../plugin-system/PluginManager'
import { registerAllIpc } from './ipc/index'
import { createAppMenu } from './menu'

let mainWindow: BrowserWindow | null = null
let pluginManager: PluginManager | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: true,
    title: 'OpenBox',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Safety net: force show window after 10s
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('Force showing window after timeout')
      mainWindow.show()
    }
  }, 10000)
}

function registerShortcuts(): void {
  globalShortcut.register('F12', () => {
    const win = BrowserWindow.getFocusedWindow()
    win?.webContents.toggleDevTools()
  })
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'plugin',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
  }
])

app.whenReady().then(async () => {
  createAppMenu()

  try {
    await initDatabase()
    console.log('Database initialized')
  } catch (err) {
    console.error('Database init failed:', err)
  }

  try {
    pluginManager = new PluginManager()
    registerAllIpc(pluginManager)
    console.log('Plugin manager ready')
  } catch (err) {
    console.error('Plugin manager init failed:', err)
  }

  try {
    await pluginManager?.activateAllEnabled()
  } catch (err) {
    console.error('Plugin activation failed:', err)
  }

  createWindow()
  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  void pluginManager?.deactivateAll()
})

app.on('window-all-closed', () => {
  void pluginManager?.deactivateAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
