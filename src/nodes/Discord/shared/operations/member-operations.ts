/**
 * Shared Discord member operations using Discord.js native methods
 * Following Phase 2.4: Code Deduplication with Discord.js-first architecture
 */

import type { IExecuteFunctions } from 'n8n-workflow'

import {
  addMemberRole,
  banMember,
  kickMember,
  removeMemberRole,
  timeoutMember,
} from '../../v2/helpers/discord-operations'
import {
  createDiscordOperationResponse,
  executeDiscordOperation,
  validateMemberOperationParams,
} from '../execution/operation-executor'
import type {
  IDiscordBanMemberParams,
  IDiscordMemberOperationParams,
  IDiscordMemberResult,
  IDiscordOperationConfig,
  IDiscordOperationContext,
  IDiscordRoleMemberParams,
  IDiscordTimeoutMemberParams,
} from '../types/shared-interfaces'

/**
 * Ban member operation executor using Discord.js native methods
 */
export async function executeBanMember(
  params: IDiscordBanMemberParams,
  context: IDiscordOperationContext,
): Promise<IDiscordMemberResult> {
  await banMember.call(
    context.executeFunctions,
    params.guildId,
    params.userId,
    params.deleteMessageDays || 0,
    params.reason,
    context.client,
  )

  return createDiscordOperationResponse(params, 'banMember', {
    banned: true,
    deleteMessageDays: params.deleteMessageDays || 0,
    reason: params.reason,
  }) as IDiscordMemberResult
}

/**
 * Kick member operation executor using Discord.js native methods
 */
export async function executeKickMember(
  params: IDiscordMemberOperationParams,
  context: IDiscordOperationContext,
): Promise<IDiscordMemberResult> {
  await kickMember.call(context.executeFunctions, params.guildId, params.userId, params.reason, context.client)

  return createDiscordOperationResponse(params, 'kickMember', {
    kicked: true,
    reason: params.reason,
  }) as IDiscordMemberResult
}

/**
 * Timeout member operation executor using Discord.js native methods
 */
export async function executeTimeoutMember(
  params: IDiscordTimeoutMemberParams,
  context: IDiscordOperationContext,
): Promise<IDiscordMemberResult> {
  // Convert duration (minutes) to timeout timestamp
  let timeoutUntil: string | null
  if (params.duration === 0) {
    // Remove timeout
    timeoutUntil = null
  } else {
    // Calculate timeout end time
    const now = new Date()
    const timeoutEnd = new Date(now.getTime() + params.duration * 60 * 1000)
    timeoutUntil = timeoutEnd.toISOString()
  }

  await timeoutMember.call(
    context.executeFunctions,
    params.guildId,
    params.userId,
    timeoutUntil,
    params.reason,
    context.client,
  )

  return createDiscordOperationResponse(params, 'timeoutMember', {
    timedOut: true,
    duration: params.duration,
    timeoutUntil: params.duration === 0 ? null : timeoutUntil,
    reason: params.reason,
  }) as IDiscordMemberResult
}

/**
 * Add role to member operation executor using Discord.js native methods
 */
export async function executeAddMemberRole(
  params: IDiscordRoleMemberParams,
  context: IDiscordOperationContext,
): Promise<IDiscordMemberResult> {
  await addMemberRole.call(
    context.executeFunctions,
    params.guildId,
    params.userId,
    params.roleId,
    params.reason,
    context.client,
  )

  return createDiscordOperationResponse(params, 'addRole', {
    roleAdded: true,
    roleId: params.roleId,
    reason: params.reason,
  }) as IDiscordMemberResult
}

/**
 * Remove role from member operation executor using Discord.js native methods
 */
export async function executeRemoveMemberRole(
  params: IDiscordRoleMemberParams,
  context: IDiscordOperationContext,
): Promise<IDiscordMemberResult> {
  await removeMemberRole.call(
    context.executeFunctions,
    params.guildId,
    params.userId,
    params.roleId,
    params.reason,
    context.client,
  )

  return createDiscordOperationResponse(params, 'removeRole', {
    roleRemoved: true,
    roleId: params.roleId,
    reason: params.reason,
  }) as IDiscordMemberResult
}

/**
 * Configuration for ban member operation
 */
