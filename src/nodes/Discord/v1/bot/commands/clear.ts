import { Interaction, SlashCommandBuilder, SlashCommandIntegerOption, TextChannel } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'

const name = 'clear'

export default {
  params: {
    autoRemove: true, // remove the reply message
  },

  registerCommand: () => {
    return new SlashCommandBuilder()
      .setName(name)
      .setDescription('Delete messages')
      .setContexts([0])
      .addIntegerOption((option: SlashCommandIntegerOption) =>
        option.setName('input').setDescription('Number of last messages to delete').setRequired(false),
      )
  },

  executeCommand: async (param: number, interaction: Interaction): Promise<string> => {
    const channel = interaction.channel
    const nb = param > 0 && param <= 100 ? param : 100
    await (channel as TextChannel)
      .bulkDelete(nb)
      .catch((e: Error) => LoggerProxy.warn('Failed to bulk delete Discord messages', { error: e.message, count: nb }))
    return 'Done!'
  },
}
