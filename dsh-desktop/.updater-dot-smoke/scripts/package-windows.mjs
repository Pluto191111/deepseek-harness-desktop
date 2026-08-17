import { spawn } from 'node:child_process'
import { cp, mkdir, readFile, readdir, realpath, rename, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { createPackage } from '@electron/asar'

const desktopRoot = resolve(import.meta.dirname, '..')
const root = resolve(desktopRoot, '..')
const staging = join(desktopRoot, '.package-runtime')
const updaterStaging = join(desktopRoot, '.package-updater')
const releaseDirectory = join(desktopRoot, 'release')
const productDirectory = join(releaseDirectory, 'DSH Desktop-win32-x64')
const electronSource = join(desktopRoot, 'node_modules', 'electron', 'dist')
const appDirectory = join(productDirectory, 'resources', 'app')
const engineDirectory = join(productDirectory, 'resources', 'engine')
const nodeDirectory = join(productDirectory, 'resources', 'node')

await assertBuildInputs()
await rm(staging, { recursive: true, force: true })
await rm(updaterStaging, { recursive: true, force: true })
await runPnpmDeploy()
await runUpdaterDeploy()
await copyWorkspaceRuntime(staging)
await materializeLinks(join(staging, 'node_modules'), staging)
await materializeLinks(join(updaterStaging, 'node_modules'), updaterStaging)
await rm(productDirectory, { recursive: true, force: true })
await cp(electronSource, productDirectory, { recursive: true })
await rm(appDirectory, { recursive: true, force: true })
await rm(engineDirectory, { recursive: true, force: true })
await rm(nodeDirectory, { recursive: true, force: true })
await mkdir(appDirectory, { recursive: true })
await cp(join(desktopRoot, 'package.json'), join(appDirectory, 'package.json'))
await cp(join(desktopRoot, 'dist'), join(appDirectory, 'dist'), { recursive: true })
await cp(join(updaterStaging, 'node_modules'), join(appDirectory, 'node_modules'), { recursive: true })
await cp(staging, engineDirectory, { recursive: true })
await mkdir(nodeDirectory, { recursive: true })
await cp(process.execPath, join(nodeDirectory, 'node.exe'))
await createPackage(appDirectory, join(productDirectory, 'resources', 'app.asar'))
await rm(appDirectory, { recursive: true, force: true })
await rename(join(productDirectory, 'electron.exe'), join(productDirectory, 'DSH Desktop.exe'))
await rm(staging, { recursive: true, force: true })
await rm(updaterStaging, { recursive: true, force: true })

const size = await directorySize(productDirectory)
console.log(`DSH Desktop portable package: ${productDirectory}`)
console.log(`Size: ${(size / 1024 / 1024).toFixed(1)} MiB`)

async function assertBuildInputs() {
  const required = [
    electronSource,
    join(desktopRoot, 'dist', 'main', 'main.js'),
    join(root, 'apps', 'cli', 'lib', 'bin.js'),
    join(root, 'apps', 'web', 'dist', 'index.html'),
  ]
  for (const path of required) {
    if (!existsSync(path)) throw new Error(`package:win: missing ${path}. Build the required source artifacts first.`)
  }
  const [major] = process.versions.node.split('.')
  if (Number(major) < 22) throw new Error(`package:win: Node.js ${process.versions.node} is too old; DSH requires Node.js 22.19 or newer.`)
}

async function runPnpmDeploy() {
  // Running Corepack through Node avoids the corepack.cmd shell shim on
  // Windows, which otherwise loses the deploy target when the path has spaces.
  const corepackEntrypoint = join(dirname(process.execPath), 'node_modules', 'corepack', 'dist', 'corepack.js')
  await run(process.execPath, [
    corepackEntrypoint,
    'pnpm', '--filter', 'dsh-desktop-runtime', 'deploy', '--legacy', '--prod',
    '--config.node-linker=hoisted', '--config.auto-install-peers=false', staging,
  ], root)
}

async function runUpdaterDeploy() {
  const corepackEntrypoint = join(dirname(process.execPath), 'node_modules', 'corepack', 'dist', 'corepack.js')
  await run(process.execPath, [
    corepackEntrypoint,
    'pnpm', '--filter', 'dsh-desktop', 'deploy', '--legacy', '--prod',
    '--config.node-linker=hoisted', '--config.auto-install-peers=false', updaterStaging,
  ], desktopRoot)
}

async function copyWorkspaceRuntime(destination) {
  for (const source of await workspacePackageDirectories()) {
    const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
    if (typeof manifest.name !== 'string') continue
    const packageDestination = join(destination, 'node_modules', ...manifest.name.split('/'))
    // pnpm deploy leaves workspace packages as links. Replace each link with a
    // small copied runtime package so the resulting app has no source checkout
    // dependency and does not copy development node_modules along with it.
    await rm(packageDestination, { recursive: true, force: true })
    await mkdir(packageDestination, { recursive: true })
    await cp(join(source, 'package.json'), join(packageDestination, 'package.json'))
    for (const entry of manifest.files ?? ['lib']) {
      if (typeof entry !== 'string' || entry.startsWith('!')) continue
      const topLevel = entry.split(/[*/]/, 1)[0]
      if (topLevel === '') continue
      const sourcePath = join(source, topLevel)
      if (existsSync(sourcePath)) await cp(sourcePath, join(packageDestination, topLevel), { recursive: true, force: true })
    }
  }
}

async function workspacePackageDirectories() {
  const result = [join(root, 'apps', 'cli'), join(root, 'apps', 'web')]
  for (const group of ['packages', 'vendor']) {
    for (const entry of await readdir(join(root, group), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const directory = join(root, group, entry.name)
      if (existsSync(join(directory, 'package.json'))) result.push(directory)
      else for (const nested of await readdir(directory, { withFileTypes: true })) {
        if (nested.isDirectory() && existsSync(join(directory, nested.name, 'package.json'))) result.push(join(directory, nested.name))
      }
    }
  }
  return result
}

async function materializeLinks(directory, allowedRoot) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      const source = await realpath(path)
      if (!source.startsWith(allowedRoot + sep) && !source.startsWith(root + sep)) throw new Error(`package:win: dependency link escapes the source tree: ${path}`)
      await rm(path, { recursive: true, force: true })
      await cp(source, path, { recursive: true, dereference: true })
      continue
    }
    if (entry.isDirectory()) await materializeLinks(path, allowedRoot)
  }
}

async function directorySize(directory) {
  let total = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) total += await directorySize(path)
    else total += (await stat(path)).size
  }
  return total
}

function run(command, args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
    })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolvePromise() : reject(new Error(`package:win: ${command} exited with ${String(code)}.`)))
  })
}
