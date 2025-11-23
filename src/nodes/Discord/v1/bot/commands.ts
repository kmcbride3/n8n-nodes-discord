import { Client, GuildMember, Interaction, Message, PermissionsBitField, REST, SlashCommandBuilder } from 'discord.js'
import { LoggerProxy } from 'n8n-workflow'

// Import Routes using require since TypeScript has issues with the ES6 import
// skipcq: JS-0359
const { Routes } = require('discord.js')

// Interface to define the structure of each command
interface Command {
  registerCommand: () => SlashCommandBuilder
  executeCommand: (input: string | undefined, interaction: Interaction) => Promise<string>
  params?: {
    autoRemove?: boolean
  }
}

// Type for command registration data
export type CommandRegistrationData = ReturnType<SlashCommandBuilder['toJSON']>

// List of command names to import dynamically
const imports = ['clear', 'test', 'logs']

// Array to store promises of imported commands
const awaitingCommands: Promise<{
  default: Command
}>[] = []

// Dynamically import each command and push to awaitingCommands
imports.forEach((commandName) => {
  const command = import(`./commands/${commandName}`)
  awaitingCommands.push(command)
})

// Function to register the commands with Discord
export const registerCommands = async (
  token: string,
  clientId: string,
  commands: CommandRegistrationData[] = [],
): Promise<void> => {
  const rest = new REST({ version: '10' }).setToken(token)

  try {
    LoggerProxy.info('Starting Discord application command refresh')

    await rest.put(Routes.applicationCommands(clientId), { body: commands })

    LoggerProxy.info('Successfully reloaded Discord application commands')
  } catch (error) {
    LoggerProxy.error('Failed to reload Discord application commands', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export default async function (token: string, clientId: string, client: Client) {
  // Load all commands
  const loadedCommands = await Promise.all(awaitingCommands)

  // Extract command data for registration
  const commandData = loadedCommands.map((cmd) => cmd.default.registerCommand().toJSON())

  // Register commands with Discord
  await registerCommands(token, clientId, commandData)

  // Command execution handler when an interaction is created
  client.on('interactionCreate', async (interaction: Interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return

      if (!interaction.guildId) {
        await interaction.reply({ content: 'Commands work only inside channels' })
        return
      }

      const member = interaction.member as GuildMember
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return

      const { commandName, options } = interaction

      // Find the index of the command
      const i = imports.indexOf(commandName)
      if (i === -1) return

      const command = loadedCommands[i].default

      // Execute the command
      const inputValue = options.get('input')?.value
      const reply = await command
        .executeCommand(typeof inputValue === 'string' ? inputValue : undefined, interaction)
        .catch((e: Error) => e.message)

      const botReply = await interaction.reply({ content: reply, fetchReply: true })

      // Handle auto-remove of messages based on command params or if the reply is "Done!"
      if (command.params?.autoRemove || reply === 'Done!') {
        setTimeout(() => {
          if (botReply && typeof botReply === 'object' && 'delete' in botReply) {
            ;(botReply as Message)
              .delete()
              .catch((e: Error) => LoggerProxy.warn('Failed to delete Discord bot reply', { error: e.message }))
          }
        }, 2000)
      }
    } catch (e) {
      LoggerProxy.error('Discord command execution failed', { error: e instanceof Error ? e.message : String(e) })
    }
  })
}
