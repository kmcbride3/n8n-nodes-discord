/**
 * Shared types and interfaces for Discord operations
 * Following Phase 2.4: Code Deduplication architecture
 */

import type { Client } from 'discord.js'
import type { IExecuteFunctions } from 'n8n-workflow'

/**
 * Comprehensive Discord API performance metrics interface
 * Consolidates monitoring and API tracking requirements
 */
export interface IDiscordPerformanceMetrics {
  operation: string
  startTime: number
  endTime: number
  duration: number
  method?: string
  endpoint?: string
  success: boolean
  statusCode?: number
  errorCode?: number
  errorMessage?: string
  rateLimit?: {
    limit: number
    retryAfter: number
    timeToReset: number
    bucket?: string
    scope?: string
  }
  memory?: {
    heapUsed: number
    heapTotal: number
    external: number
  }
}

/**
 * Common parameters for Discord member operations
 */
export interface IDiscordMemberOperationParams {
  guildId: string
  userId: string
  reason?: string
}

/**
 * Parameters for member ban operations
 */
export interface IDiscordBanMemberParams extends IDiscordMemberOperationParams {
  deleteMessageDays?: number
}

/**
 * Parameters for member timeout operations
 */
export interface IDiscordTimeoutMemberParams extends IDiscordMemberOperationParams {
  duration: number
}

/**
 * Parameters for member role operations
 */
export interface IDiscordRoleMemberParams extends IDiscordMemberOperationParams {
  roleId: string
}

/**
 * Standard Discord operation result
 */
export interface IDiscordOperationResult {
  success: boolean
  guildId: string
  userId: string
  action: string
  timestamp: string
  reason?: string
  error?: string
}

/**
 * Member-specific operation results
 */
export interface IDiscordMemberResult extends IDiscordOperationResult {
  banned?: boolean
  kicked?: boolean
  timedOut?: boolean
  roleAdded?: boolean
  roleRemoved?: boolean
  deleteMessageDays?: number
  duration?: number
  roleId?: string
}

/**
 * Discord operation context for shared execution
 */
export interface IDiscordOperationContext {
  executeFunctions: IExecuteFunctions
  client: Client
  itemIndex: number
}

/**
 * Discord operation execution function type
 */
export type DiscordOperationExecutor<TParams, TResult> = (
  params: TParams,
  context: IDiscordOperationContext,
) => Promise<TResult>

/**
 * Standard Discord operation configuration
 */
export interface IDiscordOperationConfig<TParams> {
  operationName: string
  parameterExtractor: (executeFunctions: IExecuteFunctions, itemIndex: number) => TParams
  validator?: (params: TParams) => boolean
}
