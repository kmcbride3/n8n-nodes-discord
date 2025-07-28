import { ChannelType, Interaction, SlashCommandBuilder, SlashCommandIntegerOption, TextChannel } from 'discord.js'

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
    if (!channel || channel.type !== ChannelType.GuildText) return 'Invalid channel type'
    await (channel as TextChannel).bulkDelete(nb).catch((e: Error) => console.log(e))
    return 'Done!'
  },
}
