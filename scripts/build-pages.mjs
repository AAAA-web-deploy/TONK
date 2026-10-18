import { spawn } from 'node:child_process'
import { cp, mkdir, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const moves = [
  ['src/app/api', '.pages-hold/api'],
  ['src/app/uploads', '.pages-hold/uploads'],
]

const run = (cwd, command, args) => new Promise((done, reject) => {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '/TONK',
    },
  })
  child.on('exit', code => code === 0 ? done() : reject(new Error(`${command} exited ${code}`)))
})

async function hideRoutes(project) {
  const hold = resolve(project, '.pages-hold')
  await mkdir(hold, { recursive: true })
  for (const [from, to] of moves) await rename(resolve(project, from), resolve(project, to))
  return async () => {
    for (const [from, to] of [...moves].reverse()) {
      await rename(resolve(project, to), resolve(project, from)).catch(() => {})
    }
  }
}

async function isolatedCopy() {
  const project = resolve(tmpdir(), 'tonk-pages-build')
  await rm(project, { recursive: true, force: true })
  await cp(root, project, {
    recursive: true,
    filter: source => {
      const relative = source.slice(root.length).replaceAll('\\', '/')
      return !['/node_modules', '/.next', '/.git', '/out', '/.data', '/.pages-hold'].some(folder => relative === folder || relative.startsWith(`${folder}/`))
    },
  })
  await symlink(resolve(root, 'node_modules'), resolve(project, 'node_modules'), 'junction')
  return project
}

let project = root
let restore = async () => {}
try {
  restore = await hideRoutes(root)
} catch (error) {
  if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error
  project = await isolatedCopy()
  restore = await hideRoutes(project)
}

try {
  await run(project, process.execPath, [resolve(project, 'node_modules/next/dist/bin/next'), 'build', '--webpack'])
  await run(project, process.execPath, [resolve(project, 'scripts/prefix-pages-output.mjs')])
  await writeFile(resolve(project, 'out/.nojekyll'), '')
  if (project !== root) {
    await rm(resolve(root, 'out'), { recursive: true, force: true })
    await cp(resolve(project, 'out'), resolve(root, 'out'), { recursive: true })
  }
} finally {
  await restore()
  if (project !== root) {
    await rm(resolve(project, 'node_modules'), { force: true }).catch(() => {})
    await rm(project, { recursive: true, force: true }).catch(() => {})
  }
}
