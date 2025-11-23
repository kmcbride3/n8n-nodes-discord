import { Client, Message } from 'discord.js'

import { safeRegexTest, sanitizeUserInput } from '../../../helpers'
import { addLog, setCurrentWorkflowId, triggerWorkflow } from '../helpers'
import state from '../state'

export default function (client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    try {
      const rawContent = message.content
      if (!rawContent || message.author.bot) return

      // Sanitize user input to prevent content injection
      const content = sanitizeUserInput(rawContent)

      const channelId = message.channelId
      const messageChannel = state.channels[channelId]

      if (messageChannel) {
        await Promise.allSettled(
          messageChannel.map(async (trigger) => {
            if (!trigger.active) return

            let match = false
            const botMention = message.mentions.users.has(state.clientId)

            if (trigger.messageRegex) {
              try {
                match = safeRegexTest(trigger.messageRegex, content, 'gim')
              } catch (error) {
                addLog(`Invalid regex pattern in trigger: ${error.message}`, client, 'warn')
                return // Skip this trigger if regex is invalid
              }
            } else if (botMention) {
              match = true
            }

            if (match) {
              // Set workflow context for logging
              const previousWorkflowId = setCurrentWorkflowId(trigger.workflowId || null)
              try {
                addLog(
                  `Triggering workflow for message from ${message.author.username}: "${content.substring(0, 50)}..."`,
                  client,
                  'info',
                )
                const isEnabled = await triggerWorkflow(trigger.webhookId, message, '', state.baseUrl).catch(
                  (e: Error) => {
                    addLog(`Error triggering workflow: ${e.message}`, client, 'error')
                    return false
                  },
                )

                if (!isEnabled && trigger.active) {
                  trigger.active = false
                }
              } finally {
                // Restore previous workflow context
                setCurrentWorkflowId(previousWorkflowId)
              }
            }
          }),
        )
      }
    } catch (e) {
      // Clear any workflow context on error
      setCurrentWorkflowId(null)
      addLog(`Error in messageCreate: ${e instanceof Error ? e.message : String(e)}`, client, 'error')
    }
  })
}
