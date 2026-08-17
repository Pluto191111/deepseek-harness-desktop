import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const desktopRoot = resolve(import.meta.dirname, '..')
const productResources = join(desktopRoot, 'release', 'DSH Desktop-win32-x64', 'resources')
const updateConfig = join(productResources, 'app-update.yml')
const requireFeed = process.argv.includes('--require-update-feed')
const repository = parseRepository(process.env.DSH_DESKTOP_UPDATE_REPOSITORY)

if (!existsSync(productResources)) throw new Error('package:installer: portable Windows package is missing.')
if (repository === undefined) {
  if (requireFeed) throw new Error('release:github: set DSH_DESKTOP_UPDATE_REPOSITORY to owner/repository before publishing.')
  await rm(updateConfig, { force: true })
  console.log('Installer will be built without a GitHub update feed.')
} else {
  await mkdir(productResources, { recursive: true })
  await writeFile(updateConfig, [
    'provider: github',
    `owner: ${repository.owner}`,
    `repo: ${repository.repo}`,
    'updaterCacheDirName: dsh-desktop-updater',
    '',
  ].join('\n'), 'utf8')
  console.log(`GitHub update feed: ${repository.owner}/${repository.repo}`)
}

function parseRepository(value) {
  if (value === undefined || value === '') return undefined
  const match = /^([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]+)$/.exec(value)
  if (match === null) throw new Error('DSH_DESKTOP_UPDATE_REPOSITORY must use the owner/repository format.')
  return { owner: match[1], repo: match[2] }
}
