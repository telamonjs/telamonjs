/**
 * CRUD Generator Command
 */

import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import execa from 'execa'

import {
  requirePrismaModel,
  listPrismaModels,
  PrismaField,
} from './utils/prisma-detector.js'
import { insertBeforeArrayClose, updateMenuItems } from './utils/menu-updater.js'
import { capitalize, singular } from './utils/formatters.js'
import { hasI18n, writeModuleMessages } from './messages-writer.js'

import { generatePageConfig } from './templates/config.js'
import { generateListPage } from './templates/list-page.js'
import { generateDetail } from './templates/detail.js'
import { generateApiClient } from './templates/api-client.js'
import {
  generateRouteHandler,
  generateIdRouteHandler,
  modulePermissions,
} from './templates/route-handlers.js'
import { fieldPropName, formFields, isSensitive } from './utils/field-mapping.js'

export interface CrudOptions {
  name?: string
  model?: string
  prismaSchema?: boolean
  path?: string
  updateMenu?: boolean
  /** Overwrite this module's i18n messages block if it already exists (default: false -- throws). */
  force?: boolean
}

interface FileToWrite {
  path: string
  content: string
}

export async function generateCrud(
  options: CrudOptions = {},
  cwd: string = process.cwd()
) {
  console.log(chalk.cyan('\n📦 TelamonJS CRUD Generator\n'))

  const spinner = ora('Initializing...').start()

  try {
    // 1. Prompt for missing options
    spinner.stop()
    const answers = await promptForOptions(options, cwd)
    spinner.start('Generating CRUD module...')

    // 2. Read the Prisma model. Detection was asked for, so a missing schema or
    // model fails (with where it looked / which models exist) instead of
    // quietly generating placeholder fields that don't match the real table.
    let modelSchema: { name: string; fields: PrismaField[] }
    if (answers.prismaSchema && answers.model) {
      modelSchema = requirePrismaModel(answers.model, cwd)
      spinner.succeed(
        `Detected Prisma model '${answers.model}' with ${modelSchema.fields.length} fields`
      )
    } else {
      modelSchema = createBasicModelSchema(answers.model)
    }

    spinner.start('Generating files...')

    // 3. Generate files
    const files = await generateFiles(
      {
        name: answers.name,
        model: answers.model,
        modelSchema,
        path: answers.path,
        force: options.force,
      },
      cwd
    )

    // 4. Write files
    spinner.text = 'Writing files...'
    for (const file of files) {
      await writeFile(file.path, file.content)
      spinner.succeed(chalk.green(`Created ${file.path.replace(cwd, '.')}`))
      spinner.start()
    }

    // 5. Register the module's permissions (the Route Handlers, menu entry and CrudConfig check them)
    const { read, write } = modulePermissions(answers.name)
    const rbacPath = registerPermissions(answers.name, cwd)
    if (rbacPath) {
      spinner.succeed(chalk.green(`Permissions ${read}, ${write} in ${relative(cwd, rbacPath)}`))
    } else {
      spinner.warn(chalk.yellow(missingCatalogMessage(answers.name)))
    }
    spinner.start()

    // 6. Update menu-items.ts
    if (answers.updateMenu) {
      spinner.text = 'Updating menu...'
      const menuUpdated = await updateMenuItems(
        {
          name: answers.name,
          path: answers.path,
          permission: read,
        },
        cwd
      )

      if (menuUpdated) {
        spinner.succeed(chalk.green('Updated menu-items.ts'))
      } else {
        spinner.warn('Could not update menu-items.ts (file not found)')
      }
    }

    // 7. Format with Prettier (if available)
    spinner.start('Formatting code...')
    const formatWarning = formatWithPrettier(files.map(f => f.path), cwd)
    if (formatWarning) spinner.warn(chalk.yellow(formatWarning))
    else spinner.succeed('Code formatted')

    spinner.stop()

    // Success message
    console.log('')
    console.log(
      chalk.green('✓'),
      `CRUD module '${chalk.bold(answers.name)}' created successfully!`
    )
    console.log('')
    console.log(chalk.cyan('Next steps:'))
    console.log(`  1. Review generated files in ${chalk.yellow(answers.path)}`)
    console.log(`  2. Fill in relationship TODOs in config.tsx (loadField stubs)`)
    console.log(
      hasPrismaClient(cwd)
        ? `  3. The Route Handlers require ${chalk.yellow(read)} (GET) and ${chalk.yellow(write)} (POST, PATCH, DELETE)`
        : `  3. ${chalk.yellow('No src/lib/prisma.ts here')}: Route Handlers were skipped -- serve ${chalk.yellow(`/api/${answers.name}`)} from your API, checking ${chalk.yellow(read)} and ${chalk.yellow(write)}`
    )
    console.log(
      `  4. Run ${chalk.yellow('pnpm db:seed')} so the admin role gets them, then grant them to other roles`
    )
    console.log(
      `  5. Icons are resolved by name from ${chalk.yellow('src/lib/icons.ts')} -- add any you change there`
    )
    console.log(`  6. Run ${chalk.yellow('pnpm dev')} to see your new module`)
    console.log('')
  } catch (error) {
    spinner.fail('Failed to generate CRUD module')
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    )
    process.exit(1)
  }
}

