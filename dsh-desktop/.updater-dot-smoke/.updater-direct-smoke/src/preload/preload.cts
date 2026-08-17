import { contextBridge, ipcRenderer } from 'electron'
import type { EngineStatus } from '../main/shared.js'

const desktop = {
  getStatus: (): Promise<EngineStatus> => ipcRenderer.invoke('desktop:status'),
  restartEngine: (): Promise<void> => ipcRenderer.invoke('desktop:restart-engine'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('desktop:open-external', url),
  onEngineStatus: (listener: (status: EngineStatus) => void): (() => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, status: EngineStatus): void => listener(status)
    ipcRenderer.on('desktop:engine-status', subscription)
    return () => ipcRenderer.removeListener('desktop:engine-status', subscription)
  },
}

// Sandboxed Electron preload scripts run as CommonJS. Keep this file as .cts
// so TypeScript emits preload.cjs even though the desktop app is ESM.
contextBridge.exposeInMainWorld('desktop', desktop)
