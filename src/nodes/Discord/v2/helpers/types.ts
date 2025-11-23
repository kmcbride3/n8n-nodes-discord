/**
 * Custom Discord File interface for n8n file attachments
 *
 * This interface is specifically designed for n8n's file handling workflow
 * and cannot be replaced by Discord.js native types as it includes n8n-specific
 * properties and structure.
 */
export interface IDiscordFile {
  attachment: Buffer | string
  name: string
  description?: string
  content_type?: string
}

// Re-export shared performance metrics interface
export type { IDiscordPerformanceMetrics } from '../../shared/types/shared-interfaces'
