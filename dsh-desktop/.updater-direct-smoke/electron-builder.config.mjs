const repository = parseRepository(process.env.DSH_DESKTOP_UPDATE_REPOSITORY)

export default {
  appId: 'ai.deepseek.harness.desktop',
  productName: 'DSH Desktop',
  directories: {
    output: 'release-installer',
  },
  artifactName: '${productName}-Setup-${version}.${ext}',
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'DSH Desktop',
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
