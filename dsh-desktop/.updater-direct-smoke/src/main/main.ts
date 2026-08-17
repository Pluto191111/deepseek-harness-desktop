import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { EngineStatus } from './shared.js'

const startupTimeoutMs = 30_000
const desktopRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

let mainWindow: BrowserWindow | undefined
let engine: ChildProcessWithoutNullStreams | undefined
let engineStatus: EngineStatus = { kind: 'stopped' }
let quitting = false
let updatesEnabled = false
let updateCheckRequestedByUser = false

function broadcastStatus(): void {
  mainWindow?.webContents.send('desktop:engine-status', engineStatus)
}

function setEngineStatus(status: EngineStatus): void {
  engineStatus = status
  broadcastStatus()
}

function resolveEngine(): { directory: string; cliEntrypoint: string; nodeExecutable: string } {
  const configuredDirectory = process.env.DSH_ENGINE_DIR
  if (configuredDirectory !== undefined) {
    const directory = resolve(configuredDirectory)
    return {
      directory,
      cliEntrypoint: join(directory, 'apps', 'cli', 'lib', 'bin.js'),
      nodeExecutable: process.env.DSH_NODE_EXECUTABLE ?? 'node',
    }
  }

  if (app.isPackaged) {
    const directory = join(process.resourcesPath, 'engine')
    return {
      directory,
      cliEntrypoint: join(directory, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
      nodeExecutable: process.env.DSH_NODE_EXECUTABLE ?? join(process.resourcesPath, 'node', 'node.exe'),
    }
  }

  const directory = join(desktopRoot, '..')
  return {
    directory,
    cliEntrypoint: join(directory, 'apps', 'cli', 'lib', 'bin.js'),
    nodeExecutable: process.env.DSH_NODE_EXECUTABLE ?? 'node',
  }
}

function engineError(message: string): Error {
  setEngineStatus({ kind: 'error', message })
  return new Error(message)
}

function stopEngine(): void {
  if (engine === undefined) return
  const running = engine
  engine = undefined
  running.kill('SIGTERM')
}

function startEngine(): void {
  if (engine !== undefined) return

  const { directory: engineDirectory, cliEntrypoint, nodeExecutable } = resolveEngine()
  if (!existsSync(cliEntrypoint)) {
    throw engineError(`DSH engine was not found at ${cliEntrypoint}. Build the source checkout or recreate the desktop package.`)
  }

  if (!existsSync(nodeExecutable) && nodeExecutable !== 'node') {
    throw engineError(`The packaged Node.js runtime was not found at ${nodeExecutable}. Recreate the desktop package.`)
  }
  setEngineStatus({ kind: 'starting' })
  const child = spawn(nodeExecutable, [cliEntrypoint, 'web', '--host', '127.0.0.1', '--port', '0'], {
    cwd: engineDirectory,
    env: {
      ...process.env,
      DSH_HOME: join(app.getPath('userData'), 'dsh'),
    },
    windowsHide: true,
  })
  engine = child

  let startupOutput = ''
  const inspectOutput = (chunk: Buffer): void => {
    startupOutput = `${startupOutput}${chunk.toString('utf8')}`.slice(-16_384)
    const match = startupOutput.match(/dsh web:\s+(http:\/\/127\.0\.0\.1:\d+)/)
    if (match?.[1] !== undefined && engine === child) {
      setEngineStatus({ kind: 'ready', url: match[1] })
    }
  }

  child.stdout.on('data', inspectOutput)
  child.stderr.on('data', inspectOutput)
  child.on('error', error => {
    if (engine === child) engineError(`Could not start the DSH engine: ${error.message}`)
  })
  child.on('exit', (code, signal) => {
    if (engine !== child) return
    engine = undefined
    if (!quitting && engineStatus.kind !== 'error') {
      engineError(`The DSH engine exited before the desktop app closed (code ${String(code)}, signal ${String(signal)}). ${startupOutput}`)
    }
  })
  setTimeout(() => {
    if (engine === child && engineStatus.kind === 'starting') {
      stopEngine()
      engineError(`The DSH engine did not report a local URL within ${String(startupTimeoutMs / 1000)} seconds. ${startupOutput}`)
    }
  }, startupTimeoutMs).unref()
}

function restartEngine(): void {
  stopEngine()
  startEngine()
}

function configureUpdater(): void {
  updatesEnabled = app.isPackaged && existsSync(join(process.resourcesPath, 'app-update.yml'))
  if (!updatesEnabled) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.on('update-available', update => {
    void dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update available',
      message: `DSH Desktop ${update.version} is available.`,
      detail: 'Download the update now? It will install after you confirm a restart.',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(result => {
      if (result.response === 0) void autoUpdater.downloadUpdate()
    })
  })
  autoUpdater.on('update-not-available', () => {
    if (!updateCheckRequestedByUser) return
    void dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'No update available',
      message: 'DSH Desktop is up to date.',
    })
  })
  autoUpdater.on('update-downloaded', update => {
    void dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update ready',
      message: `DSH Desktop ${update.version} has been downloaded.`,
      detail: 'Restart now to install the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(result => {
      if (result.response === 0) autoUpdater.quitAndInstall()
    })
  })
  autoUpdater.on('error', error => {
    if (!updateCheckRequestedByUser) return
    void dialog.showMessageBox(mainWindow!, {
      type: 'error',
      title: 'Update check failed',
      message: 'DSH Desktop could not check for updates.',
      detail: error.message,
    })
  })
}

async function checkForUpdates(requestedByUser: boolean): Promise<void> {
  if (!updatesEnabled) {
    if (requestedByUser) {
      await dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'Updates are not configured',
        message: 'This portable build has no GitHub update feed.',
      })
    }
    return
  }
  updateCheckRequestedByUser = requestedByUser
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    if (!requestedByUser) return
    await dialog.showMessageBox(mainWindow!, {
      type: 'error',
      title: 'Update check failed',
      message: 'DSH Desktop could not check for updates.',
      detail: error instanceof Error ? error.message : String(error),
    })
  } finally {
    updateCheckRequestedByUser = false
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 960,
    minHeight: 680,
    title: 'DSH Desktop',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(desktopRoot, 'dist', 'preload', 'preload.cjs'),
    },
  })
  mainWindow.setMenuBarVisibility(false)
  void mainWindow.loadFile(join(desktopRoot, 'dist', 'renderer', 'index.html'))
  mainWindow.on('closed', () => { mainWindow = undefined })
}

function createMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'DSH Desktop',
      submenu: [
        { label: 'Restart engine', click: restartEngine },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }],
    },
    {
      label: 'Help',
      submenu: [{ label: 'Check for updates', click: () => void checkForUpdates(true) }],
    },
  ]))
}

app.whenReady().then(() => {
  ipcMain.handle('desktop:status', () => engineStatus)
  ipcMain.handle('desktop:restart-engine', () => restartEngine())
  ipcMain.handle('desktop:open-external', (_event, url: string) => {
    if (!url.startsWith('https://')) throw new Error('Only HTTPS links may be opened externally.')
    return shell.openExternal(url)
  })
  configureUpdater()
  createMenu()
  createWindow()
  try {
    startEngine()
  } catch (error) {
    engineError(error instanceof Error ? error.message : String(error))
  }
  void checkForUpdates(false)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  quitting = true
  stopEngine()
})