/**
 * Run the app's Prettier on the generated files. Paths go as an args array
 * (spaces survive) and `--no-install` stops npx from downloading Prettier when the app
 * doesn't have it. Returns a warning on failure, undefined on success.
 */
export function formatWithPrettier(paths: string[], cwd: string): string | undefined {
  try {
    execa.sync('npx', ['--no-install', 'prettier', '--write', ...paths], { cwd })
    return undefined
  } catch (error) {
    const { stderr, shortMessage, message } = error as { stderr?: string; shortMessage?: string; message?: string }
    const reason = stderr?.trim().split('\n')[0] || shortMessage || message || String(error)
    return `Could not format with Prettier (${reason}). The generated files are still valid, just unformatted.`
  }
}

/**
 * Prompt user for missing options
 */
async function promptForOptions(
  options: Partial<CrudOptions>,
  cwd: string
): Promise<Required<CrudOptions>> {
  const questions = []

  // Module name
  if (!options.name) {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Module name (plural, e.g., "clientes"):',
      validate: (input: string) => {
        if (!input) return 'Name is required'
        if (!/^[a-z-]+$/.test(input)) return 'Use lowercase with hyphens only'
        return true
      },
    })
  }

  // Prisma model
  const availableModels = listPrismaModels(cwd)
  if (!options.model) {
    if (availableModels.length > 0) {
      questions.push({
        type: 'list',
        name: 'model',
        message: 'Select Prisma model:',
        choices: availableModels,
        default: (answers: Partial<CrudOptions>) => {
          const name = answers.name || options.name || ''
          return availableModels.find(
            m => m.toLowerCase() === capitalize(singular(name))
          )
        },
      })
    } else {
      questions.push({
        type: 'input',
        name: 'model',
        message: 'Prisma model name (singular, e.g., "Cliente"):',
        default: (answers: Partial<CrudOptions>) =>
          capitalize(singular(answers.name || options.name || '')),
      })
    }
  }

  // Auto-detect Prisma schema
  if (options.prismaSchema === undefined) {
    questions.push({
      type: 'confirm',
      name: 'prismaSchema',
      message: 'Auto-detect fields from Prisma schema?',
      default: availableModels.length > 0,
    })
  }

  // Path
  if (!options.path) {
    questions.push({
      type: 'input',
      name: 'path',
      message: 'Module path (relative to project root):',
      default: (answers: Partial<CrudOptions>) =>
        `src/app/admin/${answers.name || options.name}`,
    })
  }

  // Update menu
  if (options.updateMenu === undefined) {
    questions.push({
      type: 'confirm',
      name: 'updateMenu',
      message: 'Add to menu automatically?',
      default: true,
    })
  }

  const answers = await inquirer.prompt(questions)
  return { ...options, ...answers } as Required<CrudOptions>
}

/**
 * Generate all files for CRUD module. Every module gets the same tree -- the
 * list route plus dialogs (view/create/edit/delete) driven by config.tsx;
 * there are no adicionar/ or [id]/ routes (`telamonjs lint`: no-crud-pages).
 */
