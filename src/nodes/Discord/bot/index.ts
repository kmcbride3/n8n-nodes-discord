import { fork } from "child_process"
import { Client, GatewayIntentBits } from "discord.js"
import path from "path"

import guildMemberAddEvent from "./discordClientEvents/guildMemberAdd.event"
import guildMemberRemoveEvent from "./discordClientEvents/guildMemberRemove.event"
import guildMemberUpdateEvent from "./discordClientEvents/guildMemberUpdate.event"
import interactionCreateEventCmd from "./discordClientEvents/interactionCreateCmd.event"
import interactionCreateEventUI from "./discordClientEvents/interactionCreateUI.event"
import messageCreateEvent from "./discordClientEvents/messageCreate.event"
import presenceUpdateEvent from "./discordClientEvents/presenceUpdate.event"
import threadCreateEvent from "./discordClientEvents/threadCreate.event"
import botStatusHandler from "./eventHandlers/botStatus.handler"
import credentialsHandler from "./eventHandlers/credentials.handler"
import executionHandler from "./eventHandlers/execution.handler"
import listChannelsHandler from "./eventHandlers/listChannels.handler"
import listRolesHandler from "./eventHandlers/listRoles.handler"
import sendActionHandler from "./eventHandlers/sendAction.handler"
import sendMessageHandler from "./eventHandlers/sendMessage.handler"
import sendPromptHandler from "./eventHandlers/sendPrompt.handler"
import triggerHandler from "./eventHandlers/trigger.handler"
import { addLog } from "./helpers"

// Path to the child process script
const childProcessPath = path.join(__dirname, "./index")

// Fork the child process
const child = fork(childProcessPath)

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
  ],
  allowedMentions: {
    parse: ["roles", "users", "everyone"],
  },
})

// Listen for messages from the child process
interface ChildProcessMessage {
  status?: "waiting_for_credentials" | "ready" | "error"
  error?: string
}

child.on("message", (message: ChildProcessMessage) => {
  if (message.status === "waiting_for_credentials") {
    // Send credentials to the child process
    // The credentials should be passed from the n8n workflow
    process.send?.({ request: "credentials" })
  } else if (message.status === "ready") {
    console.log("Child process is ready")
  } else if (message.status === "error") {
    console.error("Error in child process:", message.error)
  }
})

// Handle Discord client ready event
client.on("ready", () => {
  if (client.user) {
    console.log(`Logged in as ${client.user.tag}`)
  } else {
    console.error("Client user is null")
  }
  // Notify child process that the client is ready
  if (client.user) {
    child.send({ status: "client_ready", clientId: client.user.id })
  } else {
    console.error("Client user is null")
  }
})

// Handle Discord client events and forward them to the child process
client.on("messageCreate", (message) => {
  child.send({ event: "messageCreate", data: message })
  // Add other event handlers as needed
})

// Handle credentials from n8n
process.on("message", (credentials: any) => {
  client.emit("credentials", credentials)
})

// Notify parent process that the bot is ready to receive credentials
if (process.send) {
  process.send({ status: "waiting_for_credentials" })
}

export default function () {
  client.on("ready", () => {
    addLog(`Logged in as ${client.user?.tag}`, client)

    // listen to users changing their status events
    presenceUpdateEvent(client)

    // listen to users updates (roles)
    guildMemberUpdateEvent(client)

    // user joined a server
    guildMemberAddEvent(client)

    // user leaving a server
    guildMemberRemoveEvent(client)

    // the bot listen to all messages and check if it matches a referenced trigger
    messageCreateEvent(client)

    // the bot listen to all threads and check if it matches a referenced trigger
    threadCreateEvent(client)

    // the bot listen to all interactions (button/select) and check if it matches a waiting prompt
    interactionCreateEventUI(client)

    // the bot listen to all interactions (slash commands) and check if it matches a referenced trigger
    interactionCreateEventCmd(client)

    // Register custom event handlers
    botStatusHandler(client)
    credentialsHandler(client)
    executionHandler(client)
    listChannelsHandler(client)
    listRolesHandler(client)
    sendActionHandler(client)
    sendMessageHandler(client)
    sendPromptHandler(client)
    triggerHandler(client)
  })

  process.on("message", async (message: any) => {
    if ((message as { token?: string }).token) {
      try {
        await client.login(message.token)
        process.send?.({ status: "ready" })
      } catch (error) {
        console.error("Failed to login to Discord:", error)
        process.send?.({ status: "error", error: (error as Error).message })
      }
    } else if (message.status === "client_ready") {
      // Handle client ready status
      console.log("Client is ready")
    } else if (message.event === "messageCreate") {
      // Handle the messageCreate event
      console.log("Message received:", message.data)
    }
  })

  // Notify parent process that the bot is ready to receive credentials
  process.send?.({ status: "waiting_for_credentials" })
}
