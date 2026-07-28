import { Linter } from 'eslint'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

export function findPairedBackendRoot(frontendRoot = process.cwd()) {
  const parent = dirname(frontendRoot)
  const backendRoot =
    basename(parent) === '.worktrees'
      ? resolve(dirname(dirname(parent)), 'lng-web-be', '.worktrees', basename(frontendRoot))
      : resolve(parent, 'lng-web-be')

  assert.ok(
    existsSync(join(backendRoot, 'src/modules/index.js')),
    `Paired backend repo not found at ${backendRoot}`,
  )
  return backendRoot
}

function literalRoutePath(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]?.value.cooked
  return undefined
}

export function parseExpressRoutes(source, [moduleId, basePath], sourceName = 'route source') {
  const routes = []
  const linter = new Linter({ configType: 'eslintrc' })

  linter.defineRule('collect-express-routes', {
    create() {
      return {
        CallExpression(node) {
          const callee = node.callee
          if (
            callee?.type !== 'MemberExpression' ||
            callee.computed ||
            callee.object?.type !== 'Identifier' ||
            callee.object.name !== 'router' ||
            callee.property?.type !== 'Identifier' ||
            !['get', 'post', 'patch', 'put', 'delete'].includes(callee.property.name)
          )
            return

          const routePath = literalRoutePath(node.arguments[0])
          if (routePath === undefined) return
          routes.push({
            moduleId,
            method: callee.property.name.toUpperCase(),
            path: `${basePath}/${routePath}`.replace(/\/+/g, '/').replace(/\/$/, ''),
          })
        },
      }
    },
  })
  const errors = linter.verify(
    source,
    {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      rules: { 'collect-express-routes': 'error' },
    },
    { allowInlineConfig: false },
  )
  assert.deepEqual(errors, [], `${sourceName} must parse before its routes can be audited`)
  return routes
}

export function readExpressRoutes(backendRoot, [moduleId, basePath, filePath]) {
  const fullPath = join(backendRoot, filePath)
  return parseExpressRoutes(readFileSync(fullPath, 'utf8'), [moduleId, basePath], fullPath)
}
