import { Client, GuildMember, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('guildMemberUpdate', (oldMember, member) => {
    try {
      if (!member || member.user.system) return
      const previousUserRoles = oldMember.roles.cache.map((role) => role.id)
      const currentUserRoles = member.roles.cache.map((role) => role.id)
      const addedRoles = currentUserRoles.filter((role) => !previousUserRoles.includes(role))
      const removedRoles = previousUserRoles.filter((role) => !currentUserRoles.includes(role))

      const previousNick = oldMember?.nickname || ''
      const currentNick = member?.nickname || ''
      const nickChanged = previousNick !== currentNick

      if (addedRoles.length || removedRoles.length) {
        // Process role changes
        processRoleChanges(client, previousUserRoles, addedRoles, removedRoles, member).catch((error: Error) =>
          addLog(`Error processing role changes: ${error.message}`, client),
        )
      }

      if (nickChanged) {
        // Process nickname changes
        processNicknameChange(client, currentNick, member).catch((error: Error) =>
          addLog(`Error processing nickname change: ${error.message}`, client),
        )
      }
    } catch (error) {
      addLog(`Error in guildMemberUpdate: ${error instanceof Error ? error.message : String(error)}`, client)
    }
  })
}

/**
 * Process role changes for a guild member
 */
async function processRoleChanges(
  client: Client,
  previousUserRoles: string[],
  addedRoles: string[],
  removedRoles: string[],
  member: GuildMember,
): Promise<void> {
  for (const [key, channel] of Object.entries(state.channels)) {
    for (const trigger of channel) {
      if (trigger.roleIds?.length) {
        const hasRole = trigger.roleIds.some((role) => previousUserRoles?.includes(role))
        if (!hasRole) continue
      }

      if (
        (addedRoles.length && trigger.type === 'userRoleAdded') ||
        (removedRoles.length && trigger.type === 'userRoleRemoved')
      ) {
        if (trigger.type === 'userRoleAdded' && trigger.roleUpdateIds.length) {
          const hasRole = trigger.roleUpdateIds.some((role) => addedRoles?.includes(role))
          if (!hasRole) continue
        }

        if (trigger.type === 'userRoleRemoved' && trigger.roleUpdateIds.length) {
          const hasRole = trigger.roleUpdateIds.some((role) => removedRoles?.includes(role))
          if (!hasRole) continue
        }

        addLog(`triggerWorkflow ${trigger.webhookId}`, client)
        const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''

        let isEnabled = false
        try {
          const result = await triggerWorkflow(
            trigger.webhookId,
            null,
            placeholderMatchingId,
            state.baseUrl,
            member.user,
            key,
            undefined,
            undefined,
            addedRoles,
            removedRoles,
          )
          isEnabled = Boolean(result)
        } catch (error) {
          addLog(`triggerWorkflow error: ${error instanceof Error ? error.message : String(error)}`, client)
        }

        if (isEnabled && trigger.placeholder) {
          await createPlaceholderMessage(client, key, trigger.placeholder, placeholderMatchingId)
        }
      }
    }
  }
}

/**
 * Process nickname change for a guild member
 */
async function processNicknameChange(client: Client, currentNick: string, member: GuildMember): Promise<void> {
  for (const [key, channel] of Object.entries(state.channels)) {
    for (const trigger of channel) {
      if (trigger.type === 'userNickUpdated') {
        addLog(`triggerWorkflow ${trigger.webhookId}`, client)
        const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''

        let isEnabled = false
        try {
          const result = await triggerWorkflow(
            trigger.webhookId,
            null,
            placeholderMatchingId,
            state.baseUrl,
            member.user,
            key,
            undefined,
            currentNick,
          )
          isEnabled = Boolean(result)
        } catch (error) {
          addLog(`triggerWorkflow error: ${error instanceof Error ? error.message : String(error)}`, client)
        }

        if (isEnabled && trigger.placeholder) {
          await createPlaceholderMessage(client, key, trigger.placeholder, placeholderMatchingId)
        }
      }
    }
  }
}

/**
 * Create a placeholder message in the specified channel
 */
async function createPlaceholderMessage(
  client: Client,
  channelId: string,
  placeholderText: string,
  placeholderMatchingId: string,
): Promise<void> {
  const channel = client.channels.cache.get(channelId)
  if (!channel?.isTextBased()) return

  try {
    const placeholder = await (channel as TextChannel).send(placeholderText)
    if (placeholder) {
      await placeholderLoading(placeholder, placeholderMatchingId, placeholderText)
    }
  } catch (error) {
    addLog(`Failed to create placeholder: ${error instanceof Error ? error.message : String(error)}`, client)
  }
}
