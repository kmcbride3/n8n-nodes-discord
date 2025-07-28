import { Client, GuildMemberRoleManager, MessageFlags, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return
      if (!interaction.guildId) {
        await interaction.reply({ content: 'Commands work only inside channels' })
        return
      }

      const userRoles = (interaction.member?.roles as GuildMemberRoleManager)?.cache.map((role) => role.id) || []
      const input = interaction.options.getString('input')

      const channelTriggers = [...(state.channels[interaction.channelId] ?? []), ...(state.channels.all ?? [])]

      for (const trigger of channelTriggers) {
        if (trigger.type !== 'command' || trigger.name !== interaction.commandName) continue

        if (trigger.roleIds?.length) {
          const hasRole = trigger.roleIds.some((role) => userRoles?.includes(role))
          if (!hasRole) {
            await interaction
              .reply({
                content: 'You do not have permission',
                flags: MessageFlags.Ephemeral,
              })
              .catch((e: Error) => addLog(e.message, client))
            return
          }
        }

        addLog(`triggerWorkflow ${trigger.webhookId}`, client)
        const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''

        await interaction
          .reply({
            content: `/${interaction.commandName} sent`,
            flags: MessageFlags.Ephemeral,
          })
          .catch((e: Error) => addLog(e.message, client))

        let isEnabled = false
        try {
          const result = await triggerWorkflow(
            trigger.webhookId,
            null,
            placeholderMatchingId,
            state.baseUrl,
            interaction.user,
            interaction.channelId,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            input ? [input] : undefined,
            userRoles,
          )
          isEnabled = Boolean(result)
        } catch (e) {
          addLog(e instanceof Error ? e.message : String(e), client)
        }

        if (isEnabled && trigger.placeholder) {
          const channel = client.channels.cache.get(interaction.channelId)
          if (!channel || !channel.isTextBased()) continue

          let placeholder
          try {
            placeholder = await (channel as TextChannel).send(trigger.placeholder)
          } catch (e) {
            addLog(e instanceof Error ? e.message : String(e), client)
          }

          if (placeholder) {
            await placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder)
          }
        }
      }
    } catch (e) {
      addLog(e instanceof Error ? e.message : `Unknown error: ${String(e)}`, client)
    }
  })
}