export async function generateFiles(
  config: {
    name: string
    model: string
    modelSchema: { name: string; fields: PrismaField[] }
    path: string
    /** Overwrite this module's messages block if it already exists (default: throw -- see `writeModuleMessages`). */
    force?: boolean
  },
  cwd: string
): Promise<FileToWrite[]> {
  const { name, model, modelSchema, path, force = false } = config
  const { fields } = modelSchema
  const fullPath = join(cwd, path)
  const Entity = capitalize(model)
  const i18n = hasI18n(cwd)

  if (hasPrismaClient(cwd)) assertRequirePermission(cwd, name)
  if (i18n) writeModuleMessages(cwd, name, moduleMessagesBlock(name, fields), { force })

  return [
    // config.tsx (full CrudConfig: schema, columns, form, query, mutations, dialogs)
    {
      path: join(fullPath, 'config.tsx'),
      content: generatePageConfig({ name, modelName: model, fields, i18n }),
    },
    // page.tsx (list -- the module's only route)
    { path: join(fullPath, 'page.tsx'), content: generateListPage({ name }) },
    // _components/<Entity>Detail.tsx (view dialog body)
    {
      path: join(fullPath, '_components', `${Entity}Detail.tsx`),
      content: generateDetail({ name, modelName: model, fields, i18n }),
    },
    // src/lib/api/<name>-client.ts (REST client consumed by config.tsx)
    {
      path: join(cwd, 'src', 'lib', 'api', `${name}-client.ts`),
      content: generateApiClient({ name, modelName: model, fields }),
    },
    // src/app/api/<name>/route.ts + [id]/route.ts (route handlers backing the client).
    // They import `@/lib/prisma`; without it (monorepo apps/web, where the API is
    // apps/api) the handlers would not compile, so they are skipped.
    ...(hasPrismaClient(cwd)
      ? [
          {
            path: join(cwd, 'src', 'app', 'api', name, 'route.ts'),
            content: generateRouteHandler({ name, modelName: model, fields }),
          },
          {
            path: join(cwd, 'src', 'app', 'api', name, '[id]', 'route.ts'),
            content: generateIdRouteHandler({ name, modelName: model, fields }),
          },
        ]
      : []),
  ]
}

function hasPrismaClient(cwd: string): boolean {
  return existsSync(join(cwd, 'src', 'lib', 'prisma.ts'))
}

const TEMPLATE_APP = fileURLToPath(new URL('../../../templates/app', import.meta.url))

/**
 * The generated Route Handlers import `requirePermission` from `@/lib/auth`.
 * Apps created before @telamonjs/cli 1.2.0 have no RBAC and no such export:
 * stop before writing anything rather than emit handlers that don't compile
 * (or that only check for a session).
 */
function assertRequirePermission(cwd: string, name: string): void {
  const auth = join(cwd, 'src', 'lib', 'auth.ts')
  const source = existsSync(auth) ? readFileSync(auth, 'utf-8') : ''
  if (/\bexport\b[^\n]*\brequirePermission\b/.test(source)) return
  const { read, write } = modulePermissions(name)
  throw new Error(
    `src/lib/auth.ts does not export requirePermission(), which the generated Route Handlers use to check ` +
      `${read} and ${write}. Apps created before @telamonjs/cli 1.2.0 have no RBAC yet. Nothing was written. ` +
      `Add it first, as the current app template does:\n` +
      `  - ${join(TEMPLATE_APP, 'src', 'lib', 'auth.ts')}: requirePermission()\n` +
      `  - ${join(TEMPLATE_APP, 'src', 'lib', 'permissions.ts')}: canAny, from @telamonjs/permissions\n` +
      `  - ${join(TEMPLATE_APP, 'src', 'rbac.ts')}: the permission catalog\n` +
      `  - ${join(TEMPLATE_APP, 'src', 'auth.ts')}: permissions[] in the session`
  )
}

/** Where `telamonjs create` puts the permission catalog: the app, or (from a monorepo's apps/web) packages/shared. */
const RBAC_PATHS = [join('src', 'rbac.ts'), join('..', '..', 'packages', 'shared', 'src', 'rbac.ts')]

/** The PERMISSIONS entries of a module, as the catalog writes them. */
function permissionEntries(name: string): Array<{ code: string; line: string }> {
  const { read, write } = modulePermissions(name)
  const category = capitalize(name)
  return [
    { code: read, description: `View ${name}` },
    { code: write, description: `Create, edit and delete ${name}` },
  ].map(p => ({
    code: p.code,
    line: `  { code: '${p.code}', category: '${category}', description: '${p.description}' },`,
  }))
}

