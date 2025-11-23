import { Client } from 'discord.js'

import { addLog, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('presenceUpdate', (_, newPresence) => {
    try {
      if (!newPresence || !newPresence.status || !newPresence.userId || !newPresence.guild) return

      if (state.channels[newPresence.guild.id] || state.channels.all) {
        ;[...(state.channels[newPresence.guild.id] ?? []), ...(state.channels.all ?? [])].forEach(async (trigger) => {
          if (!trigger.roleIds?.length) return

          if (trigger.type === 'presence') {
            const userRoles = newPresence.member?.roles.cache.map((r) => r.id)
            if (!userRoles) return

            const hasRole = trigger.roleIds.some((role) => userRoles.includes(role))
            if (!hasRole) return

            // Check if we need to trigger based on specific presence or 'any' presence
            if (trigger.presence === newPresence.status || trigger.presence === 'any') {
              addLog(
                `Triggering workflow for presence change: ${newPresence.user?.username} is now ${newPresence.status}`,
                client,
                'info',
              )
              const isEnabled = await triggerWorkflow(
                trigger.webhookId,
                null,
                '',
                state.baseUrl,
                newPresence.user ?? undefined,
                newPresence.guild?.id ?? '',
                newPresence.status,
              ).catch((e: Error) => {
                addLog(`Error triggering workflow: ${e.message}`, client, 'error')
                return false
              })

              if (!isEnabled && trigger.active) {
                trigger.active = false
              }
            }
          }
        })
      }
    } catch (e) {
      addLog(`Error in presenceUpdate: ${e instanceof Error ? e.message : String(e)}`, client, 'error')
    }
  })
}
