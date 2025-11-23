/**
 * Shared Discord utilities index
 * Following Phase 2.4: Code Deduplication architecture
 */

// Discord.js constants and limits
export * from './constants/discord-constants'

// Client management (Phase 2.4.4)
export * from './client/discord-client-manager'

// Operation executors
export * from './operations/member-operations'
export * from './operations/message-operations'

// Execution utilities
export * from './execution/operation-executor'

// Validation utilities (consolidated)
export * from './validation/discord-validation'
export { DiscordValidation } from './validation/simple-validation'
export * from './validation/snowflake'

// Shared utility functions (consolidated)
export * from './utils/id-generation'
export * from './utils/request-normalization'

// Shared types and interfaces
export * from './types/shared-interfaces'
