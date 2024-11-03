import {
  RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandNumberOption,
  SlashCommandStringOption,
} from 'discord.js'

import { registerCommands } from '../commands'
import { addLog } from '../helpers'
import state from '../state'

export default async function (process: NodeJS.Process) {
  let timeout: null | NodeJS.Timeout = null

  process.on('message', (message: { type: string; data: any }) => {
    if (message.type === 'trigger') {
      const data = message.data
      try {
        addLog(`trigger ${data.webhookId} update`, state.client)
        state.triggers[data.webhookId] = data
        state.channels = {}
        state.baseUrl = data.baseUrl
        const commandsParam: {
          [key: string]: any
        }[] = []

        Object.keys(state.triggers).forEach((webhookId) => {
          const parameters = state.triggers[webhookId]
          // if no chanellIds are specified, listen to all channels using the 'all' key
          if (!parameters.channelIds || !parameters.channelIds.length) parameters.channelIds = ['all']
          parameters.channelIds.forEach((channelId) => {
            if (!state.channels[channelId] && parameters.active) state.channels[channelId] = [parameters]
            else {
              if (parameters.active) state.channels[channelId].push(parameters)
              else delete state.channels[channelId]
            }
          })

          // push trigger command to list
          if (parameters.type === 'command' && parameters.active) commandsParam.push(parameters)
        })

        // build & register commands
        if (timeout) clearTimeout(timeout) // we want to avoid multiple calls to registerCommands
        timeout = setTimeout(() => {
          if (commandsParam.length && data.credentials) {
            const parsedCommands: RESTPostAPIApplicationCommandsJSONBody[] = []
            commandsParam.forEach((params) => {
              let slashCommand: any = new SlashCommandBuilder()
                .setName(params.name)
                .setDescription(params.description)
                .setDMPermission(false)

              const getOption = (
                option:
                  | SlashCommandStringOption
                  | SlashCommandNumberOption
                  | SlashCommandIntegerOption
                  | SlashCommandBooleanOption,
              ) => {
                return option
                  .setName('input')
                  .setDescription(params.commandFieldDescription)
                  .setRequired(params.commandFieldRequired ?? false)
              }

              if (params.commandFieldType === 'text') {
                slashCommand = slashCommand.addStringOption((option: SlashCommandStringOption) => {
                  return getOption(option)
                })
              } else if (params.commandFieldType === 'number') {
                slashCommand = slashCommand.addNumberOption((option: SlashCommandNumberOption) => {
                  return getOption(option)
                })
              } else if (params.commandFieldType === 'integer') {
                slashCommand = slashCommand.addIntegerOption((option: SlashCommandIntegerOption) => {
                  return getOption(option)
                })
              } else if (params.commandFieldType === 'boolean') {
                slashCommand = slashCommand.addBooleanOption((option: SlashCommandBooleanOption) => {
                  return getOption(option)
                })
              }

              parsedCommands.push(slashCommand.toJSON())
            })
            registerCommands(parsedCommands)
          } else if (data.credentials) {
            // if there is no command to register but previous commands disabled, we unregister all commands
            registerCommands([])
          }
        }, 2000)
      } catch (e) {
        addLog(`${e}`, state.client)
      }
    }
  })
}
