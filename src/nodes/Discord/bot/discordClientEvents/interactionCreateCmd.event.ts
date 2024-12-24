import { Client, GuildMemberRoleManager, TextChannel } from 'discord.js'

import { addLog, generateUniqueId, placeholderLoading, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return
      if (!interaction.guildId) {
        await interaction.reply({ content: 'Commands work only inside channels' })
        return
      }

      const userRoles = (interaction.member?.roles as GuildMemberRoleManager).cache.map((role) => role.id)

      const input = interaction.options.getString('input')

      if (state.channels[interaction.channelId] || state.channels.all) {
        ;[...(state.channels[interaction.channelId] ?? []), ...(state.channels.all ?? [])].forEach(async (trigger) => {
          if (trigger.type === 'command') {
            if (trigger.roleIds?.length) {
              const hasRole = trigger.roleIds.some((role) => userRoles?.includes(role))
              if (!hasRole) {
                await interaction.reply({ content: 'You do not have permission', ephemeral: true }).catch((e) => e)
                return
              }
            }
            if (trigger.name === interaction.commandName) {
              addLog(`triggerWorkflow ${trigger.webhookId}`, client)
              const placeholderMatchingId = trigger.placeholder ? generateUniqueId() : ''

              await interaction.reply({ content: `/${interaction.commandName} sent`, ephemeral: true }).catch((e) => e)

              const isEnabled = await triggerWorkflow(
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
              ).catch((e) => e)
              if (isEnabled && trigger.placeholder) {
                const channel = client.channels.cache.get(interaction.channelId)
                const placeholder = await (channel as TextChannel)
                  .send(trigger.placeholder)
                  .catch((e: Error) => addLog(`${e.message}`, client))
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