/**
 * What to do when `registerPermissions` found no catalog to patch: the
 * entries to add by hand, and the seed that grants them to the admin role.
 */
export function missingCatalogMessage(name: string): string {
  return (
    'No PERMISSIONS catalog to update (src/rbac.ts, or packages/shared/src/rbac.ts in a monorepo). ' +
    'Until these entries are in your catalog and the seed has run (pnpm db:seed), nobody, ' +
    'admin included, can open the module:\n' +
    permissionEntries(name).map(p => p.line).join('\n')
  )
}

/**
 * Adds the module's permission codes (`modulePermissions`) to PERMISSIONS in
 * the app's rbac.ts: the catalog `pnpm db:seed` syncs and grants to the admin
 * role, so a fresh module is usable by an admin. Idempotent. Returns the
 * catalog file (also when it already had the codes), or null when there is
 * none to patch.
 */
export function registerPermissions(name: string, cwd: string): string | null {
  const path = RBAC_PATHS.map(p => join(cwd, p)).find(p => existsSync(p))
  if (!path) return null
  const rbac = readFileSync(path, 'utf-8')
  const entries = permissionEntries(name)
    .filter(p => !rbac.includes(`'${p.code}'`))
    .map(p => p.line)
  if (!entries.length) return path
  const open = rbac.match(/export const PERMISSIONS[^=]*=\s*\[/)
  const updated =
    open?.index === undefined ? null : insertBeforeArrayClose(rbac, open.index + open[0].length - 1, entries.join('\n'))
  if (!updated) return null
  writeFileSync(path, updated, 'utf-8')
  return path
}

/**
 * i18n messages block for a module, written under `messages.<name>` (see
 * config.tsx template: `msg('<name>.title')`, `msg('<name>.fields.<prop>')`;
 * detail.ts template: same `fields.<prop>` keys for `SemanticField.label`,
 * plus `sections.<key>` for `SemanticCard.title`).
 * Field keys cover the union of table columns, form fields, and detail.ts's
 * visible fields (everything but id/credentials -- includes timestamps,
 * which formFields() excludes) -- one key per field, reused everywhere that
 * field's display text appears, never duplicated. Values are the same
 * `capitalize(field.name)` text the non-i18n template uses as a literal.
 */
function moduleMessagesBlock(name: string, fields: PrismaField[]): Record<string, unknown> {
  const tableFields = fields.filter(f => f.showInTable && !f.isId && !isSensitive(f))
  const detailFields = fields.filter(f => !f.isId && !isSensitive(f))
  const labeled = [...tableFields, ...formFields(fields), ...detailFields]
  const messageFields: Record<string, string> = {}
  for (const f of labeled) messageFields[fieldPropName(f)] = capitalize(f.name)

  return {
    title: capitalize(name),
    description: `Gerenciamento de ${name}`,
    searchPlaceholder: 'Buscar...',
    fields: messageFields,
    sections: { main: 'Dados', contact: 'Contato', meta: 'Registro' },
    dialogs: {
      view: { title: 'Detalhes' },
      edit: { title: 'Editar', description: 'Atualize as informações do registro' },
      create: { title: 'Novo Registro', description: 'Cadastre um novo registro' },
    },
  }
}

/**
 * Write file to disk (creating directories as needed)
 */
async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = dirname(filePath)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Create basic model schema when Prisma is not available
 */
function createBasicModelSchema(modelName: string): {
  name: string
  fields: PrismaField[]
} {
  return {
    name: modelName,
    fields: [
      {
        name: 'id',
        type: 'String',
        isRequired: true,
        isUnique: true,
        isId: true,
        isRelation: false,
        showInTable: false,
        searchable: false,
        section: 'main',
      },
      {
        name: 'nome',
        type: 'String',
        isRequired: true,
        isUnique: false,
        isId: false,
        isRelation: false,
        showInTable: true,
        searchable: true,
        section: 'main',
      },
      {
        name: 'createdAt',
        type: 'DateTime',
        isRequired: true,
        isUnique: false,
        isId: false,
        isRelation: false,
        showInTable: true,
        searchable: false,
        section: 'meta',
      },
      {
        name: 'updatedAt',
        type: 'DateTime',
        isRequired: true,
        isUnique: false,
        isId: false,
        isRelation: false,
        showInTable: false,
        searchable: false,
        section: 'meta',
      },
    ],
  }
}
