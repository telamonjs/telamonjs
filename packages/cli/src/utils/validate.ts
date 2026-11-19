import validatePackageName from 'validate-npm-package-name'
import path from 'path'
import fs from 'fs-extra'

export function validateProjectName(name: string): {
  valid: boolean
  problems?: string[]
} {
  const validation = validatePackageName(name)

  if (validation.validForNewPackages) {
    return { valid: true }
  }

  return {
    valid: false,
    problems: [...(validation.errors || []), ...(validation.warnings || [])],
  }
}

export function validateProjectPath(projectPath: string): {
  valid: boolean
  error?: string
} {
  try {
    // Check if directory exists and is not empty
    if (fs.existsSync(projectPath)) {
      const files = fs.readdirSync(projectPath)
      if (files.length > 0) {
        return {
          valid: false,
          error: `Directory ${projectPath} is not empty`,
        }
      }
    }

    // Check if we can create the directory
    const parentDir = path.dirname(projectPath)
    if (!fs.existsSync(parentDir)) {
      return {
        valid: false,
        error: `Parent directory ${parentDir} does not exist`,
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: `Cannot access directory: ${error}`,
    }
  }
}
