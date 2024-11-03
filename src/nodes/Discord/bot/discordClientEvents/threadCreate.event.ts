import { Client, TextChannel } from 'discord.js'
import { uid } from 'uid'

import { addLog, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default async function (client: Client) {
  client.on('threadCreate', async (thread, newlyCreated) => {
    try {
      const threadOwner = await thread.fetchOwner()
      const threadStarter = await thread.fetchStarterMessage()
      const userRoles = threadOwner?.guildMember?.roles.cache.map((role) => role.id)
      const clientId = client.user?.id
      const botMention = threadStarter?.mentions.users.some((user) => user.id === clientId)
      if (threadStarter) {
        threadStarter.content = threadStarter.content.replace(/<@!?\d+>/g, '').trim()
      }

      if (state.channels[thread.parentId ?? ''] || state.channels.all) {
        ;[...(state.channels[thread.parentId ?? ''] ?? []), ...(state.channels.all ?? [])].forEach(async (trigger) => {
          if (trigger.type === 'thread') {
            if (trigger.roleIds.length) {
              const hasRole = trigger.roleIds.some((role) => userRoles?.includes(role))
              if (!hasRole) return
            }
            if (trigger.botMention && !botMention) return
            const escapedTriggerValue = (trigger.value ?? '')
              .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
              .replace(/-/g, '\\x2d')
            let regStr = `^${escapedTriggerValue}$`
            if (trigger.pattern === 'start') regStr = `^${escapedTriggerValue}`
            else if (trigger.pattern === 'end') regStr = `${escapedTriggerValue}$`
            else if (trigger.pattern === 'contain') regStr = `${escapedTriggerValue}`
            else if (trigger.pattern === 'regex') regStr = `${trigger.value}`
            const reg = new RegExp(regStr, trigger.caseSensitive ? '' : 'i')
            if (reg.test(threadStarter?.content ?? '')) {
              addLog(`triggerWorkflow ${trigger.webhookId}`, client)
              const placeholderMatchingId = trigger.placeholder ? uid() : ''
              const isEnabled = await triggerWorkflow(
                trigger.webhookId,
                threadStarter,
                placeholderMatchingId,
                state.baseUrl,
              ).catch((e) => e)
              if (isEnabled && trigger.placeholder) {
                const channel = client.channels.cache.get(thread.parentId ? thread.parentId : '')
                const placeholder = await (channel as TextChannel)
                  .send(trigger.placeholder)
                  .catch((e: any) => addLog(`${e}`, client))
                if (placeholder) placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder)
              }
            }
          }
        })
      }
    } catch (e) {
      addLog(`${e}`, client)
    }
  })
}
