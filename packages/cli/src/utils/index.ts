export { validateProjectName, validateProjectPath } from './validate.js'
export { installDependencies, detectPackageManager } from './install.js'
export { initGit } from './git.js'
export {
  copyTemplate,
  renderTemplatePlaceholders,
  restoreDotfiles,
  type TemplateData,
} from './copy.js'
export { setupAppTemplate } from './setup.js'
