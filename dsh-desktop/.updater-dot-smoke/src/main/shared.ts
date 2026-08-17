export type EngineStatus =
  | { kind: 'starting' }
  | { kind: 'ready'; url: string }
  | { kind: 'stopped' }
  | { kind: 'error'; message: string }
