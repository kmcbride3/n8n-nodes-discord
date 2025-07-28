import { Client } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('presenceUpdate', async (_, newPresence) => {
    try {
      if (!newPresence || !newPresence.status || !newPresence.userId || !newPresence.guild) return

      if (state.channels[newPresence.guild.id] || state.channels.all) {
        const triggers = [...(state.channels[newPresence.guild.id] ?? []), ...(state.channels.all ?? [])]
        for (const trigger of triggers) {
          if (!trigger.roleIds?.length) continue

          if (trigger.type === 'presence') {
            const userRoles = newPresence.member?.roles.cache.map((r) => r.id)
            if (!userRoles) continue

            const hasRole = trigger.roleIds.some((role) => userRoles.includes(role))
            if (!hasRole) continue

            if (trigger.presence === newPresence.status || trigger.presence === 'any') {
              addLog(`triggerWorkflow ${trigger.webhookId}`, client)
              let isEnabled = false
              try {
                const result = await triggerWorkflow(
                  trigger.webhookId,
                  null,
                  '',
                  state.baseUrl,
                  newPresence.user ?? undefined,
                  newPresence.guild?.id ?? '',
                  newPresence.status,
                )
                isEnabled = Boolean(result)
              } catch (e) {
                addLog(`Error triggering workflow: ${e instanceof Error ? e.message : String(e)}`, client)
              }

              if (!isEnabled && trigger.active) {
                trigger.active = false
              }
            }
          }
        }
      }
    } catch (e) {
      addLog(`Error in presenceUpdate: ${e instanceof Error ? e.message : String(e)}`, client)
    }
  })
}
