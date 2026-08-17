import { existsSync } from 'node:fs'
import { cp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const repository = parseRepository(process.env.DSH_DESKTOP_UPDATE_REPOSITORY)
const desktopRoot = resolve(import.meta.dirname)
const builderResources = resolve(desktopRoot, '.builder-resources')
const updateConfig = resolve(builderResources, 'app-update.yml')

export default {
  appId: 'ai.deepseek.harness.desktop',
  productName: 'Deepsee HARNESS',
  directories: {
    app: '.builder-app',
    output: 'release',
  },
  asar: true,
  files: ['dist/**/*', 'package.json'],
  extraResources: [
    { from: resolve(builderResources, 'node'), to: 'node' },
    { from: resolve(desktopRoot, 'build', 'deepseek-icon.png'), to: 'deepseek-icon.png' },
    ...(existsSync(updateConfig) ? [{ from: updateConfig, to: 'app-update.yml' }] : []),
  ],
  afterPack: async context => {
    const engineDestination = join(context.appOutDir, 'resources', 'engine')
    await rm(engineDestination, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 })
    await cp(join(builderResources, 'engine'), engineDestination, { recursive: true, dereference: true })
  },
  artifactName: '${productName}-Setup-${version}.${ext}',
  win: {
    icon: resolve(desktopRoot, 'build', 'deepseek.ico'),
    signAndEditExecutable: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Deepsee HARNESS',
  },
  publish: repository === undefined ? undefined : {
    provider: 'github',
    owner: repository.owner,
    repo: repository.repo,
    releaseType: 'release',
  },
}

function parseRepository(value) {
  if (value === undefined || value === '') return undefined
  const match = /^([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]+)$/.exec(value)
  if (match === null) throw new Error('DSH_DESKTOP_UPDATE_REPOSITORY must use the owner/repository format.')
  return { owner: match[1], repo: match[2] }
}