export const banMemberConfig: IDiscordOperationConfig<IDiscordBanMemberParams> = {
  operationName: 'banMember',
  parameterExtractor: (executeFunctions: IExecuteFunctions, itemIndex: number) => ({
    guildId: executeFunctions.getNodeParameter('guildId', itemIndex) as string,
    userId: executeFunctions.getNodeParameter('userId', itemIndex) as string,
    deleteMessageDays: executeFunctions.getNodeParameter('deleteMessageDays', itemIndex, 0) as number,
    reason: executeFunctions.getNodeParameter('reason', itemIndex, '') as string,
  }),
  validator: validateMemberOperationParams,
}

/**
 * Configuration for kick member operation
 */
export const kickMemberConfig: IDiscordOperationConfig<IDiscordMemberOperationParams> = {
  operationName: 'kickMember',
  parameterExtractor: (executeFunctions: IExecuteFunctions, itemIndex: number) => ({
    guildId: executeFunctions.getNodeParameter('guildId', itemIndex) as string,
    userId: executeFunctions.getNodeParameter('userId', itemIndex) as string,
    reason: executeFunctions.getNodeParameter('reason', itemIndex, '') as string,
  }),
  validator: validateMemberOperationParams,
}

/**
 * Configuration for timeout member operation
 */
export const timeoutMemberConfig: IDiscordOperationConfig<IDiscordTimeoutMemberParams> = {
  operationName: 'timeoutMember',
  parameterExtractor: (executeFunctions: IExecuteFunctions, itemIndex: number) => ({
    guildId: executeFunctions.getNodeParameter('guildId', itemIndex) as string,
    userId: executeFunctions.getNodeParameter('userId', itemIndex) as string,
    duration: executeFunctions.getNodeParameter('timeoutDuration', itemIndex, 10) as number,
    reason: executeFunctions.getNodeParameter('reason', itemIndex, '') as string,
  }),
  validator: (params) => validateMemberOperationParams(params) && params.duration >= 0,
}

/**
 * Configuration for add member role operation
 */
export const addMemberRoleConfig: IDiscordOperationConfig<IDiscordRoleMemberParams> = {
  operationName: 'addRole',
  parameterExtractor: (executeFunctions: IExecuteFunctions, itemIndex: number) => ({
    guildId: executeFunctions.getNodeParameter('guildId', itemIndex) as string,
    userId: executeFunctions.getNodeParameter('userId', itemIndex) as string,
    roleId: executeFunctions.getNodeParameter('roleId', itemIndex) as string,
    reason: executeFunctions.getNodeParameter('reason', itemIndex, '') as string,
  }),
  validator: (params) => validateMemberOperationParams(params) && Boolean(params.roleId),
}

/**
 * Configuration for remove member role operation
 */
export const removeMemberRoleConfig: IDiscordOperationConfig<IDiscordRoleMemberParams> = {
  operationName: 'removeRole',
  parameterExtractor: (executeFunctions: IExecuteFunctions, itemIndex: number) => ({
    guildId: executeFunctions.getNodeParameter('guildId', itemIndex) as string,
    userId: executeFunctions.getNodeParameter('userId', itemIndex) as string,
    roleId: executeFunctions.getNodeParameter('roleId', itemIndex) as string,
    reason: executeFunctions.getNodeParameter('reason', itemIndex, '') as string,
  }),
  validator: (params) => validateMemberOperationParams(params) && Boolean(params.roleId),
}

/**
 * Convenience function to execute ban member operation
 */
export function executeBanMemberOperation(executeFunctions: IExecuteFunctions) {
  return executeDiscordOperation(executeFunctions, banMemberConfig, executeBanMember)
}

/**
 * Convenience function to execute kick member operation
 */
export function executeKickMemberOperation(executeFunctions: IExecuteFunctions) {
  return executeDiscordOperation(executeFunctions, kickMemberConfig, executeKickMember)
}

/**
 * Convenience function to execute timeout member operation
 */
export function executeTimeoutMemberOperation(executeFunctions: IExecuteFunctions) {
  return executeDiscordOperation(executeFunctions, timeoutMemberConfig, executeTimeoutMember)
}

/**
 * Convenience function to execute add member role operation
 */
export function executeAddMemberRoleOperation(executeFunctions: IExecuteFunctions) {
  return executeDiscordOperation(executeFunctions, addMemberRoleConfig, executeAddMemberRole)
}

/**
 * Convenience function to execute remove member role operation
 */
export function executeRemoveMemberRoleOperation(executeFunctions: IExecuteFunctions) {
  return executeDiscordOperation(executeFunctions, removeMemberRoleConfig, executeRemoveMemberRole)
}
