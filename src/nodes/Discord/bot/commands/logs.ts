import { ChannelType, Interaction, SlashCommandBuilder, SlashCommandStringOption } from 'discord.js'

import state from '../state'

const name = 'logs'

export default {
  params: {
    autoRemove: false, // remove the reply message
  },

  registerCommand: () => {
    return new SlashCommandBuilder()
      .setName(name)
      .setDescription('Toggle test mode')
      .setContexts([0])
      .addStringOption((option: SlashCommandStringOption) =>
        option
          .setName('input')
          .setDescription('auto/stop/clear or number of logs to display (max 100) - default last 100 logs')
          .setRequired(false),
      )
  },

  executeCommand: async (param: string, interaction: Interaction): Promise<string> => {
    const num = parseInt(param)
    if ((num > 0 && num <= 100) || !param) {
      if (!state.logs.length) return 'There is no log'
      else {
        let content = ''
        const logs = state.logs.slice(-(num > 0 && num <= 100 ? num : 100))
        logs.forEach((log) => {
          content += `**${log}**\n`
        })
        if (interaction.channel?.type === ChannelType.GuildText) {
          await interaction.channel.send(content)
        }
        return 'Logs:'
      }
    } else if (['auto', 'stop'].includes(param)) {
      if (param === 'auto') {
        state.autoLogs = true
        state.autoLogsChannelId = interaction.channelId ?? ''
        return 'Auto logs activated'
      } else {
        state.autoLogs = false
        return 'Auto logs disabled'
      }
    } else if (param === 'clear') {
      state.logs = []
      return 'Done!'
    }
    return 'Invalid parameter'
  },
}
