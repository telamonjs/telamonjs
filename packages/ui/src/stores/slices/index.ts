/**
 * Slices - Independent state modules
 *
 * Each slice manages a specific part of global state:
 * - auth: Authentication and session
 * - config: Application configuration
 */

// Export slice creators
export { createAuthSlice } from './auth-slice'
export { createConfigSlice } from './config-slice'

// Export types
export type { AuthSlice, User, Session } from './auth-slice'

export type { ConfigSlice, AppConfig } from './config-slice'
