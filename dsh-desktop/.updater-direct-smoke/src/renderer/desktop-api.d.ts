import type { EngineStatus } from '../main/shared.js'

declare global {
  interface Window {
    desktop: {
      getStatus(): Promise<EngineStatus>
      restartEngine(): Promise<void>
      openExternal(url: string): Promise<void>
      onEngineStatus(listener: (status: EngineStatus) => void): () => void
    }
  }
}

export {}
