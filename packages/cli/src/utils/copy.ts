import fs from 'fs-extra'
import path from 'path'
import chalk from 'chalk'

// Simple logger for CLI
const logger = {
  success: (msg: string) => console.log(chalk.green(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
}

// Values substituted into {{placeholder}} tokens in template files (always
// stringified before writing — see processTemplateFiles below).
export type TemplateData = Record<string, string | number | boolean>

export async function copyTemplate(
  templatePath: string,
  destinationPath: string,
  templateData?: TemplateData
): Promise<void> {
  try {
    logger.step('Copying template files...')

    // Ensure destination directory exists
    await fs.ensureDir(destinationPath)

    // Copy template files (fs-extra copies dotfiles by default)
    await fs.copy(templatePath, destinationPath, {
      filter: src => {
        // Skip node_modules and build artifacts
        const relativePath = path.relative(templatePath, src)

        // Always skip these
        const pathSegments = relativePath.split(path.sep)
        if (
          relativePath.includes('node_modules') ||
          relativePath.includes('.next') ||
          relativePath.includes('dist') ||
          pathSegments.includes('.git') // Only skip .git directory, not .gitignore
        ) {
          return false
        }

        return true
      },
    })

    // WORKAROUND: fs-extra.copy() with filter has a bug with directories containing brackets []
    // The filter is called for the directory but NOT for files inside it
    // So we manually copy these directories after the main copy
    const bracketDirs = [
      'src/app/api/auth/[...nextauth]',
      'src/app/api/usuarios/[id]',
    ]

    for (const dir of bracketDirs) {
      const srcPath = path.join(templatePath, dir)
      const destPath = path.join(destinationPath, dir)

      if (await fs.pathExists(srcPath)) {
        logger.step(`Copying ${dir}...`)
        await fs.copy(srcPath, destPath)
      }
    }

    await restoreDotfiles(destinationPath)

    // Every text file in the tree, not a hand-kept list: a list drifts (it
    // once skipped docker-compose.prod.yml, shipping raw {{dbImage}}).
    if (templateData) {
      await renderTemplatePlaceholders(destinationPath, templateData)
    }

    logger.success('Template files copied successfully')
  } catch (error) {
    logger.error(`Failed to copy template: ${error}`)
    throw error
  }
}

// npm strips .gitignore and .npmrc from published tarballs, so templates keep
// them as _gitignore/_npmrc and the generated project gets the real names back.
const DOTFILE_ALIASES: Record<string, string> = { _gitignore: '.gitignore', _npmrc: '.npmrc' }

export async function restoreDotfiles(dir: string): Promise<void> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await restoreDotfiles(full)
    else if (DOTFILE_ALIASES[entry.name]) await fs.move(full, path.join(dir, DOTFILE_ALIASES[entry.name]), { overwrite: true })
  }
}

// Extensions never rewritten by renderTemplatePlaceholders — binary assets
// would get corrupted by a naive string replace.
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
])

/**
 * Recursively replaces every {{placeholder}} in every text file under
 * `rootPath` (both the single-package and the monorepo generators). Skips
 * files with no "{{" at all — cheap and avoids rewriting files that never
 * had placeholders to begin with.
 */
export async function renderTemplatePlaceholders(
  rootPath: string,
  templateData: TemplateData
): Promise<void> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name)
    if (entry.isDirectory()) {
      await renderTemplatePlaceholders(fullPath, templateData)
      continue
    }
    if (BINARY_EXTENSIONS.has(path.extname(entry.name))) continue

    const content = await fs.readFile(fullPath, 'utf-8')
    if (!content.includes('{{')) continue

    let rendered = content
    Object.entries(templateData).forEach(([key, value]) => {
      rendered = rendered.split(`{{${key}}}`).join(String(value))
    })
    if (rendered !== content) await fs.writeFile(fullPath, rendered)
  }
}
