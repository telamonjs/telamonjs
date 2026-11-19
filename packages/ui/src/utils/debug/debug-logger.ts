/**
 * Form Debug Logger
 *
 * Centralized logging system for telamonjs form debugging.
 * Provides structured, categorized logging with automatic config detection.
 * Integrates with telamonjs logger when available.
 */

import type { FieldValues, UseFormReturn } from 'react-hook-form'
import {
  getDebugConfig,
  isVerboseMode,
  isTraceMode,
  type DebugConfig,
} from './debug-config'
import {
  analyzeStructure,
  calculateDiff,
  formatDiff,
  formatFieldValue,
  formatFormData,
  formatKeys,
} from './debug-formatters'
import { withComponent } from '../logger'

const telamonjsLogger = withComponent

export class FormDebugLogger {
  private config: DebugConfig
  private componentName: string

  constructor(componentName: string) {
    this.config = getDebugConfig()
    this.componentName = componentName

    // Create component-specific logger if available
    if (telamonjsLogger) {
      telamonjsLogger(componentName)
    }
  }

  /**
   * Log props received by component
   */
  logPropsReceived(props: Record<string, unknown>): void {
    if (!this.config.enabled || !this.config.categories.forms) return

    const dataStructure = analyzeStructure(props.data)

    console.group(`🔍 [${this.componentName}] Props Received`)
    console.log('Props:', props)
    console.log('Data structure:', dataStructure)
    console.log('Data keys:', formatKeys(props.data))

    if (isVerboseMode()) {
      console.log('Full data:', JSON.stringify(props.data, null, 2))
    }

    console.groupEnd()
  }

  /**
   * Log data transformation (nested ↔ flat)
   */
  logTransformation(
    direction: 'nested→flat' | 'flat→nested',
    input: unknown,
    output: unknown
  ): void {
    if (!this.config.enabled || !this.config.categories.transformations) return

    const diff = calculateDiff(input, output)

    console.group(`🔄 [${this.componentName}] Transformation: ${direction}`)
    console.log('Input:', input)
    console.log('Output:', output)
    console.log('Changes:', formatDiff(diff))

    if (isVerboseMode()) {
      console.log('Input keys:', formatKeys(input))
      console.log('Output keys:', formatKeys(output))
      console.log('Detailed diff:', diff)
    }

    console.groupEnd()
  }

  /**
   * Log form state (React Hook Form)
   */
  logFormState(
    formMethods: UseFormReturn<FieldValues>,
    label = 'Form State'
  ): void {
    if (!this.config.enabled || !this.config.categories.state) return

    try {
      const values = formMethods.getValues()
      const dirtyFields = formMethods.formState.dirtyFields
      const errors = formMethods.formState.errors
      const touchedFields = formMethods.formState.touchedFields

      console.group(`📊 [${this.componentName}] ${label}`)

      // Show all current values with their types
      console.log('📋 Current Values (all fields):')
      Object.entries(values).forEach(([key, value]) => {
        console.log(`  ${key}:`, value, `(${typeof value})`)
      })

      console.log('\n📝 Metadata:')
      console.log('  Dirty fields:', Object.keys(dirtyFields))
      console.log('  Touched fields:', Object.keys(touchedFields))
      console.log('  Errors:', errors)
      console.log('  Is valid:', formMethods.formState.isValid)
      console.log('  Is dirty:', formMethods.formState.isDirty)
      console.log('  Total fields:', Object.keys(values).length) // i18n-ignore dev log (English)

      if (isVerboseMode()) {
        console.log('\n🔍 Full form state:', formMethods.formState)
      }

      console.groupEnd()
    } catch (error) {
      console.error(`[${this.componentName}] Error logging form state:`, error)
    }
  }

  /**
   * Log field rendering
   */
  logFieldRender(
    fieldName: string,
    value: unknown,
    renderer: string,
    fieldConfig?: unknown
  ): void {
    if (!this.config.enabled || !this.config.categories.rendering) return

    // Only log in verbose or trace mode to avoid spam
    if (!isVerboseMode()) return

    const formatted = formatFieldValue(value)

    if (isTraceMode()) {
      console.log(`🎨 [${this.componentName}] Rendering field:`, {
        name: fieldName,
        value: formatted,
        renderer,
        valueType: typeof value,
        config: fieldConfig,
      })
    } else {
      console.log(
        `🎨 [${this.componentName}] Rendering: ${fieldName} = ${formatted} (${renderer})`
      )
    }
  }

  /**
   * Log form submission
   */
  logSubmit(values: unknown, formData?: FormData): void {
    if (!this.config.enabled || !this.config.categories.forms) return

    console.group(`🚀 [${this.componentName}] Form Submission`)
    console.log('Values (React Hook Form):', values)
    console.log('Values keys:', formatKeys(values))

    if (formData) {
      const formDataObj = formatFormData(formData)
      console.log('FormData entries:', formDataObj)
      console.log('FormData keys:', formatKeys(formDataObj))

      if (isVerboseMode()) {
        // Show differences between RHF values and FormData
        const diff = calculateDiff(values, formDataObj)
        console.log('Values → FormData changes:', formatDiff(diff))
      }
    }

    console.groupEnd()
  }

  /**
   * Log validation errors
   */
  logValidationError(errors: unknown, values?: unknown): void {
    if (!this.config.enabled || !this.config.categories.validation) return

    console.group(`❌ [${this.componentName}] Validation Errors`)
    console.error('Errors:', errors)

    if (values && isVerboseMode()) {
      console.log('Values that failed validation:', values)
    }

    console.groupEnd()
  }

  /**
   * Log server action result
   */
  logActionResult(result: unknown): void {
    if (!this.config.enabled || !this.config.categories.forms) return

    const typedResult = result as
      | { success?: boolean; errors?: unknown }
      | null
      | undefined
    const success = typedResult?.success !== false
    const icon = success ? '✅' : '❌'

    console.group(`${icon} [${this.componentName}] Server Action Result`)
    console.log('Result:', result)

    if (!success && typedResult?.errors) {
      console.error('Server errors:', typedResult.errors)
    }

    console.groupEnd()
  }

  /**
   * Log generic debug info
   */
  log(message: string, data?: unknown): void {
    if (!this.config.enabled) return

    if (data) {
      console.log(`🔧 [${this.componentName}] ${message}`, data)
    } else {
      console.log(`🔧 [${this.componentName}] ${message}`)
    }
  }

  /**
   * Log warning
   */
  warn(message: string, data?: unknown): void {
    if (!this.config.enabled) return

    if (data) {
      console.warn(`⚠️ [${this.componentName}] ${message}`, data)
    } else {
      console.warn(`⚠️ [${this.componentName}] ${message}`)
    }
  }

  /**
   * Log error
   */
  error(message: string, error?: unknown): void {
    if (!this.config.enabled) return

    if (error) {
      console.error(`❌ [${this.componentName}] ${message}`, error)
    } else {
      console.error(`❌ [${this.componentName}] ${message}`)
    }
  }
}

/**
 * Create a form debug logger instance
 * Usage: const debugLogger = createFormDebugLogger('MyComponent')
 */
export function createFormDebugLogger(componentName: string): FormDebugLogger {
  return new FormDebugLogger(componentName)
}
