import {
  Client,
  GuildMember,
  Interaction,
  PermissionResolvable,
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord.js'

// Interface to define the structure of each command
interface Command {
  registerCommand: () => { toJSON: () => RESTPostAPIApplicationCommandsJSONBody }
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
export const registerCommands = async (
  token: string,
  clientId: string,
  commands: RESTPostAPIApplicationCommandsJSONBody[] = [],
): Promise<Promise<{ default: Command }>[]> => {
  const rest = new REST({ version: '10' }).setToken(token)

  try {
    console.log('Started refreshing application (/) commands.')

    await rest.put(Routes.applicationCommands(clientId), { body: commands })

    console.log('Successfully reloaded application (/) commands.')
  } catch (error) {
    console.error(error)
  }
  return awaitingCommands
}

export default async function (token: string, clientId: string, client: Client) {
  // Register commands
  const commandModules = await registerCommands(token, clientId)
  const commands = await Promise.all(commandModules)

  // Command execution handler when an interaction is created
  client.on('interactionCreate', async (interaction: Interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return

      if (!interaction.guildId) {
        await interaction.reply({ content: 'Commands work only inside channels' })
        return
      }

      const member = interaction.member as GuildMember
      if (!member.permissions.has('ADMINISTRATOR' as PermissionResolvable)) return

      const { commandName, options } = interaction
      const i = imports.indexOf(commandName)
      if (i === -1) return
      const command = commands[i].default

      const inputValue = options.get('input')?.value
      const reply = await command
        .executeCommand(typeof inputValue === 'string' ? inputValue : undefined, interaction)
        .catch((e: Error) => e.message)
      const botReply = await interaction.reply({ content: reply, fetchReply: true }).catch((e) => e)

      if (command.params?.autoRemove || reply === 'Done!') {
        setTimeout(() => {
          botReply.delete().catch((e: Error) => console.log(e))
        }, 2000)
      }
    } catch (e) {
      console.log(e)
    }
  })
}
