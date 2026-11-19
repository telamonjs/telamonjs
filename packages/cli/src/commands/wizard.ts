import inquirer from 'inquirer'
import { createApp } from './create.js'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

// Simple logger for CLI
const logger = {
  info: (msg: string) => console.log(chalk.blue(msg)),
  error: (msg: string) => console.log(chalk.red(msg)),
  step: (msg: string) => console.log(chalk.cyan(`  ${msg}`)),
  banner: (msg: string) => {
    console.log()
    console.log(chalk.bold.cyan(`╔${'═'.repeat(msg.length + 2)}╗`))
    console.log(chalk.bold.cyan(`║ ${msg} ║`))
    console.log(chalk.bold.cyan(`╚${'═'.repeat(msg.length + 2)}╝`))
    console.log()
  },
  newLine: () => console.log(),
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
)
const version = packageJson.version

export async function runWizard(): Promise<void> {
  try {
    logger.banner(`TelamonJS CLI v${version}`)
    logger.newLine()
    logger.info('🔧 Setup Wizard - Create Admin Application')

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: '📁 What is your project name?',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Project name is required'
          }
          return true
        },
      },
      {
        type: 'list',
        name: 'provider',
        message: '🗄️  Which database would you like to use?',
        choices: [
          {
            name: '🐘 PostgreSQL (Recommended)',
            value: 'postgresql',
            short: 'PostgreSQL',
          },
          {
            name: '🐬 MySQL',
            value: 'mysql',
            short: 'MySQL',
          },
        ],
        default: 'postgresql',
      },
      {
        type: 'number',
        name: 'port',
        message: '🌐 Which port for development server?',
        default: 3001,
        validate: (value: number) => {
          if (value < 1024 || value > 65535) {
            return 'Port must be between 1024 and 65535'
          }
          return true
        },
      },
      {
        type: 'confirm',
        name: 'monorepo',
        message: '📦 Monorepo (web + api + jobs)?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'installDeps',
        message: '📦 Install dependencies automatically?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'initGit',
        message: '🔗 Initialize git repository?',
        default: true,
      },
    ])

    // Show summary
    logger.newLine()
    logger.info('📋 Project Summary:')
    logger.step(`Name: ${answers.projectName}`)
    logger.step(`Database: ${answers.provider}`)
    logger.step(`Port: ${answers.port}`)
    logger.step(`Monorepo: ${answers.monorepo ? 'Yes' : 'No'}`)
    logger.step(`Install dependencies: ${answers.installDeps ? 'Yes' : 'No'}`)
    logger.step(`Initialize git: ${answers.initGit ? 'Yes' : 'No'}`)
    logger.newLine()

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: '✨ Create project with these settings?',
        default: true,
      },
    ])

    if (!confirm.proceed) {
      logger.info('Project creation cancelled.')
      return
    }

    // Create the project
    await createApp(answers.projectName, {
      provider: answers.provider,
      port: answers.port,
      monorepo: answers.monorepo,
      skipInstall: !answers.installDeps,
      skipGit: !answers.initGit,
    })
  } catch (error) {
    logger.error(`Wizard failed: ${error}`)
    process.exit(1)
  }
}
