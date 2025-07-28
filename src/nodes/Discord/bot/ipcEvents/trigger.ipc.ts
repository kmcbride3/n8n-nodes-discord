import {
  Client,
  Collection,
  RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandNumberOption,
  SlashCommandStringOption,
} from 'discord.js'
import { Socket } from 'net'
import Ipc from 'node-ipc'

import { registerCommands } from '../commands'
import { addLog } from '../helpers'
import state from '../state'

interface ITriggerParameters {
  webhookId: string
  roleIds: string[]
  roleUpdateIds: string[]
  type: string
  channelIds?: string[]
  pattern?: string
  value?: string
  name?: string
  description?: string
  commandFieldDescription?: string
  commandFieldRequired?: boolean
  commandFieldType?: string
  placeholder?: string
  interactionMessageId?: string
  active?: boolean
}

export default function (ipc: typeof Ipc, client: Client): void {
  // Store timeout reference to prevent memory leaks
  let commandUpdateTimeout: NodeJS.Timeout | null = null
  // Cache command parameters to reduce unnecessary processing
  const commandCache = new Collection<string, RESTPostAPIApplicationCommandsJSONBody>()

  ipc.server.on(
    'trigger',
    (
      data: {
        webhookId: string
        baseUrl: string
        credentials: { token: string; clientId: string }
        [key: string]: unknown
      },
      socket: Socket,
    ) => {
      try {
        addLog(`trigger ${data.webhookId} update`, client)

        // Update the trigger in state
        state.triggers[data.webhookId] = {
          ...data,
          channelIds: Array.isArray(data.channelIds) ? data.channelIds : [],
          roleIds: Array.isArray(data.roleIds) ? data.roleIds : [],
          roleUpdateIds: Array.isArray(data.roleUpdateIds) ? data.roleUpdateIds : [],
          type: typeof data.type === 'string' ? data.type : '',
          active: Boolean(data.active),
        }

        // Reset channels and update baseUrl
        state.channels = {}
        state.baseUrl = data.baseUrl

        // Collect commands that need to be registered
        const commandsParam: ITriggerParameters[] = []
        const channelsToProcess = new Set<string>()

        // Process triggers and organize them by channel
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_, parameters] of Object.entries(state.triggers)) {
          const triggerParams = parameters as ITriggerParameters

          // Ensure channelIds is an array with at least 'all'
          if (!triggerParams.channelIds?.length) {
            triggerParams.channelIds = ['all']
          }

          // Process each channel for this trigger
          for (const channelId of triggerParams.channelIds) {
            channelsToProcess.add(channelId)

            if (!state.channels[channelId]) {
              state.channels[channelId] = triggerParams.active ? [triggerParams] : []
            } else if (triggerParams.active) {
              state.channels[channelId].push(triggerParams)
            } else {
              // Remove this trigger from the channel if not active
              state.channels[channelId] = state.channels[channelId].filter(
                (ch) => ch.webhookId !== triggerParams.webhookId,
              )
            }
          }

          // Collect command triggers that need registration
          if (triggerParams.type === 'command' && triggerParams.active) {
            commandsParam.push(triggerParams)
          }
        }

        // Clear previous timeout to prevent duplicate registrations
        if (commandUpdateTimeout) {
          clearTimeout(commandUpdateTimeout)
        }

        // Batch command registrations with debounce
        commandUpdateTimeout = setTimeout(() => {
          if (commandsParam.length && data.credentials?.token && data.credentials?.clientId) {
            const parsedCommands: RESTPostAPIApplicationCommandsJSONBody[] = []

            for (const params of commandsParam) {
              // Skip invalid commands
              if (!params.name || !params.description) continue

              // Check cache first to avoid rebuilding commands
              const cacheKey = `${params.name}-${params.description}-${params.commandFieldType || ''}`
              if (commandCache.has(cacheKey)) {
                const cachedCommand = commandCache.get(cacheKey)
                if (cachedCommand) {
                  parsedCommands.push(cachedCommand)
                }
                continue
              }

              // Build new slash command
              const slashCommandBuilder = new SlashCommandBuilder()
                .setName(params.name)
                .setDescription(params.description)
                .setDefaultMemberPermissions(null)

              // Add appropriate option type based on commandFieldType
              if (params.commandFieldType === 'text') {
                slashCommandBuilder.addStringOption((option: SlashCommandStringOption) =>
                  option
                    .setName('input')
                    .setDescription(params.commandFieldDescription || '')
                    .setRequired(Boolean(params.commandFieldRequired)),
                )
              } else if (params.commandFieldType === 'number') {
                slashCommandBuilder.addNumberOption((option: SlashCommandNumberOption) =>
                  option
                    .setName('input')
                    .setDescription(params.commandFieldDescription || '')
                    .setRequired(Boolean(params.commandFieldRequired)),
                )
              } else if (params.commandFieldType === 'integer') {
                slashCommandBuilder.addIntegerOption((option: SlashCommandIntegerOption) =>
                  option
                    .setName('input')
                    .setDescription(params.commandFieldDescription || '')
                    .setRequired(Boolean(params.commandFieldRequired)),
                )
              } else if (params.commandFieldType === 'boolean') {
                slashCommandBuilder.addBooleanOption((option: SlashCommandBooleanOption) =>
                  option
                    .setName('input')
                    .setDescription(params.commandFieldDescription || '')
                    .setRequired(Boolean(params.commandFieldRequired)),
                )
              }

              const commandJson = slashCommandBuilder.toJSON()

              // Save to cache and add to registration list
              commandCache.set(cacheKey, commandJson)
              parsedCommands.push(commandJson)
            }

            // Register all commands at once
            registerCommands(data.credentials.token, data.credentials.clientId, parsedCommands)
          } else if (data.credentials?.token && data.credentials?.clientId) {
            // Register empty command list to clear existing commands
            registerCommands(data.credentials.token, data.credentials.clientId, [])

            // Clear command cache when no commands exist
            commandCache.clear()
          }
        }, 500) // Reduced from 2000ms to 500ms for better responsiveness while still batching

        ipc.server.emit(socket, 'trigger', true)
      } catch (error) {
        addLog(`Error in trigger handler: ${error instanceof Error ? error.message : String(error)}`, client)
        ipc.server.emit(socket, 'trigger', false)
      }
    },
  )

  ipc.of.bot.on('trigger', (data: { webhookId: string; active: boolean }) => {
    if (state.triggers[data.webhookId]) {
      state.triggers[data.webhookId].active = data.active
    }
  })
}
