import { SlashCommandBooleanOption, SlashCommandBuilder } from 'discord.js'

import state from '../state'

const name = 'test'

export default {
  params: {
    autoRemove: true, // remove the reply message
  },

  registerCommand: () => {
    return new SlashCommandBuilder()
      .setName(name)
      .setDescription('Toggle test mode')
      .setContexts([0])
      .addBooleanOption((option: SlashCommandBooleanOption) =>
        option.setName('input').setDescription('Specify if test mode is enabled or not').setRequired(false),
      )
  },

  executeCommand: (param: boolean | undefined): string => {
    if (typeof param !== 'boolean') state.testMode = !state.testMode
    else state.testMode = param
    return `Test mode: ${state.testMode}`
  },
}
