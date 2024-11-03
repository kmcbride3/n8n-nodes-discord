import { REST } from '@discordjs/rest'
import {
  Client,
  GuildMember,
  Interaction,
  PermissionResolvable,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js'
import { Routes } from 'discord-api-types/v9'

import state from './state'

// Interface to define the structure of each command
interface Command {
  registerCommand: () => {
    toJSON: () => RESTPostAPIApplicationCommandsJSONBody
  }
  executeCommand: (input: string | undefined, interaction: Interaction) => Promise<string>
  params?: {
    autoRemove?: boolean
  }
}

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
export const registerCommands = async (triggerCommands?: RESTPostAPIApplicationCommandsJSONBody[]) => {
  console.log('Registering commands')

  // Wait for all commands to be imported
  const commands = await Promise.all(awaitingCommands).catch((e) => e)

  // Create a new REST instance with the bot token
  const rest = new REST({ version: '9' }).setToken(state.token)

  // Parse the commands to be sent to Discord
  const parsedCommands = commands.map((e: { default: Command }) => {
    return e.default.registerCommand().toJSON()
  })
  if (triggerCommands) parsedCommands.push(...triggerCommands)

  // Register the commands with Discord
  rest
    .put(Routes.applicationCommands(state.clientId), {
      body: parsedCommands,
    })
    .catch(console.error)

  return commands
}

// Main function to handle command registration and execution
export default async function (client: Client) {
  // Register commands
  const commands = await registerCommands()

  // Command execution handler when an interaction is created
  client.on('interactionCreate', async (interaction: Interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return

      if (!interaction.guildId) {
        await interaction.reply({
          content: 'Commands work only inside channels',
        })
        return
      }

      const member = interaction.member as GuildMember
      if (!member.permissions.has('ADMINISTRATOR' as PermissionResolvable)) return

      const { commandName, options } = interaction

      // Find the index of the command
      const i = imports.indexOf(commandName)
      if (i === -1) return

      const command = commands[i].default

      // Execute the command
      const reply = await command.executeCommand(options.get('input')?.value, interaction).catch((e: any) => e)
      const botReply = await interaction.reply({ content: reply, fetchReply: true }).catch((e) => e)

      // Handle auto-remove of messages based on command params or if the reply is "Done!"
      if (command.params?.autoRemove || reply === 'Done!') {
        setTimeout(async () => {
          botReply.delete().catch((e: any) => console.log(e))
        }, 2000)
      }
    } catch (e) {
      console.log(e)
    }
  })
}
